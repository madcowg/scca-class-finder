import { createReadStream, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";

const SOURCE_URL = "https://www.fueleconomy.gov/feg/epadata/vehicles.csv";
const MIN_YEAR = 1990;
const MAX_YEAR = 2026;
const output = new URL("../src/data/vehicles.production.json", import.meta.url);

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
  return value.replace(/\s+/g, " ").trim();
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
  if (year === 2026 && make === "Ford" && base === "Mustang" && variant === "Mustang") {
    if (cylinders === "4" && displacement === "2.3") return "Mustang EcoBoost (2.3L turbo)";
    if (cylinders === "8" && displacement === "5.0") return "Mustang GT (5.0L V8)";
  }

  return variant || family;
}

async function sourceStream() {
  const sourcePath = process.argv[2];
  if (sourcePath) return createReadStream(sourcePath);

  const response = await fetch(SOURCE_URL);
  if (!response.ok || !response.body) {
    throw new Error(`EPA vehicle download failed: ${response.status}`);
  }
  return Readable.fromWeb(response.body);
}

const lines = createInterface({
  input: await sourceStream(),
  crlfDelay: Infinity
});

let columns;
const catalog = new Map();

for await (const line of lines) {
  if (!columns) {
    columns = new Map(parseCsvLine(line).map((name, index) => [name, index]));
    continue;
  }

  const values = parseCsvLine(line);
  const year = Number(values[columns.get("year")]);
  if (year < MIN_YEAR || year > MAX_YEAR) continue;

  const make = clean(values[columns.get("make")] ?? "");
  const model = clean(values[columns.get("model")] ?? "");
  const baseModel = clean(values[columns.get("baseModel")] ?? "");
  const cylinders = clean(values[columns.get("cylinders")] ?? "");
  const displacement = clean(values[columns.get("displ")] ?? "");
  if (!make || !model) continue;

  const family = canonicalFamily(make, baseModel, model);
  const variant = canonicalVariant(
    make,
    baseModel,
    model,
    family,
    year,
    cylinders,
    displacement
  );
  const makes = catalog.get(String(year)) ?? new Map();
  const models = makes.get(make) ?? new Map();
  const variants = models.get(family) ?? new Set();
  variants.add(variant);
  models.set(family, variants);
  makes.set(make, models);
  catalog.set(String(year), makes);
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

writeFileSync(output, `${JSON.stringify(serialized, null, 2)}\n`, "utf8");
console.log(`Updated ${output.pathname} from ${process.argv[2] || SOURCE_URL}`);
