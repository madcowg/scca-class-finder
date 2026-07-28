import { describe, expect, it } from "vitest";
import { classifyVehicle, classifyVehicleWithMapping } from "./classifier";
import { DEFAULT_BUILD } from "./rules";
import type { VehicleMapping } from "./types";
import { getMakes, getModels, getVehicleMapping, getVehicleVariants, getYears } from "./vehicleData";
import { CURRENT_APPENDIX_A_STOCK_CASES } from "./verifiedCases";

const miata = { make: "Mazda", model: "MX-5 Miata", year: "2016" };
const reviewedMiataMapping: VehicleMapping = {
  selection: miata,
  classes: ["cs", "ast", "dsp", "ssm", "dp"],
  source: "2026-current-override",
  coverage: "full-mapping",
  sourceNote: "Test fixture representing a fully reviewed first-party placement."
};

function classifyReviewedMiata(build = DEFAULT_BUILD) {
  return classifyVehicleWithMapping(miata, build, reviewedMiataMapping);
}

describe("classifyVehicle", () => {
  it("uses the official Appendix A listing rather than the production catalog as authority", () => {
    const result = classifyVehicle(miata, DEFAULT_BUILD);
    expect(result.selectedCategory).toBe("street");
    expect(result.selectedClass).toBe("cs");
    expect(result.mapping?.source).toBe("2026-rulebook-appendix-a");
    expect(result.mapping?.classSources?.cs.sourceUrl).toContain("#page=198");
  });

  it("places a reviewed Street-legal 2016 MX-5 in CS", () => {
    const result = classifyReviewedMiata();
    expect(result.selectedCategory).toBe("street");
    expect(result.selectedClass).toBe("cs");
    expect(result.confidence).toBe("high");
  });

  it("explains why a Street Touring Miata build leaves Street", () => {
    const result = classifyReviewedMiata({
      ...DEFAULT_BUILD,
      springs: "coilovers",
      swayBars: "bothChanged",
      alignment: "streetTouringHardware",
      intake: "toThrottleBody",
      ecu: "reflash"
    });

    expect(result.evaluations[0].status).toBe("blocked");
    expect(result.selectedCategory).toBe("streetTouring");
    expect(result.selectedClass).toBe("ast");
    expect(result.findings.find((finding) => finding.field === "springs")?.section).toBe("14.8.A");
  });

  it("uses the Section 14 differential allowance without treating it as manual review", () => {
    const result = classifyReviewedMiata({
      ...DEFAULT_BUILD,
      differential: "streetTouringLsd"
    });

    expect(result.preparation.minimumLegalCategory).toBe("streetTouring");
    expect(result.selectedClass).toBe("ast");
    expect(result.findings.find((finding) => finding.field === "differential")?.section).toBe(
      "14.10.G / 14.10.H"
    );
  });

  it("moves an R-comp build to the first listed SP-or-higher category", () => {
    const result = classifyReviewedMiata({
      ...DEFAULT_BUILD,
      tires: "dotBelow200"
    });
    expect(result.selectedCategory).toBe("streetPrepared");
    expect(result.selectedClass).toBe("dsp");
  });

  it("does not over-bump Street Prepared-scope engine changes into Street Modified", () => {
    const result = classifyReviewedMiata({
      ...DEFAULT_BUILD,
      engine: "boostOrInternal"
    });
    expect(result.selectedCategory).toBe("streetPrepared");
    expect(result.selectedClass).toBe("dsp");
    expect(result.findings.find((finding) => finding.field === "engine")?.section).toBe(
      "15.10.C / 15.10.R-Z"
    );
  });

  it("moves an engine-swap build to Street Modified when the Section 16 body/weight facts are provided", () => {
    const withoutSmFacts = classifyReviewedMiata({
      ...DEFAULT_BUILD,
      engine: "swapOrAddedInduction"
    });
    expect(withoutSmFacts.selectedCategory).not.toBe("streetModified");

    const result = classifyReviewedMiata({
      ...DEFAULT_BUILD,
      engine: "swapOrAddedInduction",
      drivetrainLayout: "rwd",
      bodyConfiguration: "twoSeat",
      inductionType: "naturallyAspirated",
      engineDisplacementLiters: "2.0",
      measuredWeightNoDriver: "2200",
      tireWidthCategory: "over275",
      solidAxleRwd: "no"
    });
    expect(result.selectedCategory).toBe("streetModified");
    expect(result.selectedClass).toBe("ssm");
    expect(result.streetModified.minimumWeights.ssm).toBe(2000);
  });

  it("requires manual review for spring attachment-point changes", () => {
    const result = classifyVehicle(miata, {
      ...DEFAULT_BUILD,
      springs: "changedAttachmentPoints"
    });
    expect(result.selectedClass).toBeNull();
    expect(result.confidence).toBe("manual-review");
    expect(result.findings.find((finding) => finding.field === "springs")?.manualReview).toBe(true);
  });

  it("uses corrected 2026 current Street placements for modern cars", () => {
    const integraTypeS = classifyVehicle(
      { make: "Acura", model: "Integra", variant: "Type S", year: "2026" },
      DEFAULT_BUILD
    );
    expect(integraTypeS.selectedClass).toBe("as");
    expect(integraTypeS.confidence).toBe("limited");

    const m240i = classifyVehicle(
      { make: "BMW", model: "M240i", year: "2026" },
      DEFAULT_BUILD
    );
    expect(m240i.selectedClass).toBe("es");

    const civicTypeR = classifyVehicle(
      { make: "Honda", model: "Civic Type-R", year: "2026" },
      DEFAULT_BUILD
    );
    expect(civicTypeR.selectedClass).toBe("as");
  });

  it("returns the current Appendix A result for ten online-verifiable stock vehicles", () => {
    for (const vehicleCase of CURRENT_APPENDIX_A_STOCK_CASES) {
      const result = classifyVehicle(vehicleCase.selection, DEFAULT_BUILD);

      expect(result.selectedClass, vehicleCase.label).toBe(vehicleCase.expectedClass);
      expect(result.selectedCategory, vehicleCase.label).toBe("street");
      expect(result.confidence, vehicleCase.label).toBe("limited");
      expect(result.messages.join(" "), vehicleCase.label).toContain("modification profile");
    }
  });

  it("resolves exact current rulebook packages across manufacturers", () => {
    const cases = [
      {
        selection: {
          make: "Ford",
          model: "Mustang",
          year: "2026",
          variant: "Mustang EcoBoost (2015-26)"
        },
        expected: "ds"
      },
      {
        selection: {
          make: "Ford",
          model: "Mustang",
          year: "2026",
          variant: "Mustang GT (incl. Performance Package Level 1 and Level 2) (2010-26)"
        },
        expected: "fs"
      },
      {
        selection: {
          make: "Tesla",
          model: "Model Y",
          year: "2024",
          variant: "Model Y (AWD/Performance 20-24)"
        },
        expected: "as"
      },
      {
        selection: {
          make: "Subaru",
          model: "BRZ",
          year: "2023",
          variant: "BRZ (2022-26) including tS"
        },
        expected: "ds"
      },
      {
        selection: {
          make: "Chevrolet",
          model: "Corvette",
          year: "2024",
          variant: "Corvette Stingray (C8) (2020-26)"
        },
        expected: "ss"
      }
    ];

    for (const vehicleCase of cases) {
      const result = classifyVehicle(vehicleCase.selection, DEFAULT_BUILD);
      expect(result.selectedClass, JSON.stringify(vehicleCase.selection)).toBe(
        vehicleCase.expected
      );
      expect(result.mapping?.source).toBe("2026-rulebook-appendix-a");
      expect(result.mapping?.classSources?.[vehicleCase.expected]).toBeDefined();
    }
  });

  it("intersects a Miata build with matching official category placements", () => {
    const street = classifyVehicle(miata, DEFAULT_BUILD);
    expect(street.selectedClass).toBe("cs");
    expect(street.mapping?.classes).toEqual(expect.arrayContaining(["cs", "ast", "csp"]));

    const touring = classifyVehicle(miata, {
      ...DEFAULT_BUILD,
      springs: "coilovers"
    });
    expect(touring.selectedCategory).toBe("streetTouring");
    expect(touring.selectedClass).toBe("ast");

    const prepared = classifyVehicle(miata, {
      ...DEFAULT_BUILD,
      tires: "dotBelow200"
    });
    expect(prepared.selectedCategory).toBe("streetPrepared");
    expect(prepared.selectedClass).toBe("csp");
  });

  it("requires the controlling S2000 package instead of guessing between AS and CS", () => {
    const ambiguous = classifyVehicle(
      { make: "Honda", model: "S2000", year: "2008" },
      DEFAULT_BUILD
    );
    expect(ambiguous.selectedClass).toBeNull();
    expect(ambiguous.confidence).toBe("manual-review");

    const cr = classifyVehicle(
      { make: "Honda", model: "S2000", year: "2008", variant: "S2000 CR" },
      DEFAULT_BUILD
    );
    const nonCr = classifyVehicle(
      { make: "Honda", model: "S2000", year: "2008", variant: "S2000 (non-CR)" },
      DEFAULT_BUILD
    );
    expect(cr.selectedClass).toBe("as");
    expect(nonCr.selectedClass).toBe("cs");
  });

  it("does not cross-match incompatible chassis generations or explicit exclusions", () => {
    const modernM3 = getVehicleMapping({
      make: "BMW",
      model: "M3",
      year: "2024",
      variant: "M3 (with MP Sports Suspension) (G80) (2023-2026)"
    });
    expect(modernM3?.classes).toContain("ss");
    expect(modernM3?.classes).not.toContain("dsp");
    expect(modernM3?.classes).not.toContain("esp");

    const boxsterFourLiter = getVehicleMapping({
      make: "Porsche",
      model: "718",
      year: "2024",
      variant: "718 Boxster (GTS 4.0, Spyder) (2017-25)"
    });
    expect(boxsterFourLiter?.classes).toContain("ss");
    expect(boxsterFourLiter?.classes).not.toContain("sst");

    const earlyCorvette = getVehicleMapping({
      make: "Chevrolet",
      model: "Corvette",
      year: "older",
      variant: "Corvette (1953-62)"
    });
    expect(earlyCorvette?.classes).toEqual(expect.arrayContaining(["fs", "dsp"]));
    expect(earlyCorvette?.classes).not.toContain("bst");
    expect(earlyCorvette?.classes).not.toContain("ssp");

    const c8Stingray = getVehicleMapping({
      make: "Chevrolet",
      model: "Corvette",
      year: "2024",
      variant: "Corvette Stingray (C8) (2020-26)"
    });
    expect(c8Stingray?.classes).toEqual(expect.arrayContaining(["ss", "ssp"]));
    expect(c8Stingray?.classSources?.ssp.description).toContain("Stingray");
  });

  it("links a Street Touring or Street Prepared listing to its Street counterpart despite rulebook wording differences", () => {
    const m240i = getVehicleMapping({
      make: "BMW",
      model: "M240",
      year: "2020",
      variant: "M240i (incl. xDrive) (2017-26)"
    });
    expect(m240i?.classes).toEqual(expect.arrayContaining(["fs", "sst"]));

    const camaroTurbo = getVehicleMapping({
      make: "Chevrolet",
      model: "Camaro",
      year: "2018",
      variant: "Camaro LS & LT (2.0L Turbo; including 1LE) (2016-24)"
    });
    expect(camaroTurbo?.classes).toEqual(expect.arrayContaining(["ds", "sst"]));

    const emira = getVehicleMapping({ make: "Lotus", model: "Emira", year: "2024" });
    expect(emira?.classes).toEqual(expect.arrayContaining(["ss", "sst"]));
  });

  it("does not leak timeless old-generation variants into a modern model year", () => {
    const nsxVariants = getVehicleVariants("Acura", "NSX", "2017").map(
      (variant) => variant.value
    );
    expect(nsxVariants).toContain("NSX (2017-21)");
    expect(nsxVariants).not.toContain("NSX (non-Zanardi Edition)");
    expect(getVehicleVariants("Ford", "Mustang", "2026").map((variant) => variant.value))
      .not.toContain("Mustang SVT Cobra");
  });

  it("uses explicit Appendix A year ranges for low-volume cars missing from EPA", () => {
    expect(getMakes("2013")).toContain("McLaren");
    expect(getModels("McLaren", "2013")).toContain("MP4-12C");
    expect(
      classifyVehicle(
        {
          make: "McLaren",
          model: "MP4-12C",
          year: "2013",
          variant: "MP4-12C (2012-14)"
        },
        DEFAULT_BUILD
      ).selectedClass
    ).toBe("ss");

    expect(getMakes("2010")).toContain("Tesla");
    expect(
      classifyVehicle(
        {
          make: "Tesla",
          model: "Roadster",
          year: "2010",
          variant: "Roadster (all) (2008-13)"
        },
        DEFAULT_BUILD
    ).selectedClass
    ).toBe("ss");
  });

  it("keeps explicit Appendix A vehicles reachable when production names differ", () => {
    const cases = [
      {
        selection: {
          make: "Audi",
          model: "TTS Coupe",
          year: "2009",
          variant: "TTS (2009-15)"
        },
        expectedClass: "ds"
      },
      {
        selection: {
          make: "Chrysler",
          model: "300M",
          year: "1999",
          variant: "300M (1999-2004)"
        },
        expectedClass: "hs"
      },
      {
        selection: {
          make: "Dodge",
          model: "Caliber",
          year: "2008",
          variant: "Caliber SRT4 (2008-09)"
        },
        expectedClass: "hs"
      },
      {
        selection: {
          make: "Dodge",
          model: "Ram",
          year: "2004",
          variant: "Ram SRT10 (2004-06)"
        },
        expectedClass: "fs"
      },
      {
        selection: {
          make: "Kia",
          model: "Forte",
          year: "2014",
          variant: "Forte5 (2014-18)"
        },
        expectedClass: "hs"
      },
      {
        selection: {
          make: "Mercedes-Benz",
          model: "C-Class",
          year: "1999",
          variant: "280 (1995-2000)"
        },
        expectedClass: "hs"
      },
      {
        selection: {
          make: "Saab",
          model: "9-2X",
          year: "2005",
          variant: "9-2X Aero (2.0L Turbo) (2005-06)"
        },
        expectedClass: "hs"
      },
      {
        selection: {
          make: "Subaru",
          model: "Legacy/Outback",
          year: "2005",
          variant: "Legacy 2.5GT (2005-12)"
        },
        expectedClass: "hs"
      }
    ];

    for (const vehicleCase of cases) {
      expect(getModels(vehicleCase.selection.make, vehicleCase.selection.year)).toContain(
        vehicleCase.selection.model
      );
      expect(
        getVehicleVariants(
          vehicleCase.selection.make,
          vehicleCase.selection.model,
          vehicleCase.selection.year
        ).map((variant) => variant.value)
      ).toContain(vehicleCase.selection.variant);
      expect(classifyVehicle(vehicleCase.selection, DEFAULT_BUILD).selectedClass).toBe(
        vehicleCase.expectedClass
      );
    }
  });

  it("maps rulebook trim wording onto the production model family", () => {
    const lotusVariants = getVehicleVariants("Lotus", "Elise/Exige", "2009").map(
      (variant) => variant.value
    );
    expect(lotusVariants).toContain("Elise SC (2008-11)");
    expect(lotusVariants).toContain("Exige S (non-S260, non-Club Racer) (2007-11)");

    const cla = classifyVehicle(
      {
        make: "Mercedes-Benz",
        model: "CLA-Class",
        year: "2021",
        variant: "AMG CLA 35 Coupe (2021)"
      },
      DEFAULT_BUILD
    );
    expect(cla.selectedClass).toBe("ds");
  });

  it("accepts legacy alias labels for curated current entries", () => {
    const result = classifyVehicle(
      { make: "Acura", model: "Integra Type S (DE5)", year: "2026" },
      DEFAULT_BUILD
    );
    expect(result.mapping?.selection.model).toBe("Integra");
    expect(result.mapping?.selection.variant).toBe("Type S");
    expect(result.selectedClass).toBe("as");
  });

  it("exposes reviewed model families and keeps packages in the variant field", () => {
    const models = getModels("Mazda", "2026");
    expect(models).toContain("Mazda3");
    expect(models).not.toContain("Mazda3 Turbo");

    const variants = getVehicleVariants("Mazda", "Mazda3", "2026");
    expect(variants.map((variant) => variant.value)).toEqual(
      expect.arrayContaining([
        "Mazda3 (non-turbo) (2004-26)",
        "Mazda3 Turbo (2021-26)"
      ])
    );
  });

  it("uses the same family/package shape for a second make", () => {
    const models = getModels("Acura", "2026");
    expect(models).toContain("Integra");
    expect(models).not.toContain("Integra Type S");

    const variants = getVehicleVariants("Acura", "Integra", "2026");
    expect(variants.map((variant) => variant.value)).toEqual(
      expect.arrayContaining([
        "Integra (Base) (2023-26)",
        "Integra (A-Spec) (2023-26)",
        "Integra Type S (2024-26)"
      ])
    );
  });

  it("restores broad year-first catalog coverage without using it for class placement", () => {
    expect(getYears()).toEqual([
      "2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018",
      "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010", "2009",
      "2008", "2007", "2006", "2005", "2004", "2003", "2002", "2001", "2000",
      "1999", "1998", "1997", "1996", "1995", "1994", "1993", "1992", "1991",
      "1990", "older"
    ]);
    expect(getMakes("2026")).toContain("Ford");
    expect(getMakes("2026")).not.toContain("NOC (Not Otherwise Classified)");

    const mustangModels = getModels("Ford", "2025");
    expect(mustangModels).toContain("Mustang");
    expect(mustangModels).not.toContain("Mustang GT");
    const mustangVariants = getVehicleVariants("Ford", "Mustang", "2025");
    expect(mustangVariants.map((variant) => variant.value)).toEqual(
      expect.arrayContaining([
        "Mustang GT (incl. Performance Package Level 1 and Level 2) (2010-26)",
        "Mustang Dark Horse (2024-26)",
        "Mustang EcoBoost (2015-26)"
      ])
    );
    expect(
      getVehicleMapping({
        make: "Ford",
        model: "Mustang",
        year: "2025",
        variant: "Mustang GT (incl. Performance Package Level 1 and Level 2) (2010-26)"
      })?.classes
    ).toContain("fs");
  });

  it("constrains makes, models, and packages to the selected production year", () => {
    const currentMakes = getMakes("2026");
    expect(new Set(currentMakes.map((make) => make.toLowerCase())).size).toBe(currentMakes.length);
    expect(getMakes("1990")).not.toContain("Tesla");
    expect(getMakes("2009")).toContain("Pontiac");
    expect(getMakes("2026")).not.toContain("Pontiac");
    expect(getMakes("older")).not.toContain("NOC (Not Otherwise Classified)");

    expect(getModels("Mazda", "1990")).toContain("MX-5 Miata");
    expect(getModels("Mazda", "1990")).not.toContain("Mazda3");
    expect(getModels("Mazda", "2026")).toContain("Mazda3");
    expect(getModels("Mazda", "2026")).not.toContain("626");
    expect(getModels("BMW", "1990")).toContain("5 Series");
    expect(getModels("BMW", "1990")).not.toContain("5 Series; 6-cyl, non-M5)");
    expect(getModels("Aston Martin", "2026")).toContain("DB12");
    expect(getModels("Aston Martin", "2026")).not.toContain("DB12 V8");

    const fordModels = getModels("Ford", "2026");
    expect(fordModels).toContain("Mustang");
    expect(fordModels).not.toContain("Mustang GT");
    expect(fordModels).not.toContain("Mustang Dark Horse");
    expect(getVehicleVariants("Ford", "Mustang", "2026").map((variant) => variant.value)).toEqual(
      expect.arrayContaining([
        "Mustang EcoBoost (2015-26)",
        "Mustang Dark Horse (2024-26)",
        "Mustang GT (incl. Performance Package Level 1 and Level 2) (2010-26)"
      ])
    );
    expect(getVehicleVariants("Ford", "Mustang", "2026").map((variant) => variant.value))
      .not.toContain("Mustang SVO");
  });

  it("removes vehicles that fail or cannot prove the Section 3.1 stability screen", () => {
    expect(getModels("Ford", "2026")).not.toContain("Bronco");
    expect(getModels("Ford", "2026")).not.toContain("F-150");
    expect(getModels("Nissan", "2015")).not.toContain("Juke");
    expect(getModels("Subaru", "2015")).not.toContain("Forester");
    expect(getModels("Scion", "2005")).not.toContain("xB");
    expect(getModels("Nissan", "older").some((model) => /^Juke\b/i.test(model))).toBe(false);
    expect(getModels("Subaru", "older").some((model) => /^Forester\b/i.test(model))).toBe(false);
  });

  it("retains dimensionally eligible crossovers and published SSF exceptions", () => {
    expect(getModels("Ford", "2026")).toContain("Mustang Mach-E");
    expect(getModels("Tesla", "2024")).toContain("Model Y");
    expect(getModels("Tesla", "2025")).toContain("Model Y");
    expect(getModels("Volkswagen", "2023")).toContain("ID.4");
    expect(getModels("Ford", "2026")).toContain("Mustang");
  });

  it("keeps only the explicitly eligible performance variant of stability exclusions", () => {
    const fiestaVariants = getVehicleVariants("Ford", "Fiesta", "2015").map(
      (variant) => variant.value
    );
    expect(fiestaVariants).toEqual(expect.arrayContaining(["Fiesta ST FWD"]));
    expect(fiestaVariants.every((variant) => /\bST\b/i.test(variant))).toBe(true);

    const fiatVariants = getVehicleVariants("Fiat", "500", "2015").map(
      (variant) => variant.value
    );
    expect(fiatVariants.length).toBeGreaterThan(0);
    expect(fiatVariants.every((variant) => /\bAbarth\b/i.test(variant))).toBe(true);
  });

  it("includes Formula SAE as a separate supplemental vehicle path", () => {
    expect(getMakes("2026")).toContain("Formula SAE");
    expect(getModels("Formula SAE", "2026")).toEqual(["Formula SAE"]);

    const result = classifyVehicle(
      { make: "Formula SAE", model: "Formula SAE", year: "2026" },
      DEFAULT_BUILD
    );
    expect(result.selectedClass).toBeNull();
    expect(result.supplementalClasses).toContain("fsae");
    expect(result.confidence).toBe("manual-review");
  });

  it("routes an explicitly unlisted vehicle to manual review", () => {
    const result = classifyVehicle(
      {
        make: "Mazda",
        model: "",
        year: "",
        notListed: true,
        manualDescription: "2026 example vehicle"
      },
      DEFAULT_BUILD
    );
    expect(result.mapping).toBeNull();
    expect(result.confidence).toBe("manual-review");
    expect(result.messages[0]).toContain("outside the reviewed catalog");
  });

  it("still resolves XA/XB from the independent Section 21 path when the exact vehicle has no reviewed Appendix A mapping", () => {
    const result = classifyVehicle(
      { make: "Example", model: "Imaginary GT", year: "2026" },
      {
        ...DEFAULT_BUILD,
        engine: "extreme",
        xtremeVehicleType: "production",
        drivetrainLayout: "rwd",
        xtremePowertrain: "ice",
        competitionWeight: "2930to3179"
      }
    );
    expect(result.mapping).toBeNull();
    expect(result.selectedClass).toBe("xa");
    expect(result.confidence).toBe("limited");
    expect(result.supplementalClasses).toEqual(expect.arrayContaining(["xa", "xb"]));
    expect(result.xtremeStreet.status).toBe("eligible");
  });

  it("keeps a fully unresolved vehicle at manual review when Xtreme Street facts are also missing", () => {
    const result = classifyVehicle(
      { make: "Example", model: "Imaginary GT", year: "2026" },
      DEFAULT_BUILD
    );
    expect(result.mapping).toBeNull();
    expect(result.selectedClass).toBeNull();
    expect(result.confidence).toBe("manual-review");
    expect(result.supplementalClasses).toEqual([]);
  });

  it("stops at manual review when stale higher-category mappings are not officially verified", () => {
    const camaro = classifyVehicle(
      { make: "Chevrolet", model: "Camaro (V6)", year: "2010" },
      { ...DEFAULT_BUILD, tires: "dotBelow200" }
    );
    expect(camaro.selectedClass).toBeNull();
    expect(camaro.evaluations.find((item) => item.category === "streetPrepared")?.status).toBe(
      "not-listed"
    );

    const nismo = classifyVehicle(
      { make: "Nissan", model: "350Z NISMO", year: "2004" },
      { ...DEFAULT_BUILD, tires: "slick" }
    );
    expect(nismo.selectedClass).toBeNull();
    expect(nismo.confidence).toBe("manual-review");
  });

  it("uses partial audited mappings without inventing missing categories", () => {
    const boxster = classifyVehicle(
      { make: "Porsche", model: "Boxster (987.1 base)", year: "2005" },
      {
        ...DEFAULT_BUILD,
        wheels: "streetTouringLegal",
        springs: "coilovers",
        swayBars: "bothChanged",
        alignment: "streetTouringHardware",
        intake: "toThrottleBody",
        exhaust: "headersHighFlowCat",
        ecu: "reflash"
      }
    );
    expect(boxster.selectedCategory).toBe("streetTouring");
    expect(boxster.selectedClass).toBe("bst");
    expect(boxster.confidence).toBe("limited");
  });

  it("keeps verified supplemental classes separate from the primary recommendation", () => {
    const result = classifyVehicle(
      { make: "Hyundai", model: "Ioniq 5", year: "2025", variant: "N" },
      DEFAULT_BUILD
    );
    expect(result.selectedClass).toBe("ss");
    expect(result.supplementalClasses).toContain("evx");
  });

  it("does not auto-promote a 2026 Ioniq 5 N into unverified modified categories", () => {
    const result = classifyVehicle(
      { make: "Hyundai", model: "Ioniq 5 N", year: "2026" },
      { ...DEFAULT_BUILD, springs: "coilovers" }
    );
    expect(result.selectedClass).toBeNull();
    expect(result.confidence).toBe("manual-review");
  });

  it("refuses to guess an unknown vehicle or unknown configuration details", () => {
    const unknownVehicle = classifyVehicle(
      { make: "Example", model: "Imaginary GT", year: "2026" },
      DEFAULT_BUILD
    );
    expect(unknownVehicle.mapping).toBeNull();
    expect(unknownVehicle.selectedClass).toBeNull();

    const unknownBuild = classifyReviewedMiata({
      ...DEFAULT_BUILD,
      tires: "unknown"
    });
    expect(unknownBuild.selectedClass).toBeNull();
    expect(unknownBuild.confidence).toBe("manual-review");
  });

  it("derives the modification category before intersecting it with vehicle placement", () => {
    const result = classifyVehicleWithMapping(
      miata,
      { ...DEFAULT_BUILD, tires: "dotBelow200" },
      {
        ...reviewedMiataMapping,
        classes: ["as", "csp"]
      }
    );

    expect(result.preparation.minimumLegalCategory).toBe("streetPrepared");
    expect(result.preparation.legalCategories).toEqual([
      "streetPrepared",
      "streetModified",
      "prepared",
      "modified"
    ]);
    expect(result.selectedCategory).toBe("streetPrepared");
    expect(result.selectedClass).toBe("csp");
    expect(result.evaluations.find((item) => item.category === "street")?.status).toBe("blocked");
    expect(result.evaluations.find((item) => item.category === "streetPrepared")?.preparationLegal).toBe(true);
  });

  it("does not promote a stock build into a higher mapped class when Street is unlisted", () => {
    const result = classifyVehicleWithMapping(
      miata,
      DEFAULT_BUILD,
      {
        ...reviewedMiataMapping,
        classes: ["csp"]
      }
    );

    expect(result.preparation.minimumLegalCategory).toBe("street");
    expect(result.evaluations.find((item) => item.category === "street")?.status).toBe("not-listed");
    expect(result.selectedCategory).toBe("streetPrepared");
    expect(result.messages.join(" ")).toContain("build is legal in street");
  });

  it("uses the exact EST differential restriction before moving to Street Prepared", () => {
    const result = classifyVehicleWithMapping(
      miata,
      { ...DEFAULT_BUILD, differential: "streetTouringLsd" },
      {
        ...reviewedMiataMapping,
        classes: ["est", "csp"]
      }
    );

    expect(result.evaluations.find((item) => item.category === "streetTouring")?.status)
      .toBe("blocked");
    expect(result.selectedCategory).toBe("streetPrepared");
    expect(result.selectedClass).toBe("csp");
  });

  it("selects XB when a highly modified production car passes the separate XB checks", () => {
    const result = classifyVehicleWithMapping(
      miata,
      {
        ...DEFAULT_BUILD,
        engine: "extreme",
        xtremeVehicleType: "production",
        drivetrainLayout: "rwd",
        xtremePowertrain: "ice",
        competitionWeight: "2330to2479"
      },
      reviewedMiataMapping
    );

    expect(result.selectedCategory).toBeNull();
    expect(result.selectedClass).toBe("xb");
    expect(result.xtremeStreet.status).toBe("eligible");
    expect(result.xtremeStreet.eligibleClasses).toEqual(["xb"]);
  });

  it("reports both XA and XB objective eligibility while recommending the closer weight floor", () => {
    const result = classifyVehicleWithMapping(
      miata,
      {
        ...DEFAULT_BUILD,
        engine: "extreme",
        xtremeVehicleType: "production",
        drivetrainLayout: "rwd",
        xtremePowertrain: "ice",
        competitionWeight: "2930to3179"
      },
      reviewedMiataMapping
    );

    expect(result.selectedClass).toBe("xa");
    expect(result.xtremeStreet.eligibleClasses).toEqual(["xa", "xb"]);
    expect(result.xtremeStreet.recommendedClass).toBe("xa");
  });

  it("blocks XA/XB for an underweight car, a CAM car, or an EV tractive-system change", () => {
    const base = {
      ...DEFAULT_BUILD,
      engine: "extreme",
      xtremeVehicleType: "production",
      drivetrainLayout: "rwd",
      xtremePowertrain: "ice",
      competitionWeight: "under2180"
    };
    expect(
      classifyVehicleWithMapping(miata, base, reviewedMiataMapping).xtremeStreet.status
    ).toBe("blocked");
    expect(
      classifyVehicleWithMapping(
        miata,
        { ...base, competitionWeight: "2930to3179", xtremeVehicleType: "camEligible" },
        reviewedMiataMapping
      ).xtremeStreet.status
    ).toBe("blocked");
    expect(
      classifyVehicleWithMapping(
        miata,
        {
          ...base,
          competitionWeight: "2930to3179",
          xtremePowertrain: "electrifiedModified"
        },
        reviewedMiataMapping
      ).xtremeStreet.status
    ).toBe("blocked");
  });
});
