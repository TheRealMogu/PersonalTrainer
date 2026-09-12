import type { MetadataRoute } from "next";

/**
 * Manifest per l'installazione da Safari ("Aggiungi a Home").
 * `display: standalone` toglie la barra degli indirizzi: l'app parte a tutto
 * schermo con la sua icona, senza passare dall'App Store.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personal Trainer",
    short_name: "Trainer",
    description: "Diario dei macro e programma di allenamento",
    lang: "it",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f5f7",
    theme_color: "#f5f5f7",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180", purpose: "any" },
    ],
  };
}
