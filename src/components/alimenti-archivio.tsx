"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addQuickFood,
  deleteQuickFood,
  restoreQuickFood,
  updateQuickFood,
  type QuickFoodBackup,
  type QuickFoodInput,
} from "@/app/alimenti/actions";
import type { QuickFood } from "@/db/schema";
import { formatMacro } from "@/lib/nutrition";
import { Card } from "./card";
import { UndoToast } from "./undo-toast";

const VUOTO: QuickFoodInput = {
  name: "",
  portion: "",
  kcal: 0,
  carbs: 0,
  protein: 0,
  fat: 0,
};

const CAMPI = [
  { campo: "kcal", label: "Calorie", unita: "kcal" },
  { campo: "carbs", label: "Carboidrati", unita: "g" },
  { campo: "protein", label: "Proteine", unita: "g" },
  { campo: "fat", label: "Grassi", unita: "g" },
] as const;

function parseNumero(value: string): number {
  if (value.trim() === "") return 0;
  return Number(value.replace(",", "."));
}

/**
 * L'archivio degli alimenti: il posto in cui i tasti rapidi smettono di
 * essere quelli del seed e diventano i tuoi.
 *
 * Sta in una schermata sua e non nel diario perche' si usa di rado: un
 * prodotto si corregge quando cambia ricetta, non tutti i giorni. Il diario
 * deve restare la schermata dei gesti quotidiani.
 */
export function AlimentiArchivio({ foods }: { foods: QuickFood[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const [inModifica, setInModifica] = useState<number | "nuovo" | null>(null);
  const [annullabile, setAnnullabile] = useState<QuickFoodBackup | null>(null);

  const [ottimistici, applica] = useOptimistic(
    foods,
    (stato: QuickFood[], azione: { tipo: "togli"; id: number }) =>
      stato.filter((f) => f.id !== azione.id),
  );

  function elimina(food: QuickFood) {
    setErrore(null);
    setInModifica(null);
    startTransition(async () => {
      applica({ tipo: "togli", id: food.id });
      const esito = await deleteQuickFood(food.id);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setAnnullabile(esito.backup);
      router.refresh();
    });
  }

  function ripristina(backup: QuickFoodBackup) {
    setAnnullabile(null);
    startTransition(async () => {
      const esito = await restoreQuickFood(backup);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      router.refresh();
    });
  }

  function salva(id: number | "nuovo", input: QuickFoodInput) {
    setErrore(null);
    startTransition(async () => {
      const esito =
        id === "nuovo" ? await addQuickFood(input) : await updateQuickFood(id, input);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setInModifica(null);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        {ottimistici.length === 0 ? (
          <p className="text-[15px] leading-snug text-muted">
            L&apos;archivio è vuoto. Aggiungi il primo alimento qui sotto, oppure
            registra un pasto nel diario e salvalo fra i tasti rapidi.
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {ottimistici.map((food) => (
              <li key={food.id} className="py-2 first:pt-0">
                {inModifica === food.id ? (
                  <Scheda
                    iniziale={{
                      name: food.name,
                      portion: food.portion ?? "",
                      kcal: food.kcal,
                      carbs: food.carbs,
                      protein: food.protein,
                      fat: food.fat,
                    }}
                    onSalva={(input) => salva(food.id, input)}
                    onElimina={() => elimina(food)}
                    onChiudi={() => setInModifica(null)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setInModifica(food.id)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg text-left tocco active:bg-raised"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{food.name}</span>
                      <span className="block truncate text-[13px] tabular-nums text-muted">
                        {food.portion ? `${food.portion} · ` : ""}
                        {food.kcal} kcal · C {formatMacro(food.carbs, "carbs")} · P{" "}
                        {formatMacro(food.protein, "protein")} · G{" "}
                        {formatMacro(food.fat, "fat")}
                      </span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-[13px] text-reference">
                      ›
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {inModifica === "nuovo" ? (
        <Card>
          <Scheda
            iniziale={VUOTO}
            onSalva={(input) => salva("nuovo", input)}
            onChiudi={() => setInModifica(null)}
          />
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setInModifica("nuovo")}
          className="mb-4 min-h-12 w-full rounded-xl border border-dashed border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
        >
          Aggiungi un alimento
        </button>
      )}

      {errore ? (
        <p role="alert" className="mb-4 px-1 text-[13px] text-muted">
          {errore}
        </p>
      ) : null}

      {annullabile ? (
        <UndoToast
          key={annullabile.name}
          message={`"${annullabile.name}" eliminato`}
          seconds={6}
          onUndo={() => ripristina(annullabile)}
          onDismiss={() => setAnnullabile(null)}
        />
      ) : null}
    </>
  );
}

/** I campi di un alimento. Stessa scheda per crearne uno e per correggerlo. */
function Scheda({
  iniziale,
  onSalva,
  onElimina,
  onChiudi,
}: {
  iniziale: QuickFoodInput;
  onSalva: (input: QuickFoodInput) => void;
  onElimina?: () => void;
  onChiudi: () => void;
}) {
  const [valori, setValori] = useState(iniziale);
  const nomeValido = valori.name.trim().length > 0;

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-[13px] text-muted">Nome</span>
        <input
          type="text"
          value={valori.name}
          onChange={(e) => setValori((v) => ({ ...v, name: e.target.value }))}
          maxLength={120}
          autoFocus
          placeholder="Es. Yogurt greco Fage 0%"
          className="min-h-11 w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-[13px] text-muted">
          Porzione — quella che usi tu, non per forza 100 g
        </span>
        <input
          type="text"
          value={valori.portion ?? ""}
          onChange={(e) => setValori((v) => ({ ...v, portion: e.target.value }))}
          maxLength={80}
          placeholder="Es. 170 g, oppure 2 fette"
          className="min-h-11 w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {CAMPI.map(({ campo, label, unita }) => (
          <label key={campo} className="block">
            <span className="mb-1 block text-[13px] text-muted">
              {label} ({unita})
            </span>
            <input
              type="text"
              inputMode="decimal"
              defaultValue={String(Math.round(iniziale[campo] * 10) / 10)}
              onChange={(e) => {
                const numero = parseNumero(e.target.value);
                if (!Number.isFinite(numero) || numero < 0) return;
                setValori((v) => ({ ...v, [campo]: numero }));
              }}
              className="min-h-11 w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        {onElimina ? (
          <button
            type="button"
            onClick={onElimina}
            className="min-h-12 rounded-xl border border-hairline px-4 text-[15px] font-medium text-muted tocco active:bg-raised"
          >
            Elimina
          </button>
        ) : null}
        <button
          type="button"
          onClick={onChiudi}
          className="min-h-12 rounded-xl border border-hairline px-4 text-[15px] font-medium text-muted tocco active:bg-raised"
        >
          Annulla
        </button>
        <button
          type="button"
          disabled={!nomeValido}
          onClick={() => onSalva(valori)}
          className="min-h-12 flex-1 rounded-xl bg-accent-solid text-[15px] font-semibold text-on-accent tocco active:opacity-80 disabled:opacity-40"
        >
          Salva
        </button>
      </div>

      <p className="mt-3 text-[13px] leading-snug text-muted">
        I valori sono quelli di una porzione. Cambiarli non tocca i pasti già
        registrati: quando aggiungi un alimento al diario i numeri vengono
        copiati nella riga del pasto, quindi la colazione di marzo resta com&apos;era.
      </p>
    </div>
  );
}
