import { describe, expect, it } from "vitest";
import { evaluatePreparedDP } from "./preparedDP";
import { DEFAULT_BUILD } from "./rules";

function build(overrides: Partial<typeof DEFAULT_BUILD>) {
  return { ...DEFAULT_BUILD, ...overrides };
}

const baseFields = {
  rearWeightBiasOver51: "no",
  variableCamTiming: "no",
  solidAxleRwd: "no",
  wheelWidthCategory: "upTo10in",
  alternateEngineAllowance: "no"
} as const;

describe("evaluatePreparedDP", () => {
  it("returns not-listed for a vehicle with no DP entry", () => {
    const result = evaluatePreparedDP(
      { make: "Toyota", model: "Prius", year: "2020" },
      DEFAULT_BUILD
    );
    expect(result.status).toBe("not-listed");
    expect(result.matchedListing).toBeNull();
  });

  it("computes the 3/4-valve formula (0.75 x cc + 500) for a DP-listed car", () => {
    const result = evaluatePreparedDP(
      { make: "Mazda", model: "MX-5 Miata", year: "1995" },
      build({
        ...baseFields,
        valveCountPerCylinder: "threeOrFour",
        engineDisplacementLiters: "1.8",
        measuredWeightNoDriver: "1850"
      })
    );
    // 0.75 * 1800 + 500 = 1850
    expect(result.status).toBe("eligible");
    expect(result.minimumWeight).toBe(1850);
  });

  it("computes the 2-valve formula (1.00 x cc) for a DP-listed car", () => {
    const result = evaluatePreparedDP(
      { make: "BMW", model: "1600", year: "1970" },
      build({
        ...baseFields,
        valveCountPerCylinder: "two",
        engineDisplacementLiters: "1.6",
        measuredWeightNoDriver: "1600"
      })
    );
    expect(result.status).toBe("eligible");
    expect(result.minimumWeight).toBe(1600);
  });

  it("applies the rear-weight-bias, variable-cam, solid-axle, and wheel-width adjustments", () => {
    const result = evaluatePreparedDP(
      { make: "BMW", model: "1600", year: "1970" },
      build({
        valveCountPerCylinder: "two",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "2100",
        rearWeightBiasOver51: "yes",
        variableCamTiming: "yes",
        solidAxleRwd: "yes",
        wheelWidthCategory: "over10to11in",
        alternateEngineAllowance: "no"
      })
    );
    // base: 1.00*2000 = 2000; +0.015*2000=30 (rear bias); +50 (cam); -50 (solid axle); +50 (wheel) = 2080
    expect(result.minimumWeight).toBe(2080);
    expect(result.status).toBe("eligible");
  });

  it("caps the minimum weight at 2100 lbs unless the alternate engine allowance is used", () => {
    const capped = evaluatePreparedDP(
      { make: "BMW", model: "1600", year: "1970" },
      build({ ...baseFields, valveCountPerCylinder: "two", engineDisplacementLiters: "3.0", measuredWeightNoDriver: "2100" })
    );
    // 1.00*3000 = 3000, capped to 2100
    expect(capped.minimumWeight).toBe(2100);

    const uncapped = evaluatePreparedDP(
      { make: "BMW", model: "1600", year: "1970" },
      build({
        ...baseFields,
        valveCountPerCylinder: "two",
        engineDisplacementLiters: "3.0",
        measuredWeightNoDriver: "3150",
        alternateEngineAllowance: "yes"
      })
    );
    // 1.00*3000 = 3000, + 0.05*3000 = 150 alternate-engine adjustment, cap waived = 3150
    expect(uncapped.minimumWeight).toBe(3150);
  });

  it("blocks a DP-listed car that cannot meet its computed minimum weight", () => {
    const result = evaluatePreparedDP(
      { make: "BMW", model: "1600", year: "1970" },
      build({ ...baseFields, valveCountPerCylinder: "two", engineDisplacementLiters: "1.6", measuredWeightNoDriver: "1000" })
    );
    expect(result.status).toBe("blocked");
  });

  it("requires all DP facts before returning a class", () => {
    const result = evaluatePreparedDP(
      { make: "BMW", model: "1600", year: "1970" },
      DEFAULT_BUILD
    );
    expect(result.status).toBe("manual-review");
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});
