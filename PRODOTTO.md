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
gesti, e ogni costo ha un tetto. Se un gesto sfora il tetto, è un bug di
prodotto, non una mancanza di funzionalità.

**Lo scorrimento è un gesto, e si conta: mezza schermata = 1.** Non era così,
ed è per questo che questa tabella ha dichiarato «aggiungere un cibo
ricorrente: 1 tocco, ok» per due mesi, mentre sul telefono quel tasto stava
882 px più in basso — quasi due schermate di pollice prima del primo tocco
utile. Un metro che non misura la parte cara non serve a niente, e assolve
proprio le schermate che vanno riviste.

| Gesto quotidiano | Tetto | Oggi | Stato |
|---|---|---|---|
| Vedere quanto mi resta | 0 gesti (apro l'app) | 0 | ok |
| Vedere cosa ho mangiato | 1 gesto | 1 (*N pasti ↓* nella barra del giorno) | ok |
| Aggiungere un cibo ricorrente | 1 gesto | 1 (i tasti rapidi aprono a vista) | ok |
| Aggiungere lo stesso cibo in quantità diversa | 2 gesti | 2 | ok |
| Registrare qualcosa che non è fra i tasti rapidi | 2 gesti | 2 (*Solo calorie*) oppure 3 (*Incolla da Claude*) | ok per il caso veloce |
| Ripetere un pasto che fai sempre uguale | 1 gesto | — (non esiste) | **manca** |
| Segnare un bicchiere d'acqua | 1 gesto | 1 (tasto + nella scheda in cima) | ok |
| Salvare un pasto fra i tasti rapidi | 2 gesti | 2 (tocca la riga → salva) | ok |
| Correggere un alimento in archivio | 3 gesti | 3 (Piano → archivio → riga) | ok |
| Vedere quanta acqua ho bevuto | 0 gesti | 0 su schermo alto (finisce a 632 px); **1** su 320×568 | ok sopra i 700 px |
| Correggere un pasto già inserito | 2 gesti | 2 (tocca la riga → quantità) | ok |
| Correggere nome o macro di un pasto | 3 gesti | 3 (riga → *Correggi nome e valori* → campo) | ok |
| Annullare un errore | 1 gesto | 1 | ok |
| Entrare nell'app | 0 gesti dopo il primo accesso | 0 | ok |
| Segnare il carico di una serie | 2 gesti | 1 (campi già pronti) | ok |
| Vedere il carico dell'ultima volta | 0 gesti | 0 | ok |
| Sapere cosa mi entra ancora | 0 gesti | 0 (conteggio sempre visibile) | ok |
| Capire dove sono finite le calorie | 0 gesti | 0 (totale per pasto) | ok |
| Sapere quale allenamento tocca | 0 gesti | 0 (scheda "Tocca a te") | ok |
| Correggere una serie sbagliata | 2 gesti | 2 (tocca la riga → salva) | ok |
| Rimediare a una serie eliminata | 1 gesto | 1 (Annulla) | ok |
| Rimediare a "Fine" toccato per sbaglio | 1 gesto | 1 (Annulla) | ok |
| Uscire da una giornata avviata sbagliata | 1 gesto | 1 (Scarta) | ok |
| Spostare un pasto di momento | 2 gesti | 2 (tocca la riga → momento) | ok |
| Portarsi via i propri dati | 2 gesti | 2 (Piano → scarica) | ok |
| Segnare una serie senza segnale | 1 gesto | 1 (resta sul telefono) | ok |
| Sapere com'è andata la settimana | 0 gesti | 0 (striscia in cima al diario) | ok |
| Aprire un giorno passato | 1 gesto | 1 (dalla striscia) | ok |
| Rivedere un allenamento passato | 1 gesto | 1 (tocca la riga in *Ultimi allenamenti*) | ok |
| Sapere se sto andando meglio dell'ultima volta | 0 gesti | 0 (accanto a ogni serie) | ok |
| Sapere a che punto è la seduta | 0 gesti | 0 (in cima, accanto al cronometro) | ok |
| Sapere da dove arriva un macro | 1 gesto | 1 (tocca il riquadro) | ok |
| Sapere cosa ci sta nel margine di un macro | 1 gesto | 1 (stesso foglio) | ok |
| Cambiare i target dopo che il PT li ha cambiati | 3 gesti | 3 (Piano → *Cambia gli obiettivi* → campo) | ok |
| Cambiare l'obiettivo dell'acqua | 3 gesti | 3 (stessa schermata) | ok |
| Segnare un integratore preso | 1 gesto | 1 (tocco sulla riga, riscontro in 50 ms) | ok |
| Rimediare a un integratore spuntato per sbaglio | 1 gesto | 1 (stesso tocco) | ok |
| Sapere cosa devo ancora prendere oggi | 0 gesti | 0 su schermo alto (finisce a 804 px); **1** su 320×568 | ok sopra gli 850 px |
| Aggiungere un integratore | 3 gesti | 3 (Piano → elenco → *Aggiungi*) | ok |
| Togliere un integratore dal diario | 3 gesti | 3 (elenco → riga → *Non lo prendo più*) | ok |
| Registrare un pasto di cui sai solo le calorie | 2 gesti | 2 (*Solo calorie* → scrivi → *Aggiungi*) | ok |
| Mandare una settimana sola al personal trainer | 2 gesti | 2 (Piano → *Pasti di questa settimana*) | ok |
| Ripetere la colazione di tutti i giorni | 1 gesto | 1 (*Come ieri*, a 772 px quindi sopra la piega) | ok |
| Trovare nei tasti rapidi quello che mangio adesso | 1 gesto | 1 (è già in cima: l'ordine segue l'ora) | ok |
| Caricare la scheda nuova del personal trainer | 4 gesti | 4 (Piano → *Cambia la scheda* → copia → incolla → guarda → applica) | **sopra il tetto, e va bene** |
| Rimediare a una scheda caricata sbagliata | 1 gesto | 1 (Annulla) | ok |
| Rileggere i carichi di un esercizio che non faccio più | 1 gesto | 1 (è ancora nello storico) | ok |
| Annotare com'è andata una seduta | 3 gesti | 3 (seduta → *Nota* → scrivi → salva) | ok |
| Registrare una seduta dimenticata | 2 gesti | 2 (seduta → campo data) | ok |

Le righe **sopra il tetto** sono misurate su una giornata vera (10 pasti
registrati, schermo da 390 px). Le prime due righe dell'aggiunta sono
rientrate con le fasi 0 e 1; le altre due restano fuori per la stessa
ragione, ed è una sola: **la griglia dei dodici tasti rapidi è alta 720 px**
e spinge in basso tutto quello che le sta sotto. La cura è la Fase 2 —
riordinarli per momento della giornata e mostrarne meno — non un altro
spostamento di sezioni. Il piano è la sezione 6-ter di
[ROADMAP.md](ROADMAP.md).

Il costo di «vedere cosa ho mangiato» era previsto in 1 gesto e misurato in
3: la previsione era sbagliata, e sta scritta così invece di alzare il tetto
per farla tornare.

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
  annullabile, navigazione fra i giorni. Sotto l'acqua, il peso del giorno:
  un campo, un tasto.
- **Piano** — i target e le regole del PT, con la porta per cambiarli.
- **Allenamento** — il programma T1 e la seduta vera: cronometro, serie con
  carico e ripetizioni, timer di recupero, volume sollevato, e il carico
  dell'ultima volta già proposto nei campi.
- **Storico** — media giornaliera e andamento su 7 o 30 giorni, con i giorni
  entro il target. Stessi colori del diario. Lo scarto dalla media dichiara
  la direzione in chiaro ("−217 kcal · sotto il target"), non solo il
  numero: descrive, non giudica. In cima, **il mese a
  colpo d'occhio**: un calendario con quattro stati per casella (entro,
  oltre, non registrato, futuro) — così un giorno saltato non si confonde
  mai con uno andato male. Anche l'**andamento del peso**, quando c'è
  almeno una misura. In fondo la **progressione in palestra**: massimale
  stimato per esercizio, seduta dopo seduta.
- **Tema chiaro e scuro** che segue l'impostazione dell'iPhone.
- **Striscia della settimana** in cima al diario: gli ultimi sette giorni a
  colpo d'occhio, e un tocco per aprirne uno.
- **Dettaglio di un macro**: toccando un riquadro si vede da quali pasti
  arriva e quante porzioni dei tuoi alimenti ci stanno ancora nel margine.
- **Export dei dati** — Piano → *I tuoi dati*: tutto in JSON, oppure pasti e
  allenamenti in CSV. Un'app che accumula mesi di diario e non ti lascia
  portarlo via te lo tiene in ostaggio. Si può scaricare anche **un periodo
  solo** — questa settimana, questo mese — da mandare al personal trainer
  senza aprire il CSV e tagliarlo a mano. Il file si porta il periodo nel
  nome, e il JSON lo scrive dentro: un export parziale che sembra completo
  fa concludere a chi lo legge che hai mangiato solo quello.
- **I tuoi alimenti** — Piano → *I tuoi alimenti*: i tasti rapidi si
  aggiungono, si correggono e si tolgono, con annullamento. Crescono da soli:
  ogni pasto si salva fra i rapidi con un tocco, quindi un prodotto incollato
  una volta diventa un tasto per sempre, con la porzione che usi tu. Non
  serve nessun archivio esterno per cominciare.
- **Acqua** — bicchieri +/− nella scheda in cima al diario, con il totale in
  litri. Nessun macro, nessuna stima, nessuna scelta da fare: è un contatore.
  Il "meno" è l'annullamento, a un tocco di distanza.
- **Nota sulla seduta** — nel dettaglio di un allenamento: «spalla destra che
  tira sulle spinte». Fra un mese è l'unica cosa che spiega perché quel giorno
  la panca è scesa — i numeri dicono cosa hai fatto, la nota dice perché. Va
  anche nel testo che mandi al personal trainer. Da lì si corregge anche la
  **data**, per le sedute che ti dimentichi di registrare.

- **Niente si perde se cade la rete** — un pasto che non riesce a salvarsi
  resta sul telefono, si vede in lista e conta nei totali, e riparte da solo
  quando la rete torna o alla prima riapertura. La riga dice «aspetta la
  rete», non «errore»: non è perso, e chiamarlo guasto farebbe riscriverlo a
  mano. Lo stesso valeva già per le serie in palestra; il diario invece il
  pasto lo perdeva davvero.

- **Cambia la scheda** — Piano → *Cambia la scheda*: quando il personal
  trainer ne manda una nuova, copi un prompt, lo mandi a una chat con i suoi
  documenti, riporti indietro la risposta e **vedi cosa cambia prima di
  confermare** — cosa esce, cosa cambia, cosa è nuovo, e quante serie hai
  registrato su quello che esce. Niente viene cancellato: quello che esce dal
  programma si archivia e resta leggibile nello storico e nelle sedute già
  fatte. Si applica tutto insieme o niente, e si annulla in un tocco.

- **Come ieri** — sopra i tasti rapidi: ricopia in un tocco il pasto che hai
  già fatto in questo momento della giornata. Dice quale giorno ricopia, cosa
  contiene e quante calorie sono, quindi si decide prima di toccare. Si chiama
  *Come ieri* solo quando è davvero ieri: se l'ultima colazione registrata è
  di lunedì, dice *Come lunedì*.
- **Tasti rapidi in ordine di ora** — alle otto in cima c'è la colazione, a
  sera la cena. L'ordine viene da quello che hai già registrato, non da una
  configurazione da compilare, e cambia da solo quando cambiano le abitudini.
  Se ne mostrano sei: gli altri stanno dietro un tocco, perché la griglia da
  dodici era alta 720 px e spingeva tutto il resto sotto.

- **Solo calorie** — Aggiungi → *Solo calorie*: un campo, un numero, fatto.
  Per quando mangi fuori e scomporre il piatto non succederà mai. Le calorie
  entrano nell'anello, che resta esatto; i macro restano fuori dal conto, e
  le barre lo dicono invece di darli per zero — «non lo so» e «zero grammi»
  sono cose diverse, e confonderle è il modo più rapido di far dire all'app
  una cosa falsa. Detto una volta, in grigio: non è un guasto, non è un fuori
  target, e non è un rimprovero.

- **Integratori** — Piano → *I tuoi integratori*: l'elenco è tuo, e nel
  diario diventa una riga di spunte sotto l'acqua. Un tocco segna, un altro
  toglie — il secondo tocco *è* l'annullamento del primo, quindi non c'è
  niente da confermare. Non sono cibo: niente macro, niente quantità, niente
  budget. La domanda è «l'ho presa oggi?», non «quanto mi resta». Se l'elenco
  è vuoto la riga non compare, perché chi non li prende non deve vedere un
  contatore a zero tutti i giorni. Il cestino si chiama *Non lo prendo più* e
  fa esattamente quello: sparisce dal diario e i giorni in cui lo prendevi
  restano.

- **Obiettivi modificabili** — Piano → *Cambia gli obiettivi*: calorie,
  carboidrati, proteine, grassi e bicchieri d'acqua si scrivono a mano, e da
  lì in poi valgono ovunque — anello, barre, storico, riepilogo della
  settimana, scheda dell'acqua. Prima erano una costante nel codice: quando
  il PT cambiava la dieta servivo io. Un numero fuori scala viene spiegato e
  il salvataggio si ferma, ma nessun numero viene corretto di nascosto: se i
  macro non tornano al grammo con le calorie l'app lo fa notare e salva lo
  stesso, perché una dieta può avere un margine voluto.
- **Dettaglio di un allenamento** — dalla lista *Ultimi allenamenti* si apre
  la seduta: volume, durata, serie per serie con accanto quanto sei andato
  meglio o peggio della stessa serie dell'ultima volta, e l'elenco degli
  esercizi saltati. Prima quella lista era un vicolo cieco in lettura: dava
  il volume e un cestino, quindi i carichi entravano nel database e non
  tornavano più fuori.
- **Riepilogo della settimana** — in cima allo Storico: i sette giorni da
  lunedì a domenica, le sedute con il volume, e la media che dichiara sempre
  su quanti giorni è fatta. Con il numero della settimana ("Settimana 3"),
  contato dal primo giorno mai registrato, il peso di questa settimana e di
  quella scorsa a confronto, e una nota libera sulla dieta ("fame giovedì,
  sgarro sabato sera") — così com'è quando il PT chiede la domenica. Un
  tocco lo copia come testo, da mandare al personal trainer o da incollare
  in chat, dove chi legge non ha l'app davanti. I giorni che devono ancora
  arrivare sono un trattino, non uno zero.
- **Incolla da Claude** — Aggiungi → *Incolla da Claude*: si copia un prompt,
  lo si manda a Claude insieme a cosa si è mangiato (anche con la foto
  dell'etichetta), e si riporta indietro la risposta. L'app la legge e
  propone le righe con i macro già compilati. I tasti rapidi coprono i giorni
  uguali agli altri; questa copre gli altri, che sono quelli in cui il diario
  resterebbe vuoto. Il calcolo avviene dove si sta già scrivendo; qui non c'è
  nessuna chiamata a pagamento e niente da configurare, e la lettura funziona
  anche senza rete. Quello che si incolla è una proposta: si tolgono le righe
  che non tornano, si correggono i numeri, e solo allora si salva.

Una riga di quella tabella sfora il tetto **di proposito**: caricare una
scheda nuova costa quattro gesti, e non si prova ad abbassarli. Capita ogni
qualche mese, e ognuno di quei passaggi serve a non perdere mesi di carichi
per un incolla andato storto. Il tetto dei gesti vale per quello che fai
tutti i giorni; per quello che fai tre volte l'anno vale l'opposto.

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
3. **Le azioni distruttive si annullano**, non si confermano. E non
   esistono vicoli ciechi: tutto quello che si registra si corregge e si
   toglie, e ogni cosa che sparisce lascia un modo di rimetterla. Un tocco
   storto in palestra, con le mani sudate, non deve costare un allenamento.
   **Vale per ogni cosa che si inserisce, non solo per i pasti e le serie**:
   un cibo rapido, un esercizio del programma e un target sono roba inserita
   anche se oggi entra dal seed, e una cosa che si cambia solo con un deploy
   è un vicolo cieco lungo. L'inventario di cosa manca è la sezione 6-quater
   di [ROADMAP.md](ROADMAP.md).
4. **Contrasto del testo almeno 4.5:1.** Il grigio troppo chiaro non è
   eleganza, è testo che non si legge al sole.
5. **Niente numeri inventati.** Un giorno non compilato è "non registrato", mai
   zero: zero vorrebbe dire digiuno.
6. **Tutto in italiano**, anche i messaggi di errore.
7. **Mobile prima di tutto.** Si prova a 320 px prima di dire che è finito.
8. **Il rosso si usa per due cose sole: il fuori target, e un guasto che ti
   ha fatto perdere qualcosa.** Mai per le azioni — nemmeno "Elimina" o
   "Esci" — e mai per gli stati tecnici che occupano già tutta la schermata,
   come il pannello di errore del database: lì il rosso non aggiunge niente e
   fa sembrare una colpa quello che è un guasto. Se lo si usa per le cose
   ordinarie, quando serve davvero non lo si vede più.
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
15. **I numeri si muovono, non saltano.** Quando un valore cambia scorre fino
    a quello nuovo in circa 400 ms: il salto secco non dice di quanto sei
    sceso. Si rispetta `prefers-reduced-motion`.
16. **Quello che hai registrato non si perde per colpa della rete.** In
    palestra il segnale manca: una serie segnata deve restare segnata, e
    partire da sola dopo. Ogni scrittura che si può ritentare porta un
    identificativo, altrimenti riprovare significa duplicare.
17. **Una curva sola per tutto quello che si muove.** Fogli, barre in fondo,
    entrate di schermata e risposta al tocco usano la stessa
    `cubic-bezier(0.32, 0.72, 0, 1)`, definita una volta in `globals.css`.
    Parte veloce e si posa piano: un movimento ad andatura costante si legge
    come meccanico, perché nessun oggetto vero parte e si ferma di colpo.
    Niente oltre il mezzo secondo — più in là il movimento smette di essere
    un riscontro e diventa un'attesa. Al tocco si scende in 80 ms e si
    risale in 260: è la differenza fra le due durate a far sembrare solido
    un pulsante.
18. **Quello che non è stato misurato si dice, prima di salvarlo.** I macro
    che arrivano da fuori — da una chat, da un incollaggio — sono stime: si
    mostrano etichettati come tali, riga per riga, e si salvano solo dopo che
    li hai guardati. Un numero stimato che entra nel diario da solo è un
    numero inventato, e la regola 5 non lo permette. Quando le calorie non
    tornano con i macro dichiarati, lo si segnala su quella riga invece di
    correggerla di nascosto: non sappiamo quale dei due sia sbagliato.
19. **Un numero che esce dall'app si porta dietro il suo denominatore.**
    "1919 kcal di media" da solo si legge come si vuole: fuori di qui nessuno
    sa se sono sette giorni o due. Ogni media dichiara su quanti giorni è
    fatta, a schermo e nel testo che si copia.
20. **Lo stesso dato si scrive nello stesso modo dovunque esca.** Se la
    scheda mostra `1845` e il testo copiato dice `1.845`, chi legge si chiede
    quale dei due sia giusto. Un solo formattatore per grandezza, riusato —
    e il separatore decimale è la virgola, `230,6` e mai `230.6`, come in
    qualunque altro numero italiano dell'app. Vale anche per i numeri dentro
    ai campi modificabili: leggere `62.5` dove lo schermo scrive `62,5` fa
    sembrare che siano due numeri diversi.
21. **Un carico senza unità di misura non è un dato.** "12 kg" su un curl con
    i manubri possono essere due manubri da 12 o due da 6: due allenamenti
    diversi, e a un mese di distanza non c'è modo di sapere quale. Dove
    l'attrezzo lascia spazio al dubbio, l'etichetta del campo lo toglie.
22. **Quello che arriva da fuori è testo, non istruzioni.** Si fa passare da
    una sola porta, che valida campo per campo e scarta il resto. Un numero
    fuori scala si butta, non si arrotonda; una riga senza nome non è una
    riga.

## Come si struttura una schermata

Ricavato guardando Bevel sul telefono, schermata per schermata, non da una
guida generica. Quello che segue è il **come**, non il cosa: le regole sopra
decidono se una cosa va fatta, questa parte dice come metterla a schermo.

**Il titolo di sezione sta fuori dalla scheda.** Prima ogni scheda portava il
proprio titolo dentro il riquadro, e due schede che parlano della stessa cosa
restavano due oggetti separati. Col titolo fuori si legge "questo gruppo
riguarda X" e le schede sotto sono i pezzi di X — è così che "Andamento" tiene
insieme il grafico e la tabella, e "Il programma" le tre giornate.

**Quello che si tocca lo dichiara.** Una freccia in alto a destra sulla
scheda, o accanto all'etichetta. Prima le tessere dei macro si aprivano e
l'unico modo di scoprirlo era toccarle per caso.

**Gli stati vuoti dicono cosa fare**, non solo che è vuoto. "Giornata ancora
vuota — hai l'intero budget a disposizione" più l'indicazione di dove agire,
invece di "Nessun pasto registrato".

**Un numero importante porta con sé una parola.** "−28% · Inferiore
all'obiettivo" si legge in un colpo d'occhio, "−28%" no. La parola descrive,
non giudica: "oltre il target", mai "hai sbagliato".

**Le schede possono avere dimensioni diverse** nella stessa colonna: due a
metà larghezza affiancate accanto a una intera. È quello che dà densità senza
comprimere.

### Cosa abbiamo rifiutato, e perché

- **"Età biologica: 3,1 anni in più".** È un modello presentato come misura:
  esattamente il numero inventato che la regola 5 vieta. Vale per qualunque
  punteggio sintetico che sembri un dato.
- **L'assistente in chat.** Fuori scopo: l'app deve rispondere da sola, non
  farsi interrogare.
- **I biomarcatori da sensori** (variabilità cardiaca, VO₂max). Non abbiamo
  quei dati, e mostrarli vuoti riempie la schermata di niente.
- **Lo sfondo sfocato sotto gli stati vuoti.** Decorazione: finge che ci sia
  un contenuto che non c'è.

## Come si verifica che sia davvero comodo

Non basta che la build passi.

- Contare i tocchi dei gesti in tabella e confrontarli col tetto.
- Provare con **latenza di rete vera** (4G, ~400 ms), non in locale: è lì che
  emergono i silenzi dopo il tocco.
- Guardare le schermate a 320 e 390 px, non solo sul portatile.
- Verificare che nessun controllo stia sotto i 44×44 px.

Tutte cose già fatte almeno una volta in questo repo, e da rifare a ogni
aggiunta.

Tre delle quattro adesso girano da sole. `npm run e2e` apre l'app a 320 e
390 px, in chiaro e in scuro, su otto schermate, e misura: bersagli da 44 px,
contrasto del testo, scorrimento orizzontale, e che i numeri escano con la
virgola. In CI gira a ogni push. **Non sostituisce il guardare: sostituisce
il ricordarsi di guardare** — che è la parte che finora saltava.

I tocchi dei gesti e la latenza vera restano da contare a mano: il primo
perché il tetto dipende da cosa vuoi fare, non da un elemento; la seconda
perché ~400 ms li sa simulare solo chi sa cosa sta cercando.
