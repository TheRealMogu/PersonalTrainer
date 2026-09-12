"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Diario" },
  { href: "/piano", label: "Piano" },
  { href: "/allenamento", label: "Allenamento" },
  { href: "/storico", label: "Storico" },
];

export function TabBar() {
  const pathname = usePathname();

  // Sulla schermata di accesso non c'e' niente da navigare.
  if (pathname === "/login") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-surface/85 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-md">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex h-14 items-center justify-center px-1 text-center text-[12px] font-medium leading-tight transition-colors ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
