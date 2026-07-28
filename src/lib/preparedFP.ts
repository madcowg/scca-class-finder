import fpData from "../data/prepared-fp-2026.json";
import { findSingleListing, type PreparedListingBase } from "./preparedListingMatch";
import type { BuildProfile, PreparedFpEvaluation, VehicleSelection } from "./types";

/**
 * Section 17 / Appendix A - F Prepared (FP) (2026 rulebook, pages 256-259).
 * Curated per-vehicle list like CP/DP/EP. Weight is a combined-factor formula:
 * base rate (piston or rotary) plus additive factors for forced induction,
 * peripheral-port rotary, rear weight bias, and drivetrain, all summed into
 * one factor and multiplied by displacement once (verified against the
 * rulebook's own worked example: AWD Subaru WRX STI, 2457cc, 11in wheels ->
 * 2750 lbs). Rotary engines use a fixed specified displacement per engine
 * family (12A/13B/Renesis) rather than actual displacement.
 */

interface FpListing extends PreparedListingBase {
  rotaryEngineFamily?: "12a" | "13b" | "renesis";
  peripheralPortAllowed?: boolean;
}

const listings = fpData.listings as unknown as FpListing[];
const formula = fpData.formula;

const FLAT_WHEEL_ADJUSTMENT: Record<string, number> = {
  upTo10in: 0,
  over10to11in: formula.flatAdjustmentsLbs.wheelWidthOver10Upto11In,
  over11to12in: formula.flatAdjustmentsLbs.wheelWidthOver11Upto12In
};

export function evaluatePreparedFP(
  selection: VehicleSelection,
  build: BuildProfile
): PreparedFpEvaluation {
  const listing = selection.notListed
    ? null
    : findSingleListing(listings, selection, selection.year);
  if (!listing) {
    return { status: "not-listed", reasons: [], blockers: [], minimumWeight: null, matchedListing: null };
  }

  const manual: string[] = [];
  const isRotary = build.inductionType === "rotary";
  if (build.inductionType !== "naturallyAspirated" && build.inductionType !== "forcedInduction" && !isRotary) {
    manual.push("Identify whether the engine is naturally aspirated, forced induction, or rotary.");
  }
  let displacementCc = 0;
  if (isRotary) {
    if (build.rotaryEngineFamily === "unknown" || !build.rotaryEngineFamily) {
      manual.push("Identify the rotary engine family (12A, 13B, or Renesis) for its specified displacement.");
    } else {
      displacementCc = (
        formula.rotaryFamilySpecifiedDisplacementCc as Record<string, number>
      )[build.rotaryEngineFamily];
    }
    if (build.peripheralPortRotary === "unknown" || !build.peripheralPortRotary) {
      manual.push("Identify whether the rotary engine uses peripheral (or bridge) porting.");
    } else if (build.peripheralPortRotary === "yes" && listing.peripheralPortAllowed === false) {
      manual.push(
        `Peripheral/bridge porting is not allowed for this listing (${listing.description}); confirm the engine configuration before relying on an FP result.`
      );
    }
  } else {
    const displacement = parseFloat(build.engineDisplacementLiters);
    if (!Number.isFinite(displacement) || displacement <= 0) {
      manual.push("Enter the actual engine displacement in liters.");
    } else {
      displacementCc = displacement * 1000;
    }
  }
  const measuredWeight = parseFloat(build.measuredWeightNoDriver);
  if (!Number.isFinite(measuredWeight) || measuredWeight <= 0) {
    manual.push("Enter the car's measured competition weight without the driver.");
  }
  const drivetrain =
    build.drivetrainLayout === "fwd" || build.drivetrainLayout === "rwd" || build.drivetrainLayout === "awd"
      ? build.drivetrainLayout
      : null;
  if (!drivetrain) {
    manual.push("Identify whether the factory driven-wheel layout is FWD, RWD, or AWD.");
  }
  if (build.rearWeightBiasOver51 === "unknown" || !build.rearWeightBiasOver51) {
    manual.push("Identify whether more than 51% of the car's weight is on the rear axle.");
  }
  if (build.solidAxleRwd === "unknown" || !build.solidAxleRwd) {
    manual.push("Identify whether the car uses a solid (live) rear axle.");
  }
  if (build.wheelWidthCategory === "unknown" || !build.wheelWidthCategory) {
    manual.push("Identify the widest competition wheel: 10in or less, over 10 up to 11in, or over 11 up to 12in.");
  }
  if (build.alternateEngineAllowance === "unknown" || !build.alternateEngineAllowance) {
    manual.push("Identify whether the car uses FP's Alternate Engine Allowance.");
  }

  if (manual.length > 0) {
    return {
      status: "manual-review",
      reasons: [`This vehicle is specifically listed in FP (${listing.description}).`],
      blockers: manual,
      minimumWeight: null,
      matchedListing: listing.description
    };
  }

  let factor = isRotary ? formula.rotaryRateLbsPerCc : formula.pistonRateLbsPerCc;
  if (build.inductionType === "forcedInduction") factor += formula.forcedInductionRateLbsPerCc;
  if (isRotary && build.peripheralPortRotary === "yes") {
    factor += formula.peripheralPortRotaryRateLbsPerCc;
  }
  if (build.rearWeightBiasOver51 === "yes") factor += formula.adjustmentFactorsPerCc.rearWeightBiasOver51;
  if (drivetrain === "awd") factor += formula.adjustmentFactorsPerCc.awd;
  if (drivetrain === "fwd") factor += formula.adjustmentFactorsPerCc.fwd;
  if (build.solidAxleRwd === "yes") factor += formula.adjustmentFactorsPerCc.solidDriveAxle;
  if (build.alternateEngineAllowance === "yes") factor += formula.adjustmentFactorsPerCc.alternateEngineAllowance;

  let base = factor * displacementCc;
  base = Math.min(Math.max(base, formula.floorLbs), formula.capLbs);

  let minimumWeight = base + (FLAT_WHEEL_ADJUSTMENT[build.wheelWidthCategory] ?? 0);
  minimumWeight = Math.round(minimumWeight);

  if (measuredWeight >= minimumWeight) {
    return {
      status: "eligible",
      reasons: [
        `This vehicle is specifically listed in FP (${listing.description}); minimum weight without driver is ${minimumWeight} lbs.`
      ],
      blockers: [],
      minimumWeight,
      matchedListing: listing.description
    };
  }

  return {
    status: "blocked",
    reasons: [],
    blockers: [
      `FP requires at least ${minimumWeight} lbs without driver for this vehicle (${listing.description}); the reported weight is below this minimum.`
    ],
    minimumWeight,
    matchedListing: listing.description
  };
}
