"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  timingSafeEqual,
} from "@/lib/auth";

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = process.env.APP_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!password || !secret) {
    return { error: "App non configurata: mancano APP_PASSWORD o AUTH_SECRET." };
  }

  const submitted = formData.get("password");
  if (typeof submitted !== "string" || !timingSafeEqual(submitted, password)) {
    // Attesa breve: rende meno comodo provare password a raffica.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "Password errata." };
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
