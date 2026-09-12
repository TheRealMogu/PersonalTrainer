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
| Aggiungere lo stesso cibo in quantità diversa | 2 tocchi | ~8 (form manuale) | **da fare** |
| Correggere un pasto già inserito | 2 tocchi | elimina + reinserisci | **da fare** |
| Annullare un errore | 1 tocco | 1 | ok |
| Segnare il carico di una serie | 2 tocchi | impossibile | **da fare** |
| Vedere il carico dell'ultima volta | 0 tocchi | impossibile | **da fare** |
| Sapere cosa mi entra ancora | 0 tocchi | da calcolare a mente | **da fare** |

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

- **Diario** — barre per kcal e macro con quanto rimane e lo stato oltre
  target, aggiunta da tasti rapidi o a mano, eliminazione annullabile,
  navigazione fra i giorni.
- **Piano** — i target e le regole del PT.
- **Allenamento** — il programma T1, in sola lettura.
- **Storico** — media giornaliera e andamento su 7 o 30 giorni, con i giorni
  entro il target.

## Cosa manca, in ordine

L'ordine è per quanto pesa ogni giorno, non per quanto è difficile.

### 1. Registrare l'allenamento

Oggi la scheda è un foglio stampato: si legge e basta. In palestra serve
sapere **con quanti chili hai fatto la stessa cosa l'altra volta**, ed è
esattamente ciò per cui oggi apriresti un'altra app.

Cosa deve fare:

- accanto a ogni esercizio, il carico dell'ultima volta, senza toccare niente;
- segnare una serie: peso e ripetizioni, due tocchi, con il valore precedente
  già proposto come punto di partenza;
- lo storico per esercizio, per vedere se il carico sale.

Richiede una tabella nuova (`workout_sets`: esercizio, data, serie, peso,
ripetizioni) e una schermata di esecuzione della giornata.

### 2. Quantità sui tasti rapidi

Una banana e mezza, 180 g di pollo invece di 150, mezza porzione di riso.
Oggi o è la porzione esatta o è il form manuale con cinque campi: è il motivo
per cui i giorni storti non verrebbero registrati.

Cosa deve fare: tenere premuto (o un tocco sul "+") apre un selettore di
quantità con la porzione base già impostata; i macro si ricalcolano da soli.
Due tocchi in tutto.

### 3. Cosa mi entra ancora

Diretta conseguenza del budget. A cena ti restano 600 kcal e 70 g di proteine:
l'app sa già cosa hai fra i tasti rapidi, quindi può dirti quali ci stanno
dentro e quali no, senza che tu faccia i conti.

Non è un consiglio nutrizionale, è una sottrazione fatta da chi ha i numeri
sotto mano.

### 4. Correggere un pasto

Oggi si elimina e si reinserisce. Sbagliare a digitare un numero capita, e
rifare tutto da capo scoraggia dal correggere — così il dato resta sbagliato.

### 5. Momenti della giornata

Raggruppare in colazione / pranzo / cena / spuntini. Serve meno di quanto
sembra finché i pasti sono pochi, ma diventa utile per capire *dove* se ne
vanno le calorie. Richiede una colonna in più e una migration.

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

## Come si verifica che sia davvero comodo

Non basta che la build passi.

- Contare i tocchi dei gesti in tabella e confrontarli col tetto.
- Provare con **latenza di rete vera** (4G, ~400 ms), non in locale: è lì che
  emergono i silenzi dopo il tocco.
- Guardare le schermate a 320 e 390 px, non solo sul portatile.
- Verificare che nessun controllo stia sotto i 44×44 px.

Tutte cose già fatte almeno una volta in questo repo, e da rifare a ogni
aggiunta.
