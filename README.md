# Personal Trainer

Webapp personale per tracciare i macro giornalieri e consultare il programma di
allenamento. Uso singolo, nessun login: i dati stanno su un database Neon
personale.

- **Diario** — barre di progresso per kcal / carboidrati / proteine / grassi,
  aggiunta pasti con tasti rapidi o form manuale, navigazione tra i giorni.
- **Piano** — target giornaliero, regole generali e integrazione.
- **Allenamento** — programma Team Schiavi, settimana T1 (3 giornate).
- **Storico** — media giornaliera e andamento dei macro su 7 o 30 giorni, con
  linea del target e vista tabellare, più la progressione del massimale
  stimato per ogni esercizio.

Stack: Next.js (App Router) + TypeScript, Tailwind CSS, Drizzle ORM, Neon
(Postgres serverless). Deploy su Vercel, wrapping iOS con Capacitor.

> **[PRODOTTO.md](PRODOTTO.md)** — cosa deve essere questa app e come si misura
> la comodità d'uso. Da leggere prima di aggiungere funzionalità.
>
> **[ROADMAP.md](ROADMAP.md)** — cosa non è ancora a posto, in ordine di
> quanto fa male: portarla sul telefono, non perdere i dati, gestire gli
> errori.

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
Lo leggono sia l'app sia gli script da riga di comando (`db:migrate`,
`db:seed`); in alternativa va bene anche un `.env`, ma `.env.local` ha la
precedenza.

## 2. Impostare l'accesso

L'app è protetta da una password: senza, chiunque conosca l'indirizzo
potrebbe leggere e modificare il diario. Servono due variabili:

```dotenv
APP_PASSWORD="la password che scegli tu"
AUTH_SECRET="il risultato di: openssl rand -base64 32"
```

`APP_PASSWORD` è quella che digiti nella schermata di accesso. `AUTH_SECRET`
firma il cookie di sessione: cambiandolo, tutte le sessioni aperte decadono.

> **`AUTH_SECRET` va riempita con l'output del comando, non col comando.**
> Si lancia `openssl rand -base64 32` e si incolla la riga che stampa (una cosa
> tipo `tK9v…=`). Scriverci dentro `openssl rand -base64 32` o
> `(openssl rand -base64 32)` fa partire l'app lo stesso — è una stringa valida
> — ma è una stringa **pubblica**, scritta in questo file: chiunque potrebbe
> firmarsi un cookie valido ed entrare senza sapere la password. In quel caso
> rigenerala e rifai il deploy.

La sessione dura un anno, quindi la password si inserisce una volta sola per
dispositivo. Per uscire: scheda **Piano** → *Esci*.

Senza `AUTH_SECRET` l'app non si apre affatto: meglio bloccarsi che restare
aperta per una variabile dimenticata.

## 3. Girare in locale

Serve **Node 20.9 o superiore** (Node 22 se vuoi usare anche i comandi
Capacitor in locale; per il solo sviluppo web non servono).

```bash
npm install
npm run db:migrate   # crea le tabelle su Neon
npm run db:seed      # carica tasti rapidi e programma di allenamento
npm run dev          # http://localhost:3000
```

Per aprirla dal telefono sulla stessa rete di casa, aggiungi in `.env.local`
l'indirizzo che `npm run dev` stampa accanto a **Network**:

```dotenv
DEV_ORIGINS="192.168.1.22"
```

Senza, Next blocca il ricaricamento automatico da indirizzi diversi da
`localhost` e la pagina non si aggiorna più da sola.

Il seed ricarica sempre i tasti rapidi. **Non tocca `meals`**, e se trova
serie di allenamento già registrate **lascia stare il programma**: gli
esercizi sono riferiti dalle serie con `ON DELETE CASCADE`, quindi rifarlo
cancellerebbe lo storico dei carichi. Per forzare comunque:

```bash
npm run db:seed -- --forza-allenamento
```

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

## 4. Deploy su Vercel

1. Pusha il repo su GitHub.
2. Su [vercel.com](https://vercel.com) → **Add New → Project**, importa il repo.
   Vercel riconosce Next.js da solo, nessuna configurazione da cambiare.
3. In **Settings → Environment Variables** aggiungi **tutte e tre** le
   variabili, spuntando *Production*, *Preview* e *Development* per ognuna:

   | Nome | Valore |
   |---|---|
   | `DATABASE_URL` | la stringa di connessione di Neon (la stessa del punto 1) |
   | `APP_PASSWORD` | la password con cui entri nell'app |
   | `AUTH_SECRET` | **l'output** di `openssl rand -base64 32`, non il comando |

4. **Deploy**.

Non è un passaggio facoltativo. Senza `DATABASE_URL` il deploy **fallisce in
compilazione**, non al primo accesso, e il messaggio parla di una pagina a caso:

```
Error: Failed to collect configuration for /allenamento
  [cause]: Error: DATABASE_URL non impostata.
```

Senza `APP_PASSWORD` o `AUTH_SECRET` la compilazione passa, ma il login
risponde con un errore: mancano solo a chi entra, non a chi compila.

Se cambi una variabile dopo il primo deploy, Vercel **non** ricompila da solo:
vai su **Deployments → ⋯ → Redeploy**.

> Se il progetto Neon è collegato tramite l'integrazione Vercel–Neon, la
> variabile viene iniettata in automatico: verifica solo che il nome sia
> `DATABASE_URL`.

Le migration non girano da sole al deploy. Dopo aver cambiato lo schema:

```bash
npm run db:generate   # committa il file .sql generato
npm run db:migrate    # applicalo a Neon dalla tua macchina
```

## 5. Metterla sull'iPhone

L'obiettivo è un'**app vera** (`.ipa`) installata sul telefono, non un
segnalibro. Ci sono tre modi, con costi molto diversi.

> **Nota importante, vale per tutti e tre:** l'app è un guscio nativo attorno
> al sito pubblicato. Le pagine sono renderizzate dal server (Server Components
> e Server Actions) e i dati stanno su Neon, quindi **serve comunque il deploy
> su Vercel e serve la rete**. Non esiste una versione completamente offline
> senza riscrivere l'architettura.

### Strada A — IPA compilato da GitHub, sideload (consigliata)

Nessun Mac, nessun account Apple Developer a pagamento.

**1. Compila l'IPA.** Scheda **Actions** → nella colonna di sinistra
*Compila IPA per iPhone* → pulsante **Run workflow** in alto a destra →
di nuovo **Run workflow** nel riquadro che si apre.

Nel campo puoi scrivere l'URL del deploy. **Puoi anche lasciarlo vuoto**: la
compilazione va avanti lo stesso e ottieni un'app installabile che mostra
"non riesco a raggiungere il server" finché non la ricompili con l'URL vero.
Serve a vedere subito che la pipeline funziona.

In alternativa l'URL si imposta una volta sola in Settings → *Secrets and
variables* → Actions → **New repository secret**, nome `APP_URL`.

A fine esecuzione (~10 minuti) scarichi l'artifact `PersonalTrainer-ipa` dal
fondo della pagina della run.

La compilazione gira su un runner macOS di GitHub, **gratis** perché la repo è
pubblica.

> **Perché la password conta, su repo pubblica.** L'artifact IPA è scaricabile
> da chiunque e contiene l'URL della tua app, scritto in `capacitor.config.json`
> dentro il bundle. Il secret nasconde l'URL dai log, non dall'artifact: è la
> schermata di accesso a impedire che chi trova l'indirizzo entri nel diario.
> Non togliere l'autenticazione finché la repo è pubblica.

**2. Installalo.** L'IPA non è firmato: lo firma il tuo Apple ID tramite uno
strumento di sideload. Quale, dipende dal computer che hai.

*Da Windows* — **[AltStore](https://altstore.io)** ufficiale, la strada più
semplice. Il rinnovo a 7 giorni avviene da solo finché telefono e computer
stanno sulla stessa rete Wi-Fi.

1. Installa **iTunes e iCloud scaricandoli da `apple.com`**, *non* dal
   Microsoft Store: le versioni dello Store non funzionano con AltServer, ed
   è il punto in cui si blocca la maggior parte delle persone.
2. Scarica **AltServer** da [altstore.io](https://altstore.io), estrai lo zip
   e lancia `setup.exe`.
3. Collega l'iPhone via USB e tocca **Autorizza** sul telefono.
4. Apri iTunes e attiva la **sincronizzazione Wi-Fi** per il dispositivo:
   serve al rinnovo automatico senza cavo.
5. Su iOS 16 o più recente, attiva **Impostazioni → Privacy e sicurezza →
   Modalità sviluppatore** (il telefono si riavvia).
6. Icona di AltServer nella barra di Windows → **Install AltStore** → scegli
   il dispositivo → Apple ID e password (vanno ai server Apple).
7. Sul telefono: **Impostazioni → Generali → VPN e gestione dispositivo** →
   il tuo profilo → **Autorizza**.
8. Per installare il nostro IPA: tieni premuto il tasto **Windows** mentre
   clicchi l'icona di AltServer, compare **"Sideload .ipa…"**.

*Da Mac* — stessa cosa, senza il passaggio 1: AltServer usa i componenti di
sistema già presenti.

*Da Linux* — AltStore ufficiale **non esiste**. Ci sono port della comunità
che funzionano ma sono più artigianali:

- **[Ez AltServer Linux](https://github.com/nab138/Ez-AltServer-Linux)** —
  involucro semplificato, la via più corta;
- **[AltServer-Linux](https://github.com/NyaMisty/AltServer-Linux)** — il
  port originale: `./AltServer -u UDID -a apple-id -p password app.ipa`;
- **[Legacy iOS Kit](https://github.com/LukeZGD/Legacy-iOS-Kit/wiki/Sideloading-on-Linux)**
  — `./restore.sh` → *Sideload IPA*, guidato.

In tutti i casi serve `usbmuxd` installato, il telefono collegato via USB e
"Autorizza questo computer" accettato sul telefono.

**2b. Autorizza il profilo.** Dopo l'installazione l'app non si apre finché
non vai in **Impostazioni → Generali → VPN e gestione dispositivo**, tocchi
il tuo profilo e scegli **Autorizza**. È il passaggio che tutti dimenticano.

**3. I 7 giorni.** Un certificato Apple gratuito **scade dopo 7 giorni**: dopo
di che l'app non si apre più finché non viene rifirmata. È il limite di Apple,
non nostro.

Da Windows o Mac, AltStore rinnova da solo finché telefono e computer si
vedono in rete — è il "si riaggiorna ogni sette giorni". Dai port Linux il
rinnovo è più probabilmente da rilanciare a mano. Con un account Apple
Developer da 99 $/anno il certificato dura un anno e il problema non si pone.

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
    login/               schermata di accesso
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
    workout.ts           volume, proposta del carico, durate
    meal-slots.ts        momenti della giornata e raggruppamento
    auth.ts              firma e verifica del cookie di sessione
    plan.ts              linee guida del PT
    seed-data.ts         tasti rapidi + programma di allenamento
    queries.ts           letture dal database
  proxy.ts               chiude ogni rotta a chi non ha sessione
assets/                  icona e splash da cui nascono quelle dell'app iOS
capacitor.config.ts      configurazione dell'app nativa (URL da APP_URL)
capacitor-www/           pagina mostrata se il server non risponde
.github/workflows/       pipeline che compila l'IPA su runner macOS
drizzle/                 migration SQL
scripts/seed.ts          script di seed
```

## Database

| Tabella | Contenuto |
|---|---|
| `meals` | pasti del diario (`day`, `slot`, `quantity`, `name`, macro) |
| `workout_sessions` | sedute di allenamento (`end_at` nullo = in corso) |
| `workout_sets` | serie eseguite: carico e ripetizioni |
| `quick_foods` | cibi ricorrenti dei tasti rapidi |
| `workout_days` | giornate del programma |
| `workout_exercises` | esercizi con serie e ripetizioni |

`day` è una `DATE` pura: il diario è per data, senza complicazioni di fuso
orario.

## Quando qualcosa non va

I due errori che si incontrano davvero, e cosa vogliono dire.

### «L'app non è configurata: manca…»

Le variabili non ci sono, oppure ci sono ma il deploy è più vecchio di loro.
Il proxy le legge quando l'app viene **compilata**, quindi dopo averle
aggiunte serve **Deployments → ⋯ → Redeploy**. Aggiungerle e ricaricare la
pagina non basta.

### «A server error occurred» con un codice numerico

È la pagina di errore di Vercel: l'app è partita, ma una query è fallita.
Il motivo quasi sempre è che **il database è indietro con le migration**:
il codice cerca colonne che su Neon non esistono ancora.

Sintomo tipico nei log: `column "slot" does not exist`.

Si ripara dalla propria macchina, non da Vercel:

```bash
npm run db:migrate
```

Il comando applica **tutte** le migration mancanti in un colpo solo: non serve
lanciarlo una volta per ognuna.

Le migration **non girano al deploy**, di proposito: applicare da sole
modifiche allo schema a ogni push è il modo più rapido per perdere dei dati.
Quindi ogni volta che cambia `src/db/schema.ts` va lanciato a mano.

Per vedere l'errore vero invece del codice: su Vercel, **Logs** del progetto,
oppure **Deployments → il deploy → Runtime Logs**.
