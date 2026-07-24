/**
 * Refreshes the broad Appendix A mapping from the MIT-licensed
 * Bjorn248/scca_classifier project.
 *
 * Run manually, review the diff, then update THIRD_PARTY_NOTICES.md and tests.
 */
import { writeFile } from "node:fs/promises";

const source = "https://raw.githubusercontent.com/Bjorn248/scca_classifier/main/src/common.js";
const response = await fetch(source);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const text = await response.text();
const marker = "const allSoloCars = ";
const start = text.indexOf(marker);
if (start < 0) throw new Error("allSoloCars marker not found");

const objectStart = text.indexOf("{", start + marker.length);
let depth = 0;
let quote = "";
let escaped = false;
let objectEnd = -1;

for (let index = objectStart; index < text.length; index += 1) {
  const char = text[index];
  if (quote) {
    if (escaped) escaped = false;
    else if (char === "\\") escaped = true;
    else if (char === quote) quote = "";
    continue;
  }
  if (char === "'" || char === '"' || char === "`") {
    quote = char;
    continue;
  }
  if (char === "{") depth += 1;
  if (char === "}") {
    depth -= 1;
    if (depth === 0) {
      objectEnd = index + 1;
      break;
    }
  }
}

if (objectEnd < 0) throw new Error("Could not find the end of allSoloCars");
const literal = text.slice(objectStart, objectEnd);
// The upstream object is generated data with quoted keys and arrays. Evaluating
// it here is isolated to a maintainer script, not the browser application.
const parsed = Function(`"use strict"; return (${literal});`)();
const output = new URL("../src/data/vehicles.generated.json", import.meta.url);
await writeFile(output, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
console.log(`Updated ${output.pathname}`);
