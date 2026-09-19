"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

/**
 * La versione del guscio nativo installato sul telefono, non quella del sito.
 *
 * L'app è una webview che carica il deploy remoto (vedi `capacitor.config.ts`):
 * il contenuto che vedi è sempre l'ultimo pubblicato, a prescindere da quale
 * IPA hai installato. La domanda a cui questa riga risponde è un'altra —
 * "quale build ho sul telefono" — e quella la sa solo il guscio nativo,
 * letta con `@capacitor/app`. Fuori dall'app (nel browser) non c'è niente
 * da dire: un numero di versione del sito non risponderebbe alla stessa
 * domanda, e mostrarlo lì sarebbe rispondere a una domanda che nessuno ha
 * fatto (regola 6, per estensione: niente numeri che non significano nulla
 * per chi li legge).
 */
export function Versione() {
  const [info, setInfo] = useState<{
    version: string;
    build: string;
  } | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    App.getInfo()
      .then((esito) => setInfo({ version: esito.version, build: esito.build }))
      .catch(() => {
        // Se il plugin non risponde non c'è un errore da mostrare: la riga
        // resta assente, come fuori dall'app.
      });
  }, []);

  if (!info) return null;

  return (
    <p className="mt-3 text-[13px] text-muted">
      Versione {info.version} (build {info.build})
    </p>
  );
}
