import Link from "next/link";
import { weekdayInitial } from "@/lib/date";
import type { DailyTotals } from "@/lib/history";
import { isLogged } from "@/lib/history";
import { DAILY_TARGETS } from "@/lib/targets";

/** Altezza minima visibile: una colonna da zero pixel sembrerebbe assente. */
const MIN_ALTEZZA = 6;
const MAX_ALTEZZA = 36;
/**
 * Larghezza fissa e stretta. Con barre larghe quanto alte il bordo tondo le
 * trasforma in bolle, e una bolla non si legge come "quanto".
 */
const LARGHEZZA = 8;

/**
 * Gli ultimi sette giorni in cima al diario.
 *
 * Prima, per sapere com'era andata la settimana bisognava andare in Storico;
 * e per aprire un giorno passato si toccava la freccia una volta per giorno.
 * Qui si vede il colpo d'occhio senza toccare niente, e un giorno si apre con
 * un tocco solo.
 *
 * Il colore dice una cosa sola: dentro o fuori il target delle calorie. Non
 * e' un voto -- il rosso vuol dire "oltre", non "hai sbagliato".
 */
export function WeekStrip({
  days,
  current,
  today,
}: {
  days: DailyTotals[];
  current: string;
  today: string;
}) {
  const massimo = Math.max(DAILY_TARGETS.kcal, ...days.map((d) => d.kcal));

  return (
    // A tutta larghezza, fuori dai margini della pagina: sette bersagli da 44
    // px non ci stanno in 280. Annullando il padding laterale ne restano 45 a
    // testa anche su uno schermo da 320.
    <nav
      aria-label="Ultimi sette giorni"
      className="-mx-5 mb-4 flex items-end justify-between px-0.5"
    >
      {days.map((giorno) => {
        const registrato = isLogged(giorno);
        const oltre = giorno.kcal > DAILY_TARGETS.kcal;
        const eOggi = giorno.day === today;
        const eAperto = giorno.day === current;

        const altezza = registrato
          ? Math.max(MIN_ALTEZZA, Math.round((giorno.kcal / massimo) * MAX_ALTEZZA))
          : MIN_ALTEZZA;

        return (
          <Link
            key={giorno.day}
            href={giorno.day === today ? "/" : `/?day=${giorno.day}`}
            aria-label={
              registrato
                ? `${giorno.day}: ${Math.round(giorno.kcal)} kcal${oltre ? ", oltre il target" : ""}`
                : `${giorno.day}: non registrato`
            }
            aria-current={eAperto ? "page" : undefined}
            className={`flex min-h-11 flex-1 flex-col items-center justify-end gap-1.5 rounded-lg py-1.5 tocco-riquadro active:bg-raised ${
              eAperto ? "bg-raised" : ""
            }`}
          >
            <span
              aria-hidden="true"
              className="rounded-full"
              style={{
                width: LARGHEZZA,
                height: altezza,
                background: !registrato
                  ? "var(--color-track)"
                  : oltre
                    ? "var(--color-over)"
                    : "var(--color-kcal)",
                // Il giorno in corso non e' finito: si distingue senza colori nuovi.
                opacity: eOggi ? 0.55 : 1,
              }}
            />
            <span
              className={`text-[11px] leading-none ${
                eAperto ? "font-semibold text-ink" : "text-muted"
              }`}
            >
              {weekdayInitial(giorno.day)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
