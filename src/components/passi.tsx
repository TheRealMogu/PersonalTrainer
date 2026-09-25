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

  // Stessa forma del peso, che gli sta accanto: campo sopra, tasti sotto.
  // "Sincronizza da Fitbit" diventa un'icona accanto a Salva perché per
  // intero non ci starebbe in metà schermo -- il nome resta per chi usa
  // uno screen reader.
  return (
    <div>
      <label className="block">
        <span className="mb-1 flex items-baseline justify-between gap-2">
          <span className="text-[13px] text-muted">Passi</span>
          <span className="text-[13px] text-muted">
            di {formatPassi(obiettivo)}
          </span>
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={testo}
          onChange={(e) => {
            setTesto(e.target.value);
            setSalvato(false);
          }}
          placeholder="Es. 8500"
          className="min-h-11 w-full min-w-0 rounded-xl border border-hairline bg-raised px-3 text-[15px] tabular-nums outline-none focus:border-accent"
        />
      </label>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={salva}
          disabled={pending}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-hairline px-1 text-[15px] font-medium text-accent tocco active:bg-raised disabled:opacity-60"
        >
          {salvato ? "Salvato ✓" : "Salva"}
        </button>
        {fitbitConnesso ? (
          <button
            type="button"
            onClick={sincronizza}
            disabled={sincronizzando}
            aria-label={
              sincronizzando ? "Sincronizzo da Fitbit" : "Sincronizza da Fitbit"
            }
            title="Sincronizza da Fitbit"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-hairline text-accent tocco active:bg-raised disabled:opacity-40"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M19 12a7 7 0 0 1-12.3 4.6M5 12a7 7 0 0 1 12.3-4.6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              <path
                d="M17.5 3.5v4h-4M6.5 20.5v-4h4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {errore ? (
        <p role="alert" className="mt-2 text-[13px] text-muted">
          {errore}
        </p>
      ) : null}
    </div>
  );
}
