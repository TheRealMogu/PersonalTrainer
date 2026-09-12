# Personal Trainer

Webapp personale per tracciare i macro giornalieri e consultare il programma di
allenamento. Uso singolo, nessun login: i dati stanno su un database Neon
personale.

- **Diario** — barre di progresso per kcal / carboidrati / proteine / grassi,
  aggiunta pasti con tasti rapidi o form manuale, navigazione tra i giorni.
- **Piano** — target giornaliero, regole generali e integrazione.
- **Allenamento** — programma Team Schiavi, settimana T1 (3 giornate).
- **Storico** — media giornaliera e andamento dei macro su 7 o 30 giorni, con
  linea del target e vista tabellare.

Stack: Next.js (App Router) + TypeScript, Tailwind CSS, Drizzle ORM, Neon
(Postgres serverless). Deploy su Vercel, wrapping iOS con Capacitor.

> **[PRODOTTO.md](PRODOTTO.md)** — cosa deve essere questa app, come si misura
> la comodità d'uso, cosa manca e in che ordine. Da leggere prima di aggiungere
> funzionalità.

## Target giornalieri

| | |
|---|---|
| Calorie | 1905 kcal |
| Carboidrati | 220 g |
| Proteine | 155 g |
| Grassi | 45 g |

## 1. Collegare Neon

1. Crea un account su [neon.tech](https://neon.tech) e un nuovo progetto
   (piano free, regione europea per la latenza).
2. Nel progetto vai su **Connection Details** e copia la **Pooled connection**
   string. Ha questa forma:

   ```
   postgresql://utente:password@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

3. Copia il file di esempio e incolla la stringa:

   ```bash
   cp .env.example .env.local
   ```

   ```dotenv
   DATABASE_URL="postgresql://..."
   ```

`.env.local` è in `.gitignore`: la connection string non finisce mai nel repo.

## 2. Girare in locale

```bash
npm install
npm run db:migrate   # crea le tabelle su Neon
npm run db:seed      # carica tasti rapidi e programma di allenamento
npm run dev          # http://localhost:3000
```

Il seed è idempotente: svuota e ricarica `quick_foods`, `workout_days` e
`workout_exercises`. **Non tocca `meals`**, quindi si può rilanciare senza
perdere il diario.

### Script disponibili

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` / `npm start` | build e avvio in produzione |
| `npm test` | test della logica di calcolo (macro e date) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript senza emettere output |
| `npm run db:generate` | genera una migration dalle modifiche a `src/db/schema.ts` |
| `npm run db:migrate` | applica le migration in `drizzle/` |
| `npm run db:push` | sincronizza lo schema senza migration (solo in sviluppo) |
| `npm run db:studio` | Drizzle Studio per ispezionare i dati |
| `npm run db:seed` | carica i dati iniziali |

### Test

```bash
npm test
```

Coprono la logica pura: somma dei macro, calcolo di "quanto rimane" e dello
sforo, le utility sulle date (validazione, spostamento di giorno, fuso
italiano) e le aggregazioni dello storico (medie, giorni entro il target,
scala dei grafici). Girano con il test runner di Node, senza dipendenze
aggiuntive e senza toccare il database.

### Modificare i dati iniziali

Tasti rapidi e programma di allenamento stanno in `src/lib/seed-data.ts`.
Dopo una modifica basta rilanciare `npm run db:seed`.

Le linee guida del Piano stanno in `src/lib/plan.ts` e i target in
`src/lib/targets.ts` (contenuto statico, non serve il database).

## 3. Deploy su Vercel

1. Pusha il repo su GitHub.
2. Su [vercel.com](https://vercel.com) → **Add New → Project**, importa il repo.
   Vercel riconosce Next.js da solo, nessuna configurazione da cambiare.
3. In **Settings → Environment Variables** aggiungi `DATABASE_URL` con la
   stessa stringa di Neon, per gli ambienti *Production*, *Preview* e
   *Development*.
4. **Deploy**.

> Se il progetto Neon è collegato tramite l'integrazione Vercel–Neon, la
> variabile viene iniettata in automatico: verifica solo che il nome sia
> `DATABASE_URL`.

Le migration non girano da sole al deploy. Dopo aver cambiato lo schema:

```bash
npm run db:generate   # committa il file .sql generato
npm run db:migrate    # applicalo a Neon dalla tua macchina
```

## 4. Metterla sull'iPhone

Ci sono due strade, e **non sono equivalenti in costo**. Leggi entrambe prima
di scegliere.

### Strada A — Aggiungi a Home (subito, gratis, senza Mac)

L'app è già una PWA installabile. Dopo il deploy su Vercel:

1. Apri il sito con **Safari** sull'iPhone (non Chrome: solo Safari installa).
2. Tocca **Condividi** → **Aggiungi a Home**.
3. Conferma il nome.

Ottieni un'icona sulla Home che apre l'app **a tutto schermo**, senza barra
degli indirizzi, con la sua schermata di avvio. Da usare è indistinguibile da
un'app scaricata dallo Store.

Quello che serve è già nel repo: `src/app/manifest.ts` (`display: standalone`)
e `src/app/apple-icon.tsx`, che genera in build il PNG 180×180 che iOS vuole
per l'icona — iOS non accetta SVG per la Home.

Limiti da conoscere:

- **Serve connessione.** Le pagine sono renderizzate dal server, quindi senza
  rete l'app non si apre. Vale anche per la Strada B.
- Niente notifiche push né accesso a HealthKit.
- L'aggiornamento è automatico: dopo ogni deploy su Vercel l'app è aggiornata,
  non c'è niente da reinstallare.

### Strada B — App nativa con Capacitor (serve un Mac e 99 $/anno)

Ha senso solo se in futuro servono notifiche push, HealthKit o la
pubblicazione sull'App Store. Per il solo uso personale la Strada A basta.

Cosa serve prima di iniziare:

- un **Mac con Xcode** (i comandi `cap` per iOS non girano su Windows o Linux);
- un **account Apple Developer**, 99 $/anno, se vuoi tenere l'app installata
  oltre sette giorni: con un ID gratuito il certificato scade e l'app smette
  di aprirsi finché non la reinstalli;
- il **deploy su Vercel già fatto**, perché serve l'URL.

```bash
npm install @capacitor/core @capacitor/ios
npm install -D @capacitor/cli
```

In `capacitor.config.json` sostituisci l'URL con il dominio del tuo deploy.
Il `webDir` punta a `public/`, che deve esistere: nel repo c'è già.

```json
{
  "appId": "com.personaltrainer.app",
  "appName": "Personal Trainer",
  "webDir": "public",
  "server": { "url": "https://il-tuo-progetto.vercel.app", "cleartext": false },
  "ios": { "contentInset": "always" }
}
```

Poi, sul Mac:

```bash
npx cap add ios
npx cap sync ios
npx cap open ios     # apre Xcode
```

In Xcode: **Signing & Capabilities** → seleziona il tuo team, collega
l'iPhone, premi **Run**. L'icona dell'app si imposta da
`App/Assets.xcassets/AppIcon`.

L'app carica il sito remoto nella webview, quindi dopo ogni deploy su Vercel è
già aggiornata. `npx cap sync ios` serve solo se cambi configurazione o plugin
nativi.

> **Nota sullo stato di verifica:** la Strada A è stata verificata (manifest
> servito correttamente, icona PNG 180×180 generata, tag `apple-touch-icon` e
> `apple-mobile-web-app-*` presenti nell'HTML). La Strada B **non è stata
> eseguita**: richiede un Mac, che non era disponibile. I comandi sono quelli
> standard di Capacitor, ma vanno provati.

## Struttura

```
src/
  app/
    layout.tsx           shell, tab bar, meta per iOS
    page.tsx             Diario (?day=YYYY-MM-DD)
    piano/page.tsx       Piano
    allenamento/page.tsx Allenamento
    storico/page.tsx     Storico (?giorni=7|30)
    actions.ts           Server Actions: aggiungi / elimina pasto
    globals.css          tema Tailwind (palette, tipografia di sistema)
    manifest.ts          manifest PWA (installazione da Safari)
    apple-icon.tsx       icona 180x180 per la Home di iOS, generata in build
  components/
    diary.tsx            stato ottimistico del diario (riepilogo, pasti, aggiunta)
    undo-toast.tsx       annullamento di un'eliminazione
    ...                  resto della UI
  db/
    schema.ts            tabelle Drizzle
    index.ts             client Neon
  lib/
    targets.ts           target giornalieri
    nutrition.ts         somma macro e calcolo progresso
    date.ts              utility sulle date (YYYY-MM-DD)
    history.ts           intervalli, medie e scala dei grafici
    plan.ts              linee guida del PT
    seed-data.ts         tasti rapidi + programma di allenamento
    queries.ts           letture dal database
drizzle/                 migration SQL
scripts/seed.ts          script di seed
```

## Database

| Tabella | Contenuto |
|---|---|
| `meals` | pasti del diario (`day`, `name`, `kcal`, `carbs`, `protein`, `fat`) |
| `quick_foods` | cibi ricorrenti dei tasti rapidi |
| `workout_days` | giornate del programma |
| `workout_exercises` | esercizi con serie e ripetizioni |

`day` è una `DATE` pura: il diario è per data, senza complicazioni di fuso
orario.
