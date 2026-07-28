import cpData from "../data/prepared-cp-2026.json";
import type { BuildProfile, PreparedCpEvaluation, VehicleSelection } from "./types";

/**
 * Section 17 / Appendix A - C Prepared (CP) (2026 rulebook, pages 239-241).
 * Unlike XP, CP is a curated per-vehicle list, not a displacement catch-all.
 * Weight is a flat rate by engine configuration (V8 vs 4/6-cyl, tube-frame or
 * not), overridden by an explicit per-listing weight where the rulebook states
 * one (e.g. Corvair, Yenko Stinger).
 */

interface CpListing {
  manufacturer: string;
  description: string;
  yearRanges: Array<[number, number]>;
  weightOverrideLbs: number | null;
  page: number;
}

const listings = cpData.listings as CpListing[];
const flatWeights = cpData.flatWeightsLbs;

function normalizeWords(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cpManufacturerMakes(manufacturer: string): string[] {
  const parenMatch = manufacturer.match(/\(([^)]*)\)/);
  const source = parenMatch ? parenMatch[1] : manufacturer.replace(/\s*\([^)]*\)\s*/g, "");
  return source
    .split(/\s*(?:,|&)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function listingSegments(description: string): string[] {
  return description
    .split("(")[0]
    .split(/[,&–-]/)
    .map((s) => normalizeWords(s))
    .filter((s) => s.length > 1);
}

function yearApplies(yearRanges: Array<[number, number]>, year: string): boolean {
  if (yearRanges.length === 0) return true;
  const y = Number(year);
  if (!Number.isInteger(y)) return false;
  return yearRanges.some(([start, end]) => y >= start && y <= end);
}

function matchesMake(listing: CpListing, make: string): boolean {
  const target = normalizeWords(make);
  return cpManufacturerMakes(listing.manufacturer).some((m) => normalizeWords(m) === target);
}

function matchesModel(listing: CpListing, selection: VehicleSelection): boolean {
  // Multi-name headers like "Firebird & TransAm" or "S10, S15, & Sonoma" list several
  // model names under one listing; any one of them naming the exact selected model or
  // variant is a match. This is intentionally an EXACT match (not substring containment):
  // CP frequently lists a base name and a more qualified name as separate rows for the
  // same manufacturer (e.g. "Capri" vs "Capri Turbo"), and substring matching would treat
  // the base name as matching both, making the result ambiguous.
  const segments = listingSegments(listing.description);
  const modelIdentity = normalizeWords(selection.model);
  const variantIdentity = selection.variant ? normalizeWords(selection.variant) : null;
  return segments.some((segment) => segment === modelIdentity || segment === variantIdentity);
}

function findCpListing(selection: VehicleSelection, year: string): CpListing | null {
  const candidates = listings.filter(
    (listing) => matchesMake(listing, selection.make) && yearApplies(listing.yearRanges, year)
  );
  const matches = candidates.filter((listing) => matchesModel(listing, selection));
  return matches.length === 1 ? matches[0] : null;
}

export function evaluatePreparedCP(
  selection: VehicleSelection,
  build: BuildProfile
): PreparedCpEvaluation {
  const listing = selection.notListed ? null : findCpListing(selection, selection.year);
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
