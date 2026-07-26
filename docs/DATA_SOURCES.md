# Data sources and review record

Review date: 2026-07-25

## Authority hierarchy

1. Current official SCCA Solo Rules and Appendix A
2. Later Solo technical bulletins published in Fastrack
3. Official supplemental-class rules
4. This application's reviewed first-party placements
5. EPA production identity data, which constrains year/make/model but is not a classification authority
6. Transport Canada vehicle dimensions served by the official NHTSA vPIC API
7. Official annual SCCA Solo Nationals result reports, used only as competition-history evidence
8. The imported SCCA-oriented name archive, which is not a classification authority

Official starting point:

- https://www.scca.com/pages/solo-cars-and-rules

The official page identifies the 2026 Solo Rules and should be checked for later revisions. Fastrack technical bulletins may supersede the annual book.

Reviewed sources for this update:

- `2026 SCCA National Solo Rules` from the Solo Cars and Rules page. The page showed `Updated 2026-01-27`. Retrieved and reviewed on Friday, July 24, 2026.
- `2026 SCCA Solo Fastrack All` from the Fastrack archive page. Retrieved and reviewed on Friday, July 24, 2026.

Important date handling:

- The future-dated `August 2026` Solo Fastrack PDF was already posted on the SCCA site by July 24, 2026, but its Street category class tables are follow-up proposals for `2027`, not current 2026 classing.
- The `June 2026` Solo Fastrack Street tables likewise contain proposed changes effective `2027` and `2028`, not current 2026 reclassifications.
- The repository uses those Fastrack PDFs for clarifications and to avoid adopting future proposals too early, not as permission to backdate future class changes into July 24, 2026 results.

## Rules model review

The modification profiles were rebuilt around the category-specific authorized-modifications approach in Sections 13-18. The current model specifically distinguishes common boundaries such as:

- 200+ treadwear Street tires versus sub-200 DOT tires and slicks;
- one changed anti-roll bar versus both ends;
- standard springs versus lowering springs or coilovers;
- Street Touring intake, ECU, header, alignment, and brake profiles;
- Street Prepared tire, wheel, ECU, emissions, bodywork, and small-aero profiles;
- Street Modified swaps, rear-seat removal, and larger aero;
- Prepared/Modified slicks and extensive construction changes.

Current rule-model corrections from official sources:

- Street Touring spring legality now follows the January 2026 Fastrack rear-coilover clarification: a divorced-to-coilover conversion is no longer auto-classed as Street Touring.
- Street Prepared-scope internal-engine and boost-control changes are no longer auto-bumped into Street Modified.
- Relocated suspension pickup points and similar geometry changes now stop at manual review instead of being guessed into Street Modified.
- Safety equipment now has an explicit manual-review path instead of being silently ignored.

The app does not claim that category allowances automatically carry forward. Each dropdown option has an explicit category list.

## Vehicle mapping and selector layers

### Official Appendix A dataset

`src/data/appendix-a-2026.json` contains 1,870 current official rows across all 21 Street,
Street Touring, and Street Prepared classes. `scripts/extract-rulebook-vehicles.py` reads reviewed
physical page/column segments because ordinary PDF text extraction interleaves the two columns. It
validates year ranges, balanced listing text, class coverage, manufacturer headings, and known
landmark vehicles before writing the versioned JSON.

The runtime uses exact official Street descriptions as package choices. Matching into Street
Touring or Street Prepared is conservative: the year must apply, the model family must agree, and
generation or exclusion wording cannot conflict. Every attached class retains a direct link to its
physical rulebook page.

The exhaustive reachability audit is intentionally separate from accuracy. An unreachable row is a
coverage issue; a manual-review result caused by NOC wording or missing drivetrain/construction
facts is the correct safe result, not an error to patch with an inferred class.

### Current curated overrides

`src/data/overrides2026.ts` now uses two conservative layers:

- `street-only` entries for exact current vehicles where only the Street listing was verified from current official text;
- `verified-classes` entries where the current official review confirmed a few exact classes, but not the full older fallback mapping.

The live selector starts with `src/data/vehicles.production.json`, generated from the official EPA
fuel-economy vehicle CSV. Its exact `year`, `make`, `baseModel`, and `model` values establish the
dependency chain used by the interface. The source was retrieved on July 24, 2026 from:

- https://www.fueleconomy.gov/feg/epadata/vehicles.csv

`baseModel` becomes the model-family choice and distinct `model` values become year-specific
submodel/configuration choices. A few deterministic normalizations correct source groupings such as
Mazda `3` to `Mazda3`, Volkswagen `Golf/GTI` to `Golf`, and BMW's combined `M` family to individual
M2/M3/M4/M5 families. The 2026 Ford Mustang's otherwise generic EPA rows are separated by the
official EPA engine fields into its 2.3L turbo and 5.0L V8 choices.

The reviewed JSON supplies class-affecting aliases, corrections, and supplemental placements. Exact-year entries
from the imported SCCA-oriented archive are not allowed to add production families or packages back
into 1990-2026 after the production and stability filters run. A source key of `all` is available
only under `Older`. This keeps discontinued, unstable, and ambiguous vehicles out of exact years
while preserving a conservative path for pre-1990 cars.

### Section 3.1 stability screen

The EPA `VClass` field identifies SUV, pickup, truck, van, minivan, and special-purpose rows that
need a rollover screen. `npm run import:epa` groups those rows by exact year, make, and model family,
then requests official Canadian Vehicle Specifications through the NHTSA vPIC API:

- https://vpic.nhtsa.dot.gov/api/

The importer calculates average track as `(front track + rear track) / 2`. A high-risk family is
retained only when every matched configuration has average track greater than or equal to overall
height, or when that exact model year and variant is specifically eligible in current Appendix A or
Appendix B. The Appendix B asterisked models use SCCA's published-SSF exception above 1.30. An
ambiguous or missing dimensional match is omitted and routed through the interface's `Not listed`
manual-review path. Appendix A's named stability exclusions are applied before dimensions,
including the Forester, Juke, and the non-performance variants of the Caliber, 500, and Fiesta.

`src/data/vehicles.eligibility.json` is the generated review ledger. It records the source classes,
production variants, inclusion/exclusion reason, matched-configuration count, height range, average
track range, and worst passing margin for each audited family. It is not a class-placement source.

Corrected current-vehicle mappings now include:

- `Acura Integra Type S (2026)` corrected to `AS` from the official Appendix A text instead of the stale `BS` overlay.
- The ten-case current-rulebook verification set covers 2026 Acura Integra Type S (AS), BMW M240i (ES), Chevrolet Corvette Stingray (SS), Ford Mustang EcoBoost (DS), Honda Civic Type R (AS), Hyundai Ioniq 5 N (SS), Nissan Z (BS), Subaru BRZ (DS), Toyota GR Corolla (BS), and Volkswagen Golf R (DS).
- `BMW M240i (incl. xDrive) (2026)` corrected to `ES` instead of the stale `FS` overlay.
- `Honda Civic Type-R (2026)` corrected to `AS` instead of the stale `BS` overlay.
- `Toyota GR Corolla (2026)` split into exact official package-based entries instead of a single generic `GR Corolla` row.
- `Volkswagen Golf GTI (2026)` updated to the official `Golf GTI (incl. 380 Edition)` wording.
- `Hyundai IONIQ 5 N` reduced to verified current classes only; the app no longer fabricates 2026 EVX or modified-category mappings.
- `Chevrolet C8 Z06` reduced to verified current classes only; the app no longer fabricates higher-category mappings from secondary sources.

Corrected older audited overrides now intentionally stop short of non-official carry-forward mappings:

- `Chevrolet Camaro (V6) (2010-15)` now verifies only the current official `DS` listing.
- `Nissan 350Z NISMO (2004-08)` now verifies only the current official `CS` listing.
- `Porsche Boxster (987.1 base) (2005-08)` now verifies the current official `CS` and `BST` listings without inferring additional classes.

### Broad selection catalog

`src/data/vehicles.generated.json` is derived from the MIT-licensed `Bjorn248/scca_classifier`
project. It is limited to historical identity names under the `Older` bucket. Its class arrays are
never read by the runtime classifier. Current class placement comes from the official versioned
Appendix A dataset plus the small reviewed first-party correction layer.

## Solo Nationals winner history

`src/data/nationals-winners-2021-2025.json` contains 349 class-winner rows from the official
combined results for the five completed Solo Nationals held from 2021 through 2025. Each row retains
its event year, class, open/ladies division, published winning vehicle text, published tire
manufacturer, and direct annual-results URL.

`scripts/import-nationals-results.py` separates the vehicle and tire columns by PDF coordinates.
The official 2022 and 2024 reports are scanned documents, so their cached local copies require OCR.
The importer applies only explicit OCR cleanup and known tire-manufacturer normalization. It omits
rows with no published vehicle and the 2024 Kart Modified Electric exhibition winner rather than
presenting either as a normal National Championship vehicle result.

The runtime first resolves the selected year to a reviewed generation in
`src/data/vehicle-generations.ts`, then requires each winning record's published vehicle year to
fall inside that range. The MX-5 data distinguishes NA 1.6L, NA 1.8L, NB, NC, and ND. A family
without reviewed generation data uses exact-model-year matching, never a broad family fallback.
Records without a published model year are excluded because they cannot prove a generation match.

Nationals results do not classify the current build, and a same-generation result does not prove
that every package is equally competitive. The reports publish tire manufacturers, but do not
consistently publish tire dimensions or exact tire models. Accordingly, the app can show observed
manufacturer counts and the selected class's legal tire constraints, but cannot support size/model
winning-ratio claims such as a specific `205/50R15` or `Potenza RE-71RS` percentage.

Reviewed MX-5 generation sources:

- https://news.mazdausa.com/download/2016_Mazda_MX-5_Press_Kit.pdf
- https://newsroom.mazda.com/en/publicity/release/2016/201604/160425a.html
- https://news.mazdausa.com/vehicles-2016-mx-5
- https://news.mazdausa.com/vehicles-2026-mx-5

Official archive:

- https://www.scca.com/pages/solo-archives

## Required maintenance practice

For every reported classing error:

1. Confirm the exact make/model/year/trim wording in the current Appendix A.
2. Confirm the complete build against the relevant category section.
3. Check later Fastrack technical bulletins.
4. Add or correct a versioned override.
5. Add a regression test reproducing the error.
6. Do not copy a prior year's higher-category classes into a new model year without a current source.
