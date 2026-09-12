/** Linee guida del personal trainer (contenuto statico, non serve il DB). */

export type PlanSection = {
  title: string;
  items: string[];
};

export const PLAN_SECTIONS: PlanSection[] = [
  {
    title: "Regole generali",
    items: [
      "Pesare gli alimenti da crudi.",
      "Salare i pasti privi di sodio nativo.",
      "Spezie ed erbe aromatiche libere.",
      "Massimo 30 g di zuccheri al giorno.",
      "25-30 g di fibre al giorno.",
      "3 litri di acqua al giorno.",
      "10.000 passi al giorno.",
      "1 porzione di frutta al giorno (100-200 g).",
      "Verdura a pranzo e a cena.",
      "Variare le fonti proteiche.",
      "Limitare gli insaccati: preferire arrosto di tacchino/pollo e bresaola.",
      "Non eccedere con i latticini.",
    ],
  },
  {
    title: "Integrazione",
    items: [
      "1 multivitaminico dopo colazione.",
      "3 g di creatina monoidrata dopo colazione.",
      "1 g di vitamina C dopo colazione.",
    ],
  },
];
