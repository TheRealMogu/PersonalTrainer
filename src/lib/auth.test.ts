import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  timingSafeEqual,
  verifySessionToken,
} from "./auth";

const SECRET = "segreto-di-prova-abbastanza-lungo";
const ORA = Date.UTC(2026, 8, 12, 12, 0, 0);

describe("timingSafeEqual", () => {
  it("riconosce due stringhe uguali", () => {
    assert.equal(timingSafeEqual("password", "password"), true);
  });

  it("rifiuta stringhe diverse, anche di lunghezza diversa", () => {
    assert.equal(timingSafeEqual("password", "passwore"), false);
    assert.equal(timingSafeEqual("password", "pass"), false);
    assert.equal(timingSafeEqual("", "password"), false);
    assert.equal(timingSafeEqual("password", ""), false);
  });

  it("regge due stringhe vuote", () => {
    assert.equal(timingSafeEqual("", ""), true);
  });
});

describe("sessione", () => {
  it("accetta un token appena creato", async () => {
    const token = await createSessionToken(SECRET, ORA);
    assert.equal(await verifySessionToken(token, SECRET, ORA), true);
  });

  it("rifiuta un token firmato con un altro segreto", async () => {
    const token = await createSessionToken(SECRET, ORA);
    assert.equal(await verifySessionToken(token, "un-altro-segreto", ORA), false);
  });

  it("rifiuta un token con la firma manomessa", async () => {
    const token = await createSessionToken(SECRET, ORA);
    const [payload, signature] = token.split(".");
    const manomesso = `${payload}.${signature.slice(0, -2)}XY`;
    assert.equal(await verifySessionToken(manomesso, SECRET, ORA), false);
  });

  it("rifiuta un token con il payload manomesso", async () => {
    const token = await createSessionToken(SECRET, ORA);
    const [, signature] = token.split(".");
    // scadenza spostata di dieci anni, ma la firma e' quella vecchia
    const falso = Buffer.from(JSON.stringify({ exp: 9_999_999_999 }))
      .toString("base64url");
    assert.equal(await verifySessionToken(`${falso}.${signature}`, SECRET, ORA), false);
  });

  it("rifiuta un token scaduto", async () => {
    const token = await createSessionToken(SECRET, ORA);
    const dopoLaScadenza = ORA + (SESSION_MAX_AGE_SECONDS + 60) * 1000;
    assert.equal(await verifySessionToken(token, SECRET, dopoLaScadenza), false);
  });

  it("accetta un token un attimo prima della scadenza", async () => {
    const token = await createSessionToken(SECRET, ORA);
    const pocoPrima = ORA + (SESSION_MAX_AGE_SECONDS - 60) * 1000;
    assert.equal(await verifySessionToken(token, SECRET, pocoPrima), true);
  });

  it("rifiuta valori che non sono token", async () => {
    for (const valore of [undefined, "", ".", "senza-punto", "a.b", "...."]) {
      assert.equal(
        await verifySessionToken(valore, SECRET, ORA),
        false,
        `doveva rifiutare ${JSON.stringify(valore)}`,
      );
    }
  });

  it("non mette la password nel token", async () => {
    const token = await createSessionToken(SECRET, ORA);
    assert.ok(!token.includes(SECRET), "il segreto non deve comparire nel token");
  });
});
