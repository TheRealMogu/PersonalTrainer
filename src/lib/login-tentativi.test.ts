import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_TENTATIVI,
  minutiDiBlocco,
  prossimoTentativo,
} from "./login-tentativi";

describe("minutiDiBlocco", () => {
  it("torna null senza uno stato precedente", () => {
    assert.equal(minutiDiBlocco(null, new Date()), null);
  });

  it("torna null se il blocco e' gia' scaduto", () => {
    const ora = new Date("2026-09-25T12:00:00Z");
    const stato = {
      tentativi: MAX_TENTATIVI,
      ultimoTentativo: new Date("2026-09-25T11:00:00Z"),
      bloccatoFino: new Date("2026-09-25T11:59:00Z"),
    };
    assert.equal(minutiDiBlocco(stato, ora), null);
  });

  it("arrotonda per eccesso i minuti restanti", () => {
    const ora = new Date("2026-09-25T12:00:00Z");
    const stato = {
      tentativi: MAX_TENTATIVI,
      ultimoTentativo: ora,
      bloccatoFino: new Date(ora.getTime() + 90_000), // 1m30s
    };
    assert.equal(minutiDiBlocco(stato, ora), 2);
  });
});

describe("prossimoTentativo", () => {
  it("il primo tentativo senza storia parte da 1, senza blocco", () => {
    const esito = prossimoTentativo(null, new Date());
    assert.deepEqual(esito, { tentativi: 1, bloccatoFino: null });
  });

  it("dentro la finestra somma ai tentativi precedenti", () => {
    const ora = new Date("2026-09-25T12:10:00Z");
    const stato = {
      tentativi: 3,
      ultimoTentativo: new Date("2026-09-25T12:05:00Z"),
      bloccatoFino: null,
    };
    const esito = prossimoTentativo(stato, ora);
    assert.equal(esito.tentativi, 4);
    assert.equal(esito.bloccatoFino, null);
  });

  it("fuori dalla finestra riparte da 1, come se non ci fosse storia", () => {
    const ora = new Date("2026-09-25T12:30:00Z");
    const stato = {
      tentativi: 7,
      ultimoTentativo: new Date("2026-09-25T12:00:00Z"), // 30 minuti fa
      bloccatoFino: null,
    };
    const esito = prossimoTentativo(stato, ora);
    assert.equal(esito.tentativi, 1);
    assert.equal(esito.bloccatoFino, null);
  });

  it("raggiunta la soglia scatta il blocco", () => {
    const ora = new Date("2026-09-25T12:10:00Z");
    const stato = {
      tentativi: MAX_TENTATIVI - 1,
      ultimoTentativo: ora,
      bloccatoFino: null,
    };
    const esito = prossimoTentativo(stato, ora);
    assert.equal(esito.tentativi, MAX_TENTATIVI);
    assert.ok(esito.bloccatoFino !== null);
    assert.ok(esito.bloccatoFino!.getTime() > ora.getTime());
  });
});
