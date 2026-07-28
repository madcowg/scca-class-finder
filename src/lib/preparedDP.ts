import dpData from "../data/prepared-dp-2026.json";
import { findSingleListing, type PreparedListingBase } from "./preparedListingMatch";
import type { BuildProfile, PreparedDpEvaluation, VehicleSelection } from "./types";

/**
 * Section 17 / Appendix A - D Prepared (DP) (2026 rulebook, pages 242-247).
 * Curated per-vehicle list like CP, but weight is a displacement-based formula
 * (valve count per cylinder selects the rate) rather than a flat rate.
 */

type DpListing = PreparedListingBase;

const listings = dpData.listings as unknown as DpListing[];
const formula = dpData.formula;

const WHEEL_WIDTH_ADJUSTMENT: Record<string, number> = {
  upTo10in: 0,
  over10to11in: formula.adjustmentsLbs.wheelWidthOver10Upto11In,
  over11to12in: formula.adjustmentsLbs.wheelWidthOver11Upto12In
};

export function evaluatePreparedDP(
  selection: VehicleSelection,
  build: BuildProfile
): PreparedDpEvaluation {
  const listing = selection.notListed
    ? null
    : findSingleListing(listings, selection, selection.year);
  if (!listing) {
    return { status: "not-listed", reasons: [], blockers: [], minimumWeight: null, matchedListing: null };
  }

  const manual: string[] = [];
  if (build.valveCountPerCylinder === "unknown" || !build.valveCountPerCylinder) {
    manual.push("Identify the engine's valve count per cylinder: 2, or 3-4.");
  }
  const displacement = parseFloat(build.engineDisplacementLiters);
  if (!Number.isFinite(displacement) || displacement <= 0) {
    manual.push("Enter the actual (listed) engine displacement in liters.");
  }
  const measuredWeight = parseFloat(build.measuredWeightNoDriver);
  if (!Number.isFinite(measuredWeight) || measuredWeight <= 0) {
    manual.push("Enter the car's measured competition weight without the driver.");
  }
  if (build.rearWeightBiasOver51 === "unknown" || !build.rearWeightBiasOver51) {
    manual.push("Identify whether more than 51% of the car's weight is on the rear axle.");
  }
  if (build.variableCamTiming === "unknown" || !build.variableCamTiming) {
    manual.push("Identify whether the engine has variable camshaft timing and/or lift.");
  }
  if (build.solidAxleRwd === "unknown" || !build.solidAxleRwd) {
    manual.push("Identify whether the car uses a solid (live) rear axle.");
  }
  if (build.wheelWidthCategory === "unknown" || !build.wheelWidthCategory) {
    manual.push("Identify the widest competition wheel: 10in or less, over 10 up to 11in, or over 11 up to 12in.");
  }
  if (build.alternateEngineAllowance === "unknown" || !build.alternateEngineAllowance) {
    manual.push("Identify whether the car uses DP's Alternate Engine Allowance.");
  }

  if (manual.length > 0) {
    return {
      status: "manual-review",
      reasons: [`This vehicle is specifically listed in DP (${listing.description}).`],
      blockers: manual,
      minimumWeight: null,
      matchedListing: listing.description
    };
  }

  const displacementCc = displacement * 1000;
  const alternateEngine = build.alternateEngineAllowance === "yes";
  const base =
    build.valveCountPerCylinder === "threeOrFour"
      ? formula.threeOrFourValvePerCyl.rateLbsPerCc * displacementCc +
        formula.threeOrFourValvePerCyl.baseLbs
      : formula.twoValvePerCyl.rateLbsPerCc * displacementCc + formula.twoValvePerCyl.baseLbs;

  let minimumWeight = base;
  if (build.rearWeightBiasOver51 === "yes") {
    minimumWeight += formula.adjustmentsLbs.rearWeightBiasOver51PerCc * displacementCc;
  }
  if (build.variableCamTiming === "yes") minimumWeight += formula.adjustmentsLbs.variableCamTiming;
  if (build.solidAxleRwd === "yes") minimumWeight += formula.adjustmentsLbs.solidAxle;
  minimumWeight += WHEEL_WIDTH_ADJUSTMENT[build.wheelWidthCategory] ?? 0;
  if (alternateEngine) {
    minimumWeight += formula.adjustmentsLbs.alternateEngineAllowancePerCc * displacementCc;
  }

  if (!alternateEngine || !formula.capWaivedWithAlternateEngineAllowance) {
    minimumWeight = Math.min(minimumWeight, formula.capLbs);
  }
  minimumWeight = Math.round(minimumWeight);

  if (measuredWeight >= minimumWeight) {
    return {
      status: "eligible",
      reasons: [
        `This vehicle is specifically listed in DP (${listing.description}); minimum weight without driver is ${minimumWeight} lbs.`
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
      `DP requires at least ${minimumWeight} lbs without driver for this vehicle (${listing.description}); the reported weight is below this minimum.`
    ],
    minimumWeight,
    matchedListing: listing.description
  };
}
