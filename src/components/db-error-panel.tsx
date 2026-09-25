import { classifyDbError, describeDbError } from "@/lib/db-error";
import { RetryButton } from "./retry-button";

/**
 * Pannello mostrato al posto dei dati quando il database non risponde.
 *
 * Sta sul server di proposito: in produzione Next nasconde il messaggio
 * d'errore agli error boundary lato client, e resta solo un codice. Qui
 * l'errore ce l'abbiamo ancora, quindi possiamo dire cosa e' successo.
 *
 * Niente rosso: il rosso in questa app vuol dire "fuori target". Un problema
 * tecnico non e' una colpa dell'utente e non ha bisogno di gridare.
 */
export function DbErrorPanel({ error }: { error: unknown }) {
  const kind = classifyDbError(error);
  const { title, body, hint, command } = describeDbError(kind);

  return (
    <section className="mb-4 rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
      {hint ? <p className="mt-2 text-[15px] leading-relaxed text-muted">{hint}</p> : null}
      {command ? (
        <p className="mt-2 overflow-x-auto rounded-lg bg-raised px-3 py-2">
          <code className="text-[14px] tabular-nums">{command}</code>
        </p>
      ) : null}

      <p className="mt-4 text-[13px] text-muted">
        Quello che hai già registrato è al sicuro: non si è perso niente.
      </p>

      <div className="mt-4">
        <RetryButton />
      </div>
    </section>
  );
}
