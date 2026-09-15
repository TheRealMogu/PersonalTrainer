"use client";

import { useRef, useState, useTransition } from "react";
import { stimaPasto, type MealInput } from "@/app/actions";
import { MEAL_SLOTS, SLOT_LABELS, type MealSlot } from "@/lib/meal-slots";
import { formatMacro } from "@/lib/nutrition";
import { MAX_TESTO, stimaIncoerente, type AlimentoStimato } from "@/lib/stima-pasto";

type Riga = AlimentoStimato & { chiave: number; incluso: boolean };

const CAMPI: { campo: "kcal" | "carbs" | "protein" | "fat"; label: string; unita: string }[] = [
  { campo: "kcal", label: "Calorie", unita: "kcal" },
  { campo: "carbs", label: "Carboidrati", unita: "g" },
  { campo: "protein", label: "Proteine", unita: "g" },
  { campo: "fat", label: "Grassi", unita: "g" },
];

/**
 * "Pane integrale (80 g)": la porzione sta nel nome perche' e' l'unico posto
 * dove sopravvive. Il limite e' quello che `addMeal` applica davvero: meglio
 * accorciare qui che farsi rifiutare il salvataggio dopo.
 */
function nomeCompleto(riga: Riga): string {
  const composto = riga.porzione ? `${riga.nome} (${riga.porzione})` : riga.nome;
  return composto.length > 120 ? composto.slice(0, 120).trimEnd() : composto;
}

/** Accetta sia la virgola che il punto, come il resto dei campi numerici. */
function parseNumero(value: string): number {
  if (value.trim() === "") return 0;
  return Number(value.replace(",", "."));
}

/**
 * Scrivi cosa hai mangiato, il resto lo compila lui.
 *
 * I tasti rapidi coprono i giorni uguali agli altri. Questo copre gli altri:
 * quando il prodotto cambia, quando mangi fuori, quando non c'e' un tasto per
 * quello che hai davanti -- cioe' proprio i giorni in cui, senza, il diario
 * resta vuoto.
 *
 * Quello che torna e' una proposta, mai una scrittura. Si vede riga per riga,
 * si toglie quello che non torna, si correggono i numeri se serve, e solo
 * allora si salva. Le stime sono etichettate come tali: un numero che entra
 * nel diario senza essere guardato sarebbe un numero inventato, e la regola 6
 * di PRODOTTO.md non lo permette.
 */
export function ChatPasto({
  defaultSlot,
  onAdd,
}: {
  defaultSlot: MealSlot;
  onAdd: (meals: Omit<MealInput, "day">[]) => void;
}) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState("");
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const [righe, setRighe] = useState<Riga[] | null>(null);
  const [nota, setNota] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, startTransition] = useTransition();
  const [aperta, setAperta] = useState<number | null>(null);
  const chiave = useRef(0);

  function chiudi() {
    setAperto(false);
    setTesto("");
    setRighe(null);
    setNota("");
    setErrore(null);
    setAperta(null);
    setSlot(defaultSlot);
  }

  function leggi() {
    if (!testo.trim() || inCorso) return;
    setErrore(null);
    setRighe(null);
    setAperta(null);

    startTransition(async () => {
      const esito = await stimaPasto(testo, slot);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setRighe(
        esito.alimenti.map((alimento) => ({
          ...alimento,
          chiave: chiave.current++,
          incluso: true,
        })),
      );
      setNota(esito.nota);
    });
  }

  function aggiorna(k: number, patch: Partial<Riga>) {
    setRighe((attuali) =>
      attuali === null
        ? attuali
        : attuali.map((riga) => (riga.chiave === k ? { ...riga, ...patch } : riga)),
    );
  }

  function salva() {
    const scelte = (righe ?? []).filter((riga) => riga.incluso);
    if (scelte.length === 0) return;

    onAdd(
      scelte.map((riga) => ({
        slot: riga.slot,
        name: nomeCompleto(riga),
        quantity: 1,
        kcal: riga.kcal,
        carbs: riga.carbs,
        protein: riga.protein,
        fat: riga.fat,
      })),
    );
    chiudi();
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="min-h-11 w-full rounded-xl border border-dashed border-hairline py-3 text-[15px] font-medium text-accent tocco active:bg-raised"
      >
        Scrivi cosa hai mangiato
      </button>
    );
  }

  const scelte = (righe ?? []).filter((riga) => riga.incluso);
  const totale = scelte.reduce(
    (acc, riga) => ({
      kcal: acc.kcal + riga.kcal,
      carbs: acc.carbs + riga.carbs,
      protein: acc.protein + riga.protein,
      fat: acc.fat + riga.fat,
    }),
    { kcal: 0, carbs: 0, protein: 0, fat: 0 },
  );

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={chiudi}
        className="absolute inset-0 animate-velo bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scrivi cosa hai mangiato"
        className="relative animate-foglio mx-auto flex max-h-[88vh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface px-5 pt-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <header className="mb-4">
          <h2 className="text-[20px] font-bold leading-tight tracking-tight">
            Scrivi cosa hai mangiato
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            A parole tue. I numeri te li propongo io, poi li controlli.
          </p>
        </header>

        <label className="block">
          <span className="sr-only">Descrizione del pasto</span>
          <textarea
            value={testo}
            onChange={(event) => setTesto(event.target.value.slice(0, MAX_TESTO))}
            rows={3}
            autoFocus
            placeholder="Es. due uova strapazzate, 80 g di pane integrale e un caffè macchiato"
            className="w-full resize-none rounded-xl border border-hairline bg-raised px-3 py-2.5 text-[15px] leading-snug outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
          />
        </label>

        {/*
          Il momento si propone dall'ora, ma vale solo per gli alimenti di cui
          il testo non lo dice: "stamattina due uova" resta colazione anche a
          mezzogiorno. Senza scriverlo sembrerebbe che decida per tutti.
        */}
        <p className="mt-4 mb-2 text-[13px] text-muted">
          Quando, se non lo scrivi nel testo
        </p>
        <div className="flex gap-2">
          {MEAL_SLOTS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSlot(value)}
              aria-pressed={slot === value}
              className={`min-h-11 flex-1 rounded-xl text-[13px] font-medium transition-colors duration-200 ease-ios ${
                slot === value
                  ? "bg-accent text-on-accent"
                  : "border border-hairline bg-raised text-muted"
              }`}
            >
              {SLOT_LABELS[value]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={leggi}
          disabled={!testo.trim() || inCorso}
          className={`mt-3 min-h-12 w-full rounded-xl text-[15px] font-semibold tocco disabled:opacity-40 ${
            righe
              ? "border border-hairline text-accent active:bg-raised"
              : "bg-accent text-on-accent active:opacity-80"
          }`}
        >
          {inCorso ? "Sto leggendo…" : righe ? "Rileggi" : "Leggi"}
        </button>

        {/*
          Regola 9: il rosso e' per il fuori target e per un guasto che ha
          perso qualcosa. Qui non si e' perso niente -- il testo e' ancora
          nella casella, si riprova -- quindi si scrive e basta.
        */}
        {errore ? (
          <p role="alert" className="mt-3 text-[13px] leading-snug text-muted">
            {errore}
          </p>
        ) : null}

        {inCorso ? (
          <p aria-live="polite" className="mt-3 text-[13px] text-muted">
            Sto leggendo il testo…
          </p>
        ) : null}

        {righe && righe.length > 0 ? (
          <div className="mt-5 border-t border-hairline pt-4">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                Stime, non pesate
              </h3>
              <p className="text-[13px] tabular-nums text-muted">
                {scelte.length} di {righe.length}
              </p>
            </div>

            <p className="mb-3 text-[13px] leading-snug text-muted">
              Questi numeri sono stimati da una descrizione, non letti su
              un&apos;etichetta. Controllali: quello che non torna si corregge
              qui, o si toglie.
            </p>

            {nota ? (
              <p className="mb-3 rounded-xl bg-raised px-3 py-2 text-[13px] leading-snug text-muted">
                {nota}
              </p>
            ) : null}

            <ul className="divide-y divide-hairline">
              {righe.map((riga) => {
                const espansa = aperta === riga.chiave;
                const sospetta = stimaIncoerente(riga);
                return (
                  <li key={riga.chiave} className="py-2 first:pt-0">
                    <div className="flex items-center gap-2">
                      {/*
                        Tenere o togliere e' il gesto piu' frequente: sta a
                        sinistra, grande quanto il pollice, e non apre niente.
                      */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={riga.incluso}
                        aria-label={`${riga.incluso ? "Togli" : "Rimetti"} ${riga.nome}`}
                        onClick={() => aggiorna(riga.chiave, { incluso: !riga.incluso })}
                        className="flex h-11 w-11 shrink-0 items-center justify-center"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-6 w-6 items-center justify-center rounded-md border text-[13px] font-bold ${
                            riga.incluso
                              ? "border-accent bg-accent text-on-accent"
                              : "border-hairline bg-raised text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAperta(espansa ? null : riga.chiave)}
                        aria-expanded={espansa}
                        className={`flex min-h-11 flex-1 items-center gap-2 text-left ${
                          riga.incluso ? "" : "opacity-40"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium">
                            {riga.nome}
                          </span>
                          <span className="block text-[13px] tabular-nums text-muted">
                            {riga.porzione ? `${riga.porzione} · ` : ""}
                            {formatMacro(riga.kcal, "kcal")} kcal · C{" "}
                            {formatMacro(riga.carbs, "carbs")} · P{" "}
                            {formatMacro(riga.protein, "protein")} · G{" "}
                            {formatMacro(riga.fat, "fat")}
                          </span>
                        </span>
                        <span aria-hidden="true" className="shrink-0 text-[13px] text-reference">
                          {espansa ? "▲" : "▼"}
                        </span>
                      </button>
                    </div>

                    {riga.supposta || sospetta ? (
                      <p className="pl-13 text-[13px] leading-snug text-muted">
                        {sospetta
                          ? "Le calorie non tornano con i macro: guarda questa riga."
                          : "Quantità non indicata: ho usato la porzione tipica."}
                      </p>
                    ) : null}

                    {espansa ? (
                      <div className="mt-2 rounded-xl bg-raised p-3">
                        {/*
                          Campi non controllati di proposito: con un `value`
                          ricalcolato dal numero, scrivere "12," lo
                          rimanderebbe a "12" e la virgola sparirebbe sotto le
                          dita. Si ricreano a ogni apertura, quindi restano
                          comunque in pari con quello che si sta per salvare.
                        */}
                        <div className="grid grid-cols-2 gap-3">
                          {CAMPI.map(({ campo, label, unita }) => (
                            <label key={campo} className="block">
                              <span className="mb-1 block text-[13px] text-muted">
                                {label} ({unita})
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                defaultValue={String(Math.round(riga[campo] * 10) / 10)}
                                onChange={(event) => {
                                  const valore = parseNumero(event.target.value);
                                  if (!Number.isFinite(valore) || valore < 0) return;
                                  aggiorna(riga.chiave, { [campo]: valore } as Partial<Riga>);
                                }}
                                className="min-h-11 w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                              />
                            </label>
                          ))}
                        </div>

                        <p className="mt-3 mb-2 text-[13px] text-muted">Quando</p>
                        <div className="flex gap-2">
                          {MEAL_SLOTS.map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => aggiorna(riga.chiave, { slot: value })}
                              aria-pressed={riga.slot === value}
                              className={`min-h-11 flex-1 rounded-xl text-[13px] font-medium transition-colors duration-200 ease-ios ${
                                riga.slot === value
                                  ? "bg-accent text-on-accent"
                                  : "border border-hairline bg-surface text-muted"
                              }`}
                            >
                              {SLOT_LABELS[value]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 rounded-xl bg-raised px-4 py-3">
              <p className="text-[15px] font-semibold tabular-nums">
                {formatMacro(totale.kcal, "kcal")} kcal
              </p>
              <p className="mt-0.5 text-[13px] tabular-nums text-muted">
                C {formatMacro(totale.carbs, "carbs")} · P{" "}
                {formatMacro(totale.protein, "protein")} · G{" "}
                {formatMacro(totale.fat, "fat")}
              </p>
            </div>
          </div>
        ) : null}

        {/*
          La riga di comando si incolla al fondo del foglio invece di stare in
          coda all'elenco: con sei alimenti proposti, "Aggiungi" finirebbe
          sotto la piega e si salverebbe alla cieca dopo aver scorso.
        */}
        <div
          className="sticky bottom-0 -mx-5 mt-4 flex gap-2 bg-surface px-5 pt-3"
          style={{ paddingBottom: "calc(0.25rem + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={chiudi}
            className="min-h-12 rounded-xl border border-hairline px-5 text-[15px] font-medium text-muted tocco active:bg-raised"
          >
            Chiudi
          </button>
          {righe && righe.length > 0 ? (
            <button
              type="button"
              disabled={scelte.length === 0}
              onClick={salva}
              className="min-h-12 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-on-accent tocco active:opacity-80 disabled:opacity-40"
            >
              {scelte.length === 1 ? "Aggiungi 1 alimento" : `Aggiungi ${scelte.length} alimenti`}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
