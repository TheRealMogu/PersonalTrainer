"use server";

import { revalidatePath } from "next/cache";
import { asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { inTransazione } from "@/db/transazione";
import { workoutDays, workoutExercises, workoutSets } from "@/db/schema";
import {
  confronta,
  leggiScheda,
  nessunCambiamento,
  stessaCosa,
  type Confronto,
  type GiornataAttuale,
  type GiornataProposta,
} from "@/lib/scheda";

export type SchedaResult =
  | { ok: true; confronto: Confronto; fotografia: Fotografia }
  | { ok: false; error: string };

/**
 * Com'era il programma prima del cambio.
 *
 * Serve all'annullamento, ed e' la stessa idea del backup di una seduta
 * eliminata: si tiene da parte la fotografia del prima, invece di provare a
 * ricostruire a ritroso quello che e' successo.
 */
export type Fotografia = {
  giornate: {
    id: number;
    label: string;
    focus: string;
    sortOrder: number;
    archiviatoIl: string | null;
  }[];
  esercizi: {
    id: number;
    dayId: number;
    name: string;
    sets: number;
    reps: string;
    sortOrder: number;
    archiviatoIl: string | null;
  }[];
};

/** Legge la scheda di adesso, con quante serie sono registrate su ognuno. */
export async function leggiSchedaAttuale(): Promise<GiornataAttuale[]> {
  const [giornate, esercizi, conteggi] = await Promise.all([
    db
      .select()
      .from(workoutDays)
      .where(isNull(workoutDays.archiviatoIl))
      .orderBy(asc(workoutDays.sortOrder), asc(workoutDays.id)),
    db
      .select()
      .from(workoutExercises)
      .where(isNull(workoutExercises.archiviatoIl))
      .orderBy(asc(workoutExercises.sortOrder), asc(workoutExercises.id)),
    db
      .select({
        exerciseId: workoutSets.exerciseId,
        volte: sql<number>`count(*)::int`,
      })
      .from(workoutSets)
      .groupBy(workoutSets.exerciseId),
  ]);

  const perEsercizio = new Map(
    conteggi.map((c) => [c.exerciseId, Number(c.volte)])
  );

  return giornate.map((giornata) => ({
    id: giornata.id,
    label: giornata.label,
    focus: giornata.focus,
    esercizi: esercizi
      .filter((e) => e.dayId === giornata.id)
      .map((e) => ({
        id: e.id,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        serieRegistrate: perEsercizio.get(e.id) ?? 0,
      })),
  }));
}

/**
 * Legge il testo incollato e dice cosa cambierebbe. **Non scrive niente.**
 *
 * E' il passaggio che rende sicuro tutto il resto: si guarda prima, come per
 * i pasti stimati. Con la differenza che qui un errore non si ripara
 * riscrivendo un numero -- si ripara solo con l'annullamento, e conviene non
 * doverci arrivare.
 */
export async function anteprimaScheda(testo: string): Promise<SchedaResult> {
  const letto = leggiScheda(testo);
  if (!letto.ok) return { ok: false, error: letto.errore };

  try {
    const attuale = await leggiSchedaAttuale();
    return {
      ok: true,
      confronto: confronta(attuale, letto.giornate),
      fotografia: await scatta(),
    };
  } catch (cause) {
    console.error("anteprimaScheda fallita", cause);
    return {
      ok: false,
      error: "Non sono riuscito a leggere la scheda di adesso. Riprova.",
    };
  }
}

/** Tutte le righe, archiviate comprese: e' quello che va rimesso com'era. */
async function scatta(): Promise<Fotografia> {
  const [giornate, esercizi] = await Promise.all([
    db.select().from(workoutDays),
    db.select().from(workoutExercises),
  ]);
  const iso = (d: Date | null) => (d === null ? null : d.toISOString());
  return {
    giornate: giornate.map((g) => ({
      id: g.id,
      label: g.label,
      focus: g.focus,
      sortOrder: g.sortOrder,
      archiviatoIl: iso(g.archiviatoIl),
    })),
    esercizi: esercizi.map((e) => ({
      id: e.id,
      dayId: e.dayId,
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      sortOrder: e.sortOrder,
      archiviatoIl: iso(e.archiviatoIl),
    })),
  };
}

export type ApplicaResult =
  | { ok: true; confronto: Confronto; fotografia: Fotografia }
  | { ok: false; error: string };

/**
 * Applica il cambio: tutto insieme o niente.
 *
 * Il piano si ricalcola qui dentro, sullo stato di *adesso*, e non si prende
 * per buono quello che arriva dal browser: l'anteprima e' un aiuto per
 * decidere, non un ordine da eseguire alla lettera.
 *
 * La scrittura passa da `inTransazione`, che e' atomica su tutti e due i
 * driver -- vedi `src/db/transazione.ts` per il perche' ne serva uno. Un
 * cambio interrotto a meta' lascerebbe una scheda mezza vecchia e mezza
 * nuova, che e' esattamente la sporcizia da evitare.
 */
export async function applicaScheda(testo: string): Promise<ApplicaResult> {
  const letto = leggiScheda(testo);
  if (!letto.ok) return { ok: false, error: letto.errore };

  try {
    const prima = await scatta();
    const attuale = await leggiSchedaAttuale();
    const confronto = confronta(attuale, letto.giornate);

    if (nessunCambiamento(confronto)) {
      return {
        ok: false,
        error:
          "Questa scheda è identica a quella di adesso: non c'è niente da cambiare.",
      };
    }

    const adesso = new Date();
    const istruzioni = costruisciIstruzioni(attuale, letto.giornate);

    // Gli inserimenti hanno bisogno degli id delle giornate nuove, che non
    // esistono ancora: si creano prima, in un batch loro, e solo dopo si
    // applica il resto. Le giornate nuove da sole non sporcano niente -- una
    // giornata senza esercizi non compare da nessuna parte.
    for (const giornata of istruzioni.giornateDaCreare) {
      const [creata] = await db
        .insert(workoutDays)
        .values({
          label: giornata.etichetta,
          focus: giornata.focus,
          sortOrder: giornata.ordine,
        })
        .returning({ id: workoutDays.id });
      istruzioni.idPerEtichetta.set(giornata.etichetta, creata.id);
    }

    await inTransazione((tx) => [
      ...istruzioni.aggiornaGiornate.map((g) =>
        tx
          .update(workoutDays)
          .set({ focus: g.focus, sortOrder: g.ordine, archiviatoIl: null })
          .where(eq(workoutDays.id, g.id))
      ),
      ...istruzioni.archiviaGiornate.map((id) =>
        tx
          .update(workoutDays)
          .set({ archiviatoIl: adesso })
          .where(eq(workoutDays.id, id))
      ),
      ...istruzioni.aggiornaEsercizi.map((e) =>
        tx
          .update(workoutExercises)
          .set({
            sets: e.serie,
            reps: e.ripetizioni,
            sortOrder: e.ordine,
            archiviatoIl: null,
          })
          .where(eq(workoutExercises.id, e.id))
      ),
      ...istruzioni.archiviaEsercizi.map((id) =>
        tx
          .update(workoutExercises)
          .set({ archiviatoIl: adesso })
          .where(eq(workoutExercises.id, id))
      ),
      ...istruzioni
        .creaEsercizi(letto.giornate)
        .map((e) => tx.insert(workoutExercises).values(e)),
    ]);

    revalidatePath("/");
    revalidatePath("/allenamento");
    revalidatePath("/piano");
    revalidatePath("/scheda");
    revalidatePath("/storico");
    return { ok: true, confronto, fotografia: prima };
  } catch (cause) {
    console.error("applicaScheda fallita", cause);
    return {
      ok: false,
      error:
        "Il cambio non è riuscito. La scheda di prima è ancora quella buona.",
    };
  }
}

type Istruzioni = {
  giornateDaCreare: { etichetta: string; focus: string; ordine: number }[];
  idPerEtichetta: Map<string, number>;
  aggiornaGiornate: { id: number; focus: string; ordine: number }[];
  archiviaGiornate: number[];
  aggiornaEsercizi: {
    id: number;
    serie: number;
    ripetizioni: string;
    ordine: number;
  }[];
  archiviaEsercizi: number[];
  creaEsercizi: (proposta: GiornataProposta[]) => {
    dayId: number;
    name: string;
    sets: number;
    reps: string;
    sortOrder: number;
  }[];
};

function costruisciIstruzioni(
  attuale: GiornataAttuale[],
  proposta: GiornataProposta[]
): Istruzioni {
  const idPerEtichetta = new Map<string, number>();
  const giornateDaCreare: Istruzioni["giornateDaCreare"] = [];
  const aggiornaGiornate: Istruzioni["aggiornaGiornate"] = [];
  const archiviaGiornate: number[] = [];
  const aggiornaEsercizi: Istruzioni["aggiornaEsercizi"] = [];
  const archiviaEsercizi: number[] = [];

  proposta.forEach((giornata, ordine) => {
    const vecchia = attuale.find((g) =>
      stessaCosa(g.label, giornata.etichetta)
    );
    if (vecchia) {
      idPerEtichetta.set(giornata.etichetta, vecchia.id);
      aggiornaGiornate.push({ id: vecchia.id, focus: giornata.focus, ordine });
    } else {
      giornateDaCreare.push({
        etichetta: giornata.etichetta,
        focus: giornata.focus,
        ordine,
      });
    }

    giornata.esercizi.forEach((esercizio, posizione) => {
      const vecchio = vecchia?.esercizi.find((e) =>
        stessaCosa(e.name, esercizio.nome)
      );
      if (vecchio) {
        aggiornaEsercizi.push({
          id: vecchio.id,
          serie: esercizio.serie,
          ripetizioni: esercizio.ripetizioni,
          ordine: posizione,
        });
      }
    });
  });

  for (const giornata of attuale) {
    const resta = proposta.some((g) => stessaCosa(g.etichetta, giornata.label));
    if (!resta) {
      archiviaGiornate.push(giornata.id);
      for (const esercizio of giornata.esercizi)
        archiviaEsercizi.push(esercizio.id);
      continue;
    }
    const nuova = proposta.find((g) =>
      stessaCosa(g.etichetta, giornata.label)
    )!;
    for (const esercizio of giornata.esercizi) {
      if (!nuova.esercizi.some((e) => stessaCosa(e.nome, esercizio.name))) {
        archiviaEsercizi.push(esercizio.id);
      }
    }
  }

  const creaEsercizi: Istruzioni["creaEsercizi"] = (giornate) => {
    const nuovi: ReturnType<Istruzioni["creaEsercizi"]> = [];
    for (const giornata of giornate) {
      const dayId = idPerEtichetta.get(giornata.etichetta);
      if (dayId === undefined) continue;
      const vecchia = attuale.find((g) =>
        stessaCosa(g.label, giornata.etichetta)
      );
      giornata.esercizi.forEach((esercizio, posizione) => {
        const esisteGia = vecchia?.esercizi.some((e) =>
          stessaCosa(e.name, esercizio.nome)
        );
        if (esisteGia) return;
        nuovi.push({
          dayId,
          name: esercizio.nome,
          sets: esercizio.serie,
          reps: esercizio.ripetizioni,
          sortOrder: posizione,
        });
      });
    }
    return nuovi;
  };

  return {
    giornateDaCreare,
    idPerEtichetta,
    aggiornaGiornate,
    archiviaGiornate,
    aggiornaEsercizi,
    archiviaEsercizi,
    creaEsercizi,
  };
}

export type AnnullaResult = { ok: true } | { ok: false; error: string };

/**
 * Rimette il programma com'era prima del cambio.
 *
 * Non esercizio per esercizio: un'azione sola che riporta indietro tutto,
 * archiviati compresi. Le righe create dal cambio si tolgono -- sono nate
 * pochi secondi fa e non hanno serie registrate sopra -- e tutte le altre
 * tornano ai valori della fotografia.
 *
 * Le serie registrate non si toccano mai, in nessuna direzione: non le ha
 * cancellate il cambio e non le rimette l'annullamento.
 */
export async function annullaCambioScheda(
  fotografia: Fotografia
): Promise<AnnullaResult> {
  try {
    const [giornateOra, eserciziOra] = await Promise.all([
      db.select({ id: workoutDays.id }).from(workoutDays),
      db.select({ id: workoutExercises.id }).from(workoutExercises),
    ]);

    const giornateAllora = new Set(fotografia.giornate.map((g) => g.id));
    const eserciziAllora = new Set(fotografia.esercizi.map((e) => e.id));

    await inTransazione((tx) => [
      // Prima si tolgono gli esercizi nati dal cambio, poi le giornate: al
      // contrario la chiave esterna si lamenterebbe.
      ...eserciziOra
        .filter((e) => !eserciziAllora.has(e.id))
        .map((e) => tx.delete(workoutExercises).where(eq(workoutExercises.id, e.id))),
      ...giornateOra
        .filter((g) => !giornateAllora.has(g.id))
        .map((g) => tx.delete(workoutDays).where(eq(workoutDays.id, g.id))),
      ...fotografia.giornate.map((g) =>
        tx
          .update(workoutDays)
          .set({
            label: g.label,
            focus: g.focus,
            sortOrder: g.sortOrder,
            archiviatoIl: g.archiviatoIl === null ? null : new Date(g.archiviatoIl),
          })
          .where(eq(workoutDays.id, g.id))
      ),
      ...fotografia.esercizi.map((e) =>
        tx
          .update(workoutExercises)
          .set({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            sortOrder: e.sortOrder,
            archiviatoIl: e.archiviatoIl === null ? null : new Date(e.archiviatoIl),
          })
          .where(eq(workoutExercises.id, e.id))
      ),
    ]);
  } catch (cause) {
    console.error("annullaCambioScheda fallita", cause);
    return {
      ok: false,
      error: "Non sono riuscito a tornare indietro. Riprova.",
    };
  }

  revalidatePath("/");
  revalidatePath("/allenamento");
  revalidatePath("/piano");
  revalidatePath("/scheda");
  revalidatePath("/storico");
  return { ok: true };
}
