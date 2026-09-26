import Link from "next/link";
import { CaricaSettimane } from "@/components/carica-settimane";
import { DbErrorPanel } from "@/components/db-error-panel";
import { PageHeader } from "@/components/page-header";
import { leggiEserciziAttuali } from "./actions";
import type { GiornataAttuale } from "@/lib/settimane";

export const dynamic = "force-dynamic";

/**
 * Caricare la prescrizione a settimane (ripetizioni e carico, blocco per
 * blocco) senza cambiare gli esercizi.
 *
 * Sta sotto *Cambia la scheda* perché è la stessa famiglia di gesto -- il PT
 * manda un documento, tu lo passi a una chat, guardi cosa cambia prima di
 * confermare -- ma resta una pagina a parte: qui gli esercizi non cambiano
 * mai, quindi il confronto non ha niente da archiviare, ed è la cosa che si
 * ripete più spesso (un blocco nuovo ogni poche settimane, contro una scheda
 * nuova ogni qualche mese).
 */
export default async function CaricaSettimanePage() {
  let attuali: GiornataAttuale[];
  try {
    attuali = await leggiEserciziAttuali();
  } catch (error) {
    console.error("[settimane] lettura fallita:", error);
    return (
      <main>
        <PageHeader title="Pesi e settimane" />
        <DbErrorPanel error={error} />
      </main>
    );
  }

  const esercizi = attuali.reduce((somma, g) => somma + g.esercizi.length, 0);

  return (
    <main>
      <div className="pt-12">
        <Link
          href="/scheda"
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
          Scheda
        </Link>
      </div>

      <header className="pb-6">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">
          Pesi e settimane
        </h1>
        <p className="mt-1 text-[15px] leading-snug text-muted">
          {esercizi === 0
            ? "Non c'è ancora nessun esercizio a cui abbinare dei pesi."
            : `${esercizi} ${esercizi === 1 ? "esercizio" : "esercizi"} nel programma di adesso.`}{" "}
          Gli esercizi restano quelli che sono: qui si aggiornano solo le
          ripetizioni e il carico che il PT prescrive per un blocco di
          settimane.
        </p>
      </header>

      <CaricaSettimane attuali={attuali} />
    </main>
  );
}
