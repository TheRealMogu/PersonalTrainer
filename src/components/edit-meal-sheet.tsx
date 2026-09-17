"use client";

import { useState, useTransition } from "react";
import { addQuickFood } from "@/app/alimenti/actions";
import type { MealPatch } from "@/app/actions";
import type { Meal } from "@/db/schema";
import { formatMacro } from "@/lib/nutrition";
import { MEAL_SLOTS, SLOT_LABELS, type MealSlot } from "@/lib/meal-slots";
import type { MacroKey } from "@/lib/targets";

const PRESETS = [0.5, 1, 1.5, 2];

const CAMPI: { campo: MacroKey; label: string; unita: string }[] = [
  { campo: "kcal", label: "Calorie", unita: "kcal" },
  { campo: "carbs", label: "Carboidrati", unita: "g" },
  { campo: "protein", label: "Proteine", unita: "g" },
  { campo: "fat", label: "Grassi", unita: "g" },
];

/**
 * La porzione scritta fra parentesi in fondo al nome, se c'e'.
 *
 * "Incolla da Claude" compone i nomi cosi' -- "Pane integrale (80 g)" --
 * perche' nel diario la porzione non ha un campo suo. Un tasto rapido invece
 * ce l'ha, quindi si separa: il nome torna pulito e la porzione va dove si
 * legge.
 */
function separaPorzione(nome: string): { nome: string; porzione: string | null } {
  const trovata = nome.match(/^(.*?)\s*\(([^()]{1,80})\)\s*$/);
  if (!trovata || !trovata[1].trim()) return { nome: nome.trim(), porzione: null };
  return { nome: trovata[1].trim(), porzione: trovata[2].trim() };
}

/** Accetta sia la virgola che il punto, come tutti i campi numerici dell'app. */
function parseNumero(value: string): number {
  if (value.trim() === "") return 0;
  return Number(value.replace(",", "."));
}

/**
 * Correzione di un pasto gia' inserito.
 *
 * La quantita' resta il gesto principale, perche' e' il caso vero: ne ho
 * mangiata meta', non una intera. Ma non e' piu' l'unico. Da quando i numeri
 * possono arrivare da una stima incollata da una chat, riscalare non basta:
 * se la stima sbaglia di trenta calorie, cambiare la quantita' sposta
 * l'errore invece di toglierlo. Nome e macro si aprono con un tocco, e chi
 * non ne ha bisogno non li vede.
 *
 * I numeri nei campi sono i totali del pasto cosi' com'e' adesso, non della
 * porzione singola: sono quelli che leggi nella lista, quindi sono quelli
 * che ti aspetti di correggere.
 */
export function EditMealSheet({
  meal,
  onConfirm,
  onDelete,
  onClose,
}: {
  meal: Meal;
  onConfirm: (patch: MealPatch) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(meal.quantity);
  const [custom, setCustom] = useState("");
  const [slot, setSlot] = useState<MealSlot>(meal.slot as MealSlot);
  const [nome, setNome] = useState(meal.name);
  const [dettagli, setDettagli] = useState(false);
  const [salvato, setSalvato] = useState<"no" | "fatto" | string>("no");
  const [salvataggio, startSalvataggio] = useTransition();

  /*
   * I macro corretti a mano vincono sul riscalamento: se li hai scritti tu,
   * cambiare la quantita' non deve cancellarli sotto le dita. Finche' sono
   * null, seguono la quantita' come hanno sempre fatto.
   */
  const [corretti, setCorretti] = useState<Partial<Record<MacroKey, number>>>({});

  const effective = custom.trim() === "" ? quantity : Number(custom.replace(",", "."));
  const valid = Number.isFinite(effective) && effective > 0 && effective <= 20;
  const nomeValido = nome.trim().length > 0 && nome.trim().length <= 120;

  // Dalla quantita' registrata si ricalcola tutto: i macro salvati sono gia'
  // moltiplicati, quindi si torna alla porzione base prima di riscalare.
  const fattore = valid ? effective / meal.quantity : 0;
  const valore = (campo: MacroKey): number =>
    corretti[campo] ?? meal[campo] * fattore;

  const patch: MealPatch = {
    name: nome.trim(),
    quantity: effective,
    slot,
    kcal: valore("kcal"),
    carbs: valore("carbs"),
    protein: valore("protein"),
    fat: valore("fat"),
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 animate-velo bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Modifica ${meal.name}`}
        className="relative animate-foglio mx-auto flex max-h-[88vh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface px-5 pt-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <header className="mb-4">
          <h2 className="text-[20px] font-bold leading-tight tracking-tight">{meal.name}</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Registrato come {formatMacro(meal.kcal, "kcal")} kcal
          </p>
        </header>

        <p className="mb-2 text-[13px] text-muted">Quantità</p>
        <div className="flex gap-2">
          {PRESETS.map((value) => {
            const active = custom.trim() === "" && quantity === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setQuantity(value);
                  setCustom("");
                }}
                className={`h-12 flex-1 rounded-xl text-[15px] font-semibold tabular-nums transition-colors duration-200 ease-ios ${
                  active
                    ? "bg-accent text-on-accent"
                    : "border border-hairline bg-raised text-ink"
                }`}
              >
                {value === 0.5 ? "½" : value === 1.5 ? "1½" : value}
              </button>
            );
          })}
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-[13px] text-muted">Oppure scrivi quante porzioni</span>
          <input
            type="text"
            inputMode="decimal"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="es. 0,75"
            className="h-12 w-full rounded-xl border border-hairline bg-raised px-3 text-center text-[17px] font-semibold tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
          />
        </label>

        {/*
          Il momento si sceglie dall'ora dell'orologio quando si usa un tasto
          rapido: uno spuntino alle 12:30 finisce a pranzo. Senza poterlo
          spostare, resta li' per sempre.
        */}
        <p className="mt-4 mb-2 text-[13px] text-muted">Quando</p>
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

        <div className="mt-4 rounded-xl bg-raised px-4 py-3">
          <p className="text-[15px] font-semibold tabular-nums">
            {valid ? formatMacro(patch.kcal, "kcal") : "—"} kcal
          </p>
          <p className="mt-0.5 text-[13px] tabular-nums text-muted">
            C {valid ? formatMacro(patch.carbs, "carbs") : "—"} · P{" "}
            {valid ? formatMacro(patch.protein, "protein") : "—"} · G{" "}
            {valid ? formatMacro(patch.fat, "fat") : "—"}
          </p>
        </div>

        {/*
          Nome e macro stanno dietro a un tocco: servono quando il numero e'
          sbagliato in se', non quando hai mangiato mezza porzione -- che e'
          il caso di gran lunga piu' frequente e resta a portata di pollice.
        */}
        <button
          type="button"
          onClick={() => setDettagli((aperto) => !aperto)}
          aria-expanded={dettagli}
          className="mt-3 min-h-11 w-full rounded-xl border border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
        >
          {dettagli ? "Nascondi nome e valori" : "Correggi nome e valori"}
        </button>

        {dettagli ? (
          <div className="mt-3 rounded-xl bg-raised p-3">
            <label className="block">
              <span className="mb-1 block text-[13px] text-muted">Nome</span>
              <input
                type="text"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                maxLength={120}
                className="min-h-11 w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
              />
            </label>

            {/*
              Campi non controllati: con un `value` ricalcolato dal numero,
              scrivere "12," lo rimanderebbe a "12" e la virgola sparirebbe
              sotto le dita. La chiave li ricrea quando cambia la quantita',
              cosi' restano in pari con quello che si sta per salvare.
            */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {CAMPI.map(({ campo, label, unita }) => (
                <label key={campo} className="block">
                  <span className="mb-1 block text-[13px] text-muted">
                    {label} ({unita})
                  </span>
                  <input
                    key={`${campo}-${effective}`}
                    type="text"
                    inputMode="decimal"
                    defaultValue={
                      valid ? String(Math.round(valore(campo) * 10) / 10) : ""
                    }
                    onChange={(event) => {
                      const numero = parseNumero(event.target.value);
                      if (!Number.isFinite(numero) || numero < 0) return;
                      setCorretti((attuali) => ({ ...attuali, [campo]: numero }));
                    }}
                    className="min-h-11 w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                  />
                </label>
              ))}
            </div>

            {Object.keys(corretti).length > 0 ? (
              <button
                type="button"
                onClick={() => setCorretti({})}
                className="mt-3 min-h-11 w-full rounded-xl text-[13px] font-medium text-accent tocco active:bg-surface"
              >
                Rimetti i valori di prima
              </button>
            ) : null}
          </div>
        ) : null}

        {/*
          Il verso che fa crescere l'archivio.
          
          Senza questo, ogni prodotto nuovo va incollato da capo tutte le
          volte: il lavoro si ripete identico all'infinito. Con questo, un
          incollaggio si paga una volta e diventa un tasto -- l'archivio si
          riempie mangiando, che e' l'unico modo in cui puo' riempirsi da
          solo.

          I valori salvati sono quelli di UNA porzione: se stai registrando
          due porzioni, il tasto rapido deve valerne una, altrimenti la
          prossima volta ne conteresti il doppio.
        */}
        <button
          type="button"
          disabled={!valid || !nomeValido || salvataggio || salvato === "fatto"}
          onClick={() => {
            const separato = separaPorzione(patch.name);
            startSalvataggio(async () => {
              const esito = await addQuickFood({
                name: separato.nome,
                portion: separato.porzione,
                kcal: patch.kcal / effective,
                carbs: patch.carbs / effective,
                protein: patch.protein / effective,
                fat: patch.fat / effective,
              });
              setSalvato(esito.ok ? "fatto" : esito.error);
            });
          }}
          className="mt-3 min-h-11 w-full rounded-xl border border-dashed border-hairline text-[15px] font-medium text-accent tocco active:bg-raised disabled:opacity-40"
        >
          {salvato === "fatto"
            ? "Salvato fra i tasti rapidi ✓"
            : salvataggio
              ? "Salvo…"
              : "Salva fra i tasti rapidi"}
        </button>

        {typeof salvato === "string" && salvato !== "no" && salvato !== "fatto" ? (
          <p role="alert" className="mt-2 text-[13px] text-muted">
            {salvato}
          </p>
        ) : null}

        {!nomeValido ? (
          <p role="alert" className="mt-3 text-[13px] text-muted">
            Il nome non può restare vuoto.
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="min-h-12 rounded-xl border border-hairline px-5 text-[15px] font-medium text-muted tocco active:bg-raised"
          >
            Elimina
          </button>
          <button
            type="button"
            disabled={!valid || !nomeValido}
            onClick={() => onConfirm(patch)}
            className="min-h-12 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-on-accent tocco active:opacity-80 disabled:opacity-40"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
