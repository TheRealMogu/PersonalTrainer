"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fitbitConnessione } from "@/db/schema";
import { isIsoDate } from "@/lib/date";
import {
  FITBIT_STATE_COOKIE,
  costruisciRedirectUri,
  costruisciUrlAutorizzazione,
  fitbitConfigurato,
  leggiPassiDelGiorno,
  rinnovaToken,
} from "@/lib/google-health";
import type { ActionResult } from "@/app/actions";

const STATE_MAX_AGE_SECONDS = 600;

function messaggioNonConfigurato(): string {
  return "Fitbit non è configurato: mancano le chiavi Google nelle variabili d'ambiente (vedi README).";
}

/** Avvia il consenso Google. Non torna mai un valore: o reindirizza a Google, o torna su /fitbit con un errore. */
export async function avviaConnessioneFitbit(): Promise<void> {
  if (!fitbitConfigurato()) {
    redirect(`/fitbit?errore=${encodeURIComponent(messaggioNonConfigurato())}`);
  }

  const redirectUri = costruisciRedirectUri();
  if (!redirectUri) {
    redirect(
      `/fitbit?errore=${encodeURIComponent("Manca la variabile APP_URL: serve per tornare qui dopo il consenso Google.")}`,
    );
  }

  const state = crypto.randomUUID();
  const store = await cookies();
  store.set(FITBIT_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE_SECONDS,
  });

  const url = costruisciUrlAutorizzazione(redirectUri, state);
  if (!url) {
    redirect(`/fitbit?errore=${encodeURIComponent(messaggioNonConfigurato())}`);
  }
  redirect(url);
}

/** Scollega Fitbit: cancella la riga, non la svuota -- "mai connesso" e "scollegato" sono la stessa cosa. */
export async function scollegaFitbit(): Promise<ActionResult> {
  try {
    await db.delete(fitbitConnessione);
  } catch (cause) {
    console.error("scollegaFitbit fallita", cause);
    return { ok: false, error: "Non sono riuscito a scollegare. Riprova." };
  }
  revalidatePath("/fitbit");
  revalidatePath("/");
  return { ok: true };
}

export type SincronizzaPassiResult =
  | { ok: true; passi: number | null }
  | { ok: false; error: string };

/**
 * Legge i passi del giorno da Google Health e li restituisce -- non li
 * scrive da sola. Il campo Passi li mostra nel campo di testo esistente e
 * resta il tasto "Salva" a scriverli davvero, con la stessa porta unica
 * (`setPassi`) di quando li digiti a mano: un numero letto da un sensore
 * esterno si mostra e si conferma come uno stimato (regola 12), anche se qui
 * non è una stima ma una misura -- il costo è un tocco in più, il guadagno è
 * non fidarsi ciecamente di un servizio mai chiamato da questo repo.
 */
export async function sincronizzaPassi(
  day: string,
): Promise<SincronizzaPassiResult> {
  if (!isIsoDate(day)) return { ok: false, error: "Data non valida." };

  const [connessione] = await db
    .select()
    .from(fitbitConnessione)
    .where(eq(fitbitConnessione.id, 1));
  if (!connessione) {
    return {
      ok: false,
      error: "Fitbit non è collegato. Collegalo da Piano.",
    };
  }

  let accessToken = connessione.accessToken;
  const scadeFraMs = connessione.scadeIl.getTime() - Date.now();
  if (scadeFraMs < 60_000) {
    const rinnovo = await rinnovaToken(connessione.refreshToken);
    if ("errore" in rinnovo) {
      await db.delete(fitbitConnessione);
      revalidatePath("/fitbit");
      revalidatePath("/");
      return { ok: false, error: rinnovo.errore };
    }
    accessToken = rinnovo.accessToken;
    await db
      .update(fitbitConnessione)
      .set({ accessToken, scadeIl: rinnovo.scadeIl })
      .where(eq(fitbitConnessione.id, 1));
  }

  const lettura = await leggiPassiDelGiorno(accessToken, day);
  if (!lettura.ok) {
    if (lettura.scaduto) {
      await db.delete(fitbitConnessione);
      revalidatePath("/fitbit");
      revalidatePath("/");
    }
    return { ok: false, error: lettura.errore };
  }
  return { ok: true, passi: lettura.passi };
}
