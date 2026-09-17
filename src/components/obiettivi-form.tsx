"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvaObiettivi } from "@/app/obiettivi/actions";
import { formatAcqua } from "@/lib/acqua";
import {
  kcalDaiMacro,
  LIMITI_OBIETTIVI,
  MACRO_LABELS,
  MACRO_ORDER,
  MACRO_UNITS,
  OBIETTIVO_ACQUA,
  validaObiettivi,
  type Obiettivi,
} from "@/lib/targets";
import { Card } from "./card";

function parseNumero(value: string): number {
  if (value.trim() === "") return 0;
  return Number(value.replace(",", "."));
}

/**
 * Il numero com'e' scritto dentro al campo.
 *
 * Con la virgola, come sulla tastiera italiana dell'iPhone e come ovunque
 * nell'app. Il punto lo capisce lo stesso (`parseNumero`), ma non e' lui a
 * dover comparire nel campo: leggere "62.5" dove il resto dell'app scrive
 * "62,5" fa sembrare che siano due numeri diversi.
 */
function scriviNumero(valore: number): string {
  return String(valore).replace(".", ",");
}

/** Differenza oltre la quale vale la pena dire che i conti non tornano. */
const SCARTO_DA_SEGNALARE = 50;

/**
 * I numeri del personal trainer, scritti da te.
 *
 * Stavano nel codice: cambiarli voleva dire un deploy, e il PT li cambia a
 * ogni fase. Il risultato era che l'app mostrava i target di tre mesi fa e
 * tu lo sapevi, quindi smettevi di guardarli.
 *
 * La coerenza fra calorie e macro si **dice**, non si impone: una dieta puo'
 * avere un margine voluto, e un'app che rifiuta i numeri del tuo PT perche'
 * non tornano al grammo e' un'app che si fa scavalcare.
 */
export function ObiettiviForm({ iniziali }: { iniziali: Obiettivi }) {
  const router = useRouter();
  const [valori, setValori] = useState<Obiettivi>(iniziali);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);
  const [inCorso, startTransition] = useTransition();

  const problema = validaObiettivi(valori);
  const daiMacro = kcalDaiMacro(valori.macro);
  const scarto = Math.round(daiMacro - valori.macro.kcal);
  const incoerente = Math.abs(scarto) >= SCARTO_DA_SEGNALARE;

  function salva() {
    setErrore(null);
    startTransition(async () => {
      const esito = await salvaObiettivi(valori);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2500);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          {MACRO_ORDER.map((macro) => (
            <label key={macro} className="block">
              <span className="mb-1 block text-[13px] text-muted">
                {MACRO_LABELS[macro]} ({MACRO_UNITS[macro]})
              </span>
              <input
                type="text"
                inputMode="decimal"
                defaultValue={scriviNumero(iniziali.macro[macro])}
                onChange={(e) => {
                  const numero = parseNumero(e.target.value);
                  setValori((v) => ({ ...v, macro: { ...v.macro, [macro]: numero } }));
                  setSalvato(false);
                }}
                className="min-h-11 w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 text-[17px] font-semibold tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
              />
            </label>
          ))}
        </div>

        {/*
          Si dice, non si impone. Senza colore e senza bloccare il salvataggio:
          e' un'osservazione, non un errore, e il rosso qui dentro e' per il
          fuori target e per i guasti.
        */}
        {incoerente ? (
          <p className="mt-3 text-[13px] leading-snug text-muted">
            I macro che hai scritto valgono {Math.round(daiMacro)} kcal (4 per grammo
            di carboidrati e proteine, 9 per i grassi): {Math.abs(scarto)} in{" "}
            {scarto > 0 ? "più" : "meno"} rispetto alle calorie qui sopra. Può
            essere voluto — si salva lo stesso.
          </p>
        ) : null}
      </Card>

      <Card>
        <label className="block">
          <span className="mb-1 block text-[13px] text-muted">
            Bicchieri d&apos;acqua al giorno
          </span>
          <input
            type="text"
            inputMode="numeric"
            defaultValue={scriviNumero(iniziali.bicchieriAcqua)}
            onChange={(e) => {
              const numero = parseNumero(e.target.value);
              setValori((v) => ({ ...v, bicchieriAcqua: numero }));
              setSalvato(false);
            }}
            className="min-h-11 w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 text-[17px] font-semibold tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
          />
        </label>
        <p className="mt-2 text-[13px] leading-snug text-muted">
          Un bicchiere vale {OBIETTIVO_ACQUA.mlPerBicchiere} ml, quindi{" "}
          {Number.isFinite(valori.bicchieriAcqua) && valori.bicchieriAcqua > 0
            ? formatAcqua(valori.bicchieriAcqua * OBIETTIVO_ACQUA.mlPerBicchiere)
            : "—"}{" "}
          in tutto. Da {LIMITI_OBIETTIVI.bicchieri.min} a{" "}
          {LIMITI_OBIETTIVI.bicchieri.max}.
        </p>
      </Card>

      {problema ? (
        <p role="alert" className="mb-4 px-1 text-[13px] leading-snug text-muted">
          {problema}
        </p>
      ) : null}

      {errore ? (
        <p role="alert" className="mb-4 px-1 text-[13px] leading-snug text-over">
          {errore}
        </p>
      ) : null}

      <button
        type="button"
        disabled={problema !== null || inCorso}
        onClick={salva}
        className="mb-4 min-h-12 w-full rounded-xl bg-accent text-[15px] font-semibold text-on-accent tocco active:opacity-80 disabled:opacity-40"
      >
        {salvato ? "Salvato ✓" : inCorso ? "Salvo…" : "Salva gli obiettivi"}
      </button>

      <p className="px-1 text-[13px] leading-snug text-muted">
        Cambiarli non tocca quello che hai già registrato. Attenzione però: le
        statistiche dei giorni passati vengono ricalcolate con i target nuovi,
        quindi un giorno che risultava in target può smettere di esserlo.
      </p>
    </>
  );
}
