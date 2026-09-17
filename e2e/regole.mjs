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
            `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 24)}" ${Math.round(r.width)}×${Math.round(r.height)}`,
          );
        }
      }
      return fuoriMisura;
    });
    controlla(
      piccoli.length === 0,
      `${dovunque}: bersagli ≥ 44px${piccoli.length ? ` — ${JSON.stringify(piccoli.slice(0, 3))}` : ""}`,
    );

    // --- contrasto del testo ---
    const scarsi = await page.evaluate(() => {
      /*
       * Un colore CSS qualunque, ridotto a r/g/b/alfa.
       *
       * La conversione la fa il browser con una canvas, non una regex. Con la
       * regex questo controllo si e' sbagliato: la barra dei tab ha lo sfondo
       * in `oklab(0.999994 ... / 0.85)`, cioe' quasi bianco, e leggere i primi
       * tre numeri come se fossero r/g/b dava quasi nero -- quindi contrasti
       * finti da 3,04:1 su testo che sta benissimo. Tailwind v4 usa `oklab`
       * ovunque ci sia una trasparenza, quindi il caso non e' raro: e' la
       * norma.
       */
      const tela = document.createElement("canvas");
      tela.width = 1;
      tela.height = 1;
      const pezzo = tela.getContext("2d", { willReadFrequently: true });
      const inRgb = (colore) => {
        // Si DISEGNA il colore e si legge il pixel: `fillStyle` da solo non
        // converte (restituisce l'oklab tale e quale), disegnare si', perche'
        // a quel punto il browser deve produrre dei pixel veri.
        pezzo.clearRect(0, 0, 1, 1);
        pezzo.fillStyle = colore;
        pezzo.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = pezzo.getImageData(0, 0, 1, 1).data;
        return { r, g, b, a: a / 255 };
      };

      const luminanza = (colore) => {
        const c = typeof colore === "string" ? inRgb(colore) : colore;
        if (!c) return null;
        const f = (v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
      };

      /*
       * Lo sfondo vero sotto un testo, componendo le trasparenze.
       *
       * Prendere il primo sfondo non trasparente e' sbagliato: `bg-accent/10`
       * ha alfa 0,1 e trattarlo come tinta piena dava contrasti finti da
       * 1,23:1 su testo che a occhio si legge benissimo. Si risale l'albero
       * accumulando, come fa il browser.
       */
      const sfondoDi = (el) => {
        const strati = [];
        let nodo = el;
        while (nodo) {
          const c = inRgb(getComputedStyle(nodo).backgroundColor);
          if (c) {
            if (c.a > 0) strati.push(c);
            if (c.a === 1) break;
          }
          nodo = nodo.parentElement;
        }
        // Dal fondo verso l'alto: l'ultimo strato trovato e' il piu' lontano.
        let sotto = strati.pop() ?? { r: 255, g: 255, b: 255, a: 1 };
        while (strati.length > 0) {
          const sopra = strati.pop();
          sotto = {
            r: sopra.r * sopra.a + sotto.r * (1 - sopra.a),
            g: sopra.g * sopra.a + sotto.g * (1 - sopra.a),
            b: sopra.b * sopra.a + sotto.b * (1 - sopra.a),
            a: 1,
          };
        }
        return sotto;
      };

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

        const l1 = luminanza(stile.color);
        const l2 = luminanza(sfondoDi(el));
        if (l1 === null || l2 === null) continue;
        const rapporto =
          (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

        /*
         * 4,5:1 per il testo. 3:1 per il testo grande (lo dice la WCAG) e per
         * i segni decorativi con `aria-hidden`: una freccia "›" non e' testo
         * da leggere ma un elemento d'interfaccia, e li' il minimo e' 3:1
         * (WCAG 1.4.11). Distinguerli serve: senza, il controllo chiedeva a
         * una freccina lo stesso contrasto di un paragrafo.
         */
        const grande =
          parseFloat(stile.fontSize) >= 24 ||
          (parseFloat(stile.fontSize) >= 18.66 &&
            Number(stile.fontWeight) >= 700);
        const decorativo = el.closest("[aria-hidden='true']") !== null;
        const tetto = grande || decorativo ? 3 : 4.5;

        if (rapporto < tetto) {
          bassi.push(`"${testo.slice(0, 24)}" ${rapporto.toFixed(2)}:1`);
        }
      }
      return bassi;
    });
    controlla(
      scarsi.length === 0,
      `${dovunque}: contrasto del testo${scarsi.length ? ` — ${JSON.stringify(scarsi.slice(0, 3))}` : ""}`,
    );

    // --- niente scorrimento orizzontale ---
    const trabocca = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    controlla(!trabocca, `${dovunque}: niente scorrimento orizzontale`);

    // --- i numeri si scrivono all'italiana ---
    const conPunto = await page.evaluate(
      (sorgente) => {
        const punto = new RegExp(sorgente);
        return [...document.querySelectorAll('[class*="tabular-nums"]')]
          .map((el) => el.innerText ?? "")
          .filter((t) => punto.test(t));
      },
      PUNTO_DECIMALE.source,
    );
    controlla(
      conPunto.length === 0,
      `${dovunque}: numeri con la virgola${conPunto.length ? ` — ${JSON.stringify(conPunto.slice(0, 3))}` : ""}`,
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
