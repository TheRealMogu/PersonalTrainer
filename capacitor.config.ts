import type { CapacitorConfig } from "@capacitor/cli";

/**
 * L'app nativa e' un guscio attorno al sito gia' pubblicato: le pagine sono
 * renderizzate dal server (Server Components e Server Actions), quindi la
 * webview carica l'URL remoto invece di un bundle statico. Conseguenza da
 * tenere presente: serve comunque il deploy, e serve la rete.
 *
 * L'URL arriva da APP_URL in fase di build, cosi' non finisce nel repo e la
 * pipeline puo' compilare verso ambienti diversi.
 */
const appUrl = process.env.APP_URL;

if (!appUrl) {
  throw new Error(
    "APP_URL non impostata: serve l'URL pubblico dell'app (es. https://tuo-progetto.vercel.app).",
  );
}

const config: CapacitorConfig = {
  appId: "com.personaltrainer.app",
  appName: "Personal Trainer",
  // Cartella dedicata: contiene solo la pagina mostrata se il server non risponde.
  webDir: "capacitor-www",
  server: {
    url: appUrl,
    cleartext: false,
    // Se la webview non raggiunge il server, mostra la pagina locale
    // invece della schermata di errore di Safari.
    errorPath: "index.html",
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
