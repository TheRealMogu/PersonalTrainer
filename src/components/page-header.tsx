"use client";

import { useEffect, useState } from "react";

/** Oltre questo scorrimento il titolo si stringe. */
const SOGLIA_COMPATTA = 24;

/**
 * Il titolo di una schermata, che si stringe scorrendo.
 *
 * Da grande (34px, come il titolo di un'app iOS) serve solo in cima: dopo il
 * primo scorrimento occupa spazio che potrebbe essere contenuto, e su
 * Storico o Piano, dove sotto c'e' una lista lunga, quello spazio si sente.
 * Restando incollato in alto (invece di scorrere via) si guadagna la riga
 * senza perdere il riferimento a che schermata si sta guardando.
 */
export function PageHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  /**
   * Un elemento già istanziato (`<IconPiano />`), non il componente: questo
   * file è "use client" e le pagine che lo chiamano sono Server Component --
   * passare la funzione invece dell'elemento fa fallire il render ("Functions
   * cannot be passed directly to Client Components"), trovato provandolo per
   * davvero, non a lettura di codice.
   */
  icon?: React.ReactNode;
}) {
  const [compatta, setCompatta] = useState(false);

  useEffect(() => {
    function onScroll() {
      setCompatta(window.scrollY > SOGLIA_COMPATTA);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-10 bg-canvas transition-[padding] duration-200 ease-ios ${
        compatta ? "pt-3 pb-3" : "pt-12 pb-6"
      }`}
    >
      <div className="flex items-center gap-3">
        {icon && !compatta ? (
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent"
          >
            {icon}
          </span>
        ) : null}
        <h1
          className={`font-bold leading-tight tracking-tight transition-[font-size] duration-200 ease-ios ${
            compatta ? "text-[17px]" : "text-[34px]"
          }`}
        >
          {title}
        </h1>
      </div>
      {subtitle && !compatta ? (
        <p className="mt-1 text-[15px] text-muted">{subtitle}</p>
      ) : null}
    </header>
  );
}
