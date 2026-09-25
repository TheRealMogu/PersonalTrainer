/**
 * Le icone della barra in basso, riusate anche nell'intestazione delle
 * schermate che raggiunge (Piano, Allenamento, Storico): la stessa forma in
 * due posti diversi è quello che li fa sembrare la stessa app, non due pezzi
 * incollati insieme.
 *
 * Disegnate a mano, non da una libreria: sono quattro, non vale la pena una
 * dipendenza in più per questo. Tutte `currentColor`, così seguono lo stesso
 * stato attivo/muto del testo accanto.
 */

type IconProps = { className?: string };

/** L'anello del diario: la stessa forma della lancetta che segna "quanto manca". */
export function IconDiario({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="8.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeDasharray="38 14"
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

/** Il profilo: cerchio con dentro una sagoma, non un'icona qualunque fra le altre. */
export function IconProfilo({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="9.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="12"
        cy="10"
        r="2.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.5 18c1.2-2.8 3.4-4.2 5.5-4.2s4.3 1.4 5.5 4.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconAllenamento({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="10"
        y="8"
        width="4"
        height="8"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="4"
        y="10"
        width="3"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="17"
        y="10"
        width="3"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="7"
        y1="12"
        x2="10"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="14"
        y1="12"
        x2="17"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function IconStorico({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <line
        x1="6"
        y1="17"
        x2="6"
        y2="11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="17"
        x2="12"
        y2="7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="17"
        x2="18"
        y2="13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
