// Checks whether SCCA has published a newer monthly Solo Fastrack bulletin than the
// last one this repo has seen. Fastrack bulletins carry mid-year rule changes with
// their own effective dates (see docs/RULEBOOK_UPDATE_PROCESS.md) -- SCCA's own text
// says they are "usually updated once a month" -- separate from and faster-moving
// than the annual rulebook edition scripts/check-rulebook-release.mjs watches for.
//
// The Fastrack news page (https://www.scca.com/pages/fastrack-news) renders its
// current-year download links client-side, so a plain HTTP fetch can't read them
// there. Instead this watches the compiled "All <year> Fastrack News - Solo Edition"
// PDF's stable download link directly -- SCCA replaces that PDF's *content* each
// month while keeping the same download ID, and its filename embeds the month/year of
// its last update (e.g. "2026 Solo Fastrack All 072026.pdf"). Resolving the redirect
// and reading that filename is enough to detect a new monthly update without ever
// needing to parse the page itself.
//
// FASTRACK_ARCHIVE_DOWNLOAD_ID is specific to the *current* rulebook year and must be
// re-resolved by hand each year (fetch https://www.scca.com/pages/fastrack-news,
// find "Solo Edition" -> the compiled "All <year> Fastrack News" link, copy its
// downloads/<id>/download URL here) -- fold this into the annual review in
// docs/RULEBOOK_UPDATE_PROCESS.md so it doesn't go stale unnoticed. This script only
// detects and reports; it never modifies repository data.

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const FASTRACK_ARCHIVE_DOWNLOAD_ID = "80919";
const FASTRACK_ARCHIVE_URL = `https://www.scca.com/downloads/${FASTRACK_ARCHIVE_DOWNLOAD_ID}/download`;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(scriptDir, "..", "logs", "fastrack-check.log");
const STATE_PATH = path.join(scriptDir, "..", "logs", "fastrack-last-seen.json");

async function logResult(result) {
  await mkdir(path.dirname(LOG_PATH), { recursive: true });
  await appendFile(LOG_PATH, `${JSON.stringify(result)}\n`, "utf8");
}

async function readLastSeen() {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function writeLastSeen(state) {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function extractMonthYearStamp(filename) {
  // Filenames look like "2026 Solo Fastrack All 072026.pdf" -- a trailing MMYYYY
  // stamp just before the extension.
  const match = filename.match(/(\d{2})(\d{4})\.pdf$/i);
  if (!match) return null;
  const [, month, year] = match;
  return { month, year, stamp: `${month}${year}` };
}

async function main() {
  const response = await fetch(FASTRACK_ARCHIVE_URL, {
    method: "HEAD",
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (scca-class-finder fastrack update checker)" }
  });

  if (!response.ok) {
    const failure = {
      checkedAt: new Date().toISOString(),
      status: "fetch-failed",
      httpStatus: response.status,
      message: `Could not resolve ${FASTRACK_ARCHIVE_URL} (HTTP ${response.status}). This download ID may need re-resolving for the current rulebook year -- see the comment at the top of this script.`
    };
    console.log(JSON.stringify(failure));
    await logResult(failure);
    process.exitCode = 2;
    return;
  }

  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? decodeURIComponent(response.url.split("/").pop() ?? "");
  const stamp = extractMonthYearStamp(filename);

  if (!stamp) {
    const failure = {
      checkedAt: new Date().toISOString(),
      status: "unrecognized-filename",
      filename,
      message: "Resolved a file but its name didn't match the expected 'All Fastrack ... MMYYYY.pdf' pattern -- SCCA may have changed their naming convention; check manually."
    };
    console.log(JSON.stringify(failure));
    await logResult(failure);
    process.exitCode = 2;
    return;
  }

  const lastSeen = await readLastSeen();
  const isNew = !lastSeen || lastSeen.stamp !== stamp.stamp;

  const result = {
    checkedAt: new Date().toISOString(),
    filename,
    monthYearStamp: stamp.stamp,
    previousStamp: lastSeen?.stamp ?? null,
    status: isNew ? "new-fastrack-update" : "no-change",
    message: isNew
      ? `Fastrack archive filename changed to "${filename}" (${lastSeen ? `was ${lastSeen.stamp}` : "first check"}) -- a new monthly bulletin was likely published. Download ${FASTRACK_ARCHIVE_URL} and review what changed against docs/DATA_SOURCES.md's current rule model.`
      : `No change since the last check (still ${stamp.stamp}).`
  };

  console.log(JSON.stringify(result, null, 2));
  await logResult(result);
  await writeLastSeen({ stamp: stamp.stamp, filename, checkedAt: result.checkedAt });
  process.exitCode = isNew ? 0 : 1;
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
