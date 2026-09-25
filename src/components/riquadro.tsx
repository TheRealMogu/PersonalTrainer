import Link from "next/link";
import type { MacroKey } from "@/lib/targets";

/**
 * I pezzi della griglia a riquadri, uguali su tutte le schermate.
 *
 * Nata nello Storico e poi portata ovunque: se ogni schermata si disegnasse
 * i suoi riquadri a mano, fra un mese avrebbero quattro raggi e tre ombre
 * diverse, ed è proprio quel tipo di differenza che fa sembrare un'app
 * "incollata insieme". La grandezza di un riquadro dice quanto conta: a
 * tutta riga la cosa principale della schermata, a metà le altre.
 */

export const MACRO_COLOR: Record<MacroKey, string> = {
  kcal: "var(--color-kcal)",
  carbs: "var(--color-carbs)",
  protein: "var(--color-protein)",
  fat: "var(--color-fat)",
};

/** Come `Card`, ma senza il margine sotto: in una griglia lo spazio lo dà `gap`. */
const STILE = "rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]";

export function Griglia({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>{children}</div>
  );
}

export function Riquadro({
  ampio = false,
  className = "",
  children,
}: {
  /** A tutta riga invece che a metà. */
  ampio?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${STILE} ${ampio ? "col-span-2" : ""} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Un riquadro che porta da un'altra parte. Tutto il riquadro si tocca, non
 * solo il titolo: è largo metà schermo, e un bersaglio di una riga dentro un
 * riquadro alto novanta pixel farebbe sbagliare il tocco.
 */
export function RiquadroLink({
  href,
  titolo,
  children,
  ampio = false,
}: {
  href: string;
  titolo: string;
  children?: React.ReactNode;
  ampio?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${STILE} ${ampio ? "col-span-2" : ""} flex min-h-11 flex-col tocco active:bg-raised`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-semibold">{titolo}</span>
        <span
          aria-hidden="true"
          className="text-[17px] leading-none text-muted"
        >
          ›
        </span>
      </span>
      {children ? (
        <span className="mt-1 text-[13px] leading-snug text-muted">
          {children}
        </span>
      ) : null}
    </Link>
  );
}

/** L'etichetta in cima a un riquadro, con il pallino del macro se ce n'è uno. */
export function Etichetta({
  macro,
  children,
}: {
  macro?: MacroKey;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-[13px] text-muted">
      {macro ? (
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: MACRO_COLOR[macro] }}
        />
      ) : null}
      {children}
    </p>
  );
}
