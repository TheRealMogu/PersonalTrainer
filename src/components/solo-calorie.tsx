"use client";

import { useRef, useState } from "react";
import type { MealInput } from "@/app/actions";
import { MEAL_SLOTS, SLOT_LABELS, type MealSlot } from "@/lib/meal-slots";

/** Tetto largo: ferma uno zero di troppo, non giudica una cena. */
const MAX_KCAL = 5000;

/**
 * Le calorie e basta, per quando mangi fuori.
 *
 * Non e' una scorciatoia per pigrizia: e' quello che tiene vera la media.
 * Una giornata registrata male vale piu' di una giornata non registrata,
 * perche' il buco nella media non si vede -- si vede solo il numero piu'
 * basso che ne esce, e sembra un merito.
 *
 * I macro restano fuori di proposito, e il pasto se lo porta scritto
 * (`onlyKcal`): tre zeri qui vorrebbero dire "non lo so", non "zero grammi",
 * e chi legge i totali lo dichiara invece di far finta.
 */
export function SoloCalorie({
  defaultSlot,
  onAdd,
}: {
  defaultSlot: MealSlot;
  onAdd: (input: Omit<MealInput, "day">) => void;
}) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState("");
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const campo = useRef<HTMLInputElement>(null);

  const kcal = Number(testo.replace(",", "."));
  const valido = Number.isFinite(kcal) && kcal > 0 && kcal <= MAX_KCAL;

  function salva() {
    if (!valido) return;
    onAdd({
      slot,
      // Il nome dice cosa e', non cosa manca: nella lista dei pasti si legge
      // "Fuori casa · 350 kcal" e si capisce senza spiegazioni.
      name: "Fuori casa",
      quantity: 1,
      kcal: Math.round(kcal),
      carbs: 0,
      protein: 0,
      fat: 0,
      onlyKcal: true,
    });
    setTesto("");
    setAperto(false);
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => {
          setAperto(true);
          // Il campo prende il fuoco subito: aprire e poi dover toccare il
          // campo sarebbero due gesti per una cosa che ne vale due in tutto.
          requestAnimationFrame(() => campo.current?.focus());
        }}
        className="min-h-12 w-full rounded-xl border border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
      >
        Solo calorie
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-hairline p-3">
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-[13px] text-muted">
            Calorie, a occhio
          </span>
          <input
            ref={campo}
            type="text"
            inputMode="numeric"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") salva();
            }}
            placeholder="350"
            maxLength={5}
            className="min-h-11 w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
          />
        </label>
        <button
          type="button"
          onClick={salva}
          disabled={!valido}
          className="min-h-11 shrink-0 rounded-xl bg-accent-solid px-4 text-[15px] font-semibold text-on-accent tocco active:opacity-80 disabled:opacity-40"
        >
          Aggiungi
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {MEAL_SLOTS.map((valore) => (
          <button
            key={valore}
            type="button"
            onClick={() => setSlot(valore)}
            aria-pressed={slot === valore}
            className={`min-h-11 rounded-xl border px-3 text-[13px] font-medium tocco active:bg-raised ${
              slot === valore
                ? "border-accent bg-accent/10 text-accent"
                : "border-hairline text-muted"
            }`}
          >
            {SLOT_LABELS[valore]}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[13px] leading-snug text-muted">
        Entrano nell&apos;anello delle calorie. I macro no: restano fuori dal
        conto e le barre lo dicono, invece di darli per zero.
      </p>

      <button
        type="button"
        onClick={() => {
          setTesto("");
          setAperto(false);
        }}
        className="mt-2 min-h-11 w-full rounded-xl text-[15px] font-medium text-muted tocco active:bg-raised"
      >
        Annulla
      </button>
    </div>
  );
}
