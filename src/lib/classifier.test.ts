import { describe, expect, it } from "vitest";
import { classifyVehicle, classifyVehicleWithMapping } from "./classifier";
import { DEFAULT_BUILD } from "./rules";
import type { VehicleMapping } from "./types";
import { getMakes, getModels, getVehicleMapping, getVehicleVariants, getYears } from "./vehicleData";

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
  it("does not use the catalog as an unreviewed class placement", () => {
    const result = classifyVehicle(miata, DEFAULT_BUILD);
    expect(result.selectedCategory).toBeNull();
    expect(result.selectedClass).toBeNull();
    expect(result.confidence).toBe("manual-review");
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

  it("moves an engine-swap build to Street Modified when listed", () => {
    const result = classifyReviewedMiata({
      ...DEFAULT_BUILD,
      engine: "swapOrAddedInduction"
    });
    expect(result.selectedCategory).toBe("streetModified");
    expect(result.selectedClass).toBe("ssm");
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
    expect(variants.map((variant) => variant.value)).toEqual(["Non-turbo", "Turbo"]);
  });

  it("uses the same family/package shape for a second make", () => {
    const models = getModels("Acura", "2026");
    expect(models).toContain("Integra");
    expect(models).not.toContain("Integra Type S");

    const variants = getVehicleVariants("Acura", "Integra", "2026");
    expect(variants.map((variant) => variant.value)).toEqual(["Base", "A-Spec", "Type S"]);
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
    expect(getMakes("2026")).toContain("NOC (Not Otherwise Classified)");

    const mustangModels = getModels("Ford", "2025");
    expect(mustangModels).toContain("Mustang");
    expect(mustangModels).not.toContain("Mustang GT");
    const mustangVariants = getVehicleVariants("Ford", "Mustang", "2025");
    expect(mustangVariants.map((variant) => variant.value)).toEqual(
      expect.arrayContaining(["Mustang GT", "Mustang Dark Horse", "Mustang EcoBoost"])
    );
    expect(getVehicleMapping({ make: "Ford", model: "Mustang", year: "2025", variant: "Mustang GT" })).toBeNull();
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
});
