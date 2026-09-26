"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { impostaSettimana } from "@/app/scheda/settimane/actions";

/**
 * In che settimana del blocco sei -- una tacca per settimana, come i giorni
 * di *Storico*. A mano e non a calendario (vedi `workout_programma` in
 * `schema.ts`): un blocco si segue a sedute fatte, non a giorni passati, e
 * chi salta una settimana per malattia non deve ritrovarsela avanti di
 * colpo. Sparisce da sola quando il blocco ha una settimana sola: cambiare
 * non vorrebbe dire niente.
 */
export function SettimanaProgramma({
  settimane,
  corrente,
}: {
  settimane: number[];
  corrente: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (settimane.length <= 1) return null;

  function cambia(settimana: number) {
    if (settimana === corrente) return;
    startTransition(async () => {
      await impostaSettimana(settimana);
      router.refresh();
    });
  }

  return (
    <div
      className="mb-4 flex gap-2 overflow-x-auto"
      role="group"
      aria-label="Settimana del blocco"
    >
      {settimane.map((settimana) => {
        const selezionata = settimana === corrente;
        return (
          <button
            key={settimana}
            type="button"
            onClick={() => cambia(settimana)}
            disabled={pending}
            aria-current={selezionata ? "true" : undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-full px-5 text-[13px] font-medium transition-colors duration-200 ease-ios disabled:opacity-60 ${
              selezionata
                ? "bg-accent-solid text-on-accent"
                : "border border-hairline bg-surface text-muted"
            }`}
          >
            Settimana {settimana}
          </button>
        );
      })}
    </div>
  );
}
