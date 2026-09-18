"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  cercaProdotto,
  cercaProdottoPerBarcode,
  type MealInput,
} from "@/app/actions";
import { addQuickFood } from "@/app/alimenti/actions";
import {
  barcodeValido,
  scalaProdotto,
  type ProdottoOFF,
} from "@/lib/openfoodfacts";
import { MEAL_SLOTS, SLOT_LABELS, type MealSlot } from "@/lib/meal-slots";
import { formatMacro } from "@/lib/nutrition";

/** Le porzioni che si scrivono più spesso, in grammi. */
const PRESET_GRAMMI = [50, 100, 150, 200];
const MAX_GRAMMI = 2000;
/** Non ha senso cercare "a", "ab": aspetta la terza lettera prima di partire. */
const MIN_QUERY = 3;
/** Il tempo di battitura prima di considerarla ferma. */
const DEBOUNCE_MS = 450;

/**
 * Cerca un prodotto per nome su Open Food Facts, invece di doverlo comporre
 * a mano o descriverlo in chat.
 *
 * La ricerca parte dal server (vedi `cercaProdotto`): qui si mostrano solo
 * proposte, mai una scrittura diretta. I valori restano etichettati "per
 * 100 g" finché non scegli i grammi, e solo allora diventano il pasto da
 * confermare — la stessa regola di "Incolla da Claude": un numero che arriva
 * da fuori si vede e si conferma prima di salvarlo (regola 12).
 */
export function CercaProdotto({
  defaultSlot,
  onAdd,
}: {
  defaultSlot: MealSlot;
  onAdd: (input: Omit<MealInput, "day">) => void;
}) {
  const [aperto, setAperto] = useState(false);
  const [query, setQuery] = useState("");
  const [risultati, setRisultati] = useState<ProdottoOFF[] | null>(null);
  const [cercando, setCercando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [scelto, setScelto] = useState<ProdottoOFF | null>(null);
  const [grammiTesto, setGrammiTesto] = useState("100");
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const [salvato, setSalvato] = useState<"no" | "fatto" | string>("no");
  const [salvataggio, startSalvataggio] = useTransition();
  const [modalitaBarcode, setModalitaBarcode] = useState(false);
  const [barcodeTesto, setBarcodeTesto] = useState("");
  const richiesta = useRef(0);

  function chiudi() {
    setAperto(false);
    setQuery("");
    setRisultati(null);
    setCercando(false);
    setErrore(null);
    setScelto(null);
    setGrammiTesto("100");
    setSlot(defaultSlot);
    setSalvato("no");
    setModalitaBarcode(false);
    setBarcodeTesto("");
  }

  /**
   * Il nome basta quasi sempre; il codice a barre serve solo quando due
   * varianti dello stesso prodotto si somigliano troppo nel nome (ROADMAP.md,
   * 6-sexies). Passando da una modalità all'altra si azzera lo stato
   * dell'altra ricerca, così non resta a schermo un errore o un elenco che
   * non c'entra più con quello che si sta cercando adesso.
   */
  function passaAModalita(barcode: boolean) {
    setModalitaBarcode(barcode);
    setQuery("");
    setBarcodeTesto("");
    setRisultati(null);
    setCercando(false);
    setErrore(null);
  }

  function scegli(prodotto: ProdottoOFF) {
    setScelto(prodotto);
    // Il tasto rapido appartiene alla scelta corrente: passando a un altro
    // prodotto lo stato "salvato" del precedente non ha più senso qui.
    setSalvato("no");
  }

  function impostaGrammi(valore: string) {
    setGrammiTesto(valore);
    // "Salvato ✓" vale per i grammi con cui è stato salvato: cambiandoli si
    // tornerebbe a salvare una porzione diversa da quella segnata come fatta.
    setSalvato("no");
  }

  /*
   * Debounce sulla digitazione: senza, ogni lettera partirebbe una chiamata
   * al server. `richiesta` scarta una risposta arrivata in ritardo rispetto
   * a una ricerca più recente -- su rete lenta possono tornare in ordine
   * sparso, e l'ultima digitata deve vincere sempre.
   */
  useEffect(() => {
    if (scelto || modalitaBarcode) return;
    const testo = query.trim();
    // Sotto la soglia non c'e' niente da cercare: si lascia il testo
    // com'e', invece di azzerare stato in un effetto per un cambio di
    // proprieta' -- e' quello che il resto della schermata gia' nasconde
    // guardando la lunghezza di `query` direttamente.
    if (testo.length < MIN_QUERY) return;

    const numero = ++richiesta.current;
    const timer = setTimeout(async () => {
      // Il riscontro "Cerco…" parte qui e non subito: prima del debounce non
      // c'e' ancora nessuna richiesta in corso da segnalare.
      setCercando(true);
      const esito = await cercaProdotto(testo).catch(
        () =>
          ({
            ok: false,
            error: "Non riesco a cercare adesso: controlla la rete e riprova.",
          }) as const,
      );
      if (numero !== richiesta.current) return;
      setCercando(false);
      if (!esito.ok) {
        setErrore(esito.error);
        setRisultati(null);
        return;
      }
      setErrore(null);
      setRisultati(esito.prodotti);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, scelto, modalitaBarcode]);

  /*
   * Stesso debounce, ma per il codice a barre: parte solo quando le cifre
   * scritte formano una lunghezza vera (EAN-8/12/13/14), non a ogni tasto --
   * un codice a barre a meta' non e' un codice a barre sbagliato, e' solo
   * non ancora finito. Trovato un solo prodotto, ci si va dritti al foglio
   * dei grammi: un codice a barre identifica esattamente una cosa, non serve
   * un elenco fra cui scegliere.
   */
  useEffect(() => {
    if (scelto || !modalitaBarcode) return;
    const codice = barcodeTesto.trim();
    if (!barcodeValido(codice)) return;

    const numero = ++richiesta.current;
    const timer = setTimeout(async () => {
      setCercando(true);
      const esito = await cercaProdottoPerBarcode(codice).catch(
        () =>
          ({
            ok: false,
            error: "Non riesco a cercare adesso: controlla la rete e riprova.",
          }) as const,
      );
      if (numero !== richiesta.current) return;
      setCercando(false);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setErrore(null);
      scegli(esito.prodotto);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [barcodeTesto, modalitaBarcode, scelto]);

  const grammi = Number(grammiTesto.replace(",", "."));
  const grammiValidi =
    Number.isFinite(grammi) && grammi > 0 && grammi <= MAX_GRAMMI;
  const scalato = scelto && grammiValidi ? scalaProdotto(scelto, grammi) : null;

  /*
   * Sotto la soglia non e' partita nessuna ricerca: quello che restava in
   * `risultati`/`errore` da una ricerca precedente non deve comparire per
   * una query troppo corta. Si nasconde qui invece di azzerare lo stato in
   * un effetto per un cambio di `query` (vedi sopra).
   */
  const testoValido = query.trim().length >= MIN_QUERY;

  function conferma() {
    if (!scelto || !scalato) return;
    onAdd({
      slot,
      name: scelto.marca ? `${scelto.nome} (${scelto.marca})` : scelto.nome,
      quantity: 1,
      kcal: scalato.kcal,
      carbs: scalato.carbs,
      protein: scalato.protein,
      fat: scalato.fat,
    });
    chiudi();
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="min-h-11 w-full rounded-xl border border-dashed border-hairline py-3 text-[15px] font-medium text-accent tocco active:bg-raised"
      >
        Cerca un prodotto
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={chiudi}
        className="absolute inset-0 animate-velo bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cerca un prodotto"
        className="relative animate-foglio mx-auto flex max-h-[88vh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-surface px-5 pt-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        {!scelto ? (
          <>
            <header className="mb-4">
              <h2 className="text-[20px] font-bold leading-tight tracking-tight">
                Cerca un prodotto
              </h2>
              <p className="mt-0.5 text-[13px] text-muted">
                Da Open Food Facts, l&apos;archivio libero su cui è costruita
                anche Yuka.
              </p>
            </header>

            {!modalitaBarcode ? (
              <>
                <label className="block">
                  <span className="sr-only">Nome del prodotto</span>
                  <input
                    type="text"
                    inputMode="search"
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="es. yogurt greco"
                    className="min-h-12 w-full rounded-xl border border-hairline bg-raised px-3 text-[15px] outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                  />
                </label>

                {/* Riscontro entro i 100 ms richiesti dalla regola 3: appena parte la ricerca, si vede. */}
                {testoValido && cercando ? (
                  <p className="mt-3 text-[13px] text-muted">Cerco…</p>
                ) : null}

                {testoValido && !cercando && errore ? (
                  <p
                    role="alert"
                    className="mt-3 text-[13px] leading-snug text-muted"
                  >
                    {errore}
                  </p>
                ) : null}

                {testoValido &&
                !cercando &&
                !errore &&
                risultati &&
                risultati.length === 0 ? (
                  <p className="mt-3 text-[13px] leading-snug text-muted">
                    Nessun prodotto trovato per «{query.trim()}». Prova un nome
                    più semplice, o usa <em>Incolla da Claude</em> per una
                    descrizione.
                  </p>
                ) : null}

                {testoValido &&
                !cercando &&
                risultati &&
                risultati.length > 0 ? (
                  <ul className="mt-3 divide-y divide-hairline">
                    {risultati.map((prodotto, indice) => (
                      <li key={`${prodotto.nome}-${indice}`}>
                        <button
                          type="button"
                          onClick={() => scegli(prodotto)}
                          className="flex min-h-12 w-full items-center gap-2 py-2 text-left tocco active:bg-raised"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-medium">
                              {prodotto.nome}
                            </span>
                            <span className="block text-[13px] tabular-nums text-muted">
                              {prodotto.marca ? `${prodotto.marca} · ` : ""}
                              {formatMacro(prodotto.kcalPer100g, "kcal")} kcal
                              /100 g
                              {!prodotto.completo ? " · macro incompleti" : ""}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <>
                {/*
                  Serve solo quando il nome non basta a distinguere due
                  varianti dello stesso prodotto: per questo sta dietro un
                  tocco in più e non affianco al campo del nome.
                */}
                <label className="block">
                  <span className="sr-only">Codice a barre</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={barcodeTesto}
                    onChange={(event) =>
                      setBarcodeTesto(
                        event.target.value.replace(/\D/g, "").slice(0, 14),
                      )
                    }
                    placeholder="es. 8001505005707"
                    className="min-h-12 w-full rounded-xl border border-hairline bg-raised px-3 text-[15px] tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                  />
                </label>

                {cercando ? (
                  <p className="mt-3 text-[13px] text-muted">Cerco…</p>
                ) : null}

                {!cercando && errore ? (
                  <p
                    role="alert"
                    className="mt-3 text-[13px] leading-snug text-muted"
                  >
                    {errore}
                  </p>
                ) : null}
              </>
            )}

            <button
              type="button"
              onClick={() => passaAModalita(!modalitaBarcode)}
              className="mt-3 min-h-11 text-[13px] font-medium text-accent tocco"
            >
              {modalitaBarcode ? "Cerca per nome" : "Hai il codice a barre?"}
            </button>

            <div className="sticky bottom-0 -mx-5 mt-4 bg-surface px-5 pt-3">
              <button
                type="button"
                onClick={chiudi}
                className="min-h-12 w-full rounded-xl border border-hairline text-[15px] font-medium text-muted tocco active:bg-raised"
              >
                Chiudi
              </button>
            </div>
          </>
        ) : (
          <>
            <header className="mb-4">
              <button
                type="button"
                onClick={() => setScelto(null)}
                className="mb-2 min-h-11 text-[13px] font-medium text-accent tocco"
              >
                ← Altri risultati
              </button>
              <h2 className="text-[20px] font-bold leading-tight tracking-tight">
                {scelto.nome}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted">
                {scelto.marca ? `${scelto.marca} · ` : ""}
                {formatMacro(scelto.kcalPer100g, "kcal")} kcal per 100 g,
                dichiarati da Open Food Facts
              </p>
              {!scelto.completo ? (
                <p className="mt-1 text-[13px] leading-snug text-muted">
                  Questa scheda non ha tutti i macro: quelli mancanti contano
                  come non dichiarati, non come zero.
                </p>
              ) : null}
            </header>

            <p className="mb-2 text-[13px] text-muted">Quanti grammi</p>
            <div className="flex gap-2">
              {PRESET_GRAMMI.map((valore) => (
                <button
                  key={valore}
                  type="button"
                  onClick={() => impostaGrammi(String(valore))}
                  className={`h-12 flex-1 rounded-xl text-[15px] font-semibold tabular-nums transition-colors duration-200 ease-ios ${
                    grammiTesto === String(valore)
                      ? "bg-accent-solid text-on-accent"
                      : "border border-hairline bg-raised text-ink"
                  }`}
                >
                  {valore}
                </button>
              ))}
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-[13px] text-muted">
                Oppure scrivi i grammi
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={grammiTesto}
                onChange={(event) => impostaGrammi(event.target.value)}
                className="h-12 w-full rounded-xl border border-hairline bg-raised px-3 text-center text-[17px] font-semibold tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
              />
            </label>

            <p className="mt-4 mb-2 text-[13px] text-muted">Quando</p>
            <div className="flex gap-2">
              {MEAL_SLOTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSlot(value)}
                  aria-pressed={slot === value}
                  className={`h-11 flex-1 rounded-xl text-[13px] font-medium transition-colors duration-200 ease-ios ${
                    slot === value
                      ? "bg-accent-solid text-on-accent"
                      : "border border-hairline bg-raised text-muted"
                  }`}
                >
                  {SLOT_LABELS[value]}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-raised px-4 py-3">
              <p className="text-[15px] font-semibold tabular-nums">
                {scalato ? formatMacro(scalato.kcal, "kcal") : "—"} kcal
              </p>
              <p className="mt-0.5 text-[13px] tabular-nums text-muted">
                C {scalato ? formatMacro(scalato.carbs, "carbs") : "—"} · P{" "}
                {scalato ? formatMacro(scalato.protein, "protein") : "—"} · G{" "}
                {scalato ? formatMacro(scalato.fat, "fat") : "—"}
              </p>
            </div>

            {/*
              Il verso che fa diventare tuo l'archivio del mondo: senza,
              ogni volta che rivuoi lo stesso prodotto tocca ricercarlo da
              capo. I valori salvati sono quelli scalati sui grammi scelti
              adesso, con quella stessa porzione scritta a fianco -- e' cosi'
              che un tasto rapido sa quanto vale un tocco.
            */}
            <button
              type="button"
              disabled={
                !grammiValidi || salvataggio || salvato === "fatto" || !scalato
              }
              onClick={() => {
                if (!scalato) return;
                startSalvataggio(async () => {
                  const esito = await addQuickFood({
                    name: scelto.marca
                      ? `${scelto.nome} (${scelto.marca})`
                      : scelto.nome,
                    portion: `${grammiTesto.trim()} g`,
                    kcal: scalato.kcal,
                    carbs: scalato.carbs,
                    protein: scalato.protein,
                    fat: scalato.fat,
                  });
                  setSalvato(esito.ok ? "fatto" : esito.error);
                });
              }}
              className="mt-3 min-h-11 w-full rounded-xl border border-dashed border-hairline text-[15px] font-medium text-accent tocco active:bg-raised disabled:opacity-40"
            >
              {salvato === "fatto"
                ? "Salvato fra i tasti rapidi ✓"
                : salvataggio
                  ? "Salvo…"
                  : "Salva fra i tasti rapidi"}
            </button>

            {typeof salvato === "string" &&
            salvato !== "no" &&
            salvato !== "fatto" ? (
              <p role="alert" className="mt-2 text-[13px] text-muted">
                {salvato}
              </p>
            ) : null}

            <div className="sticky bottom-0 -mx-5 mt-4 flex gap-2 bg-surface px-5 pt-3">
              <button
                type="button"
                onClick={chiudi}
                className="min-h-12 rounded-xl border border-hairline px-5 text-[15px] font-medium text-muted tocco active:bg-raised"
              >
                Chiudi
              </button>
              <button
                type="button"
                disabled={!grammiValidi}
                onClick={conferma}
                className="min-h-12 flex-1 rounded-xl bg-accent-solid text-[15px] font-semibold text-on-accent tocco active:opacity-80 disabled:opacity-40"
              >
                Aggiungi
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
