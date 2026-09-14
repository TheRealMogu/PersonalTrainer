# Come deve essere questa app

Documento di riferimento: cosa vogliamo, come si misura, cosa manca.
Chi tocca il codice legge prima questo.

## Il punto di partenza

Il personal trainer non ha dato un menù. Ha dato un **budget giornaliero**:

| | |
|---|---|
| Calorie | 1905 kcal |
| Carboidrati | 220 g |
| Proteine | 155 g |
| Grassi | 45 g |

Questa è la cosa più importante del progetto, e cambia tutto il resto.

Un'app che ti fa *seguire un piano* ha senso quando il piano esiste: colazione
così, pranzo colà, e la app ti spunta le caselle. Qui il piano non c'è. Ci sono
dei numeri da rispettare a fine giornata, e mille modi diversi di arrivarci.

Quindi questa **non è un'app di menù, è un'app di budget.** La domanda a cui
deve rispondere in ogni istante è una sola:

> Quanto mi resta, e cosa ci faccio.

Tutto quello che non serve a rispondere a questa domanda è peso morto.

## La conseguenza: i giorni non sono uguali

Siccome il vincolo sono i numeri e non i pasti, la giornata vera fa così:

- mangio una cosa non prevista;
- mangio mezza porzione invece di una;
- salto uno spuntino;
- a cena mi accorgo che ho 600 kcal e 70 g di proteine ancora da spendere;
- oppure che ho già sforato i grassi a pranzo e devo aggiustare.

Un'app che assume la regolarità, qui, si rompe il secondo giorno. Le deviazioni
non sono un caso limite: **sono l'uso normale.** Registrare "ho mangiato una
cosa in più" o "ne ho mangiata metà" deve costare quanto registrare un pasto
previsto, cioè quasi nulla.

## Il metro di misura: i gesti

La comodità non è un'opinione, si conta. Ogni azione quotidiana ha un costo in
tocchi, e ogni costo ha un tetto. Se un gesto sfora il tetto, è un bug di
prodotto, non una mancanza di funzionalità.

| Gesto quotidiano | Tetto | Oggi | Stato |
|---|---|---|---|
| Vedere quanto mi resta | 0 tocchi (apro l'app) | 0 | ok |
| Vedere cosa ho mangiato | 0 tocchi | 0 | ok |
| Aggiungere un cibo ricorrente | 1 tocco | 1 | ok |
| Aggiungere lo stesso cibo in quantità diversa | 2 tocchi | 2 (tasto "+" → quantità) | ok |
| Correggere un pasto già inserito | 2 tocchi | 2 (tocca la riga → quantità) | ok |
| Annullare un errore | 1 tocco | 1 | ok |
| Entrare nell'app | 0 tocchi dopo il primo accesso | 0 | ok |
| Segnare il carico di una serie | 2 tocchi | 1 (campi già pronti) | ok |
| Vedere il carico dell'ultima volta | 0 tocchi | 0 | ok |
| Sapere cosa mi entra ancora | 0 tocchi | 0 (conteggio sempre visibile) | ok |
| Capire dove sono finite le calorie | 0 tocchi | 0 (totale per pasto) | ok |
| Sapere quale allenamento tocca | 0 tocchi | 0 (scheda "Tocca a te") | ok |
| Portarsi via i propri dati | 2 tocchi | 2 (Piano → scarica) | ok |

Due regole che valgono sempre:

- **Riscontro sotto i 100 ms.** Se tocco e non succede niente, tocco di nuovo,
  e registro due porzioni. Già successo: prima delle correzioni il diario
  restava muto quasi un secondo su 4G. Ora l'interfaccia si aggiorna al tocco e
  il salvataggio prosegue dietro.
- **Ogni azione distruttiva è reversibile.** Niente conferme che rallentano
  l'uso normale; un "Annulla" che resta lì qualche secondo.

## I riferimenti, e cosa prendiamo da ciascuno

Il modello è una via di mezzo, e le tre parti non sono intercambiabili.

**Da MyFitnessPal — la completezza del registrare.**
Quantità variabili, porzioni, la possibilità di annotare qualunque cosa e non
solo quello che era previsto. È quello che ci serve per i giorni storti.
Quello che **non** prendiamo: la confusione. Schermate piene, pubblicità,
funzioni che non useremo mai. Qui l'app è per una persona sola e deve restare
piccola.

**Da Yuka — l'immediatezza del verdetto.**
Un gesto, una risposta chiara, nessuna interpretazione da fare. Da noi si
traduce così: guardo il diario e in un secondo so se sono in pari o no. Non
devo leggere quattro numeri e fare una sottrazione.
Quello che **non** prendiamo: il giudizio morale sul cibo. Nessun punteggio,
nessun semaforo su cosa è "buono" o "cattivo". Il PT ha dato dei numeri, non
una morale; il rosso significa "oltre il target", non "hai sbagliato".

**Da Bevel — la calma dell'interfaccia.**
Molto bianco, tipografia di sistema, niente decorazione. I dati sono l'unica
cosa che ha diritto di essere appariscente. È la direzione estetica già presa
e va difesa a ogni aggiunta.

## Cosa c'è oggi

- **Accesso con password** — la repo è pubblica e l'IPA è scaricabile da
  chiunque, quindi l'indirizzo dell'app non è più un segreto: la porta la
  chiude la password. Sessione lunga un anno, così si digita una volta per
  dispositivo.

- **Diario** — anello delle calorie con quanto resta al centro, barre dei
  macro con un colore ciascuno, pasti divisi per momento della giornata col
  totale di ognuno, quantità variabili (½, 1½, 0,75…), eliminazione
  annullabile, navigazione fra i giorni.
- **Piano** — i target e le regole del PT.
- **Allenamento** — il programma T1 e la seduta vera: cronometro, serie con
  carico e ripetizioni, timer di recupero, volume sollevato, e il carico
  dell'ultima volta già proposto nei campi.
- **Storico** — media giornaliera e andamento su 7 o 30 giorni, con i giorni
  entro il target. Stessi colori del diario. In fondo la **progressione in
  palestra**: massimale stimato per esercizio, seduta dopo seduta.
- **Tema chiaro e scuro** che segue l'impostazione dell'iPhone.
- **Export dei dati** — Piano → *I tuoi dati*: tutto in JSON, oppure pasti e
  allenamenti in CSV. Un'app che accumula mesi di diario e non ti lascia
  portarlo via te lo tiene in ostaggio.

## Cosa resta fuori, di proposito

Tutte le voci della prima lista sono state chiuse. Quello che resta è quello
che abbiamo deciso di **non** fare, e vale la pena tenerlo scritto:

- **illustrazioni anatomiche per esercizio** — sono materiale su licenza, non
  si producono;
- **percentuali di "prontezza muscolare"** — è un modello inventato: un
  numero che sembra una misura e non lo è;
- **istruzioni su come eseguire gli esercizi** — le ha già date il PT, e
  riscriverle peggio non aiuta.

Se un giorno servisse altro, il metro resta la tabella dei gesti: si aggiunge
solo quello che abbassa un costo che oggi è alto.

## Regole di design non negoziabili

Valgono per ogni aggiunta futura.

1. **Bersagli da 44×44 px minimo.** Sotto, il pollice sbaglia.
2. **Riscontro visibile sotto i 100 ms**, anche se il salvataggio dura un
   secondo.
3. **Le azioni distruttive si annullano**, non si confermano.
4. **Contrasto del testo almeno 4.5:1.** Il grigio troppo chiaro non è
   eleganza, è testo che non si legge al sole.
5. **Niente numeri inventati.** Un giorno non compilato è "non registrato", mai
   zero: zero vorrebbe dire digiuno.
6. **Tutto in italiano**, anche i messaggi di errore.
7. **Mobile prima di tutto.** Si prova a 320 px prima di dire che è finito.
8. **Il rosso è solo per il fuori target.** Se lo si usa per le cose ordinarie,
   quando serve davvero non lo si vede più.
9. **Un colore per macro, uguale su ogni schermata.** Carboidrati ambra,
   proteine viola, grassi verde, calorie blu. I colori sono stati validati
   per la separazione su daltonismo, in chiaro e in scuro: non si cambiano a
   occhio.
10. **Il colore non è mai l'unico segnale.** Accanto a ogni pallino c'è il
    nome del macro, e il fuori target si legge anche dalla scritta.
11. **Non si incolpa l'utente per quello che è già successo.** Se un macro è
    già oltre, non lo si segnala su ogni alimento: si dice una volta sola e
    si conta solo dove c'è ancora margine.
12. **Le stime si dichiarano.** Il massimale è calcolato, non misurato, e la
    schermata lo scrive.
13. **Una giornata a metà non è un dato.** Oggi si vede nei grafici, ma non
    entra in medie né in conteggi di riuscita: a mezzogiorno hai registrato un
    pasto su quattro, e farlo contare fa dire numeri falsi. Vale per ogni
    statistica futura.
14. **Quando ci sono più azioni, una sola è quella principale.** Quattro
    pulsanti identici non dicono da dove cominciare.

## Come si verifica che sia davvero comodo

Non basta che la build passi.

- Contare i tocchi dei gesti in tabella e confrontarli col tetto.
- Provare con **latenza di rete vera** (4G, ~400 ms), non in locale: è lì che
  emergono i silenzi dopo il tocco.
- Guardare le schermate a 320 e 390 px, non solo sul portatile.
- Verificare che nessun controllo stia sotto i 44×44 px.

Tutte cose già fatte almeno una volta in questo repo, e da rifare a ogni
aggiunta.
