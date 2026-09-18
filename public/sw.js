/**
 * Serve a un solo caso: aprire l'app da chiusa senza rete.
 *
 * Se l'app e' gia' aperta e la rete cade, funziona gia' senza questo file --
 * e' il caso normale in palestra, dove entri col segnale e lo perdi in sala
 * pesi. Qui manca solo l'apertura a freddo: senza rete, senza pagina gia'
 * caricata, oggi non parte affatto.
 *
 * Non mette in cache le pagine vere (diario, storico...): mostrerebbero
 * numeri vecchi come se fossero di oggi, che e' proprio quello che la regola
 * 6 vieta. L'unica cosa in cache e' una pagina statica che dice "sei
 * offline" -- mai un numero, mai un dato.
 *
 * Per lo stesso motivo intercetta solo le navigazioni (`mode: "navigate"`,
 * cioe' aprire un indirizzo, non una fetch di dati): le Server Action sono
 * POST con un altro `mode`, e passano dritte. Toccarle rischierebbe di far
 * sembrare riuscita una scrittura che non e' mai arrivata al server -- la
 * coda che gestisce quel caso e' gia' in `src/lib/pasti-in-attesa.ts` e non
 * deve avere interferenze da qui.
 */

const CACHE = "app-shell-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // Subito attivo: un'app per una persona sola non ha bisogno di
      // aspettare che tutte le schede si chiudano da sole.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(
      async () => (await caches.match(OFFLINE_URL)) ?? Response.error(),
    ),
  );
});
