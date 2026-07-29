import appendixAData from "../src/data/appendix-a-2026.json";
import {
  getMakes,
  getModels,
  getVehicleMapping,
  getVehicleVariants,
  getYears
} from "../src/lib/vehicleData";

type AppendixCategory = "street" | "streetTouring" | "streetPrepared";

const reachedByClass = new Map<string, string[]>();
let mappedSelections = 0;
let manualSelections = 0;

for (const year of getYears()) {
  for (const make of getMakes(year)) {
    for (const model of getModels(make, year)) {
      const variants = getVehicleVariants(make, model, year);
      const choices = variants.length > 0 ? variants.map((variant) => variant.value) : [undefined];
      for (const variant of choices) {
        const mapping = getVehicleMapping({ year, make, model, variant });
        if (!mapping) {
          manualSelections += 1;
          continue;
        }
        mappedSelections += 1;
        for (const [classId, source] of Object.entries(mapping.classSources ?? {})) {
          const descriptions = reachedByClass.get(classId) ?? [];
          descriptions.push(source.description);
          reachedByClass.set(classId, descriptions);
        }
      }
    }
  }
}

/**
 * A classId can be reached through several related rulebook rows that get
 * merged into one classSources description (joined with "; "), so exact
 * string equality against a single official row under-counts reachability.
 * A reached row's description is always a substring of what it was merged
 * into, so containment is the correct check here.
 */
function isReached(classId: string, description: string): boolean {
  const descriptions = reachedByClass.get(classId);
  return descriptions ? descriptions.some((entry) => entry.includes(description)) : false;
}

function auditCategory(category: AppendixCategory) {
  const listings = appendixAData.listings.filter(
    (listing) => listing.category === category && !/^"?catch-all"?/i.test(listing.manufacturer)
  );
  const reached = listings.filter((listing) => isReached(listing.classId, listing.description));
  const explicitYear = listings.filter((listing) => listing.yearRanges.length > 0);
  const reachedExplicitYear = explicitYear.filter((listing) =>
    isReached(listing.classId, listing.description)
  );
  const criteriaDriven = listings.filter(
    (listing) =>
      listing.manufacturer === "General Motors" ||
      /\bNOC\b/i.test(listing.description) ||
      /^(?:all|.*\bmodels?)$/i.test(listing.description)
  );
  const exact = listings.filter((listing) => !criteriaDriven.includes(listing));
  const reachedExact = exact.filter((listing) => isReached(listing.classId, listing.description));
  const unreached = listings.filter((listing) => !isReached(listing.classId, listing.description));

  const unreachedManufacturerCounts = new Map<string, number>();
  for (const listing of unreached) {
    unreachedManufacturerCounts.set(
      listing.manufacturer,
      (unreachedManufacturerCounts.get(listing.manufacturer) ?? 0) + 1
    );
  }
  const unreachedByManufacturer = [...unreachedManufacturerCounts]
    .map(([manufacturer, count]) => ({ manufacturer, count }))
    .sort((left, right) => right.count - left.count);

  return {
    category,
    officialListings: listings.length,
    reachedListings: reached.length,
    explicitYearListings: explicitYear.length,
    reachedExplicitYearListings: reachedExplicitYear.length,
    exactListings: exact.length,
    reachedExactListings: reachedExact.length,
    criteriaDrivenListings: criteriaDriven.length,
    unreachedByManufacturer,
    unreachedExamples: unreached.slice(0, 40).map((listing) => ({
      classId: listing.classId,
      manufacturer: listing.manufacturer,
      description: listing.description,
      yearRanges: listing.yearRanges
    }))
  };
}

const street = auditCategory("street");
const streetTouring = auditCategory("streetTouring");
const streetPrepared = auditCategory("streetPrepared");

console.log(
  JSON.stringify(
    {
      mappedSelections,
      manualSelections,
      street,
      streetTouring,
      streetPrepared,
      note:
        "A rulebook listing can cover several model years; reachability means at least one exact selector choice resolves to that source. Street Touring and Street Prepared reachability additionally depends on identity-matching a listing back to its Street counterpart, so their thresholds are lower than Street's while that matching layer is hardened incrementally."
    },
    null,
    2
  )
);

if (street.reachedExactListings / street.exactListings < 0.98) {
  throw new Error("Exact official Street selector reachability fell below 98%");
}

if (street.reachedExplicitYearListings !== street.explicitYearListings) {
  throw new Error("One or more explicitly year-bounded Street listings are unreachable");
}

if (streetTouring.reachedExactListings / streetTouring.exactListings < 0.78) {
  throw new Error("Exact official Street Touring selector reachability fell below 78%");
}

if (streetPrepared.reachedExactListings / streetPrepared.exactListings < 0.63) {
  throw new Error("Exact official Street Prepared selector reachability fell below 63%");
}
