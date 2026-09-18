import { formatMacro } from "./nutrition";
import { formatVolume } from "./workout";
import { lunediDellaSettimana, shiftIsoDate } from "./date";
import { buildDateRange, isLogged, type DailyTotals } from "./history";
import type { MacroTotals } from "./nutrition";
import { formatPeso, ultimoPeso, type PesoGiorno } from "./peso";
import { DAILY_TARGETS, MACRO_ORDER, type MacroKey } from "./targets";

/**
 * Quanto puo' essere lunga la nota sulla dieta della settimana. Largo:
 * "fame giovedi', sgarro sabato sera" e' un appunto, non un tema.
 */
export const MAX_NOTA_DIETA = 500;

/** Una seduta conclusa, come serve al riepilogo. */
export type SedutaRiepilogo = {
  day: string;
  label: string;
  focus: string;
  volume: number;
  setCount: number;
  /** Com'e' andata, a parole. Nulla se non hai scritto niente. */
  note?: string | null;
};

export type Riepilogo = {
  lunedi: string;
  domenica: string;
  /** Sette righe, dal lunedi' alla domenica, anche quelle senza pasti. */
  giorni: DailyTotals[];
  /** Giorni conclusi con almeno un pasto. */
  registrati: number;
  /** Giorni gia' conclusi nella settimana: oggi non ci sta dentro. */
  conclusi: number;
  /** Media sui soli giorni registrati e conclusi, o null se non ce ne sono. */
  medie: MacroTotals | null;
  /**
   * Quante delle calorie della settimana sono state registrate senza macro.
   *
   * Sta nel riepilogo perche' finisce nel testo che si manda al personal
   * trainer: chi legge non ha l'app davanti, e senza questa riga
   * concluderebbe che quella settimana hai mangiato meno proteine di quante
   * ne hai mangiate. Zero vuol dire che tutto e' scomposto.
   */
  kcalNonScomposte: number;
  sedute: SedutaRiepilogo[];
  volumeTotale: number;
  /** Vero se la settimana e' ancora in corso: cambia come si legge tutto. */
  inCorso: boolean;
  /** Serve a distinguere i giorni gia' passati da quelli non ancora arrivati. */
  oggi: string;
  /**
   * "Settimana 3", non le date: e' cosi' che la chiede il PT ogni domenica.
   * Null finche' non esiste una prima settimana da cui contare -- niente
   * numeri inventati su un dato che non c'e' (regola 6).
   */
  numeroSettimana: number | null;
  /**
   * Fame, sgarri: quello che kcal e macro non dicono da soli. Nulla finche'
   * non scrivi niente -- la stessa regola della nota di seduta.
   */
  notaDieta: string | null;
  /**
   * L'ultimo peso registrato in questa settimana e in quella precedente --
   * "peso della settimana scorsa e di questa" e' cosi' che lo chiede il PT.
   * Null quando non c'e' una misura in quell'intervallo: un peso non
   * registrato non e' un peso a zero (regola 6).
   */
  pesoSettimana: number | null;
  pesoSettimanaScorsa: number | null;
};

const NOMI_GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const;

export function nomeGiorno(iso: string): string {
  const giorni = Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
  return NOMI_GIORNI[(((giorni + 3) % 7) + 7) % 7];
}

const GIORNO_MESE = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function giornoMese(iso: string): string {
  return GIORNO_MESE.format(new Date(`${iso}T00:00:00Z`));
}

/*
 * I macro si formattano come a schermo, con `formatMacro`.
 *
 * Non con un formattatore tutto suo: il testo che si copia e la scheda che
 * lo mostra sono lo stesso dato, e se uno scrive "1.845" e l'altra "1845"
 * chi legge si chiede quale dei due sia giusto. I chilogrammi restano
 * raggruppati perche' lo sono gia' ovunque nell'app.
 */

/**
 * Quante settimane sono passate dalla prima mai registrata.
 *
 * Conta le settimane intere fra il lunedi' della prima settimana con
 * qualcosa dentro (diario o allenamento, quale viene prima) e il lunedi'
 * della settimana guardata: la settimana 1 e' quella, non "la prima domenica
 * di gennaio" o un'altra convenzione arbitraria. Null senza una prima
 * settimana da cui contare.
 */
export function numeroSettimana(
  lunedi: string,
  primoLunedi: string | null
): number | null {
  if (!primoLunedi) return null;
  const giorni = Math.round(
    (Date.parse(`${lunedi}T00:00:00Z`) - Date.parse(`${primoLunedi}T00:00:00Z`)) /
      86_400_000
  );
  return Math.floor(giorni / 7) + 1;
}

/**
 * La settimana di una data, dal lunedi' alla domenica.
 *
 * `oggi` serve a sapere dove ci si e' fermati: i giorni non ancora arrivati
 * non sono giorni vuoti, e oggi -- che e' a meta' -- non entra nelle medie.
 * E' la regola 13 di PRODOTTO.md, la stessa che tiene onesto lo Storico:
 * a mezzogiorno hai registrato un pasto su quattro, e farlo contare fa dire
 * numeri falsi.
 *
 * `primoGiorno` e' il primo giorno mai registrato (diario o allenamento),
 * per calcolare la settimana numerata che chiede il PT; `null` se non ancora
 * calcolato, e il numero semplicemente non compare. `notaDieta` e' la nota
 * gia' salvata per questa settimana, o `null` se non ce n'e' una. `pesi` sono
 * le righe di peso corporeo che coprono almeno questa settimana e la
 * precedente -- da qui si prende l'ultima di ciascuna.
 */
export function costruisciRiepilogo(
  totali: DailyTotals[],
  sedute: SedutaRiepilogo[],
  data: string,
  oggi: string,
  primoGiorno: string | null = null,
  notaDieta: string | null = null,
  pesi: PesoGiorno[] = []
): Riepilogo {
  const lunedi = lunediDellaSettimana(data);
  const domenica = shiftIsoDate(lunedi, 6);
  const intervallo = buildDateRange(domenica, 7);

  const byDay = new Map(totali.map((riga) => [riga.day, riga]));
  const giorni = intervallo.map(
    (day) => byDay.get(day) ?? { day, kcal: 0, carbs: 0, protein: 0, fat: 0 }
  );

  // Conclusi = arrivati e finiti. Oggi e' arrivato ma non e' finito; i giorni
  // dopo oggi non sono ancora esistiti, e contarli come "non registrati"
  // direbbe che hai saltato una giornata che deve ancora arrivare.
  const conclusiRighe = giorni.filter((riga) => riga.day < oggi);
  const registrateRighe = conclusiRighe.filter(isLogged);

  let medie: MacroTotals | null = null;
  if (registrateRighe.length > 0) {
    medie = { kcal: 0, carbs: 0, protein: 0, fat: 0 };
    for (const riga of registrateRighe) {
      for (const macro of MACRO_ORDER) medie[macro] += riga[macro];
    }
    for (const macro of MACRO_ORDER) medie[macro] /= registrateRighe.length;
  }

  const kcalNonScomposte = giorni.reduce(
    (somma, riga) => somma + (riga.kcalNonScomposte ?? 0),
    0
  );

  const dellaSettimana = sedute
    .filter((seduta) => seduta.day >= lunedi && seduta.day <= domenica)
    .sort((a, b) => a.day.localeCompare(b.day));

  return {
    lunedi,
    domenica,
    giorni,
    registrati: registrateRighe.length,
    conclusi: conclusiRighe.length,
    medie,
    kcalNonScomposte,
    sedute: dellaSettimana,
    volumeTotale: dellaSettimana.reduce(
      (somma, seduta) => somma + seduta.volume,
      0
    ),
    inCorso: oggi <= domenica,
    oggi,
    numeroSettimana: numeroSettimana(
      lunedi,
      primoGiorno ? lunediDellaSettimana(primoGiorno) : null
    ),
    notaDieta,
    pesoSettimana: ultimoPeso(pesi, lunedi, domenica),
    pesoSettimanaScorsa: ultimoPeso(
      pesi,
      shiftIsoDate(lunedi, -7),
      shiftIsoDate(domenica, -7)
    ),
  };
}

/**
 * Il riepilogo come testo da copiare.
 *
 * Deve reggere da solo fuori di qui: incollato in una chat o mandato al
 * personal trainer, chi legge non ha l'app davanti. Per questo dichiara
 * sempre su quanti giorni e' fatta la media e quali mancano -- un numero
 * senza il suo denominatore e' un numero che si puo' leggere come si vuole.
 */
/**
 * La riga del peso nel testo copiato, o null se non c'e' niente da dire.
 *
 * "Peso della settimana scorsa e di questa" e' letterale: il PT confronta
 * le due misure, quindi quando ci sono entrambe compaiono insieme.
 */
function rigaPeso(r: Riepilogo): string | null {
  if (r.pesoSettimana !== null && r.pesoSettimanaScorsa !== null) {
    return `Peso: ${formatPeso(r.pesoSettimana)} kg (${formatPeso(
      r.pesoSettimanaScorsa
    )} kg la settimana scorsa)`;
  }
  if (r.pesoSettimana !== null) {
    return `Peso: ${formatPeso(r.pesoSettimana)} kg`;
  }
  if (r.pesoSettimanaScorsa !== null) {
    return `Peso la settimana scorsa: ${formatPeso(
      r.pesoSettimanaScorsa
    )} kg (questa settimana non ancora registrato)`;
  }
  return null;
}

export function riepilogoTesto(
  r: Riepilogo,
  targets: Record<MacroKey, number> = DAILY_TARGETS
): string {
  const righe: string[] = [];

  const etichettaSettimana =
    r.numeroSettimana !== null ? `Settimana ${r.numeroSettimana} · ` : "Settimana ";
  righe.push(
    `${etichettaSettimana}${giornoMese(r.lunedi)} – ${giornoMese(r.domenica)}`
  );
  if (r.inCorso) righe.push("(settimana ancora in corso)");
  const peso = rigaPeso(r);
  if (peso) righe.push(peso);
  righe.push("");

  righe.push("ALIMENTAZIONE");
  for (const giorno of r.giorni) {
    const etichetta = `${nomeGiorno(giorno.day)} ${Number(
      giorno.day.slice(8)
    )}`.padEnd(7);

    // Un giorno che deve ancora arrivare non e' un giorno saltato.
    if (giorno.day > r.oggi) {
      righe.push(`${etichetta} —`);
      continue;
    }
    if (!isLogged(giorno)) {
      righe.push(
        `${etichetta} ${
          giorno.day === r.oggi ? "niente per ora" : "non registrato"
        }`
      );
      continue;
    }

    const macro =
      `${formatMacro(giorno.kcal, "kcal")} kcal` +
      ` · C ${formatMacro(giorno.carbs, "carbs")}` +
      ` · P ${formatMacro(giorno.protein, "protein")}` +
      ` · G ${formatMacro(giorno.fat, "fat")}`;
    // Oggi si mostra ma si dichiara: e' un dato, non un giorno finito.
    righe.push(
      `${etichetta} ${macro}${giorno.day === r.oggi ? "  (in corso)" : ""}`
    );
  }

  righe.push("");
  if (r.medie) {
    righe.push(
      `Media su ${r.registrati} ${
        r.registrati === 1 ? "giorno registrato" : "giorni registrati"
      }` + ` su ${r.conclusi} conclusi:`
    );
    righe.push(
      `${formatMacro(r.medie.kcal, "kcal")} kcal · C ${formatMacro(
        r.medie.carbs,
        "carbs"
      )}` +
        ` · P ${formatMacro(r.medie.protein, "protein")}` +
        ` · G ${formatMacro(r.medie.fat, "fat")}`
    );
    righe.push(
      `Target: ${formatMacro(targets.kcal, "kcal")} kcal` +
        ` · C ${formatMacro(targets.carbs, "carbs")}` +
        ` · P ${formatMacro(targets.protein, "protein")}` +
        ` · G ${formatMacro(targets.fat, "fat")}`
    );
  } else {
    righe.push(
      "Nessun giorno concluso e registrato: non c'è una media da fare."
    );
  }

  // Detta una volta, in fondo al blocco dell'alimentazione: senza, chi legge
  // conclude che quella settimana hai mangiato meno proteine di quante ne hai
  // mangiate davvero.
  if (r.kcalNonScomposte > 0) {
    righe.push(
      `Di queste, ${formatMacro(r.kcalNonScomposte, "kcal")} kcal sono state` +
        ` registrate a occhio, senza macro: i grammi qui sopra non le contano.`
    );
  }

  if (r.notaDieta) {
    righe.push("");
    righe.push("DIETA");
    righe.push(r.notaDieta);
  }

  righe.push("");
  righe.push("ALLENAMENTO");
  if (r.sedute.length === 0) {
    righe.push("Nessuna seduta registrata.");
  } else {
    for (const seduta of r.sedute) {
      const etichetta = `${nomeGiorno(seduta.day)} ${Number(
        seduta.day.slice(8)
      )}`.padEnd(7);
      righe.push(
        `${etichetta} ${seduta.label} — ${seduta.focus} · ${seduta.setCount} serie` +
          ` · ${formatVolume(seduta.volume)} kg`
      );
      // La nota sotto la riga dei numeri, rientrata: chi legge vede prima
      // cosa hai fatto e poi perche', che e' l'ordine in cui serve.
      if (seduta.note) righe.push(`        ${seduta.note}`);
    }
    righe.push("");
    righe.push(
      `${r.sedute.length} ${r.sedute.length === 1 ? "seduta" : "sedute"}` +
        ` · ${formatVolume(r.volumeTotale)} kg sollevati in tutto`
    );
  }

  righe.push("");
  righe.push(
    "I carichi degli esercizi con i manubri sono il peso di un manubrio, non il totale."
  );

  return righe.join("\n");
}
