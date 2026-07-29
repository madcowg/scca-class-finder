// Checks whether SCCA has published the next year's National Solo Rules edition.
//
// Background: the rulebook itself (I.1.3 Replacement of the Solo Rules) states each
// edition takes effect January 1, but the actual document is typically finalized and
// posted to scca.com within January (seen as early as Jan 9, as late as Jan 27 across
// the years checked), sometimes followed by a February errata reprint. See
// docs/RULEBOOK_UPDATE_PROCESS.md for the full research behind this schedule.
//
// This script only detects and reports; it never modifies repository data. It is run
// on a schedule by a Windows Task Scheduler entry (see docs/RULEBOOK_UPDATE_PROCESS.md's
// Scheduling section) and appends each check's result to logs/rulebook-check.log
// (gitignored). Act on a "new-edition-available" result manually, following that
// document's 7-step review process.

import { appendFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RULES_PAGE_URL = "https://www.scca.com/pages/solo-cars-and-rules";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(scriptDir, "..", "logs", "rulebook-check.log");

// Bump this by hand once a year's edition has actually been reviewed and adopted
// (see docs/RULEBOOK_UPDATE_PROCESS.md step 4 -- this should match the year in
// src/data/appendix-a-2026.json's filename / docs/DATA_SOURCES.md's review date).
const CURRENT_RULEBOOK_YEAR = 2026;
const EXPECTED_NEXT_YEAR = CURRENT_RULEBOOK_YEAR + 1;

async function logResult(result) {
  await mkdir(path.dirname(LOG_PATH), { recursive: true });
  await appendFile(LOG_PATH, `${JSON.stringify(result)}\n`, "utf8");
}

async function main() {
  const response = await fetch(RULES_PAGE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (scca-class-finder rulebook release checker)" }
  });
  if (!response.ok) {
    const failure = {
      checkedAt: new Date().toISOString(),
      status: "fetch-failed",
      httpStatus: response.status,
      message: `Could not fetch ${RULES_PAGE_URL} (HTTP ${response.status}). Site may be down or blocking automated requests; not evidence of a release either way.`
    };
    console.log(JSON.stringify(failure));
    await logResult(failure);
    process.exitCode = 2;
    return;
  }

  const html = await response.text();

  // The page has read "The <year> Solo Rules online are made available by SCCA
  // Solo..." every year checked so far. Also look for the more specific download
  // link phrasing as a second, independent signal.
  const introMatch = html.match(/The (\d{4})\s+Solo(?:®|&#174;)?\s+Rules online/i);
  const downloadMatch = html.match(/(\d{4})\s+Solo(?:®|&#174;)?\s+Rules download/i);
  const updatedMatch = html.match(/Updated\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);

  const detectedYears = [introMatch?.[1], downloadMatch?.[1]].filter(Boolean).map(Number);
  const currentSiteYear = detectedYears.length > 0 ? Math.max(...detectedYears) : null;

  const released = currentSiteYear !== null && currentSiteYear >= EXPECTED_NEXT_YEAR;

  const result = {
    checkedAt: new Date().toISOString(),
    expectedNextYear: EXPECTED_NEXT_YEAR,
    detectedSiteYear: currentSiteYear,
    updatedDateOnPage: updatedMatch?.[1] ?? null,
    status: released ? "new-edition-available" : "not-yet-released",
    message: released
      ? `scca.com now shows the ${currentSiteYear} Solo Rules -- run the review process in docs/RULEBOOK_UPDATE_PROCESS.md.`
      : currentSiteYear === null
        ? "Could not find a year mention on the rules page in the expected format -- the page structure may have changed; check manually."
        : `scca.com still shows the ${currentSiteYear} Solo Rules; ${EXPECTED_NEXT_YEAR} not yet posted.`
  };

  console.log(JSON.stringify(result, null, 2));
  await logResult(result);
  process.exitCode = released ? 0 : 1;
}

main().catch(async (error) => {
  const failure = {
    checkedAt: new Date().toISOString(),
    status: "error",
    message: String(error?.message ?? error)
  };
  console.log(JSON.stringify(failure));
  await logResult(failure);
  process.exitCode = 2;
});
