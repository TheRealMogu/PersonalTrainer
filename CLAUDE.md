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
- **Il seed cancella a cascata lo storico di allenamento.** Si rifiuta di
  partire se esistono serie registrate; `--forza-allenamento` per forzare.
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
- **La rete di questo ambiente non raggiunge Neon.** `db:migrate` e
  `db:seed` contro il database vero li lancia l'utente dalla sua macchina.
  Per provare in locale: Postgres normale e driver `pg`.

## Comandi

```bash
npm run dev          # sviluppo
npm test             # test unitari
npm run lint
npm run typecheck
npm run build
npm run db:generate  # dopo aver cambiato lo schema: committa il .sql
npm run db:migrate   # applica a Neon (dalla macchina dell'utente)
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
