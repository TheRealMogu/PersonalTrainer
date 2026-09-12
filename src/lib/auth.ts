/**
 * Autenticazione a utente singolo.
 *
 * L'app espone il diario a chiunque conosca l'indirizzo, e l'indirizzo e'
 * scritto dentro l'IPA: serve una porta chiusa. Non c'e' un registro utenti,
 * quindi basta una password condivisa che apre una sessione lunga, firmata.
 *
 * Usa solo Web Crypto: questo file gira anche nel middleware (runtime Edge),
 * dove le API di Node non ci sono.
 */

export const SESSION_COOKIE = "pt_session";

/** Un anno: e' un'app personale, non deve chiedere la password ogni settimana. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Confronto a tempo costante: un `===` perde byte per byte e rivela la password. */
export function timingSafeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  // Confronta sempre la stessa quantita' di byte, anche a lunghezze diverse.
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

/** Token `payload.firma`, dove il payload porta solo la scadenza. */
export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const payload = base64UrlEncode(
    encoder.encode(JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS })),
  );
  const signature = await crypto.subtle.sign("HMAC", await importKey(secret), encoder.encode(payload));
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Vera solo se la firma torna e la sessione non e' scaduta. */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await importKey(secret),
      base64UrlDecode(signature),
      encoder.encode(payload),
    );
  } catch {
    return false;
  }
  if (!valid) return false;

  try {
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    return typeof decoded.exp === "number" && decoded.exp * 1000 > now;
  } catch {
    return false;
  }
}
