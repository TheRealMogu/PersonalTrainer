# Roadmap

Cosa manca perché questa sia un'applicazione seria e non un prototipo che
funziona finché non lo tocchi. Ordinato per quanto fa male se non c'è.

`PRODOTTO.md` dice *cosa deve essere* l'app e come si misura. Questo file
dice *cosa non è ancora a posto*.

---

## Stato onesto, oggi

**Funziona**: diario con anello e macro, pasti per momento della giornata,
quantità variabili, correzione dei pasti, sessione di allenamento con carichi
e recupero, storico con progressione, accesso con password, tema chiaro e
scuro.

**Eseguito una volta**: la compilazione dell'IPA è andata a buon fine al primo
tentativo (run #1, 1m 32s, artifact da 352 KB). I log confermano che Capacitor
è compilato dentro e che la validazione Apple è passata. **Non è ancora stato
installato su un telefono**, quindi non sappiamo se si apre.

**Non è mai stato verificato su un telefono vero**: tutte le prove sono in
Chromium con viewport da iPhone. Safari non è Chromium.

**Il primo deploy ha trovato due cose**, entrambe sistemate: la build si
fermava se mancava una variabile d'ambiente, e quando il database era
indietro con le migration l'app rispondeva con un codice numerico e basta.
Adesso dice cosa fare.

**Il diario alimentare non viene usato.** È il problema più grave che abbia
l'app, ed è stato detto a voce prima che i numeri lo confermassero: aggiungere
un cibo costa 882 px di scorrimento su una giornata piena, e a fine giornata 7
tasti rapidi su 12 sono marchiati di rosso. La parte allenamento invece viene
usata e piace. Il piano è la sezione 6-ter, e la metrica per sapere se ha
funzionato è già nello Storico: giorni registrati su giorni conclusi.

**Quanto siano buone le stime che torna Claude non lo sappiamo**: dipende da
come è scritta la frase, e si scopre usandolo. Quello che l'app fa per non
farsi fregare è dichiararle come stime, mostrarle riga per riga prima di
salvare, e segnalare quando le calorie non tornano con i macro. La lettura dei
formati è coperta da test.

**Una revisione guardando le schermate una per una** ne ha trovate altre due,
anche queste sistemate: lo Storico faceva la media contando anche oggi, che è
un giorno a metà, e quindi mentiva tutti i giorni fino a mezzanotte; e i
grafici erano attaccati fra loro perché `space-y` non arriva su figli con
`m-0`. La seconda si vedeva a occhio da settimane e nessuno l'aveva misurata.

---

## 1. Portarla davvero sul telefono

Finché l'app vive solo sul computer, tutto il resto è teoria.

- [x] **Compilare il primo IPA.** Fatto: run #1 verde. Actions → *Compila IPA per iPhone* → Run
      workflow. Non serve più il deploy: senza URL compila lo stesso e
      mostra la pagina di errore, ma l'app finisce sul telefono.
- [x] **Deploy su Vercel** e rilancio con l'URL, così l'app funziona davvero.
      Fatto: l'app è in produzione e viene usata tutti i giorni — confermato
      dall'utente stesso mentre segnalava e poi verificava la correzione di
      Open Food Facts direttamente lì, non solo su questo ambiente. Non
      verificato da qui (questo ambiente non raggiunge Vercel né Neon), ma
      non c'è dubbio: è la stessa build che ha appena trovato il guasto di
      Search-a-licious e poi confermato che "funziona da dio".
- [ ] **Provarla in Safari**, non in Chromium: tastiera che copre i campi,
      rimbalzo dello scroll, `env(safe-area-inset-*)` sui modelli con notch.
      È il collaudo che manca del tutto.
- [ ] **Sideload e rinnovo a 7 giorni.** Da Linux servono i port della
      comunità (AltServer-Linux, Legacy iOS Kit): funzionano ma non sono mai
      stati provati su questo progetto, e il rinnovo automatico potrebbe non
      esserci. Da valutare se un Windows/Mac occasionale conviene.

## 2. Non perdere i dati

Oggi il database non ha rete di sicurezza. Per un diario che accumula mesi di
storia è la lacuna più grave dopo il punto 1.

- [x] **Backup automatico.** Verificato: sul piano gratuito Neon tiene solo
      **6 ore** di storia per il ripristino a un istante preciso, non giorni
      — troppo poco per un diario che accumula mesi. Fatto un backup vero e
      indipendente: il workflow *Backup* fa un `pg_dump` ogni notte, lo
      cifra con una frase segreta (`gpg --symmetric`, AES256) e lo tiene come
      allegato del workflow per 35 giorni. Cifrato perché la repo è pubblica:
      un allegato di workflow lo scarica chiunque, e dentro ci sono pasti e
      peso di una persona sola. Come *Migrazioni*, gira solo su schedule e a
      mano, mai su pull_request — non eredita mai i segreti di una PR
      esterna. Documentato in README come impostare `BACKUP_PASSPHRASE` e
      come ripristinare.

      Provato per davvero: dump del database locale, cifrato e decifrato di
      nuovo — il file che esce è identico byte per byte a quello originale.
      Il workflow in sé non è stato ancora visto girare su GitHub: serve il
      segreto `BACKUP_PASSPHRASE`, che tocca a te aggiungere.
- [x] **Export dei dati.** Fatto. Piano → *I tuoi dati*: copia completa in
      JSON, oppure pasti e allenamenti in CSV che si aprono in Excel. Il CSV
      esce con BOM e CRLF, altrimenti Excel rompe le accentate. Provato
      scaricando davvero i tre file. Da verificare dentro l'app iOS: WKWebView
      tratta i download a modo suo.
- [x] **Migration di rollback.** Drizzle non genera rollback automatici, e
      inventarne uno finto sarebbe peggio di non averlo. Scritta invece la
      procedura per riparare a mano senza indovinare (`CLAUDE.md` → *Se una
      migration fallisce a metà*): come vedere cosa Drizzle crede applicato,
      come distinguere una migration che non ha toccato niente da una che
      ha lasciato qualcosa a metà, e la regola che non cambia mai -- una
      migration già unita su `main` non si modifica più, si corregge in
      avanti. Non verificato contro Neon (rete non raggiungibile da questo
      ambiente): il comportamento transazionale di Drizzle per singolo file
      è quello dichiarato dalla sua documentazione, non misurato qui.

## 3. Cosa succede quando qualcosa va storto

L'app presuppone che tutto vada bene. Non è vero.

- [x] **Pagina di errore.** Fatto. Le tre schermate che leggono il database
      ora intercettano l'errore e dicono in italiano cosa è successo, con
      "Riprova". Distinguono tre casi: database indietro con le migration
      (e mostrano il comando), database irraggiungibile, variabile non
      impostata. La diagnosi si fa sul server perché in produzione Next
      nasconde il messaggio al browser e lascia solo un codice. C'è anche un
      `error.tsx` come rete di sicurezza per tutto il resto.
- [x] **Stato di caricamento.** Fatto: `loading.tsx` con uno scheletro delle
      stesse misure delle schede vere, così quando arrivano i dati non salta
      niente.
- [x] **Ritentare le scritture fallite — serie di allenamento.** Fatto. Una
      serie registrata senza rete resta sul telefono, si vede a schermo
      marcata "da mandare" e riparte da sola quando la rete torna. Il
      riprova è sicuro: ogni serie porta un identificativo generato dal
      telefono, quindi se era già arrivata non se ne scrive una seconda.
- [x] **Ritentare le scritture fallite — pasti.** Fatto: stesso meccanismo
      delle serie. Il pasto resta sul telefono, si vede in lista e conta nei
      totali, e riparte da solo quando la rete torna o alla prima riapertura.

      Vale per tutte e tre le strade: tasto rapido, *Come ieri* e *Incolla da
      Claude*. Quest'ultima era il buco peggiore — un incolla di quattro
      alimenti perso è peggio di un pasto solo.

      La riga a schermo dice «aspetta la rete», non «errore»: un pasto in coda
      non è perso, e chiamarlo guasto farebbe riscriverlo a mano. Allora sì
      che finirebbe in doppia copia.

      Il doppione vero lo impedisce la colonna `client_id` con indice unico
      (migrazione `0009`, additiva): se la rete cade *dopo* che il server ha
      scritto ma prima che la risposta torni, il secondo tentativo arriva con
      lo stesso identificativo e non scrive niente. Verificato sul database:
      l'inserimento duplicato viene rifiutato.
- [ ] **Aprirsi senza rete.** Il service worker che mancava c'è
      (`public/sw.js`): tiene in cache solo una pagina statica ("Sei
      offline", `/offline`), mai le pagine vere -- mostrare numeri vecchi
      come se fossero di oggi violerebbe la regola 6. Intercetta solo le
      navigazioni (`mode: "navigate"`), mai le Server Action: toccarle
      rischierebbe di far sembrare riuscita una scrittura mai arrivata al
      server, e quel caso lo gestisce già `pasti-in-attesa.ts` per conto suo.

      **Non è stato possibile verificarlo davvero nel browser di questo
      ambiente.** La sua logica interna è confermata -- con la console del
      service worker strumentata si vede che intercetta la richiesta, la
      rete fallisce, e recupera la pagina giusta dalla cache con stato 200
      -- ma sia spegnendo il server vero sia con `context.setOffline(true)`
      di Playwright, la navigazione del browser (Chromium headless in
      sandbox) finisce comunque in `net::ERR_FAILED` invece di mostrare
      quella risposta: un limite di questo ambiente di prova, non un difetto
      del codice confermato, ma nemmeno una prova che manca. Resta da
      provare su un telefono vero prima di segnarla fatta.

## 4. Qualità che non si vede ma si sente

- [x] **Il sito un po' più difficile da infastidire.** Prima un tentativo di
      password sbagliato costava solo 600ms di attesa fissa — rallentava,
      non fermava mai chi ne provasse a raffica. Fatto: dopo 8 tentativi
      sbagliati nello stesso quarto d'ora, quell'indirizzo resta bloccato per
      15 minuti, password giusta compresa — una riga per IP
      (`login_tentativi`, migrazione additiva) che si azzera da sola quando
      la finestra passa, senza un lavoro a parte che la ripulisca. Aggiunti
      anche `robots.txt` e il tag `noindex` (un'app a un utente solo dietro
      password non ha ragione di finire su Google) e tre intestazioni di
      sicurezza di base (anti-clickjacking, anti-sniffing del MIME,
      referrer). Niente Content-Security-Policy: ne servirebbe una scritta
      apposta per questo repo, non presa a scatola chiusa.

      Verificato nel browser vero: 8 password sbagliate di fila bloccano
      anche il tentativo successivo con la password giusta, col messaggio
      che dice quanti minuti mancano; il blocco è per indirizzo IP, letto da
      `x-forwarded-for` (quello che scrive Vercel in produzione); dopo un
      login riuscito la riga si cancella. `robots.txt` risponde davvero (200,
      `text/plain`, le regole vere) e non più con un reindirizzamento al
      login — trovato provandolo per davvero: il middleware di autenticazione
      lo intercettava come qualunque altra pagina, e un crawler anonimo non
      avrebbe mai letto le regole vere. `npm run e2e`: 162 controlli, tutto a
      posto.
- [x] **Test end-to-end nella pipeline.** Fatto: `npm run e2e`, e in CI gira
      contro un Postgres vero (non Neon: da una macchina di GitHub il database
      di produzione non si tocca). Ha richiesto una cosa che valeva da sola —
      il driver adesso si sceglie dall'indirizzo invece che riscrivendo
      `src/db/index.ts` a mano prima di ogni prova. Una cosa da ricordarsi
      prima o poi la si dimentica, e quella volta il driver di prova finisce
      in produzione.
- [x] **Verifica dei contrasti automatica.** Fatto, e ha trovato subito una
      cosa vera: il blu dei collegamenti faceva 4,21:1 sullo sfondo della
      pagina. Sul bianco faceva 4,70 e sembrava a posto — misurare sul bianco
      e fermarsi lì era il modo di non vederlo.

      Il controllo compone le trasparenze e fa convertire i colori al browser
      disegnandoli su una canvas. Non è pignoleria: Tailwind v4 scrive
      `oklab(...)` ovunque ci sia un'opacità, e leggerne i numeri con una
      regex dava contrasti finti da 3,04:1 su testo che si legge benissimo.
      Tre giri di misure sono serviti a separare i bug veri dai miei.
- [x] **Controllo dei bersagli tattili in CI.** Fatto, ed è successo una
      terza volta: il salto *N pasti ↓* aggiunto poche ore prima era 59×28.
      Trovato dalla misura, non guardandolo.
- [x] **Numeri di versione**: oggi l'IPA non ha una versione riconoscibile.
      Serve per sapere quale build hai sul telefono. Fatto in due parti,
      perché sono due domande diverse:

      **Il numero.** Il workflow *Compila IPA per iPhone* ora calcola la
      versione da `package.json` (la scegli tu, quando conta davvero) e il
      numero di build dal progressivo del workflow stesso (cresce da solo,
      niente da ricordarsi). Li passa a `xcodebuild` come
      `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` — vincono su qualunque
      valore nel progetto generato da Capacitor, che altrimenti resterebbe
      sempre "1.0", uguale su ogni IPA.

      **Dove si legge.** Non nel sito: l'app è una webview che carica il
      deploy remoto (vedi `capacitor.config.ts`), quindi il contenuto è
      sempre l'ultimo pubblicato a prescindere da quale IPA hai sul
      telefono — un numero di versione del sito non risponderebbe alla
      domanda "quale build ho installato". Serve leggerlo dal guscio
      nativo: nuova dipendenza `@capacitor/app`, e in *Piano → Accesso* una
      riga "Versione X (build N)" che compare solo dentro l'app vera
      (`Capacitor.isNativePlatform()`) — nel browser resta assente, perché
      lì la domanda non ha risposta e mostrare qualcosa sarebbe inventarla.

      **Non verificato end-to-end.** Non è stata rilanciata una compilazione
      IPA vera per controllare che `MARKETING_VERSION`/
      `CURRENT_PROJECT_VERSION` finiscano davvero nell'Info.plist del
      binario: il workflow gira solo su runner macOS, costa circa dieci
      volte un runner Linux normale ed è manuale apposta — non è il caso di
      spenderlo per una prova. Verificato invece: la sintassi YAML del
      workflow, che `@capacitor/app` non rompe la build web (`npm run
      build`), e che la riga "Versione" resta assente nel browser vero, in
      chiaro e in scuro, senza errori in console. Resta da confermare la
      prossima volta che l'IPA viene compilato per davvero.
- [x] **Aggiornare le azioni di GitHub.** Fatto per `checkout` e
      `setup-node` (v4 → v5) nel workflow dei controlli. `upload-artifact`
      resta da guardare quando si tocca il workflow dell'IPA.

## 5. Dati personali fuori dal codice

La repo contiene i tuoi target, la lista dei cibi e la scheda del PT. Non
sono credenziali, ma sono tuoi.

- [ ] **Repo privata**, e con lei la domanda che si trascinava da tempo su
      cosa fare della storia di git: i dati sono in una decina di commit
      pubblici, e toglierli da adesso non li toglie dal passato. Renderla
      privata risolve anche quello senza riscrivere niente — i vecchi commit
      smettono di essere visibili a chiunque, non solo i nuovi. Si fa dalle
      impostazioni di GitHub (Settings → Danger Zone → Change repository
      visibility), non da qui: non c'è uno strumento per farlo dal codice,
      resta un passo da confermare a mano.
- [x] **Target di partenza nel codice, resi generici.** Fatto: la tabella nel
      README e la costante `DAILY_TARGETS` in `src/lib/targets.ts` scrivevano
      i tuoi numeri veri. Ora sono numeri qualunque (2050 kcal, 250/150/50 g)
      — servono solo come punto di partenza prima che tu apra l'app la prima
      volta, o se la lettura del database fallisce; i tuoi target veri stanno
      già nella tabella `targets` e non cambiano.
- [x] **Spostare cibi e scheda del PT nel database**, lasciando nel repo solo
      un file di esempio. Fatto: `src/lib/seed-data.ts` (nomi di prodotti
      reali, "Team Schiavi") diventa `seed-data.example.ts`, generico e
      pubblico, e `seed-data.local.ts`, con i dati veri, che non entra nel
      repository (`.gitignore`) — resta solo sul disco di chi lo esegue.
      `npm run db:seed` prende il primo che trova sul filesystem (con
      `existsSync`, non un import provato-e-preso: un errore vero nel file
      locale deve fermare lo script, non passare per "file assente"),
      ripiegando sull'esempio quando il locale manca — come in CI, dove i
      dati veri semplicemente non esistono. La scheda vera resta comunque
      nel database sin dal primo seed: questo cambia solo cosa sta in git,
      non cosa legge l'app. Tolto "Team Schiavi" anche dal sottotitolo della
      schermata Allenamento e dal README, unici altri due posti dove
      comparivano nomi reali fuori da questo file.

      Provato: `npm run db:seed` con e senza il file locale, in entrambi i
      casi seguito da `npm run e2e` (162 controlli, tutto a posto) e da
      typecheck, lint, test, build.
- [x] **Il volume dovrebbe contare due manubri?** Deciso (25 settembre): no,
      resta come oggi (un braccio). Raddoppiarlo avrebbe cambiato anche i
      numeri già registrati — un cambiamento silenzioso di dati passati che
      la voce sopra segnalava apposta come "da decidere, non da fare di
      nascosto". Nessun codice cambiato: è una decisione, non un bug.

## 6. Comodità che mancano ancora

Nessuna è bloccante, tutte sono state pesate col metro dei gesti.

- [x] **Acqua e passi.** Il PT chiede 3 litri e 10.000 passi al giorno, e
      l'app non li traccia: oggi le regole stanno nel Piano come testo.
      L'acqua era gia' tracciata (vedi 6-ter, Fase 3) -- mancavano solo i
      passi. Fatto: campo *Passi* nel diario, sotto il peso, con l'obiettivo
      scelto in *Piano -> Cambia gli obiettivi* mostrato accanto (default
      10.000, coerente col numero che chiede il PT). Stesso gesto del peso e
      non dell'acqua -- un numero letto sul telefono e scritto una volta,
      non un contatore da toccare piu' volte -- perche' qui non c'e' un
      contapassi nell'app: ci vorrebbe un plugin nativo e un permesso in piu'
      solo per un numero che il telefono sa gia'. Nessuna riga finche' non
      lo scrivi, e cancellarlo cancella la riga invece di lasciare uno zero
      (regola 6). Verificato sul browser vero, 320 e 390px, chiaro e scuro:
      scritto, salvato, sopravvissuto a un reload vero, cancellato di nuovo
      -- controllato anche sulla tabella, non solo sullo schermo -- e
      l'obiettivo cambiato da *Cambia gli obiettivi*, con la validazione che
      blocca un numero fuori scala (sotto 1.000 o sopra 50.000) mostrando il
      messaggio invece di correggere di nascosto.
- [x] **Peso corporeo** con andamento nel tempo. Fatto: un campo nel diario,
      sotto l'acqua (`weight_days`, una riga al giorno come `water_days`),
      un grafico a linea nello Storico che segue il filtro 7/30 giorni, e il
      confronto che chiede il PT ogni domenica -- "peso: 82,5 kg (83,2 kg la
      settimana scorsa)" -- nel riepilogo, a schermo e nel testo copiato.
      L'ultima misura di ciascuna settimana, non una media: di solito ci si
      pesa una volta sola. Nessuna delle due parti del confronto si inventa:
      se manca una misura non compare, mai uno zero (regola 6). Cancellare
      il numero cancella la riga, non la svuota. Verificato sul browser
      vero: peso scritto, salvato, sopravvissuto a un reload vero,
      cancellato di nuovo -- controllato ogni volta anche sulla tabella, non
      solo sullo schermo -- e il confronto fra le due settimane calcolato a
      mano e confrontato col numero mostrato.
- [x] **Numero della settimana nel riepilogo.** Fatto: *Questa settimana*
      ora scrive "Settimana 3 · 14 settembre – 20 settembre", a schermo e nel
      testo copiato. Contata dal primo giorno mai registrato (diario o
      allenamento, quale viene prima) — nessuna data scelta a mano, nessun
      campo nuovo da compilare. Null finché non c'è ancora niente da
      registrare, invece di dire "settimana 1" a un diario vuoto (regola 6).
      Verificato: confrontato il numero a schermo con il calcolo a mano sul
      database vero, a 320 e 390px, chiaro e scuro.
- [x] **Nota sulla dieta nel riepilogo della settimana**, tipo "fame
      giovedì, sgarro sabato sera". Fatto: una riga sola per settimana
      (tabella `week_notes`, migrazione additiva), non su ogni pasto — la
      stessa domanda che fa il PT una volta alla domenica. Nessuna riga nel
      database finché non scrivi niente, e cancellarla del tutto la
      cancella davvero (non una riga vuota lasciata lì). Finisce anche nel
      testo copiato per il PT, sotto un'etichetta DIETA. Verificato: salvata,
      sopravvissuta a un reload vero della pagina, cancellata di nuovo, e
      controllato che la riga sparisse anche dal database — non solo dallo
      schermo.
- [x] **Aggiungere un cibo ai tasti rapidi dall'app**, senza passare dal
      file di seed e da un comando. Fatto: *Piano → I tuoi alimenti*, e ogni
      pasto si salva fra i rapidi con un tocco.
- [~] **Duplicare un giorno.** Mezzo fatto: *Come ieri* ricopia un pasto
      intero in un tocco, ma un momento della giornata alla volta e solo
      quello in cui sei. Copiare l'intera giornata resta da fare.
- [x] **Diario più denso e più vivo.** Fatto: le tre barre a tutta larghezza
      sono diventate tre riquadri affiancati, in cima c'è la striscia degli
      ultimi sette giorni (tocchi un giorno e ci vai), toccando un macro si
      apre il dettaglio con da dove arriva e cosa ci sta ancora, i tasti
      rapidi mostrano anche i macro e non solo le calorie, e i numeri
      scorrono invece di saltare.
- [x] **Correggere e disfare tutto.** Fatto: una serie si modifica toccandola,
      la sua eliminazione si annulla, "Fine" toccato per sbaglio si riapre, una
      giornata avviata sbagliata si scarta, una seduta si toglie dallo storico
      e torna com'era, e un pasto si sposta di momento. Nessuna azione resta
      senza via d'uscita.
- [x] **Note sulla seduta.** Fatto: una riga nel dettaglio della seduta, e
      finisce anche nel testo che si manda al personal trainer — dove "spalla
      che tira" gli dice più del volume. Cancellarla la riporta a *nulla* e
      non a una riga vuota: "nota cancellata" e "nota mai scritta" sono la
      stessa cosa, e distinguerle vorrebbe dire mostrare un campo vuoto anche
      dove non serve.
- [x] **Riordinare gli esercizi** della giornata, se in palestra la macchina
      è occupata. Fatto, ma non come il riordino del programma da *Piano →
      Cambia la scheda* (quello, già segnato fatto altrove, riscrive
      l'ordine vero incollando una scheda intera — sproporzionato per "la
      panca è occupata, la faccio fra cinque minuti"). Due tasti su/giù su
      ogni scheda dell'esercizio, **solo per la seduta di oggi**: nessuna
      scrittura sul server, nessuna `sortOrder` toccata. Riaprendo la seduta
      (o solo ricaricando la pagina) l'ordine torna quello del programma —
      voluto, perché una modifica per "oggi la macchina è occupata" non deve
      cambiare cosa fai domani.

      Verificato sul browser vero, 320 e 390px, chiaro e scuro: i tasti sono
      44×44 px e spariscono da soli quando c'è un solo esercizio (spostare
      non vorrebbe dire niente); un tocco su "giù" scambia solo la coppia
      toccata, il resto dell'elenco non si muove; il tasto "su" sul primo e
      "giù" sull'ultimo restano disabilitati; si può ancora segnare una
      serie subito dopo aver riordinato, senza errori; un reload vero
      riporta l'elenco all'ordine del programma, non a quello scambiato.
- [x] **Quale giornata tocca.** Fatto: l'Allenamento apre su *Tocca a te* con
      la giornata successiva a quella dell'ultima seduta. Resta un
      suggerimento — le altre giornate sono tutte avviabili.

## 6-bis. Interfaccia: cosa resta dopo il confronto con Bevel

Ordinato per quanto cambia davvero l'uso. Il metro resta quello di
`PRODOTTO.md`: si aggiunge solo ciò che abbassa un costo in tocchi o rende
leggibile qualcosa che oggi non lo è.

- [x] **La barra in basso e le intestazioni sembravano un prototipo, non
      un'app finita.** Segnalato a voce: "manca la parte grafica... sembra
      ancora troppo wip, spoglia". Tre cose, tutte con gli stessi colori già
      validati (nessuno nuovo):

      **Icone nella barra in basso**, prima solo testo. *Piano* diventa
      visivamente il "profilo" — un tondino con dentro una sagoma, invece
      di un'icona uguale alle altre tre — perché è già lì che stanno le
      impostazioni (accesso, i tuoi dati, il collegamento Fitbit): niente
      schermata nuova, niente rotta in più.

      **La stessa icona anche nell'intestazione** di Piano, Allenamento e
      Storico, dentro un riquadro colorato — lega la parte alta e quella
      bassa dello schermo invece di farle sembrare due app diverse. Trovato
      un bug vero facendolo: passare l'icona come componente da un Server
      Component a `PageHeader` (che è "use client") falliva con "Functions
      cannot be passed directly to Client Components" — si passa l'elemento
      già istanziato (`<IconPiano />`), non la funzione.

      **Un'ombra sola per tutte le card** (`--shadow-card`, in
      `globals.css`), leggermente più marcata di prima e non più ripetuta
      uguale a mano in dieci file diversi — lo stesso principio della curva
      di movimento unica, applicato alle ombre. Prima era così tenue da
      leggersi come "senza ombra", ed era una delle cose dietro la
      sensazione di piattezza.

      Verificato nel browser vero, 320 e 390px, chiaro e scuro: le quattro
      icone della barra cambiano colore con la scheda attiva, il riquadro
      dell'intestazione ha contrasto a posto in entrambi i temi, nessuno
      scorrimento orizzontale introdotto dalla barra più alta (64px invece
      di 56, per fare posto all'icona sopra l'etichetta). `npm run e2e`: 162
      controlli, tutto a posto.
- [x] **Lo Storico sembrava un foglio di calcolo, non una dashboard.**
      Segnalato a voce ("manca quel qualcosa delle dashboard fighe"). Guardate
      le app del genere, le due cose che tornano sempre e che qui avevano
      senso: **riquadri di grandezza diversa** e **un andamento in
      miniatura** accanto al numero.

      *In sintesi* (`storico-sintesi.tsx`) sostituisce le due card uguali
      "media" e "giorni entro il target" e la sezione Peso a parte. La
      grandezza dice quanto conta: le calorie prendono tutta la riga con il
      numero a 48px, carboidrati, proteine, grassi e peso stanno a metà. Ogni
      riquadro ha media, scarto dal target e giorni entro il target insieme,
      invece di dividere le stesse informazioni in due posti.

      La **sparkline** (`sparkline.tsx`) sta sotto le calorie, con il target
      tratteggiato, e sotto il peso. Regole seguite: un giorno non registrato
      spezza la linea (regola 6), un giorno isolato fra due buchi è un
      puntino — la prima versione lo faceva sparire, visto solo nello
      screenshot a 30 giorni. Oggi non entra nella linea delle calorie, come
      non entra nella media. Il peso invece sta sui giorni veri e passa sopra
      i buchi: due pesate a una settimana di distanza non sono vicine come due
      di fila, e fra l'una e l'altra il peso non smette di esistere. La sua
      linea è in inchiostro e non in blu, perché accanto ai macro il blu vuol
      dire calorie (regola 7), e non ha colore sul verso: il peso non ha un
      target qui.

      Il rosso resta solo sullo scarto sopra il target. Verificato nel
      browser vero a 320 e 390px, chiaro e scuro, 7 e 30 giorni, con dati di
      prova: media calorie 2110 = (2300 + 1900 + 2150 + 1800 + 2400) / 5,
      carboidrati 256 = 1280 / 5, come a schermo. `npm run e2e`: 162
      controlli, tutto a posto.

      **Poi su tutte le schermate**, segnalato ("hai fatto solo una pagina,
      deve essere globale"). I pezzi stanno in `riquadro.tsx` (`Griglia`,
      `Riquadro`, `RiquadroLink`, `Etichetta`), riusati ovunque invece di
      ridisegnarli per pagina.
      - *Diario*: anello, macro e acqua restano nella stessa scheda; peso e
        passi diventano due riquadri affiancati, gli integratori uno a tutta
        riga. L'acqua in un riquadro suo è stata provata e tolta: a 390 px il
        margine in più portava il "+" per metà sotto la barra in basso.
        Peso e passi hanno il campo sopra e il tasto sotto; "Sincronizza da
        Fitbit" diventa un'icona 44×44 accanto a Salva, col nome intero per
        lo screen reader. A 320 px la riga dei passi era già rotta su `main`
        ("/ 10.000" a capo, "Salva" tagliato): ora ci sta.
      - *Piano*: i target come riquadri (calorie a tutta riga), e Scheda,
        Integratori, Alimenti, Fitbit in una griglia 2×2 di riquadri che si
        toccano interi, al posto di quattro schede con paragrafo e tasto. La
        spiegazione lunga c'era già in cima a ogni pagina di destinazione.
      - *Allenamento*: sotto "Tocca a te" due riquadri, i giorni allenati
        questa settimana (pallini L–D) e l'ultima seduta, che prima stava
        nella riga sotto "Tocca a te". Niente volume a confronto: spinta e
        full body non muovono gli stessi chili.
      - A 320 px il "g" dei riquadri macro del diario usciva dal bordo (già
        su `main`): sotto i 360 px il numero scende a 17 px. Le etichette
        restano troncate ("Carbo…", "Protei…") come prima -- non risolto,
        a tre colonne in 320 px "Carboidrati" non ci sta.

      Verificato nel browser a 320 e 390 px, chiaro e scuro, anche con
      Fitbit collegato (riga finta nel database, poi tolta). `npm run e2e`:
      162 controlli, tutto a posto. Non provato su un iPhone vero.
- [x] **Titoli di sezione fuori dalle schede.** Fatto su tutte e quattro le
      schermate.
- [x] **Freccia su quello che si apre.** Fatto sulle tessere dei macro.
- [x] **Stati vuoti con un'indicazione di cosa fare.** Fatto su diario e
      storico.
- [x] **Pasto che arriva da una chat.** Fatto: Aggiungi → *Incolla da
      Claude*. Si copia il prompt (che porta con sé i cibi rapidi già in
      archivio, così quei valori non vengono ristimati), lo si manda a Claude
      con cosa si è mangiato, e si incolla indietro la risposta. L'app legge
      JSON, tabelle markdown e righe scritte a mano, e propone gli alimenti
      da controllare prima di salvare. Nessuna chiave, nessun costo, nessuna
      rete: la lettura è tutta nel telefono.
- [x] **Una curva sola per tutto quello che si muove.** Fatto: fogli, barre
      in fondo, entrate di schermata e risposta al tocco condividono
      `--ease-ios` in `globals.css`, invece di avere ognuno la propria
      andatura. Misurato in Chromium a 320, 390 e 430 px, chiaro e scuro.
- [x] **Riepilogo della settimana.** Fatto: in cima allo Storico, lunedì–
      domenica, alimentazione e sedute, con un tasto che lo copia come testo.
      Serve la domenica sera e per mandarlo al personal trainer.
- [x] **Carico per manubrio invece di "kg".** Fatto: sugli esercizi che nel
      programma dicono "manubri" il campo si chiama *kg a manubrio*. Prima
      diceva solo "kg" e ogni serie registrata era ambigua.
- [x] **Dettaglio di un allenamento passato.** Fatto: `/allenamento/[id]`.
      La lista degli ultimi allenamenti era un vicolo cieco in lettura --
      volume e cestino, niente da aprire.
- [x] **"Sto andando meglio?" accanto a ogni serie.** Fatto: il confronto con
      la stessa serie dell'ultima volta, sia nella seduta in corso sia nel
      dettaglio. Prima c'era solo "Ultima volta: 25×8 · 27,5×8 · 30×7" in
      cima all'esercizio, e il confronto lo facevi a mente con trenta secondi
      di recupero.
- [x] **La seduta è un muro di schede uguali.** Otto esercizi, otto
      rettangoli identici: quello che stai facendo adesso ha lo stesso peso
      visivo di quello fra quaranta minuti. L'idea è comprimere i finiti
      (titolo + riepilogo, niente campi) e tenere aperto solo quello in
      corso. Cambia il modo di usare la schermata, quindi va deciso guardando
      un prima/dopo, non a parole.

      Fatto, dopo il prima/dopo: un esercizio con tutte le serie previste
      registrate (`fatte >= previste`) si comprime in una riga sola — titolo
      e riepilogo delle serie ("12×10 · 12×10 · 12×8"), niente campi — invece
      di restare un rettangolo identico a quello in corso. Un tocco lo
      riapre per correggere una serie, e da lì resta aperto per il resto
      della seduta: non c'è motivo di richiuderlo da solo.

      Non si è provato a indovinare "quello in corso" oltre a "non ancora
      finito": con il riordino di seduta già fatto (si può saltare fra
      esercizi se una macchina è occupata) scegliere un solo esercizio
      "attivo" sarebbe stato arbitrario per chi lavora fuori ordine. Tutti
      gli esercizi non ancora completati restano aperti come oggi.

      Verificato: browser vero a 320/390px, chiaro/scuro, con rete a
      ~400ms — avviata una seduta vera (Day 1 — Push), completate le 3
      serie previste di un esercizio, il riepilogo compresso ("Curl manubri
      con rotazione in piedi — 12×10 · 12×10 · 12×8") confrontato a mano con
      le serie inserite; il secondo esercizio, con una sola serie su tre,
      resta con i campi visibili; riaperto il primo esercizio, tutte e tre
      le serie restano modificabili ed eliminabili. `npm run e2e`: 144
      controlli, tutto a posto.
- [x] **Card d'insight in linguaggio naturale sul diario.** Una riga sotto i
      tre riquadri che legge i numeri al posto tuo: "Ti restano 1905 kcal e
      155 g di proteine — Petto di pollo e Whey isolate Yamamoto ci stanno."
      Le proteine e non un macro a caso: è la stessa coppia con cui
      PRODOTTO.md descrive "quanto mi resta" ("600 kcal e 70 g di proteine
      ancora da spendere"), perché a differenza di carboidrati e grassi le
      proteine sono l'unico macro che di solito serve cercare apposta. Gli
      alimenti proposti sono i tasti rapidi che ci stanno ancora
      (`fitsInRemaining`, gia' usato da "Cosa mi entra ancora"), ordinati dal
      piu' proteico: chiudono per primi il divario appena nominato. Sparisce
      da sola a target raggiunto o superato -- l'anello rosso lo dice gia',
      ripeterlo sarebbe un rimprovero (regola 8). `buildInsight` in
      `src/lib/nutrition.ts`, 7 test in `nutrition.test.ts`.
      Verificato: browser vero a 320 e 390px, chiaro e scuro, con rete a
      ~400ms; numero a schermo confrontato a mano con la somma dei pasti
      aggiunti (1905 − 165 − 365 = 1375 kcal, 155 − 46 − 7 = 102 g di
      proteine); dopo aver eliminato i pasti la frase torna quella del
      giorno vuoto. `npm run e2e`: 144 controlli, tutto a posto.
- [x] **Niente NaN a schermo, controllato in CI.** Non era in programma:
      `Number(formatMacro(...))` ha smesso di funzionare il giorno in cui il
      formattatore ha cominciato a scrivere la virgola, e la media dello
      storico mostrava "−NaN g". Nessuno degli altri controlli lo avrebbe
      visto — "NaN" non ha punti decimali, non è un colore e non è un
      bersaglio. Adesso `npm run e2e` cerca anche `NaN`, `undefined` e
      `[object Object]` su ogni schermata.
- [x] **Etichetta qualitativa accanto ai numeri dello storico.** "−217 kcal"
      diventa "−217 kcal · sotto il target" nella media giornaliera. Logica
      pura in `etichettaScarto` (`src/lib/nutrition.ts`), testata a parte:
      sopra/sotto/in linea, e uno scarto che arrotonda a zero resta "in
      linea" invece di "+0 kcal". Nessuna parola di valore nel testo — solo
      la direzione, come chiede la regola 8. Verificato nel browser, chiaro
      e scuro.
- [x] **Schede a mezza larghezza affiancate** dove il contenuto è corto:
      "Media giornaliera" e "Giorni entro il target" nello storico, ora
      fianco a fianco in una sola sezione. La griglia dei macro dentro
      "Media giornaliera" è passata da 2x2 a una colonna: a metà larghezza
      scheda una griglia 2x2 stringeva ogni numero sotto la soglia leggibile.
      Uno screenshot vero a 320px ha beccato un bug che il contrasto e i
      bersagli non vedono: "Carboidrati4" incollato, con "/ 4" andato a capo
      da solo — l'etichetta e il numero affiancati non ci stavano a metà
      scheda. Corretto mettendo etichetta sopra e numero sotto invece che
      fianco a fianco. Verificato a 320 e 390px, chiaro e scuro, con
      screenshot reali, non solo coi controlli automatici.
- [x] **Heatmap del mese** nello storico, tipo calendario, con quanti giorni
      sei stato in target. Quattro stati, non due: entro, oltre, non
      registrato e futuro restano distinti (regola 6 — un giorno non
      registrato non è uno zero, e un giorno che deve ancora arrivare non è un
      giorno saltato). Il rosso resta solo per il fuori target (regola 9); il
      giorno non registrato è grigio, non un rosso attenuato. Ogni casella
      porta un'etichetta per chi non vede i colori (regola 7) oltre al numero
      visibile. Si vede anche a zero giorni registrati, a differenza dei
      grafici sopra: il calendario vuoto è già un'informazione. Misurato nel
      browser a 320/390px, chiaro e scuro; nel farlo, il controllo automatico
      del contrasto leggeva per errore il testo nascosto (`.sr-only`, che
      Tailwind fa 1×1px e non zero pixel) invece del numero visibile — corretto
      nello strumento di prova, non nell'app.
- [x] **Data toccabile nell'intestazione** che apre un selettore, invece delle
      sole frecce. La striscia della settimana copre già i sette giorni
      vicini; serve per andare più indietro.

      Fatto con un `<input type="date">` nativo, invisibile e grande quanto
      il titolo (`position: absolute; inset: 0; opacity: 0`) sopra
      "Oggi"/"Ieri"/"lun 3 mar": il tocco apre il selettore del telefono
      invece di dover premere la freccia decine di volte per un mese fa.
      Niente calendario scritto a mano — l'input nativo costa una riga e
      non un componente nuovo. Il bersaglio resta ≥44×44 anche a 320px
      (misurato: 176×44). Ferma sul giorno scelto se e' quello gia' aperto
      (`vaiA` esce subito), e mostra la stessa dissolvenza a 200ms/`--ease-ios`
      che il resto dell'app usa per un salvataggio in corso, invece di uno
      spinner nuovo per un bersaglio che non e' un cerchio.
      Verificato: browser vero a 320/390px, chiaro/scuro; saltato al 10
      settembre e tornato a oggi passando dal selettore, frecce ancora
      funzionanti, nessuno scorrimento orizzontale introdotto.
      `npm run e2e`: 144 controlli, tutto a posto.
- [ ] **Il volume dovrebbe contare due manubri?** Oggi il volume è quello che
      scrivi per ripetizioni, quindi sugli esercizi con i manubri conta un
      braccio solo. È coerente settimana su settimana, quindi la progressione
      si legge lo stesso, ma il totale di seduta mescola mezzi carichi e
      carichi interi. Raddoppiarlo cambierebbe anche i numeri già registrati:
      da decidere, non da fare di nascosto.
- [x] **Export filtrato per date.** Fatto: `?da=` e `?a=` sulla rotta, e tre
      tasti pronti in *Piano → I tuoi dati* (pasti e allenamenti di questa
      settimana, tutto questo mese).

      La parte che conta non è il filtro, è che **il file dica cosa
      contiene**: il nome porta il periodo
      (`pasti-2026-09-14_2026-09-20.csv` contro `pasti-tutto-2026-09-17.csv`)
      e il JSON lo scrive dentro, in cima. Un export parziale che sembra
      completo è peggio di nessun export — chi lo riceve conclude che hai
      mangiato solo quello, ed è la regola dei denominatori applicata a un
      file invece che a una media.

      Un intervallo al contrario dà 400 e viene spiegato, non girato di
      nascosto: un file che contiene un periodo diverso da quello chiesto è
      peggio di un errore, perché l'errore lo vedi.

      Nel CSV dei pasti c'è anche la colonna `solo_kcal`: senza, i tre zeri
      di un pasto segnato a occhio sembrerebbero grammi misurati pure fuori
      dall'app.
- [x] **Separatore decimale dei macro.** Fatto. `formatMacro` scrive con la
      virgola, come `formatWeight` e `formatAcqua`.

      Cercandolo è saltato fuori il resto: **sei punti stampavano il target
      grezzo** senza passare dal formattatore (anello, grafico dello storico,
      foglio del macro, riquadro, Piano, e la riga *Target:* del testo
      copiabile). Finché i target erano costanti intere non si vedeva; da
      quando si scrivono a mano, un target di 62,5 g usciva "62.5". Ora
      passano tutti di lì.

      Anche il campo modificabile mostra la virgola: leggere "62.5" nel campo
      mentre il resto dell'app scrive "62,5" fa sembrare due numeri diversi.
      Il punto continua a essere accettato in scrittura.

      Le migliaia di kcal restano senza raggruppamento ("1845 kcal", non
      "1.845"), mentre il volume in palestra lo usa: differenza voluta e
      scritta nel codice — lì si arriva a cinque cifre, qui ci si ferma a
      quattro e il punto costa un carattere nell'anello senza far guadagnare
      niente.
- [~] **Passi da Fitbit.** Mezzo fatto, e di proposito solo mezzo: dei due
      candidati originari (Apple Health via HealthKit, o Fitbit via API web),
      Apple Health resta scartato per lo stesso motivo di sempre -- plugin
      nativo, Xcode, account sviluppatore a pagamento, e i dati non escono
      dal telefono. Fitbit invece si può fare, ma non con la sua vecchia Web
      API: Google l'ha dismessa a settembre 2026 (nuove registrazioni già
      chiuse, spegnimento totale a fine mese), sostituendola con la
      **Google Health API**, che aggrega Fitbit e altre fonti dietro un
      login Google.

      Fatta solo la parte dei **passi**, non le calorie bruciate: renderebbero
      il budget dinamico invece che fisso, com'era nell'idea originale, ma
      decidere se contare le calorie attive o quelle totali (che
      includerebbero il metabolismo basale, già dentro il target fisso --
      doppio conteggio) è una decisione nutrizionale a sé, non una scelta
      tecnica. Un problema reale e recente lo conferma: un bug segnalato a
      luglio 2026 su `open-wearables` mostra i totali di calorie del
      provider Google "wildly inflated". I passi invece hanno un solo modo
      di essere letti (`countSum`, un conteggio) e un posto dove finire
      che esisteva già -- il campo *Passi* del diario, aggiunto in questa
      stessa sezione.

      **Deciso (25 settembre): niente budget dinamico, per ora.** Il budget
      resta fisso. Proprio il bug citato sopra pesa nella scelta: un numero
      "wildly inflated" che allargasse il budget sarebbe peggio di non
      averlo (regola 6, al contrario -- non un giorno non registrato preso
      per zero, ma un giorno gonfiato preso per vero). Se un giorno si
      riprende in mano, solo le calorie attive, mai quelle totali: quelle
      raddoppierebbero il metabolismo basale, già dentro il target fisso.

      **Come funziona.** *Piano → Passi da Fitbit*: un tasto "Connetti con
      Google" apre il consenso OAuth (`access_type=offline` per il refresh
      token, `prompt=consent` per riottenerlo anche a una riconnessione).
      Tornati indietro, nel diario compare "Sincronizza da Fitbit" accanto al
      campo Passi: **non scrive da sola** -- riempie il campo di testo
      esistente, e resta il tasto *Salva* a confermare, la stessa identica
      porta di quando li scrivi a mano (`setPassi`). Un numero che arriva da
      un sensore esterno si mostra e si conferma come una stima (regola 12),
      anche se qui non è una stima ma una misura: il costo è un tocco in
      più, il guadagno è non fidarsi ciecamente di un servizio mai chiamato
      da questo repo prima d'ora.

      **Una riga sola in database** (`fitbit_connessione`, id sempre 1, come
      `targets`): token di accesso, token di rinnovo, scadenza. Scollegare
      cancella la riga, non la svuota -- "mai connesso" e "scollegato" sono
      la stessa cosa. Un 401 da Google durante la sincronizzazione (permesso
      scaduto o revocato) cancella da sola la connessione e riporta la
      schermata a "non collegato", invece di continuare a fallire in
      silenzio ogni giorno.

      **La trappola dei 7 giorni.** Finché l'app resta in modalità "Testing"
      su Google Cloud -- la modalità di default, dato che pubblicarla
      chiederebbe una revisione di sicurezza di Google per un'app a un
      utente solo -- **il permesso scade da solo ogni 7 giorni**. Non è un
      guasto di questo repo: è cosí che Google tratta ogni app non
      verificata con scope sanitari. Riconnettersi costa lo stesso tocco
      della prima volta.

      **Verificato, e più di quanto ci si aspettasse.** A differenza di Open
      Food Facts, il proxy di rete di questo ambiente **non** blocca i domini
      Google: `oauth2.googleapis.com` e `health.googleapis.com` rispondono
      per davvero. Con credenziali finte (senza un account vero, quello non
      si può avere da qui) si è vista la risposta reale di entrambi -- un 401
      nella forma vera di un errore Google -- e si è controllato che il
      codice la riconosca e la traduca in italiano senza rompersi, compreso
      il caso "scaduto" che ripulisce la connessione da solo: verificato nel
      browser vero, cliccando *Sincronizza* con una connessione finta in
      database e guardando la richiesta arrivare davvero a
      `health.googleapis.com` e tornare un 401 vero. Verificato anche il
      callback OAuth con uno `state` sbagliato (rifiuta con garbo, non un
      500) e con `?error=access_denied` (l'utente annulla il consenso: niente
      messaggio d'errore, regola 8/9 -- non è un guasto, è una scelta).
      Bersagli e contrasto passano in entrambi gli stati (connesso/non
      connesso) a 320/390px, chiaro e scuro. `npm run e2e`: 162 controlli,
      tutto a posto (aggiunta la schermata `/fitbit` alla lista).

      **Quello che resta non verificato è il consenso vero**: senza un
      account Google e un browser con cui completarlo, da qui non si ottiene
      un token valido, quindi la lettura di passi reali non è mai stata
      vista -- solo la sua forma attesa, letta dalla documentazione ufficiale
      di Google a settembre 2026. La riga `dataSourceFamily`, che
      nell'unico esempio trovato nella documentazione punta a
      `google-wearables` (sembra pensato per un Pixel Watch, non per
      Fitbit), è stata omessa apposta per non escludere la fonte giusta per
      errore: se una volta collegato per davvero i passi tornassero sempre
      vuoti, è il primo punto da controllare. Il primo collegamento vero,
      con le chiavi vere, è anche la prima prova vera che i passi tornano.
- [ ] **Un modo per tornare indietro dalla chat senza copiare a mano.** Oggi
      il giro è: copia il prompt, apri Claude, incolla, copia la risposta,
      torna, incolla. Sei gesti, di cui quattro sono trasporto. Da valutare
      un collegamento che apra l'app con la risposta già dentro.
- [x] **Intestazione che si compatta scorrendo.** Costa poco, guadagna una
      riga su schermate lunghe.

      Fatto su `PageHeader` (Piano, Allenamento, Storico — le tre schermate
      dove sotto c'è davvero una lista lunga): il titolo resta incollato in
      cima invece di scorrere via, e passa da 34px a 17px — le due misure
      del titolo grande e del titolo di barra su iOS — appena si superano 24px
      di scorrimento. Il sottotitolo sparisce insieme: a piccolo non c'è
      spazio per due righe senza sembrare compresso.

      Le schermate raggiunte da *Piano* (Alimenti, Integratori, Obiettivi,
      Scheda, il dettaglio di un allenamento) hanno un'intestazione più
      piccola e un proprio collegamento indietro: restano come sono, non è
      quello il problema che l'elemento descriveva.

      Niente di nuovo nel movimento: la stessa `--ease-ios` a 200ms già usata
      altrove, non uno stile a parte per l'intestazione.

      Verificato: browser vero a 320/390px, chiaro/scuro, su Piano
      (2360px scorribili), Storico (964px) e Allenamento (1574px) —
      l'intestazione resta a `top: 0px` durante lo scorrimento (misurato,
      non assunto) e il font passa da 34px a 17px; nessuno scorrimento
      orizzontale introdotto. `npm run e2e`: 144 controlli, tutto a posto.

      **Seguito (26 settembre): rimbalzava proprio mentre si restringeva.**
      Segnalato a voce ("comincia a glicciare quando deve ridursi"). Non un
      problema del codice di `PageHeader`, ma del browser: mentre
      l'intestazione si restringe, la sua altezza cambia esattamente nella
      zona visibile se sei fermo a pochi pixel dall'inizio — sotto la sua
      stessa altezza. L'"ancoraggio dello scorrimento", la funzione nativa
      che tiene ferma a schermo la cosa che il browser pensa tu stia
      guardando quando un contenuto sopra cambia dimensione, interpretava
      quel restringersi come un contenuto che sparisce e riportava lo
      scroll a 0 da solo per compensare — il che rimandava l'intestazione
      grande, che si restringeva di nuovo: un rimbalzo vero, non
      immaginato.

      Misurato prima di scrivere una riga: uno `scroll` a 40px generava un
      secondo evento `scroll` con `scrollY` tornato a 0 circa 25ms dopo, mai
      un tocco dell'utente. Corretto con `overflow-anchor: none` — ma sul
      documento intero, in `globals.css`, non sulla sola intestazione:
      provato prima lì, da solo non bastava, perché il browser sceglie come
      "ancora" un nodo qualunque nella zona visibile, non necessariamente
      l'intestazione stessa. Il costo è onesto e scritto lì: sparisce anche
      l'utilità vera dell'ancoraggio altrove (un contenuto che cambia
      altezza sopra quello che stai leggendo non tiene più ferma la riga a
      schermo) — in questa app oggi non c'è un caso così, ma se comparisse
      andrebbe riconsiderato da lì.

      Riverificato con lo stesso tracciamento su tutte e quattro le
      schermate con `PageHeader` (Diario, Piano, Allenamento, Storico): un
      solo evento di scroll, fermo al valore vero, nessun rimbalzo.
      Screenshot a metà della transizione (100ms su 200) e a fine
      transizione, 320/390px chiaro/scuro: niente stati a metà rotti.
      typecheck, lint, test, build a posto. `npm run e2e`: 162 controlli,
      tutto a posto.
- [ ] **Un "+" che apre i modi di registrare.** Oggi i tasti rapidi sono in
      fondo al diario: da valutare solo se il conteggio dei tocchi migliora,
      altrimenti è decorazione.

## 6-ter. Il diario alimentare non si usa. Il piano per farlo usare

> «L'alimentazione mi è scomoda da utilizzare e non mi viene da utilizzarla.»
> — 17 settembre 2026

È il problema più grave che abbia questa app, e batte qualunque funzione
mancante: un diario che non si apre non registra niente, e tutto il resto —
medie, storico, riepiloghi — è costruito sopra a quei dati.

### Cosa dice la misura, non l'opinione

Diario a 390 px con una giornata vera dentro (10 pasti registrati):

| Cosa | Dove sta |
|---|---|
| Pagina intera | 2625 px = **3,1 schermate** |
| Anello "quanto mi resta" | 206 px — in cima, ok |
| **Primo tasto rapido** | 1626 px → **882 px di scorrimento, quasi 2 schermate** |
| *Incolla da Claude* | 2392 px = **2,8 schermate** |
| *Aggiungi manualmente* | 2448 px |

Due conseguenze, tutte e due misurate:

1. **La lista dei pasti sta sopra i tasti per aggiungere.** Più registri
   durante la giornata, più lontano diventa il tasto per registrare. La cena
   — il pasto che segni quando sei più stanco — è quella che costa più
   scorrimento di tutte.
2. **A fine giornata 7 tasti rapidi su 12 portano la scritta rossa "sfora".**
   Apri l'app per segnare la cena e trovi un muro di rosso che dice che
   qualunque cosa mangi è sbagliata. Formalmente la regola 9 è rispettata (è
   fuori target, non un'azione); nei fatti è la regola 8 a saltare — *non si
   incolpa l'utente per quello che è già successo*. C'è già una riga che dice
   «Cosa mi entra ancora (6 su 12)»: quella basta.

### Il nostro metro era rotto

`PRODOTTO.md` dichiara *«aggiungere un cibo ricorrente: 1 tocco, ok»*. È vero
e non significa niente: **la tabella dei gesti non contava lo scorrimento**.
Si è autoassolta per due mesi su una schermata che costa due schermate di
pollice prima del primo tocco utile.

Da qui in avanti lo scorrimento è un gesto e si conta: *mezza schermata = 1
gesto*. La tabella in `PRODOTTO.md` è stata corretta di conseguenza.

### Cosa dicono le app che la gente usa davvero

Non è un problema nostro, è *il* problema di questa categoria:

- **50–70% di chi scarica un contacalorie smette entro 30 giorni**, e l'uso
  crolla già nelle prime due settimane.
- Registrare per bene costa **15–20 decisioni consapevoli al giorno** (cerca,
  scegli quale dei 30 risultati, indovina la porzione, salva) × 4 pasti.
- La ricerca sul cambiamento di abitudini dice che **quando la motivazione
  cala — e cala — quello che resta è l'attrito**. Non serve più volontà,
  serve meno attrito.
- Confronto misurato fra due app serie: su quattro modi di registrare,
  **MacroFactor 24 azioni contro le 36 di MyFitnessPal**. Codice a barre 5
  contro 7; aggiunta rapida di sole calorie 3 contro 5. La differenza fra
  un'app che si usa e una che si abbandona è di quest'ordine: dimezzare i
  gesti, non aggiungere funzioni.
- Le scorciatoie che tutte hanno, in ordine di quanto vengono usate:
  **preferiti/recenti per momento della giornata**, **copia da un altro
  giorno o da un altro pasto**, **aggiunta rapida di sole calorie**,
  **codice a barre**, **descrizione a parole**.

Noi la descrizione a parole ce l'abbiamo già (*Incolla da Claude*). Ci mancano
le altre quattro, e quella che c'è è sepolta a 2,8 schermate.

### Il piano, in ordine di quanto sposta

Ogni fase ha un bersaglio misurabile. Se una fase non abbassa il numero, non
è servita e si torna indietro.

**Fase 0 — Togliere quello che respinge.** ✅ *fatta*
- Via la scritta rossa "sfora" dai tasti rapidi. Resta la riga «cosa mi entra
  ancora», detta una volta e in positivo, che filtra anche.
- Bersaglio: zero segnali di colpa sulla schermata di aggiunta. **Centrato**:
  misurato il colore calcolato di ogni testo dentro la sezione *Aggiungi*, a
  quattro larghezze e in entrambi i temi — nessun rosso.

**Fase 1 — Mettere l'aggiunta dove si guarda.** ✅ *fatta, con un conto da saldare*
- *Aggiungi* subito sotto l'anello; la lista dei pasti sotto.
- Bersaglio: **da 882 px di scorrimento a 0** per il primo tasto rapido.
  **Centrato** a 320, 390 e 430 px.
- **Il prezzo è più alto del previsto.** Avevo scritto che «vedere cosa ho
  mangiato» sarebbe passato da 0 a 1 gesto: misurato, costa **3**. La lista
  dei pasti comincia a 1590 px perché la griglia dei dodici tasti rapidi è
  alta 720 px da sola. Stessa ragione per cui *Incolla da Claude* resta a 3
  gesti invece di 2.
- Non si aggiusta con un altro spostamento di sezioni: si aggiusta
  accorciando la griglia, che è la Fase 2. Fino ad allora le due righe
  restano segnate sopra il tetto in `PRODOTTO.md` invece di essere assolte.

**Fase 2 — Ripetere invece di ricomporre.** ✅ *fatta, e una previsione sbagliata*
- «Come ieri» ricopia in un tocco il pasto già fatto in questo momento della
  giornata. **Centrato**: 1 gesto, e il tasto finisce a 772 px, cioè sopra la
  piega di uno schermo da 844.
- I tasti rapidi si riordinano da soli per momento della giornata, da quello
  che hai già registrato negli ultimi 90 giorni. Misurato: a cena in cima
  c'è il pollo, a colazione l'avena. Se ne mostrano sei: **la griglia è
  passata da 720 a 295 px**.
- **La previsione sbagliata**: avevo scritto che accorciare la griglia
  avrebbe riportato sotto il tetto le due righe lasciate fuori dalla Fase 1.
  Misurato: la lista dei pasti è a 1535 px, cioè **quattro** gesti di
  scorrimento — peggio dei tre di prima. I 425 px guadagnati sulla griglia se
  li sono ripresi acqua, integratori, *Solo calorie* e *Come ieri*, tutta
  roba aggiunta sopra la lista nel frattempo.
- **Come è stato risolto davvero**: non accorciando ancora, ma con un salto.
  La riga sotto la data diceva «Diario», che è informazione zero; adesso dice
  *N pasti ↓* ed è un bersaglio che porta alla lista. Un gesto, zero pixel di
  altezza in più. Scorrendo costa ancora quattro gesti, e resta scritto qui.
- Restano due limiti, voluti:
  - *Come ieri* propone solo il momento della giornata corrente. Ripetere il
    pranzo alle otto di mattina non si può: si userebbe una volta su cento e
    costerebbe un selettore in cima alla schermata più affollata dell'app.
  - Su un giorno passato la barra mostra *Torna a oggi* invece del salto: lì
    l'uscita conta di più, ma il problema dello scorrimento è lo stesso.
- Bersaglio: **una colazione ricorrente in 1 gesto** — centrato.
- La riga integratori è passata da 124 a 72 px, due per riga invece di uno:
  era quello che spingeva *Aggiungi* sotto la piega.

**Fase 3 — L'acqua.** ✅ *fatta*
- Bicchieri +/− dentro la scheda del riepilogo, sotto i macro: niente macro,
  niente stime, niente scelta della dimensione del bicchiere. Obiettivo in
  `targets.ts` (8 bicchieri da 250 ml).
- Bersaglio: **1 gesto per un bicchiere, 0 per vedere a che punto sei**.
  **Centrato**: la riga finisce a 631 px su uno schermo da 844, quindi si
  vede senza scorrere a 320, 390 e 430 px; riscontro al tocco in 5-7 ms.
- Il "meno" fa da annullamento — è l'inverso esatto del "più", a un tocco —
  quindi non c'è nessun messaggio che propone di disfare. Si manda il totale
  e non "uno in più", così un doppio tocco su rete lenta non conta due
  bicchieri.

**Fase 4 — Aggiunta rapida di sole calorie.** ✅ *fatta*
- Un campo «350 kcal» e basta, senza nome né macro, per quando mangi fuori e
  non hai voglia di scomporre il piatto. Si salva come *Fuori casa*.
- Serve a non lasciare buchi: un giorno registrato male vale più di un giorno
  non registrato, perché la media resta vera.
- Bersaglio: **2 gesti. Centrato**: tocca *Solo calorie* (1), scrivi, tocca
  *Aggiungi* (2). Il campo prende il fuoco da solo, altrimenti ne sarebbero
  tre. Riscontro misurato in 62-68 ms con 200 ms di latenza.
- **Il nodo era la regola 5**, non l'interfaccia. Salvare i macro a zero
  perché la colonna non può essere vuota è inventare tre numeri: zero grammi
  di proteine e «non lo so» sono cose diverse, e le barre direbbero una cosa
  falsa. Quindi il pasto se lo porta scritto (colonna `only_kcal`) e chi
  legge i totali lo dichiara: una riga sotto i riquadri, una nel foglio *Da
  dove arriva*, una nel testo che si manda al personal trainer — che è chi
  rischia di più di concludere che quella settimana hai mangiato poche
  proteine.
- Detta **una volta sola** e non su ogni macro (regola 8), in grigio e non in
  rosso: non è un guasto e non è un fuori target. Misurato: `rgb(110,110,115)`,
  contrasto 5,07:1 in chiaro e 6,16:1 in scuro.
- L'anello delle calorie resta esatto, ed è il punto: le calorie si sanno.

**Fase 5 — Trovare un prodotto che non hai in archivio.**
- Ricerca per nome su Open Food Facts: gratis, senza chiave, 263.566 prodotti
  italiani, ed è lo stesso archivio su cui è costruita Yuka.
- **Prima la ricerca per nome, non lo scanner.** La ricerca non ha bisogno di
  niente di nativo e gira oggi; lo scanner su iOS vuole un plugin Capacitor,
  Xcode e i permessi — cioè la parte cara, per una comodità.
- Ripiego quando la scheda del prodotto è incompleta (capita, è
  collaborativo): la foto dell'etichetta va già in chat, e *Incolla da
  Claude* legge la tabella nutrizionale.
- Bersaglio: **3 gesti**, e almeno 7 prodotti su 10 del tuo carrello trovati
  **con i valori nutrizionali compilati** — da misurare per prima cosa, non
  da dare per buono.
- Il confronto con le alternative a pagamento e i dettagli stanno nella
  sezione 6-sexies.

**Fase 6 — Ricordarsi che l'app esiste.** *(da valutare)*
- Il problema smette di essere l'attrito e diventa la memoria: se non apri
  l'app, non c'è gesto da abbassare.
- Widget in schermata Home con quanto resta, oppure una notifica agli orari
  dei pasti. Con Capacitor il widget è un pezzo nativo vero (Swift +
  WidgetKit), la notifica locale è un plugin.
- Da fare **solo se** dopo le fasi 0–4 i giorni registrati non salgono: se il
  problema è l'attrito, una notifica in più non lo risolve, lo maschera.

### Come si misura se ha funzionato

Il dato ce l'abbiamo già, e non richiede niente di nuovo: lo Storico calcola
**giorni registrati su giorni conclusi**. È la metrica onesta di questa app.

- Oggi: da stabilire come punto di partenza prima della Fase 0.
- Dopo le fasi 0–2: l'obiettivo è **5 giorni su 7 registrati per quattro
  settimane di fila**.
- Se dopo la Fase 2 il numero non si muove, il problema non erano i gesti e
  il piano va rifatto invece che proseguito.

Vale anche il contrario: se dopo la Fase 1 il numero sale già, le fasi 4 e 5
possono restare dove sono. **Meno funzioni che si usano batte più funzioni che
non si aprono.**

## 6-quater. Niente entra senza poter essere corretto: l'inventario

La regola 3 dice che tutto quello che si registra si corregge e si toglie.
Vale per i pasti e per le serie, ma la regola non parla di *pasti*: parla di
**tutto quello che inserisci**. Contato riga per riga sul codice, tre tabelle
su sei non si toccano affatto dall'app.

| Cosa | Inserire | Correggere | Togliere |
|---|---|---|---|
| Pasto | ✅ | ✅ nome, quantità, momento e tutti i macro | ✅ con annulla |
| Serie di allenamento | ✅ | ✅ carico e ripetizioni | ✅ con annulla |
| Seduta | ✅ | ❌ non si cambia data né giornata | ✅ con annulla |
| Cibo rapido | ✅ | ✅ | ✅ con annulla |
| **Esercizio del programma** | ❌ solo dal seed | ❌ | ❌ |
| **Target giornalieri** | ❌ stanno nel codice | ❌ | ❌ |

Le tre righe in fondo hanno tutte lo stesso effetto pratico: per cambiare una
cosa che cambia davvero nella vita serve un deploy, o peggio un `db:seed` —
che **cancella a cascata lo storico di allenamento**.

### In ordine di quanto si sente

- [x] **Correggere un pasto per intero.** Fatto. Prima si potevano cambiare
      solo quantità e momento, e andava bene finché i numeri venivano dai
      tasti rapidi, letti sulla confezione. Da quando arrivano anche da una
      stima incollata da una chat non basta più: se la stima sbaglia di
      trenta calorie, riscalare la quantità sposta l'errore invece di
      toglierlo. Nome e macro stanno dietro a un tocco, così il caso
      frequente — mezza porzione — resta a portata di pollice.
- [x] **Cibi rapidi: aggiungere, correggere, togliere.** Fatto, in *Piano →
      I tuoi alimenti*. Con il verso che conta: **«salva fra i tasti rapidi»**
      su un pasto appena inserito, che trasforma un incollaggio in un tasto
      riusabile. L'archivio cresce mangiando, non scaricando — ed è per
      questo che un archivio esterno resta una comodità e non una
      dipendenza.
- [x] **Esercizi del programma: cambiare serie e ripetizioni, aggiungere,
      togliere, riordinare.** Fatto da *Piano → Cambia la scheda*, incollando
      la scheda nuova. Resta fuori **rinominare**: un nome diverso viene letto
      come "esercizio vecchio fuori, nuovo dentro", quindi la progressione
      riparte da zero. È voluto finché non c'è modo di dire "questo è lo
      stesso esercizio con un altro nome" — indovinarlo sarebbe peggio.
- [x] **Target giornalieri modificabili.** Fatto: tabella `targets` e
      schermata *Piano → Cambia gli obiettivi*. Resta aperto il `valido_da`,
      descritto in 6-septies.
- [~] **Seduta: cambiare data.** Fatto metà: la **data** si corregge dal
      dettaglio della seduta, quindi una seduta dimenticata si può registrare
      a posteriori. Il campo non lascia scegliere oltre oggi.

      La **giornata del programma** resta non modificabile, e di proposito:
      decide quali esercizi ci sono, e spostarla dopo aver registrato dei
      carichi lascerebbe le serie attaccate a esercizi di un'altra giornata.
      Meglio non poterlo fare che poterlo fare male. Se apri la giornata
      sbagliata resta lo *Scarta*, che era già lì.

## 6-quinquies. Cambiare scheda e obiettivi da solo, senza sporcare lo storico

> «Quando cambiano gli obiettivi, o il PT mi manda altri esercizi, voglio
> essere autonomo. Do a un'AI i documenti nuovi, l'app mi dice in che formato
> li vuole, si può fare undo, e quando si va avanti non ci devono essere
> sporcizie dal vecchio al nuovo o dal nuovo al vecchio.»

È lo stesso giro di *Incolla da Claude*, applicato al programma invece che a
un pasto: l'app dà il formato, tu dai i documenti del PT a una chat, riporti
indietro la risposta, guardi cosa cambia e confermi. Cambia però la posta in
gioco — un pasto sbagliato è un pasto, una scheda sbagliata sono mesi di
carichi.

### Perché oggi non si può, in una riga

`workout_sets` punta a `workout_exercises` con **ON DELETE CASCADE**, e
`workout_exercises` punta a `workout_days` con lo stesso vincolo. Sostituire
il programma cancella gli esercizi, e con loro **tutte le serie registrate**.
Per questo `db:seed` si rifiuta di partire se trovi serie in archivio, e
`--forza-allenamento` le cancella: non è prudenza, è l'unica cosa che poteva
fare senza uno schema diverso.

### La regola che deve reggere: niente si cancella, si archivia

Un esercizio che ha serie registrate **non si elimina mai**. Esce dal
programma corrente e resta nell'archivio, così i carichi di marzo si leggono
anche se a settembre quell'esercizio non lo fai più.

Serve una colonna sola: `workout_exercises.archiviato_il` (nullo = è nel
programma di adesso). Cambia di conseguenza chi legge:

- la seduta e la scheda mostrano solo i non archiviati;
- lo storico e il dettaglio di una seduta passata li mostrano tutti, perché
  raccontano quello che è successo, non quello che si fa adesso;
- il confronto «meglio dell'ultima volta» continua a funzionare, perché gli
  identificativi non cambiano.

**È questa la risposta a "niente sporcizie".** Non un'operazione di pulizia
fatta bene: uno schema in cui la sporcizia non può nascere, perché nessuna
riga viene riscritta o buttata.

### Come deve andare, passo per passo

1. **L'app dà il formato.** Come per i pasti: un prompt da copiare, che si
   porta dietro la scheda com'è adesso — così la chat sa cosa sta
   sostituendo e può dire «questo esercizio resta uguale».
2. **Si incolla la risposta.** JSON con giornate, esercizi, serie,
   ripetizioni, e i target giornalieri se cambiano anche quelli.
3. **Prima di toccare niente, si vede il confronto.** Riga per riga, in tre
   gruppi: **restano uguali**, **cambiano** (con il valore vecchio accanto al
   nuovo), **escono dal programma** (e per ognuno: quante serie hai
   registrato, cioè quanto storico stai mettendo da parte). Più gli
   **aggiunti**. Niente si scrive finché non hai letto questa schermata: è la
   stessa ragione per cui i pasti stimati si confermano prima di salvare.
4. **Si applica tutto insieme o niente.** Una transazione sola: se salta a
   metà, il programma vecchio è ancora quello buono. Senza, un cambio
   interrotto lascia una scheda mezza vecchia e mezza nuova, che è
   esattamente la sporcizia da evitare.
5. **L'undo riporta indietro tutto il cambio.** Non esercizio per esercizio:
   un'unica azione che rimette il programma com'era, archiviati compresi.
   Costa una fotografia del prima da tenere da parte — la stessa cosa che fa
   già `deleteSession` col suo `SessionBackup`.

### Dove va messo

Una schermata sua, dentro **Piano**: è lì che stanno i target e le regole del
PT, ed è la schermata che si apre quando qualcosa è cambiato — non il diario,
che si apre tutti i giorni. Il cambio di scheda capita ogni qualche mese: non
deve costare niente al gesto quotidiano.

### In che ordine, e cosa si può già fare prima

Il pezzo grosso è il punto 3 (il confronto) e il punto 5 (l'undo del cambio).
Ma due cose si possono fare subito e valgono da sole:

- [x] **Target giornalieri modificabili.** Fatto, e ha richiesto più della
      mezza giornata stimata: la tabella è la parte breve, filare i target
      attraverso undici punti è il resto.
- [x] **`archiviato_il` sugli esercizi** (e sulle giornate, che avevano lo
      stesso problema con le sedute). Fatto: la scheda e la seduta mostrano
      solo i non archiviati, lo storico e il dettaglio di una seduta passata
      li mostrano tutti. Il `db:seed` ha smesso di cancellare: archivia.
- [x] **Prompt + incolla + confronto + applica in transazione.** Fatto:
      *Piano → Cambia la scheda*. Il prompt si porta dietro la scheda di
      adesso e dice di tenere gli stessi nomi, perché un nome riscritto
      diverso spezzerebbe in due la progressione dei carichi. Il confronto dei
      nomi ignora maiuscole e accenti per la stessa ragione.

      Sulla transazione c'era un ostacolo vero: `neon-http` **non ha**
      `db.transaction()` (lancia), ha `db.batch()`; `node-postgres`, quello
      con cui si prova in locale, ha l'opposto. Senza un adattatore la prova
      locale non avrebbe detto niente su quello che succede in produzione.
      Sta in `src/db/transazione.ts`, e le istruzioni si costruiscono
      sull'esecutore che arriva come argomento — costruirle fuori le farebbe
      finire su un'altra connessione del pool, fuori dalla transazione, senza
      dire niente.
- [x] **Undo del cambio scheda**, con la fotografia del prima. Fatto:
      un'azione sola che rimette tutto com'era, archiviati compresi. Gli
      esercizi nati dal cambio si tolgono (sono di pochi secondi prima e non
      hanno serie sopra), tutti gli altri tornano ai valori della fotografia.
      Le serie registrate non si toccano in nessuna delle due direzioni.

### Come si misura che è andata bene

Una prova sola, e deve passare per intero: si registrano delle serie, si
cambia scheda togliendo l'esercizio che le ha, e **dopo il cambio quelle
serie si leggono ancora** — nel dettaglio della seduta e nella progressione.
Poi si fa undo e il programma torna identico a prima, campo per campo.
Finché questa prova non esiste, la funzione non esiste.

## 6-sexies. Trovare un prodotto da solo: quali API esistono, davvero

Cercate a settembre 2026. La conclusione è corta: **una sola vale la pena, e
le altre non sono un ripiego, sono fuori scala.**

### Open Food Facts — questa

- **Gratis, senza chiave.** Nessuna variabile d'ambiente da configurare,
  nessun conto a consumo. A differenza dell'idea dell'API di Claude che
  avevamo scartato, qui non c'è niente da pagare e niente da ricordarsi.
- **263.566 prodotti italiani** in archivio (il totale mondiale ha superato i
  4 milioni).
- **È il database su cui è costruita Yuka**, e un'altra centinaia di app. La
  domanda «come fa Yuka» ha come risposta «usa questo».
- Chiamata: `GET world.openfoodfacts.org/api/v2/product/{ean}.json`.
  Torna `product_name`, `brands`, `quantity`, e `nutriments` con i valori per
  100 g **e** per porzione, più Nutri-Score, ingredienti e immagini.
- C'è anche la **ricerca per nome**, che è la parte che ci interessa di più
  (sotto il perché).
- Licenza ODbL: i dati si possono usare e ridistribuire citando la fonte.
- Chiedono un `User-Agent` che dica chi sei. Va messo, è buona educazione e
  costa una riga.

**Il difetto, ed è vero:** è collaborativo, quindi la completezza varia da
prodotto a prodotto. Alcune schede hanno la foto ma non i valori. Non è un
motivo per scartarlo — è il motivo per cui il ripiego serve sempre, e il
ripiego ce l'abbiamo già: la foto dell'etichetta va in chat e *Incolla da
Claude* legge la tabella nutrizionale.

### Le altre, e perché no

| | Perché no |
|---|---|
| **Nutritionix** | Ottimo su prodotti confezionati e catene di ristoranti, ma **da 1.850 $/mese** e centrato sugli Stati Uniti. |
| **Edamam** | Ha anche il testo libero, ma il piano gratuito è molto limitato e si arriva a **999 $/mese**. Il testo libero ce l'abbiamo già gratis. |
| **FatSecret** | Copertura internazionale buona e ha il codice a barre, ma serve un contratto commerciale. |
| **USDA FoodData Central** | Gratis e serio, ma **niente codice a barre** e cibi americani: inutile per lo scaffale di un supermercato italiano. |
| **API di MyFitnessPal** | Non è pubblica. Non è un'opzione. |

Per un'app che usa una persona sola, pagare da 999 a 1.850 dollari al mese
per sapere quante calorie ha uno yogurt è fuori discussione.

### La parte che nessuno si aspetta: la ricerca viene prima della fotocamera

L'istinto dice «serve lo scanner del codice a barre». Contando il lavoro,
conviene il contrario:

- **La ricerca per nome non ha bisogno di niente di nativo.** Un campo, una
  chiamata, una lista, si tocca il prodotto e diventa un tasto rapido. Gira
  nel browser, gira dentro Capacitor, gira oggi.
- **Lo scanner sì.** Su iOS `BarcodeDetector` non esiste nel WebView: serve
  un plugin Capacitor per la fotocamera, quindi Xcode, un Mac e i permessi
  iOS nel progetto. È la parte cara, ed è cara per una comodità — digitare
  tredici cifre è brutto ma funziona.

Quindi l'ordine giusto è: **prima la ricerca, poi il codice digitato a mano,
e lo scanner solo se i primi due si rivelano scomodi all'uso.** Così
l'«aggiunta dinamica dei prodotti» arriva senza toccare il guscio iOS.

### I passi

- [x] **Cerca un prodotto per nome** dentro *Aggiungi*: campo, risultati con
      marca e kcal per 100 g, si tocca, si scelgono i grammi e finisce nel
      diario. Fatto: `CercaProdotto`, fra *Incolla da Claude* e *Solo
      calorie* — stesso ordine "prima la via che costa meno tocchi".

      La chiamata parte dal server (`cercaProdotto` in `src/app/actions.ts`),
      con `User-Agent` come richiesto da Open Food Facts. La risposta passa
      da un'unica porta che valida (`normalizzaProdottiOFF` in
      `src/lib/openfoodfacts.ts`, coperta da test): un prodotto senza
      calorie si scarta, uno senza tutti i macro si segna *incompleto*
      invece di far finta che siano zero (regola 6). I valori restano "per
      100 g" finché non scegli i grammi — poi si vedono i macro calcolati e
      si conferma, la stessa regola di "Incolla da Claude" (regola 12).

      **Non è stato possibile provare una ricerca che restituisce
      risultati veri.** Il proxy di rete di questo ambiente blocca
      `world.openfoodfacts.org` (lo dice già questo file, qualche riga
      sopra): ogni chiamata finisce nel ramo d'errore. Quel ramo è stato
      provato per davvero nel browser, a 320 e 390 px, chiaro e scuro: il
      messaggio compare in italiano, senza rosso (rgb 110,110,115, contrasto
      5,07:1 — lo stesso grigio già validato altrove in quest'app), il testo
      resta nel campo e si può correggere e riprovare, e sotto le tre
      lettere la ricerca non parte nemmeno. La lettura della risposta vera
      (forma dei campi, quanti prodotti hanno i macro compilati) resta da
      fare con una chiamata reale, fuori da questo ambiente, prima di
      considerarla verificata davvero.

      **Aggiornamento, settembre 2026**: l'endpoint usato sopra
      (`world.openfoodfacts.org/cgi/search.pl`) ha smesso di rispondere —
      503 a livello globale, segnalato da più progetti esterni che lo usano
      (non un problema di questo repo). Open Food Facts lo ha dismesso in
      favore di *Search-a-licious*, il nuovo servizio di ricerca su
      `search.openfoodfacts.org/search`. `cercaProdotto` ora chiama quello
      (`q`, `index=off`, `page_size`, `fields`), e `normalizzaProdottiOFF`
      legge la chiave `hits` che usa il nuovo servizio, tenendo `products`
      come ripiego per non ripetere questo giro se Open Food Facts cambia
      ancora. La ricerca per codice a barre non è toccata: usa un endpoint
      diverso, mai stato giù.

      Anche questa volta non è stato possibile chiamare il servizio vero da
      qui — il proxy di rete blocca ogni sottodominio di openfoodfacts.org,
      non solo `world.`. Verificato però tutto il resto della catena contro
      un server locale che risponde con la forma documentata di
      Search-a-licious (`{"hits": [...]}`, due prodotti come nella prova
      precedente): la ricerca mostra entrambi i risultati con macro e
      "incompleti" giusti, scegliere 150 g del prodotto completo mostra 146
      kcal (97 kcal/100 g arrotondate), il tasto rapido salvato finisce
      nella tabella con quei valori scalati e la porzione "150 g", *Aggiungi*
      scrive lo stesso pasto nel diario — controllato riga per riga sul
      database. Provato anche il ramo d'errore (risposta non-2xx): il
      messaggio "Open Food Facts non risponde. Riprova tra poco." compare
      invariato.

      **Confermato in produzione, stesso giorno**: la ricerca vera trova
      prodotti reali con i macro giusti. L'ipotesi sulla forma dei campi
      di Search-a-licious, fatta senza poterla chiamare da qui, era quella
      giusta.
- [x] **Salvalo come tasto rapido**, con la porzione che usi tu. È il punto
      in cui l'archivio smette di essere quello del seed e diventa il tuo —
      e si incastra con il punto «cibi rapidi modificabili» di 6-quater.
      Fatto: nel foglio dei grammi di `CercaProdotto`, lo stesso bottone
      tratteggiato *Salva fra i tasti rapidi* già usato per un pasto appena
      corretto (`edit-meal-sheet.tsx`) — stessa `addQuickFood`, nessuna
      azione nuova. I valori salvati sono quelli già scalati sui grammi
      scelti, con quella porzione scritta a fianco (`"150 g"`), non "per
      100 g": un tasto rapido deve dire quanto vale un tocco, non quanto
      vale un etto. Cambiare i grammi dopo aver salvato riattiva il
      bottone, perché "salvato" appartiene a quella porzione, non al
      prodotto in generale.

      Verificato per intero nel browser vero, ma non contro Open Food
      Facts — irraggiungibile da questo ambiente (v. sopra) — bensì contro
      un server locale che risponde con la stessa forma documentata: due
      prodotti, uno con tutti i macro e uno con i grassi mancanti. Provato
      dal vivo: i risultati compaiono, il secondo si marca *macro
      incompleti*, i grammi scalano il numero giusto (150 g di un prodotto
      a 57 kcal/100 g → 86 kcal, arrotondato), il tasto rapido salvato
      finisce davvero nella tabella `quick_foods` con i valori scalati e la
      porzione corretta, e *Aggiungi* scrive comunque il pasto nel diario
      con la quantità scelta in quel momento (200 g, indipendente dai 150 g
      già salvati come tasto rapido) — controllato riga per riga sul
      database, non solo a schermo. Resta da confermare, quando la rete lo
      permetterà, che la vera risposta di Open Food Facts abbia davvero
      questa forma per i prodotti reali.
- [x] **Codice a barre digitato a mano**, per quando il nome non basta a
      distinguere due varianti dello stesso prodotto. Fatto: dentro
      `CercaProdotto`, un tocco su *Hai il codice a barre?* apre un campo
      numerico al posto del nome — dietro un tocco in più apposta, perché
      serve solo nel caso raro. Valida la lunghezza (8, 12, 13 o 14 cifre:
      EAN-8/UPC-12/EAN-13/GTIN-14) prima di partire, così un codice a metà
      non spreca un giro di rete. Trovato un solo prodotto (l'endpoint per
      codice di Open Food Facts ne restituisce sempre al più uno), si salta
      dritto al foglio dei grammi — un codice a barre identifica una cosa
      sola, non serve un elenco. La normalizzazione della risposta riusa la
      stessa funzione della ricerca per nome (`leggiProdotto`, in
      `src/lib/openfoodfacts.ts`), così le due strade non possono
      divergere su cosa vuol dire "prodotto valido".

      Anche qui non è stato possibile provare contro Open Food Facts vero
      (rete bloccata in questo ambiente), ma il percorso intero è stato
      provato nel browser contro un secondo server locale che risponde
      nella forma documentata dell'endpoint per codice (`status: 1` con
      prodotto, `status: 0` senza): un codice incompleto non cerca, solo le
      cifre entrano nel campo, un codice valido ma sconosciuto mostra
      l'errore in italiano, uno valido e trovato salta al prodotto giusto
      (verificato il nome a schermo), e tornando indietro si resta nella
      stessa modalità invece di ripartire dal nome. Provato anche a 320px
      scuro: bersagli e contrasto del link a posto.
- [x] **Scanner con la fotocamera**, solo dopo, e solo se serve davvero — l'ha
      chiesto l'utente, quindi "davvero" è arrivato.

      La soluzione scartata a suo tempo (`BarcodeDetector`, che non esiste
      nel WebView di iOS) non era la sola strada: `@capacitor/barcode-scanner`
      -- ufficiale del team Capacitor, gratis, MIT -- apre la fotocamera
      nativa (Vision di Apple su iOS) bypassando del tutto il problema del
      WebView. Compatibile con Swift Package Manager: si incastra nel
      progetto iOS di questo repo (Capacitor 8, niente CocoaPods) senza
      toccare `ios.yml` oltre a una riga.

      Il tasto "Scansiona con la fotocamera" sta dentro *Cerca un prodotto →
      Hai il codice a barre?*, sopra il campo per scriverlo a mano — che
      resta, per quando la fotocamera non serve o non c'è. Il risultato
      dello scan passa dallo stesso `barcodeValido` e dalla stessa
      `cercaProdottoPerBarcode` di sempre: nessuna porta nuova. Annullare la
      scansione non mostra un errore (regola 8): sia il ramo web sia quello
      nativo del plugin rifiutano con lo stesso testo ("...cancelled") in
      quel caso, e il codice lo riconosce.

      Un'aggiunta che il codice web non richiedeva da solo:
      `ios/` non è nel repo — viene rigenerato da zero a ogni build — quindi
      il permesso della fotocamera (`NSCameraUsageDescription`) va scritto
      nel workflow, non nel progetto. Senza, iOS chiude l'app di colpo alla
      prima richiesta di accesso alla fotocamera invece di mostrare il
      permesso: non un avviso, un crash garantito. Aggiunta una riga a
      `ios.yml` con `PlistBuddy` subito dopo `cap add ios`.

      **Verificato quello che si può da qui, non la lettura vera.** Questo
      ambiente non ha una fotocamera, ma Chromium accetta un video finto
      (`--use-file-for-fake-video-capture`): con quello si è aperta
      davvero la fotocamera del plugin (stesso `CapacitorBarcodeScanner
      .scanBarcode()` che chiama l'app, non un mock), verificato che il
      video parte (`readyState`, `paused`), che annullare non mostra un
      errore, e che il campo a mano resta scrivibile dopo — a 320/390px,
      chiaro e scuro. Il bersaglio del tasto è ≥44px anche a 320px. Non si è
      riusciti a far *leggere* un codice a barre vero al video finto (un
      problema di orientamento nella codifica sintetica del fotogramma, non
      del codice dell'app — un video finto non è una fotocamera vera).
      **La lettura di un codice a barre reale resta da provare su un
      iPhone vero**, con una build IPA: non c'è altro modo di saperlo per
      certo.
- [x] **Il dialogo della fotocamera fuori dalla shell nativa faceva un po'
      schifo.** Segnalato a voce. `@capacitor/barcode-scanner`, nel ramo web
      (fuori dall'app, o se il plugin nativo non parte), disegna da solo un
      riquadro con sfondo quasi bianco fisso (`#fefefe`), un bordo grigio e
      una "×" di 28px senza bersaglio — letto nel suo sorgente, non solo
      visto: ignora lo scuro e le regole di questa app a prescindere da
      cosa gira intorno. Dentro la shell nativa iOS scansiona invece la
      fotocamera di sistema (Vision di Apple), che questo punto non tocca.

      Non si può cambiare il markup della libreria (niente `aria-*`, un
      `<span>` al posto di un `<button>` per chiudere): sistemato quello che
      il CSS può raggiungere, in `globals.css`. Il riquadro prende i colori
      di superficie dell'app (bianco in chiaro, `#1c1c1e` in scuro), angoli
      arrotondati e l'ombra `--shadow-card` come le altre schede; la "×"
      diventa un bersaglio vero di 44×44px con lo stato attivo della curva
      `--ease-ios`. Il suo `<style>` viene iniettato nell'head solo al primo
      tocco su *Scansiona*, quindi dopo il nostro: a parità di specificità
      avrebbe vinto lui, e i selettori del blocco nuovo passano dall'id del
      dialogo apposta per stare sempre avanti senza `!important`. Trovato
      anche un difetto vero della libreria, non nostro: il paragrafo delle
      istruzioni resta sempre vuoto (`&nbsp;`), il testo che le passiamo
      (`scanInstructions`) non viene mai scritto dentro — verificato
      leggendo `web.js` della versione installata. Il testo vero
      ("Inquadra il codice a barre del prodotto") arriva da un `content`
      CSS: non è selezionabile, e non tutti i lettori di schermo lo
      leggono — un limite di questa soluzione, scritto qui e non nascosto.

      Verificato per davvero, non solo letto: Chromium con una fotocamera
      finta (`--use-fake-device-for-media-stream`, un file `.y4m` sintetico
      a 1280×720 — sotto ai 576px di altezza richiesti la libreria rifiuta
      la fotocamera con `OverconstrainedError`, trovato provandolo). Il
      video parte davvero (`readyState` 4, non in pausa), lo sfondo del
      riquadro è bianco in chiaro e `rgb(28, 28, 30)` in scuro (letto con
      `getComputedStyle`, non assunto), il bersaglio della "×" misura
      44×44px, chiudere e riaprire una seconda volta funziona, e il campo
      per scrivere il codice a mano resta scrivibile dopo. Contrasto del
      testo delle istruzioni calcolato: 5,07:1 in chiaro, 6,16:1 in scuro —
      sopra la soglia di 4,5:1. `npm run e2e`: 162 controlli, tutto a posto.

### Due cose da sapere prima di scriverne una riga

1. **Da questo ambiente non si può provare.** Il proxy di rete blocca
   `world.openfoodfacts.org`, `api.nal.usda.gov` e `platform.fatsecret.com`:
   verificato, tutti e tre rispondono con connessione rifiutata. Quindi
   nessuna delle affermazioni qui sopra sulla *forma* della risposta è stata
   provata sul campo — vengono dalla documentazione. La prima cosa da fare,
   quando si comincia, è una chiamata vera con tre prodotti che compri
   davvero, e guardare quanti hanno i valori nutrizionali compilati.
2. **La chiamata va fatta dal server**, non dal telefono: così passa dal
   nostro dominio, non espone niente, e in futuro si può mettere in cache un
   prodotto già cercato invece di richiederlo ogni volta.

## 6-septies. Tutto è dato, niente è codice

> «In tutti i processi devo essere pienamente autonomo di modificare kcal,
> allenamento, acqua, vitamine e cibo nel database: aggiungere, togliere,
> modificare.»

È il principio che tiene insieme 6-quater, 6-quinquies e 6-sexies, e vale la
pena scriverlo una volta sola, per esteso:

**Ogni cosa che nella vita può cambiare deve essere una riga di database, non
una riga di codice.** Se per cambiarla serve un deploy — o peggio un
`db:seed` — non è configurabile: è cablata. E una cosa cablata, il giorno che
il PT cambia idea, diventa un motivo per non aggiornare l'app invece che uno
per aprirla.

### Lo stato, riga per riga

| Cosa | Dove sta oggi | Aggiungere | Correggere | Togliere |
|---|---|---|---|---|
| **Cibo** (tasti rapidi) | database | ✅ | ✅ | ✅ con annulla |
| **Acqua** (bicchieri al giorno) | database | ✅ | ✅ (il "meno") | ✅ (il "meno") |
| **Obiettivo acqua** | database (`targets`) | ✅ | ✅ | — (c'è sempre) |
| **Passi** (al giorno) | database | ✅ | ✅ | ✅ (cancella il campo) |
| **Obiettivo passi** | database (`targets`) | ✅ | ✅ | — (c'è sempre) |
| **Target kcal e macro** | database (`targets`) | ✅ | ✅ | — (c'è sempre) |
| **Allenamento** (giornate ed esercizi) | database | ✅ incollando | ✅ | ✅ archivia, con annulla |
| **Vitamine e integratori** | database (`supplements`) | ✅ | ✅ | ✅ dal diario, con annulla |

### Le vitamine: cosa sono, qui dentro

Non sono cibo e non vanno nei pasti. Non hanno macro, non entrano nel budget
calorico, e la domanda a cui rispondono è un'altra: **«l'ho presa oggi?»**,
non «quanto mi resta».

Quindi seguono la forma dell'acqua, non quella del cibo: un elenco di cose da
prendere — definito da te, modificabile — e una spunta al giorno per
ciascuna. Con lo stesso vincolo dell'acqua: **se chiedesse di scegliere
dosaggi e orari costerebbe più di quanto vale, e non la si segnerebbe.**

Due tabelle: gli integratori (nome, dose come testo libero, attivo sì/no) e
le spunte per giorno. Una riga in cima al diario, sotto l'acqua, che compare
solo se hai definito almeno un integratore — chi non li prende non deve
vedere una riga vuota tutti i giorni.

### In che ordine, dal più economico

Sono ordinati per costo, non per importanza: le prime due sono mezze
giornate, l'ultima è la più grossa di tutta la roadmap.

- [x] **Obiettivo acqua modificabile.** Fatto: stessa schermata dei target,
      perché è la stessa riga di database.
- [x] **Target kcal e macro modificabili.** Fatto: tabella `targets` (una
      riga sola), schermata *Piano → Cambia gli obiettivi*, e i numeri letti
      da lì in undici punti che prima leggevano una costante. **Non era la
      mezz'ora scritta qui sopra**: la tabella è la parte breve, filare i
      target attraverso anello, barre, storico, riepilogo e acqua è il resto.
      La stima sbagliata è rimasta scritta apposta.

      Fuori: se la lettura fallisce valgono i predefiniti invece di una
      schermata bianca; un numero fuori scala viene spiegato e blocca il
      salvataggio, ma i macro che non tornano al grammo con le calorie
      vengono solo segnalati — una dieta può avere un margine voluto, e
      un'app che rifiuta i numeri del PT si fa scavalcare.
- [x] **Vitamine e integratori.** Fatto, e come previsto qui sopra: due
      tabelle (`supplements` e `supplement_checks`), una riga nel diario sotto
      l'acqua, una schermata *Piano → I tuoi integratori*.

      Una scelta che vale la pena sapere: il cestino **non** fa una DELETE.
      Le spunte hanno una chiave esterna con `ON DELETE CASCADE`, quindi
      eliminare davvero un integratore porterebbe via tutti i giorni in cui
      l'hai preso — la stessa trappola descritta in 6-quinquies per la scheda
      di allenamento, vista prima di pagarla. Il tasto si chiama *Non lo
      prendo più* e fa quello: sparisce dal diario, lo storico resta, e da
      *Riprendi* torna com'era.

      Misurato: la riga sta sopra la piega a 390×844 (finisce a 804 px) ma
      **non** su 320×568, dove serve uno scorrimento. Lì sotto la piega ci
      finisce già l'acqua (632 px), quindi non è una cosa che introducono gli
      integratori: è la prima schermata che è lunga. Vale un giro a parte, non
      un rattoppo qui.
- [x] **La prima schermata su un telefono corto.** Misurato su 320×568:
      l'acqua finisce a 632 px e gli integratori a 804, quindi entrambi
      chiedono uno scorrimento che su 390×844 non serve. Non era un bug di
      una singola scheda, era la somma: giorno, striscia, anello, tre
      riquadri, acqua, integratori. Chiesto (26 settembre) su che telefono
      gira davvero: uno standard o più grande, quindi 844px o più. Chiuso
      senza toccare codice — la misura di 320×568 non riguarda questo
      telefono.
- [x] **Allenamento modificabile.** Fatto, e il nodo era davvero quello
      previsto: `ON DELETE CASCADE` fra serie ed esercizi. Risolto con
      `archiviato_il` invece che con una pulizia fatta bene — uno schema in
      cui la sporcizia non può nascere, perché nessuna riga viene riscritta o
      buttata.

### La regola che vale per tutte

Quando una di queste diventa modificabile, **i dati già registrati non si
riscrivono.** Un target cambiato a settembre non cambia se a marzo eri in
target: le statistiche di marzo vanno lette col target di marzo. Vale lo
stesso per gli esercizi archiviati e per i valori di un alimento corretto —
ed è già così per i pasti, perché quando aggiungi un cibo rapido al diario i
numeri vengono **copiati** nella riga del pasto, non riferiti.

**Questa regola i target la violano, oggi.** La tabella `targets` ha una riga
sola: cambiare i numeri a settembre riscrive la lettura di marzo, e «giorni
entro il target» nello Storico si ricalcola all'indietro sul target nuovo. I
pasti registrati non si toccano — quelli restano come erano — ma il giudizio
su quei pasti sì.

Non è stato risolto subito di proposito: la correzione è un `valido_da` sulla
riga, quindi più righe e una lettura per data, e ogni statistica che oggi
chiede «il target» dovrebbe chiedere «il target di quel giorno». Vale la pena
farlo quando i target cambiano davvero una seconda volta e lo Storico ha mesi
dentro; farlo prima è pagare una complicazione per una storia che non c'è
ancora.

- [ ] **Target con data di validità.** `valido_da` sulla riga, lettura per
      giorno, statistiche che chiedono il target di quel giorno. Da fare al
      primo cambio vero di fase, non prima.

## 6-octies. Quello che non deve più toccare a te

- [x] **Applicare le migration.** Fatto: il workflow *Migrazioni* gira a ogni
      push su `main`. Prima il codice andava in produzione e il database
      restava indietro finché non lo aggiornavi a mano, e chi se ne accorgeva
      era l'utente con un errore su una colonna che non c'era. Serve il
      segreto `DATABASE_URL` nel repo, una volta sola.
- [ ] **Il seed dei dati iniziali** resta a mano, ed è giusto così finché
      cancella a cascata lo storico di allenamento (vedi 6-quinquies). Quando
      gli esercizi si archivieranno invece di sparire, anche questo potrà
      diventare automatico.
- [x] **Backup di Neon.** Fatto (vedi il punto 2, "Non perdere i dati") —
      questa voce era rimasta doppia dalla prima stesura della roadmap.

## 6-nonies. Non solo un telefono al centro di uno schermo grande

- [x] **Adattarsi al desktop, non solo restare mobile-first.** Segnalato a
      voce: aperta da un computer, l'app restava un rettangolo largo
      `max-w-md` (448px) incollato in mezzo allo schermo — la stessa
      schermata di un telefono, con tutto il resto vuoto intorno.

      Cercato online come fanno le app simili prima di scrivere codice: lo
      schema che torna è uno solo — un `<nav>` con due forme dallo stesso
      markup, non due componenti separati da tenere allineati a mano. Sotto
      una soglia (768px, la stessa che usano queste app: sotto è un
      telefono) resta la barra in basso; sopra si alza in corsia laterale,
      icona e etichetta affiancate invece che una sopra l'altra.

      **`TabBar`** è quel `<nav>`: le stesse quattro voci, `md:` le ridispone
      da riga a colonna e la sposta da `bottom-0` a `left-0`, largo `w-56`
      (224px). **`layout.tsx`** allarga il contenuto in due passi
      (`md:max-w-2xl`, `lg:max-w-3xl`) invece che in uno solo — uno schermo
      enorme con le stesse righe di testo di un telefono sarebbe scomodo da
      seguire quanto uno stretto, solo nell'altro verso. `globals.css` toglie
      lo spazio riservato in basso alla barra e lo sposta a sinistra, per la
      corsia — **solo `body:has(nav)`**, non `body` da solo: sul login la
      corsia non c'è (niente da navigare prima di essere dentro), e uno
      spazio a sinistra senza nessuno a giustificarlo spingerebbe la
      schermata di accesso fuori centro. Misurato prima di scriverlo così:
      con `body` da solo il riquadro del login finiva a x≈832 su 1440,
      invece che al centro vero, 720.

      Stessa ragione dietro `UndoToast` e `RestTimer`: sono `fixed inset-x-0`
      con dentro un `max-w-md` che si centra da solo — a schermo largo si
      centravano nel mezzo *dell'intero* schermo, non nella colonna di
      contenuto accanto alla corsia, galleggiando spostati a sinistra.
      `md:left-56` li allinea alla stessa colonna.

      **Cosa non è cambiato apposta.** Nessun ridisegno delle schermate in
      griglie multi-colonna da dashboard: i riquadri di Storico, Piano e
      Allenamento restano a due colonne fisse, verificato che allargare
      soltanto il contenitore attorno a loro (senza cambiare quante colonne
      hanno) già li stacca dal "rettangolo di telefono nel vuoto" senza
      stirarli né lasciarli sparsi. Un vero layout a più colonne è un
      progetto suo, non incluso qui.

      Verificato nel browser vero: 320/390px (telefono, invariato — barra in
      basso, nessuna corsia), 1024px (tablet, corsia già attiva) e 1440px
      (desktop), chiaro e scuro, su tutte e quattro le schermate principali
      più Alimenti, Fitbit e il login. Il login misurato centrato per
      davvero (`boundingBox`, non a occhio): centro a 720px su 1440, esatto.
      L'avviso di annullamento (cancellando un pasto) misurato allineato
      alla colonna di contenuto, non al centro dello schermo. typecheck,
      lint, test (466), build a posto. `npm run e2e`: 162 controlli, tutto a
      posto (le prove restano tutte a 320/390px, il telefono non è
      cambiato).

## 7. Cose che restano fuori, di proposito

Scritte per non riaprirle ogni volta.

- **Illustrazioni anatomiche degli esercizi.** Materiale su licenza: non si
  produce e non si copia.
- **Percentuali di "prontezza muscolare".** Un modello inventato che sembra
  una misura. Se un numero non lo puoi difendere, non lo mostri.
- **Istruzioni su come eseguire gli esercizi.** Le ha date il PT.
- **Database di cibi con codice a barre.** Richiede una fonte dati in
  licenza e trasforma l'app in un'altra cosa. I tasti rapidi bastano per una
  dieta che ha dodici alimenti ricorrenti.
- **Account e multiutente.** È un'app per una persona.

---

## Come si decide cosa fare dopo

Non a sensazione. Nell'ordine:

1. Qualcosa è **rotto o irrecuperabile** (sezioni 1–3)? Si fa quello.
2. Un gesto quotidiano **sfora il tetto** in `PRODOTTO.md`? Si abbassa.
3. Altrimenti non si tocca. Un'app piccola che fa bene sei cose vale più di
   una grande che ne fa venti a metà.
