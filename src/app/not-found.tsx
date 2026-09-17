import Link from "next/link";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";

/**
 * La schermata per un indirizzo che non esiste.
 *
 * Senza questo file Next ne mette una sua, che dice "This page could not be
 * found" -- in inglese, dentro un'app che per regola parla solo italiano. Ci
 * si finisce piu' facilmente di quanto sembri: basta tornare indietro su una
 * seduta appena eliminata.
 */
export default function NonTrovata() {
  return (
    <main>
      <PageHeader title="Non c'è niente qui" />
      <Card>
        <p className="text-[15px] leading-snug text-muted">
          Questo indirizzo non corrisponde a niente. Può succedere tornando
          indietro su qualcosa che hai eliminato.
        </p>
        <Link
          href="/"
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
        >
          Vai al diario
        </Link>
      </Card>
    </main>
  );
}
