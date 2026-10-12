import { describe, expect, it } from "vitest";
import { exercises } from "../src/exercises";

describe("exercises in English", () => {
  it("has every step and tip translated", () => {
    for (const x of exercises) {
      expect(x.name.en, x.id).toBeTruthy();
      for (const s of [...x.steps, ...x.tips]) expect(s.en, `${x.id}: ${s.fr}`).toBeTruthy();
    }
  });
});
