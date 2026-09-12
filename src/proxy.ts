import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Porta d'ingresso: senza sessione valida si finisce su /login.
 *
 * Il controllo sta qui e non nelle singole pagine perche' il proxy intercetta
 * anche le POST delle Server Actions: proteggere solo le pagine lascerebbe le
 * scritture aperte.
 */
export async function proxy(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;

  // Senza segreto non si puo' verificare niente: meglio fermare tutto che
  // lasciare aperto per errore di configurazione.
  if (!secret) {
    return new NextResponse(
      "AUTH_SECRET non impostata: l'app resta chiusa finché non è configurata.",
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
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
   * Fuori dal controllo restano solo gli asset statici e le icone: iOS le
   * scarica prima che ci sia una sessione, e senza icona l'app installata
   * resta senza faccia. Non espongono dati.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|manifest.webmanifest).*)",
  ],
};
