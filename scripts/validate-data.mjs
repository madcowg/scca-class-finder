import { readFile } from "node:fs/promises";

const path = new URL("../src/data/vehicles.generated.json", import.meta.url);
const data = JSON.parse(await readFile(path, "utf8"));
const knownClasses = new Set([
  "ss", "as", "bs", "cs", "ds", "es", "fs", "gs", "hs", "ssr",
  "sst", "ast", "bst", "cst", "dst", "est", "gst",
  "ssp", "csp", "dsp", "esp", "fsp",
  "ssm", "sm", "smf",
  "xp", "cp", "dp", "ep", "fp",
  "am", "bm", "cm", "dm", "em", "fm",
  "ssc", "csm", "csx", "evx", "camc", "camt", "cams", "xa", "xb", "xu"
]);

let makes = 0;
let models = 0;
let placements = 0;
const unknown = new Set();

for (const [make, makeData] of Object.entries(data)) {
  makes += 1;
  if (!make || typeof makeData !== "object") throw new Error(`Invalid make: ${make}`);
  for (const [model, modelData] of Object.entries(makeData)) {
    models += 1;
    if (!model || typeof modelData !== "object") throw new Error(`Invalid model: ${make} ${model}`);
    for (const [year, classes] of Object.entries(modelData)) {
      placements += 1;
      if (!/^\d{4}$/.test(year) && year !== "all" && !/^(?:\d{4}-any|any-\d{4})$/.test(year)) {
        throw new Error(`Invalid year key: ${make} ${model} ${year}`);
      }
      if (!Array.isArray(classes) || classes.length === 0) {
        throw new Error(`No classes: ${make} ${model} ${year}`);
      }
      for (const classId of classes) {
        if (!knownClasses.has(String(classId).toLowerCase())) unknown.add(classId);
      }
    }
  }
}

if (unknown.size) {
  throw new Error(`Unknown class IDs: ${[...unknown].sort().join(", ")}`);
}

console.log(`Validated ${makes} makes, ${models} model descriptions, ${placements} year placements.`);
