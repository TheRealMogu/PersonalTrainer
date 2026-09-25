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

  /*
   * Intestazioni di base contro due classi di attacco che non c'entrano con
   * la password: incorporare l'app in un iframe altrui (clickjacking) e far
   * eseguire al browser un file come se fosse un altro tipo (sniffing del
   * MIME). Niente Content-Security-Policy qui: ne serve una scritta apposta
   * per questo repo, non presa a scatola chiusa -- rischia di rompere script
   * o stili legittimi invece di fermare quelli finti.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
