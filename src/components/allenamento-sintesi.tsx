import { Etichetta, Griglia, Riquadro } from "@/components/riquadro";
import { formatDayLabel, shiftIsoDate } from "@/lib/date";

const INIZIALI = ["L", "M", "M", "G", "V", "S", "D"];
const NOMI = [
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
  "domenica",
];

/**
 * Due riquadri sotto "Tocca a te": quante sedute questa settimana e qual è
 * stata l'ultima. Sono le due domande che il PT fa la domenica, e prima la
 * prima si ricostruiva scorrendo l'elenco in fondo.
 *
 * Niente volume a confronto: una seduta di spinta e una full body non
 * muovono gli stessi chili, e una linea che le mette in fila direbbe "sei
 * peggiorato" solo perché oggi toccava un'altra giornata.
 */
export function AllenamentoSintesi({
  lunedi,
  oggi,
  giorniAllenati,
  ultima,
}: {
  lunedi: string;
  oggi: string;
  /** I giorni di questa settimana con almeno una seduta conclusa. */
  giorniAllenati: string[];
  ultima:
    | { label: string; focus: string; day: string; setCount: number }
    | undefined;
}) {
  const settimana = INIZIALI.map((iniziale, indice) => {
    const giorno = shiftIsoDate(lunedi, indice);
    return {
      giorno,
      iniziale,
      nome: NOMI[indice],
      fatto: giorniAllenati.includes(giorno),
      oggi: giorno === oggi,
    };
  });
  const sedute = new Set(giorniAllenati).size;

  return (
    <Griglia className="mb-5">
      <Riquadro>
        <Etichetta>Questa settimana</Etichetta>
        <p className="mt-1 leading-tight">
          <span className="text-[22px] font-semibold">{sedute}</span>
          <span className="ml-1 text-[13px] text-muted">
            {sedute === 1 ? "giorno" : "giorni"}
          </span>
        </p>
        <div
          role="img"
          className="mt-3 flex justify-between"
          aria-label={`Allenato ${
            settimana
              .filter((g) => g.fatto)
              .map((g) => g.nome)
              .join(", ") || "nessun giorno"
          }`}
        >
          {settimana.map((g) => (
            <span
              key={g.giorno}
              aria-hidden="true"
              className="flex flex-col items-center gap-1"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  g.fatto
                    ? "bg-accent-solid"
                    : "border border-[var(--color-reference)]"
                }`}
              />
              <span
                className={`text-[11px] ${g.oggi ? "font-semibold text-ink" : "text-muted"}`}
              >
                {g.iniziale}
              </span>
            </span>
          ))}
        </div>
      </Riquadro>

      <Riquadro>
        <Etichetta>Ultima seduta</Etichetta>
        {ultima ? (
          <>
            <p className="mt-1 text-[15px] font-semibold leading-snug">
              {ultima.label} — {ultima.focus}
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">
              {formatDayLabel(ultima.day, oggi)} ·{" "}
              {ultima.setCount === 1 ? "1 serie" : `${ultima.setCount} serie`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-[15px] leading-snug text-muted">
            Nessuna ancora
          </p>
        )}
      </Riquadro>
    </Griglia>
  );
}
