# Annual rulebook update process

This document is forward-looking process guidance for reviewing a *future* SCCA
National Solo Rules edition against this app's current 2026 data. It proposes
no change to any current classification in this repository.

## Release-date evidence

The rulebook itself states its own effective-date rule, found in the 2026
edition at `I.1.3 Replacement of the Solo Rules`:

> Effective on January 1 of each year, all previous editions of the Solo
> Rules will be superseded by the current edition. No revisions previously
> published in the official SCCA publication or on the official SCCA website
> (www.scca.com) will remain in effect unless included in the new edition of
> the Solo Rules.

So the new rule-year is always effective January 1. The *document* itself is
typically finalized and posted in the surrounding weeks, not exactly on that
date:

- 2024 edition: SCCA posted an official "2024 National Solo Rulebook
  Available!" announcement on **2024-01-09**.
  (https://www.scca.com/announcements/654-2024-national-solo-rulebook-available)
- 2026 edition: this repo's `docs/DATA_SOURCES.md` records the official Solo
  Cars and Rules page (https://www.scca.com/pages/solo-cars-and-rules) showing
  **"Updated 2026-01-27"** as of a July 2026 review.
- 2026 edition, errata cadence: an initial "2026_Solo_Rulebook_Jan.pdf" is
  mirrored by at least one region (https://www.glen-scca.org/solo/2026_Solo_Rulebook_Jan.pdf),
  while the copy this repo actually downloaded and transcribed
  (`docs/DATA_SOURCES.md`) came from a `2026 Solo Rulebook Feb.pdf` filename —
  i.e. a January original followed by a February revision/reprint with the
  same effective content but likely typo/formatting corrections.
- 2025 ProSolo Rules (a separate, later document from the National Solo
  Rulebook) were announced **2025-02-26**
  (https://www.scca.com/announcements/865-2025-prosolo-rules-now-available) —
  useful only as a *lower bound*: ProSolo historically follows National Solo,
  so National Solo was almost certainly out well before this.
- No official scca.com announcement could be located for the 2023 or 2025
  National Solo Rulebook specifically (the announcements index does not
  surface old rulebook posts by search); third-party region mirrors exist for
  2025 (e.g. https://scca-susq.com/wp-content/uploads/2025/06/2025-Solo-National-RuleBook.pdf)
  but their upload timestamp reflects when that region re-hosted the file, not
  SCCA's original publish date, so it is not reliable release-date evidence.

**Best-effort characterization:** expect the new-year edition to be
substantively final and posted to scca.com within **January** of its
effective year (seen as early as Jan 9, as late as Jan 27 across the two years
with hard evidence), commonly followed by a **February** errata/correction
reprint carrying the same effective content. Treat "the current year's PDF is
posted" and "the current year's PDF's stated year matches the calendar year"
as the two conditions to check for automated detection (see Scheduling
below) — both were true by late January in every year checked.

## What changes year to year

No "Summary of Changes," "Revision History," or similar changelog section
exists anywhere in either the 2025 or 2026 PDF (checked via full-text search
for those phrases and several variants — zero matches in both editions). The
*only* built-in through-year change mechanism is Tech Bulletins / FasTrack
publications, referenced in `I.1.2 Revision of the Solo Rules`: SCCA may
issue supplements "at any time via Tech Bulletins ... and/or on the official
SCCA website," each with "a published effective date." Per `I.1.3`, all of
that year's accumulated Tech Bulletins get folded into the next annual
edition and then cease to have independent effect. This confirms and extends
what `docs/DATA_SOURCES.md` already noted about Fastrack bulletins (e.g. a
mid-2026 "June 2026"/"August 2026" Fastrack containing proposed changes for
2027/2028): **Fastrack bulletins are the leading indicator; the January
edition is where they get canonicalized.** There was not enough archived
Fastrack history accessible in this pass to quantify how often a mid-year
proposal changes before it ships (that would need a session with access to
the specific Fastrack PDF that preceded the 2026 edition, cross-referenced
against what 2026 actually shipped) — flagged as unverified rather than
guessed.

Comparing the 2025 and 2026 Appendix A text directly (full-text search across
both extracted PDFs, not a full row-by-row transcription of 2025 — the 2026
side already has that rigor in `src/data/appendix-a-2026.json`) surfaces two
distinct kinds of change, in order of frequency:

1. **Mechanical year-range roll-forward (by far the most common).** A
   currently-in-production eligible vehicle simply has its upper year bound
   incremented by one. Every example checked showed this pattern:
   - `GR86 (2022-25)` -> `GR86 (2022-26)`
   - `BRZ (2022-25)` -> `BRZ (2022-26)`
   - `GR 86 (2022-25)` -> `GR 86 (2022-26)` (a second, differently-worded row
     elsewhere in the same class)
   - `Ioniq 5 N (2025)` -> `Ioniq 5 N (2025-26)`
   - `Model 3 (all) (2024-25)` -> `Model 3 (all) (2024-26)`
   - `Integra Type S (2024-25)` -> `Integra Type S (2024-26)`
   This is a pure date-window extension with no class or eligibility change,
   and is the safe default assumption for any currently-listed,
   still-in-production vehicle.
2. **Qualifier/exclusion changes (occasional, and the ones that actually
   matter for correctness).** Example found: `Elantra N (2022-25)` in 2025
   became `Elantra N (non-TCR) (2022-26)` in 2026 — a new exclusion clause
   was added alongside the year roll, almost certainly because a TCR-package
   variant became distinct enough to need separate treatment. This is the
   pattern to watch for: the year number alone can look like a routine roll
   while the actual eligibility text silently narrowed or widened.
   No outright class reassignment (a vehicle moving from one Street/ST/SP
   letter class to a different one) was found in the sample checked this
   pass; that doesn't rule it out for other vehicles or other years, only
   that it wasn't observed in the specific spot-checks run here (GR86, BRZ,
   Elantra N, Civic Type R, Ioniq 5 N, Model 3, Integra Type S).

Page count grew modestly (421 -> 429 pages, 2025 -> 2026), consistent with
incremental additions rather than a wholesale restructure.

## Monthly Fastrack monitoring

The annual edition isn't the only thing that changes classifications — Tech
Bulletins/Fastrack can amend rules mid-year with their own effective dates
(`I.1.2`), independently of the January edition that later canonicalizes
them. SCCA's own Fastrack page states bulletins are "usually updated once a
month," so this needs its own, faster check than the annual one above.

`scripts/check-fastrack-update.mjs` watches for this. The Fastrack news page
(https://www.scca.com/pages/fastrack-news) renders its current-year download
links client-side, so a plain HTTP fetch can't read them there — but the
compiled "All `<year>` Fastrack News — Solo Edition" PDF has a stable
download link (SCCA replaces its *content* each month, same download ID),
and its filename embeds the month/year of its last update (e.g. "2026 Solo
Fastrack All 072026.pdf"). The script resolves that redirect, reads the
filename, and compares it against the last-seen value it stored in
`logs/fastrack-last-seen.json` (gitignored) — a changed stamp means a new
bulletin was likely published, logged to `logs/fastrack-check.log`.

A Windows Task Scheduler entry ("SCCA Solo Fastrack Update Check") runs this
roughly every 4 weeks. `FASTRACK_ARCHIVE_DOWNLOAD_ID` at the top of the
script is specific to the current rulebook year and must be re-resolved by
hand each year (fetch the Fastrack page, find Solo Edition's compiled "All
`<year>` Fastrack News" link, copy its `downloads/<id>/download` URL in) —
fold this into step 4 below so it doesn't silently go stale.

When `logs/fastrack-check.log` reports `new-fastrack-update`: download the
compiled archive PDF, read whatever's new since the last-reviewed month (the
archive is cumulative, so diff against what `docs/DATA_SOURCES.md` last
recorded reviewing), and apply any classification-relevant change the same
way as any other data change in this repo — a versioned override, a
regression test, and a `docs/DATA_SOURCES.md` update. Don't wait for the
annual edition to adopt a Fastrack change that's already in effect now.

## Recommended review process for a new edition

When a new-year rulebook is confirmed available (see Scheduling below):

1. **Check for a changelog first, but don't expect one.** No such section
   existed in 2025 or 2026; if a future edition adds one, it's the cheapest
   and most authoritative source and should short-circuit steps 2-3.
2. **Pull every Fastrack/Tech Bulletin issued since the prior edition's
   January** (https://www.scca.com/pages/solo-cars-and-rules, Fastrack
   archive) and read them for previewed changes — they will already describe
   most of what's about to change, with effective dates.
3. **Diff Appendix A class-by-class** against the current
   `src/data/appendix-a-2026.json` (rename the new extraction to
   `appendix-a-<year>.json` and keep the old one for history/regression
   comparison, don't overwrite it). Use `scripts/extract-rulebook-vehicles.py`
   as the starting point — it already knows how to read the reviewed
   physical page/column segments correctly (plain PDF text extraction
   interleaves the two columns). Then run
   `node scripts/diff-appendix-a-editions.mjs <old-edition.json> <new-edition.json>`
   rather than eyeballing a raw text diff — it buckets every listing into
   `reclassified` (same vehicle, different class letter), `qualifierChanged`
   (same class, wording changed — e.g. an exclusion added or removed),
   `yearRolled`/`unchanged` (routine, safe to skip), `added`, `removed`, and
   `ambiguous` (multiple candidates, resolve by hand rather than guess).
   **`reclassified` is the highest-priority bucket and must be checked every
   single year, even though no example of it turned up in the 2025→2026
   sample this doc's research checked** — SCCA has moved specific vehicles
   between classes in past years, a plain year-range diff would never
   surface that on its own, and a routine-looking year bump can ship
   alongside a real reclassification for the same listing (the tool flags
   the class change as `reclassified`, not `yearRolled`, precisely so this
   can't get missed). Treat every `qualifierChanged` entry as a real
   eligibility change to verify too, not just cosmetic wording.
4. **Rename every `-2026-`/`2026` reference** across the codebase to the new
   year: `src/data/appendix-a-2026.json` and its import in
   `src/lib/vehicleData.ts`, `src/data/prepared-{cp,dp,ep,fp}-2026.json` and
   their importing `src/lib/prepared*.ts` modules, `src/data/overrides2026.ts`,
   any `2026-rulebook-appendix-a` / `2026-current-override` /
   `2026-street-overlay` source-string literals, and `docs/DATA_SOURCES.md`'s
   own review-date header. Grep for the literal string `2026` across `src/`
   and `docs/` rather than trusting memory of every call site.
5. **Re-run `npm run audit:coverage`** after the data swap and compare the
   new per-category reachability numbers against the last-known-good numbers
   recorded in git history (see recent commits touching
   `scripts/audit-rulebook-coverage.ts`) — a large unexplained drop signals a
   transcription or matching regression, not necessarily a real rulebook
   change.
6. **Run the full verification suite** (`npm test`, `npm run typecheck`,
   `npm run validate:data`, `npm run build`) before considering the update
   complete, exactly as for any other data change in this repo.
7. **Update `docs/DATA_SOURCES.md`** with the new review date, source URLs,
   and a short note on what changed, following its existing "Reviewed sources
   for this update" convention.

This document intentionally does not touch, propose, or imply any change to
the app's current 2026 classifications — it is process documentation only,
to be acted on once a genuinely new edition is confirmed.
