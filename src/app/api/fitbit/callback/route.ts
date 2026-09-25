import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { fitbitConnessione } from "@/db/schema";
import {
  FITBIT_STATE_COOKIE,
  costruisciRedirectUri,
  scambiaCodice,
} from "@/lib/google-health";

/**
 * Dove Google rimanda dopo il consenso. Deve essere un Route Handler e non
 * una Server Action: Google apre questo indirizzo con un GET del browser,
 * non con l'invio di un form dell'app.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const erroreGoogle = url.searchParams.get("error");

  const store = await cookies();
  const statoAtteso = store.get(FITBIT_STATE_COOKIE)?.value;
  store.delete(FITBIT_STATE_COOKIE);

  function vaiAFitbit(errore?: string) {
    const destinazione = new URL("/fitbit", request.url);
    if (errore) destinazione.searchParams.set("errore", errore);
    return NextResponse.redirect(destinazione);
  }

  // L'utente ha annullato il consenso su Google: non e' un guasto (regola
  // 8/9), quindi si torna e basta, senza mostrare un errore per una scelta.
  if (erroreGoogle) return vaiAFitbit();

  if (!code || !state || !statoAtteso || state !== statoAtteso) {
    return vaiAFitbit(
      "Il collegamento con Google non è andato a buon fine. Riprova.",
    );
  }

  const redirectUri = costruisciRedirectUri();
  if (!redirectUri) {
    return vaiAFitbit(
      "Manca la variabile APP_URL: serve per completare il collegamento.",
    );
  }

  const esito = await scambiaCodice(code, redirectUri);
  if ("errore" in esito) return vaiAFitbit(esito.errore);

  try {
    await db
      .insert(fitbitConnessione)
      .values({
        id: 1,
        accessToken: esito.accessToken,
        refreshToken: esito.refreshToken,
        scadeIl: esito.scadeIl,
      })
      .onConflictDoUpdate({
        target: fitbitConnessione.id,
        set: {
          accessToken: esito.accessToken,
          refreshToken: esito.refreshToken,
          scadeIl: esito.scadeIl,
          connessoIl: new Date(),
        },
      });
  } catch (cause) {
    console.error("[fitbit/callback] scrittura connessione fallita", cause);
    return vaiAFitbit(
      "Connesso a Google, ma non sono riuscito a salvarlo. Riprova.",
    );
  }

  return NextResponse.redirect(new URL("/fitbit?connesso=1", request.url));
}
