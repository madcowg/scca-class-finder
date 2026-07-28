import { describe, expect, it } from "vitest";
import { evaluatePreparedFP } from "./preparedFP";
import { DEFAULT_BUILD } from "./rules";

function build(overrides: Partial<typeof DEFAULT_BUILD>) {
  return { ...DEFAULT_BUILD, ...overrides };
}

const pistonBase = {
  rearWeightBiasOver51: "no",
  solidAxleRwd: "no",
  wheelWidthCategory: "upTo10in",
  alternateEngineAllowance: "no",
  rotaryEngineFamily: "unknown",
  peripheralPortRotary: "unknown"
} as const;

describe("evaluatePreparedFP", () => {
  it("returns not-listed for a vehicle with no FP entry", () => {
    const result = evaluatePreparedFP(
      { make: "Toyota", model: "Prius", year: "2020" },
      DEFAULT_BUILD
    );
    expect(result.status).toBe("not-listed");
    expect(result.matchedListing).toBeNull();
  });

  it("matches the rulebook's own worked example: AWD WRX STI, 2457cc, 11in wheels = 2750 lbs", () => {
    const result = evaluatePreparedFP(
      { make: "Subaru", model: "WRX", year: "2015" },
      build({
        ...pistonBase,
        inductionType: "forcedInduction",
        engineDisplacementLiters: "2.457",
        measuredWeightNoDriver: "2750",
        drivetrainLayout: "awd",
        wheelWidthCategory: "over10to11in"
      })
    );
    expect(result.status).toBe("eligible");
    expect(result.minimumWeight).toBe(2750);
  });

  it("uses the naturally-aspirated piston rate (0.75x cc) with RWD (no drivetrain factor)", () => {
    const result = evaluatePreparedFP(
      { make: "Honda", model: "S2000", year: "2003" },
      build({
        ...pistonBase,
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "1900",
        drivetrainLayout: "rwd"
      })
    );
    // 0.75*2000=1500, floored to 1900
    expect(result.status).toBe("eligible");
    expect(result.minimumWeight).toBe(1900);
  });

  it("applies the FWD factor as a weight reduction", () => {
    const result = evaluatePreparedFP(
      { make: "Volkswagen", model: "R32", year: "2004" },
      build({
        ...pistonBase,
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "3.2",
        measuredWeightNoDriver: "2100",
        drivetrainLayout: "fwd"
      })
    );
    // (0.75 - 0.10) * 3200 = 2080, above floor
    expect(result.minimumWeight).toBe(2080);
  });

  it("computes a rotary engine using its fixed specified displacement, not actual displacement", () => {
    const result = evaluatePreparedFP(
      { make: "Mazda", model: "RX-7", year: "1990", variant: "RX-7 (1986-91)" },
      build({
        ...pistonBase,
        inductionType: "rotary",
        rotaryEngineFamily: "13b",
        peripheralPortRotary: "no",
        measuredWeightNoDriver: "1900",
        drivetrainLayout: "rwd"
      })
    );
    // 0.70 * 2616 = 1831.2, floored to 1900
    expect(result.status).toBe("eligible");
    expect(result.minimumWeight).toBe(1900);
  });

  it("adds the peripheral-port rate only when the matched listing allows it", () => {
    const allowed = evaluatePreparedFP(
      { make: "Mazda", model: "RX-7", year: "1990", variant: "RX-7 (1986-91)" },
      build({
        ...pistonBase,
        inductionType: "rotary",
        rotaryEngineFamily: "13b",
        peripheralPortRotary: "yes",
        measuredWeightNoDriver: "2028",
        drivetrainLayout: "rwd"
      })
    );
    // (0.70 + 0.05) * 2616 = 1962, floored? 1962 > 1900 so stands
    expect(allowed.status).toBe("eligible");
    expect(allowed.minimumWeight).toBe(1962);

    const notAllowed = evaluatePreparedFP(
      { make: "Mazda", model: "RX-2", year: "1972" },
      build({
        ...pistonBase,
        inductionType: "rotary",
        rotaryEngineFamily: "12a",
        peripheralPortRotary: "yes",
        measuredWeightNoDriver: "2000",
        drivetrainLayout: "rwd"
      })
    );
    // RX-2 listing states peripheral port is NOT allowed
    expect(notAllowed.status).toBe("manual-review");
  });

  it("caps the formula result at 2700 lbs before the flat wheel-width adjustment", () => {
    const result = evaluatePreparedFP(
      { make: "Ferrari", model: "308", year: "1980", variant: "308 (all)" },
      build({
        ...pistonBase,
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "5.0",
        measuredWeightNoDriver: "3800",
        drivetrainLayout: "rwd",
        wheelWidthCategory: "over11to12in"
      })
    );
    // 0.75*5000=3750, capped to 2700, +100 wheel = 2800
    expect(result.minimumWeight).toBe(2800);
  });

  it("blocks an FP-listed car that cannot meet its computed minimum weight", () => {
    const result = evaluatePreparedFP(
      { make: "Honda", model: "S2000", year: "2003" },
      build({
        ...pistonBase,
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "1000",
        drivetrainLayout: "rwd"
      })
    );
    expect(result.status).toBe("blocked");
  });

  it("requires all FP facts before returning a class", () => {
    const result = evaluatePreparedFP({ make: "Honda", model: "S2000", year: "2003" }, DEFAULT_BUILD);
    expect(result.status).toBe("manual-review");
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});
