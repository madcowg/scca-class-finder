import appendixAData from "../src/data/appendix-a-2026.json";
import {
  getMakes,
  getModels,
  getVehicleMapping,
  getVehicleVariants,
  getYears
} from "../src/lib/vehicleData";

const reachedSources = new Set<string>();
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
          reachedSources.add(`${classId}\u0000${source.description}`);
        }
      }
    }
  }
}

const officialStreet = appendixAData.listings.filter(
  (listing) =>
    listing.category === "street" &&
    !/^"?catch-all"?/i.test(listing.manufacturer)
);
const reachedStreet = officialStreet.filter((listing) =>
  reachedSources.has(`${listing.classId}\u0000${listing.description}`)
);
const explicitYearStreet = officialStreet.filter((listing) => listing.yearRanges.length > 0);
const reachedExplicitYearStreet = explicitYearStreet.filter((listing) =>
  reachedSources.has(`${listing.classId}\u0000${listing.description}`)
);
const criteriaDrivenStreet = officialStreet.filter(
  (listing) =>
    listing.manufacturer === "General Motors" ||
    /\bNOC\b/i.test(listing.description) ||
    /^(?:all|.*\bmodels?)$/i.test(listing.description)
);
const exactStreet = officialStreet.filter(
  (listing) => !criteriaDrivenStreet.includes(listing)
);
const reachedExactStreet = exactStreet.filter((listing) =>
  reachedSources.has(`${listing.classId}\u0000${listing.description}`)
);
const unreachedStreet = officialStreet.filter(
  (listing) => !reachedSources.has(`${listing.classId}\u0000${listing.description}`)
);
const unreachedManufacturerCounts = new Map<string, number>();
for (const listing of unreachedStreet) {
  unreachedManufacturerCounts.set(
    listing.manufacturer,
    (unreachedManufacturerCounts.get(listing.manufacturer) ?? 0) + 1
  );
}
const unreachedByManufacturer = [...unreachedManufacturerCounts]
  .map(([manufacturer, count]) => ({ manufacturer, count }))
  .sort((left, right) => right.count - left.count);

console.log(
  JSON.stringify(
    {
      officialStreetListings: officialStreet.length,
      reachedStreetListings: reachedStreet.length,
      explicitYearStreetListings: explicitYearStreet.length,
      reachedExplicitYearStreetListings: reachedExplicitYearStreet.length,
      exactStreetListings: exactStreet.length,
      reachedExactStreetListings: reachedExactStreet.length,
      criteriaDrivenStreetListings: criteriaDrivenStreet.length,
      mappedSelections,
      manualSelections,
      unreachedByManufacturer,
      unreachedExamples: unreachedStreet.slice(0, 40).map((listing) => ({
        classId: listing.classId,
        manufacturer: listing.manufacturer,
        description: listing.description,
        yearRanges: listing.yearRanges
      })),
      note:
        "A rulebook listing can cover several model years; reachability means at least one exact selector choice resolves to that source."
    },
    null,
    2
  )
);

if (reachedExactStreet.length / exactStreet.length < 0.95) {
  throw new Error("Exact official Street selector reachability fell below 95%");
}

if (reachedExplicitYearStreet.length !== explicitYearStreet.length) {
  throw new Error("One or more explicitly year-bounded Street listings are unreachable");
}
