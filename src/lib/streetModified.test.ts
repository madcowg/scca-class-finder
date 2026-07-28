import { describe, expect, it } from "vitest";
import { evaluateStreetModified } from "./streetModified";
import { DEFAULT_BUILD } from "./rules";
import type { VehicleMapping } from "./types";

function build(overrides: Partial<typeof DEFAULT_BUILD>) {
  return { ...DEFAULT_BUILD, ...overrides };
}

function mappingFor(make: string, model: string): VehicleMapping {
  return {
    selection: { make, model, year: "2026" },
    classes: [],
    source: "2026-current-override",
    coverage: "full-mapping",
    sourceNote: "Test fixture."
  };
}

describe("evaluateStreetModified", () => {
  it("requires all Section 16 facts before returning a class", () => {
    const result = evaluateStreetModified(DEFAULT_BUILD, null);
    expect(result.status).toBe("manual-review");
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it("computes SM minimum weight for a naturally aspirated RWD sedan (base 1800 + 200/L)", () => {
    const result = evaluateStreetModified(
      build({
        drivetrainLayout: "rwd",
        bodyConfiguration: "sedanCoupeFourSeat",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.5",
        measuredWeightNoDriver: "2400",
        tireWidthCategory: "over275",
        solidAxleRwd: "no"
      }),
      null
    );
    // 1800 + 200 * 2.5 = 2300
    expect(result.minimumWeights.sm).toBe(2300);
    expect(result.status).toBe("eligible");
    expect(result.recommendedClass).toBe("sm");
  });

  it("adds 1.4L for a forced-induction SM/SSM engine before applying the per-liter rate", () => {
    const result = evaluateStreetModified(
      build({
        drivetrainLayout: "fwd",
        bodyConfiguration: "sedanCoupeFourSeat",
        inductionType: "forcedInduction",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "2000",
        tireWidthCategory: "over275",
        solidAxleRwd: "unknown"
      }),
      null
    );
    // classified displacement = 2.0 + 1.4 = 3.4; 1550 + 125 * 3.4 = 1975
    expect(result.minimumWeights.sm).toBe(1975);
    expect(result.status).toBe("eligible");
  });

  it("applies the 275mm-or-less tire discount and the solid-axle RWD discount together for SM", () => {
    const result = evaluateStreetModified(
      build({
        drivetrainLayout: "rwd",
        bodyConfiguration: "sedanCoupeFourSeat",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "1950",
        tireWidthCategory: "275orLess",
        solidAxleRwd: "yes"
      }),
      null
    );
    // 1800 + 200*2.0 = 2200; solid axle: -25*2.0 = -50; narrow tire: -200 => 1950
    expect(result.minimumWeights.sm).toBe(1950);
    expect(result.status).toBe("eligible");
  });

  it("caps SM at 3100 lbs regardless of displacement", () => {
    const result = evaluateStreetModified(
      build({
        drivetrainLayout: "awd",
        bodyConfiguration: "sedanCoupeFourSeat",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "8.0",
        measuredWeightNoDriver: "3100",
        tireWidthCategory: "over275",
        solidAxleRwd: "no"
      }),
      null
    );
    // 1800 + 300*8.0 = 4200, capped to 3100
    expect(result.minimumWeights.sm).toBe(3100);
    expect(result.status).toBe("eligible");
  });

  it("caps SSM at 2900 lbs when the uncapped formula would exceed it", () => {
    const result = evaluateStreetModified(
      build({
        drivetrainLayout: "rwd",
        bodyConfiguration: "twoSeat",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "8.0",
        measuredWeightNoDriver: "2900",
        tireWidthCategory: "over275",
        solidAxleRwd: "no"
      }),
      null
    );
    // 1600 + 200*8.0 = 3200, capped to 2900
    expect(result.minimumWeights.ssm).toBe(2900);
    expect(result.status).toBe("eligible");
  });

  it("computes SMF minimum weight with its own 1.0L forced-induction add-on and no tire discount", () => {
    const result = evaluateStreetModified(
      build({
        drivetrainLayout: "fwd",
        bodyConfiguration: "sedanCoupeFourSeat",
        inductionType: "forcedInduction",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "2200",
        tireWidthCategory: "275orLess",
        solidAxleRwd: "unknown"
      }),
      null
    );
    // classified = 2.0+1.0=3.0; 1750 + 125*3.0 = 2125 (no tire discount applies to SMF)
    expect(result.minimumWeights.smf).toBe(2125);
  });

  it("recommends the class with the lowest minimum weight when a FWD car qualifies for both SM and SMF", () => {
    const result = evaluateStreetModified(
      build({
        drivetrainLayout: "fwd",
        bodyConfiguration: "sedanCoupeFourSeat",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "2000",
        tireWidthCategory: "over275",
        solidAxleRwd: "unknown"
      }),
      null
    );
    // SM: 1550+125*2=1800; SMF: 1750+125*2=2000. SM is the lower/easier minimum.
    expect(result.minimumWeights.sm).toBe(1800);
    expect(result.minimumWeights.smf).toBe(2000);
    expect(result.eligibleClasses).toEqual(expect.arrayContaining(["sm", "smf"]));
    expect(result.recommendedClass).toBe("sm");
  });

  it("falls back a sedan/coupe to SSM when it cannot meet SM's minimum weight", () => {
    const result = evaluateStreetModified(
      build({
        drivetrainLayout: "rwd",
        bodyConfiguration: "sedanCoupeFourSeat",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "2000",
        tireWidthCategory: "over275",
        solidAxleRwd: "no"
      }),
      null
    );
    // SM needs 1800+200*2=2200 (fails at 2000); SSM needs 1600+200*2=2000 (passes)
    expect(result.minimumWeights.sm).toBe(2200);
    expect(result.minimumWeights.ssm).toBe(2000);
    expect(result.status).toBe("eligible");
    expect(result.eligibleClasses).toEqual(["ssm"]);
    expect(result.recommendedClass).toBe("ssm");
  });

  it("blocks a sedan/coupe that cannot meet either SM or SSM minimum weight", () => {
    const result = evaluateStreetModified(
      build({
        drivetrainLayout: "rwd",
        bodyConfiguration: "sedanCoupeFourSeat",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "1000",
        tireWidthCategory: "over275",
        solidAxleRwd: "no"
      }),
      null
    );
    expect(result.status).toBe("blocked");
    expect(result.eligibleClasses).toEqual([]);
  });

  it("treats Porsche (all) as SSM-eligible via the named manufacturer inclusion", () => {
    const result = evaluateStreetModified(
      build({
        drivetrainLayout: "rwd",
        bodyConfiguration: "sedanCoupeFourSeat",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "3.0",
        measuredWeightNoDriver: "2200",
        tireWidthCategory: "over275",
        solidAxleRwd: "no"
      }),
      mappingFor("Porsche", "911 Turbo")
    );
    // SM excludes Porsche other than 924/928/944/968, but SSM includes Porsche (all).
    // SSM: 1600 + 200*3.0 = 2200
    expect(result.eligibleClasses).toContain("ssm");
    expect(result.eligibleClasses).not.toContain("sm");
  });

  it("excludes Triumph and MGB GT from SM entirely", () => {
    const triumph = evaluateStreetModified(
      build({
        drivetrainLayout: "rwd",
        bodyConfiguration: "sedanCoupeFourSeat",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "2500",
        tireWidthCategory: "over275",
        solidAxleRwd: "no"
      }),
      mappingFor("Triumph", "TR6")
    );
    expect(triumph.eligibleClasses).not.toContain("sm");
  });

  it("excludes Lotus models other than Elise/Exige/Evora/Esprit from the SSM 2-seat path", () => {
    const result = evaluateStreetModified(
      build({
        drivetrainLayout: "rwd",
        bodyConfiguration: "twoSeat",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "1.6",
        measuredWeightNoDriver: "2000",
        tireWidthCategory: "over275",
        solidAxleRwd: "no"
      }),
      mappingFor("Lotus", "Europa")
    );
    expect(result.eligibleClasses).not.toContain("ssm");

    const elise = evaluateStreetModified(
      build({
        drivetrainLayout: "rwd",
        bodyConfiguration: "twoSeat",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "1.8",
        measuredWeightNoDriver: "2000",
        tireWidthCategory: "over275",
        solidAxleRwd: "no"
      }),
      mappingFor("Lotus", "Elise")
    );
    expect(elise.eligibleClasses).toContain("ssm");
  });

  it("returns manual review for rotary engines since the displacement equivalence is not modeled", () => {
    const result = evaluateStreetModified(
      build({
        drivetrainLayout: "rwd",
        bodyConfiguration: "twoSeat",
        inductionType: "rotary",
        engineDisplacementLiters: "1.3",
        measuredWeightNoDriver: "2200",
        tireWidthCategory: "over275",
        solidAxleRwd: "no"
      }),
      null
    );
    expect(result.status).toBe("manual-review");
  });
});
