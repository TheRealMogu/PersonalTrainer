"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loginTentativi } from "@/db/schema";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  timingSafeEqual,
} from "@/lib/auth";
import { minutiDiBlocco, prossimoTentativo } from "@/lib/login-tentativi";

export type LoginState = { error: string | null };

/**
 * L'indirizzo di chi sta provando ad entrare, per contare i tentativi.
 *
 * Vercel scrive sempre `x-forwarded-for`; in locale di solito manca, e tutti
 * i tentativi finiscono in un unico bucket "sconosciuto" -- va bene per lo
 * sviluppo, dove non c'e' nessuno da bloccare davvero.
 */
async function indirizzoClient(): Promise<string> {
  const store = await headers();
  const primo = store.get("x-forwarded-for")?.split(",")[0]?.trim();
  return primo || "sconosciuto";
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = process.env.APP_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!password || !secret) {
    return {
      error: "App non configurata: mancano APP_PASSWORD o AUTH_SECRET.",
    };
  }

  const ip = await indirizzoClient();
  const ora = new Date();
  const [riga] = await db
    .select()
    .from(loginTentativi)
    .where(eq(loginTentativi.ip, ip));

  const bloccoMinuti = minutiDiBlocco(riga ?? null, ora);
  if (bloccoMinuti !== null) {
    return {
      error: `Troppi tentativi sbagliati. Riprova fra ${bloccoMinuti} minut${bloccoMinuti === 1 ? "o" : "i"}.`,
    };
  }

  const submitted = formData.get("password");
  if (typeof submitted !== "string" || !timingSafeEqual(submitted, password)) {
    // Attesa breve: rende meno comodo provare password a raffica.
    await new Promise((resolve) => setTimeout(resolve, 600));

    const { tentativi, bloccatoFino } = prossimoTentativo(riga ?? null, ora);
    await db
      .insert(loginTentativi)
      .values({ ip, tentativi, ultimoTentativo: ora, bloccatoFino })
      .onConflictDoUpdate({
        target: loginTentativi.ip,
        set: { tentativi, ultimoTentativo: ora, bloccatoFino },
      });

    return { error: "Password errata." };
  }

  if (riga) {
    await db.delete(loginTentativi).where(eq(loginTentativi.ip, ip));
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
