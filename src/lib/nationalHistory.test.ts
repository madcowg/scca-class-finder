import { describe, expect, it } from "vitest";
import {
  getNationalCompetitionHistory,
  getNationalHistoryScope,
  legalTireGuidance,
  NATIONAL_EVENT_YEARS,
  summarizeTireBrands
} from "./nationalHistory";

describe("national competition history", () => {
  it("returns only same-generation wins across the five-year window", () => {
    const records = getNationalCompetitionHistory({
      make: "Mazda",
      model: "MX-5 Miata",
      year: "1997"
    });

    expect(records.length).toBeGreaterThan(0);
    expect(records.some((record) => record.classId === "csp")).toBe(true);
    expect(records.some((record) => record.classId === "xb")).toBe(true);
    expect(records.every((record) => (
      record.year >= 2021 &&
      record.year <= 2025 &&
      record.vehicleYear !== null &&
      record.vehicleYear >= 1994 &&
      record.vehicleYear <= 1997
    ))).toBe(true);
    expect(records.some((record) => record.vehicleYear === 1999)).toBe(false);
    expect(NATIONAL_EVENT_YEARS).toEqual([2021, 2022, 2023, 2024, 2025]);
  });

  it("uses the reviewed generation instead of requiring an exact model-year match", () => {
    const first = getNationalCompetitionHistory({
      make: "Mazda",
      model: "MX-5 Miata",
      year: "1994"
    });
    const second = getNationalCompetitionHistory({
      make: "Mazda",
      model: "MX-5 Miata",
      year: "1997"
    });

    expect(second).toEqual(first);
    expect(getNationalHistoryScope({
      make: "Mazda",
      model: "MX-5 Miata",
      year: "1997"
    })).toMatchObject({
      label: "NA 1.8L (1994-1997)",
      generationVerified: true
    });
  });

  it("falls back to exact year when a generation range is not reviewed", () => {
    const scope = getNationalHistoryScope({
      make: "Ford",
      model: "Mustang",
      year: "2022"
    });
    const records = getNationalCompetitionHistory({
      make: "Ford",
      model: "Mustang",
      year: "2022"
    });

    expect(scope).toEqual({
      label: "2022 model year only",
      startYear: 2022,
      endYear: 2022,
      generationVerified: false,
      sourceUrl: null
    });
    expect(records.every((record) => record.vehicleYear === 2022)).toBe(true);
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
