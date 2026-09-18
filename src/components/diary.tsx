"use client";

import {
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  addMeal,
  deleteMeal,
  restoreMeal,
  updateMeal,
  type MealInput,
  type MealPatch,
} from "@/app/actions";
import type { Meal, QuickFood } from "@/db/schema";
import type { UltimaVolta, UsoPerMomento } from "@/lib/abitudini";
import type { IntegratoreDelGiorno } from "@/lib/integratori";
import type { MealSlot } from "@/lib/meal-slots";
import {
  avvisoInAttesa,
  inAttesaDelGiorno,
  newClientId,
  type PastoInAttesa,
} from "@/lib/pasti-in-attesa";
import * as coda from "@/lib/pasti-store";
import {
  avvisoNonScomposte,
  buildProgress,
  kcalNonScomposte,
  sumMacros,
} from "@/lib/nutrition";
import type { MacroKey, Obiettivi } from "@/lib/targets";
import { Acqua } from "./acqua";
import { Peso } from "./peso";
import { CercaProdotto } from "./cerca-prodotto";
import { ComeUltimaVolta } from "./come-ultima-volta";
import { Integratori } from "./integratori";
import { SoloCalorie } from "./solo-calorie";
import { Card } from "./card";
import { CalorieRing } from "./calorie-ring";
import { IncollaPasto } from "./incolla-pasto";
import { EditMealSheet } from "./edit-meal-sheet";
import { MacroSheet } from "./macro-sheet";
import { MacroTile } from "./macro-tile";
import { Section } from "./section";
import { ManualMealForm } from "./manual-meal-form";
import { MealList } from "./meal-list";
import { QuickFoods } from "./quick-foods";
import { UndoToast } from "./undo-toast";

type OptimisticAction =
  | { type: "add"; meal: Meal }
  | { type: "remove"; id: number }
  | { type: "restore"; meal: Meal }
  | { type: "replace"; meal: Meal };

/** Secondi in cui resta disponibile l'annullamento di un'eliminazione. */
const UNDO_SECONDS = 6;

/**
 * Da qui in giu' gli id sono dei pasti ancora in coda.
 *
 * Un intervallo separato da quello degli ottimistici (che parte da -1): due
 * righe con la stessa chiave farebbero segnalare React e, peggio, il cestino
 * colpirebbe la riga sbagliata. Stessa trappola gia' pagata con le serie.
 */
const BASE_ID_CODA = -100_000;

/**
 * Cuore del diario. Tiene lo stato ottimistico cosi' il riepilogo e la lista
 * si aggiornano al tocco: su rete lenta il salvataggio richiede un secondo, e
 * senza riscontro immediato si finisce per toccare due volte e registrare
 * due porzioni.
 */
export function Diary({
  day,
  meals,
  quickFoods,
  defaultSlot,
  acqua,
  peso,
  integratori,
  usi,
  ultimaVolta,
  ieri,
  obiettivi,
}: {
  day: string;
  meals: Meal[];
  quickFoods: QuickFood[];
  defaultSlot: MealSlot;
  acqua: number;
  peso: number | null;
  integratori: IntegratoreDelGiorno[];
  /** Quello che hai gia' registrato negli ultimi mesi: decide l'ordine dei tasti. */
  usi: UsoPerMomento[];
  /** L'ultimo pasto fatto in questo momento della giornata, da ricopiare. */
  ultimaVolta: UltimaVolta | null;
  ieri: string;
  obiettivi: Obiettivi;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [undoable, setUndoable] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<Meal | null>(null);
  const [macroAperto, setMacroAperto] = useState<MacroKey | null>(null);
  const tempId = useRef(-1);

  const [optimisticMeals, applyOptimistic] = useOptimistic(
    meals,
    (state: Meal[], action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.meal];
        case "remove":
          return state.filter((meal) => meal.id !== action.id);
        case "replace":
          return state.map((meal) =>
            meal.id === action.meal.id ? action.meal : meal
          );
        case "restore":
          return [...state, action.meal].sort(
            (a, b) =>
              a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id
          );
      }
    }
  );

  /*
   * La coda dei pasti che la rete non ha ancora portato via.
   *
   * Letta con `useSyncExternalStore` perche' vive fuori da React, nella
   * memoria del telefono, e sopravvive alla chiusura della pagina.
   */
  const inAttesa = useSyncExternalStore(
    coda.subscribe,
    coda.getSnapshot,
    coda.getServerSnapshot
  );
  const inAttesaOggi = inAttesaDelGiorno(inAttesa, day);

  const inviaInCoda = useCallback(
    (pasto: PastoInAttesa) =>
      addMeal({
        day: pasto.day,
        slot: pasto.slot,
        name: pasto.name,
        quantity: pasto.quantity,
        kcal: pasto.kcal,
        carbs: pasto.carbs,
        protein: pasto.protein,
        fat: pasto.fat,
        onlyKcal: pasto.onlyKcal,
        clientId: pasto.clientId,
      }).catch(() => {
        // Senza rete la Server Action non parte nemmeno e lancia. Non e' un
        // errore dell'app: e' il caso normale fuori casa, e deve restare un
        // "riprovo piu' tardi".
        return { ok: false, error: "rete" } as const;
      }),
    []
  );

  const svuotaCoda = useCallback(async () => {
    try {
      const inviati = await coda.svuota(inviaInCoda);
      if (inviati > 0) router.refresh();
    } catch {
      // Lo svuotamento non deve mai far cadere la pagina: i pasti restano in
      // coda e si riprova al prossimo giro.
    }
  }, [inviaInCoda, router]);

  // Si riprova quando la rete torna, e una volta all'apertura: se hai
  // registrato il pranzo senza segnale, parte da solo appena riapri.
  useEffect(() => {
    void svuotaCoda();
    window.addEventListener("online", svuotaCoda);
    return () => window.removeEventListener("online", svuotaCoda);
  }, [svuotaCoda]);

  /*
   * I pasti in coda si vedono e contano come gli altri.
   *
   * Non e' un vezzo: senza, dopo un salvataggio fallito l'anello tornerebbe
   * indietro e il pasto sembrerebbe sparito -- che e' esattamente
   * l'impressione da cui questa coda esiste per difendere. Il pasto c'e', sta
   * solo aspettando la rete, e la riga lo dice.
   */
  const tuttiIPasti = [
    ...optimisticMeals,
    ...inAttesaOggi.map((pasto, indice) => ({
      id: BASE_ID_CODA - indice,
      day: pasto.day,
      slot: pasto.slot,
      name: pasto.name,
      quantity: pasto.quantity,
      kcal: pasto.kcal,
      carbs: pasto.carbs,
      protein: pasto.protein,
      fat: pasto.fat,
      onlyKcal: pasto.onlyKcal,
      clientId: pasto.clientId,
      createdAt: new Date(pasto.savedAt),
    })),
  ];

  const totals = sumMacros(tuttiIPasti);
  const fuoriDalConto = kcalNonScomposte(tuttiIPasti);
  const progress = buildProgress(totals, obiettivi.macro);

  function handleAdd(input: Omit<MealInput, "day">) {
    setError(null);
    const clientId = input.clientId ?? newClientId();
    const conId = { ...input, clientId };

    startTransition(async () => {
      applyOptimistic({
        type: "add",
        meal: {
          id: tempId.current--,
          day,
          createdAt: new Date(),
          ...conId,
          onlyKcal: conId.onlyKcal ?? false,
        },
      });

      const result = await addMeal({ day, ...conId })
        // Rete assente: l'azione non arriva nemmeno a partire.
        .catch(() => ({ ok: false, error: "rete" } as const));

      if (!result.ok) {
        /*
         * Il pasto non si perde: resta sul telefono e riparte da solo.
         *
         * Prima qui compariva "Salvataggio non riuscito" e il pasto era
         * perso davvero. Che e' peggio che in palestra, non meglio: una
         * serie la rifai al prossimo allenamento, un pranzo no.
         */
        coda.accoda({
          clientId,
          day,
          slot: conId.slot,
          name: conId.name,
          quantity: conId.quantity,
          kcal: conId.kcal,
          carbs: conId.carbs,
          protein: conId.protein,
          fat: conId.fat,
          onlyKcal: conId.onlyKcal ?? false,
          savedAt: Date.now(),
        });
        return;
      }
      router.refresh();
    });
  }

  /**
   * Piu' alimenti in una transizione sola.
   *
   * Chiamare `handleAdd` in ciclo funzionerebbe, ma aprirebbe una transizione
   * e un `router.refresh()` per ogni riga: su rete lenta il riepilogo
   * rimbalzerebbe avanti e indietro mentre le risposte tornano in ordine
   * sparso. Qui il riepilogo si muove una volta e si assesta una volta.
   */
  function handleAddMany(inputs: Omit<MealInput, "day">[]) {
    if (inputs.length === 0) return;
    setError(null);

    // Stessa rete di sicurezza del tasto singolo: "Come ieri" e "Incolla da
    // Claude" passano di qui, e prima perdevano le righe esattamente come
    // faceva l'altro. Un incolla di quattro alimenti perso e' peggio di uno.
    const conId = inputs.map((input) => ({
      ...input,
      clientId: input.clientId ?? newClientId(),
    }));

    startTransition(async () => {
      for (const input of conId) {
        applyOptimistic({
          type: "add",
          meal: {
            id: tempId.current--,
            day,
            createdAt: new Date(),
            ...input,
            onlyKcal: input.onlyKcal ?? false,
          },
        });
      }

      const esiti = await Promise.all(
        conId.map((input) =>
          addMeal({ day, ...input }).catch(
            () => ({ ok: false, error: "rete" } as const)
          )
        )
      );

      esiti.forEach((esito, indice) => {
        if (esito.ok) return;
        const input = conId[indice];
        coda.accoda({
          clientId: input.clientId,
          day,
          slot: input.slot,
          name: input.name,
          quantity: input.quantity,
          kcal: input.kcal,
          carbs: input.carbs,
          protein: input.protein,
          fat: input.fat,
          onlyKcal: input.onlyKcal ?? false,
          savedAt: Date.now() + indice,
        });
      });

      router.refresh();
    });
  }

  function handleDelete(meal: Meal) {
    setError(null);

    // Nell'intervallo della coda: il pasto e' ancora sul telefono, quindi si
    // toglie da li' e non c'e' niente da chiedere al server.
    if (meal.id <= BASE_ID_CODA) {
      const pasto = inAttesaOggi[BASE_ID_CODA - meal.id];
      if (pasto) coda.scoda(pasto.clientId);
      return;
    }

    startTransition(async () => {
      applyOptimistic({ type: "remove", id: meal.id });

      const result = await deleteMeal(meal.id, day);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUndoable(meal);
      router.refresh();
    });
  }

  /*
   * Il foglio manda i valori gia' calcolati, quelli che hai letto prima di
   * premere Salva. Qui non si rifa' il conto: due calcoli della stessa cosa
   * sono due occasioni di non essere d'accordo, e quello che vince
   * sarebbe quello che non hai visto.
   */
  function handleEdit(meal: Meal, patch: MealPatch) {
    setEditing(null);
    setError(null);
    startTransition(async () => {
      applyOptimistic({
        type: "replace",
        meal: { ...meal, ...patch, kcal: Math.round(patch.kcal) },
      });

      const result = await updateMeal(meal.id, day, patch);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleUndo(meal: Meal) {
    setUndoable(null);
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "restore", meal });

      const result = await restoreMeal({
        day: meal.day,
        slot: meal.slot as MealSlot,
        name: meal.name,
        quantity: meal.quantity,
        kcal: meal.kcal,
        carbs: meal.carbs,
        protein: meal.protein,
        fat: meal.fat,
        createdAt: meal.createdAt.toISOString(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CalorieRing progress={progress[0]} />
        {/*
          Tre riquadri affiancati invece di tre barre impilate: la domanda
          "quanto mi resta" si legge tutta insieme, e ognuno si tocca per
          sapere da dove arriva e cosa ci sta ancora.
        */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-4">
          {progress.slice(1).map((item) => (
            <MacroTile key={item.key} progress={item} onOpen={setMacroAperto} />
          ))}
        </div>

        {/*
          Una riga sola, sotto i tre riquadri, e non una dentro ognuno: le
          calorie registrate a occhio non sono un rimprovero da ripetere tre
          volte (regola 8). Ma senza di lei i macro direbbero una cosa falsa
          -- "88,4 g di carboidrati" e' vero solo per i pasti scomposti.
        */}
        {/*
          Detto qui e non come errore: un pasto in coda non e' perso, sta
          aspettando. Chiamarlo guasto farebbe riscriverlo a mano -- e allora
          si' che finirebbe in doppia copia.
        */}
        {inAttesaOggi.length > 0 ? (
          <p className="mt-2 text-[13px] leading-snug text-muted">
            {avvisoInAttesa(inAttesaOggi.length)}
          </p>
        ) : null}

        {avvisoNonScomposte(fuoriDalConto) ? (
          <p className="mt-2 text-[13px] leading-snug text-muted">
            {avvisoNonScomposte(fuoriDalConto)}
          </p>
        ) : null}

        {/*
          L'acqua sta qui dentro, sotto i macro, e non in una scheda sua: e'
          la prima schermata, quella che si vede senza scorrere, ed e' l'unico
          posto in cui "quanti bicchieri ho bevuto" costa zero gesti. Una
          scheda a parte l'avrebbe spinta sotto la piega, dove le cose non si
          guardano -- e una cosa che non si guarda non si segna.
        */}
        <div className="mt-3 border-t border-hairline pt-3">
          <Acqua
            day={day}
            bicchieri={acqua}
            obiettivo={obiettivi.bicchieriAcqua}
          />
        </div>

        {/*
          Il peso per lo stesso motivo dell'acqua: costa zero gesti in piu'
          per arrivarci, e senza l'andamento nel tempo non si costruirebbe
          mai. Un campo e non un contatore, perche' il peso non si aggiusta
          a incrementi fissi come i bicchieri.
        */}
        <div className="mt-3 border-t border-hairline pt-3">
          <Peso day={day} kg={peso} />
        </div>

        {/*
          Gli integratori sotto l'acqua, e per lo stesso motivo: sono una cosa
          da fare oggi, e se stessero sotto la piega non si spunterebbero. La
          riga non c'e' finche' non hai definito almeno un integratore, quindi
          a chi non li prende questa scheda resta com'era.
        */}
        {integratori.length > 0 ? (
          <div className="mt-3 border-t border-hairline pt-3">
            <Integratori day={day} integratori={integratori} />
          </div>
        ) : null}
      </Card>

      {/*
        Ricopiare viene prima di ricomporre, e sta *sopra* il titolo
        "Aggiungi" invece che dentro la scheda.
        
        Misurato: dentro la scheda cadeva a 842 px, cioe' due px sopra la
        piega di un iPhone da 844 -- visibile sulla carta, invisibile davvero.
        Il titolo e il suo margine erano 54 px, ed erano tutto quello che
        mancava.
      */}
      <ComeUltimaVolta
        ultima={ultimaVolta}
        oggi={day}
        ieri={ieri}
        onAdd={handleAddMany}
      />

      <Section title="Aggiungi">
        <Card>
          <QuickFoods
            foods={quickFoods}
            usi={usi}
            defaultSlot={defaultSlot}
            totals={totals}
            targets={obiettivi.macro}
            onAdd={(food, quantity, slot) =>
              handleAdd({
                slot,
                name: food.name,
                quantity,
                kcal: food.kcal * quantity,
                carbs: food.carbs * quantity,
                protein: food.protein * quantity,
                fat: food.fat * quantity,
              })
            }
          />
          <div className="mt-4 space-y-2 border-t border-hairline pt-4">
            {/*
              Prima la via che passa da Claude, poi quella a mano: quando il
              prodotto cambia o si mangia fuori, incollare una risposta costa
              due tocchi, compilare cinque campi per ogni alimento ne costa
              dodici.
            */}
            <IncollaPasto
              defaultSlot={defaultSlot}
              foods={quickFoods}
              onAdd={handleAddMany}
            />
            <CercaProdotto defaultSlot={defaultSlot} onAdd={handleAdd} />
            <SoloCalorie defaultSlot={defaultSlot} onAdd={handleAdd} />
            <ManualMealForm defaultSlot={defaultSlot} onAdd={handleAdd} />
          </div>
        </Card>
      </Section>

      {/*
        La lista di quello che hai gia' mangiato sta SOTTO i modi per
        aggiungere, e non sopra come prima.

        Misurato su una giornata vera da dieci pasti: il primo tasto rapido
        stava a 1626 px, cioe' 882 px di scorrimento -- quasi due schermate
        di pollice. E peggiorava da solo: piu' registravi durante la
        giornata, piu' la lista cresceva e piu' lontano finiva il tasto per
        registrare. La cena, che segni quando sei piu' stanco, era quella che
        costava di piu'.

        Il prezzo e' che "vedere cosa ho mangiato" passa da 0 gesti a 1. Si
        paga volentieri: quello che hai gia' mangiato te lo ricordi, quello
        che ti resta no -- e quello resta in cima, nell'anello.
      */}
      <Section
        id="pasti"
        title={
          tuttiIPasti.length === 1 ? "1 pasto" : `${tuttiIPasti.length} pasti`
        }
      >
        <Card>
          <MealList
            meals={optimisticMeals}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        </Card>
      </Section>

      {error ? (
        <p role="alert" className="mb-4 px-1 text-[13px] text-over">
          {error}
        </p>
      ) : null}

      {editing ? (
        <EditMealSheet
          meal={editing}
          onConfirm={(patch) => handleEdit(editing, patch)}
          onDelete={() => {
            const meal = editing;
            setEditing(null);
            handleDelete(meal);
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {macroAperto ? (
        <MacroSheet
          progress={progress.find((item) => item.key === macroAperto)!}
          meals={optimisticMeals}
          foods={quickFoods}
          onClose={() => setMacroAperto(null)}
        />
      ) : null}

      {undoable ? (
        <UndoToast
          key={undoable.id}
          message={`"${undoable.name}" eliminato`}
          seconds={UNDO_SECONDS}
          onUndo={() => handleUndo(undoable)}
          onDismiss={() => setUndoable(null)}
        />
      ) : null}
    </>
  );
}
