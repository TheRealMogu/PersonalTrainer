"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startSession } from "@/app/allenamento/actions";

export function StartWorkoutButton({ dayId, label }: { dayId: number; label: string }) {
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
        className="min-h-11 w-full rounded-xl bg-accent text-[15px] font-semibold text-white active:opacity-80 disabled:opacity-50"
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
