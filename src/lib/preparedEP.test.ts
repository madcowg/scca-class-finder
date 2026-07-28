import { describe, expect, it } from "vitest";
import { evaluatePreparedEP } from "./preparedEP";
import { DEFAULT_BUILD } from "./rules";

function build(overrides: Partial<typeof DEFAULT_BUILD>) {
  return { ...DEFAULT_BUILD, ...overrides };
}

const vehicle = { make: "Saab", model: "900", year: "1985" };

const baseFields = {
  wheelWidthCategory: "upTo10in",
  alternateEngineAllowance: "no"
} as const;

describe("evaluatePreparedEP", () => {
  it("returns not-listed for a vehicle with no EP entry", () => {
    const result = evaluatePreparedEP(
      { make: "Toyota", model: "Prius", year: "2020" },
      DEFAULT_BUILD
    );
    expect(result.status).toBe("not-listed");
    expect(result.matchedListing).toBeNull();
  });

  it("matches an EP-listed vehicle by exact model identity", () => {
    const result = evaluatePreparedEP(
      vehicle,
      build({
        ...baseFields,
        inductionType: "naturallyAspirated",
        valveCountPerCylinder: "two",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "2000"
      })
    );
    expect(result.status).toBe("eligible");
    expect(result.matchedListing).toContain("900");
  });

  it("uses the 1.06x cc rate for 3+ valve engines at or under 1667cc", () => {
    const result = evaluatePreparedEP(
      vehicle,
      build({
        ...baseFields,
        inductionType: "naturallyAspirated",
        valveCountPerCylinder: "threeOrFour",
        engineDisplacementLiters: "1.6",
        measuredWeightNoDriver: "1700"
      })
    );
    // 1.06 * 1600 = 1696
    expect(result.status).toBe("eligible");
    expect(result.minimumWeight).toBe(1696);
  });

  it("switches to the 0.91x cc + 250 rate for 3+ valve engines over 1667cc", () => {
    const result = evaluatePreparedEP(
      vehicle,
      build({
        ...baseFields,
        inductionType: "naturallyAspirated",
        valveCountPerCylinder: "threeOrFour",
        engineDisplacementLiters: "1.8",
        measuredWeightNoDriver: "1888"
      })
    );
    // 0.91 * 1800 + 250 = 1888
    expect(result.minimumWeight).toBe(1888);
  });

  it("uses the 1.00x cc rate for 2-valve engines", () => {
    const result = evaluatePreparedEP(
      vehicle,
      build({
        ...baseFields,
        inductionType: "naturallyAspirated",
        valveCountPerCylinder: "two",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "2000"
      })
    );
    expect(result.minimumWeight).toBe(2000);
  });

  it("uses the 1.40x cc forced-induction rate regardless of valve count", () => {
    const result = evaluatePreparedEP(
      vehicle,
      build({
        ...baseFields,
        inductionType: "forcedInduction",
        engineDisplacementLiters: "1.8",
        measuredWeightNoDriver: "2520"
      })
    );
    // 1.40 * 1800 = 2520
    expect(result.minimumWeight).toBe(2520);
  });

  it("clamps the base formula to the 1350-2600 lb floor/cap before adjustments", () => {
    const floored = evaluatePreparedEP(
      vehicle,
      build({
        ...baseFields,
        inductionType: "naturallyAspirated",
        valveCountPerCylinder: "two",
        engineDisplacementLiters: "1.0",
        measuredWeightNoDriver: "1350"
      })
    );
    // 1.00*1000=1000, floored to 1350
    expect(floored.minimumWeight).toBe(1350);

    const capped = evaluatePreparedEP(
      vehicle,
      build({
        ...baseFields,
        inductionType: "naturallyAspirated",
        valveCountPerCylinder: "two",
        engineDisplacementLiters: "4.0",
        measuredWeightNoDriver: "2600"
      })
    );
    // 1.00*4000=4000, capped to 2600
    expect(capped.minimumWeight).toBe(2600);
  });

  it("adds the wheel-width and alternate-engine adjustments after the floor/cap", () => {
    const result = evaluatePreparedEP(
      vehicle,
      build({
        inductionType: "naturallyAspirated",
        valveCountPerCylinder: "two",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "2250",
        wheelWidthCategory: "over10to11in",
        alternateEngineAllowance: "yes"
      })
    );
    // base 2000, +50 wheel, +0.05*2000=100 alternate engine = 2150
    expect(result.minimumWeight).toBe(2150);
  });

  it("blocks an EP-listed car that cannot meet its computed minimum weight", () => {
    const result = evaluatePreparedEP(
      vehicle,
      build({
        ...baseFields,
        inductionType: "naturallyAspirated",
        valveCountPerCylinder: "two",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "1000"
      })
    );
    expect(result.status).toBe("blocked");
  });

  it("requires all EP facts before returning a class", () => {
    const result = evaluatePreparedEP(vehicle, DEFAULT_BUILD);
    expect(result.status).toBe("manual-review");
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});
