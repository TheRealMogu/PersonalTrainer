"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import {
  anteprimaSettimane,
  applicaSettimane,
} from "@/app/scheda/settimane/actions";
import { promptPerSettimane, type ConfrontoSettimane } from "@/lib/settimane";
import type { GiornataAttuale } from "@/lib/settimane";
import { formatWeight } from "@/lib/workout";

/**
 * Caricare la prescrizione a settimane: incolla, guarda, conferma. Stesso
 * giro di *Cambia la scheda*, più semplice perché qui gli esercizi non
 * cambiano — solo i numeri sopra di loro — quindi non c'è niente da
 * archiviare: un nome che non trova a chi appartenere resta fuori, elencato,
 * non applicato di nascosto.
 */
export function CaricaSettimane({ attuali }: { attuali: GiornataAttuale[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [testo, setTesto] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [confronto, setConfronto] = useState<ConfrontoSettimane | null>(null);
  const [copiato, setCopiato] = useState(false);
  const [fatto, setFatto] = useState(false);

  async function copiaPrompt() {
    try {
      await navigator.clipboard.writeText(promptPerSettimane(attuali));
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      setErrore(
        "Non sono riuscito a copiare. Selezionalo a mano dal riquadro.",
      );
    }
  }

  function guarda() {
    setErrore(null);
    setFatto(false);
    startTransition(async () => {
      const esito = await anteprimaSettimane(testo);
      if (!esito.ok) {
        setErrore(esito.error);
        setConfronto(null);
        return;
      }
      setConfronto(esito.confronto);
    });
  }

  function applica() {
    setErrore(null);
    startTransition(async () => {
      const esito = await applicaSettimane(testo);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setConfronto(null);
      setTesto("");
      setFatto(true);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <h2 className="text-[15px] font-semibold">1. Copia il prompt</h2>
        <p className="mt-1 text-[15px] leading-snug text-muted">
          Mandalo a una chat insieme al documento del PT. Si porta dietro i nomi
          esatti degli esercizi di adesso — un nome scritto un po&apos; diverso
          e quella riga non trova a chi appartenere.
        </p>
        <button
          type="button"
          onClick={copiaPrompt}
          className="mt-3 min-h-12 w-full rounded-xl border border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
        >
          {copiato ? "Copiato" : "Copia il prompt"}
        </button>
      </Card>

      <Card>
        <h2 className="text-[15px] font-semibold">2. Incolla la risposta</h2>
        <textarea
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          rows={6}
          placeholder='{"giornate":[…]}'
          className="mt-2 w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 text-[15px] outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
        />
        <button
          type="button"
          onClick={guarda}
          disabled={testo.trim() === ""}
          className="mt-2 min-h-12 w-full rounded-xl bg-accent-solid text-[15px] font-semibold text-on-accent tocco active:opacity-80 disabled:opacity-40"
        >
          Guarda cosa si abbina
        </button>
        <p className="mt-2 text-[13px] leading-snug text-muted">
          Questo tasto non salva niente: legge e basta.
        </p>
      </Card>

      {errore ? (
        <Card>
          <p role="alert" className="text-[15px] leading-snug">
            {errore}
          </p>
        </Card>
      ) : null}

      {fatto ? (
        <Card>
          <p className="text-[15px] leading-snug">
            Fatto. La settimana in corso è tornata alla 1: cambiala da
            Allenamento quando inizi quella successiva.
          </p>
        </Card>
      ) : null}

      {confronto ? (
        <>
          <h2 className="mb-2 px-1 text-[17px] font-semibold tracking-tight">
            3. Cosa si abbina
          </h2>

          {confronto.nonTrovati.length > 0 ? (
            <Card>
              <h3 className="text-[15px] font-semibold text-over">
                Non trovati ({confronto.nonTrovati.length})
              </h3>
              <p className="mt-1 text-[13px] leading-snug text-muted">
                Nessun esercizio di adesso si chiama così: restano fuori, niente
                si applica per loro.
              </p>
              <ul className="mt-2 space-y-1">
                {confronto.nonTrovati.map((nome) => (
                  <li key={nome} className="text-[15px] leading-snug">
                    {nome}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {confronto.trovati.length > 0 ? (
            <Card>
              <h3 className="text-[15px] font-semibold">
                Si aggiornano ({confronto.trovati.length})
              </h3>
              <ul className="mt-2 divide-y divide-hairline">
                {confronto.trovati.map((esercizio) => (
                  <li key={esercizio.id} className="py-2.5">
                    <p className="text-[15px] font-medium leading-snug">
                      {esercizio.nome}
                      <span className="ml-1.5 text-[13px] font-normal text-muted">
                        {esercizio.dayLabel}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[13px] tabular-nums text-muted">
                      {esercizio.settimane
                        .map(
                          (s) =>
                            `S${s.settimana}: ${s.ripetizioni} · ${formatWeight(s.peso)} kg`,
                        )
                        .join(" — ")}
                    </p>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={applica}
                className="mt-3 min-h-12 w-full rounded-xl bg-accent-solid text-[15px] font-semibold text-on-accent tocco active:opacity-80"
              >
                Conferma e salva
              </button>
            </Card>
          ) : null}
        </>
      ) : null}
    </>
  );
}
