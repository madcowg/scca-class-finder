import cpData from "../data/prepared-cp-2026.json";
import { findSingleListing, type PreparedListingBase } from "./preparedListingMatch";
import type { BuildProfile, PreparedCpEvaluation, VehicleSelection } from "./types";

/**
 * Section 17 / Appendix A - C Prepared (CP) (2026 rulebook, pages 239-241).
 * Unlike XP, CP is a curated per-vehicle list, not a displacement catch-all.
 * Weight is a flat rate by engine configuration (V8 vs 4/6-cyl, tube-frame or
 * not), overridden by an explicit per-listing weight where the rulebook states
 * one (e.g. Corvair, Yenko Stinger).
 */

interface CpListing extends PreparedListingBase {
  weightOverrideLbs: number | null;
  page: number;
}

const listings = cpData.listings as CpListing[];
const flatWeights = cpData.flatWeightsLbs;

export function evaluatePreparedCP(
  selection: VehicleSelection,
  build: BuildProfile
): PreparedCpEvaluation {
  const listing = selection.notListed
    ? null
    : findSingleListing(listings, selection, selection.year);
  if (!listing) {
    return {
      status: "not-listed",
      reasons: [],
      blockers: [],
      minimumWeight: null,
      matchedListing: null
    };
  }

  if (listing.weightOverrideLbs !== null) {
    return {
      status: "eligible",
      reasons: [
        `CP lists this vehicle with an explicit minimum weight of ${listing.weightOverrideLbs} lbs without driver.`
      ],
      blockers: [],
      minimumWeight: listing.weightOverrideLbs,
      matchedListing: listing.description
    };
  }

  const manual: string[] = [];
  const tubeFrame = build.body === "tubeFrame";
  if (build.cpEngineConfiguration === "unknown" || !build.cpEngineConfiguration) {
    manual.push(
      "Identify the engine configuration for CP's flat minimum weight: V8, or 4/6-cylinder."
    );
  }
  const displacement = parseFloat(build.engineDisplacementLiters);
  if (
    build.cpEngineConfiguration === "v8" &&
    (!Number.isFinite(displacement) || displacement <= 0)
  ) {
    manual.push("Enter the actual engine displacement in liters to apply the V8 5100cc break.");
  }

  if (manual.length > 0) {
    return {
      status: "manual-review",
      reasons: [`This vehicle is specifically listed in CP (${listing.description}).`],
      blockers: manual,
      minimumWeight: null,
      matchedListing: listing.description
    };
  }

  const displacementCc = displacement * 1000;
  let minimumWeight: number;
  if (tubeFrame) {
    minimumWeight =
      build.cpEngineConfiguration === "v8" && displacementCc > 5100
        ? flatWeights.tubeFrameOver5100cc
        : flatWeights.tubeFrameUpto5100cc;
  } else if (build.cpEngineConfiguration === "v8") {
    minimumWeight =
      displacementCc > 5100 ? flatWeights.v8Over5100cc : flatWeights.v8Upto5100cc;
  } else {
    minimumWeight = flatWeights.fourOrSixCyl;
  }

  return {
    status: "eligible",
    reasons: [
      `This vehicle is specifically listed in CP (${listing.description}); minimum weight without driver is ${minimumWeight} lbs.`
    ],
    blockers: [],
    minimumWeight,
    matchedListing: listing.description
  };
}
