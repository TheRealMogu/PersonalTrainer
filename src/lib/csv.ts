/**
 * Generazione di CSV.
 *
 * Scritta a mano invece di aggiungere una dipendenza: le regole sono tre e
 * stanno in venti righe. Quelle tre pero' vanno rispettate, altrimenti un
 * nome con una virgola dentro sposta tutte le colonne di una posizione e il
 * file sembra giusto finche' non lo guardi.
 */

/** Le celle che contengono virgole, virgolette o a capo vanno quotate. */
function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  // Dentro le virgolette, una virgoletta si scrive raddoppiata.
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  // CRLF e BOM: senza, Excel apre il file con le accentate rotte e in una
  // colonna sola. Non e' eleganza, e' l'unico modo perche' si apra bene.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
