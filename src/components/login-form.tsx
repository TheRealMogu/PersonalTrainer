"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";

const INITIAL: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, INITIAL);

  return (
    <form action={formAction} className="rounded-2xl bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <label className="block">
        <span className="mb-1 block text-[13px] text-muted">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          autoFocus
          required
          className="min-h-11 w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </label>

      {state.error ? (
        <p role="alert" className="mt-3 text-[13px] text-over">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 min-h-11 w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-on-accent tocco active:opacity-80 disabled:opacity-50"
      >
        {pending ? "Verifico…" : "Entra"}
      </button>
    </form>
  );
}
