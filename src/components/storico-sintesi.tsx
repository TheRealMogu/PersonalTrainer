import {
  Etichetta,
  Griglia,
  MACRO_COLOR,
  Riquadro,
} from "@/components/riquadro";
import { Sparkline } from "@/components/sparkline";
import { isLogged, type DailyTotals, type HistoryStats } from "@/lib/history";
import { etichettaScarto, formatMacro } from "@/lib/nutrition";
import { formatPeso, type PesoGiorno } from "@/lib/peso";
import { MACRO_LABELS, MACRO_UNITS, type MacroKey } from "@/lib/targets";

/**
 * Lo scarto dal target. Rosso solo se si è sopra (regola 9: il rosso è per
 * il fuori target); sotto o in linea resta grigio, perché non è un guasto.
 */
function Scarto({ delta, macro }: { delta: number; macro: MacroKey }) {
  const sopra = delta > 0 && etichettaScarto(delta, macro) !== "in linea";
  return (
    <p
      className={`text-[13px] leading-snug ${sopra ? "text-over" : "text-muted"}`}
    >
      {etichettaScarto(delta, macro)}
    </p>
  );
}

function giorniEntro(entro: number, registrati: number): string {
  return `Entro il target ${entro} ${entro === 1 ? "giorno" : "giorni"} su ${registrati}`;
}

function formatGiorno(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/**
 * Il riassunto del periodo, a riquadri di grandezza diversa.
 *
 * La grandezza dice quanto conta, non quanto dato c'è dentro: le calorie
 * sono la domanda di questa app ("quanto mi resta"), quindi prendono tutta
 * la riga e il numero grande; i tre macro e il peso stanno a metà. Prima
 * erano due card uguali affiancate, con le stesse informazioni divise per
 * tipo invece che per importanza.
 *
 * L'andamento in miniatura segue solo i giorni conclusi, come la media: oggi
 * non è finito, e metterlo nella linea la farebbe scendere tutte le mattine.
 */
export function StoricoSintesi({
  stats,
  days,
  today,
  targets,
  pesi,
}: {
  stats: HistoryStats;
  days: DailyTotals[];
  today: string;
  targets: Record<MacroKey, number>;
  pesi: PesoGiorno[];
}) {
  const conclusi = days.filter((day) => day.day !== today);
  const kcalGiornaliere = conclusi.map((day) =>
    isLogged(day) ? day.kcal : null,
  );
  const mediaKcal = stats.averages.kcal;

  // Il peso sta sugli stessi giorni delle calorie, non una misura dopo l'altra:
  // due pesate a una settimana di distanza non sono vicine come due di fila.
  // Oggi qui c'è: una pesata è già completa, a differenza dei pasti.
  const pesoDelGiorno = new Map(pesi.map((riga) => [riga.day, riga.weightKg]));
  const primoPeso = pesi[0];
  const ultimoPeso = pesi.at(-1);
  const deltaPeso =
    primoPeso && ultimoPeso ? ultimoPeso.weightKg - primoPeso.weightKg : 0;

  const macroMinori: MacroKey[] = ["carbs", "protein", "fat"];
  // Il peso si può segnare anche nei giorni senza pasti: senza medie da
  // mostrare resta solo lui, a tutta riga, invece di sparire.
  const conMedie = stats.loggedDays > 0;

  return (
    <Griglia>
      {conMedie ? (
        <>
          <Riquadro ampio>
            <Etichetta macro="kcal">Calorie, media giornaliera</Etichetta>
            <p className="mt-1 leading-none">
              <span className="text-[48px] font-bold tracking-tight">
                {formatMacro(mediaKcal, "kcal")}
              </span>
              <span className="ml-1.5 text-[15px] text-muted">kcal</span>
            </p>
            <div className="mt-2">
              <Scarto delta={mediaKcal - targets.kcal} macro="kcal" />
            </div>
            <Sparkline
              valori={kcalGiornaliere}
              colore={MACRO_COLOR.kcal}
              riferimento={targets.kcal}
              etichetta={`Calorie giorno per giorno, con la linea tratteggiata del target di ${formatMacro(targets.kcal, "kcal")} kcal`}
              className="mt-3 h-12"
            />
            <p className="mt-2 text-[13px] text-muted">
              {giorniEntro(stats.daysWithinTarget.kcal, stats.loggedDays)}
            </p>
          </Riquadro>

          {macroMinori.map((macro, indice) => {
            // Senza pesate, i grassi prendono tutta la riga invece di lasciare un buco.
            const tuttaLaRiga =
              pesi.length === 0 && indice === macroMinori.length - 1;
            return (
              <Riquadro key={macro} ampio={tuttaLaRiga}>
                <Etichetta macro={macro}>{MACRO_LABELS[macro]}</Etichetta>
                <p className="mt-1 leading-tight">
                  <span className="text-[22px] font-semibold">
                    {formatMacro(stats.averages[macro], macro)}
                  </span>
                  <span className="ml-1 text-[13px] text-muted">
                    {MACRO_UNITS[macro]}
                  </span>
                </p>
                <div className="mt-0.5">
                  <Scarto
                    delta={stats.averages[macro] - targets[macro]}
                    macro={macro}
                  />
                </div>
                <p className="mt-1.5 text-[13px] leading-snug text-muted">
                  {giorniEntro(stats.daysWithinTarget[macro], stats.loggedDays)}
                </p>
              </Riquadro>
            );
          })}
        </>
      ) : null}

      {primoPeso && ultimoPeso ? (
        <Riquadro ampio={!conMedie}>
          <Etichetta>Peso</Etichetta>
          <p className="mt-1 leading-tight">
            <span className="text-[22px] font-semibold">
              {formatPeso(ultimoPeso.weightKg)}
            </span>
            <span className="ml-1 text-[13px] text-muted">kg</span>
          </p>
          {/*
            Nessun colore sul verso: il peso non ha un target in questa app, e
            "su" o "giù" non sono né bene né male finché non lo decide il PT.
            Anche la linea è in inchiostro e non in blu: accanto ai macro il
            blu vuol dire calorie (regola 7).
          */}
          <p className="mt-0.5 text-[13px] leading-snug text-muted">
            {pesi.length === 1
              ? "Una sola misura"
              : deltaPeso === 0
                ? `Invariato dal ${formatGiorno(primoPeso.day)}`
                : `${deltaPeso > 0 ? "+" : "−"}${formatPeso(Math.abs(deltaPeso))} kg dal ${formatGiorno(primoPeso.day)}`}
          </p>
          <Sparkline
            valori={days.map((day) => pesoDelGiorno.get(day.day) ?? null)}
            unisciBuchi
            colore="var(--color-ink)"
            etichetta={`Peso da ${formatPeso(primoPeso.weightKg)} a ${formatPeso(ultimoPeso.weightKg)} kg, su ${pesi.length} ${pesi.length === 1 ? "misura" : "misure"}`}
            className="mt-2 h-8"
          />
        </Riquadro>
      ) : null}
    </Griglia>
  );
}
