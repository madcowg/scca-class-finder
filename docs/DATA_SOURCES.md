# Data sources and review record

Review date: 2026-07-24

## Authority hierarchy

1. Current official SCCA Solo Rules and Appendix A
2. Later Solo technical bulletins published in Fastrack
3. Official supplemental-class rules
4. This application's reviewed first-party placements
5. The imported catalog, which is not a classification authority

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

### Current curated overrides

`src/data/overrides2026.ts` now uses two conservative layers:

- `street-only` entries for exact current vehicles where only the Street listing was verified from current official text;
- `verified-classes` entries where the current official review confirmed a few exact classes, but not the full older fallback mapping.

The live selector uses the broad import for coverage, then groups source descriptions into model
families and year-specific variants. The reviewed JSON supplies corrected current package names and
placements. This keeps trims out of the model list without pretending that every catalog entry has a
reviewed automatic class result; unreviewed entries still resolve to manual review.

Catalog-wide `all` year keys are retained for selector coverage across the requested year range. They
do not prove that a particular trim was manufactured in that year and they never create a class result;
the exact vehicle still needs a reviewed placement or manual review.

Corrected current-vehicle mappings now include:

- `Acura Integra Type S (2026)` corrected to `AS` from the official Appendix A text instead of the stale `BS` overlay.
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

`src/data/vehicles.generated.json` is derived from the MIT-licensed `Bjorn248/scca_classifier` project.
It provides broad make, model-family, year, and submodel choices. Its class arrays are never used by
the runtime classifier. If `src/data/overrides2026.ts` does not contain a reviewed exact placement,
the engine returns manual review.

## Required maintenance practice

For every reported classing error:

1. Confirm the exact make/model/year/trim wording in the current Appendix A.
2. Confirm the complete build against the relevant category section.
3. Check later Fastrack technical bulletins.
4. Add or correct a versioned override.
5. Add a regression test reproducing the error.
6. Do not copy a prior year's higher-category classes into a new model year without a current source.
