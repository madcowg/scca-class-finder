import type { BuildProfile, StreetModifiedClassId, StreetModifiedEvaluation, VehicleMapping } from "./types";

/**
 * Section 16 / Appendix A - Street Modified (2026 rulebook, pages 231-232).
 * SSM/SM/SMF are not a per-model Appendix A table; eligibility and minimum
 * weight are both computed from body configuration, drivetrain, and engine
 * displacement, with a short list of named manufacturer exceptions.
 */

const SSM_MAX_WEIGHT = 2900;
const SM_MAX_WEIGHT = 3100;
const SMF_MAX_WEIGHT = 3100;

const SSM_INCLUDED_LOTUS_MODELS = ["elise", "exige", "evora", "esprit"];
const SM_ALLOWED_PORSCHE_MODELS = ["924", "928", "944", "968"];

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isMake(mapping: VehicleMapping | null, make: string): boolean {
  return normalize(mapping?.selection.make) === make;
}

function modelContains(mapping: VehicleMapping | null, token: string): boolean {
  return normalize(mapping?.selection.model).includes(token);
}

function isMcLarenMp412C(mapping: VehicleMapping | null): boolean {
  return isMake(mapping, "mclaren") && modelContains(mapping, "mp4-12c");
}

function isNamedSsmLotus(mapping: VehicleMapping | null): boolean {
  return (
    isMake(mapping, "lotus") &&
    SSM_INCLUDED_LOTUS_MODELS.some((model) => modelContains(mapping, model))
  );
}

function isExcludedOtherLotus(mapping: VehicleMapping | null): boolean {
  return isMake(mapping, "lotus") && !isNamedSsmLotus(mapping);
}

function isSmExcludedPorsche(mapping: VehicleMapping | null): boolean {
  return (
    isMake(mapping, "porsche") &&
    !SM_ALLOWED_PORSCHE_MODELS.some((model) => modelContains(mapping, model))
  );
}

function isSmExcludedMake(mapping: VehicleMapping | null): boolean {
  return isMake(mapping, "triumph") || (isMake(mapping, "mg") && modelContains(mapping, "mgb gt"));
}

function round(value: number): number {
  return Math.round(value);
}

export function evaluateStreetModified(
  build: BuildProfile,
  mapping: VehicleMapping | null
): StreetModifiedEvaluation {
  const reasons: string[] = [];
  const manual: string[] = [];
  const blockers: string[] = [];

  const drivetrain =
    build.drivetrainLayout === "fwd" ||
    build.drivetrainLayout === "rwd" ||
    build.drivetrainLayout === "awd"
      ? build.drivetrainLayout
      : null;
  if (!drivetrain) {
    manual.push("Identify whether the factory driven-wheel layout is FWD, RWD, or AWD.");
  }

  if (build.bodyConfiguration === "unknown" || !build.bodyConfiguration) {
    manual.push(
      "Identify the body configuration: a 2-seat car, a sedan/coupe originally equipped with four seats and four factory seat belts, or a pickup."
    );
  }

  if (build.inductionType === "rotary") {
    manual.push(
      "Rotary-engine displacement equivalence (0.9L per rotor plus chamber-volume difference) is not modeled here; send exact rotor specifications for manual review."
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

  if (build.tireWidthCategory === "unknown" || !build.tireWidthCategory) {
    manual.push("Identify whether the widest competition tire is 275 mm or narrower.");
  }

  if (drivetrain === "rwd" && (build.solidAxleRwd === "unknown" || !build.solidAxleRwd)) {
    manual.push("Identify whether the car uses a solid (live) rear axle.");
  }

  if (manual.length > 0) {
    return {
      status: "manual-review",
      eligibleClasses: [],
      recommendedClass: null,
      reasons,
      blockers: manual,
      minimumWeights: {}
    };
  }

  const narrowTire = build.tireWidthCategory === "275orLess";
  const solidAxle = drivetrain === "rwd" && build.solidAxleRwd === "yes";
  const forcedInduction = build.inductionType === "forcedInduction";
  const classifiedDisplacement = (perLiterAddOn: number) =>
    forcedInduction ? displacement + perLiterAddOn : displacement;
  const smExcludedMakeModel = isSmExcludedPorsche(mapping) || isSmExcludedMake(mapping);

  const minimumWeights: Partial<Record<StreetModifiedClassId, number>> = {};
  const eligibleClasses: StreetModifiedClassId[] = [];

  function evaluateSsm(): boolean {
    const base = drivetrain === "fwd" ? 1350 : 1600;
    const rate = drivetrain === "fwd" ? 125 : drivetrain === "rwd" ? 200 : 300;
    let minWeight = base + rate * classifiedDisplacement(1.4);
    if (narrowTire) minWeight -= 200;
    minWeight = Math.min(round(minWeight), SSM_MAX_WEIGHT);
    minimumWeights.ssm = minWeight;
    if (measuredWeight >= minWeight) {
      eligibleClasses.push("ssm");
      reasons.push(`SSM requires at least ${minWeight} lbs without driver; the reported weight meets this minimum.`);
      return true;
    }
    blockers.push(`SSM requires at least ${minWeight} lbs without driver; the reported weight is below this minimum.`);
    return false;
  }

  // The SP-eligibility and non-US-delivery exclusions named in Section 16 for the general
  // 2-seat path are not independently verifiable from this input set, so they are not modeled;
  // only the named Lotus exclusion and the named make/model inclusions are checked explicitly.
  const twoSeatEligible = build.bodyConfiguration === "twoSeat";
  const namedSsmInclusion = isMake(mapping, "porsche") || isNamedSsmLotus(mapping) || isMcLarenMp412C(mapping);

  if (isExcludedOtherLotus(mapping) && twoSeatEligible) {
    blockers.push(
      "Lotus models other than Elise, Exige, Evora, and Esprit are expressly excluded from SSM's 2-seat allowance."
    );
  } else if (twoSeatEligible || namedSsmInclusion) {
    evaluateSsm();
  }

  const smBodyEligible =
    drivetrain === "fwd" ||
    build.bodyConfiguration === "sedanCoupeFourSeat" ||
    build.bodyConfiguration === "pickup";

  if (smBodyEligible && smExcludedMakeModel) {
    blockers.push(
      "This make/model is expressly excluded from SM (Street Modified only permits Porsche 924/928/944/968, and excludes Triumph and MGB GT)."
    );
  } else if (smBodyEligible) {
    const base = drivetrain === "fwd" ? 1550 : 1800;
    const rate = drivetrain === "fwd" ? 125 : drivetrain === "rwd" ? 200 : 300;
    let minWeight = base + rate * classifiedDisplacement(1.4);
    if (solidAxle) minWeight -= 25 * classifiedDisplacement(1.4);
    if (narrowTire) minWeight -= 200;
    minWeight = Math.min(round(minWeight), SM_MAX_WEIGHT);
    minimumWeights.sm = minWeight;
    if (measuredWeight >= minWeight) {
      eligibleClasses.push("sm");
      reasons.push(`SM requires at least ${minWeight} lbs without driver; the reported weight meets this minimum.`);
    } else {
      blockers.push(`SM requires at least ${minWeight} lbs without driver; the reported weight is below this minimum.`);
      if (!eligibleClasses.includes("ssm") && !minimumWeights.ssm) {
        evaluateSsm();
      }
    }
  }

  if (drivetrain === "fwd") {
    const minWeight = Math.min(round(1750 + 125 * classifiedDisplacement(1.0)), SMF_MAX_WEIGHT);
    minimumWeights.smf = minWeight;
    if (measuredWeight >= minWeight) {
      eligibleClasses.push("smf");
      reasons.push(`SMF requires at least ${minWeight} lbs without driver (no narrow-tire discount); the reported weight meets this minimum.`);
    } else {
      blockers.push(`SMF requires at least ${minWeight} lbs without driver; the reported weight is below this minimum.`);
    }
  }

  const uniqueEligible = [...new Set(eligibleClasses)];
  if (uniqueEligible.length === 0) {
    return {
      status: blockers.length > 0 ? "blocked" : "manual-review",
      eligibleClasses: [],
      recommendedClass: null,
      reasons,
      blockers: blockers.length > 0 ? blockers : ["This body configuration and drivetrain do not match any Street Modified class eligibility path."],
      minimumWeights
    };
  }

  const recommendedClass = uniqueEligible.reduce((best, candidate) =>
    (minimumWeights[candidate] ?? Infinity) < (minimumWeights[best] ?? Infinity) ? candidate : best
  );

  return {
    status: "eligible",
    eligibleClasses: uniqueEligible,
    recommendedClass,
    reasons,
    blockers: [],
    minimumWeights
  };
}
