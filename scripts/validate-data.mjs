import { readFile } from "node:fs/promises";

const knownClasses = new Set([
  "ss", "as", "bs", "cs", "ds", "es", "fs", "gs", "hs", "ssr",
  "sst", "ast", "bst", "cst", "dst", "est", "gst",
  "ssp", "csp", "dsp", "esp", "fsp",
  "ssm", "sm", "smf",
  "xp", "cp", "dp", "ep", "fp",
  "am", "bm", "cm", "dm", "em", "fm",
  "ssc", "csm", "csx", "evx", "camc", "camt", "cams", "xa", "xb", "xu"
]);

function validateClassIds(classes, label) {
  if (!Array.isArray(classes) || classes.length === 0) {
    throw new Error(`No classes: ${label}`);
  }
  for (const classId of classes) {
    if (!knownClasses.has(String(classId).toLowerCase())) {
      throw new Error(`Unknown class ID: ${label} ${classId}`);
    }
  }
}

const reviewedPath = new URL("../src/data/reviewed-vehicles2026.json", import.meta.url);
const reviewed = JSON.parse(await readFile(reviewedPath, "utf8"));
const reviewedKeys = new Set();
const reviewedFamilies = new Set();

for (const entry of reviewed) {
  const label = `${entry.make} ${entry.model} ${entry.variant ?? ""} ${entry.year}`.trim();
  if (!entry.make || !entry.model || !/^\d{4}$/.test(entry.year)) {
    throw new Error(`Invalid reviewed vehicle identity: ${label}`);
  }
  if (entry.model.includes("(") || entry.model.includes("/")) {
    throw new Error(`Model family contains trim/package detail: ${label}`);
  }
  if (!entry.variant) {
    throw new Error(`Reviewed vehicle is missing a variant/package field: ${label}`);
  }
  if (entry.source !== "street-only" && entry.source !== "verified-classes") {
    throw new Error(`Invalid reviewed source: ${label}`);
  }
  const key = `${entry.make}\u0000${entry.model}\u0000${entry.variant}\u0000${entry.year}`;
  if (reviewedKeys.has(key)) throw new Error(`Duplicate reviewed vehicle: ${label}`);
  reviewedKeys.add(key);
  reviewedFamilies.add(`${entry.make}\u0000${entry.model}`);
  validateClassIds(entry.classes, label);
}

const legacyPath = new URL("../src/data/vehicles.generated.json", import.meta.url);
const legacy = JSON.parse(await readFile(legacyPath, "utf8"));
let legacyMakes = 0;
let legacyModels = 0;
let legacyPlacements = 0;
const unknownLegacyClasses = new Set();

for (const [make, makeData] of Object.entries(legacy)) {
  legacyMakes += 1;
  if (!make || typeof makeData !== "object") throw new Error(`Invalid legacy make: ${make}`);
  for (const [model, modelData] of Object.entries(makeData)) {
    legacyModels += 1;
    if (!model || typeof modelData !== "object") throw new Error(`Invalid legacy model: ${make} ${model}`);
    for (const [year, classes] of Object.entries(modelData)) {
      legacyPlacements += 1;
      if (!/^\d{4}$/.test(year) && year !== "all" && !/^(?:\d{4}-any|any-\d{4})$/.test(year)) {
        throw new Error(`Invalid legacy year key: ${make} ${model} ${year}`);
      }
      validateClassIds(classes, `${make} ${model} ${year}`);
      for (const classId of classes) {
        if (!knownClasses.has(String(classId).toLowerCase())) unknownLegacyClasses.add(classId);
      }
    }
  }
}

if (unknownLegacyClasses.size) {
  throw new Error(`Unknown legacy class IDs: ${[...unknownLegacyClasses].sort().join(", ")}`);
}

console.log(`Validated reviewed catalog: ${new Set(reviewed.map((entry) => entry.make)).size} makes, ${reviewedFamilies.size} model families, ${reviewed.length} exact year variants.`);
console.log(`Validated legacy source archive: ${legacyMakes} makes, ${legacyModels} model descriptions, ${legacyPlacements} year placements.`);
