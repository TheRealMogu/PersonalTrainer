"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { avviaConnessioneFitbit, scollegaFitbit } from "@/app/fitbit/actions";

export function ConnessioneFitbit({
  connesso,
  messaggioErrore,
  appenaConnesso,
}: {
  connesso: boolean;
  messaggioErrore: string | null;
  appenaConnesso: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div>
      {connesso ? (
        <>
          <p className="mb-4 text-[15px] leading-snug">
            {appenaConnesso ? "Connesso ✓ — " : ""}
            Fitbit è collegato: nel diario, sotto Passi, compare «Sincronizza da
            Fitbit».
          </p>
          <p className="mb-4 text-[13px] leading-snug text-muted">
            Finché questa app resta in modalità «Testing» su Google Cloud, il
            permesso scade da solo ogni 7 giorni — è Google a deciderlo, non un
            guasto di qui. Quando succede basta ripetere il collegamento.
          </p>
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                const esito = await scollegaFitbit();
                if (esito.ok) router.refresh();
              })
            }
            disabled={pending}
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-hairline text-[15px] font-medium text-muted tocco active:bg-raised disabled:opacity-60"
          >
            {pending ? "Scollego…" : "Scollega"}
          </button>
        </>
      ) : (
        <>
          <p className="mb-4 text-[15px] leading-snug text-muted">
            Con Fitbit collegato, i passi del giorno arrivano da soli invece di
            scriverli a mano: nel diario compare un tasto «Sincronizza da
            Fitbit» accanto al campo Passi.
          </p>
          <form action={avviaConnessioneFitbit}>
            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-hairline text-[15px] font-medium text-accent tocco active:bg-raised"
            >
              Connetti con Google
            </button>
          </form>
        </>
      )}

      {messaggioErrore ? (
        <p role="alert" className="mt-4 text-[13px] text-muted">
          {messaggioErrore}
        </p>
      ) : null}
    </div>
  );
}
