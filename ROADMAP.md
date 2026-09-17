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
- [ ] **Deploy su Vercel** e rilancio con l'URL, così l'app funziona davvero.
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

- [ ] **Backup automatico.** Neon ha lo storico dei rami; va verificato che
      sia attivo sul piano gratuito e documentato come si recupera.
- [x] **Export dei dati.** Fatto. Piano → *I tuoi dati*: copia completa in
      JSON, oppure pasti e allenamenti in CSV che si aprono in Excel. Il CSV
      esce con BOM e CRLF, altrimenti Excel rompe le accentate. Provato
      scaricando davvero i tre file. Da verificare dentro l'app iOS: WKWebView
      tratta i download a modo suo.
- [ ] **Migration di rollback.** Oggi le migration vanno solo avanti: un
      errore su `db:migrate` si ripara a mano.

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
- [ ] **Ritentare le scritture fallite — pasti.** Il diario non ha ancora la
      stessa rete di sicurezza: se il salvataggio fallisce compare l'errore e
      il pasto è perso. Stesso meccanismo da portare lì.
- [ ] **Aprirsi senza rete.** Metà fatta. Se l'app è **già aperta** e il
      segnale cade — il caso normale in palestra, dove entri col segnale e lo
      perdi in sala pesi — ora continua a funzionare e non perde niente. Se
      invece la apri da chiusa senza rete, non parte affatto: per quello
      serve un service worker che tenga in cache il guscio dell'app. È il
      prossimo passo di questa voce.

## 4. Qualità che non si vede ma si sente

- [ ] **Test end-to-end nella pipeline.** Le prove col browser le ho fatte a
      mano a ogni modifica. Vanno messe in CI, altrimenti la prossima
      regressione la scopre l'uso.
- [ ] **Verifica dei contrasti automatica**, non a occhio: una regola che
      fallisce la build se un testo scende sotto 4.5:1.
- [ ] **Controllo dei bersagli tattili in CI**, per non riscoprire a mano i
      controlli sotto i 44 px (è già successo due volte).
- [ ] **Numeri di versione**: oggi l'IPA non ha una versione riconoscibile.
      Serve per sapere quale build hai sul telefono.
- [ ] **Aggiornare le azioni di GitHub.** Il primo giro ha avvisato che
      `checkout`, `setup-node` e `upload-artifact` puntano a una versione di
      Node in dismissione. Funzionano ancora (girano su una più nuova), ma
      prima o poi smetteranno.

## 5. Dati personali fuori dal codice

La repo è pubblica e contiene i tuoi target, la lista dei cibi e la scheda
del PT. Non sono credenziali, ma sono tuoi.

- [ ] **Spostare i dati personali nel database**, lasciando nel repo solo un
      file di esempio. Il codice diventa riusabile e la repo smette di
      raccontare la tua dieta.
- [ ] **Decidere sulla storia di git.** I dati sono in una decina di commit
      pubblici: toglierli da adesso non li toglie dal passato. O si riscrive
      la storia, o si accetta.

## 6. Comodità che mancano ancora

Nessuna è bloccante, tutte sono state pesate col metro dei gesti.

- [ ] **Acqua e passi.** Il PT chiede 3 litri e 10.000 passi al giorno, e
      l'app non li traccia: oggi le regole stanno nel Piano come testo.
- [ ] **Peso corporeo** con andamento nel tempo. Un numero al giorno,
      due tocchi.
- [ ] **Aggiungere un cibo ai tasti rapidi dall'app**, senza passare dal
      file di seed e da un comando.
- [ ] **Duplicare un giorno.** "Oggi ho mangiato come ieri" è comune e oggi
      costa un pasto alla volta.
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
- [ ] **Note sulla seduta.** "Spalla che tira" vale più di tre decimali sul
      carico.
- [ ] **Riordinare gli esercizi** della giornata, se in palestra la macchina
      è occupata.
- [x] **Quale giornata tocca.** Fatto: l'Allenamento apre su *Tocca a te* con
      la giornata successiva a quella dell'ultima seduta. Resta un
      suggerimento — le altre giornate sono tutte avviabili.

## 6-bis. Interfaccia: cosa resta dopo il confronto con Bevel

Ordinato per quanto cambia davvero l'uso. Il metro resta quello di
`PRODOTTO.md`: si aggiunge solo ciò che abbassa un costo in tocchi o rende
leggibile qualcosa che oggi non lo è.

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
- [ ] **La seduta è un muro di schede uguali.** Otto esercizi, otto
      rettangoli identici: quello che stai facendo adesso ha lo stesso peso
      visivo di quello fra quaranta minuti. L'idea è comprimere i finiti
      (titolo + riepilogo, niente campi) e tenere aperto solo quello in
      corso. Cambia il modo di usare la schermata, quindi va deciso guardando
      un prima/dopo, non a parole.
- [ ] **Card d'insight in linguaggio naturale sul diario.** Una riga che
      legge i numeri al posto tuo: "ti restano 1.390 kcal e 86 g di proteine —
      un petto di pollo e una colazione ci stanno". Oggi i numeri ci sono ma
      la sintesi la fai a mente. È la cosa che manca di più.
- [ ] **Etichetta qualitativa accanto ai numeri dello storico.** "−217 kcal"
      diventa "−217 kcal · sotto il target". Descrive, non giudica.
- [ ] **Schede a mezza larghezza affiancate** dove il contenuto è corto
      (giorni entro il target, media giornaliera).
- [ ] **Heatmap del mese** nello storico, tipo calendario, con quanti giorni
      sei stato in target: oggi si vedono sette o trenta colonne, ma non si
      coglie il mese a colpo d'occhio.
- [ ] **Data toccabile nell'intestazione** che apre un selettore, invece delle
      sole frecce. La striscia della settimana copre già i sette giorni
      vicini; serve per andare più indietro.
- [ ] **Il volume dovrebbe contare due manubri?** Oggi il volume è quello che
      scrivi per ripetizioni, quindi sugli esercizi con i manubri conta un
      braccio solo. È coerente settimana su settimana, quindi la progressione
      si legge lo stesso, ma il totale di seduta mescola mezzi carichi e
      carichi interi. Raddoppiarlo cambierebbe anche i numeri già registrati:
      da decidere, non da fare di nascosto.
- [ ] **Export filtrato per date.** Oggi *I tuoi dati* scarica tutto lo
      storico. Per mandare una settimana sola serve aprire il CSV e tagliarlo
      a mano.
- [ ] **Separatore decimale dei macro.** I chili usano la virgola
      (`formatWeight`), i macro il punto (`formatMacro`): "12,5 kg" e
      "C 230.6" nella stessa schermata. Da uniformare sulla virgola.
- [ ] **Dati da Apple Watch o Fitbit.** Le calorie bruciate e i passi
      renderebbero il budget giornaliero vero invece che fisso. Costa parecchio:
      per Apple Health serve un plugin HealthKit dentro il guscio Capacitor,
      Xcode e un account sviluppatore a pagamento, e i dati non escono dal
      telefono -- quindi niente lettura dal server. Fitbit è l'opposto: API
      web con OAuth, si legge da Vercel, ma vuole un'app registrata e i token
      da rinnovare. Nessuna delle due è un pomeriggio di lavoro.
- [ ] **Un modo per tornare indietro dalla chat senza copiare a mano.** Oggi
      il giro è: copia il prompt, apri Claude, incolla, copia la risposta,
      torna, incolla. Sei gesti, di cui quattro sono trasporto. Da valutare
      un collegamento che apra l'app con la risposta già dentro.
- [ ] **Intestazione che si compatta scorrendo.** Costa poco, guadagna una
      riga su schermate lunghe.
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

**Fase 2 — Ripetere invece di ricomporre.** *(1–2 giorni)*
- «Come ieri» su un pasto: ricopia colazione/pranzo/cena di un giorno
  precedente in un tocco.
- I tasti rapidi si riordinano da soli per momento della giornata: alle 8 in
  cima ci sono quelli della colazione, non i primi dodici in ordine di
  inserimento. E se ne mostrano pochi, con il resto dietro a un tocco: è
  anche l'unico modo di riportare sotto il tetto le due righe che la Fase 1
  ha lasciato fuori, perché quei 720 px di griglia spingono giù tutto.
- Bersaglio: **una colazione ricorrente in 1 gesto, una giornata tipo in 4**.
- È la fase che sposta di più: chi mangia quasi sempre le stesse cose non
  dovrebbe ricomporle da capo ogni mattina.

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

**Fase 4 — Aggiunta rapida di sole calorie.** *(mezza giornata)*
- Un campo «350 kcal» e basta, senza nome né macro, per quando mangi fuori e
  non hai voglia di scomporre il piatto.
- Serve a non lasciare buchi: un giorno registrato male vale più di un giorno
  non registrato, perché la media resta vera.
- Bersaglio: **2 gesti**.

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
| **Cibo rapido** | ❌ solo dal seed | ❌ | ❌ |
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
- [ ] **Cibi rapidi: aggiungere, correggere, togliere.** Il buco più grosso,
      e quello già incontrato: *«molte volte non mangio le stesse cose e
      magari i prodotti variano»*. Se lo yogurt cambia ricetta, oggi i suoi
      valori restano sbagliati per sempre. Serve anche il verso opposto:
      **«salva come tasto rapido»** su un pasto appena inserito, che
      trasforma un incollaggio in un tasto riusabile e riduce il lavoro
      futuro invece di aggiungerne.
- [ ] **Esercizi del programma: rinominare, cambiare serie e ripetizioni,
      aggiungere, togliere, riordinare.** Quando il personal trainer cambia
      la scheda, oggi l'unica strada è `db:seed`, che rifiuta di partire se
      esistono serie registrate — e con `--forza-allenamento` le cancella. In
      pratica: o perdi lo storico o tieni la scheda vecchia.
- [ ] **Target giornalieri modificabili.** Stanno in `src/lib/targets.ts`:
      cambiarli richiede un deploy. Il PT li cambia a ogni fase. Il disegno
      per esteso è nella sezione 6-quinquies.
- [ ] **Seduta: cambiare data e giornata.** Se apri "Day 1" invece di "Day 2"
      puoi solo scartare e rifare; se ti dimentichi di registrare l'altroieri,
      non puoi registrarlo a posteriori.

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

- [ ] **Target giornalieri modificabili.** Stanno in `src/lib/targets.ts`:
      oggi cambiarli richiede un deploy, e il PT li cambia a ogni fase. Una
      tabella `targets` con una riga, un campo per macro, e la schermata in
      Piano. È il pezzo più piccolo di tutto questo e sblocca metà del
      problema da solo.
- [ ] **`archiviato_il` sugli esercizi**, con le letture aggiornate. Senza
      questa colonna nessun cambio scheda è sicuro; con questa, anche il
      `db:seed` può smettere di cancellare.
- [ ] **Prompt + incolla + confronto + applica in transazione.**
- [ ] **Undo del cambio scheda**, con la fotografia del prima.

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

- [ ] **Cerca un prodotto per nome** dentro *Aggiungi*: campo, risultati con
      marca e kcal per 100 g, si tocca e finisce nel diario. Un solo giro di
      rete, nessuna configurazione.
- [ ] **Salvalo come tasto rapido**, con la porzione che usi tu. È il punto
      in cui l'archivio smette di essere quello del seed e diventa il tuo —
      e si incastra con il punto «cibi rapidi modificabili» di 6-quater.
- [ ] **Codice a barre digitato a mano**, per quando il nome non basta a
      distinguere due varianti dello stesso prodotto.
- [ ] **Scanner con la fotocamera**, solo dopo, e solo se serve davvero.

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
