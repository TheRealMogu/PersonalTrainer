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
