import type { MetadataRoute } from "next";

/**
 * Fuori dai motori di ricerca. E' un'app a un utente solo, dietro password:
 * indicizzarla non aiuta nessuno e la rende solo piu' facile da trovare per
 * chi la password non ce l'ha.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
