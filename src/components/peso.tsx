"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPeso } from "@/app/actions";
import { formatPeso } from "@/lib/peso";

/**
 * Il peso del giorno: un campo, un tasto. Due tocchi -- il campo e Salva --
 * perche' e' un numero che si scrive una volta al giorno, non un contatore
 * da toccare piu' volte come l'acqua.
 *
 * Vuoto e non zero quando non ti sei ancora pesato: zero sarebbe un dato
 * inventato (regola 6), e il grafico lo leggerebbe come un peso vero.
 */
export function Peso({ day, kg }: { day: string; kg: number | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [testo, setTesto] = useState(kg !== null ? formatPeso(kg) : "");
  const [salvato, setSalvato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  function salva() {
    setErrore(null);
    setSalvato(false);
    const pulito = testo.trim().replace(",", ".");
    const numero = pulito === "" ? null : Number(pulito);

    if (numero !== null && !Number.isFinite(numero)) {
      setErrore("Scrivi un numero, per esempio 82,5.");
      return;
    }

    startTransition(async () => {
      const esito = await setPeso(day, numero);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setSalvato(true);
      router.refresh();
    });
  }

  // Il campo sopra e il tasto sotto, non affiancati: il riquadro è largo
  // metà schermo, e su un telefono da 320 px tutti e tre in fila non ci
  // stanno senza stringere il campo sotto i numeri che deve contenere.
  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-[13px] text-muted">Peso</span>
        <span className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={testo}
            onChange={(e) => {
              setTesto(e.target.value);
              setSalvato(false);
            }}
            placeholder="Es. 82,5"
            className="min-h-11 w-full min-w-0 rounded-xl border border-hairline bg-raised px-3 text-[15px] tabular-nums outline-none focus:border-accent"
          />
          <span className="text-[15px] text-muted">kg</span>
        </span>
      </label>
      <button
        type="button"
        onClick={salva}
        disabled={pending}
        className="mt-2 min-h-11 w-full rounded-xl border border-hairline px-3 text-[15px] font-medium text-accent tocco active:bg-raised disabled:opacity-60"
      >
        {salvato ? "Salvato ✓" : "Salva"}
      </button>

      {errore ? (
        <p role="alert" className="mt-2 text-[13px] text-muted">
          {errore}
        </p>
      ) : null}
    </div>
  );
}
