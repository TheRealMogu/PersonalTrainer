import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { todayIso } from "@/lib/date";
import { getAllMealsForExport, getAllSetsForExport } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Esportazione dei dati.
 *
 * Il motivo e' semplice: il giorno che questo progetto finisce, o che Neon
 * chiude il piano gratuito, i mesi di diario devono restare tuoi. Un'app che
 * accumula dati e non ti lascia portarli via te li sta tenendo in ostaggio.
 *
 * La porta e' protetta come tutto il resto: il proxy chiede la sessione prima
 * di arrivare qui.
 */
export async function GET(request: NextRequest) {
  const formato = request.nextUrl.searchParams.get("formato") ?? "json";
  const oggi = todayIso();

  if (formato !== "json" && formato !== "pasti" && formato !== "serie") {
    return NextResponse.json(
      { errore: "Formato non valido. Usa json, pasti o serie." },
      { status: 400 },
    );
  }

  if (formato === "pasti") {
    const pasti = await getAllMealsForExport();
    return file(
      toCsv(
        ["giorno", "momento", "quantita", "alimento", "kcal", "carboidrati", "proteine", "grassi"],
        pasti.map((m) => [m.day, m.slot, m.quantity, m.name, m.kcal, m.carbs, m.protein, m.fat]),
      ),
      `pasti-${oggi}.csv`,
      "text/csv; charset=utf-8",
    );
  }

  if (formato === "serie") {
    const serie = await getAllSetsForExport();
    return file(
      toCsv(
        ["giorno", "giornata", "focus", "esercizio", "serie", "carico_kg", "ripetizioni"],
        serie.map((s) => [s.day, s.dayLabel, s.focus, s.exercise, s.setNumber, s.weight, s.reps]),
      ),
      `allenamenti-${oggi}.csv`,
      "text/csv; charset=utf-8",
    );
  }

  const [pasti, serie] = await Promise.all([getAllMealsForExport(), getAllSetsForExport()]);
  return file(
    JSON.stringify({ esportatoIl: new Date().toISOString(), pasti, serie }, null, 2),
    `personal-trainer-${oggi}.json`,
    "application/json; charset=utf-8",
  );
}

function file(body: string, nome: string, tipo: string) {
  return new NextResponse(body, {
    headers: {
      "content-type": tipo,
      "content-disposition": `attachment; filename="${nome}"`,
      // Un backup non si prende dalla cache: deve essere quello di adesso.
      "cache-control": "no-store",
    },
  });
}
