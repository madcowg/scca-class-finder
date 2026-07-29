// Compares two Appendix A editions (e.g. src/data/appendix-a-2026.json and a future
// src/data/appendix-a-2027.json) and reports, per listing, exactly which kind of change
// happened. This exists because a plain text diff of the two JSON files is dominated by
// noise: nearly every listing's description gets its trailing year range bumped by one
// every year (e.g. "GR86 (2022-25)" -> "GR86 (2022-26)"), which would otherwise drown out
// the rare but consequential changes -- most importantly a vehicle being RECLASSIFIED to a
// different class letter, which the user has observed SCCA do between editions in the past
// and which routine year-roll-forward diffing would not surface on its own.
//
// Usage: node scripts/diff-appendix-a-editions.mjs <old-edition.json> <new-edition.json>
//
// Two-pass matching:
//   Pass 1 (exact): category + manufacturer + "base identity" (description with its year
//   range and Limited-Prep marker stripped, everything else -- including qualifier text
//   like "(non-turbo)" -- left intact). A pass-1 match can only be a reclassification
//   (class letter differs), a routine year roll, or fully unchanged, because by
//   construction its non-year text is identical between editions.
//   Pass 2 (loose, for anything pass 1 left unmatched): within the same category +
//   manufacturer, pair an unmatched old listing with an unmatched new listing when one's
//   base identity contains the other's (whole-word) or their identity tokens overlap
//   heavily -- this is exactly the shape of a real qualifier/exclusion change, e.g.
//   "Elantra N (2022-25)" -> "Elantra N (non-TCR) (2022-26)", where the added qualifier
//   changes the exact-match key. A pass-2 pairing is only accepted when it is the unique
//   best candidate on both sides; anything else is left ambiguous rather than guessed.
//
// See docs/RULEBOOK_UPDATE_PROCESS.md for the full annual review process this fits into.

import { readFile } from "node:fs/promises";

function clean(value) {
  return value.replace(/\s+/g, " ").trim();
}

function identityText(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripYearRange(description) {
  return description
    .replace(/\*?\s*Limited Prep\b/gi, "")
    .replace(/\b(?:19|20)?\d{2}(?:1\/2)?\s*-\s*(?:19|20)?\d{2}\b/g, "")
    .replace(/\b(?:19|20)\d{2}\b/g, "");
}

function baseIdentity(description) {
  return identityText(stripYearRange(description));
}

function exactKey(listing) {
  return `${listing.category}::${listing.manufacturer.toLowerCase()}::${baseIdentity(listing.description)}`;
}

function groupKey(listing) {
  return `${listing.category}::${listing.manufacturer.toLowerCase()}`;
}

function yearRangesEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every(([startA, endA], index) => {
    const [startB, endB] = b[index];
    return startA === startB && endA === endB;
  });
}

async function loadEdition(path) {
  const raw = JSON.parse(await readFile(path, "utf8"));
  return raw.listings ?? raw;
}

function groupByExactKey(listings) {
  const groups = new Map();
  for (const listing of listings) {
    const key = exactKey(listing);
    const bucket = groups.get(key) ?? [];
    bucket.push(listing);
    groups.set(key, bucket);
  }
  return groups;
}

function tokenSet(description) {
  return new Set(baseIdentity(description).split(" ").filter(Boolean));
}

function containsWholeWord(haystackTokens, needleTokens) {
  const haystack = ` ${[...haystackTokens].join(" ")} `;
  const needle = [...needleTokens].join(" ");
  return needle.length > 0 && haystack.includes(` ${needle} `);
}

function tokenOverlapRatio(a, b) {
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

const LOOSE_OVERLAP_THRESHOLD = 0.6;

function looseMatchScore(oldListing, newListing) {
  const oldTokens = tokenSet(oldListing.description);
  const newTokens = tokenSet(newListing.description);
  if (containsWholeWord(oldTokens, newTokens) || containsWholeWord(newTokens, oldTokens)) {
    return 1;
  }
  const ratio = tokenOverlapRatio(oldTokens, newTokens);
  return ratio >= LOOSE_OVERLAP_THRESHOLD ? ratio : 0;
}

// Finds the mutually-best pairing between leftover old/new listings within one
// manufacturer+category group. A pairing is accepted only if each side's best-scoring
// candidate points back at the other (stable, unique match); anything else is ambiguous.
function looseMatchGroup(oldListings, newListings) {
  const pairs = [];
  const matchedOld = new Set();
  const matchedNew = new Set();
  const ambiguousOld = new Set();
  const ambiguousNew = new Set();

  const bestForOld = oldListings.map((oldListing) => {
    let best = null;
    for (const newListing of newListings) {
      const score = looseMatchScore(oldListing, newListing);
      if (score > 0 && (best === null || score > best.score)) best = { newListing, score };
    }
    return best;
  });
  const bestForNew = newListings.map((newListing) => {
    let best = null;
    for (const oldListing of oldListings) {
      const score = looseMatchScore(oldListing, newListing);
      if (score > 0 && (best === null || score > best.score)) best = { oldListing, score };
    }
    return best;
  });

  oldListings.forEach((oldListing, oldIndex) => {
    const forward = bestForOld[oldIndex];
    if (!forward) return;
    const newIndex = newListings.indexOf(forward.newListing);
    const backward = bestForNew[newIndex];
    if (backward && backward.oldListing === oldListing) {
      pairs.push({ before: oldListing, after: forward.newListing });
      matchedOld.add(oldListing);
      matchedNew.add(forward.newListing);
    } else {
      ambiguousOld.add(oldListing);
      if (backward) ambiguousNew.add(forward.newListing);
    }
  });

  const unmatchedOld = oldListings.filter((l) => !matchedOld.has(l));
  const unmatchedNew = newListings.filter((l) => !matchedNew.has(l));

  return { pairs, unmatchedOld, unmatchedNew };
}

export function diffEditions(oldListings, newListings) {
  const oldExact = groupByExactKey(oldListings);
  const newExact = groupByExactKey(newListings);
  const allExactKeys = new Set([...oldExact.keys(), ...newExact.keys()]);

  const reclassified = [];
  const qualifierChanged = [];
  const yearRolled = [];
  const unchanged = [];
  const ambiguous = [];
  const leftoverOld = [];
  const leftoverNew = [];

  for (const key of allExactKeys) {
    const oldMatches = oldExact.get(key) ?? [];
    const newMatches = newExact.get(key) ?? [];

    if (oldMatches.length === 0) {
      leftoverNew.push(...newMatches);
      continue;
    }
    if (newMatches.length === 0) {
      leftoverOld.push(...oldMatches);
      continue;
    }
    if (oldMatches.length > 1 || newMatches.length > 1) {
      ambiguous.push({ key, old: oldMatches, new: newMatches });
      continue;
    }

    const before = oldMatches[0];
    const after = newMatches[0];

    if (before.classId !== after.classId) {
      reclassified.push({ key, before, after });
    } else if (!yearRangesEqual(before.yearRanges, after.yearRanges) || before.description !== after.description) {
      // Base identity (year + Limited-Prep stripped) already matched exactly, so any
      // remaining difference here is confined to the year digits or cosmetic formatting.
      yearRolled.push({ key, before, after });
    } else {
      unchanged.push({ key, before, after });
    }
  }

  // Pass 2: try to pair off whatever pass 1 couldn't match exactly, within the same
  // manufacturer + category, using loose containment/overlap.
  const leftoverOldByGroup = new Map();
  for (const listing of leftoverOld) {
    const key = groupKey(listing);
    const bucket = leftoverOldByGroup.get(key) ?? [];
    bucket.push(listing);
    leftoverOldByGroup.set(key, bucket);
  }
  const leftoverNewByGroup = new Map();
  for (const listing of leftoverNew) {
    const key = groupKey(listing);
    const bucket = leftoverNewByGroup.get(key) ?? [];
    bucket.push(listing);
    leftoverNewByGroup.set(key, bucket);
  }

  const removed = [];
  const added = [];
  const allGroupKeys = new Set([...leftoverOldByGroup.keys(), ...leftoverNewByGroup.keys()]);
  for (const key of allGroupKeys) {
    const oldGroup = leftoverOldByGroup.get(key) ?? [];
    const newGroup = leftoverNewByGroup.get(key) ?? [];
    if (oldGroup.length === 0) {
      added.push(...newGroup);
      continue;
    }
    if (newGroup.length === 0) {
      removed.push(...oldGroup);
      continue;
    }

    const { pairs, unmatchedOld, unmatchedNew } = looseMatchGroup(oldGroup, newGroup);
    for (const { before, after } of pairs) {
      if (before.classId !== after.classId) {
        reclassified.push({ key, before, after });
      } else {
        qualifierChanged.push({ key, before, after });
      }
    }
    removed.push(...unmatchedOld);
    added.push(...unmatchedNew);
  }

  return { reclassified, qualifierChanged, yearRolled, unchanged, added, removed, ambiguous };
}

function summarize(result) {
  return {
    reclassified: result.reclassified.length,
    qualifierChanged: result.qualifierChanged.length,
    yearRolled: result.yearRolled.length,
    unchanged: result.unchanged.length,
    added: result.added.length,
    removed: result.removed.length,
    ambiguous: result.ambiguous.length
  };
}

async function main() {
  const [oldPath, newPath] = process.argv.slice(2);
  if (!oldPath || !newPath) {
    console.error("Usage: node scripts/diff-appendix-a-editions.mjs <old-edition.json> <new-edition.json>");
    process.exitCode = 2;
    return;
  }

  const [oldListings, newListings] = await Promise.all([loadEdition(oldPath), loadEdition(newPath)]);
  const result = diffEditions(oldListings, newListings);

  console.log("=== Summary ===");
  console.log(JSON.stringify(summarize(result), null, 2));

  if (result.reclassified.length > 0) {
    console.log("\n=== RECLASSIFIED (check these first -- same vehicle, different class) ===");
    for (const { before, after } of result.reclassified) {
      console.log(
        `[${before.category}] ${before.manufacturer}: "${before.description}" (${before.classId.toUpperCase()}) -> "${after.description}" (${after.classId.toUpperCase()})`
      );
    }
  }

  if (result.qualifierChanged.length > 0) {
    console.log("\n=== QUALIFIER/EXCLUSION CHANGED (same class, wording changed -- verify eligibility didn't shift) ===");
    for (const { before, after } of result.qualifierChanged) {
      console.log(`[${before.category}/${before.classId.toUpperCase()}] ${before.manufacturer}: "${before.description}" -> "${after.description}"`);
    }
  }

  if (result.ambiguous.length > 0) {
    console.log("\n=== AMBIGUOUS (multiple listings share an identity -- resolve by hand) ===");
    for (const { key, old, new: news } of result.ambiguous) {
      console.log(`${key}: old=${old.map((l) => l.description).join(" | ")} new=${news.map((l) => l.description).join(" | ")}`);
    }
  }

  if (result.removed.length > 0) {
    console.log("\n=== REMOVED (no match found in the new edition -- confirm discontinued vs. reworded beyond matching) ===");
    for (const listing of result.removed) {
      console.log(`[${listing.category}/${listing.classId.toUpperCase()}] ${listing.manufacturer}: "${listing.description}"`);
    }
  }

  if (result.added.length > 0) {
    console.log("\n=== ADDED (no match found in the old edition -- new vehicle/class entry) ===");
    for (const listing of result.added) {
      console.log(`[${listing.category}/${listing.classId.toUpperCase()}] ${listing.manufacturer}: "${listing.description}"`);
    }
  }

  console.log(
    `\n${result.yearRolled.length} listing(s) were a routine year-range roll-forward only, and ${result.unchanged.length} were fully unchanged -- not printed individually.`
  );
}

if (process.argv[1] && process.argv[1].endsWith("diff-appendix-a-editions.mjs")) {
  main();
}
