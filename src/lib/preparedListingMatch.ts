import type { VehicleSelection } from "./types";

/**
 * Shared vehicle-identity matching for Prepared's curated per-class listings
 * (CP/DP/EP/FP). These tables use combined manufacturer headers ("Ford &
 * Mercury", "Nissan & Datsun") and parenthetical brand lists ("General Motors
 * (Cadillac, Chevrolet, GMC, Oldsmobile, & Pontiac)"), and often list a base
 * name and a more qualified name as separate rows for the same manufacturer
 * (e.g. "Capri" vs "Capri Turbo"), so matching uses exact segment identity
 * rather than substring containment to avoid ambiguous double-matches.
 */

export interface PreparedListingBase {
  manufacturer: string;
  description: string;
  yearRanges: Array<[number, number]>;
}

export function normalizeWords(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function manufacturerMakes(manufacturer: string): string[] {
  const parenMatch = manufacturer.match(/\(([^)]*)\)/);
  const source = parenMatch ? parenMatch[1] : manufacturer.replace(/\s*\([^)]*\)\s*/g, "");
  return source
    .split(/\s*(?:,|&)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function listingSegments(description: string): string[] {
  // Strip every parenthetical qualifier (year ranges, "(all)", "(AWD)", etc.) --
  // not just from the first one onward, since some listings have a qualifier
  // attached to an earlier name before an "&"/"," introduces another name, e.g.
  // "Impreza (AWD) & WRX (all)". Truncating at the first "(" would silently
  // lose every segment after it. Then split only on commas, ampersands, and
  // em-dashes (used for descriptive appositions like "A-body – Valiant, Dart,
  // ..."). A plain hyphen is NOT a separator here -- it's part of many model
  // names themselves (MX-5, TR-4, S-10), and splitting on it would break their
  // identity into unmatchable fragments.
  return description
    .replace(/\([^)]*\)/g, " ")
    .split(/[,&–]/)
    .map((s) => normalizeWords(s))
    .filter((s) => s.length > 1);
}

export function yearApplies(yearRanges: Array<[number, number]>, year: string): boolean {
  if (yearRanges.length === 0) return true;
  const y = Number(year);
  if (!Number.isInteger(y)) return false;
  return yearRanges.some(([start, end]) => y >= start && y <= end);
}

export function matchesMake(listing: PreparedListingBase, make: string): boolean {
  const target = normalizeWords(make);
  return manufacturerMakes(listing.manufacturer).some((m) => normalizeWords(m) === target);
}

export function matchesModel(listing: PreparedListingBase, selection: VehicleSelection): boolean {
  const segments = listingSegments(listing.description);
  const modelIdentity = normalizeWords(selection.model);
  const variantIdentity = selection.variant ? normalizeWords(selection.variant) : null;
  return segments.some((segment) => segment === modelIdentity || segment === variantIdentity);
}

export function findSingleListing<T extends PreparedListingBase>(
  listings: T[],
  selection: VehicleSelection,
  year: string
): T | null {
  const candidates = listings.filter(
    (listing) => matchesMake(listing, selection.make) && yearApplies(listing.yearRanges, year)
  );
  const matches = candidates.filter((listing) => matchesModel(listing, selection));
  return matches.length === 1 ? matches[0] : null;
}
