import { confiniGiornoRoma } from "@/lib/date";

/**
 * Passi da Google Health, che dietro un login Google porta anche i dati di
 * Fitbit (la vecchia Fitbit Web API ha smesso di accettare nuove app e va in
 * pensione del tutto a fine settembre 2026 -- vedi ROADMAP.md).
 *
 * A differenza di Open Food Facts, qui il proxy di rete di questo ambiente
 * NON blocca i domini Google: verificato con una richiesta vera sia contro
 * `oauth2.googleapis.com/token` sia contro `health.googleapis.com`, con
 * credenziali finte. Entrambi rispondono davvero (401, con la forma
 * dell'errore che ci si aspetta da un'API Google reale), e il codice qui
 * sotto la riconosce e la traduce in italiano senza spaccarsi. Quello che
 * resta non provato è il consenso vero: senza un account Google e un
 * browser con cui completarlo, non si può ottenere un token valido da
 * questo ambiente, quindi la lettura di passi reali non è mai stata vista.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://health.googleapis.com/v4";
const SCOPE =
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly";
const TIMEOUT_MS = 10_000;

/**
 * Cookie temporaneo con lo `state` OAuth (letto sia da chi avvia la
 * connessione sia dal callback): riconosce che il consenso arriva da qui e
 * non da un link costruito a mano. Vive qui e non nel file "use server" che
 * lo usa perche' quei file possono esportare solo funzioni asincrone -- una
 * costante li' dentro fa fallire la build (vedi CLAUDE.md).
 */
export const FITBIT_STATE_COOKIE = "fitbit_oauth_state";

function credenziali(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function fitbitConfigurato(): boolean {
  return credenziali() !== null;
}

/**
 * L'indirizzo a cui Google rimanda dopo il consenso, o null se manca
 * `APP_URL`. Fisso e non dedotto dall'header `host` della richiesta: deve
 * essere l'identica stringa registrata come "URI di reindirizzamento
 * autorizzato" nella console Google Cloud, in entrambi i punti dove serve
 * (l'avvio della connessione e il callback) -- un solo posto dove cambiarlo
 * evita che i due finiscano per divergere.
 */
export function costruisciRedirectUri(): string | null {
  const base = process.env.APP_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/fitbit/callback`;
}

/**
 * URL a cui mandare l'utente per il consenso Google, o null se mancano le
 * chiavi (`GOOGLE_HEALTH_CLIENT_ID`/`GOOGLE_HEALTH_CLIENT_SECRET`).
 *
 * `access_type=offline` chiede il refresh token; `prompt=consent` lo fa
 * riemettere anche a una riconnessione, perche' Google lo manda solo la
 * prima volta altrimenti -- e qui serve poterlo riottenere, dato che finche'
 * l'app resta in modalita' "Testing" il permesso scade da solo ogni 7
 * giorni (vedi ROADMAP.md).
 */
export function costruisciUrlAutorizzazione(
  redirectUri: string,
  state: string,
): string | null {
  const cred = credenziali();
  if (!cred) return null;
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", cred.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  return url.toString();
}

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  scadeIl: Date;
};

export type TokenAggiornato = { accessToken: string; scadeIl: Date };

type EsitoToken<T> = T | { errore: string };

function numeroPositivo(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function leggiToken(raw: unknown): EsitoToken<{
  accessToken: string;
  refreshToken: string | null;
  scadeIl: Date;
}> {
  if (typeof raw !== "object" || raw === null) {
    return { errore: "Google ha risposto in un formato che non riconosco." };
  }
  const corpo = raw as Record<string, unknown>;
  const accessToken = corpo.access_token;
  const expiresIn = numeroPositivo(corpo.expires_in);
  if (typeof accessToken !== "string" || !accessToken || expiresIn === null) {
    return { errore: "Google non ha restituito un token valido." };
  }
  const refreshToken =
    typeof corpo.refresh_token === "string" ? corpo.refresh_token : null;
  return {
    accessToken,
    refreshToken,
    scadeIl: new Date(Date.now() + expiresIn * 1000),
  };
}

type RispostaTokenEndpoint =
  | { ok: true; dati: unknown }
  | { ok: false; errore: string };

async function chiamaTokenEndpoint(
  corpo: URLSearchParams,
): Promise<RispostaTokenEndpoint> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const risposta = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo,
      signal: controller.signal,
    });
    const dati: unknown = await risposta.json().catch(() => null);
    if (!risposta.ok) {
      return {
        ok: false,
        errore:
          risposta.status === 400 || risposta.status === 401
            ? "Google ha rifiutato la connessione. Riprova a collegarti da capo."
            : "Google non risponde adesso. Riprova tra poco.",
      };
    }
    return { ok: true, dati };
  } catch (cause) {
    console.error("chiamata al token endpoint di Google fallita", cause);
    return {
      ok: false,
      errore: "Non riesco a raggiungere Google adesso. Riprova.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Scambia il codice ricevuto sul callback con un token di accesso e uno di rinnovo. */
export async function scambiaCodice(
  code: string,
  redirectUri: string,
): Promise<EsitoToken<TokenSet>> {
  const cred = credenziali();
  if (!cred) return { errore: "Fitbit non è configurato in questa app." };

  const risposta = await chiamaTokenEndpoint(
    new URLSearchParams({
      code,
      client_id: cred.clientId,
      client_secret: cred.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  );
  if (!risposta.ok) return { errore: risposta.errore };

  const token = leggiToken(risposta.dati);
  if ("errore" in token) return token;
  if (!token.refreshToken) {
    return {
      errore:
        "Google non ha restituito un permesso di rinnovo. Riprova a collegarti da capo.",
    };
  }
  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    scadeIl: token.scadeIl,
  };
}

/** Rinnova l'access token scaduto. Il refresh token resta lo stesso: Google non ne manda uno nuovo qui. */
export async function rinnovaToken(
  refreshToken: string,
): Promise<EsitoToken<TokenAggiornato>> {
  const cred = credenziali();
  if (!cred) return { errore: "Fitbit non è configurato in questa app." };

  const risposta = await chiamaTokenEndpoint(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: cred.clientId,
      client_secret: cred.clientSecret,
      grant_type: "refresh_token",
    }),
  );
  if (!risposta.ok) return { errore: risposta.errore };

  const token = leggiToken(risposta.dati);
  if ("errore" in token) return token;
  return { accessToken: token.accessToken, scadeIl: token.scadeIl };
}

/**
 * Legge il totale passi di `rollupDataPoints[].steps.countSum` (stringa
 * numerica nella forma documentata) e li somma: la documentazione mostra un
 * solo punto quando la finestra copre l'intera giornata, ma sommare invece
 * di prendere il primo resta corretto anche se Google ne restituisse piu' di
 * uno per fonti diverse.
 *
 * Nessun dato leggibile torna null, non zero (regola 6): un giorno senza
 * lettura non e' un giorno a zero passi.
 */
export function normalizzaPassiGiornalieri(raw: unknown): number | null {
  if (typeof raw !== "object" || raw === null) return null;
  const corpo = raw as Record<string, unknown>;
  const punti = Array.isArray(corpo.rollupDataPoints)
    ? corpo.rollupDataPoints
    : [];

  let totale = 0;
  let trovato = false;
  for (const punto of punti) {
    if (typeof punto !== "object" || punto === null) continue;
    const steps = (punto as Record<string, unknown>).steps;
    if (typeof steps !== "object" || steps === null) continue;
    const countSum = (steps as Record<string, unknown>).countSum;
    const numero =
      typeof countSum === "string" || typeof countSum === "number"
        ? Number(countSum)
        : NaN;
    if (Number.isFinite(numero) && numero >= 0) {
      totale += numero;
      trovato = true;
    }
  }
  return trovato ? Math.round(totale) : null;
}

export type LetturaPassi =
  | { ok: true; passi: number | null }
  | { ok: false; errore: string; scaduto: boolean };

/**
 * Passi del giorno italiano `giornoIso`, sommati su tutta la giornata con un
 * `rollUp` a finestra unica di 24 ore.
 *
 * Non passa `dataSourceFamily`: l'unico esempio trovato nella documentazione
 * lo valorizza a `google-wearables`, che sembra pensato per un Pixel Watch e
 * non per Fitbit -- omesso per non escludere la fonte giusta per errore.
 * Se una volta collegato davvero i passi tornano sempre vuoti, e' il primo
 * punto da controllare.
 */
export async function leggiPassiDelGiorno(
  accessToken: string,
  giornoIso: string,
): Promise<LetturaPassi> {
  const { inizio, fine } = confiniGiornoRoma(giornoIso);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const risposta = await fetch(
      `${API_BASE}/users/me/dataTypes/steps/dataPoints:rollUp`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: { startTime: inizio, endTime: fine },
          windowSize: "86400s",
        }),
        signal: controller.signal,
      },
    );
    if (risposta.status === 401) {
      return {
        ok: false,
        errore: "Il permesso di Google è scaduto. Riconnetti Fitbit da Piano.",
        scaduto: true,
      };
    }
    if (!risposta.ok) {
      return {
        ok: false,
        errore: "Google Health non risponde. Riprova tra poco.",
        scaduto: false,
      };
    }
    const dati: unknown = await risposta.json();
    return { ok: true, passi: normalizzaPassiGiornalieri(dati) };
  } catch (cause) {
    console.error("leggiPassiDelGiorno fallita", cause);
    return {
      ok: false,
      errore: "Non riesco a raggiungere Google adesso. Riprova.",
      scaduto: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}
