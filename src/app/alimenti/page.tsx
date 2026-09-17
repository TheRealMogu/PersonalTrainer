import Link from "next/link";
import { AlimentiArchivio } from "@/components/alimenti-archivio";
import { DbErrorPanel } from "@/components/db-error-panel";
import { PageHeader } from "@/components/page-header";
import { getQuickFoods } from "@/lib/queries";
import type { QuickFood } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * L'archivio personale degli alimenti.
 *
 * Fino a ieri i tasti rapidi venivano dal seed e si cambiavano solo con un
 * `db:seed`. Adesso sono roba tua: si aggiungono, si correggono e si tolgono
 * da qui, e crescono da soli ogni volta che salvi un pasto fra i rapidi.
 *
 * Non serve nessun archivio esterno per cominciare: tu mangi un insieme
 * limitato di prodotti, e ognuno inserito una volta e' giusto per sempre --
 * con i valori letti sulla tua confezione e la porzione che usi tu.
 */
export default async function AlimentiPage() {
  let foods: QuickFood[];
  try {
    foods = await getQuickFoods();
  } catch (error) {
    console.error("[alimenti] lettura fallita:", error);
    return (
      <main>
        <PageHeader title="I tuoi alimenti" />
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
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">I tuoi alimenti</h1>
        <p className="mt-1 text-[15px] leading-snug text-muted">
          {foods.length === 1 ? "1 alimento" : `${foods.length} alimenti`} fra i tasti
          rapidi del diario. Si riempie da solo: ogni pasto che salvi fra i rapidi
          finisce qui.
        </p>
      </header>

      <AlimentiArchivio foods={foods} />
    </main>
  );
}
