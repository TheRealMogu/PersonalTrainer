# Personal Trainer

Webapp personale per tracciare i macro giornalieri e consultare il programma di
allenamento. Uso singolo, nessun login: i dati stanno su un database Neon
personale.

- **Diario** — barre di progresso per kcal / carboidrati / proteine / grassi,
  aggiunta pasti con tasti rapidi o form manuale, navigazione tra i giorni.
- **Piano** — target giornaliero, regole generali e integrazione.
- **Allenamento** — programma Team Schiavi, settimana T1 (3 giornate).

Stack: Next.js (App Router) + TypeScript, Tailwind CSS, Drizzle ORM, Neon
(Postgres serverless). Deploy su Vercel, wrapping iOS con Capacitor.

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
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript senza emettere output |
| `npm run db:generate` | genera una migration dalle modifiche a `src/db/schema.ts` |
| `npm run db:migrate` | applica le migration in `drizzle/` |
| `npm run db:push` | sincronizza lo schema senza migration (solo in sviluppo) |
| `npm run db:studio` | Drizzle Studio per ispezionare i dati |
| `npm run db:seed` | carica i dati iniziali |

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

## 4. Wrappare con Capacitor per iOS

L'app usa Server Components e Server Actions, quindi ha bisogno di un server:
la strada più semplice è far puntare Capacitor al deploy Vercel, invece di
esportare un bundle statico. La webview mostra l'app remota e il risultato è
un'app installabile sull'iPhone.

Serve un Mac con Xcode.

```bash
npm install @capacitor/core @capacitor/ios
npm install -D @capacitor/cli
```

`capacitor.config.json` è già nel repo: sostituisci l'URL con il dominio del
tuo deploy Vercel.

```json
{
  "appId": "com.personaltrainer.app",
  "appName": "Personal Trainer",
  "webDir": "public",
  "server": {
    "url": "https://il-tuo-progetto.vercel.app",
    "cleartext": false
  },
  "ios": { "contentInset": "always" }
}
```

Poi:

```bash
npx cap add ios
npx cap sync ios
npx cap open ios     # apre Xcode
```

In Xcode seleziona il tuo team in **Signing & Capabilities**, collega
l'iPhone e premi **Run**. L'icona dell'app si imposta da
`App/Assets.xcassets/AppIcon`.

Dopo ogni deploy su Vercel l'app mobile è già aggiornata: la webview carica
la versione online, non serve ricompilare. Va rifatto `npx cap sync ios` solo
se cambi la configurazione o i plugin nativi.

> **Alternativa senza Xcode:** apri il sito su Safari e usa *Condividi →
> Aggiungi a Home*. L'app parte a tutto schermo grazie ai meta tag
> `apple-web-app` già presenti in `src/app/layout.tsx`.

## Struttura

```
src/
  app/
    layout.tsx           shell, tab bar, meta per iOS
    page.tsx             Diario (?day=YYYY-MM-DD)
    piano/page.tsx       Piano
    allenamento/page.tsx Allenamento
    actions.ts           Server Actions: aggiungi / elimina pasto
    globals.css          tema Tailwind (palette, tipografia di sistema)
  components/            componenti UI
  db/
    schema.ts            tabelle Drizzle
    index.ts             client Neon
  lib/
    targets.ts           target giornalieri
    nutrition.ts         somma macro e calcolo progresso
    date.ts              utility sulle date (YYYY-MM-DD)
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
