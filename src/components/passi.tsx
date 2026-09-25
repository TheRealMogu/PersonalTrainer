"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPassi } from "@/app/actions";
import { formatPassi } from "@/lib/passi";

/**
 * I passi del giorno: un campo, un tasto -- come il peso, non come l'acqua.
 * Il numero lo legge il telefono, non lo conta l'app: non c'e' un
 * contapassi qui dentro, si scrive quello che dice il tuo, una volta al
 * giorno.
 *
 * Vuoto e non zero quando non l'hai ancora scritto: zero sarebbe un dato
 * inventato (regola 6), e direbbe che oggi non hai fatto un passo.
 */
export function Passi({
  day,
  passi,
  obiettivo,
}: {
  day: string;
  passi: number | null;
  obiettivo: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [testo, setTesto] = useState(passi !== null ? String(passi) : "");
  const [salvato, setSalvato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  function salva() {
    setErrore(null);
    setSalvato(false);
    const pulito = testo.trim();
    const numero = pulito === "" ? null : Number(pulito);

    if (numero !== null && !Number.isInteger(numero)) {
      setErrore("Scrivi un numero intero, per esempio 8500.");
      return;
    }

    startTransition(async () => {
      const esito = await setPassi(day, numero);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setSalvato(true);
      router.refresh();
    });
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-[13px] text-muted">Passi</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={testo}
            onChange={(e) => {
              setTesto(e.target.value);
              setSalvato(false);
            }}
            placeholder="Es. 8500"
            className="w-28 min-h-11 rounded-xl border border-hairline bg-raised px-3 text-[15px] tabular-nums outline-none focus:border-accent"
          />
          <span className="text-[15px] text-muted">
            / {formatPassi(obiettivo)}
          </span>
          <button
            type="button"
            onClick={salva}
            disabled={pending}
            className="ml-auto min-h-11 min-w-11 rounded-xl border border-hairline px-4 text-[15px] font-medium text-accent tocco active:bg-raised disabled:opacity-60"
          >
            {salvato ? "Salvato ✓" : "Salva"}
          </button>
        </div>
      </label>

      {errore ? (
        <p role="alert" className="mt-2 text-[13px] text-muted">
          {errore}
        </p>
      ) : null}
    </div>
  );
}
