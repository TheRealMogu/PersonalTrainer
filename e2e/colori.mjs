/**
 * Leggere un colore CSS davvero, dentro al browser.
 *
 * Sta in un file suo perche' questo errore l'ho fatto due volte in un
 * pomeriggio: Tailwind v4 scrive `oklab(...)` ogni volta che c'e' un'opacita'
 * (`bg-over/70`), e leggerne i numeri con una regex da' risultati senza senso
 * -- un rosso diventa "non rosso", un quasi bianco diventa un quasi nero.
 *
 * La conversione la fa il browser: si **disegna** il colore su una canvas e si
 * legge il pixel. `fillStyle` da solo non basta, restituisce l'oklab tale e
 * quale; disegnare si', perche' a quel punto deve produrre pixel veri.
 *
 * Queste funzioni girano dentro `page.evaluate`, quindi sono sorgenti da
 * iniettare e non moduli da importare: si passano come stringa.
 */

/** Il preludio da incollare dentro un `page.evaluate`. */
export const SORGENTE_COLORI = `
  const tela = document.createElement("canvas");
  tela.width = 1;
  tela.height = 1;
  const pennello = tela.getContext("2d", { willReadFrequently: true });
  const inRgb = (colore) => {
    pennello.clearRect(0, 0, 1, 1);
    pennello.fillStyle = colore;
    pennello.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = pennello.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  const luminanza = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const contrasto = (a, b) => {
    const l1 = luminanza(a);
    const l2 = luminanza(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  /* Lo sfondo vero sotto un elemento, componendo le trasparenze come fa il
     browser: prendere il primo sfondo non trasparente darebbe contrasti
     finti su qualunque cosa abbia un'opacita'. */
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
`;
