import { formatMacro } from "@/lib/nutrition";
import {
  nomeMese,
  riassuntoMese,
  type GrigliaMese,
  type StatoGiorno,
} from "@/lib/mese";
import { MACRO_LABELS, MACRO_UNITS, type MacroKey } from "@/lib/targets";

const INIZIALI = ["L", "M", "M", "G", "V", "S", "D"] as const;

/**
 * Il colore di una casella.
 *
 * Il rosso solo per il fuori target, come dice la regola 9. E il "non
 * registrato" e' un grigio tenue, non un rosso chiaro: un giorno che non hai
 * segnato non e' un giorno andato male, e colorarlo come tale sarebbe
 * inventare un dato che non c'e'.
 */
const COLORE: Record<StatoGiorno, string> = {
  entro: "bg-accent/70",
  oltre: "bg-over/70",
  "non-registrato": "bg-track",
  futuro: "bg-transparent",
};

/** Come si legge una casella per chi non vede i colori. */
function descrivi(
  stato: StatoGiorno,
  giorno: number,
  valore: number,
  macro: MacroKey,
): string {
  const testa = `${giorno}`;
  switch (stato) {
    case "entro":
      return `${testa}: ${formatMacro(valore, macro)} ${
        MACRO_UNITS[macro]
      }, entro il target`;
    case "oltre":
      return `${testa}: ${formatMacro(valore, macro)} ${
        MACRO_UNITS[macro]
      }, oltre il target`;
    case "non-registrato":
      return `${testa}: non registrato`;
    case "futuro":
      return `${testa}: non ancora arrivato`;
  }
}

/**
 * Il mese come un calendario.
 *
 * Nello storico ci sono gia' sette o trenta colonne, ma il mese non si coglie:
 * per sapere se e' andato meglio del precedente bisogna leggere trenta barre
 * una per una. Qui si legge in un secondo -- ed e' l'unica schermata che
 * risponde a "come sta andando il mese".
 *
 * Non serve JavaScript: e' una griglia e basta. Per questo non e' un
 * componente client.
 */
export function HeatmapMese({
  griglia,
  macro,
}: {
  griglia: GrigliaMese;
  macro: MacroKey;
}) {
  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-medium capitalize">
          {nomeMese(griglia.primo)}
        </span>
        <span className="text-[13px] tabular-nums text-muted">
          {griglia.entro}/{griglia.registrati}
        </span>
      </figcaption>

      <div aria-hidden="true" className="mb-1 grid grid-cols-7 gap-1">
        {INIZIALI.map((iniziale, indice) => (
          <span key={indice} className="text-center text-[11px] text-muted">
            {iniziale}
          </span>
        ))}
      </div>

      <ul className="grid grid-cols-7 gap-1">
        {Array.from({ length: griglia.vuotePrima }, (_, i) => (
          <li key={`vuota-${i}`} aria-hidden="true" />
        ))}
        {griglia.caselle.map((casella) => {
          const numero = Number(casella.day.slice(8));
          return (
            <li
              key={casella.day}
              title={descrivi(casella.stato, numero, casella.valore, macro)}
              className={`flex aspect-square items-center justify-center rounded-md text-[11px] tabular-nums ${
                COLORE[casella.stato]
              } ${
                casella.stato === "futuro"
                  ? "text-reference"
                  : casella.stato === "non-registrato"
                    ? "text-muted"
                    : "text-on-accent"
              }`}
            >
              {/*
                Il numero del giorno dentro la casella: il colore da solo non
                basta mai (regola 7), e senza il numero non si sa nemmeno quale
                giorno si sta guardando.
              */}
              <span className="sr-only">
                {descrivi(casella.stato, numero, casella.valore, macro)}
              </span>
              <span aria-hidden="true">{numero}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[13px] leading-snug text-muted">
        {riassuntoMese(griglia)}
        {griglia.registrati > 0
          ? `, per ${MACRO_LABELS[macro].toLowerCase()}.`
          : ""}
      </p>
    </figure>
  );
}
