"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import { UndoToast } from "@/components/undo-toast";
import {
  aggiungiIntegratore,
  correggiIntegratore,
  mettiDaParteIntegratore,
  riprendiIntegratore,
} from "@/app/integratori/actions";
import { MAX_DOSE, MAX_NOME, type IntegratoreInput } from "@/lib/integratori";
import type { Supplement } from "@/db/schema";

const VUOTO: IntegratoreInput = { nome: "", dose: "" };

/**
 * L'elenco degli integratori: si aggiungono, si correggono, si mettono da
 * parte.
 *
 * Il cestino qui si chiama "Non lo prendo più", e non e' un giro di parole:
 * quello che fa davvero e' toglierlo dal diario lasciando le spunte dei
 * giorni in cui lo prendevi. Una DELETE vera si porterebbe via anche quelle,
 * per via della chiave esterna -- ed e' esattamente la trappola gia' pagata
 * con la scheda di allenamento.
 */
export function IntegratoriArchivio({ integratori }: { integratori: Supplement[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const [inModifica, setInModifica] = useState<number | "nuovo" | null>(null);
  const [annullabile, setAnnullabile] = useState<Supplement | null>(null);

  const [ottimistici, applica] = useOptimistic(
    integratori,
    (stato: Supplement[], azione: { id: number; active: boolean }) =>
      stato.map((i) => (i.id === azione.id ? { ...i, active: azione.active } : i)),
  );

  const attivi = ottimistici.filter((i) => i.active);
  const daParte = ottimistici.filter((i) => !i.active);

  function salva(id: number | "nuovo", input: IntegratoreInput) {
    setErrore(null);
    startTransition(async () => {
      const esito =
        id === "nuovo" ? await aggiungiIntegratore(input) : await correggiIntegratore(id, input);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setInModifica(null);
      router.refresh();
    });
  }

  function mettiDaParte(integratore: Supplement) {
    setErrore(null);
    setInModifica(null);
    startTransition(async () => {
      applica({ id: integratore.id, active: false });
      const esito = await mettiDaParteIntegratore(integratore.id);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setAnnullabile(integratore);
      router.refresh();
    });
  }

  function riprendi(integratore: Supplement) {
    setErrore(null);
    setAnnullabile(null);
    startTransition(async () => {
      applica({ id: integratore.id, active: true });
      const esito = await riprendiIntegratore(integratore.id);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        {attivi.length === 0 ? (
          <p className="text-[15px] leading-snug text-muted">
            Non hai integratori in elenco. Finché resta vuoto, nel diario non
            compare nessuna riga.
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {attivi.map((integratore) => (
              <li key={integratore.id} className="py-2 first:pt-0">
                {inModifica === integratore.id ? (
                  <Scheda
                    iniziale={{ nome: integratore.name, dose: integratore.dose ?? "" }}
                    onSalva={(input) => salva(integratore.id, input)}
                    onMettiDaParte={() => mettiDaParte(integratore)}
                    onChiudi={() => setInModifica(null)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setInModifica(integratore.id)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg text-left tocco active:bg-raised"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">
                        {integratore.name}
                      </span>
                      {integratore.dose ? (
                        <span className="block truncate text-[13px] text-muted">
                          {integratore.dose}
                        </span>
                      ) : null}
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
          Aggiungi un integratore
        </button>
      )}

      {/*
        Quelli messi da parte restano visibili qui sotto, non spariscono: e'
        l'unico posto da cui si possono riprendere, e vederli ricorda che le
        spunte dei mesi in cui li prendevi ci sono ancora.
      */}
      {daParte.length > 0 ? (
        <section className="mb-4">
          <h2 className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-muted">
            Non li prendi più
          </h2>
          <Card>
            <ul className="divide-y divide-hairline">
              {daParte.map((integratore) => (
                <li key={integratore.id} className="flex items-center gap-3 py-2 first:pt-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-muted">
                      {integratore.name}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => riprendi(integratore)}
                    className="min-h-11 shrink-0 rounded-xl border border-hairline px-3 text-[15px] font-medium text-accent tocco active:bg-raised"
                  >
                    Riprendi
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {errore ? (
        <p role="alert" className="mb-4 px-1 text-[13px] text-muted">
          {errore}
        </p>
      ) : null}

      {annullabile ? (
        <UndoToast
          key={annullabile.id}
          message={`"${annullabile.name}" tolto dal diario`}
          seconds={6}
          onUndo={() => riprendi(annullabile)}
          onDismiss={() => setAnnullabile(null)}
        />
      ) : null}
    </>
  );
}

/** I campi di un integratore. Stessa scheda per crearne uno e per correggerlo. */
function Scheda({
  iniziale,
  onSalva,
  onMettiDaParte,
  onChiudi,
}: {
  iniziale: IntegratoreInput;
  onSalva: (input: IntegratoreInput) => void;
  onMettiDaParte?: () => void;
  onChiudi: () => void;
}) {
  const [valori, setValori] = useState(iniziale);
  const nomeValido = valori.nome.trim().length > 0;

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-[13px] text-muted">Nome</span>
        <input
          type="text"
          value={valori.nome}
          onChange={(e) => setValori((v) => ({ ...v, nome: e.target.value }))}
          maxLength={MAX_NOME}
          autoFocus
          placeholder="Es. Vitamina D"
          className="min-h-11 w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-[13px] text-muted">
          Dose — come la diresti tu, o niente
        </span>
        <input
          type="text"
          value={valori.dose ?? ""}
          onChange={(e) => setValori((v) => ({ ...v, dose: e.target.value }))}
          maxLength={MAX_DOSE}
          placeholder="Es. 1 compressa, oppure 2000 UI"
          className="min-h-11 w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </label>

      <div className="mt-4 flex gap-2">
        {onMettiDaParte ? (
          <button
            type="button"
            onClick={onMettiDaParte}
            className="min-h-12 rounded-xl border border-hairline px-4 text-[15px] font-medium text-muted tocco active:bg-raised"
          >
            Non lo prendo più
          </button>
        ) : null}
        <button
          type="button"
          onClick={onChiudi}
          className="min-h-12 flex-1 rounded-xl border border-hairline text-[15px] font-medium text-muted tocco active:bg-raised"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={() => onSalva(valori)}
          disabled={!nomeValido}
          className="min-h-12 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-on-accent tocco active:opacity-80 disabled:opacity-40"
        >
          Salva
        </button>
      </div>
    </div>
  );
}
