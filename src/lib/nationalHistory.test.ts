import { describe, expect, it } from "vitest";
import {
  VEHICLE_GENERATIONS,
  VEHICLE_HISTORY_VARIANTS
} from "../data/vehicle-generations";
import {
  getNationalCompetitionHistory,
  getNationalHistoryScope,
  hasReviewedNationalFamily,
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
      label: "NA 1.8L (1994-1997)"
    });
  });

  it.each([
    ["Ford", "Mustang", "2022", "S550", 2015, 2023, undefined],
    ["Chevrolet", "Corvette", "2019", "C7", 2014, 2019, undefined],
    ["Honda", "Civic", "2020", "tenth generation", 2016, 2021, undefined],
    ["Subaru", "BRZ", "2023", "ZD8 second generation", 2022, 2026, undefined],
    ["Porsche", "911", "2018", "991.2", 2017, 2019, "911 GT3"],
    ["Porsche", "Cayman", "2018", "718 / 982", 2017, 2025, "Cayman GTS"],
    [
      "Mitsubishi",
      "Lancer",
      "2006",
      "CT9A Evolution VIII/IX",
      2003,
      2007,
      undefined
    ],
    ["Volkswagen", "Golf", "2022", "Mk8 / A8", 2022, 2026, "Golf GTI"],
    ["Toyota", "Supra", "2021", "A90/A91", 2020, 2026, undefined],
    ["BMW", "M2", "2018", "F87", 2016, 2021, undefined]
  ])(
    "keeps %s %s winner records inside the reviewed %s scope",
    (make, model, year, generationLabel, startYear, endYear, variant) => {
      const selection = { make, model, year, variant };
      const scope = getNationalHistoryScope(selection);
      const records = getNationalCompetitionHistory(selection);

      expect(scope?.label).toContain(generationLabel);
      expect(records.length).toBeGreaterThan(0);
      expect(records.every((record) => (
        record.vehicleYear !== null &&
        record.vehicleYear >= startYear &&
        record.vehicleYear <= endYear
      ))).toBe(true);
    }
  );

  it("shows no broad history for a selector family outside the competitive-family ledger", () => {
    const selection = {
      make: "Toyota",
      model: "Corolla",
      year: "2025"
    };

    expect(hasReviewedNationalFamily(selection)).toBe(false);
    expect(getNationalHistoryScope(selection)).toBeNull();
    expect(getNationalCompetitionHistory(selection)).toEqual([]);
  });

  it("keeps every reviewed family generation range valid and non-overlapping", () => {
    expect(Object.keys(VEHICLE_GENERATIONS)).toHaveLength(40);

    for (const generations of Object.values(VEHICLE_GENERATIONS)) {
      const sorted = [...generations].sort(
        (left, right) => left.startYear - right.startYear
      );
      for (const [index, current] of sorted.entries()) {
        expect(current.startYear).toBeLessThanOrEqual(current.endYear);
        expect(current.sourceUrl).toMatch(/^https:\/\//);
        if (index > 0) {
          expect(sorted[index - 1].endYear).toBeLessThan(current.startYear);
        }
      }
    }
  });

  it("keeps every reviewed history-package definition usable and unambiguous", () => {
    for (const variants of Object.values(VEHICLE_HISTORY_VARIANTS)) {
      expect(new Set(variants.map((variant) => variant.id)).size).toBe(variants.length);
      for (const variant of variants) {
        expect(variant.label.length).toBeGreaterThan(0);
        expect(variant.selectionTerms.length).toBeGreaterThan(0);
        expect(variant.winnerTerms.length).toBeGreaterThan(0);
      }
    }
  });

  it.each([
    ["Acura", "NSX", "2020", undefined],
    ["Audi", "TT", "2016", undefined],
    ["BMW", "3 Series", "2015", "BMW 328"],
    ["BMW", "M2", "2018", undefined],
    ["BMW", "M3", "2011", undefined],
    ["BMW", "Z3", "2002", undefined],
    ["Chevrolet", "Camaro", "2022", "Camaro SS"],
    ["Chevrolet", "Corvette", "2019", "Corvette Grand Sport"],
    ["Eagle", "Talon", "1995", "Talon TSi AWD"],
    ["Ford", "Focus", "2017", "Focus RS"],
    ["Ford", "Mustang", "2021", "Mustang Mach 1"],
    ["Honda", "Civic", "2020", undefined],
    ["Honda", "S2000", "2000", undefined],
    ["Lotus", "Elise/Exige", "2006", "Lotus Elise"],
    ["Lotus", "Evora", "2011", "Evora S"],
    ["Mazda", "Mazda3", "2008", undefined],
    ["Mazda", "Mazda6", "2006", "Mazdaspeed6"],
    ["Mazda", "MX-5 Miata", "1997", undefined],
    ["Mazda", "RX-7", "1993", undefined],
    ["Mazda", "RX-8", "2005", undefined],
    ["Mini", "Cooper", "2007", "Cooper S"],
    ["Mitsubishi", "Lancer", "2006", "Lancer Evolution IX"],
    ["Nissan", "240SX", "1997", undefined],
    ["Nissan", "350z", "2008", undefined],
    ["Nissan", "Z", "2023", "Z Performance"],
    ["Pontiac", "Solstice", "2007", "Solstice GXP"],
    ["Porsche", "718", "2018", "718 Cayman GTS"],
    ["Porsche", "911", "2018", "911 GT3"],
    ["Porsche", "Boxster", "2012", "Boxster S"],
    ["Porsche", "Cayman", "2018", "Cayman GTS"],
    ["Porsche", "Turbo", "2002", undefined],
    ["Scion", "FR-S", "2015", undefined],
    ["Subaru", "BRZ", "2023", undefined],
    ["Subaru", "WRX", "2018", "WRX STI"],
    ["Tesla", "Model 3", "2022", undefined],
    ["Toyota", "Celica", "2003", "Celica GT"],
    ["Toyota", "GR86", "2023", undefined],
    ["Toyota", "GR Supra", "2021", undefined],
    ["Toyota", "MR2", "1993", undefined],
    ["Toyota", "Supra", "2021", undefined],
    ["Volkswagen", "Golf", "2022", "Golf GTI"]
  ])(
    "finds a same-generation winner for researched family %s %s (%s)",
    (make, model, year, variant) => {
      const selection = { make, model, year, variant };
      expect(hasReviewedNationalFamily(selection)).toBe(true);
      expect(getNationalHistoryScope(selection)).not.toBeNull();
      expect(getNationalCompetitionHistory(selection).length).toBeGreaterThan(0);
    }
  );

  it.each([
    ["Ford", "Mustang", "2021", "Mustang EcoBoost", "Mach 1"],
    ["Volkswagen", "Golf", "2022", "Golf R", "GTI"],
    ["Nissan", "350z", "2008", "350Z NISMO", "350Z"],
    ["Chevrolet", "Corvette", "2019", "Corvette Stingray", "Grand Sport"]
  ])(
    "does not borrow %s %s evidence across the %s package boundary",
    (make, model, year, variant, excludedText) => {
      const records = getNationalCompetitionHistory({
        make,
        model,
        year,
        variant
      });

      expect(
        records.some((record) =>
          record.vehicle.toLowerCase().includes(excludedText.toLowerCase())
        )
      ).toBe(false);
    }
  );

  it("keeps Civic Type R history separate from Si and Sport history", () => {
    const records = getNationalCompetitionHistory({
      make: "Honda",
      model: "Civic",
      year: "2020",
      variant: "Civic Type R"
    });

    expect(records.length).toBeGreaterThan(0);
    expect(records.every((record) => /type[- ]?r/i.test(record.vehicle))).toBe(true);
  });

  it("separates Elise and Exige evidence inside their shared selector family", () => {
    const eliseRecords = getNationalCompetitionHistory({
      make: "Lotus",
      model: "Elise/Exige",
      year: "2006",
      variant: "Lotus Elise"
    });
    const exigeRecords = getNationalCompetitionHistory({
      make: "Lotus",
      model: "Elise/Exige",
      year: "2007",
      variant: "Lotus Exige S"
    });

    expect(eliseRecords.length).toBeGreaterThan(0);
    expect(eliseRecords.every((record) => /elise/i.test(record.vehicle))).toBe(true);
    expect(exigeRecords.length).toBeGreaterThan(0);
    expect(exigeRecords.every((record) => /exige/i.test(record.vehicle))).toBe(true);
  });

  it("does not infer a trim from generic winner text", () => {
    expect(
      getNationalCompetitionHistory({
        make: "Honda",
        model: "S2000",
        year: "2008",
        variant: "S2000 CR"
      })
    ).toEqual([]);
    expect(
      getNationalCompetitionHistory({
        make: "Tesla",
        model: "Model 3",
        year: "2022",
        variant: "Model 3 (AWD/Performance 18-23)"
      })
    ).toEqual([]);
  });

  it("does not borrow M3 or 328 evidence for another BMW 3 Series package", () => {
    const records = getNationalCompetitionHistory({
      make: "BMW",
      model: "3 Series",
      year: "2015",
      variant: "BMW 340"
    });

    expect(records).toEqual([]);
  });

  it("keeps refreshed Model 3 selections out of pre-refresh history", () => {
    expect(
      getNationalCompetitionHistory({
        make: "Tesla",
        model: "Model 3",
        year: "2024"
      })
    ).toEqual([]);
  });

  it("keeps Supra engine families separate when the package is known", () => {
    const sixCylinder = getNationalCompetitionHistory({
      make: "Toyota",
      model: "GR Supra",
      year: "2021",
      variant: "Supra (6 cyl) (2020-26)"
    });
    const fourCylinder = getNationalCompetitionHistory({
      make: "Toyota",
      model: "GR Supra",
      year: "2021",
      variant: "Supra (4 cyl) (2020-24)"
    });

    expect(sixCylinder.length).toBeGreaterThan(0);
    expect(sixCylinder.every((record) => /3\.0|\bmt\b/i.test(record.vehicle))).toBe(true);
    expect(fourCylinder).toEqual([]);
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
