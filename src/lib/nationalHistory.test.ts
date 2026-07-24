import { describe, expect, it } from "vitest";
import { getNationalCompetitionHistory } from "./nationalHistory";

describe("national competition history", () => {
  it("returns only exact-year sourced records", () => {
    const records = getNationalCompetitionHistory({
      make: "Mazda",
      model: "MX-5 Miata",
      year: "2016"
    });

    expect(records.map((record) => record.classId)).toEqual(["cs", "csp"]);
    expect(records.every((record) => record.year === 2025)).toBe(true);
  });

  it("does not infer history for a different year or an unlisted vehicle", () => {
    expect(
      getNationalCompetitionHistory({ make: "Mazda", model: "MX-5 Miata", year: "2017" })
    ).toEqual([]);
    expect(
      getNationalCompetitionHistory({
        make: "Mazda",
        model: "",
        year: "",
        notListed: true,
        manualDescription: "2026 example car"
      })
    ).toEqual([]);
  });
});
