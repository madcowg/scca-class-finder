import {
  createReadStream,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";

const EPA_SOURCE_URL = "https://www.fueleconomy.gov/feg/epadata/vehicles.csv";
const CVS_SOURCE_URL =
  "https://vpic.nhtsa.dot.gov/api/vehicles/GetCanadianVehicleSpecifications/";
const CVS_BULK_METADATA_URL =
  "https://open.canada.ca/data/api/action/package_show?id=913f8940-036a-45f2-a5f2-19bde76c1252";
const MIN_YEAR = 1990;
const MAX_YEAR = 2026;
const REQUEST_CONCURRENCY = 2;
const OFFLINE = process.argv.includes("--offline");
const sourcePath = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const catalogOutput = new URL("../src/data/vehicles.production.json", import.meta.url);
const auditOutput = new URL("../src/data/vehicles.eligibility.json", import.meta.url);
const cacheDirectory = new URL("../tmp/cvs-cache/", import.meta.url);

const HIGH_ROLLOVER_RISK_CLASS =
  /(?:sport utility|pickup|truck|van|minivan|special purpose)/i;

const CURRENT_SCCA_ELIGIBILITY_LISTINGS = [
  { make: "Audi", pattern: /^e-tron\b/i, start: 2019, end: 2024 },
  { make: "Audi", pattern: /^Q4 e-tron\b/i, start: 2022, end: 2024 },
  { make: "Audi", pattern: /^SQ8 e-tron\b/i, start: 2024, end: 2024 },
  { make: "BMW", pattern: /^i3\b/i, start: 2014, end: 2021, publishedSsf: true },
  { make: "Cadillac", pattern: /^LYRIQ\b/i, start: 2023, end: 2024 },
  {
    make: "Chevrolet",
    pattern: /^Bolt(?:\s+EUV)?\b/i,
    start: 2017,
    end: 2023,
    publishedSsf: true
  },
  { make: "Chevrolet", pattern: /^Blazer EV\b/i, start: 2024, end: 2024 },
  { make: "Fisker", pattern: /^Ocean\b/i, start: 2023, end: 2024 },
  {
    make: "Ford",
    pattern: /^Mustang Mach-E\b/i,
    start: 2021,
    end: 2026,
    excludedVariant: /\bRally\b/i
  },
  { make: "Genesis", pattern: /^Electrified GV70\b/i, start: 2023, end: 2024 },
  { make: "Genesis", pattern: /^GV60\b/i, start: 2023, end: 2024 },
  { make: "Hyundai", pattern: /^Ioniq 5\b/i, start: 2022, end: 2024 },
  {
    make: "Hyundai",
    pattern: /^Ioniq 5\b/i,
    start: 2025,
    end: 2025,
    requiredVariant: /\bN\b/i
  },
  { make: "Hyundai", pattern: /^Kona\b/i, start: 2019, end: 2024, requiredVariant: /\bElectric\b/i },
  { make: "Jaguar", pattern: /^I-Pace\b/i, start: 2019, end: 2020 },
  { make: "Jaguar", pattern: /^I-Pace\b/i, start: 2022, end: 2024 },
  { make: "Kia", pattern: /^EV6\b/i, start: 2022, end: 2024 },
  { make: "Kia", pattern: /^Niro\b/i, start: 2019, end: 2024, requiredVariant: /\bElectric\b/i },
  { make: "Nissan", pattern: /^Ariya\b/i, start: 2023, end: 2024 },
  {
    make: "Porsche",
    pattern: /^Macan\b/i,
    start: 2024,
    end: 2024,
    requiredVariant: /\bElectric\b/i
  },
  {
    make: "Subaru",
    pattern: /^Solterra\b/i,
    start: 2023,
    end: 2024,
    publishedSsf: true
  },
  { make: "Tesla", pattern: /^Model X\b/i, start: 2016, end: 2024 },
  { make: "Tesla", pattern: /^Model Y\b/i, start: 2020, end: 2024 },
  {
    make: "Toyota",
    pattern: /^bZ4X\b/i,
    start: 2023,
    end: 2024,
    publishedSsf: true
  },
  {
    make: "Volkswagen",
    pattern: /^ID\.?4\b/i,
    start: 2021,
    end: 2024,
    publishedSsf: true
  },
  { make: "Volvo", pattern: /^C40 Recharge\b/i, start: 2022, end: 2024 }
];

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function compact(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function canonicalFamily(make, baseModel, model) {
  const base = clean(baseModel || model);
  const fullModel = clean(model);

  if (make === "Mazda") {
    if (base === "2") return "Mazda2";
    if (base === "3") return "Mazda3";
    if (base === "6") return "Mazda6";
    if (base === "MX-5") return "MX-5 Miata";
  }
  if (make === "Toyota" && /^GR Corolla\b/i.test(fullModel)) return "GR Corolla";
  if (make === "Toyota" && base === "GR 86") return "GR86";
  if (make === "BMW" && base === "M") {
    return fullModel.match(/^M\d+/)?.[0] ?? base;
  }
  if (make === "Aston Martin") {
    if (/^DB12\b/i.test(base)) return "DB12";
    if (/^DBX\b/i.test(base)) return "DBX";
    if (/^(?:V8|V12)\s+Vantage\b/i.test(base)) return "Vantage";
  }
  if (make === "Bentley" && /^Continental GT\b/i.test(base)) return "Continental GT";
  if (make === "Ford" && base === "F150") return "F-150";
  if (make === "Volkswagen" && base === "Golf/GTI") return "Golf";

  return base;
}

function canonicalVariant(make, baseModel, model, family, year, cylinders, displacement) {
  const base = clean(baseModel || model);
  let variant = clean(model);

  if (make === "Mazda" && ["2", "3", "6"].includes(base)) {
    variant = variant.replace(new RegExp(`^${base}\\b`), `Mazda${base}`);
  }
  if (make === "Mazda" && base === "MX-5") {
    variant = variant.replace(/^MX-5\b/, "MX-5 Miata");
  }
  if (make === "Ford" && base === "F150") {
    variant = variant.replace(/^F150\b/, "F-150");
  }
  if (make === "Toyota" && base === "GR 86") {
    variant = variant.replace(/^GR 86\b/, "GR86");
  }
  if (year >= 2024 && make === "Ford" && base === "Mustang" && variant === "Mustang") {
    if (cylinders === "4" && displacement === "2.3") return "Mustang EcoBoost (2.3L turbo)";
    if (cylinders === "8" && displacement === "5.0") return "Mustang GT (5.0L V8)";
  }

  return variant || family;
}

function explicitStabilityExclusion({ year, make, family, variant }) {
  const identity = `${family} ${variant}`;

  if (make === "Dodge" && /^Caliber\b/i.test(family) && !/\bSRT-?4?\b/i.test(identity)) {
    return "Appendix A excludes Dodge Caliber models other than SRT variants.";
  }
  if (
    make === "Fiat" &&
    year >= 2012 &&
    year <= 2019 &&
    /^500\b/i.test(family) &&
    !/\bAbarth\b/i.test(identity)
  ) {
    return "Appendix A excludes 2012-2019 Fiat 500 models other than Abarth variants.";
  }
  if (
    make === "Ford" &&
    year >= 2011 &&
    year <= 2019 &&
    /^Fiesta\b/i.test(family) &&
    !/\bST\b/i.test(identity)
  ) {
    return "Appendix A excludes 2011-2019 Ford Fiesta models other than ST variants.";
  }
  if (make === "Geo" && /^Tracker\b/i.test(family)) {
    return "Appendix A explicitly excludes the Geo Tracker for stability.";
  }
  if (make === "Jeep" && /^CJ(?:\b|-|\d)/i.test(family)) {
    return "Appendix A explicitly excludes the Jeep CJ series for stability.";
  }
  if (
    make === "MINI" &&
    /^Countryman\b/i.test(family) &&
    !/\b(?:JCW|John Cooper Works)\b/i.test(identity)
  ) {
    return "Appendix A excludes MINI Countryman models not otherwise classified.";
  }
  if (make === "Nissan" && /^Juke\b/i.test(family)) {
    return "Appendix A explicitly excludes the Nissan Juke for stability.";
  }
  if (make === "Scion" && /^iQ\b/i.test(family)) {
    return "Appendix A explicitly excludes the Scion iQ for stability.";
  }
  if (make === "Scion" && year >= 2004 && year <= 2006 && /^xB\b/i.test(family)) {
    return "Appendix A explicitly excludes the 2004-2006 Scion xB for stability.";
  }
  if (make === "Subaru" && /^Forester\b/i.test(family)) {
    return "Appendix A explicitly excludes the Subaru Forester for stability.";
  }
  if (make === "Suzuki" && /^(?:Samurai|Sidekick)\b/i.test(family)) {
    return `Appendix A explicitly excludes the Suzuki ${family} for stability.`;
  }
  return null;
}

function currentSccaEligibilityListing(row) {
  return CURRENT_SCCA_ELIGIBILITY_LISTINGS.find(
    (entry) =>
      entry.make === row.make &&
      entry.pattern.test(row.family) &&
      row.year >= entry.start &&
      row.year <= entry.end &&
      (!entry.requiredVariant || entry.requiredVariant.test(row.variant)) &&
      (!entry.excludedVariant || !entry.excludedVariant.test(row.variant))
  );
}

async function sourceStream() {
  if (sourcePath) return createReadStream(sourcePath);

  const response = await fetch(EPA_SOURCE_URL);
  if (!response.ok || !response.body) {
    throw new Error(`EPA vehicle download failed: ${response.status}`);
  }
  return Readable.fromWeb(response.body);
}

async function readEpaRows() {
  const lines = createInterface({
    input: await sourceStream(),
    crlfDelay: Infinity
  });
  let columns;
  const rows = [];

  for await (const line of lines) {
    if (!columns) {
      columns = new Map(parseCsvLine(line).map((name, index) => [name, index]));
      continue;
    }

    const values = parseCsvLine(line);
    const year = Number(values[columns.get("year")]);
    if (year < MIN_YEAR || year > MAX_YEAR) continue;

    const make = clean(values[columns.get("make")]);
    const model = clean(values[columns.get("model")]);
    const baseModel = clean(values[columns.get("baseModel")]);
    const cylinders = clean(values[columns.get("cylinders")]);
    const displacement = clean(values[columns.get("displ")]);
    const vehicleClass = clean(values[columns.get("VClass")]);
    if (!make || !model) continue;

    const family = canonicalFamily(make, baseModel, model);
    rows.push({
      year,
      make,
      family,
      variant: canonicalVariant(
        make,
        baseModel,
        model,
        family,
        year,
        cylinders,
        displacement
      ),
      vehicleClass,
      highRisk: HIGH_ROLLOVER_RISK_CLASS.test(vehicleClass)
    });
  }

  return rows;
}

function cacheFile(year, make) {
  const safeMake = make.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new URL(`api-v2-${year}-${safeMake}.json`, cacheDirectory);
}

async function fetchWithRetry(url, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "madcowg-scca-class-finder/2.0 (vehicle eligibility audit)"
        }
      });
      if (response.ok) return response.json();
      // CVS rejects some older make/year combinations instead of returning an empty result.
      // An empty match is safe here because the importer omits unresolved high-risk vehicles.
      if (response.status === 403) return null;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
  throw new Error(`NHTSA CVS request failed for ${url}: ${lastError?.message ?? "unknown error"}`);
}

let bulkMetadataPromise;
const bulkYearPromises = new Map();

async function bulkResourceUrls() {
  bulkMetadataPromise ??= fetchWithRetry(CVS_BULK_METADATA_URL).then((response) => {
    if (!response?.result?.resources) {
      throw new Error("Transport Canada CVS metadata did not contain resources");
    }
    return new Map(
      response.result.resources
        .filter((resource) => /20\d{2}_en\.csv$/i.test(resource.url ?? ""))
        .map((resource) => [
          Number(resource.url.match(/(20\d{2})_en\.csv$/i)[1]),
          resource.url
        ])
    );
  });
  return bulkMetadataPromise;
}

async function loadBulkYear(year) {
  if (bulkYearPromises.has(year)) return bulkYearPromises.get(year);

  const promise = (async () => {
    mkdirSync(cacheDirectory, { recursive: true });
    const cache = new URL(`bulk-${year}.csv`, cacheDirectory);
    let csv;
    try {
      csv = readFileSync(cache, "utf8");
    } catch {
      const resourceUrl = (await bulkResourceUrls()).get(year);
      if (!resourceUrl) throw new Error(`No official Transport Canada CVS resource for ${year}`);
      const response = await fetch(resourceUrl, {
        headers: {
          Accept: "text/csv",
          "User-Agent": "madcowg-scca-class-finder/2.0 (vehicle eligibility audit)"
        }
      });
      if (!response.ok) {
        throw new Error(`Transport Canada CVS ${year} download failed: ${response.status}`);
      }
      csv = await response.text();
      writeFileSync(cache, csv, "utf8");
    }

    const lines = csv.split(/\r?\n/).filter(Boolean);
    const columns = new Map(parseCsvLine(lines.shift()).map((name, index) => [clean(name), index]));
    const byMake = new Map();
    for (const line of lines) {
      const values = parseCsvLine(line);
      const make = clean(values[columns.get("MAKE")]);
      const model = clean(values[columns.get("MODEL")]);
      const height = Number(values[columns.get("OH")]);
      const frontTrack = Number(values[columns.get("TWF")]);
      const rearTrack = Number(values[columns.get("TWR")]);
      if (
        !make ||
        !model ||
        ![height, frontTrack, rearTrack].every((value) => Number.isFinite(value) && value > 0)
      ) {
        continue;
      }
      const specifications = byMake.get(compact(make)) ?? [];
      const heightInches = height / 2.54;
      const frontTrackInches = frontTrack / 2.54;
      const rearTrackInches = rearTrack / 2.54;
      specifications.push({
        model,
        height: heightInches,
        frontTrack: frontTrackInches,
        rearTrack: rearTrackInches,
        averageTrack: (frontTrackInches + rearTrackInches) / 2
      });
      byMake.set(compact(make), specifications);
    }
    return byMake;
  })();

  bulkYearPromises.set(year, promise);
  return promise;
}

async function fetchCanadianSpecifications(year, make) {
  if (year >= 2011 && year <= 2023) {
    return (await loadBulkYear(year)).get(compact(make)) ?? [];
  }

  mkdirSync(cacheDirectory, { recursive: true });
  const cache = cacheFile(year, make);
  try {
    return JSON.parse(readFileSync(cache, "utf8"))
      .map(parseSpecification)
      .filter(Boolean);
  } catch {
    // A missing cache is expected on a fresh catalog refresh.
  }
  if (OFFLINE) return [];

  const query = new URL(CVS_SOURCE_URL);
  query.searchParams.set("year", String(year));
  query.searchParams.set("make", make);
  query.searchParams.set("units", "US");
  query.searchParams.set("format", "json");
  const response = await fetchWithRetry(query);
  if (!response) return [];
  await new Promise((resolve) => setTimeout(resolve, 400));
  writeFileSync(cache, `${JSON.stringify(response.Results ?? [])}\n`, "utf8");
  return (response.Results ?? []).map(parseSpecification).filter(Boolean);
}

function parseSpecification(result) {
  const fields = new Map(
    (result.Specs ?? []).map((specification) => [
      clean(specification.Name),
      clean(specification.Value)
    ])
  );
  const height = Number(fields.get("OH"));
  const frontTrack = Number(fields.get("TWF"));
  const rearTrack = Number(fields.get("TWR"));
  if (![height, frontTrack, rearTrack].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }
  return {
    model: fields.get("Model") ?? "",
    height,
    frontTrack,
    rearTrack,
    averageTrack: (frontTrack + rearTrack) / 2
  };
}

function assignSpecificationsToFamilies(make, families, results) {
  const assigned = new Map(families.map((family) => [family, []]));
  const normalizedMake = compact(make);

  for (const specification of results) {
    let normalizedModel = compact(specification.model);
    if (normalizedModel.startsWith(normalizedMake)) {
      normalizedModel = normalizedModel.slice(normalizedMake.length);
    }

    const matchingFamily = families
      .filter((family) => normalizedModel.startsWith(compact(family)))
      .sort((left, right) => compact(right).length - compact(left).length)[0];
    if (matchingFamily) assigned.get(matchingFamily).push(specification);
  }

  return assigned;
}

function measurementSummary(specifications) {
  const heights = specifications.map((item) => item.height);
  const tracks = specifications.map((item) => item.averageTrack);
  const margins = specifications.map((item) => item.averageTrack - item.height);
  return {
    matchedConfigurations: specifications.length,
    minimumHeightInches: Number(Math.min(...heights).toFixed(3)),
    maximumHeightInches: Number(Math.max(...heights).toFixed(3)),
    minimumAverageTrackInches: Number(Math.min(...tracks).toFixed(3)),
    maximumAverageTrackInches: Number(Math.max(...tracks).toFixed(3)),
    minimumTrackToHeightMarginInches: Number(Math.min(...margins).toFixed(3))
  };
}

async function mapWithConcurrency(items, worker, concurrency) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
  );
  return results;
}

function groupRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.year}\u0000${row.make}\u0000${row.family}`;
    const group = groups.get(key) ?? {
      year: row.year,
      make: row.make,
      family: row.family,
      rows: [],
      rowKeys: new Set()
    };
    const rowKey = `${row.variant}\u0000${row.vehicleClass}\u0000${row.highRisk}`;
    if (!group.rowKeys.has(rowKey)) {
      group.rows.push(row);
      group.rowKeys.add(rowKey);
    }
    groups.set(key, group);
  }
  return groups;
}

const rows = await readEpaRows();
const groups = groupRows(rows);
const queryGroups = new Map();

for (const group of groups.values()) {
  if (!group.rows.some((row) => row.highRisk)) continue;
  if (group.rows.filter((row) => row.highRisk).every(currentSccaEligibilityListing)) continue;
  const key = `${group.year}\u0000${group.make}`;
  const queryGroup = queryGroups.get(key) ?? {
    year: group.year,
    make: group.make,
    families: []
  };
  queryGroup.families.push(group.family);
  queryGroups.set(key, queryGroup);
}

console.log(
  `Checking ${queryGroups.size} high-rollover-risk year/make groups against official NHTSA dimensions...`
);
const dimensionalResults = new Map();
await mapWithConcurrency(
  [...queryGroups.entries()],
  async ([key, queryGroup], index) => {
    const results = await fetchCanadianSpecifications(queryGroup.year, queryGroup.make);
    dimensionalResults.set(
      key,
      assignSpecificationsToFamilies(queryGroup.make, queryGroup.families, results)
    );
    if ((index + 1) % 100 === 0) {
      console.log(`Checked ${index + 1}/${queryGroups.size} year/make groups.`);
    }
  },
  REQUEST_CONCURRENCY
);

const catalog = new Map();
const decisions = [];
let includedHighRiskVariants = 0;
let excludedHighRiskVariants = 0;
let explicitlyExcludedVariants = 0;

for (const group of groups.values()) {
  const ordinaryRows = [];
  const highRiskRows = [];
  const officiallyListedRows = [];
  const explicitExclusions = [];

  for (const row of group.rows) {
    const exclusion = explicitStabilityExclusion(row);
    if (exclusion) {
      explicitExclusions.push({ row, reason: exclusion });
    } else if (row.highRisk) {
      const listing = currentSccaEligibilityListing(row);
      if (listing) {
        officiallyListedRows.push({ row, listing });
      } else {
        highRiskRows.push(row);
      }
    } else {
      ordinaryRows.push(row);
    }
  }

  const includedRows = [...ordinaryRows, ...officiallyListedRows.map(({ row }) => row)];
  let highRiskDecision = null;

  includedHighRiskVariants += officiallyListedRows.length;
  if (highRiskRows.length > 0) {
    const key = `${group.year}\u0000${group.make}`;
    const specifications = dimensionalResults.get(key)?.get(group.family) ?? [];
    if (
      specifications.length > 0 &&
      specifications.every((item) => item.averageTrack >= item.height)
    ) {
      includedRows.push(...highRiskRows);
      includedHighRiskVariants += highRiskRows.length;
      highRiskDecision = {
        decision: "included",
        reason:
          "Every matched configuration satisfies the SCCA 1:1 average-track-to-height guideline.",
        measurements: measurementSummary(specifications)
      };
    } else {
      excludedHighRiskVariants += highRiskRows.length;
      highRiskDecision = {
        decision: "excluded",
        reason:
          specifications.length === 0
            ? "No unambiguous official dimensional match was available; omitted for manual review."
            : "At least one matched configuration fails the SCCA 1:1 average-track-to-height guideline.",
        ...(specifications.length > 0
          ? { measurements: measurementSummary(specifications) }
          : {})
      };
    }
  }

  explicitlyExcludedVariants += explicitExclusions.length;
  for (const row of includedRows) {
    const makes = catalog.get(String(row.year)) ?? new Map();
    const models = makes.get(row.make) ?? new Map();
    const variants = models.get(row.family) ?? new Set();
    variants.add(row.variant);
    models.set(row.family, variants);
    makes.set(row.make, models);
    catalog.set(String(row.year), makes);
  }

  if (highRiskDecision || explicitExclusions.length > 0) {
    decisions.push({
      year: group.year,
      make: group.make,
      model: group.family,
      vehicleClasses: [...new Set(group.rows.map((row) => row.vehicleClass))].sort(),
      productionVariants: [...new Set(group.rows.map((row) => row.variant))].sort(),
      ...(highRiskDecision ? { rolloverScreen: highRiskDecision } : {}),
      ...(officiallyListedRows.length > 0
        ? {
            currentSccaListings: officiallyListedRows.map(({ row, listing }) => ({
              variant: row.variant,
              years: `${listing.start}-${listing.end}`,
              reason: listing.publishedSsf
                ? "Current Appendix B listing with published SSF above 1.30."
                : "Specifically listed as eligible in the current SCCA rules."
            }))
          }
        : {}),
      ...(explicitExclusions.length > 0
        ? {
            explicitExclusions: explicitExclusions.map(({ row, reason }) => ({
              variant: row.variant,
              reason
            }))
          }
        : {})
    });
  }
}

const serialized = {};
for (let year = MAX_YEAR; year >= MIN_YEAR; year -= 1) {
  const makes = catalog.get(String(year)) ?? new Map();
  serialized[String(year)] = {};
  for (const make of [...makes.keys()].sort((left, right) => left.localeCompare(right))) {
    serialized[String(year)][make] = {};
    const models = makes.get(make);
    for (const family of [...models.keys()].sort((left, right) => left.localeCompare(right))) {
      serialized[String(year)][make][family] = [...models.get(family)].sort((left, right) =>
        left.localeCompare(right)
      );
    }
  }
}

const audit = {
  ruleVersion: "2026",
  ruleSection: "SCCA Solo Rules 3.1",
  rule:
    "For vehicles not specifically listed in Appendix A, average front/rear track width must be at least overall height. Published SSF exceptions must be at least 1.30.",
  sources: {
    productionIdentity: EPA_SOURCE_URL,
    dimensionsApi: CVS_SOURCE_URL,
    dimensionsBulk: CVS_BULK_METADATA_URL,
    rules: "https://www.scca.com/downloads/78494/download"
  },
  policy:
    "Passenger-car rows are retained unless explicitly excluded. SUV, pickup, truck, van, minivan, and special-purpose rows are retained only when every matched official configuration passes the 1:1 guideline or the exact model year and variant is specifically eligible under the current SCCA rules. Ambiguous dimensional matches are omitted for manual review.",
  summary: {
    includedHighRiskVariants,
    excludedHighRiskVariants,
    explicitlyExcludedVariants,
    auditedModelFamilies: decisions.length
  },
  decisions: decisions.sort(
    (left, right) =>
      right.year - left.year ||
      left.make.localeCompare(right.make) ||
      left.model.localeCompare(right.model)
  )
};

writeFileSync(catalogOutput, `${JSON.stringify(serialized, null, 2)}\n`, "utf8");
writeFileSync(auditOutput, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(`Updated ${catalogOutput.pathname} from ${sourcePath || EPA_SOURCE_URL}`);
console.log(`Wrote eligibility audit to ${auditOutput.pathname}`);
console.log(
  `High-risk variants: ${includedHighRiskVariants} included, ${excludedHighRiskVariants} excluded; ${explicitlyExcludedVariants} explicitly excluded.`
);
