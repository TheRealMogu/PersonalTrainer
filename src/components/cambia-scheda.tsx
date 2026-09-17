"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import { UndoToast } from "@/components/undo-toast";
import {
  annullaCambioScheda,
  anteprimaScheda,
  applicaScheda,
  type Fotografia,
} from "@/app/scheda/actions";
import {
  nessunCambiamento,
  promptPerScheda,
  type Confronto,
  type GiornataAttuale,
} from "@/lib/scheda";

/**
 * Cambiare la scheda: incolla, guarda, conferma.
 *
 * Tre passaggi e non uno, di proposito. Un pasto sbagliato si corregge; una
 * scheda sbagliata sono mesi di carichi messi da parte per errore. Quindi
 * niente si scrive finche' non hai letto il confronto -- ed e' la stessa
 * regola per cui i numeri stimati si confermano prima di salvare, solo che
 * qui pesa di piu'.
 */
export function CambiaScheda({ attuale }: { attuale: GiornataAttuale[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [testo, setTesto] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [confronto, setConfronto] = useState<Confronto | null>(null);
  const [copiato, setCopiato] = useState(false);
  const [annullabile, setAnnullabile] = useState<Fotografia | null>(null);
  const [fatto, setFatto] = useState(false);

  async function copiaPrompt() {
    try {
      await navigator.clipboard.writeText(promptPerScheda(attuale));
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      setErrore(
        "Non sono riuscito a copiare. Selezionalo a mano dal riquadro."
      );
    }
  }

  function guarda() {
    setErrore(null);
    setFatto(false);
    startTransition(async () => {
      const esito = await anteprimaScheda(testo);
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
      const esito = await applicaScheda(testo);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setConfronto(null);
      setTesto("");
      setFatto(true);
      setAnnullabile(esito.fotografia);
      router.refresh();
    });
  }

  function annulla(fotografia: Fotografia) {
    setAnnullabile(null);
    startTransition(async () => {
      const esito = await annullaCambioScheda(fotografia);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setFatto(false);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <h2 className="text-[15px] font-semibold">1. Copia il prompt</h2>
        <p className="mt-1 text-[15px] leading-snug text-muted">
          Mandalo a una chat insieme ai documenti del personal trainer. Si porta
          dietro la scheda di adesso, così quello che non cambia resta scritto
          uguale — e un nome scritto diverso spezzerebbe in due lo storico dei
          carichi.
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
          className="mt-2 min-h-12 w-full rounded-xl bg-accent text-[15px] font-semibold text-on-accent tocco active:opacity-80 disabled:opacity-40"
        >
          Guarda cosa cambia
        </button>
        <p className="mt-2 text-[13px] leading-snug text-muted">
          Questo tasto non cambia niente: legge e basta.
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
            Scheda aggiornata. Le serie che avevi registrato sono tutte al loro
            posto: quello che è uscito dal programma è archiviato, non
            cancellato.
          </p>
        </Card>
      ) : null}

      {confronto ? (
        <>
          <h2 className="mb-2 px-1 text-[17px] font-semibold tracking-tight">
            3. Cosa cambia
          </h2>

          {confronto.archiviati.length > 0 ? (
            <Card>
              <h3 className="text-[15px] font-semibold">
                Escono dal programma ({confronto.archiviati.length})
              </h3>
              <p className="mt-1 text-[13px] leading-snug text-muted">
                Non si cancellano: restano leggibili nello storico e nel
                dettaglio delle sedute già fatte.
                {confronto.serieDaArchiviare > 0
                  ? ` In tutto ci hai registrato ${confronto.serieDaArchiviare} serie.`
                  : ""}
              </p>
              <ul className="mt-2 divide-y divide-hairline">
                {confronto.archiviati.map((voce) => (
                  <li
                    key={`${voce.giornata}-${voce.nome}`}
                    className="flex items-baseline justify-between gap-3 py-2"
                  >
                    <span className="min-w-0 flex-1 text-[15px] leading-snug">
                      {voce.nome}
                      <span className="block text-[13px] text-muted">
                        {voce.giornata}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] tabular-nums text-muted">
                      {voce.serieRegistrate === 0
                        ? "mai fatto"
                        : voce.serieRegistrate === 1
                        ? "1 serie"
                        : `${voce.serieRegistrate} serie`}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {confronto.cambiati.length > 0 ? (
            <Card>
              <h3 className="text-[15px] font-semibold">
                Cambiano ({confronto.cambiati.length})
              </h3>
              <ul className="mt-2 divide-y divide-hairline">
                {confronto.cambiati.map((voce) => (
                  <li key={`${voce.giornata}-${voce.nome}`} className="py-2">
                    <span className="block text-[15px] leading-snug">
                      {voce.nome}
                    </span>
                    <span className="block text-[13px] tabular-nums text-muted">
                      {voce.giornata} · {voce.prima?.serie}×
                      {voce.prima?.ripetizioni} → {voce.dopo?.serie}×
                      {voce.dopo?.ripetizioni}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {confronto.aggiunti.length > 0 ? (
            <Card>
              <h3 className="text-[15px] font-semibold">
                Nuovi ({confronto.aggiunti.length})
              </h3>
              <ul className="mt-2 divide-y divide-hairline">
                {confronto.aggiunti.map((voce) => (
                  <li key={`${voce.giornata}-${voce.nome}`} className="py-2">
                    <span className="block text-[15px] leading-snug">
                      {voce.nome}
                    </span>
                    <span className="block text-[13px] tabular-nums text-muted">
                      {voce.giornata} · {voce.dopo?.serie}×
                      {voce.dopo?.ripetizioni}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {nessunCambiamento(confronto) ? (
            <Card>
              {/*
                Dirlo invece di lasciare il tasto: premere "Applica" e vedersi
                rispondere "non c'e' niente da cambiare" e' un giro a vuoto che
                l'app poteva risparmiare, visto che lo sa gia'.
              */}
              <p className="text-[15px] leading-snug">
                Questa scheda è identica a quella di adesso: non c&apos;è niente
                da cambiare.
              </p>
              <button
                type="button"
                onClick={() => setConfronto(null)}
                className="mt-3 min-h-12 w-full rounded-xl border border-hairline text-[15px] font-medium text-muted tocco active:bg-raised"
              >
                Chiudi
              </button>
            </Card>
          ) : (
            <Card>
              <p className="text-[13px] leading-snug text-muted">
                {confronto.uguali.length === 0
                  ? "Nessun esercizio resta identico."
                  : confronto.uguali.length === 1
                  ? "1 esercizio resta identico."
                  : `${confronto.uguali.length} esercizi restano identici.`}
                {confronto.giornateArchiviate.length > 0
                  ? ` Escono anche le giornate: ${confronto.giornateArchiviate.join(
                      ", "
                    )}.`
                  : ""}
                {confronto.giornateAggiunte.length > 0
                  ? ` Nuove giornate: ${confronto.giornateAggiunte.join(", ")}.`
                  : ""}
              </p>
              <button
                type="button"
                onClick={applica}
                className="mt-3 min-h-12 w-full rounded-xl bg-accent text-[15px] font-semibold text-on-accent tocco active:opacity-80"
              >
                Applica il cambio
              </button>
              <button
                type="button"
                onClick={() => setConfronto(null)}
                className="mt-2 min-h-12 w-full rounded-xl border border-hairline text-[15px] font-medium text-muted tocco active:bg-raised"
              >
                Lascia com&apos;è
              </button>
            </Card>
          )}
        </>
      ) : null}

      {annullabile ? (
        <UndoToast
          message="Scheda cambiata"
          seconds={10}
          onUndo={() => annulla(annullabile)}
          onDismiss={() => setAnnullabile(null)}
        />
      ) : null}
    </>
  );
}
