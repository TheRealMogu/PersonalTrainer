# Prove col browser

Non sono test unitari: aprono l'app davvero, a 320 e 390 px, in tema chiaro e
scuro, e **misurano** invece di guardare. Quasi tutti i bug veri di questo
repo sono stati trovati così.

Girano in CI a ogni push e pull request, contro un Postgres vero — non contro
Neon, che da una macchina di GitHub non serve raggiungere e che non va toccata
da un test.

```bash
npm run e2e          # server già acceso su localhost:3000
```

Servono `DATABASE_URL` (un Postgres qualunque: il driver si sceglie
dall'indirizzo) e `APP_PASSWORD`.

## Cosa controllano, e perché proprio quello

Le regole di `PRODOTTO.md` che si possono contare in pixel:

- **bersagli da 44×44 px** — già sfuggito due volte guardando invece di
  misurare;
- **contrasto del testo ≥ 4.5:1**, calcolato sul colore reale del pixel, non
  su quello che dovrebbe essere;
- **niente scorrimento orizzontale** a 320 px;
- **nessun punto decimale** fra i numeri formattati: in italiano si scrive con
  la virgola, e un punto vuol dire che un formattatore è stato saltato.
