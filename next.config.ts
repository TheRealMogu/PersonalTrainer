import type { NextConfig } from "next";
import "./scripts/load-env";

const nextConfig: NextConfig = {
  turbopack: {
    /*
     * La radice del progetto, dichiarata invece di lasciarla indovinare.
     *
     * Next la cerca risalendo le cartelle finche' non trova un lockfile: se
     * per caso ne esiste uno nella home (capita dopo un `npm install` lanciato
     * nel posto sbagliato), crede che la radice sia quella e avvisa a ogni
     * avvio.
     */
    root: __dirname,
  },

  /*
   * Da quali indirizzi il server di sviluppo accetta richieste.
   *
   * Serve per aprire l'app dal telefono sulla rete di casa: senza, Next
   * blocca il ricaricamento automatico e la pagina non si aggiorna piu' da
   * sola. L'indirizzo si mette in .env.local e non qui, perche' cambia da
   * casa a casa e la repo e' pubblica.
   *
   * Esempio: DEV_ORIGINS="192.168.1.22"
   */
  allowedDevOrigins: process.env.DEV_ORIGINS?.split(",")
    .map((origine) => origine.trim())
    .filter(Boolean),
};

export default nextConfig;
