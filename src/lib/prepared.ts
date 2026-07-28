import type { BuildProfile, PreparedXpEvaluation } from "./types";

/**
 * Section 17 / Appendix A - X Prepared (XP) (2026 rulebook, pages 233-236).
 * XP is the Prepared-category catch-all: "Any vehicle meeting the
 * requirements of Section 17.A.2, listed in another Prepared class,
 * specifically listed in CP, DP, EP, FP, or listed at the end, is eligible
 * for XP." CP/DP/EP/FP have their own per-model Appendix A tables (not yet
 * extracted into this app's data layer); until that data exists, a vehicle
 * that is specifically listed there may have a different, more favorable
 * weight than the generic XP formula computes, so this only ever confirms
 * the XP floor, not a CP/DP/EP/FP-specific placement.
 */

const FORCED_INDUCTION_MULTIPLIER = 1.6;
const NA_HIGH_DISPLACEMENT_THRESHOLD_LITERS = 4.0;
const FORMULA_CAP_BEFORE_ADJUSTMENTS = 2300;
const ACTIVE_SUSPENSION_ADJUSTMENT = 100;
const REAR_BIAS_RATE_ADJUSTMENT = 20;

const FORCED_INDUCTION_TABLE = { fwd: { base: 1350, rate: 150 }, rwd: { base: 1350, rate: 200 }, awd: { base: 1350, rate: 250 } };
const NA_LOW_DISPLACEMENT_TABLE = { fwd: { base: 1250, rate: 150 }, rwd: { base: 1250, rate: 200 }, awd: { base: 1250, rate: 250 } };
const NA_HIGH_DISPLACEMENT_TABLE = { fwd: { base: 1650, rate: 50 }, rwd: { base: 1650, rate: 100 }, awd: { base: 1650, rate: 150 } };

/** Absolute floor for forced-induction cars only; the rulebook does not state an equivalent floor for NA cars. */
const FORCED_INDUCTION_FLOOR = { fwd: 1625, rwd: 1900, awd: 1925 };

export function evaluatePreparedXp(build: BuildProfile): PreparedXpEvaluation {
  const reasons: string[] = [];
  const manual: string[] = [];

  const drivetrain =
    build.drivetrainLayout === "fwd" ||
    build.drivetrainLayout === "rwd" ||
    build.drivetrainLayout === "awd"
      ? build.drivetrainLayout
      : null;
  if (!drivetrain) {
    manual.push("Identify whether the factory driven-wheel layout is FWD, RWD, or AWD.");
  }

  if (build.inductionType === "rotary") {
    manual.push(
      "Rotary-engine displacement equivalence (2x the chamber-volume difference per rotor) is not modeled here; send exact rotor specifications for manual review."
    );
  } else if (build.inductionType !== "naturallyAspirated" && build.inductionType !== "forcedInduction") {
    manual.push("Identify whether the engine is naturally aspirated or forced induction.");
  }

  const displacement = parseFloat(build.engineDisplacementLiters);
  if (!Number.isFinite(displacement) || displacement <= 0) {
    manual.push("Enter the actual engine piston displacement in liters.");
  }

  const measuredWeight = parseFloat(build.measuredWeightNoDriver);
  if (!Number.isFinite(measuredWeight) || measuredWeight <= 0) {
    manual.push("Enter the car's measured competition weight without the driver.");
  }

  if (build.activeReactiveSuspension === "unknown" || !build.activeReactiveSuspension) {
    manual.push("Identify whether the car uses an active/reactive suspension system.");
  }

  if (build.rearWeightBiasOver51 === "unknown" || !build.rearWeightBiasOver51) {
    manual.push("Identify whether more than 51% of the car's weight is on the rear axle.");
  }

  if (manual.length > 0) {
    return { status: "manual-review", reasons, blockers: manual, minimumWeight: null };
  }

  const forcedInduction = build.inductionType === "forcedInduction";
  const classifiedDisplacement = forcedInduction ? displacement * FORCED_INDUCTION_MULTIPLIER : displacement;
  const table = forcedInduction
    ? FORCED_INDUCTION_TABLE
    : classifiedDisplacement < NA_HIGH_DISPLACEMENT_THRESHOLD_LITERS
      ? NA_LOW_DISPLACEMENT_TABLE
      : NA_HIGH_DISPLACEMENT_TABLE;
  const { base, rate } = table[drivetrain as "fwd" | "rwd" | "awd"];
  const rearBias = build.rearWeightBiasOver51 === "yes";
  const activeSuspension = build.activeReactiveSuspension === "yes";

  let minimumWeight = base + classifiedDisplacement * (rate + (rearBias ? REAR_BIAS_RATE_ADJUSTMENT : 0));
  minimumWeight = Math.min(Math.round(minimumWeight), FORMULA_CAP_BEFORE_ADJUSTMENTS);
  if (activeSuspension) minimumWeight += ACTIVE_SUSPENSION_ADJUSTMENT;

  if (forcedInduction) {
    minimumWeight = Math.max(minimumWeight, FORCED_INDUCTION_FLOOR[drivetrain as "fwd" | "rwd" | "awd"]);
  }

  if (measuredWeight >= minimumWeight) {
    reasons.push(
      `XP requires at least ${minimumWeight} lbs without driver (classified displacement ${classifiedDisplacement.toFixed(2)}L); the reported weight meets this minimum. A vehicle specifically listed in CP, DP, EP, or FP may have a different official weight that is not yet in this app's data.`
    );
    return { status: "eligible", reasons, blockers: [], minimumWeight };
  }

  return {
    status: "blocked",
    reasons,
    blockers: [
      `XP requires at least ${minimumWeight} lbs without driver (classified displacement ${classifiedDisplacement.toFixed(2)}L); the reported weight is below this minimum.`
    ],
    minimumWeight
  };
}
