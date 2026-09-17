/**
 * Le regole degli integratori, senza database davanti.
 *
 * Sta qui, e non nell'action, perche' una regola che vive dentro una
 * `"use server"` si puo' provare solo accendendo Postgres. Queste si provano
 * con `npm test`.
 */

/** Tetti larghi: fermano un incolla andato storto, non giudicano una dose. */
export const MAX_NOME = 80;
export const MAX_DOSE = 60;

export type IntegratoreInput = {
  nome: string;
  /** Testo libero: "1 compressa", "2000 UI". Vuoto vuol dire "non la scrivo". */
  dose: string | null;
};

/**
 * Controlla un integratore scritto a mano, e dice cosa non va.
 *
 * Restituisce il messaggio da mostrare, o null se va bene. Come per gli
 * obiettivi: non lancia e non corregge di nascosto.
 */
export function validaIntegratore(input: IntegratoreInput): string | null {
  const nome = input.nome.trim();
  if (!nome) return "Il nome è obbligatorio.";
  if (nome.length > MAX_NOME) return `Il nome non può superare ${MAX_NOME} caratteri.`;

  const dose = input.dose?.trim() ?? "";
  if (dose.length > MAX_DOSE) return `La dose non può superare ${MAX_DOSE} caratteri.`;

  return null;
}

/** Toglie gli spazi di troppo e trasforma una dose vuota in "nessuna dose". */
export function pulisciIntegratore(input: IntegratoreInput): {
  nome: string;
  dose: string | null;
} {
  const dose = input.dose?.trim();
  return { nome: input.nome.trim(), dose: dose ? dose : null };
}

export type IntegratoreDelGiorno = {
  id: number;
  nome: string;
  dose: string | null;
  preso: boolean;
};

/**
 * Quanti ne hai presi, su quanti ne hai in elenco.
 *
 * Il totale e' sempre esplicito, mai sottinteso: "2" da solo non dice niente,
 * "2 di 3" si legge senza contare i tasti. E' la stessa regola delle medie
 * che dichiarano su quanti giorni sono fatte.
 */
export function contaPresi(integratori: IntegratoreDelGiorno[]): {
  presi: number;
  totale: number;
  tutti: boolean;
} {
  const presi = integratori.filter((i) => i.preso).length;
  return { presi, totale: integratori.length, tutti: integratori.length > 0 && presi === integratori.length };
}

/**
 * La riga di riepilogo sopra i tasti.
 *
 * A elenco vuoto non dice "0 di 0": la riga non si mostra proprio, e chi non
 * prende integratori non deve vedere un contatore a zero tutti i giorni.
 * Quando sono tutti presi lo dice, una volta sola e senza esclamativi --
 * l'app non fa il tifo.
 */
export function riassuntoIntegratori(integratori: IntegratoreDelGiorno[]): string {
  const { presi, totale, tutti } = contaPresi(integratori);
  if (totale === 0) return "";
  if (tutti) return totale === 1 ? "Preso" : "Presi tutti";
  return `${presi} di ${totale}`;
}

/**
 * L'elenco di un giorno: gli integratori attivi, con la spunta di quel
 * giorno gia' applicata.
 *
 * Un integratore senza riga di spunta non e' "non preso per sempre": e' non
 * preso *quel giorno*. La differenza conta quando si guarda indietro, e per
 * questo la spunta si tiene per giorno invece che come stato dell'integratore.
 */
export function integratoriDelGiorno(
  attivi: { id: number; name: string; dose: string | null }[],
  spuntati: number[],
): IntegratoreDelGiorno[] {
  const presi = new Set(spuntati);
  return attivi.map((riga) => ({
    id: riga.id,
    nome: riga.name,
    dose: riga.dose,
    preso: presi.has(riga.id),
  }));
}
