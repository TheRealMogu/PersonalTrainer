import { OfflineRetryButton } from "@/components/offline-retry-button";
import { PageHeader } from "@/components/page-header";

/*
 * Nessun dato dal database qui dentro, di proposito: e' la pagina che il
 * service worker tiene in cache per l'apertura a freddo senza rete (vedi
 * public/sw.js). Deve rimanere valida per sempre senza essere rigenerata,
 * quindi non puo' contenere niente che cambi da una richiesta all'altra.
 */
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main>
      <PageHeader
        title="Sei offline"
        subtitle="Niente rete in questo momento"
      />

      {/*
        Niente rosso: come per il pannello di errore del database, questo non
        e' una colpa dell'utente e non e' un fuori target (regola 9).
      */}
      <section className="mb-4 rounded-2xl bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <p className="text-[15px] leading-relaxed text-muted">
          Il telefono non ha rete in questo momento, e questa schermata non era
          ancora stata aperta: senza rete e senza una copia sul telefono non
          c&apos;è niente da mostrare.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Se l&apos;app era già aperta quando la rete è caduta, continua a
          funzionare normalmente: succede solo aprendola da chiusa, senza rete.
        </p>
        <p className="mt-4 text-[13px] text-muted">
          Quello che hai già registrato è al sicuro: non si è perso niente.
        </p>

        <div className="mt-4">
          <OfflineRetryButton />
        </div>
      </section>
    </main>
  );
}
