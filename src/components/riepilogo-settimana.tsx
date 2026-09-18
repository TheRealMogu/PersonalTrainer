"use client";

import { useState } from "react";
import { NotaDieta } from "@/components/nota-dieta";
import { isLogged } from "@/lib/history";
import { formatMacro } from "@/lib/nutrition";
import { formatPeso } from "@/lib/peso";
import {
  giornoMese,
  nomeGiorno,
  riepilogoTesto,
  type Riepilogo,
} from "@/lib/riepilogo";
import { DAILY_TARGETS, type MacroKey } from "@/lib/targets";
import { formatVolume } from "@/lib/workout";

/**
 * La settimana in una schermata, e in un tocco negli appunti.
 *
 * Serve la domenica sera: cosa ho mangiato, cosa ho sollevato, e quanto mi
 * sono tenuto vicino ai target. A schermo si legge; il tasto lo trasforma in
 * testo da mandare al personal trainer o da incollare in una chat, dove chi
 * legge non ha l'app davanti.
 *
 * Per questo il testo copiato dichiara sempre il denominatore -- "media su 5
 * giorni registrati su 6 conclusi" -- invece della sola media: fuori di qui
 * nessuno sa quanti giorni ci sono dentro, e una media senza il suo
 * denominatore si legge come si vuole.
 */
export function RiepilogoSettimana({
  riepilogo,
  targets = DAILY_TARGETS,
}: {
  riepilogo: Riepilogo;
  targets?: Record<MacroKey, number>;
}) {
  const [copiato, setCopiato] = useState(false);

  async function copia() {
    try {
      await navigator.clipboard.writeText(riepilogoTesto(riepilogo, targets));
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      // Se gli appunti non si lasciano toccare non c'e' niente da riparare
      // qui: il riepilogo e' gia' tutto a schermo, si seleziona a mano.
      setCopiato(false);
    }
  }

  return (
    <div>
      <header className="mb-3">
        <p className="text-[15px] font-semibold">
          {riepilogo.numeroSettimana !== null ? (
            <span className="tabular-nums">
              Settimana {riepilogo.numeroSettimana} ·{" "}
            </span>
          ) : null}
          {giornoMese(riepilogo.lunedi)} – {giornoMese(riepilogo.domenica)}
        </p>
        {riepilogo.inCorso ? (
          <p className="mt-0.5 text-[13px] text-muted">Settimana ancora in corso</p>
        ) : null}
        {/*
          "Peso della settimana scorsa e di questa" e' la prima domanda del
          PT ogni domenica: sta qui, non in fondo, e non compare affatto se
          manca una delle due misure (regola 6).
        */}
        {riepilogo.pesoSettimana !== null || riepilogo.pesoSettimanaScorsa !== null ? (
          <p className="mt-1 text-[13px] tabular-nums text-muted">
            {riepilogo.pesoSettimana !== null
              ? `Peso: ${formatPeso(riepilogo.pesoSettimana)} kg`
              : "Peso questa settimana: non ancora registrato"}
            {riepilogo.pesoSettimanaScorsa !== null
              ? ` (${formatPeso(riepilogo.pesoSettimanaScorsa)} kg la settimana scorsa)`
              : ""}
          </p>
        ) : null}
      </header>

      <ul className="divide-y divide-hairline">
        {riepilogo.giorni.map((giorno) => {
          const futuro = giorno.day > riepilogo.oggi;
          const oggi = giorno.day === riepilogo.oggi;
          const pieno = isLogged(giorno);

          return (
            <li
              key={giorno.day}
              className="flex items-baseline justify-between gap-3 py-2 first:pt-0"
            >
              <span className="w-14 shrink-0 text-[13px] text-muted">
                {nomeGiorno(giorno.day)} {Number(giorno.day.slice(8))}
              </span>

              {futuro ? (
                <span aria-label="Giorno non ancora arrivato" className="text-[13px] text-muted">
                  —
                </span>
              ) : !pieno ? (
                <span className="text-[13px] text-muted">
                  {oggi ? "niente per ora" : "non registrato"}
                </span>
              ) : (
                <span className="min-w-0 text-right">
                  <span className="block text-[15px] font-semibold tabular-nums">
                    {formatMacro(giorno.kcal, "kcal")} kcal
                    {oggi ? <span className="font-normal text-muted"> · in corso</span> : null}
                  </span>
                  <span className="block text-[13px] tabular-nums text-muted">
                    C {formatMacro(giorno.carbs, "carbs")} · P{" "}
                    {formatMacro(giorno.protein, "protein")} · G{" "}
                    {formatMacro(giorno.fat, "fat")}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/*
        La media dichiara il proprio denominatore anche a schermo: e' la
        stessa ragione della regola 13, i giorni non compilati non sono zeri
        e oggi non e' un giorno finito.
      */}
      <div className="mt-4 rounded-xl bg-raised px-4 py-3">
        {riepilogo.medie ? (
          <>
            <p className="text-[15px] font-semibold tabular-nums">
              {formatMacro(riepilogo.medie.kcal, "kcal")} kcal al giorno
            </p>
            <p className="mt-0.5 text-[13px] tabular-nums text-muted">
              C {formatMacro(riepilogo.medie.carbs, "carbs")} · P{" "}
              {formatMacro(riepilogo.medie.protein, "protein")} · G{" "}
              {formatMacro(riepilogo.medie.fat, "fat")}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-muted">
              Media su {riepilogo.registrati}{" "}
              {riepilogo.registrati === 1 ? "giorno registrato" : "giorni registrati"} su{" "}
              {riepilogo.conclusi} conclusi. Target {targets.kcal} kcal.
            </p>
          </>
        ) : (
          <p className="text-[13px] leading-snug text-muted">
            Nessun giorno concluso e registrato in questa settimana: non c&apos;è
            ancora una media da fare.
          </p>
        )}
      </div>

      <NotaDieta weekStart={riepilogo.lunedi} nota={riepilogo.notaDieta} />

      <p className="mt-4 mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">
        Allenamento
      </p>
      {riepilogo.sedute.length === 0 ? (
        <p className="text-[13px] text-muted">Nessuna seduta registrata questa settimana.</p>
      ) : (
        <>
          <ul className="divide-y divide-hairline">
            {riepilogo.sedute.map((seduta, indice) => (
              <li
                key={`${seduta.day}-${indice}`}
                className="flex items-baseline justify-between gap-3 py-2 first:pt-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">
                    {seduta.label} — {seduta.focus}
                  </span>
                  <span className="block text-[13px] text-muted">
                    {nomeGiorno(seduta.day)} {Number(seduta.day.slice(8))} · {seduta.setCount}{" "}
                    {seduta.setCount === 1 ? "serie" : "serie"}
                  </span>
                </span>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                  {formatVolume(seduta.volume)} kg
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-muted">
            {riepilogo.sedute.length} {riepilogo.sedute.length === 1 ? "seduta" : "sedute"} ·{" "}
            {formatVolume(riepilogo.volumeTotale)} kg sollevati in tutto. Sugli
            esercizi con i manubri il carico è quello di un manubrio.
          </p>
        </>
      )}

      <button
        type="button"
        onClick={copia}
        className="mt-4 min-h-12 w-full rounded-xl border border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
      >
        {copiato ? "Copiato ✓" : "Copia il riepilogo"}
      </button>
    </div>
  );
}
