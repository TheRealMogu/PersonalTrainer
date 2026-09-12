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

L'obiettivo è un'**app vera** (`.ipa`) installata sul telefono, non un
segnalibro. Ci sono tre modi, con costi molto diversi.

> **Nota importante, vale per tutti e tre:** l'app è un guscio nativo attorno
> al sito pubblicato. Le pagine sono renderizzate dal server (Server Components
> e Server Actions) e i dati stanno su Neon, quindi **serve comunque il deploy
> su Vercel e serve la rete**. Non esiste una versione completamente offline
> senza riscrivere l'architettura.

### Strada A — IPA compilato da GitHub, sideload (consigliata)

Nessun Mac, nessun account Apple Developer a pagamento.

**0. Imposta l'URL una volta sola.** Settings → *Secrets and variables* →
Actions → **New repository secret**, nome `APP_URL`, valore l'URL del deploy
Vercel. È un secret e non un campo digitato perché GitHub maschera i secret
nei log: l'app non ha login, quindi chi conosce l'indirizzo può scrivere nel
diario.

**1. Compila l'IPA.** Scheda **Actions** → *Compila IPA per iPhone* → **Run
workflow**. A fine esecuzione scarichi l'artifact `PersonalTrainer-ipa`.

La compilazione gira su un runner macOS di GitHub. **La repo è privata, quindi
i minuti macOS contano 10×**: una build da ~10 minuti ne consuma ~100 dei 2.000
gratuiti mensili, cioè una ventina di build al mese. In pratica bastano,
perché l'IPA si ricompila quasi mai (vedi punto 4).

> **Non rendere pubblica la repo per risparmiare minuti.** Su repo pubblica i
> minuti macOS sono gratis, ma diventano pubblici anche i log delle run e **gli
> artifact**: l'IPA è scaricabile da chiunque e contiene l'URL della tua app.
> Siccome l'app non ha autenticazione, chiunque potrebbe leggere e modificare
> il tuo diario. Il secret protegge i log, non l'artifact. Se un giorno vuoi la
> repo pubblica, prima serve un minimo di autenticazione sull'app.

**2. Installalo.** L'IPA non è firmato: lo firma il tuo Apple ID tramite uno
strumento di sideload, tipicamente **AltStore** o **SideStore**. Si installano
sul computer (o, per SideStore, funzionano anche senza restare collegati) e
firmano l'app col tuo ID gratuito.

**3. I 7 giorni.** Un certificato Apple gratuito **scade dopo 7 giorni**: dopo
di che l'app non si apre più finché non viene rifirmata. È il limite di Apple,
non nostro. Gli strumenti di sideload rinnovano la firma automaticamente
finché il telefono e il computer si vedono in rete — è esattamente il
"si riaggiorna ogni sette giorni". Con un account Apple Developer da 99 $/anno
il certificato dura un anno e il rinnovo non serve.

**4. Aggiornamenti dell'app.** Non serve ricompilare a ogni modifica: la
webview carica il sito pubblicato, quindi dopo ogni deploy su Vercel l'app è
già aggiornata. L'IPA si rifà solo se cambia la configurazione nativa.

### Strada B — Xcode su un Mac

Se hai un Mac, salti GitHub Actions e i suoi minuti:

```bash
npm ci
APP_URL="https://tuo-progetto.vercel.app" npx cap add ios
APP_URL="https://tuo-progetto.vercel.app" npx cap sync ios
npx cap open ios
```

In Xcode: **Signing & Capabilities** → scegli il tuo team (basta un Apple ID
gratuito), collega l'iPhone, premi **Run**. Valgono gli stessi 7 giorni.

L'icona dell'app si imposta da `App/Assets.xcassets/AppIcon`.

### Strada C — Aggiungi a Home (ripiego, zero strumenti)

Apri il sito con **Safari** → **Condividi** → **Aggiungi a Home**. Parte a
tutto schermo con la sua icona e non scade mai, ma non è un'app installata:
niente notifiche push, niente HealthKit, niente presenza nella libreria app.
Utile per provare subito, non è l'obiettivo.

Il necessario è già nel repo: `src/app/manifest.ts` e `src/app/apple-icon.tsx`
(iOS pretende un PNG 180×180 per la Home, non accetta SVG).

### Stato di verifica

Quello che è stato verificato davvero, e quello che no:

| | |
|---|---|
| `capacitor.config.ts` legge `APP_URL` e fallisce con un messaggio chiaro se manca | verificato |
| `npx cap add ios` genera il progetto e ci scrive dentro l'URL giusto | verificato |
| Il workflow è YAML valido e i suoi script bash sono sintatticamente corretti | verificato |
| Strada C: manifest servito, PNG 180×180 generato, tag Apple presenti | verificato |
| **Il workflow non è mai stato eseguito** | **da provare** |

L'ultima riga conta: `xcodebuild` gira solo su macOS, che qui non c'era. Il
workflow tiene conto del fatto che Capacitor 8 usa Swift Package Manager (c'è
un `.xcodeproj`, non un `.xcworkspace` da CocoaPods) e che lo schema Xcode non
è condiviso nel progetto generato, quindi ripiega sul target; stampa anche
schemi e target prima di compilare, così al primo errore si vede subito cosa
manca. Ma il primo giro potrebbe comunque richiedere un aggiustamento.

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
capacitor.config.ts      configurazione dell'app nativa (URL da APP_URL)
capacitor-www/           pagina mostrata se il server non risponde
.github/workflows/       pipeline che compila l'IPA su runner macOS
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
