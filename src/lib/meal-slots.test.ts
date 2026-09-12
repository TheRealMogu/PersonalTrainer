import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupBySlot, isMealSlot, MEAL_SLOTS, slotForHour } from "./meal-slots";
import type { Meal } from "@/db/schema";

const meal = (id: number, slot: string): Meal =>
  ({
    id, day: "2026-09-12", slot, name: `pasto ${id}`, quantity: 1,
    kcal: 100, carbs: 1, protein: 1, fat: 1, createdAt: new Date(),
  }) as unknown as Meal;

describe("slotForHour", () => {
  it("propone il momento giusto lungo la giornata", () => {
    assert.equal(slotForHour(7), "colazione");
    assert.equal(slotForHour(10), "colazione");
    assert.equal(slotForHour(13), "pranzo");
    assert.equal(slotForHour(16), "spuntino");
    assert.equal(slotForHour(20), "cena");
    assert.equal(slotForHour(23), "spuntino");
  });

  it("copre tutte le 24 ore con un momento valido", () => {
    for (let hour = 0; hour < 24; hour += 1) {
      assert.ok(isMealSlot(slotForHour(hour)), `ora ${hour} senza momento valido`);
    }
  });
});

describe("isMealSlot", () => {
  it("accetta solo i quattro momenti", () => {
    for (const slot of MEAL_SLOTS) assert.equal(isMealSlot(slot), true);
    assert.equal(isMealSlot("merenda"), false);
    assert.equal(isMealSlot(""), false);
    assert.equal(isMealSlot(null), false);
    assert.equal(isMealSlot(42), false);
  });
});

describe("groupBySlot", () => {
  it("mette ogni pasto nel suo momento", () => {
    const grouped = groupBySlot([meal(1, "cena"), meal(2, "colazione"), meal(3, "cena")]);
    assert.deepEqual(grouped.colazione.map((m) => m.id), [2]);
    assert.deepEqual(grouped.cena.map((m) => m.id), [1, 3]);
    assert.equal(grouped.pranzo.length, 0);
  });

  it("restituisce sempre tutti e quattro i gruppi", () => {
    assert.deepEqual(Object.keys(groupBySlot([])).sort(), [...MEAL_SLOTS].sort());
  });
});
