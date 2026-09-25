/**
 * Le regole di PRODOTTO.md che si possono contare in pixel, controllate
 * aprendo l'app davvero.
 *
 * Non sostituiscono i test unitari: quelli dicono se un calcolo e' giusto,
 * questi dicono se la cosa giusta arriva a schermo. Sono due domande diverse,
 * e la seconda e' quella che ha trovato quasi tutti i bug veri di questo repo
 * -- il tasto alto 38 px, il foglio che misurava il guscio invece della
 * finestra, i due formati di numero nella stessa app.
 */
import { chromium } from "playwright";
import { SORGENTE_COLORI } from "./colori.mjs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.APP_PASSWORD;
const ESEGUIBILE = process.env.E2E_CHROMIUM;

if (!PASSWORD) {
  console.error("Manca APP_PASSWORD: le prove non possono entrare nell'app.");
  process.exit(1);
}

const esiti = [];
const controlla = (condizione, messaggio) =>
  esiti.push([condizione ? "ok  " : "ROTTO", messaggio]);

/** Le schermate da controllare, con quello che serve per aprirle. */
const SCHERMATE = [
  { nome: "diario", url: "/" },
  { nome: "piano", url: "/piano" },
  { nome: "storico", url: "/storico" },
  { nome: "allenamento", url: "/allenamento" },
  { nome: "alimenti", url: "/alimenti" },
  { nome: "obiettivi", url: "/obiettivi" },
  { nome: "integratori", url: "/integratori" },
  { nome: "scheda", url: "/scheda" },
  { nome: "fitbit", url: "/fitbit" },
];

const MISURE = [
  { larghezza: 320, scuro: false },
  { larghezza: 390, scuro: false },
  { larghezza: 390, scuro: true },
];

/*
 * Un punto DECIMALE, che in italiano non ci va. Non quello delle migliaia:
 * "2.000 kg" e' scritto giusto, ed e' proprio cosi' che questo controllo si e'
 * sbagliato la prima volta. La differenza sono le cifre dopo il punto: tre e
 * poi basta sono migliaia, una o due sono un decimale all'inglese.
 */
const PUNTO_DECIMALE = /\d\.\d{1,2}(?!\d)/;

const browser = await chromium.launch(
  ESEGUIBILE ? { executablePath: ESEGUIBILE } : {},
);

for (const { larghezza, scuro } of MISURE) {
  const dove = `${larghezza}px ${scuro ? "scuro" : "chiaro"}`;
  const ctx = await browser.newContext({
    viewport: { width: larghezza, height: 844 },
    colorScheme: scuro ? "dark" : "light",
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`);
  await page.fill('input[type="password"]', PASSWORD);
  await page.getByRole("button", { name: /entra/i }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 30_000 });

  for (const schermata of SCHERMATE) {
    await page.goto(`${BASE}${schermata.url}`);
    await page.waitForLoadState("networkidle");
    const dovunque = `${dove} · ${schermata.nome}`;

    // --- la pagina si e' aperta davvero, non e' un pannello d'errore ---
    const corpo = await page.locator("main").innerText();
    controlla(
      !/non sono riuscito a|DATABASE_URL/i.test(corpo),
      `${dovunque}: la pagina si apre`,
    );

    // --- bersagli da 44 px ---
    const piccoli = await page.evaluate(() => {
      const fuoriMisura = [];
      for (const el of document.querySelectorAll(
        "button, a[href], input, select, textarea, [role='button']",
      )) {
        const r = el.getBoundingClientRect();
        // Gli elementi nascosti non sono bersagli: hanno area zero.
        if (r.width === 0 || r.height === 0) continue;
        if (getComputedStyle(el).visibility === "hidden") continue;
        if (r.height < 44 || r.width < 44) {
          fuoriMisura.push(
            `${el.tagName.toLowerCase()} "${(el.textContent ?? "")
              .trim()
              .slice(0, 24)}" ${Math.round(r.width)}×${Math.round(r.height)}`,
          );
        }
      }
      return fuoriMisura;
    });
    controlla(
      piccoli.length === 0,
      `${dovunque}: bersagli ≥ 44px${
        piccoli.length ? ` — ${JSON.stringify(piccoli.slice(0, 3))}` : ""
      }`,
    );

    // --- contrasto del testo ---
    /*
     * Il preludio dei colori arriva da `colori.mjs`: una copia sola, perche'
     * riscrivere la conversione a mano ha gia' prodotto due volte lo stesso
     * errore -- `oklab(...)` letto con una regex da' risultati senza senso.
     */
    const scarsi = await page.evaluate(`(() => {
      ${SORGENTE_COLORI}

      const bassi = [];
      for (const el of document.querySelectorAll(
        "p, span, h1, h2, h3, li, button, a, dt, dd, label",
      )) {
        const testo = (el.textContent ?? "").trim();
        if (!testo) continue;
        // Solo chi il testo lo disegna davvero: un contenitore lo eredita dai
        // figli e lo conterebbe due volte.
        const haTestoProprio = [...el.childNodes].some(
          (n) => n.nodeType === 3 && (n.textContent ?? "").trim(),
        );
        if (!haTestoProprio) continue;

        const stile = getComputedStyle(el);
        if (stile.visibility === "hidden" || stile.opacity === "0") continue;
        // Testo trasparente: e' un segnaposto che tiene il posto, non si vede
        // e non ha un contrasto da misurare.
        const colore = inRgb(stile.color);
        if (!colore || colore.a === 0) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        /*
         * Il testo per chi non vede (\`.sr-only\`) non e' zero pixel: Tailwind
         * lo fa con \`width:1px;height:1px;clip:rect(0,0,0,0)\`, non con
         * display:none. Misurargli il contrasto ha prodotto un falso allarme
         * sulla heatmap del mese -- il testo descrittivo nascosto dentro ogni
         * casella, letto come se fosse il numero visibile.
         */
        if (r.width <= 1 && r.height <= 1) continue;

        const rapporto = contrasto(colore, sfondoDi(el));

        /*
         * 4,5:1 per il testo. 3:1 per il testo grande (lo dice la WCAG) e per
         * i segni decorativi con \`aria-hidden\`: una freccia non e' testo da
         * leggere ma un elemento d'interfaccia, e li' il minimo e' 3:1
         * (WCAG 1.4.11).
         */
        const grande =
          parseFloat(stile.fontSize) >= 24 ||
          (parseFloat(stile.fontSize) >= 18.66 &&
            Number(stile.fontWeight) >= 700);
        const decorativo = el.closest("[aria-hidden='true']") !== null;
        const tetto = grande || decorativo ? 3 : 4.5;

        if (rapporto < tetto) {
          bassi.push(\`"\${testo.slice(0, 24)}" \${rapporto.toFixed(2)}:1\`);
        }
      }
      return bassi;
    })()`);

    controlla(
      scarsi.length === 0,
      `${dovunque}: contrasto del testo${
        scarsi.length ? ` — ${JSON.stringify(scarsi.slice(0, 3))}` : ""
      }`,
    );

    // --- niente NaN, mai ---
    const naN = await page.evaluate(() =>
      [...document.querySelectorAll("p, span, h1, h2, h3, li, button, dd")]
        .map((el) => el.textContent ?? "")
        .filter((t) => /\bNaN\b|\bundefined\b|\[object Object\]/.test(t))
        .slice(0, 3),
    );
    /*
     * Sembra ovvio, e invece e' servito: il giorno in cui il formattatore ha
     * cominciato a scrivere la virgola, un `Number("10,6")` e' diventato NaN
     * e la media dello storico mostrava "+NaN g". Nessun altro controllo lo
     * avrebbe visto -- "NaN" non ha punti decimali, non e' un colore e non e'
     * un bersaglio.
     */
    controlla(
      naN.length === 0,
      `${dovunque}: niente NaN a schermo${
        naN.length ? ` — ${JSON.stringify(naN)}` : ""
      }`,
    );

    // --- niente scorrimento orizzontale ---
    const trabocca = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    controlla(!trabocca, `${dovunque}: niente scorrimento orizzontale`);

    // --- i numeri si scrivono all'italiana ---
    const conPunto = await page.evaluate((sorgente) => {
      const punto = new RegExp(sorgente);
      return [...document.querySelectorAll('[class*="tabular-nums"]')]
        .map((el) => el.innerText ?? "")
        .filter((t) => punto.test(t));
    }, PUNTO_DECIMALE.source);
    controlla(
      conPunto.length === 0,
      `${dovunque}: numeri con la virgola${
        conPunto.length ? ` — ${JSON.stringify(conPunto.slice(0, 3))}` : ""
      }`,
    );
  }

  await ctx.close();
}

await browser.close();

for (const [stato, messaggio] of esiti) console.log(`${stato} ${messaggio}`);
const rotti = esiti.filter(([stato]) => stato === "ROTTO");
console.log(
  rotti.length === 0
    ? `\n${esiti.length} controlli, tutto a posto.`
    : `\n${rotti.length} controlli falliti su ${esiti.length}.`,
);
process.exit(rotti.length === 0 ? 0 : 1);
