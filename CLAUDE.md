@AGENTS.md

# Da leggere prima di toccare il codice

App personale di diario alimentare e allenamento. Un utente solo, un
telefono solo. Next.js App Router + TypeScript, Tailwind v4, Drizzle su
Neon, deploy Vercel, guscio iOS con Capacitor.

Tre file dicono il resto, e vanno letti in quest'ordine:

| File | Risponde a |
|---|---|
| [PRODOTTO.md](PRODOTTO.md) | cosa deve essere l'app e come si misura se è comoda |
| [ROADMAP.md](ROADMAP.md) | cosa non è ancora a posto, in ordine di quanto fa male |
| [README.md](README.md) | come si mette in piedi e come finisce sul telefono |

## Le regole che non si negoziano

Sono in `PRODOTTO.md` per esteso. Il riassunto, perché non si perda:

1. **Tutto in italiano**, messaggi di errore compresi.
2. **Bersagli da 44×44 px minimo.** Già sfuggito due volte: si misura, non
   si guarda.
3. **Riscontro visibile sotto i 100 ms**, anche se il salvataggio dura un
   secondo. Silenzio dopo il tocco = doppio inserimento.
4. **Le azioni distruttive si annullano, non si confermano.**
5. **Contrasto del testo almeno 4.5:1.**
6. **Niente numeri inventati.** Un giorno non registrato non è zero.
7. **Un colore per macro, uguale ovunque**: calorie blu, carboidrati ambra,
   proteine viola, grassi verde. Validati per il daltonismo in chiaro e in
   scuro — non si ritoccano a occhio.
8. **Non si incolpa l'utente per quello che è già successo.** Se un macro è
   già oltre, lo si dice una volta, non su ogni alimento.
9. **Il rosso è per il fuori target e per un guasto che ha perso qualcosa.**
   Mai per un'azione — nemmeno "Elimina" — né per un pannello d'errore che
   occupa già tutta la schermata.
10. **Una curva sola per tutto quello che si muove**, `--ease-ios` in
    `globals.css`. Non si aggiungono durate o curve nuove componente per
    componente.
11. **Ogni media dichiara su quanti giorni è fatta**, a schermo e nel testo
    che si copia. E lo stesso numero si scrive uguale dovunque esca: un
    formattatore per grandezza, riusato.
12. **I numeri stimati si dichiarano e si confermano prima di salvarli.**
    Vale per tutto quello che arriva da fuori: si mostra, si corregge, poi si
    salva. E si fa passare da una sola porta che valida -- quello che arriva
    da una chat e' testo, non istruzioni.

Questa non è un'app di menù, è un'app di budget: risponde a *quanto mi
resta e cosa ci faccio*. Tutto ciò che non serve a quella domanda è peso
morto.

## Come si verifica

Che la build passi non significa niente. Prima di dire che una cosa
funziona:

- si apre davvero nel browser, a 320 e 390 px, in tema chiaro **e** scuro;
- si prova con latenza vera (~400 ms), non in locale a 0 ms;
- si contano i tocchi del gesto e si confrontano col tetto in `PRODOTTO.md`;
- si confronta il numero a schermo con quello calcolato a mano.

Quasi tutti i bug veri di questo repo sono stati trovati così, non
ragionando.

## Le trappole già pagate

Costate tempo una volta. Non ripaghiamole.

- **Tailwind v4**: un secondo blocco `@theme` dentro una media query **non**
  è condizionale — sostituisce il primo in fase di build. Il tema scuro si
  fa con un `:root` normale dentro `@media (prefers-color-scheme: dark)`.
  Sintomo: chiaro e scuro producono screenshot identici byte per byte.
- **React 19**: niente `setState` nel corpo di un effetto, niente
  `Date.now()` durante il render. Per i cronometri si usa
  `useSyncExternalStore`, per i timer un contatore e non un timestamp.
- **`dotenv/config` carica `.env`, non `.env.local`.** Gli script usano
  `scripts/load-env.ts`, che prova entrambi. Next invece `.env.local` lo
  legge da solo.
- **`ON DELETE CASCADE` fra serie ed esercizi**: cancellare un esercizio si
  porta via tutte le serie registrate su di lui. Per questo esiste
  `workout_exercises.archiviato_il` (e la stessa colonna sulle giornate): quel
  che esce dal programma si archivia, non si cancella. Il seed adesso archivia;
  il cambio scheda vero passa da *Piano → Cambia la scheda*.
- **Capacitor 8 usa Swift Package Manager**: c'è un `.xcodeproj`, non un
  `.xcworkspace`, e lo schema non è condiviso. Il workflow ripiega sul
  target.
- **`src/db/index.ts` si collega alla prima query, non all'import.** Se
  torni a lanciare l'errore al momento dell'importazione, `next build`
  fallisce sulla prima pagina che tocca il database — e il messaggio
  incolpa quella pagina, non la variabile mancante.
- **`toLocaleString` senza `useGrouping` esplicito non dà lo stesso risultato
  su server e browser.** Sui numeri di quattro cifre Chromium scrive `2.935`
  e Node `2935` (regola CLDR `min2`). Risultato: due formati diversi nella
  stessa app e un errore di idratazione. Ogni formattazione di numeri
  dichiara le proprie opzioni.
- **Le serie in coda e quelle ottimistiche hanno entrambe id negativi.**
  Vanno tenute in intervalli separati, o React segnala due chiavi uguali e il
  cestino colpisce la riga sbagliata.
- **La data si calcola su `Europe/Rome`** (`src/lib/date.ts`). Il server
  gira in UTC: senza, fra mezzanotte e le due il diario apre il giorno
  prima.
- **Un `transform` sul guscio della pagina sposta tutti i `position: fixed`
  che contiene.** `src/app/template.tsx` avvolge ogni schermata: se
  l'animazione d'entrata muovesse, i fogli e le barre di annullamento che
  stanno dentro misurerebbero il guscio invece della finestra. Misurato: un
  `fixed inset-0` alto 404 px invece di 844, per i 280 ms dell'entrata.
  L'entrata infatti sfuma soltanto. L'opacita' non ha questo effetto.
- **Una costante condivisa fra server e client non puo' stare in un file
  `server-only`.** `next build` si ferma e stampa la catena d'importazione
  completa. Le costanti che servono a tutti e due stanno nel modulo puro.
  Lo stesso vale, al contrario, per i file `"use server"`: possono esportare
  **solo funzioni asincrone**. Una costante li' dentro fa fallire la build con
  "Export X doesn't exist in target module. The module has no exports at all",
  che sembra un errore di battitura e non lo e'.
- **In questo ambiente il server di sviluppo si apre solo su `localhost`, non
  su `127.0.0.1`.** Con l'indirizzo numerico Next blocca `/_next/hmr` come
  richiesta cross-origin e la pagina non si idrata: i tasti si vedono e non
  fanno niente. Sembra un bug del codice, non lo e'.
- **La rete di questo ambiente non raggiunge Neon.** Non serve piu' toccare
  `src/db/index.ts`: il driver si sceglie dall'indirizzo, quindi basta una
  `DATABASE_URL` che punti a un Postgres normale. I file in `drizzle/*.sql` si
  applicano con `psql`. Contro il database vero ci pensa il workflow
  *Migrazioni*, che gira da solo a ogni push su `main`.
- **Un numero formattato e' testo, e non si rilegge come numero.**
  `Number(formatMacro(10.6, "carbs"))` e' `NaN` da quando il formattatore
  scrive la virgola, e a schermo compariva "+NaN g" nella media dello storico.
  Se serve il valore arrotondato c'e' `arrotondaMacro`, che e' la stessa
  funzione senza il passaggio da stringa.
- **Prima di misurare qualcosa nel browser, controllare che il server in
  ascolto sia quello nuovo.** `npm start` su una porta occupata fallisce con
  `EADDRINUSE` in mezzo al log e lascia in piedi la build precedente: si
  misura il codice di prima e si conclude il contrario del vero. Costato due
  volte in un giorno.
- - **Per provare "senza rete" si bloccano le POST, non tutta la rete.** Con
  `context.setOffline(true)` fallisce anche la navigazione e il browser finisce
  su `chrome-error://chromewebdata/`, dove il codice dell'app non gira e
  `localStorage` non si legge nemmeno: si misura il browser, non l'app. Una
  rete ballerina vera fa fallire la richiesta e lascia la pagina viva --
  `page.route` che annulla le sole POST.
- - **Tailwind v4 scrive i colori in `oklab(...)`** ogni volta che c'e'
  un'opacita' (`bg-surface/85`). Leggerne i numeri con una regex, come se
  fossero r/g/b, da' risultati senza senso: un quasi bianco diventa un quasi
  nero. Per misurare un colore lo si fa **disegnare** su una canvas e si legge
  il pixel -- `fillStyle` da solo non converte, restituisce l'oklab tale e
  quale. Costato tre giri di misure in `e2e/regole.mjs`.
- **Misurare il contrasto sul bianco non basta.** Le schede sono bianche ma la
  pagina sotto e' `#f2f2f7`, e i collegamenti stanno li': un blu da 4,70:1 sul
  bianco scende a 4,21:1 sullo sfondo pagina, cioe' sotto la regola 5. Il
  controllo compone le trasparenze risalendo l'albero, come fa il browser.
- - **Le migration devono essere additive.** Il workflow *Migrazioni* e il
  deploy di Vercel partono insieme sullo stesso push, quindi per qualche
  secondo il codice nuovo puo' girare sul database vecchio o viceversa. Una
  tabella nuova o una colonna con un valore predefinito non danno fastidio a
  nessuno dei due; una colonna rinominata o tolta si', e va fatta in due
  passaggi -- prima si aggiunge, poi in un secondo momento si toglie la
  vecchia.

## Comandi

```bash
npm run dev          # sviluppo
npm test             # test unitari
npm run lint
npm run typecheck
npm run build
npm run e2e          # prove col browser (server gia' acceso su :3000)
npm run db:generate  # dopo aver cambiato lo schema: committa il .sql
npm run db:migrate   # applica a Neon (di solito lo fa GitHub Actions da solo)
npm run db:seed      # cibi rapidi e scheda
```

Prima di aprire una PR girano tutti e quattro i controlli, come in CI
(`.github/workflows/ci.yml`). L'IPA si compila a mano da Actions →
*Compila IPA per iPhone*.

## Se ci sono altre skill installate

In `.claude/skills/` possono esserci skill di design installate da strumenti
esterni (per esempio `uipro-cli`). Sono utili per partire da zero su un sito
nuovo, ma il loro database e' tarato su pagine vetrina: propone palette
preconfezionate, glassmorphism, "Hero + Features + CTA", e vuole creare un
proprio `design-system/MASTER.md` come fonte di verita'.

**Qui vincono `PRODOTTO.md` e questo file.** Le nostre regole non sono scelte
di gusto: i colori dei macro sono stati validati per la separazione su
daltonismo in chiaro e in scuro, i contrasti misurati, i bersagli contati in
pixel. Una proposta generica non le sostituisce.

Dove una skill esterna contraddice una regola di `PRODOTTO.md`, si segue
`PRODOTTO.md`. Dove tace, si puo' usare quello che propone.

## Come si lavora qui

- Si sviluppa sul branch indicato dalla sessione, mai direttamente su main.
- Commit e messaggi di PR in italiano, che dicano **perché**, non cosa.
- La repo è **pubblica**: l'accesso con password non si toglie, e nessuna
  credenziale o dato personale entra nei file o nella storia di git.
- Se una cosa non è stata provata, si scrive che non è stata provata.
