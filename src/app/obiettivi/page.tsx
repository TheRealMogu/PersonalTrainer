import Link from "next/link";
import { DbErrorPanel } from "@/components/db-error-panel";
import { ObiettiviForm } from "@/components/obiettivi-form";
import { PageHeader } from "@/components/page-header";
import { getObiettivi } from "@/lib/queries";
import type { Obiettivi } from "@/lib/targets";

export const dynamic = "force-dynamic";

export default async function ObiettiviPage() {
  let obiettivi: Obiettivi;
  try {
    obiettivi = await getObiettivi();
  } catch (error) {
    console.error("[obiettivi] lettura fallita:", error);
    return (
      <main>
        <PageHeader title="Obiettivi" />
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
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Obiettivi</h1>
        <p className="mt-1 text-[15px] leading-snug text-muted">
          I numeri del personal trainer. Quando cambia fase li riscrivi qui,
          senza aspettare nessuno.
        </p>
      </header>

      <ObiettiviForm iniziali={obiettivi} />
    </main>
  );
}
