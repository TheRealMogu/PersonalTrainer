"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startSession } from "@/app/allenamento/actions";

/**
 * `principale` e' la giornata consigliata, in cima: e' l'azione con cui si
 * entra in palestra. Le altre restano avviabili ma non competono con lei --
 * quattro pulsanti pieni e identici non dicono da dove cominciare.
 */
export function StartWorkoutButton({
  dayId,
  label,
  variante = "principale",
}: {
  dayId: number;
  label: string;
  variante?: "principale" | "secondaria";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-label={`Inizia ${label}`}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await startSession(dayId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
        className={`min-h-11 w-full rounded-xl text-[15px] font-semibold active:opacity-80 disabled:opacity-50 ${
          variante === "principale"
            ? "bg-accent text-on-accent"
            : "border border-hairline text-accent active:bg-raised"
        }`}
      >
        {pending ? "Apro…" : "Inizia"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-over">
          {error}
        </p>
      ) : null}
    </>
  );
}
