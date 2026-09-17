/**
 * L'entrata di ogni schermata.
 *
 * `template.tsx` invece di `layout.tsx` perche' e' l'unico dei due che si
 * rimonta a ogni navigazione: dentro un layout l'animazione partirebbe una
 * volta sola, al primo caricamento, e il passaggio fra Diario e Allenamento
 * resterebbe uno scatto secco.
 *
 * Serve piu' sul web che sul telefono. Con l'app installata il passaggio fra
 * le schede e' istantaneo; da browser passa qualche decina di millisecondi in
 * cui la pagina vecchia e' ancora li', e senza niente che si muova sembra che
 * il tocco non sia stato preso.
 *
 * Solo una dissolvenza, senza spostamento: il perche' sta accanto ai
 * fotogrammi in `globals.css` -- un guscio animato in `transform` sposta
 * tutti i `position: fixed` che contiene, fogli e barre di annullamento
 * compresi. Chi ha chiesto meno movimento nelle impostazioni del telefono
 * non vede nemmeno questa, ci pensa la regola in fondo allo stesso file.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-comparsa">{children}</div>;
}
