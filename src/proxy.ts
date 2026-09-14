import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Il messaggio lo legge chi ha appena fatto il deploy, non chi ha scritto il
 * codice: deve dire cosa manca e dove si mette, compreso il passaggio che si
 * dimentica sempre.
 */
function configurationMessage(missing: readonly string[]): string {
  const elenco = missing.length > 0 ? missing.join(", ") : "AUTH_SECRET";
  const apertura =
    missing.length > 1
      ? `L'app non è configurata: mancano ${elenco}.`
      : `L'app non è configurata: manca ${elenco}.`;

  return [
    apertura,
    "",
    "Resta chiusa finché non ci sono: senza, non c'è modo di verificare chi entra.",
    "",
    "Su Vercel: Settings → Environment Variables, spuntando Production, Preview",
    "e Development. Poi Deployments → ⋯ → Redeploy, perché le variabili vengono",
    "lette quando l'app viene compilata: aggiungerle e basta non cambia niente.",
    "",
    "In locale: scrivile in .env.local (vedi .env.example) e riavvia npm run dev.",
  ].join("\n");
}

/**
 * Porta d'ingresso: senza sessione valida si finisce su /login.
 *
 * Il controllo sta qui e non nelle singole pagine perche' il proxy intercetta
 * anche le POST delle Server Actions: proteggere solo le pagine lascerebbe le
 * scritture aperte.
 */
export async function proxy(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;

  // Le variabili si leggono una per una, scritte per esteso: con una chiave
  // calcolata (process.env[nome]) la sostituzione in fase di build non avviene
  // e sull'Edge risulterebbero tutte mancanti.
  //
  // Si guarda anche APP_PASSWORD, che qui non servirebbe: senza, l'app si
  // aprirebbe e poi rifiuterebbe il login con un altro messaggio. Meglio dire
  // subito tutto quello che manca che farlo scoprire una variabile alla volta.
  const missing = [
    process.env.AUTH_SECRET ? null : "AUTH_SECRET",
    process.env.APP_PASSWORD ? null : "APP_PASSWORD",
    process.env.DATABASE_URL ? null : "DATABASE_URL",
  ].filter((name): name is string => name !== null);

  // Senza segreto non si puo' verificare niente: meglio fermare tutto che
  // lasciare aperto per errore di configurazione.
  if (!secret || missing.length > 0) {
    return new NextResponse(configurationMessage(missing), {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const authenticated = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    secret,
  );
  const isLogin = request.nextUrl.pathname === "/login";

  if (!authenticated && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (authenticated && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Fuori dal controllo restano solo gli asset statici, le icone e gli
   * endpoint della piattaforma: iOS le icone le scarica prima che ci sia una
   * sessione, e senza icona l'app installata resta senza faccia. Non
   * espongono dati.
   *
   * `_vercel` e' lo script del conteggio visite: passando dal controllo
   * verrebbe rimandato al login e riceverebbe una pagina HTML al posto del
   * Javascript.
   */
  matcher: [
    "/((?!_next/static|_next/image|_vercel|favicon.ico|icon.svg|apple-icon|manifest.webmanifest).*)",
  ],
};
