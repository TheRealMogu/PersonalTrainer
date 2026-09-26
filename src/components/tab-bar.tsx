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

/**
 * La navigazione, in due forme dallo stesso markup: barra in basso sotto i
 * 768px (un telefono), corsia laterale sopra (un tablet o un computer).
 *
 * Non erano due componenti perché sarebbero finiti storti: un cambio a
 * un'icona o un'etichetta va fatto una volta sola, non ricordato in due
 * posti. `md:` sposta il `<nav>` da `bottom-0` a `left-0` e la lista da riga
 * a colonna — le stesse quattro `<li>`, ridisposte.
 *
 * Sopra i 768px questa app smette di essere "un telefono al centro di uno
 * schermo grande": prima il contenitore restava largo `max-w-md` ovunque
 * (vedi `layout.tsx`), e su un monitor la webapp sembrava un rettangolo
 * incollato in mezzo al vuoto. La soglia è quella che usano le app simili
 * (tablet in su): sotto resta tutto com'era, sopra la barra diventa una
 * corsia e il contenuto (in `layout.tsx`) prende lo spazio che lei libera.
 */
export function TabBar() {
  const pathname = usePathname();

  // Sulla schermata di accesso non c'e' niente da navigare.
  if (pathname === "/login") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-surface/85 backdrop-blur-xl md:inset-x-auto md:inset-y-0 md:left-0 md:right-auto md:w-56 md:border-t-0 md:border-r"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-md md:mx-0 md:h-full md:max-w-none md:flex-col md:justify-start md:gap-1 md:px-3 md:pt-8">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 px-1 text-center transition-colors duration-200 ease-ios md:h-11 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:text-left md:hover:bg-raised md:active:bg-raised ${
                  active ? "text-accent md:bg-accent/10" : "text-muted"
                }`}
              >
                <Icon />
                <span className="text-[12px] font-medium leading-none md:text-[15px]">
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
