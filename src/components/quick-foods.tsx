"use client";

import { useMemo, useRef, useState } from "react";
import type { QuickFood } from "@/db/schema";
import type { MealSlot } from "@/lib/meal-slots";
import {
  alreadyOver,
  fitsInRemaining,
  formatMacro,
  type MacroTotals,
} from "@/lib/nutrition";
import { MACRO_LABELS, MACRO_ORDER, type MacroKey } from "@/lib/targets";
import {
  ordinaPerMomento,
  QUANTI_SUBITO,
  type UsoPerMomento,
} from "@/lib/abitudini";
import { QuantitySheet } from "./quantity-sheet";

/** Oltre questa soglia il tocco e' "tenuto premuto" e apre le quantita'. */
const LONG_PRESS_MS = 400;

/**
 * Tasti rapidi. Un tocco aggiunge una porzione (il caso normale, un gesto
 * solo); tenendo premuto si sceglie quanto e in che momento della giornata,
 * senza passare dal form manuale.
 *
 * L'ordine non e' quello dell'archivio ma quello che serve adesso: alle otto
 * in cima c'e' la colazione. Viene da quello che hai gia' registrato, non da
 * una configurazione -- vedi `ordinaPerMomento`.
 *
 * E se ne mostrano sei, non dodici. La griglia piena e' alta 720 px e
 * spingeva la lista dei pasti a 1590: misurato, "vedere cosa ho mangiato"
 * costava tre gesti invece di uno. Gli altri stanno dietro un tocco, e dopo
 * l'ordinamento in cima c'e' gia' quello che cerchi.
 */
export function QuickFoods({
  foods,
  defaultSlot,
  totals,
  targets,
  usi,
  onAdd,
}: {
  foods: QuickFood[];
  defaultSlot: MealSlot;
  totals: MacroTotals;
  targets: Record<MacroKey, number>;
  /** Quello che hai gia' registrato, per sapere cosa mettere in cima. */
  usi: UsoPerMomento[];
  onAdd: (food: QuickFood, quantity: number, slot: MealSlot) => void;
}) {
  const [sheetFor, setSheetFor] = useState<QuickFood | null>(null);
  const [soloCheCiSta, setSoloCheCiSta] = useState(false);
  const [tuttiVisibili, setTuttiVisibili] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  function startPress(food: QuickFood) {
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      setSheetFor(food);
    }, LONG_PRESS_MS);
  }

  function endPress() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  // Il verdetto si ricalcola a ogni pasto aggiunto: e' la sottrazione che
  // faresti a mente, fatta da chi ha gia' i numeri.
  const verdicts = useMemo(
    () =>
      new Map(
        foods.map((food) => [food.id, fitsInRemaining(totals, food, targets)])
      ),
    [foods, totals, targets]
  );
  const quantiCiStanno = [...verdicts.values()].filter((v) => v.fits).length;
  const giaOltre = useMemo(
    () => alreadyOver(totals, targets),
    [totals, targets]
  );
  // Prima si ordina per il momento della giornata, poi si filtra: al
  // contrario il filtro "cosa mi entra" restituirebbe gli stessi alimenti in
  // ordine di archivio, e in cima finirebbe la cena alle otto di mattina.
  const ordinati = useMemo(
    () => ordinaPerMomento(foods, usi, defaultSlot),
    [foods, usi, defaultSlot]
  );
  const filtrati = soloCheCiSta
    ? ordinati.filter((food) => verdicts.get(food.id)?.fits)
    : ordinati;
  const visible = tuttiVisibili ? filtrati : filtrati.slice(0, QUANTI_SUBITO);
  const nascosti = filtrati.length - visible.length;

  if (foods.length === 0) {
    return (
      <p className="text-[15px] text-muted">
        Nessun tasto rapido: lancia <code>npm run db:seed</code> per caricarli.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setSoloCheCiSta((value) => !value)}
        aria-pressed={soloCheCiSta}
        className={`mb-3 min-h-11 w-full rounded-xl px-4 text-[13px] font-medium transition-colors duration-200 ease-ios ${
          soloCheCiSta
            ? "bg-accent text-on-accent"
            : "border border-hairline bg-raised text-muted"
        }`}
      >
        {soloCheCiSta
          ? `Mostro solo i ${quantiCiStanno} che ci stanno`
          : `Cosa mi entra ancora (${quantiCiStanno} su ${foods.length})`}
      </button>

      {giaOltre.length > 0 ? (
        <p className="mb-3 text-[13px] text-muted">
          {giaOltre.length === 1
            ? `${MACRO_LABELS[giaOltre[0]]} già oltre il target`
            : `Già oltre il target: ${giaOltre
                .map((key) => MACRO_LABELS[key].toLowerCase())
                .join(", ")}`}
          . Qui sotto conta solo dove hai ancora margine.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-[15px] text-muted">
          Niente ci sta più dentro senza sforare. Puoi aggiungerlo lo stesso: il
          diario registra, non giudica.
        </p>
      ) : null}

      <div className="grid grid-cols-2 items-stretch gap-2">
        {visible.map((food) => (
          <div key={food.id} className="relative">
            <button
              type="button"
              onPointerDown={() => startPress(food)}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onContextMenu={(event) => event.preventDefault()}
              onClick={() => {
                // Il click arriva anche dopo un tocco lungo: li' ha gia'
                // aperto il foglio, quindi non si aggiunge due volte.
                if (longPressed.current) return;
                onAdd(food, 1, defaultSlot);
              }}
              className="flex min-h-16 w-full flex-col justify-between rounded-xl border border-hairline bg-surface px-3 py-2.5 pr-10 text-left tocco-riquadro active:bg-raised"
            >
              <span className="text-[15px] font-medium leading-tight">
                {food.name}
              </span>
              {/*
                Qui c'era, accanto alle calorie, una scritta rossa "sfora
                carboidrati" su ogni alimento che non ci stava piu'. A fine
                giornata ne comparivano sette su dodici: aprivi l'app per
                segnare la cena e trovavi un muro di rosso che diceva che
                qualunque cosa mangi e' sbagliata.

                La regola 8 dice di non incolpare per quello che e' gia'
                successo, e la 9 tiene il rosso per il fuori target e per i
                guasti. Quel numero e' gia' detto una volta sola, e in
                positivo, dal tasto "Cosa mi entra ancora (6 su 12)", che
                filtra anche. Ripeterlo dodici volte in rosso non aggiungeva
                informazione: aggiungeva rimprovero.
              */}
              <span className="mt-1.5 block text-[13px] tabular-nums text-muted">
                {food.kcal} kcal
              </span>

              {/*
                I macro sul tasto: senza, per sapere se un alimento era
                proteico o grasso bisognava ricordarselo o aprire il foglio.
                Puntini colorati invece delle iniziali C/P/G, che non
                spiegano niente a chi non le conosce gia'.
              */}
              <span className="mt-1 flex items-center gap-2 text-[11px] tabular-nums text-muted">
                {MACRO_ORDER.slice(1).map((key) => (
                  <span key={key} className="flex items-center gap-1">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: `var(--color-${
                          key === "carbs" ? "carbs" : key
                        })`,
                      }}
                    />
                    {formatMacro(food[key], key)}
                  </span>
                ))}
              </span>
            </button>

            {/* Bersaglio esplicito per le quantita': il tocco lungo non si scopre da solo. */}
            <button
              type="button"
              onClick={() => setSheetFor(food)}
              aria-label={`Scegli quantità per ${food.name}`}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl tocco active:text-accent"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M9 4.5v9M4.5 9h9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {nascosti > 0 ? (
        <button
          type="button"
          onClick={() => setTuttiVisibili(true)}
          className="mt-2 min-h-11 w-full rounded-xl border border-hairline text-[13px] font-medium text-accent tocco active:bg-raised"
        >
          Mostra gli altri {nascosti}
        </button>
      ) : null}

      {tuttiVisibili && filtrati.length > QUANTI_SUBITO ? (
        <button
          type="button"
          onClick={() => setTuttiVisibili(false)}
          className="mt-2 min-h-11 w-full rounded-xl border border-hairline text-[13px] font-medium text-muted tocco active:bg-raised"
        >
          Mostrane meno
        </button>
      ) : null}

      {sheetFor ? (
        <QuantitySheet
          food={sheetFor}
          defaultSlot={defaultSlot}
          onConfirm={(quantity, slot) => {
            onAdd(sheetFor, quantity, slot);
            setSheetFor(null);
          }}
          onClose={() => setSheetFor(null)}
        />
      ) : null}
    </>
  );
}
