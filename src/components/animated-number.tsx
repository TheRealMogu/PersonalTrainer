"use client";

import { useEffect, useRef, useState } from "react";
import { DURATA_CONTEGGIO_MS, valoreIntermedio } from "@/lib/animate";

/**
 * Un numero che scorre invece di saltare.
 *
 * Non e' decorazione: quando aggiungi un cibo e le calorie rimaste passano da
 * 1750 a 1645, il salto secco non dice di quanto sei sceso. Il movimento lo
 * mostra, e conferma che il tocco e' stato raccolto.
 *
 * Al primo disegno non anima: all'apertura della schermata i numeri sono
 * gia' quelli giusti, e vederli salire da zero sarebbe finto.
 *
 * Rispetta `prefers-reduced-motion`: chi ha chiesto meno animazioni vede il
 * valore finale e basta.
 */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const [mostrato, setMostrato] = useState(value);
  const partenza = useRef(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const ridotto =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (ridotto || partenza.current === value) {
      partenza.current = value;
      setMostrato(value);
      return;
    }

    const da = partenza.current;
    const inizio = performance.now();

    const passo = (ora: number) => {
      const t = (ora - inizio) / DURATA_CONTEGGIO_MS;
      setMostrato(valoreIntermedio(da, value, t));
      if (t < 1) frame.current = requestAnimationFrame(passo);
    };

    frame.current = requestAnimationFrame(passo);
    partenza.current = value;

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value]);

  // `aria-live` no: il valore cambia troppe volte durante la corsa e un
  // lettore di schermo leggerebbe ogni passaggio. Il valore finale sta gia'
  // nell'etichetta del contenitore.
  return <span className={className}>{format(mostrato)}</span>;
}
