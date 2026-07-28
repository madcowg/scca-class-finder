import type { BuildProfile, ModifiedProductionEvaluation } from "./types";

/**
 * Section 18.0.B / 18.1 / Appendix A - Modified Production-based Cars (2026
 * rulebook, pages 156-157 and 267-270). DM/EM are the only Modified classes
 * reachable by a modified production street car; AM/BM/CM/FM are dedicated
 * formula-car/sports-racer classes (Formula Vee, Spec Racer Ford, Formula
 * 500, etc.) that a production car cannot enter and are not modeled here.
 *
 * Engine classification (18.0.B) differs from Section 16/17: forced
 * induction multiplies displacement by 1.4x rather than adding a flat
 * add-on. DM covers classified displacement of 2000cc/2.0L and under;
 * everything else production-based falls to EM.
 */

const DM_MAX_DISPLACEMENT_LITERS = 2.0;
const DM_BASE_WEIGHT = 1400;
const EM_BASE_WEIGHT = 1700;
const AWD_ADJUSTMENT_DM = 200;
const AWD_ADJUSTMENT_EM = 300;
const TRACTION_AID_ADJUSTMENT = 100;
const WINGS_ADJUSTMENT = 200;

export function evaluateModifiedProduction(build: BuildProfile): ModifiedProductionEvaluation {
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
      "Rotary-engine displacement equivalence (1.6x the chamber-volume difference per rotor) is not modeled here; send exact rotor specifications for manual review."
    );
  } else if (build.inductionType !== "naturallyAspirated" && build.inductionType !== "forcedInduction") {
    manual.push("Identify whether the engine is naturally aspirated or forced induction.");
  }

  const displacement = parseFloat(build.engineDisplacementLiters);
  if (!Number.isFinite(displacement) || displacement <= 0) {
    manual.push("Enter the actual engine piston displacement in liters.");
  }

  const measuredWeight = parseFloat(build.measuredWeightWithDriverModified);
  if (!Number.isFinite(measuredWeight) || measuredWeight <= 0) {
    manual.push("Enter the car's measured competition weight with the driver.");
  }

  if (build.tractionAidsPresent === "unknown" || !build.tractionAidsPresent) {
    manual.push("Identify whether traction control, ABS, or stability control is fitted.");
  }

  if (build.aeroWingsPresent === "unknown" || !build.aeroWingsPresent) {
    manual.push("Identify whether the car uses a wing or other Modified-class aerodynamic aid.");
  }

  if (manual.length > 0) {
    return {
      status: "manual-review",
      classId: null,
      reasons,
      blockers: manual,
      minimumWeight: null
    };
  }

  const forcedInduction = build.inductionType === "forcedInduction";
  const classifiedDisplacement = forcedInduction ? displacement * 1.4 : displacement;
  const classId = classifiedDisplacement <= DM_MAX_DISPLACEMENT_LITERS ? "dm" : "em";

  let minimumWeight = classId === "dm" ? DM_BASE_WEIGHT : EM_BASE_WEIGHT;
  if (drivetrain === "awd") {
    minimumWeight += classId === "dm" ? AWD_ADJUSTMENT_DM : AWD_ADJUSTMENT_EM;
  }
  if (build.tractionAidsPresent === "yes") minimumWeight += TRACTION_AID_ADJUSTMENT;
  if (build.aeroWingsPresent === "yes") minimumWeight += WINGS_ADJUSTMENT;

  if (measuredWeight >= minimumWeight) {
    reasons.push(
      `${classId.toUpperCase()} requires at least ${minimumWeight} lbs with driver (classified displacement ${classifiedDisplacement.toFixed(2)}L); the reported weight meets this minimum.`
    );
    return { status: "eligible", classId, reasons, blockers: [], minimumWeight };
  }

  return {
    status: "blocked",
    classId,
    reasons,
    blockers: [
      `${classId.toUpperCase()} requires at least ${minimumWeight} lbs with driver (classified displacement ${classifiedDisplacement.toFixed(2)}L); the reported weight is below this minimum.`
    ],
    minimumWeight
  };
}
