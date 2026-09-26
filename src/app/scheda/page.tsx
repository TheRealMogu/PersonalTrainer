import Link from "next/link";
import { CambiaScheda } from "@/components/cambia-scheda";
import { DbErrorPanel } from "@/components/db-error-panel";
import { PageHeader } from "@/components/page-header";
import { leggiSchedaAttuale } from "./actions";
import type { GiornataAttuale } from "@/lib/scheda";

export const dynamic = "force-dynamic";

/**
 * Cambiare la scheda quando il personal trainer ne manda una nuova.
 *
 * Sta in Piano e non in Allenamento: il cambio capita ogni qualche mese,
 * mentre Allenamento si apre per fare la seduta. Una cosa rara non deve
 * costare niente al gesto quotidiano.
 */
export default async function SchedaPage() {
  let attuale: GiornataAttuale[];
  try {
    attuale = await leggiSchedaAttuale();
  } catch (error) {
    console.error("[scheda] lettura fallita:", error);
    return (
      <main>
        <PageHeader title="Cambia la scheda" />
        <DbErrorPanel error={error} />
      </main>
    );
  }

  const esercizi = attuale.reduce((somma, g) => somma + g.esercizi.length, 0);

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

      <header className="pb-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">
          Cambia la scheda
        </h1>
        <p className="mt-1 text-[15px] leading-snug text-muted">
          {attuale.length === 0
            ? "Adesso non c'è nessuna scheda."
            : `Adesso: ${
                attuale.length === 1
                  ? "1 giornata"
                  : `${attuale.length} giornate`
              }, ${
                esercizi === 1 ? "1 esercizio" : `${esercizi} esercizi`
              }.`}{" "}
          Niente viene cancellato: quello che esce dal programma resta
          leggibile, con tutti i carichi che ci hai registrato sopra.
        </p>
        {/*
          Un blocco a settimane (stessi esercizi, ripetizioni e carico che
          salgono) capita piu' spesso di una scheda vera e propria: pagina a
          parte, cosi' non tocca rileggere tutto questo modulo per un
          aggiornamento che non cambia un solo esercizio.
        */}
        <Link
          href="/scheda/settimane"
          className="mt-3 flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-accent tocco active:opacity-60"
        >
          Aggiorna pesi e settimane
          <span aria-hidden="true">›</span>
        </Link>
      </header>

      <CambiaScheda attuale={attuale} />
    </main>
  );
}
