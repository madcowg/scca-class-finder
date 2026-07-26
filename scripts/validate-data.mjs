import { readFile } from "node:fs/promises";

const knownClasses = new Set([
  "ss", "as", "bs", "cs", "ds", "es", "fs", "gs", "hs", "ssr",
  "sst", "ast", "bst", "cst", "dst", "est", "gst", "sts", "str", "stu", "stx", "sth", "stf", "stp",
  "ssp", "asp", "bsp", "csp", "dsp", "esp", "fsp",
  "ssm", "sm", "smf",
  "xp", "bp", "cp", "dp", "ep", "fp",
  "am", "bm", "cm", "dm", "em", "fm", "km",
  "ja", "jb", "jc", "ssc", "csm", "csx", "fsae", "evx", "hcr", "hcs",
  "camc", "camt", "cams", "xs", "xa", "xb", "xu"
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

const appendixPath = new URL("../src/data/appendix-a-2026.json", import.meta.url);
const appendix = JSON.parse(await readFile(appendixPath, "utf8"));
const expectedAppendixClasses = {
  ss: 40, as: 40, bs: 60, cs: 40, ds: 50, es: 20, fs: 80, gs: 50, hs: 250,
  sst: 40, ast: 5, bst: 50, cst: 20, dst: 35, est: 70, gst: 40,
  ssp: 70, csp: 35, dsp: 55, esp: 190, fsp: 190
};
const appendixCounts = new Map();
const appendixKeys = new Set();

if (
  appendix.rulesYear !== 2026 ||
  appendix.sourceUrl !== "https://www.scca.com/downloads/78494/download" ||
  !Array.isArray(appendix.listings)
) {
  throw new Error("Official 2026 Appendix A dataset metadata is invalid");
}

for (const listing of appendix.listings) {
  const label = `${listing.classId} ${listing.manufacturer} ${listing.description}`;
  validateClassIds([listing.classId], label);
  if (
    !["street", "streetTouring", "streetPrepared"].includes(listing.category) ||
    !listing.manufacturer ||
    !listing.description ||
    !Number.isInteger(listing.page) ||
    listing.page < 194 ||
    listing.page > 230 ||
    listing.ruleSection !== `Appendix A - ${listing.classId.toUpperCase()}` ||
    listing.sourceUrl !== `${appendix.sourceUrl}#page=${listing.page}`
  ) {
    throw new Error(`Invalid official Appendix A listing: ${label}`);
  }
  if (
    (listing.description.match(/\(/g) ?? []).length !==
    (listing.description.match(/\)/g) ?? []).length
  ) {
    throw new Error(`Unbalanced official Appendix A listing: ${label}`);
  }
  for (const range of listing.yearRanges) {
    if (
      !Array.isArray(range) ||
      range.length !== 2 ||
      !range.every(Number.isInteger) ||
      range[0] < 1900 ||
      range[0] > range[1] ||
      range[1] > 2026
    ) {
      throw new Error(`Invalid Appendix A year range: ${label}`);
    }
  }

  const key = `${listing.classId}\u0000${listing.manufacturer}\u0000${listing.description}`;
  if (appendixKeys.has(key)) throw new Error(`Duplicate Appendix A listing: ${label}`);
  appendixKeys.add(key);
  appendixCounts.set(listing.classId, (appendixCounts.get(listing.classId) ?? 0) + 1);
}

for (const [classId, minimum] of Object.entries(expectedAppendixClasses)) {
  if ((appendixCounts.get(classId) ?? 0) < minimum) {
    throw new Error(`Official Appendix A ${classId.toUpperCase()} coverage is incomplete`);
  }
}

const appendixLandmarks = [
  ["ss", "Chevrolet", "Corvette Stingray (C8) (2020-26)"],
  ["ss", "Dodge & SRT", "Viper (ACR and TA all)"],
  ["as", "Tesla", "Model Y (AWD/Performance 20-24)"],
  ["cs", "Mazda", "MX-5 Miata (ND1/ND2 chassis; including RF) (2016-25)"],
  ["ds", "Ford", "Mustang EcoBoost (2015-26)"],
  ["ds", "Subaru", "BRZ (2022-26) including tS"],
  ["fs", "Ford", "Mustang GT (incl. Performance Package Level 1 and Level 2) (2010-26)"],
  ["ast", "Honda", "S2000-CR"],
  ["csp", "Mazda", "Mx-5 Miata (ND chassis, all) (2016-25)"]
];
for (const [classId, manufacturer, description] of appendixLandmarks) {
  if (
    !appendix.listings.some(
      (listing) =>
        listing.classId === classId &&
        listing.manufacturer === manufacturer &&
        listing.description === description
    )
  ) {
    throw new Error(`Official Appendix A landmark is missing: ${classId} ${manufacturer} ${description}`);
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

const nationalsPath = new URL("../src/data/nationals-winners-2021-2025.json", import.meta.url);
const nationals = JSON.parse(await readFile(nationalsPath, "utf8"));
const expectedNationalsYears = [2021, 2022, 2023, 2024, 2025];
const knownTireManufacturers = new Set([
  "Avon", "BFGoodrich", "Bridgestone", "Continental", "Dunlop", "Falken",
  "Goodyear", "Hoosier", "Kumho", "Michelin", "Multi", "Nankang", "Nexen",
  "Other", "Pirelli", "Toyo", "Vitour", "Yokohama"
]);
const nationalsKeys = new Set();

if (
  JSON.stringify(nationals.eventYears) !== JSON.stringify(expectedNationalsYears) ||
  "cancelledYears" in nationals ||
  nationals.sourceArchive !== "https://www.scca.com/pages/solo-archives" ||
  !nationals.policy?.includes("tire size and model are not present") ||
  !Array.isArray(nationals.records) ||
  nationals.records.length < 345
) {
  throw new Error("Five-year Solo Nationals winner dataset metadata or coverage is incomplete");
}

for (const record of nationals.records) {
  const label = `${record.eventYear} ${record.classId} ${record.division}`;
  validateClassIds([record.classId], label);
  if (
    !expectedNationalsYears.includes(record.eventYear) ||
    !["open", "ladies"].includes(record.division) ||
    record.finish !== 1 ||
    !record.vehicle ||
    !record.sourceUrl
  ) {
    throw new Error(`Invalid Solo Nationals winner record: ${label}`);
  }
  if (
    record.tireManufacturer !== null &&
    !knownTireManufacturers.has(record.tireManufacturer)
  ) {
    throw new Error(`Unknown Solo Nationals tire manufacturer: ${label} ${record.tireManufacturer}`);
  }
  const key = `${record.eventYear}\u0000${record.classId}\u0000${record.division}`;
  if (nationalsKeys.has(key)) throw new Error(`Duplicate Solo Nationals class winner: ${label}`);
  nationalsKeys.add(key);
}

const nationalsLandmarks = [
  [2021, "cs", "Mazda"],
  [2022, "ss", "Porsche"],
  [2024, "cs", "Mazda"],
  [2025, "xb", "Mazda"]
];
for (const [eventYear, classId, vehicleText] of nationalsLandmarks) {
  if (
    !nationals.records.some(
      (record) =>
        record.eventYear === eventYear &&
        record.classId === classId &&
        record.vehicle.includes(vehicleText)
    )
  ) {
    throw new Error(`Solo Nationals landmark is missing: ${eventYear} ${classId} ${vehicleText}`);
  }
}

const productionPath = new URL("../src/data/vehicles.production.json", import.meta.url);
const production = JSON.parse(await readFile(productionPath, "utf8"));
const eligibilityPath = new URL("../src/data/vehicles.eligibility.json", import.meta.url);
const eligibility = JSON.parse(await readFile(eligibilityPath, "utf8"));
let productionMakes = 0;
let productionModels = 0;
let productionVariants = 0;

for (let year = 1990; year <= 2026; year += 1) {
  const makeData = production[String(year)];
  if (!makeData || typeof makeData !== "object") {
    throw new Error(`Production catalog is missing model year ${year}`);
  }
  const makes = Object.keys(makeData);
  if (makes.length < 20) {
    throw new Error(`Production catalog has suspiciously low ${year} make coverage: ${makes.length}`);
  }
  productionMakes += makes.length;

  for (const [make, models] of Object.entries(makeData)) {
    if (!make || !models || typeof models !== "object") {
      throw new Error(`Invalid production make for ${year}: ${make}`);
    }
    for (const [model, variants] of Object.entries(models)) {
      productionModels += 1;
      if (!model || !Array.isArray(variants) || variants.length === 0) {
        throw new Error(`Invalid production model: ${year} ${make} ${model}`);
      }
      if (new Set(variants).size !== variants.length) {
        throw new Error(`Duplicate production variant: ${year} ${make} ${model}`);
      }
      productionVariants += variants.length;
    }
  }
}

const currentMustang = production["2026"]?.Ford?.Mustang ?? [];
if (
  !currentMustang.includes("Mustang EcoBoost (2.3L turbo)") ||
  !currentMustang.includes("Mustang GT (5.0L V8)")
) {
  throw new Error("Production catalog lost the 2026 Mustang engine/package discriminator");
}

const requiredExclusions = [
  ["2026", "Ford", "Bronco"],
  ["2026", "Ford", "F-150"],
  ["2015", "Nissan", "Juke"],
  ["2015", "Subaru", "Forester"],
  ["2005", "Scion", "xB"]
];
for (const [year, make, model] of requiredExclusions) {
  if (production[year]?.[make]?.[model]) {
    throw new Error(`Stability-ineligible model leaked into production catalog: ${year} ${make} ${model}`);
  }
}

const requiredRetentions = [
  ["2026", "Ford", "Mustang"],
  ["2026", "Ford", "Mustang Mach-E"],
  ["2024", "Tesla", "Model Y"],
  ["2023", "Volkswagen", "ID.4"]
];
for (const [year, make, model] of requiredRetentions) {
  if (!production[year]?.[make]?.[model]) {
    throw new Error(`Eligible regression model is missing: ${year} ${make} ${model}`);
  }
}

if (
  eligibility.ruleSection !== "SCCA Solo Rules 3.1" ||
  !Array.isArray(eligibility.decisions) ||
  eligibility.decisions.length < 500
) {
  throw new Error("Vehicle eligibility audit is missing or incomplete");
}

console.log(`Validated reviewed catalog: ${new Set(reviewed.map((entry) => entry.make)).size} makes, ${reviewedFamilies.size} model families, ${reviewed.length} exact year variants.`);
console.log(`Validated official 2026 Appendix A: ${appendix.listings.length} Street, Street Touring, and Street Prepared listings across ${appendixCounts.size} classes.`);
console.log(`Validated legacy source archive: ${legacyMakes} makes, ${legacyModels} model descriptions, ${legacyPlacements} year placements.`);
console.log(`Validated five-year Solo Nationals winners: ${nationals.records.length} class winners across ${nationals.eventYears.length} held events.`);
console.log(`Validated eligibility-filtered EPA hierarchy: ${productionMakes} year/make groups, ${productionModels} model families, ${productionVariants} year-specific variants.`);
console.log(`Validated SCCA 3.1 eligibility audit: ${eligibility.decisions.length} model families reviewed.`);
