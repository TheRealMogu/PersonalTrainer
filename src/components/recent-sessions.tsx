"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSession } from "@/app/allenamento/actions";
import { proponiAnnullamento } from "@/lib/undo-seduta-store";
import { formatVolume } from "@/lib/workout";

export type RecentSession = {
  id: number;
  day: string;
  label: string;
  focus: string;
  volume: number;
  setCount: number;
};

/**
 * Le ultime sedute, con la possibilita' di toglierne una.
 *
 * Serve per la giornata avviata per sbaglio: prima restava li' per sempre,
 * magari con zero serie, a sporcare lo storico e la rotazione che decide
 * quale giornata tocca. L'eliminazione porta con se' il contenuto, quindi si
 * annulla come tutto il resto.
 */
export function RecentSessions({ sessions }: { sessions: RecentSession[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(session: RecentSession) {
    setError(null);
    startTransition(async () => {
      const result = await deleteSession(session.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      proponiAnnullamento({
        tipo: "ripristina",
        backup: result.backup,
        messaggio: `"${session.label} — ${session.focus}" eliminato`,
      });
      router.refresh();
    });
  }

  return (
    <>
      <ul className="divide-y divide-hairline">
        {sessions.map((session) => (
          <li key={session.id} className="flex items-center gap-2 py-1">
            <div className="min-w-0 flex-1 py-1.5">
              <p className="truncate text-[15px]">
                {session.label} — {session.focus}
              </p>
              <p className="mt-0.5 text-[13px] tabular-nums text-muted">
                {session.day.slice(8, 10)}/{session.day.slice(5, 7)} ·{" "}
                {session.setCount === 1 ? "1 serie" : `${session.setCount} serie`}
              </p>
            </div>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums">
              {formatVolume(session.volume)} kg
            </span>
            <button
              type="button"
              onClick={() => handleDelete(session)}
              aria-label={`Elimina ${session.label} del ${session.day}`}
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-raised"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M3 5h12M7.5 5V3.5h3V5M6 5l.6 9.5h4.8L12 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="mt-3 text-[13px] text-over">
          {error}
        </p>
      ) : null}

    </>
  );
}
