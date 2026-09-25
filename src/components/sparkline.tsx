/**
 * Un andamento in miniatura, senza assi: dice "sale o scende", non "quanto
 * valeva quel giorno" -- per quello ci sono i grafici e la tabella sotto.
 *
 * Un punto `null` spezza la linea invece di scendere a zero: un giorno non
 * registrato è un buco, non un giorno a zero calorie (regola 6). Un giorno
 * isolato fra due buchi diventa un puntino: una linea di un punto solo non si
 * disegnerebbe, e sparirebbe proprio un giorno registrato.
 *
 * Con `unisciBuchi` invece la linea passa sopra i buchi, restando al suo
 * posto sull'asse: serve per il peso, che fra una pesata e l'altra non
 * smette di esistere, mentre un giorno senza pasti non ha calorie da unire.
 *
 * Si allarga a tutta la larghezza del riquadro (`preserveAspectRatio="none"`),
 * quindi le linee usano `non-scaling-stroke` per restare di 2px, e il punto
 * finale è un segmento lungo zero con estremità tonde: un cerchio vero si
 * schiaccerebbe in un'ellisse quando il riquadro è più largo che alto.
 */

const LARGHEZZA = 100;
const ALTEZZA = 40;
const MARGINE = 5;

export function Sparkline({
  valori,
  colore,
  riferimento,
  etichetta,
  unisciBuchi = false,
  className = "h-10",
}: {
  valori: (number | null)[];
  colore: string;
  /** Una linea tratteggiata orizzontale, per esempio il target. */
  riferimento?: number;
  /** Cosa racconta la linea, per chi non la vede. */
  etichetta: string;
  unisciBuchi?: boolean;
  className?: string;
}) {
  const presenti = valori.filter((v): v is number => v !== null);
  if (presenti.length === 0) return null;

  const estremi =
    riferimento === undefined ? presenti : [...presenti, riferimento];
  const minimo = Math.min(...estremi);
  const massimo = Math.max(...estremi);
  const ampiezza = massimo - minimo || Math.abs(massimo) || 1;

  const x = (indice: number) =>
    valori.length === 1
      ? LARGHEZZA / 2
      : (indice / (valori.length - 1)) * LARGHEZZA;
  const y = (valore: number) =>
    MARGINE + (1 - (valore - minimo) / ampiezza) * (ALTEZZA - MARGINE * 2);

  const tratti: string[] = [];
  let corrente: string[] = [];
  valori.forEach((valore, indice) => {
    if (valore === null) {
      if (unisciBuchi) return;
      if (corrente.length > 0) tratti.push(corrente.join(" "));
      corrente = [];
      return;
    }
    corrente.push(`${x(indice)},${y(valore)}`);
  });
  if (corrente.length > 0) tratti.push(corrente.join(" "));
  const linee = tratti.filter((punti) => punti.includes(" "));
  const puntini = tratti.filter((punti) => !punti.includes(" "));

  const ultimoIndice = valori.findLastIndex((v) => v !== null);
  const ultimoX = x(ultimoIndice);
  const ultimoY = y(valori[ultimoIndice]!);

  return (
    <svg
      viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={etichetta}
      className={`block w-full overflow-visible ${className}`}
    >
      {riferimento !== undefined ? (
        <line
          x1="0"
          x2={LARGHEZZA}
          y1={y(riferimento)}
          y2={y(riferimento)}
          stroke="var(--color-reference)"
          strokeWidth="1"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {puntini.map((punto) => {
        const [px, py] = punto.split(",");
        return (
          <line
            key={punto}
            x1={px}
            y1={py}
            x2={px}
            y2={py}
            stroke={colore}
            strokeWidth="4"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}

      {linee.map((punti) => (
        <polyline
          key={punti}
          points={punti}
          fill="none"
          stroke={colore}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* Anello del colore della superficie sotto il punto, poi il punto. */}
      <line
        x1={ultimoX}
        y1={ultimoY}
        x2={ultimoX}
        y2={ultimoY}
        stroke="var(--color-surface)"
        strokeWidth="12"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={ultimoX}
        y1={ultimoY}
        x2={ultimoX}
        y2={ultimoY}
        stroke={colore}
        strokeWidth="8"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
