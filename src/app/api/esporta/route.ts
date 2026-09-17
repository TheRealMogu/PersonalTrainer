import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { todayIso } from "@/lib/date";
import { getAllMealsForExport, getAllSetsForExport } from "@/lib/queries";
import {
  descriviIntervallo,
  leggiIntervallo,
  suffissoNome,
} from "@/lib/intervallo-export";

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
 *
 * Con `?da=` e `?a=` esce un periodo solo -- serve per mandare una settimana
 * al personal trainer senza aprire il CSV e tagliarlo a mano. In quel caso il
 * file lo dichiara: nel nome e, per il JSON, dentro. Un export parziale che
 * sembra completo e' peggio di nessun export, perche' chi lo legge conclude
 * che hai mangiato solo quello.
 */
export async function GET(request: NextRequest) {
  const formato = request.nextUrl.searchParams.get("formato") ?? "json";
  const oggi = todayIso();

  if (formato !== "json" && formato !== "pasti" && formato !== "serie") {
    return NextResponse.json(
      { errore: "Formato non valido. Usa json, pasti o serie." },
      { status: 400 }
    );
  }

  const letto = leggiIntervallo(request.nextUrl.searchParams);
  if (!letto.ok) {
    return NextResponse.json({ errore: letto.errore }, { status: 400 });
  }
  const intervallo = letto.intervallo;
  const suffisso = suffissoNome(intervallo, oggi);

  if (formato === "pasti") {
    const pasti = await getAllMealsForExport(intervallo);
    return file(
      toCsv(
        [
          "giorno",
          "momento",
          "quantita",
          "alimento",
          "kcal",
          "carboidrati",
          "proteine",
          "grassi",
          "solo_kcal",
        ],
        pasti.map((m) => [
          m.day,
          m.slot,
          m.quantity,
          m.name,
          m.kcal,
          m.carbs,
          m.protein,
          m.fat,
          // Senza questa colonna i tre zeri di un pasto segnato a occhio
          // sembrerebbero grammi misurati, anche fuori di qui.
          m.onlyKcal ? "si" : "no",
        ])
      ),
      `pasti-${suffisso}.csv`,
      "text/csv; charset=utf-8"
    );
  }

  if (formato === "serie") {
    const serie = await getAllSetsForExport(intervallo);
    return file(
      toCsv(
        [
          "giorno",
          "giornata",
          "focus",
          "esercizio",
          "serie",
          "carico_kg",
          "ripetizioni",
        ],
        serie.map((s) => [
          s.day,
          s.dayLabel,
          s.focus,
          s.exercise,
          s.setNumber,
          s.weight,
          s.reps,
        ])
      ),
      `allenamenti-${suffisso}.csv`,
      "text/csv; charset=utf-8"
    );
  }

  const [pasti, serie] = await Promise.all([
    getAllMealsForExport(intervallo),
    getAllSetsForExport(intervallo),
  ]);
  return file(
    JSON.stringify(
      {
        esportatoIl: new Date().toISOString(),
        // Il periodo sta in cima e non in fondo: e' la prima cosa da sapere
        // prima di leggere i numeri.
        periodo: descriviIntervallo(intervallo),
        da: intervallo.da,
        a: intervallo.a,
        pasti,
        serie,
      },
      null,
      2
    ),
    `personal-trainer-${suffisso}.json`,
    "application/json; charset=utf-8"
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
