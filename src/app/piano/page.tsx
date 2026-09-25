import Link from "next/link";
import { Card } from "@/components/card";
import { LogoutButton } from "@/components/logout-button";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { Versione } from "@/components/versione";
import { PLAN_SECTIONS } from "@/lib/plan";
import { todayIso } from "@/lib/date";
import { meseDi, settimanaDi } from "@/lib/intervallo-export";
import { formatMacro } from "@/lib/nutrition";
import {
  MACRO_LABELS,
  MACRO_ORDER,
  MACRO_UNITS,
  type Obiettivi,
} from "@/lib/targets";
import { getObiettivi } from "@/lib/queries";
import { OBIETTIVI_PREDEFINITI } from "@/lib/targets";

export const dynamic = "force-dynamic";

export default async function PianoPage() {
  // Su ora italiana, come tutto il resto: il server gira in UTC e fra
  // mezzanotte e le due "questa settimana" sarebbe quella prima.
  const oggi = todayIso();
  const settimana = settimanaDi(oggi);
  const mese = meseDi(oggi);

  // Se la lettura fallisce si mostrano i valori di partenza invece di una
  // schermata d'errore: il Piano contiene anche le regole del PT e
  // l'accesso, che non c'entrano niente con i target.
  let obiettivi: Obiettivi = OBIETTIVI_PREDEFINITI;
  try {
    obiettivi = await getObiettivi();
  } catch (error) {
    console.error("[piano] obiettivi non letti:", error);
  }

  return (
    <main>
      <PageHeader title="Piano" subtitle="Linee guida del personal trainer" />

      <Section title="Target giornaliero">
        <Card>
          <dl className="divide-y divide-hairline">
            {MACRO_ORDER.map((key) => (
              <div
                key={key}
                className="flex items-baseline justify-between py-3 first:pt-0 last:pb-0"
              >
                <dt className="text-[15px]">{MACRO_LABELS[key]}</dt>
                <dd className="text-[15px] font-semibold tabular-nums">
                  {formatMacro(obiettivi.macro[key], key)} {MACRO_UNITS[key]}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between py-3 last:pb-0">
              <dt className="text-[15px]">Acqua</dt>
              <dd className="text-[15px] font-semibold tabular-nums">
                {obiettivi.bicchieriAcqua} bicchieri
              </dd>
            </div>
          </dl>
          <Link
            href="/obiettivi"
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
          >
            Cambia gli obiettivi
          </Link>
        </Card>
      </Section>

      {PLAN_SECTIONS.map((section) => (
        <Section key={section.title} title={section.title}>
          <Card>
            <ul className="space-y-3">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-snug">
                  <span
                    aria-hidden="true"
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-solid"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      ))}

      <Section title="La tua scheda">
        <Card>
          <p className="mb-4 text-[15px] leading-snug text-muted">
            Quando il personal trainer ne manda una nuova: copi un prompt, lo
            mandi a una chat con i suoi documenti, riporti indietro la risposta
            e <strong className="font-medium">guardi cosa cambia</strong> prima
            di confermare. Niente viene cancellato — quello che esce dal
            programma resta leggibile con tutti i carichi registrati sopra.
          </p>
          <Link
            href="/scheda"
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
          >
            Cambia la scheda
          </Link>
        </Card>
      </Section>

      <Section title="I tuoi integratori">
        <Card>
          <p className="mb-4 text-[15px] leading-snug text-muted">
            Le vitamine e gli integratori che prendi. Diventano una riga di
            spunte nel diario, sotto l&apos;acqua — e finché l&apos;elenco è
            vuoto quella riga non c&apos;è.
          </p>
          <Link
            href="/integratori"
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
          >
            Apri l&apos;elenco
          </Link>
        </Card>
      </Section>

      <Section title="I tuoi alimenti">
        <Card>
          <p className="mb-4 text-[15px] leading-snug text-muted">
            I tasti rapidi del diario. Si aggiungono, si correggono e si tolgono
            da qui — e crescono da soli ogni volta che salvi un pasto fra i
            rapidi.
          </p>
          <Link
            href="/alimenti"
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
          >
            Apri l&apos;archivio
          </Link>
        </Card>
      </Section>

      <Section title="Passi da Fitbit">
        <Card>
          <p className="mb-4 text-[15px] leading-snug text-muted">
            Collega Google (che porta anche i dati di Fitbit) per non scrivere i
            passi a mano ogni giorno — restano comunque modificabili nel diario.
          </p>
          <Link
            href="/fitbit"
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
          >
            Gestisci il collegamento
          </Link>
        </Card>
      </Section>

      {/*
        I dati restano tuoi. Se un giorno il progetto si ferma, o Neon cambia
        idea sul piano gratuito, i mesi di diario devono poter uscire di qui.
      */}
      <Section title="I tuoi dati">
        <Card>
          <p className="mb-4 text-[15px] leading-snug text-muted">
            Scarica tutto quello che hai registrato. Il JSON è la copia
            completa; i CSV si aprono in Excel o Numbers.
          </p>
          <ul className="space-y-2">
            {[
              { href: "/api/esporta", testo: "Copia completa (JSON)" },
              { href: "/api/esporta?formato=pasti", testo: "Pasti (CSV)" },
              {
                href: "/api/esporta?formato=serie",
                testo: "Allenamenti (CSV)",
              },
            ].map((voce) => (
              <li key={voce.href}>
                <a
                  href={voce.href}
                  download
                  className="flex min-h-11 w-full items-center justify-center rounded-xl border border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
                >
                  {voce.testo}
                </a>
              </li>
            ))}
          </ul>

          {/*
            Un periodo solo, per mandarne uno al personal trainer senza aprire
            il CSV e tagliarlo a mano. Il file si porta il periodo nel nome --
            "pasti-2026-09-14_2026-09-20.csv" -- perche' un export parziale
            che sembra completo fa concludere a chi lo legge che hai mangiato
            solo quello.
          */}
          <div className="mt-4 border-t border-hairline pt-4">
            <p className="mb-3 text-[15px] leading-snug text-muted">
              Oppure un periodo solo, da mandare al personal trainer:
            </p>
            <ul className="space-y-2">
              {[
                {
                  href: `/api/esporta?formato=pasti&da=${settimana.da}&a=${settimana.a}`,
                  testo: "Pasti di questa settimana (CSV)",
                },
                {
                  href: `/api/esporta?formato=serie&da=${settimana.da}&a=${settimana.a}`,
                  testo: "Allenamenti di questa settimana (CSV)",
                },
                {
                  href: `/api/esporta?da=${mese.da}&a=${mese.a}`,
                  testo: "Questo mese, tutto (JSON)",
                },
              ].map((voce) => (
                <li key={voce.href}>
                  <a
                    href={voce.href}
                    download
                    className="flex min-h-11 w-full items-center justify-center rounded-xl border border-hairline px-3 text-center text-[15px] font-medium text-accent tocco active:bg-raised"
                  >
                    {voce.testo}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </Section>

      <Section title="Accesso">
        <Card>
          <LogoutButton />
          <Versione />
        </Card>
      </Section>
    </main>
  );
}
