import Link from "next/link";
import { Card } from "@/components/card";
import { LogoutButton } from "@/components/logout-button";
import { PageHeader } from "@/components/page-header";
import { IconProfilo } from "@/components/nav-icons";
import {
  Etichetta,
  Griglia,
  Riquadro,
  RiquadroLink,
} from "@/components/riquadro";
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
      <PageHeader
        title="Piano"
        subtitle="Linee guida del personal trainer"
        icon={<IconProfilo />}
      />

      {/*
        I target come riquadri, con lo stesso pallino di colore del diario:
        le calorie a tutta riga perché sono il numero su cui si regola tutto
        il resto, i macro e l'acqua a metà.
      */}
      <Section title="Target giornaliero">
        <Griglia>
          <Riquadro ampio>
            <Etichetta macro="kcal">{MACRO_LABELS.kcal}</Etichetta>
            <p className="mt-1 leading-none">
              <span className="text-[34px] font-bold tracking-tight">
                {formatMacro(obiettivi.macro.kcal, "kcal")}
              </span>
              <span className="ml-1.5 text-[15px] text-muted">
                {MACRO_UNITS.kcal}
              </span>
            </p>
          </Riquadro>
          {MACRO_ORDER.filter((key) => key !== "kcal").map((key) => (
            <Riquadro key={key}>
              <Etichetta macro={key}>{MACRO_LABELS[key]}</Etichetta>
              <p className="mt-1 leading-tight">
                <span className="text-[22px] font-semibold">
                  {formatMacro(obiettivi.macro[key], key)}
                </span>
                <span className="ml-1 text-[13px] text-muted">
                  {MACRO_UNITS[key]}
                </span>
              </p>
            </Riquadro>
          ))}
          <Riquadro>
            <Etichetta>Acqua</Etichetta>
            <p className="mt-1 leading-tight">
              <span className="text-[22px] font-semibold">
                {obiettivi.bicchieriAcqua}
              </span>
              <span className="ml-1 text-[13px] text-muted">bicchieri</span>
            </p>
          </Riquadro>
        </Griglia>
        <Link
          href="/obiettivi"
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-surface text-[15px] font-medium text-accent shadow-[var(--shadow-card)] tocco active:bg-raised"
        >
          Cambia gli obiettivi
        </Link>
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

      {/*
        Quattro posti in cui si va, non quattro cose da leggere: una griglia
        di riquadri che si toccano interi, invece di quattro schede alte
        mezzo schermo con un paragrafo e un tasto ciascuna. La spiegazione
        lunga sta nella pagina che si apre, dove serve.
      */}
      <Section title="Da gestire">
        <Griglia>
          <RiquadroLink href="/scheda" titolo="Scheda">
            Quando il PT ne manda una nuova
          </RiquadroLink>
          <RiquadroLink href="/integratori" titolo="Integratori">
            Le spunte nel diario
          </RiquadroLink>
          <RiquadroLink href="/alimenti" titolo="Alimenti">
            I tasti rapidi del diario
          </RiquadroLink>
          <RiquadroLink href="/fitbit" titolo="Fitbit">
            I passi senza scriverli
          </RiquadroLink>
        </Griglia>
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
