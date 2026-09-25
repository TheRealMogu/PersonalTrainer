import Link from "next/link";
import { Card } from "@/components/card";
import { ConnessioneFitbit } from "@/components/connessione-fitbit";
import { DbErrorPanel } from "@/components/db-error-panel";
import { getFitbitConnesso } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Il collegamento con Fitbit (via Google Health, non la vecchia Fitbit Web
 * API: va in pensione a fine settembre 2026 -- vedi ROADMAP.md). Una
 * schermata sua dentro Piano, come Integratori o Alimenti: il collegamento
 * si fa una volta ogni tanto, non è un gesto quotidiano.
 */
export default async function FitbitPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string; connesso?: string }>;
}) {
  const { errore, connesso: appenaConnessoParam } = await searchParams;

  let connesso: boolean;
  try {
    connesso = await getFitbitConnesso();
  } catch (error) {
    console.error("[fitbit] lettura della connessione fallita:", error);
    return (
      <main>
        <div className="pt-12">
          <Link
            href="/piano"
            className="-ml-1 inline-flex min-h-11 items-center gap-1.5 pr-2 text-[15px] text-accent tocco active:opacity-60"
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
            Piano
          </Link>
        </div>
        <PageTitle />
        <DbErrorPanel error={error} />
      </main>
    );
  }

  return (
    <main>
      <div className="pt-12">
        <Link
          href="/piano"
          className="-ml-1 inline-flex min-h-11 items-center gap-1.5 pr-2 text-[15px] text-accent tocco active:opacity-60"
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
          Piano
        </Link>
      </div>

      <PageTitle />

      <Card>
        <ConnessioneFitbit
          connesso={connesso}
          messaggioErrore={errore ?? null}
          appenaConnesso={appenaConnessoParam === "1"}
        />
      </Card>
    </main>
  );
}

function PageTitle() {
  return (
    <header className="pb-6">
      <h1 className="text-[28px] font-bold leading-tight tracking-tight">
        Passi da Fitbit
      </h1>
      <p className="mt-1 text-[15px] leading-snug text-muted">
        Collega Google (che porta anche i dati di Fitbit) per non scrivere i
        passi a mano ogni giorno.
      </p>
    </header>
  );
}
