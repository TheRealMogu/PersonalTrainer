import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/card";
import { NotaSeduta } from "@/components/nota-seduta";
import { DbErrorPanel } from "@/components/db-error-panel";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { formatDayLabel } from "@/lib/date";
import { getSessionDetail, type SedutaDettaglio } from "@/lib/queries";
import {
  confrontaSerie,
  etichettaCarico,
  formatVolume,
  formatWeight,
  totalVolume,
} from "@/lib/workout";

export const dynamic = "force-dynamic";

/** Durata della seduta, o null se non e' stata chiusa. */
function durata(seduta: SedutaDettaglio): string | null {
  if (!seduta.endedAt) return null;
  const minuti = Math.round(
    (seduta.endedAt.getTime() - seduta.startedAt.getTime()) / 60_000
  );
  if (minuti < 1) return "meno di un minuto";
  if (minuti < 60) return `${minuti} min`;
  const ore = Math.floor(minuti / 60);
  const resto = minuti % 60;
  return resto === 0 ? `${ore} h` : `${ore} h ${resto} min`;
}

/**
 * Una seduta passata, per intero.
 *
 * Prima non si poteva aprire: la lista degli ultimi allenamenti dava il
 * volume e un cestino, quindi i carichi entravano nel database e non
 * tornavano piu' fuori. Qui ci sono tutti, serie per serie, con accanto come
 * era andata la volta prima -- che e' la ragione per cui li si registra.
 */
export default async function SedutaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();

  let seduta: SedutaDettaglio | null;
  try {
    seduta = await getSessionDetail(numero);
  } catch (error) {
    console.error("[seduta] lettura fallita:", error);
    return (
      <main>
        <PageHeader title="Allenamento" />
        <DbErrorPanel error={error} />
      </main>
    );
  }

  if (!seduta) notFound();

  const tutte = seduta.esercizi.flatMap((e) => e.serie);
  const volume = totalVolume(tutte);
  const fatti = seduta.esercizi.filter((e) => e.serie.length > 0);
  const saltati = seduta.esercizi.filter((e) => e.serie.length === 0);
  const tempo = durata(seduta);

  return (
    <main>
      <div className="pt-12">
        <Link
          href="/allenamento"
          className="inline-flex min-h-11 items-center gap-1.5 -ml-1 pr-2 text-[15px] text-accent tocco active:opacity-60"
        >
          <svg
            width="8"
            height="14"
            viewBox="0 0 10 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8.5 1 1.5 8l7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Allenamento
        </Link>
      </div>

      <header className="pb-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">
          {seduta.label} — {seduta.focus}
        </h1>
        <p className="mt-1 text-[15px] capitalize text-muted">
          {formatDayLabel(seduta.day)}
          {tempo ? <span className="lowercase"> · {tempo}</span> : null}
          {!seduta.endedAt ? (
            <span className="lowercase"> · ancora aperta</span>
          ) : null}
        </p>
      </header>

      <Card>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            { etichetta: "Volume", valore: `${formatVolume(volume)} kg` },
            { etichetta: "Serie", valore: String(tutte.length) },
            {
              etichetta: "Esercizi",
              valore: `${fatti.length}/${seduta.esercizi.length}`,
            },
          ].map((voce) => (
            <div key={voce.etichetta}>
              <dd className="text-[20px] font-bold tabular-nums leading-tight">
                {voce.valore}
              </dd>
              <dt className="mt-0.5 text-[13px] text-muted">
                {voce.etichetta}
              </dt>
            </div>
          ))}
        </dl>
      </Card>

      {/*
        Sotto i numeri, non sopra: i numeri sono quello che vieni a vedere, la
        nota e' quello che ti spiega perche' -- e serve solo quando i numeri
        non tornano.
      */}
      <Card>
        <NotaSeduta
          sessionId={seduta.id}
          nota={seduta.note}
          giorno={seduta.day}
        />
      </Card>

      {tutte.length === 0 ? (
        <Card>
          <p className="text-[15px] text-muted">
            In questa seduta non è stata registrata nessuna serie.
          </p>
        </Card>
      ) : null}

      {fatti.map((esercizio) => {
        const volumeEsercizio = totalVolume(esercizio.serie);
        return (
          <Section key={esercizio.id} title={esercizio.name}>
            <Card>
              <p className="mb-3 text-[13px] tabular-nums text-muted">
                {esercizio.serie.length}/{esercizio.sets} serie ·{" "}
                {formatVolume(volumeEsercizio)} kg
                {esercizio.precedenti.length === 0 ? " · prima volta" : null}
              </p>
              <ul className="divide-y divide-hairline">
                {esercizio.serie.map((serie) => {
                  const confronto = confrontaSerie(serie, esercizio.precedenti);
                  return (
                    <li
                      key={serie.id}
                      className="flex items-baseline gap-3 py-2 first:pt-0"
                    >
                      <span className="w-5 shrink-0 text-[13px] tabular-nums text-muted">
                        {serie.setNumber}
                      </span>
                      <span className="flex-1 text-[15px] tabular-nums">
                        <strong className="font-semibold">
                          {formatWeight(serie.weight)}
                        </strong>{" "}
                        kg ×{" "}
                        <strong className="font-semibold">{serie.reps}</strong>
                      </span>
                      {/*
                        Niente colore sul confronto: il rosso qui dentro e' per
                        il fuori target e per i guasti, e una serie piu'
                        leggera non e' ne' l'uno ne' l'altro. Il segno basta.
                      */}
                      {confronto ? (
                        <span className="shrink-0 text-[13px] tabular-nums text-muted">
                          {confronto.testo}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[13px] text-muted">
                Il confronto è con la stessa serie dell&apos;ultima volta.
                {etichettaCarico(esercizio.name) !== "kg"
                  ? " Il carico è quello di un manubrio."
                  : null}
              </p>
            </Card>
          </Section>
        );
      })}

      {/*
        Gli esercizi saltati si scrivono. Sapere cosa NON hai fatto e' parte
        del sapere com'e' andata: senza, una seduta a meta' si legge come una
        seduta intera piu' corta.
      */}
      {saltati.length > 0 ? (
        <Section title={saltati.length === 1 ? "Saltato" : "Saltati"}>
          <Card>
            <ul className="divide-y divide-hairline">
              {saltati.map((esercizio) => (
                <li
                  key={esercizio.id}
                  className="flex items-baseline justify-between gap-3 py-2 first:pt-0"
                >
                  <span className="min-w-0 flex-1 text-[15px] text-muted">
                    {esercizio.name}
                  </span>
                  <span className="shrink-0 text-[13px] tabular-nums text-muted">
                    {esercizio.sets} × {esercizio.reps}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      ) : null}
    </main>
  );
}
