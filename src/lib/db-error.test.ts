import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyDbError, describeDbError } from "./db-error";

/** Riproduce la forma vera: drizzle incarta l'errore del driver in `cause`. */
function drizzleWrapped(cause: unknown) {
  const error = new Error('Failed query: select "slot" from "meals"');
  (error as Error & { cause?: unknown }).cause = cause;
  return error;
}

function neonError(code: string, message = "errore") {
  const error = new Error(message);
  (error as Error & { code?: string }).code = code;
  return error;
}

describe("classificazione degli errori del database", () => {
  it("riconosce una colonna mancante dentro la catena delle cause", () => {
    // E' l'errore vero visto in produzione: migration non applicate.
    const error = drizzleWrapped(neonError("42703", 'column "slot" does not exist'));
    assert.equal(classifyDbError(error), "schema");
  });

  it("riconosce una tabella mancante", () => {
    assert.equal(classifyDbError(drizzleWrapped(neonError("42P01"))), "schema");
  });

  it("riconosce un tipo enum mai creato", () => {
    assert.equal(classifyDbError(drizzleWrapped(neonError("42704"))), "schema");
  });

  it("riconosce i codici di rete", () => {
    for (const code of ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"]) {
      assert.equal(classifyDbError(neonError(code)), "rete", code);
    }
  });

  it("riconosce il fallimento di fetch, che non porta codice", () => {
    assert.equal(classifyDbError(drizzleWrapped(new Error("fetch failed"))), "rete");
  });

  it("riconosce la variabile mancante", () => {
    assert.equal(classifyDbError(new Error("DATABASE_URL non impostata. In locale…")), "configurazione");
  });

  it("riconosce una connection string malformata", () => {
    assert.equal(
      classifyDbError(new Error("Database connection string provided to `neon()` is not a valid URL.")),
      "configurazione",
    );
  });

  it("lo schema ha la precedenza sulla rete quando ci sono entrambi", () => {
    // Un errore di schema con un messaggio che nomina il timeout non deve
    // diventare "riprova fra qualche secondo": riprovare non lo ripara.
    const error = drizzleWrapped(neonError("42703", "column does not exist (timeout?)"));
    assert.equal(classifyDbError(error), "schema");
  });

  it("non inventa una diagnosi quando non riconosce niente", () => {
    assert.equal(classifyDbError(new Error("boh")), "sconosciuto");
    assert.equal(classifyDbError(null), "sconosciuto");
    assert.equal(classifyDbError("una stringa"), "sconosciuto");
    assert.equal(classifyDbError(undefined), "sconosciuto");
  });

  it("non gira all'infinito su una catena che si auto-riferisce", () => {
    const a = new Error("a");
    (a as Error & { cause?: unknown }).cause = a;
    assert.equal(classifyDbError(a), "sconosciuto");
  });

  it("ogni classificazione ha un testo in italiano", () => {
    for (const kind of ["schema", "rete", "configurazione", "sconosciuto"] as const) {
      const { title, body } = describeDbError(kind);
      assert.ok(title.length > 0, kind);
      assert.ok(body.length > 0, kind);
    }
  });

  it("solo il caso schema propone un comando da lanciare", () => {
    assert.equal(describeDbError("schema").command, "npm run db:migrate");
    assert.equal(describeDbError("rete").command, undefined);
    assert.equal(describeDbError("sconosciuto").command, undefined);
  });
});
