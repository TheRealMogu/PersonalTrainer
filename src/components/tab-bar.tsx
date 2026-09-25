"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconAllenamento,
  IconDiario,
  IconProfilo,
  IconStorico,
} from "./nav-icons";

const TABS = [
  { href: "/", label: "Diario", Icon: IconDiario },
  { href: "/piano", label: "Piano", Icon: IconProfilo },
  { href: "/allenamento", label: "Allenamento", Icon: IconAllenamento },
  { href: "/storico", label: "Storico", Icon: IconStorico },
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
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex h-16 flex-col items-center justify-center gap-1 px-1 text-center transition-colors duration-200 ease-ios ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon />
                <span className="text-[12px] font-medium leading-none">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
