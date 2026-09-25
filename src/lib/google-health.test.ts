import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  costruisciRedirectUri,
  costruisciUrlAutorizzazione,
  fitbitConfigurato,
  normalizzaPassiGiornalieri,
} from "./google-health";

function conCredenziali<T>(fn: () => T): T {
  const prima = {
    id: process.env.GOOGLE_HEALTH_CLIENT_ID,
    secret: process.env.GOOGLE_HEALTH_CLIENT_SECRET,
  };
  process.env.GOOGLE_HEALTH_CLIENT_ID = "client-di-prova";
  process.env.GOOGLE_HEALTH_CLIENT_SECRET = "segreto-di-prova";
  try {
    return fn();
  } finally {
    if (prima.id === undefined) delete process.env.GOOGLE_HEALTH_CLIENT_ID;
    else process.env.GOOGLE_HEALTH_CLIENT_ID = prima.id;
    if (prima.secret === undefined)
      delete process.env.GOOGLE_HEALTH_CLIENT_SECRET;
    else process.env.GOOGLE_HEALTH_CLIENT_SECRET = prima.secret;
  }
}

function senzaCredenziali<T>(fn: () => T): T {
  const prima = {
    id: process.env.GOOGLE_HEALTH_CLIENT_ID,
    secret: process.env.GOOGLE_HEALTH_CLIENT_SECRET,
  };
  delete process.env.GOOGLE_HEALTH_CLIENT_ID;
  delete process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  try {
    return fn();
  } finally {
    if (prima.id !== undefined) process.env.GOOGLE_HEALTH_CLIENT_ID = prima.id;
    if (prima.secret !== undefined)
      process.env.GOOGLE_HEALTH_CLIENT_SECRET = prima.secret;
  }
}

describe("fitbitConfigurato", () => {
  it("è falso senza le chiavi", () => {
    senzaCredenziali(() => assert.equal(fitbitConfigurato(), false));
  });

  it("è vero con entrambe le chiavi", () => {
    conCredenziali(() => assert.equal(fitbitConfigurato(), true));
  });
});

describe("costruisciUrlAutorizzazione", () => {
  it("torna null senza le chiavi", () => {
    senzaCredenziali(() =>
      assert.equal(
        costruisciUrlAutorizzazione("https://esempio.it/callback", "xyz"),
        null,
      ),
    );
  });

  it("include scope, redirect_uri e state con le chiavi presenti", () => {
    conCredenziali(() => {
      const url = costruisciUrlAutorizzazione(
        "https://esempio.it/api/fitbit/callback",
        "stato-123",
      );
      assert.ok(url);
      const parsed = new URL(url!);
      assert.equal(parsed.origin, "https://accounts.google.com");
      assert.equal(
        parsed.searchParams.get("redirect_uri"),
        "https://esempio.it/api/fitbit/callback",
      );
      assert.equal(parsed.searchParams.get("state"), "stato-123");
      assert.equal(parsed.searchParams.get("access_type"), "offline");
      assert.equal(parsed.searchParams.get("prompt"), "consent");
      assert.match(
        parsed.searchParams.get("scope") ?? "",
        /activity_and_fitness\.readonly$/,
      );
    });
  });
});

describe("costruisciRedirectUri", () => {
  it("torna null senza APP_URL", () => {
    const prima = process.env.APP_URL;
    delete process.env.APP_URL;
    try {
      assert.equal(costruisciRedirectUri(), null);
    } finally {
      if (prima !== undefined) process.env.APP_URL = prima;
    }
  });

  it("toglie lo slash finale e aggiunge il percorso del callback", () => {
    const prima = process.env.APP_URL;
    process.env.APP_URL = "https://esempio.vercel.app/";
    try {
      assert.equal(
        costruisciRedirectUri(),
        "https://esempio.vercel.app/api/fitbit/callback",
      );
    } finally {
      if (prima === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = prima;
    }
  });
});

describe("normalizzaPassiGiornalieri", () => {
  it("legge countSum da un rollupDataPoint, come nella forma documentata", () => {
    const passi = normalizzaPassiGiornalieri({
      rollupDataPoints: [
        {
          startTime: "2026-09-24T22:00:00Z",
          endTime: "2026-09-25T22:00:00Z",
          steps: { countSum: "8412" },
        },
      ],
    });
    assert.equal(passi, 8412);
  });

  it("somma più punti se Google ne restituisce più di uno", () => {
    const passi = normalizzaPassiGiornalieri({
      rollupDataPoints: [
        { steps: { countSum: "5000" } },
        { steps: { countSum: "3412" } },
      ],
    });
    assert.equal(passi, 8412);
  });

  it("torna null (non zero) se non c'è nessun punto utilizzabile", () => {
    assert.equal(normalizzaPassiGiornalieri({ rollupDataPoints: [] }), null);
    assert.equal(normalizzaPassiGiornalieri({}), null);
    assert.equal(normalizzaPassiGiornalieri(null), null);
    assert.equal(
      normalizzaPassiGiornalieri({ rollupDataPoints: [{ steps: {} }] }),
      null,
    );
  });

  it("ignora un countSum non numerico invece di far esplodere il diario", () => {
    const passi = normalizzaPassiGiornalieri({
      rollupDataPoints: [{ steps: { countSum: "non-un-numero" } }],
    });
    assert.equal(passi, null);
  });
});
