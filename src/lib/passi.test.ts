import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPassi } from "./passi";

describe("scrivere i passi", () => {
  it("le migliaia separate da un punto, come in italiano", () => {
    assert.equal(formatPassi(8412), "8.412");
  });

  it("un numero sotto le mille non porta il punto", () => {
    assert.equal(formatPassi(999), "999");
  });

  it("arrotonda all'intero: i passi non si spezzano", () => {
    assert.equal(formatPassi(8412.6), "8.413");
  });

  it("regge anche i numeri a sei cifre", () => {
    assert.equal(formatPassi(100000), "100.000");
  });

  it("zero passi si scrive zero", () => {
    assert.equal(formatPassi(0), "0");
  });
});
