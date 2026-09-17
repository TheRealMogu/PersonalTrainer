"use client";

import type { MealInput } from "@/app/actions";
import {
  etichettaUltimaVolta,
  kcalDaRipetere,
  type UltimaVolta,
} from "@/lib/abitudini";
import { formatMacro } from "@/lib/nutrition";
import { SLOT_LABELS } from "@/lib/meal-slots";

/**
 * Ricopia il pasto che hai gia' fatto, in un tocco.
 *
 * Chi mangia quasi sempre le stesse cose non dovrebbe ricomporle da capo ogni
 * mattina: la colazione di tutti i giorni costava sei tocchi (tre alimenti,
 * ognuno da cercare nella griglia), adesso ne costa uno.
 *
 * Non e' un'aggiunta al buio: sopra il tasto c'e' scritto cosa ricopia e
 * quante calorie sono, quindi si decide prima di toccare e non dopo. E si
 * annulla come tutto il resto -- ogni riga ricopiata resta una riga normale,
 * cancellabile una per una.
 */
export function ComeUltimaVolta({
  ultima,
  oggi,
  ieri,
  onAdd,
}: {
  ultima: UltimaVolta | null;
  oggi: string;
  ieri: string;
  onAdd: (inputs: Omit<MealInput, "day">[]) => void;
}) {
  // Niente storia, niente tasto: una scorciatoia che non porta da nessuna
  // parte occupa spazio nella schermata piu' affollata dell'app.
  if (!ultima || ultima.pasti.length === 0) return null;

  const kcal = kcalDaRipetere(ultima);
  const quanti = ultima.pasti.length;

  return (
    <button
      type="button"
      onClick={() =>
        onAdd(
          ultima.pasti.map((pasto) => ({
            slot: ultima.slot,
            name: pasto.name,
            quantity: pasto.quantity,
            kcal: pasto.kcal,
            carbs: pasto.carbs,
            protein: pasto.protein,
            fat: pasto.fat,
            onlyKcal: pasto.onlyKcal,
          }))
        )
      }
      className="mb-3 flex min-h-12 w-full items-center gap-3 rounded-xl border border-hairline bg-raised px-3 py-2 text-left tocco-riquadro active:bg-surface"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">
          {etichettaUltimaVolta(ultima, oggi, ieri)}
          <span className="font-normal text-muted">
            {" · "}
            {SLOT_LABELS[ultima.slot].toLowerCase()}
          </span>
        </span>
        {/*
          Cosa ricopia, per nome. Senza, "Come ieri" chiede di fidarsi: con i
          nomi si vede che e' quello che pensavi, e se non lo e' non si tocca.
        */}
        <span className="block truncate text-[13px] text-muted">
          {ultima.pasti.map((pasto) => pasto.name).join(" · ")}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[15px] font-semibold tabular-nums">
          {formatMacro(kcal, "kcal")}
        </span>
        <span className="block text-[11px] text-muted">
          {quanti === 1 ? "1 riga" : `${quanti} righe`}
        </span>
      </span>
    </button>
  );
}
