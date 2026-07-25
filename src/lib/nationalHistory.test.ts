import { describe, expect, it } from "vitest";
import {
  getNationalCompetitionHistory,
  legalTireGuidance,
  NATIONAL_CANCELLED_YEARS,
  NATIONAL_EVENT_YEARS,
  summarizeTireBrands
} from "./nationalHistory";

describe("national competition history", () => {
  it("returns official model-family wins across the complete ten-year window", () => {
    const records = getNationalCompetitionHistory({
      make: "Mazda",
      model: "MX-5 Miata",
      year: "2016"
    });

    expect(records.length).toBeGreaterThan(50);
    expect(records.some((record) => record.classId === "cs")).toBe(true);
    expect(records.some((record) => record.classId === "csp")).toBe(true);
    expect(records.some((record) => record.classId === "xb")).toBe(true);
    expect(new Set(records.map((record) => record.year))).toEqual(
      new Set(NATIONAL_EVENT_YEARS)
    );
    expect(NATIONAL_CANCELLED_YEARS).toEqual([2020]);
  });

  it("uses model-family history rather than pretending one model year is the only match", () => {
    const first = getNationalCompetitionHistory({
      make: "Mazda",
      model: "MX-5 Miata",
      year: "2016"
    });
    const second = getNationalCompetitionHistory({
      make: "Mazda",
      model: "MX-5 Miata",
      year: "2017"
    });

    expect(second).toEqual(first);
  });

  it("does not infer records for an unlisted vehicle or a different manufacturer", () => {
    expect(
      getNationalCompetitionHistory({
        make: "Mazda",
        model: "",
        year: "",
        notListed: true,
        manualDescription: "2026 example car"
      })
    ).toEqual([]);
    expect(
      getNationalCompetitionHistory({
        make: "Toyota",
        model: "MX-5 Miata",
        year: "2025"
      })
    ).toEqual([]);
  });

  it("reports observed manufacturer share without inventing tire dimensions", () => {
    const records = getNationalCompetitionHistory({
      make: "Mazda",
      model: "MX-5 Miata",
      year: "1999"
    });
    const brands = summarizeTireBrands(records);

    expect(brands[0].wins).toBeGreaterThan(0);
    expect(brands.reduce((total, brand) => total + brand.share, 0)).toBeCloseTo(1);
    expect(legalTireGuidance("es")).toContain("no fixed section-width cap");
    expect(legalTireGuidance("est")).toContain("225 mm");
  });
});
