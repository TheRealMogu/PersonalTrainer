"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { supplements } from "@/db/schema";
import {
  pulisciIntegratore,
  validaIntegratore,
  type IntegratoreInput,
} from "@/lib/integratori";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Aggiunge un integratore in fondo all'elenco.
 *
 * In fondo e non in cima, come per gli alimenti: l'ordine dei tasti si
 * decide, non e' l'effetto collaterale dell'ultimo inserimento.
 */
export async function aggiungiIntegratore(input: IntegratoreInput): Promise<ActionResult> {
  const errore = validaIntegratore(input);
  if (errore) return { ok: false, error: errore };

  const pulito = pulisciIntegratore(input);
  try {
    const [ultimo] = await db
      .select({ massimo: sql<number>`coalesce(max(${supplements.sortOrder}), -1)::int` })
      .from(supplements);

    await db.insert(supplements).values({
      name: pulito.nome,
      dose: pulito.dose,
      sortOrder: (ultimo?.massimo ?? -1) + 1,
    });
  } catch (cause) {
    console.error("aggiungiIntegratore fallita", cause);
    return { ok: false, error: "Non sono riuscito a salvarlo. Riprova." };
  }

  revalidatePath("/");
  revalidatePath("/integratori");
  return { ok: true };
}

export async function correggiIntegratore(
  id: number,
  input: IntegratoreInput,
): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Integratore non valido." };
  const errore = validaIntegratore(input);
  if (errore) return { ok: false, error: errore };

  const pulito = pulisciIntegratore(input);
  try {
    const righe = await db
      .update(supplements)
      .set({ name: pulito.nome, dose: pulito.dose })
      .where(eq(supplements.id, id))
      .returning({ id: supplements.id });

    if (righe.length === 0) return { ok: false, error: "Integratore non trovato." };
  } catch (cause) {
    console.error("correggiIntegratore fallita", cause);
    return { ok: false, error: "Modifica non riuscita. Riprova." };
  }

  revalidatePath("/");
  revalidatePath("/integratori");
  return { ok: true };
}

/**
 * Lo toglie dal diario senza cancellare le spunte.
 *
 * Il cestino qui non fa una DELETE, e non e' timidezza: le spunte hanno una
 * chiave esterna con `ON DELETE CASCADE`, quindi eliminare davvero la riga
 * porterebbe via anche tutti i giorni in cui l'hai preso. E' la stessa
 * trappola gia' pagata con la scheda di allenamento, dove cambiare gli
 * esercizi cancellava i carichi.
 *
 * Quello che ti serve e' "non lo prendo piu'", e questo lo fa: sparisce dal
 * diario subito, e "l'ho preso a marzo?" ha ancora una risposta.
 */
export async function mettiDaParteIntegratore(id: number): Promise<ActionResult> {
  return cambiaAttivo(id, false, "Non sono riuscito a toglierlo. Riprova.");
}

/** Lo rimette nel diario. E' l'annullamento del cestino, e non perde niente. */
export async function riprendiIntegratore(id: number): Promise<ActionResult> {
  return cambiaAttivo(id, true, "Non sono riuscito a rimetterlo. Riprova.");
}

async function cambiaAttivo(
  id: number,
  active: boolean,
  messaggio: string,
): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Integratore non valido." };

  try {
    const righe = await db
      .update(supplements)
      .set({ active })
      .where(eq(supplements.id, id))
      .returning({ id: supplements.id });

    if (righe.length === 0) return { ok: false, error: "Integratore non trovato." };
  } catch (cause) {
    console.error("cambiaAttivo fallita", cause);
    return { ok: false, error: messaggio };
  }

  revalidatePath("/");
  revalidatePath("/integratori");
  return { ok: true };
}
