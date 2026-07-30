// Audits the OPPOSITE direction from scripts/audit-rulebook-coverage.ts. That script asks
// "is every official Appendix A row reachable by some selection?" This one asks the question
// a real user actually cares about: "for every real (year, make, model, variant) combination
// the selector itself offers, does getVehicleMapping resolve to a class at all?"
//
// A null result is only EXPECTED/correct when this EXACT selection genuinely has no plausible
// Street listing of its own -- hasPlausibleStreetListingForSelection (which mirrors
// officialMappingFor's own hasAnyListingForFamily gate) tells us that. This is deliberately
// NOT "does the family have any Street listing at all": a family can have a Street row that
// positively names a completely different sibling trim (e.g. Volvo's GS "S60R" row exists for
// family S60, but a plain modern "S60 B5" selection matches none of its text) without that
// counting as coverage for this one -- treating it as coverage would misreport a genuinely
// unclassed car as a "bug" needing a fix that doesn't exist. When a Street listing DOES plausibly
// apply to this specific selection but it still fails to resolve, that's a genuine matching bug:
// some real car a user can select is silently unclassifiable even though the rulebook covers it.
// The 2011 BMW 328i was exactly this shape (fixed by isGenericFamilyCatchAll's elimination match
// and rulebookVariantMatches's compound-identity match in vehicleData.ts).
//
// Usage: npm run audit:selections [-- --out=path.json]

import {
  getMakes,
  getModels,
  getVehicleMapping,
  getVehicleVariants,
  getYears,
  hasPlausibleStreetListingForSelection
} from "../src/lib/vehicleData";
import { writeFileSync } from "node:fs";

interface Gap {
  year: string;
  make: string;
  model: string;
  variant: string | undefined;
}

const gaps: Gap[] = [];
let totalSelections = 0;
let resolvedSelections = 0;
let expectedUnresolved = 0; // no Street listing for the family at all -- not a bug

for (const year of getYears()) {
  for (const make of getMakes(year)) {
    for (const model of getModels(make, year)) {
      const variants = getVehicleVariants(make, model, year);
      const choices = variants.length > 0 ? variants.map((variant) => variant.value) : [undefined];

      for (const variant of choices) {
        totalSelections += 1;
        const selection = { year, make, model, variant };
        const mapping = getVehicleMapping(selection);
        if (mapping) {
          resolvedSelections += 1;
          continue;
        }
        // "Does this EXACT selection have a plausible Street listing" -- not "does the family
        // have any Street listing at all". A family can have a Street row for a completely
        // different sibling trim (e.g. Volvo's GS "S60R" row exists for family S60, but says
        // nothing about a plain modern "S60 B5") without that counting as coverage for this one.
        if (!hasPlausibleStreetListingForSelection(selection)) {
          expectedUnresolved += 1;
          continue;
        }
        gaps.push({ year, make, model, variant });
      }
    }
  }
}

const byMakeModel = new Map<string, number>();
for (const gap of gaps) {
  const key = `${gap.make} :: ${gap.model}`;
  byMakeModel.set(key, (byMakeModel.get(key) ?? 0) + 1);
}
const summary = [...byMakeModel.entries()]
  .map(([makeModel, count]) => ({ makeModel, count }))
  .sort((left, right) => right.count - left.count);

console.log(
  JSON.stringify(
    {
      totalSelections,
      resolvedSelections,
      expectedUnresolved,
      genuineGaps: gaps.length,
      affectedMakeModelFamilies: summary.length,
      topAffectedFamilies: summary.slice(0, 40)
    },
    null,
    2
  )
);

const outArgIndex = process.argv.findIndex((arg) => arg.startsWith("--out="));
if (outArgIndex >= 0) {
  const outPath = process.argv[outArgIndex].slice("--out=".length);
  writeFileSync(outPath, JSON.stringify(gaps, null, 2));
  console.log(`\nFull gap list (${gaps.length} entries) written to ${outPath}`);
}
