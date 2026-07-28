import { describe, expect, it } from "vitest";
import { evaluateModifiedProduction } from "./modified";
import { DEFAULT_BUILD } from "./rules";

function build(overrides: Partial<typeof DEFAULT_BUILD>) {
  return { ...DEFAULT_BUILD, ...overrides };
}

describe("evaluateModifiedProduction", () => {
  it("requires all Section 18 facts before returning a class", () => {
    const result = evaluateModifiedProduction(DEFAULT_BUILD);
    expect(result.status).toBe("manual-review");
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it("places a naturally aspirated 2.0L or under car in DM at the flat 1400 lb minimum", () => {
    const result = evaluateModifiedProduction(
      build({
        drivetrainLayout: "fwd",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.0",
        measuredWeightWithDriverModified: "1400",
        tractionAidsPresent: "no",
        aeroWingsPresent: "no"
      })
    );
    expect(result.classId).toBe("dm");
    expect(result.minimumWeight).toBe(1400);
    expect(result.status).toBe("eligible");
  });

  it("places a naturally aspirated car over 2.0L in EM at the flat 1700 lb minimum", () => {
    const result = evaluateModifiedProduction(
      build({
        drivetrainLayout: "rwd",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.1",
        measuredWeightWithDriverModified: "1700",
        tractionAidsPresent: "no",
        aeroWingsPresent: "no"
      })
    );
    expect(result.classId).toBe("em");
    expect(result.minimumWeight).toBe(1700);
  });

  it("multiplies forced-induction displacement by 1.4x, moving a 1.5L turbo into EM instead of DM", () => {
    const result = evaluateModifiedProduction(
      build({
        drivetrainLayout: "fwd",
        inductionType: "forcedInduction",
        engineDisplacementLiters: "1.5",
        measuredWeightWithDriverModified: "1700",
        tractionAidsPresent: "no",
        aeroWingsPresent: "no"
      })
    );
    // 1.5 * 1.4 = 2.1L, over the 2.0L DM threshold
    expect(result.classId).toBe("em");
  });

  it("applies the AWD, traction-aid, and wing weight additions, which differ between DM and EM", () => {
    const dm = evaluateModifiedProduction(
      build({
        drivetrainLayout: "awd",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "1.6",
        measuredWeightWithDriverModified: "1900",
        tractionAidsPresent: "yes",
        aeroWingsPresent: "yes"
      })
    );
    // 1400 + 200 (AWD) + 100 (traction) + 200 (wings) = 1900
    expect(dm.classId).toBe("dm");
    expect(dm.minimumWeight).toBe(1900);
    expect(dm.status).toBe("eligible");

    const em = evaluateModifiedProduction(
      build({
        drivetrainLayout: "awd",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "2.5",
        measuredWeightWithDriverModified: "2300",
        tractionAidsPresent: "yes",
        aeroWingsPresent: "yes"
      })
    );
    // 1700 + 300 (AWD) + 100 (traction) + 200 (wings) = 2300
    expect(em.classId).toBe("em");
    expect(em.minimumWeight).toBe(2300);
  });

  it("blocks a car that cannot meet its class's minimum weight", () => {
    const result = evaluateModifiedProduction(
      build({
        drivetrainLayout: "fwd",
        inductionType: "naturallyAspirated",
        engineDisplacementLiters: "1.6",
        measuredWeightWithDriverModified: "1200",
        tractionAidsPresent: "no",
        aeroWingsPresent: "no"
      })
    );
    expect(result.status).toBe("blocked");
  });

  it("returns manual review for rotary engines since the 1.6x chamber-volume equivalence is not modeled", () => {
    const result = evaluateModifiedProduction(
      build({
        drivetrainLayout: "rwd",
        inductionType: "rotary",
        engineDisplacementLiters: "1.3",
        measuredWeightWithDriverModified: "1900",
        tractionAidsPresent: "no",
        aeroWingsPresent: "no"
      })
    );
    expect(result.status).toBe("manual-review");
  });
});
