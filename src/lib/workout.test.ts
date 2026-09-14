import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bestOneRepMax,
  estimatedOneRepMax,
  formatElapsed,
  formatVolume,
  formatWeight,
  groupByExercise,
  parseWeight,
  setVolume,
  suggestNextDayId,
  suggestNextSet,
  totalVolume,
  type LoggedSet,
} from "./workout";

const set = (id: number, exerciseId: number, setNumber: number, weight: number, reps: number): LoggedSet =>
  ({ id, exerciseId, setNumber, weight, reps });

describe("volume", () => {
  it("moltiplica carico per ripetizioni", () => {
    assert.equal(setVolume({ weight: 60, reps: 10 }), 600);
  });

  it("somma il volume di piu' serie", () => {
    assert.equal(totalVolume([{ weight: 60, reps: 10 }, { weight: 80, reps: 5 }]), 1000);
  });

  it("regge il corpo libero, dove il carico e' zero", () => {
    assert.equal(totalVolume([{ weight: 0, reps: 15 }]), 0);
  });

  it("su lista vuota fa zero", () => {
    assert.equal(totalVolume([]), 0);
  });
});

describe("pesi", () => {
  it("scrive i decimali con la virgola", () => {
    assert.equal(formatWeight(22.5), "22,5");
    assert.equal(formatWeight(60), "60");
  });

  it("arrotonda a un decimale", () => {
    assert.equal(formatWeight(67.48), "67,5");
  });

  it("legge sia la virgola sia il punto", () => {
    assert.equal(parseWeight("22,5"), 22.5);
    assert.equal(parseWeight("22.5"), 22.5);
    assert.equal(parseWeight("60"), 60);
    assert.equal(parseWeight(""), 0);
  });
});

describe("suggestNextSet", () => {
  const ultimaVolta = [{ weight: 60, reps: 8 }, { weight: 62.5, reps: 8 }];

  it("propone l'ultima serie di oggi quando ce n'e' gia' una", () => {
    const oggi = [{ weight: 65, reps: 8 }];
    assert.deepEqual(suggestNextSet(oggi, ultimaVolta), { weight: 65, reps: 8 });
  });

  it("ricade sull'ultima volta quando oggi non hai ancora fatto nulla", () => {
    assert.deepEqual(suggestNextSet([], ultimaVolta), { weight: 62.5, reps: 8 });
  });

  it("non propone niente senza storia: meglio vuoto che inventato", () => {
    assert.equal(suggestNextSet([], []), null);
  });

  it("prende davvero l'ultima, non la prima", () => {
    const oggi = [{ weight: 65, reps: 8 }, { weight: 70, reps: 6 }];
    assert.deepEqual(suggestNextSet(oggi, ultimaVolta), { weight: 70, reps: 6 });
  });
});

describe("groupByExercise", () => {
  it("raggruppa mantenendo l'ordine delle serie", () => {
    const grouped = groupByExercise([
      set(3, 10, 2, 65, 8),
      set(1, 10, 1, 60, 8),
      set(2, 20, 1, 30, 12),
    ]);
    assert.deepEqual([...grouped.keys()], [10, 20]);
    assert.deepEqual(grouped.get(10)!.map((s) => s.setNumber), [1, 2]);
    assert.equal(grouped.get(20)!.length, 1);
  });

  it("su lista vuota non crea gruppi", () => {
    assert.equal(groupByExercise([]).size, 0);
  });
});

describe("formatElapsed", () => {
  it("sotto l'ora usa mm:ss", () => {
    assert.equal(formatElapsed(0), "00:00");
    assert.equal(formatElapsed(65), "01:05");
    assert.equal(formatElapsed(3599), "59:59");
  });

  it("dall'ora in su aggiunge le ore", () => {
    assert.equal(formatElapsed(3600), "1:00:00");
    assert.equal(formatElapsed(4567), "1:16:07");
  });

  it("non va sotto zero", () => {
    assert.equal(formatElapsed(-10), "00:00");
  });
});

describe("massimale stimato", () => {
  it("segue la formula di Epley", () => {
    assert.equal(estimatedOneRepMax({ weight: 100, reps: 1 }), 100 * (1 + 1 / 30));
    assert.equal(estimatedOneRepMax({ weight: 100, reps: 30 }), 200);
  });

  it("rende confrontabili serie diverse", () => {
    const pesante = estimatedOneRepMax({ weight: 80, reps: 5 });
    const leggera = estimatedOneRepMax({ weight: 70, reps: 10 });
    // 80x5 -> 93.3 ; 70x10 -> 93.3 : quasi lo stesso lavoro, ed e' il punto
    assert.ok(Math.abs(pesante - leggera) < 1, `${pesante} vs ${leggera}`);
  });

  it("sale se sale il carico a parita' di ripetizioni", () => {
    assert.ok(
      estimatedOneRepMax({ weight: 82.5, reps: 5 }) > estimatedOneRepMax({ weight: 80, reps: 5 }),
    );
  });

  it("vale zero senza carico o senza ripetizioni", () => {
    assert.equal(estimatedOneRepMax({ weight: 0, reps: 10 }), 0);
    assert.equal(estimatedOneRepMax({ weight: 50, reps: 0 }), 0);
  });

  it("bestOneRepMax prende la serie migliore, non l'ultima", () => {
    const sets = [
      { weight: 60, reps: 10 },
      { weight: 90, reps: 3 },
      { weight: 50, reps: 12 },
    ];
    assert.equal(bestOneRepMax(sets), estimatedOneRepMax({ weight: 90, reps: 3 }));
  });

  it("su lista vuota fa zero", () => {
    assert.equal(bestOneRepMax([]), 0);
  });
});

describe("quale giornata tocca", () => {
  it("senza storico parte dalla prima", () => {
    assert.equal(suggestNextDayId([10, 20, 30], null), 10);
  });

  it("dopo una giornata propone la successiva", () => {
    assert.equal(suggestNextDayId([10, 20, 30], 10), 20);
    assert.equal(suggestNextDayId([10, 20, 30], 20), 30);
  });

  it("dopo l'ultima ricomincia dalla prima", () => {
    assert.equal(suggestNextDayId([10, 20, 30], 30), 10);
  });

  it("se l'ultima giornata non c'e' piu' nel programma riparte dalla prima", () => {
    // Capita dopo un seed che rifa' le giornate con id nuovi.
    assert.equal(suggestNextDayId([10, 20, 30], 99), 10);
  });

  it("con una sola giornata ripropone quella", () => {
    assert.equal(suggestNextDayId([7], 7), 7);
  });

  it("senza programma non propone niente", () => {
    assert.equal(suggestNextDayId([], null), null);
    assert.equal(suggestNextDayId([], 10), null);
  });
});

describe("formato del volume", () => {
  it("raggruppa le migliaia anche a quattro cifre", () => {
    // E' il caso su cui browser e server non erano d'accordo: Chromium
    // scriveva 2.935, Node 2935. Con il raggruppamento dichiarato, uno solo.
    assert.equal(formatVolume(2935), "2.935");
    assert.equal(formatVolume(4548), "4.548");
  });

  it("raggruppa anche sopra le cinque cifre", () => {
    assert.equal(formatVolume(12935), "12.935");
  });

  it("sotto il migliaio non mette niente", () => {
    assert.equal(formatVolume(196), "196");
    assert.equal(formatVolume(0), "0");
  });

  it("arrotonda all'intero: i grammi di volume non dicono niente", () => {
    assert.equal(formatVolume(2934.6), "2.935");
  });
});
