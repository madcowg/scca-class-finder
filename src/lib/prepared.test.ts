import { describe, expect, it } from "vitest";
import { evaluatePreparedXp } from "./prepared";
import { DEFAULT_BUILD } from "./rules";

function build(overrides: Partial<typeof DEFAULT_BUILD>) {
  return { ...DEFAULT_BUILD, ...overrides };
}

describe("evaluatePreparedXp", () => {
  it("requires all Section 17 facts before returning a result", () => {
    const result = evaluatePreparedXp(DEFAULT_BUILD);
    expect(result.status).toBe("manual-review");
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it("matches the rulebook's own worked example: RWD, 1.796L turbo, 51%+ rear bias = 1982 lbs", () => {
    const result = evaluatePreparedXp(
      build({
        drivetrainLayout: "rwd",
        inductionType: "forcedInduction",
        engineDisplacementLiters: "1.796",
        measuredWeightNoDriver: "1982",
        activeReactiveSuspension: "no",
        rearWeightBiasOver51: "yes"
      })
    );
    expect(result.minimumWeight).toBe(1982);
    expect(result.status).toBe("eligible");
  });

  it("uses the naturally-aspirated under-4.0L table", () => {
    const result = evaluatePreparedXp(
      build({
        drivetrainLayout: "fwd",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "1550",
        activeReactiveSuspension: "no",
        rearWeightBiasOver51: "no"
      })
    );
    // 1250 + 150*2.0 = 1550
    expect(result.minimumWeight).toBe(1550);
    expect(result.status).toBe("eligible");
  });

  it("switches to the naturally-aspirated 4.0L-or-greater table at the exact threshold", () => {
    const result = evaluatePreparedXp(
      build({
        drivetrainLayout: "rwd",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "4.0",
        measuredWeightNoDriver: "1950",
        activeReactiveSuspension: "no",
        rearWeightBiasOver51: "no"
      })
    );
    // 1650 + 100*4.0 = 2050 (>=4.0L table applies)
    expect(result.minimumWeight).toBe(2050);
  });

  it("adds the active/reactive suspension flat 100 lb adjustment after the displacement formula", () => {
    const result = evaluatePreparedXp(
      build({
        drivetrainLayout: "fwd",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "1650",
        activeReactiveSuspension: "yes",
        rearWeightBiasOver51: "no"
      })
    );
    // 1250 + 150*2.0 = 1550, +100 active suspension = 1650
    expect(result.minimumWeight).toBe(1650);
    expect(result.status).toBe("eligible");
  });

  it("caps the formula result at 2300 lbs before flat adjustments", () => {
    const result = evaluatePreparedXp(
      build({
        drivetrainLayout: "awd",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "8.0",
        measuredWeightNoDriver: "2400",
        activeReactiveSuspension: "yes",
        rearWeightBiasOver51: "no"
      })
    );
    // 1650 + 150*8.0 = 2850, capped to 2300, then +100 active suspension = 2400
    expect(result.minimumWeight).toBe(2400);
    expect(result.status).toBe("eligible");
  });

  it("enforces the forced-induction absolute floor even when the formula computes lower", () => {
    const result = evaluatePreparedXp(
      build({
        drivetrainLayout: "fwd",
        inductionType: "forcedInduction",
        engineDisplacementLiters: "0.5",
        measuredWeightNoDriver: "1625",
        activeReactiveSuspension: "no",
        rearWeightBiasOver51: "no"
      })
    );
    // formula: 1350 + 150*(0.5*1.6=0.8) = 1470, but FI floor for FWD is 1625
    expect(result.minimumWeight).toBe(1625);
  });

  it("does not apply the forced-induction floor to naturally aspirated cars", () => {
    const result = evaluatePreparedXp(
      build({
        drivetrainLayout: "fwd",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "0.5",
        measuredWeightNoDriver: "1325",
        activeReactiveSuspension: "no",
        rearWeightBiasOver51: "no"
      })
    );
    // 1250 + 150*0.5 = 1325, no NA floor stated in the rule text
    expect(result.minimumWeight).toBe(1325);
    expect(result.status).toBe("eligible");
  });

  it("blocks a car that cannot meet the computed minimum weight", () => {
    const result = evaluatePreparedXp(
      build({
        drivetrainLayout: "fwd",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.0",
        measuredWeightNoDriver: "1000",
        activeReactiveSuspension: "no",
        rearWeightBiasOver51: "no"
      })
    );
    expect(result.status).toBe("blocked");
  });

  it("returns manual review for rotary engines since the 2x chamber-volume equivalence is not modeled", () => {
    const result = evaluatePreparedXp(
      build({
        drivetrainLayout: "rwd",
        inductionType: "rotary",
        engineDisplacementLiters: "1.3",
        measuredWeightNoDriver: "1900",
        activeReactiveSuspension: "no",
        rearWeightBiasOver51: "no"
      })
    );
    expect(result.status).toBe("manual-review");
  });
});
