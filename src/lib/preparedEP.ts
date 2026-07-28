import epData from "../data/prepared-ep-2026.json";
import { findSingleListing, type PreparedListingBase } from "./preparedListingMatch";
import type { BuildProfile, PreparedEpEvaluation, VehicleSelection } from "./types";

/**
 * Section 17 / Appendix A - E Prepared (EP) (2026 rulebook, pages 248-253).
 * Curated per-vehicle list like CP/DP. Weight is a displacement formula whose
 * rate depends on induction type first (forced induction overrides valve
 * count), then valve count and, for 3+ valve engines, a displacement
 * threshold. The rulebook's separate "Level 2 (Limited Prep)" sub-table
 * (a fixed-spec, flat 1.00x cc allowance for a short list of vintage
 * economy cars) is not modeled -- see the data file's note.
 */

type EpListing = PreparedListingBase;

const listings = epData.listings as unknown as EpListing[];
const formula = epData.formula;

const WHEEL_WIDTH_ADJUSTMENT: Record<string, number> = {
  upTo10in: 0,
  over10to11in: formula.adjustmentsLbs.wheelWidthOver10Upto11In,
  over11to12in: formula.adjustmentsLbs.wheelWidthOver11Upto12In
};

export function evaluatePreparedEP(
  selection: VehicleSelection,
  build: BuildProfile
): PreparedEpEvaluation {
  const listing = selection.notListed
    ? null
    : findSingleListing(listings, selection, selection.year);
  if (!listing) {
    return { status: "not-listed", reasons: [], blockers: [], minimumWeight: null, matchedListing: null };
  }

  const manual: string[] = [];
  if (build.inductionType === "rotary") {
    manual.push(
      "Rotary-engine displacement equivalence is not modeled for EP; send exact rotor specifications for manual review."
    );
  } else if (build.inductionType !== "naturallyAspirated" && build.inductionType !== "forcedInduction") {
    manual.push("Identify whether the engine is naturally aspirated or forced induction.");
  }
  if (
    build.inductionType === "naturallyAspirated" &&
    (build.valveCountPerCylinder === "unknown" || !build.valveCountPerCylinder)
  ) {
    manual.push("Identify the engine's valve count per cylinder: 2, or 3 or more.");
  }
  const displacement = parseFloat(build.engineDisplacementLiters);
  if (!Number.isFinite(displacement) || displacement <= 0) {
    manual.push("Enter the actual (listed) engine displacement in liters.");
  }
  const measuredWeight = parseFloat(build.measuredWeightNoDriver);
  if (!Number.isFinite(measuredWeight) || measuredWeight <= 0) {
    manual.push("Enter the car's measured competition weight without the driver.");
  }
  if (build.wheelWidthCategory === "unknown" || !build.wheelWidthCategory) {
    manual.push("Identify the widest competition wheel: 10in or less, over 10 up to 11in, or over 11 up to 12in.");
  }
  if (build.alternateEngineAllowance === "unknown" || !build.alternateEngineAllowance) {
    manual.push("Identify whether the car uses EP's Alternate Engine Allowance.");
  }

  if (manual.length > 0) {
    return {
      status: "manual-review",
      reasons: [`This vehicle is specifically listed in EP (${listing.description}).`],
      blockers: manual,
      minimumWeight: null,
      matchedListing: listing.description
    };
  }

  const displacementCc = displacement * 1000;
  let base: number;
  if (build.inductionType === "forcedInduction") {
    base = formula.forcedInduction.rateLbsPerCc * displacementCc;
  } else if (build.valveCountPerCylinder === "threeOrFour") {
    base =
      displacementCc <= formula.threeOrMoreValveLowDisplacement.maxCc
        ? formula.threeOrMoreValveLowDisplacement.rateLbsPerCc * displacementCc
        : formula.threeOrMoreValveHighDisplacement.rateLbsPerCc * displacementCc +
          formula.threeOrMoreValveHighDisplacement.baseLbs;
  } else {
    base = formula.twoValvePerCyl.rateLbsPerCc * displacementCc;
  }

  base = Math.min(Math.max(base, formula.floorLbs), formula.capLbs);

  let minimumWeight = base + (WHEEL_WIDTH_ADJUSTMENT[build.wheelWidthCategory] ?? 0);
  if (build.alternateEngineAllowance === "yes") {
    minimumWeight += formula.adjustmentsLbs.alternateEngineAllowancePerCc * displacementCc;
  }
  minimumWeight = Math.round(minimumWeight);

  if (measuredWeight >= minimumWeight) {
    return {
      status: "eligible",
      reasons: [
        `This vehicle is specifically listed in EP (${listing.description}); minimum weight without driver is ${minimumWeight} lbs.`
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
      `EP requires at least ${minimumWeight} lbs without driver for this vehicle (${listing.description}); the reported weight is below this minimum.`
    ],
    minimumWeight,
    matchedListing: listing.description
  };
}
