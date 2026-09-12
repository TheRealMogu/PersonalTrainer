"use client";

import { useTransition } from "react";
import { logout } from "@/app/login/actions";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => logout())}
      disabled={pending}
      className="min-h-11 w-full rounded-xl border border-hairline text-[15px] font-medium text-over active:bg-raised disabled:opacity-50"
    >
      {pending ? "Esco…" : "Esci"}
    </button>
  );
}
