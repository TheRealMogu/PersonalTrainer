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

**Non è mai stato eseguito**: la compilazione dell'IPA. Il codice c'è e gli
script sono stati validati, ma nessuno ha ancora premuto Run workflow.

**Non è mai stato verificato su un telefono vero**: tutte le prove sono in
Chromium con viewport da iPhone. Safari non è Chromium.

---

## 1. Portarla davvero sul telefono

Finché l'app vive solo sul computer, tutto il resto è teoria.

- [ ] **Compilare il primo IPA.** Actions → *Compila IPA per iPhone* → Run
      workflow. Non serve più il deploy: senza URL compila lo stesso e
      mostra la pagina di errore, ma l'app finisce sul telefono.
- [ ] **Deploy su Vercel** e rilancio con l'URL, così l'app funziona davvero.
- [ ] **Provarla in Safari**, non in Chromium: tastiera che copre i campi,
      rimbalzo dello scroll, `env(safe-area-inset-*)` sui modelli con notch.
      È il collaudo che manca del tutto.
- [ ] **Sideload con AltStore/SideStore** e verificare il rinnovo a 7 giorni.

## 2. Non perdere i dati

Oggi il database non ha rete di sicurezza. Per un diario che accumula mesi di
storia è la lacuna più grave dopo il punto 1.

- [ ] **Backup automatico.** Neon ha lo storico dei rami; va verificato che
      sia attivo sul piano gratuito e documentato come si recupera.
- [ ] **Export dei dati** in CSV o JSON da dentro l'app. Se un giorno il
      progetto muore, i dati restano tuoi.
- [ ] **Migration di rollback.** Oggi le migration vanno solo avanti: un
      errore su `db:migrate` si ripara a mano.

## 3. Cosa succede quando qualcosa va storto

L'app presuppone che tutto vada bene. Non è vero.

- [ ] **Pagina di errore.** Se Neon non risponde, adesso esce l'errore
      generico di Next. Serve `error.tsx` che dica cosa è successo in
      italiano e offra "riprova".
- [ ] **Stato di caricamento.** `loading.tsx` per le navigazioni lente:
      oggi c'è solo l'indicatore sulle frecce del giorno.
- [ ] **Ritentare le scritture fallite.** Se il salvataggio di un pasto
      fallisce compare l'errore, ma il pasto è perso: va tenuto in memoria e
      offerto un "riprova".
- [ ] **Funzionare senza rete.** Oggi senza connessione l'app non si apre
      affatto. Per la palestra, dove il segnale manca, è un problema serio:
      servirebbe una cache locale delle serie da sincronizzare dopo.

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
- [ ] **Note sulla seduta.** "Spalla che tira" vale più di tre decimali sul
      carico.
- [ ] **Riordinare gli esercizi** della giornata, se in palestra la macchina
      è occupata.

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
