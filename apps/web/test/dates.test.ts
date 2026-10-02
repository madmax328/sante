import { describe, expect, it } from "vitest";
import { addDays, ageFrom, dayIndex, todayIn, weekStartOf } from "../src/lib/dates";

describe("dates", () => {
  it("finds the Monday of a week", () => {
    expect(weekStartOf("2026-10-02")).toBe("2026-09-28");
    expect(weekStartOf("2026-10-04")).toBe("2026-09-28");
    expect(weekStartOf("2026-10-05")).toBe("2026-10-05");
  });
  it("indexes days from Monday", () => {
    expect(dayIndex("2026-10-05")).toBe(0);
    expect(dayIndex("2026-10-11")).toBe(6);
  });
  it("adds days across months", () => {
    expect(addDays("2026-09-28", 6)).toBe("2026-10-04");
  });
  it("computes age on birthdays", () => {
    expect(ageFrom("2011-10-02", "2026-10-02")).toBe(15);
    expect(ageFrom("2011-10-03", "2026-10-02")).toBe(14);
  });
  it("uses the time zone for today", () => {
    expect(todayIn("Europe/Paris", new Date("2026-10-02T22:30:00Z"))).toBe("2026-10-03");
  });
});
