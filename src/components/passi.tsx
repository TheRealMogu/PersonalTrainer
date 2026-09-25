"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPassi } from "@/app/actions";
import { sincronizzaPassi } from "@/app/fitbit/actions";
import { formatPassi } from "@/lib/passi";

/**
 * I passi del giorno: un campo, un tasto -- come il peso, non come l'acqua.
 * Il numero lo legge il telefono, non lo conta l'app: non c'e' un
 * contapassi qui dentro, si scrive quello che dice il tuo, una volta al
 * giorno -- a meno che Fitbit non sia collegato, nel qual caso "Sincronizza"
 * lo scrive nel campo al posto tuo, ma non lo salva da solo: resta lo stesso
 * gesto di conferma di quando lo digiti a mano (regola 12).
 *
 * Vuoto e non zero quando non l'hai ancora scritto: zero sarebbe un dato
 * inventato (regola 6), e direbbe che oggi non hai fatto un passo.
 */
export function Passi({
  day,
  passi,
  obiettivo,
  fitbitConnesso = false,
}: {
  day: string;
  passi: number | null;
  obiettivo: number;
  fitbitConnesso?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sincronizzando, setSincronizzando] = useState(false);
  const [testo, setTesto] = useState(passi !== null ? String(passi) : "");
  const [salvato, setSalvato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  function sincronizza() {
    setErrore(null);
    setSalvato(false);
    setSincronizzando(true);
    startTransition(async () => {
      const esito = await sincronizzaPassi(day);
      setSincronizzando(false);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      if (esito.passi === null) {
        setErrore("Nessun dato per questo giorno su Fitbit.");
        return;
      }
      setTesto(String(esito.passi));
    });
  }

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
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[13px] text-muted">Passi</span>
          {fitbitConnesso ? (
            <button
              type="button"
              onClick={sincronizza}
              disabled={sincronizzando}
              className="flex min-h-11 items-center rounded-lg px-2 text-[13px] font-medium text-accent tocco active:opacity-60 disabled:opacity-60"
            >
              {sincronizzando ? "Sincronizzo…" : "Sincronizza da Fitbit"}
            </button>
          ) : null}
        </div>
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
