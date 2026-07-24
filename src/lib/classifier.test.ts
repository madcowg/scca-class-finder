import { describe, expect, it } from "vitest";
import { classifyVehicle, classifyVehicleWithMapping } from "./classifier";
import { DEFAULT_BUILD } from "./rules";
import type { VehicleMapping } from "./types";
import { getMakes, getModels, getVehicleVariants } from "./vehicleData";

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
      { make: "Acura", model: "Integra Type S", year: "2026" },
      DEFAULT_BUILD
    );
    expect(integraTypeS.selectedClass).toBe("as");
    expect(integraTypeS.confidence).toBe("limited");

    const m240i = classifyVehicle(
      { make: "BMW", model: "M240i (incl. xDrive)", year: "2026" },
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
    expect(result.mapping?.selection.variant).toBe("Integra Type S");
    expect(result.selectedClass).toBe("as");
  });

  it("groups Miata source descriptions under one model family with year-specific variants", () => {
    const models = getModels("Mazda");
    expect(models).toContain("MX-5 Miata");
    expect(models).not.toContain("MX-5 Miata First Generation (NA) non-Torsen differential");
    expect(models).not.toContain("Mazdaspeed Miata");
    expect(models).not.toContain("Mazda Mazda3 Turbo");
    expect(models).not.toContain("Mazda3 Turbo");
    expect(models).not.toContain("Mazda3 (non-turbo)");

    const variants = getVehicleVariants("Mazda", "MX-5 Miata", "2005");
    expect(variants.map((variant) => variant.value)).toEqual(
      expect.arrayContaining(["MX-5 Miata", "Mazdaspeed Miata"])
    );
  });

  it("groups every vehicle family before exposing year-specific submodels", () => {
    expect(getMakes("2025")).toContain("Ford");

    const models = getModels("Ford", "2025");
    expect(models).toContain("Mustang");
    expect(models).not.toContain("Mustang GT");
    expect(models).not.toContain("Mustang Dark Horse");

    const variants = getVehicleVariants("Ford", "Mustang", "2025");
    expect(variants.map((variant) => variant.value)).toEqual(
      expect.arrayContaining(["Mustang GT", "Mustang Dark Horse"])
    );
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
    expect(result.messages[0]).toContain("outside the current listed catalog");
  });

  it("stops at manual review when stale higher-category mappings are not officially verified", () => {
    const camaro = classifyVehicle(
      { make: "Chevrolet", model: "Camaro (V6)", year: "2010" },
      { ...DEFAULT_BUILD, tires: "dotBelow200" }
    );
    expect(camaro.selectedClass).toBeNull();
    expect(camaro.evaluations.find((item) => item.category === "streetPrepared")?.status).toBe(
      "manual-review"
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
      { make: "Hyundai", model: "IONIQ 5", year: "2025", variant: "IONIQ 5 N" },
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
});
