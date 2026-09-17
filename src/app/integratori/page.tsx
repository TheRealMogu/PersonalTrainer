import Link from "next/link";
import { DbErrorPanel } from "@/components/db-error-panel";
import { IntegratoriArchivio } from "@/components/integratori-archivio";
import { PageHeader } from "@/components/page-header";
import { getIntegratori } from "@/lib/queries";
import type { Supplement } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * Gli integratori: l'elenco di cosa prendi, definito da te.
 *
 * Non sono cibo, e infatti non stanno nell'archivio degli alimenti: non hanno
 * macro, non entrano nel budget calorico, e la domanda a cui rispondono e'
 * "l'ho presa oggi?". Nel diario diventano una riga di spunte sotto l'acqua,
 * che compare solo se qui dentro c'e' qualcosa.
 */
export default async function IntegratoriPage() {
  let integratori: Supplement[];
  try {
    integratori = await getIntegratori();
  } catch (error) {
    console.error("[integratori] lettura fallita:", error);
    return (
      <main>
        <PageHeader title="I tuoi integratori" />
        <DbErrorPanel error={error} />
      </main>
    );
  }

  const attivi = integratori.filter((i) => i.active).length;

  return (
    <main>
      <div className="pt-12">
        <Link
          href="/piano"
          className="-ml-1 inline-flex min-h-11 items-center gap-1.5 pr-2 text-[15px] text-accent tocco active:opacity-60"
        >
          <svg width="8" height="14" viewBox="0 0 10 16" fill="none" aria-hidden="true">
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

      <header className="pb-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">
          I tuoi integratori
        </h1>
        <p className="mt-1 text-[15px] leading-snug text-muted">
          {attivi === 0
            ? "Nessuno in elenco: nel diario non compare nessuna riga."
            : `${attivi === 1 ? "1 integratore" : `${attivi} integratori`} nel diario, uno per riga. Si spuntano con un tocco.`}
        </p>
      </header>

      <IntegratoriArchivio integratori={integratori} />
    </main>
  );
}
