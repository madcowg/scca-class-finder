# SCCA Solo Class Finder

A deployable React/TypeScript classing assistant that separates **vehicle placement** from **preparation legality**.

## What changed from the first scaffold

The first version had a structural classing error: the user selected a target prep level and the app treated that choice as part of the answer. It also hard-coded one 2016 Miata example, mixed non-Solo uses into the form, and referenced a TypeScript field that did not exist.

This rewrite:

- resolves the exact year, make, model family, and year-specific package before class placement;
- derives legal preparation categories from the modifications first, without using Appendix A to make that decision;
- selects the least-prepared category that is both legal for the build and listed for the exact car;
- shows why lower categories failed;
- labels partially audited mappings instead of auto-promoting them into unverified categories;
- keeps supplemental categories separate;
- stops for manual review instead of guessing;
- includes tests, data validation, CI, and GitHub Pages deployment.

The interface follows a four-step flow: select an exact vehicle, describe its build, review the
inputs, and then open the classification result. Build fields default to stock. Results keep the
current modeled class separate from independent category evaluations, show available lower- and
higher-preparation paths without implying a linear ladder, and link each rule-ledger reference to
the official rulebook.

## Local setup

```bash
npm install
npm run validate:data
npm test
npm run typecheck
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## GitHub deployment

1. Create a GitHub repository and copy this project into it.
2. Commit `package-lock.json` after running `npm install`.
3. Push to `main`.
4. In **Settings -> Pages**, choose **GitHub Actions** as the source.
5. The included `deploy-pages.yml` workflow builds and publishes `dist/`.

Vite uses `base: "./"`, so the build works from a repository subpath.

## Architecture

- `src/lib/classifier.ts` - pure classification engine
- `src/lib/rules.ts` - explicit modification/category allowance profiles
- `src/lib/vehicleData.ts` - strict year/make/model/package hierarchy plus exact reviewed placement lookup
- `src/data/appendix-a-2026.json` - extracted official 2026 Street, Street Touring, and Street Prepared listings with page-level sources
- `src/data/reviewed-vehicles2026.json` - explicit reviewed placements and current package corrections
- `src/data/overrides2026.ts` - typed source notes and coverage layers for the reviewed entries
- `src/data/vehicles.production.json` - Section 3.1-filtered EPA production-year hierarchy used by the selector
- `src/data/vehicles.eligibility.json` - generated stability audit with official dimensions and current-rule exceptions
- `src/data/vehicles.generated.json` - historical SCCA-oriented name archive used only by the `Older` bucket; its class arrays are never used by the runtime classifier
- `src/data/nationals-winners-2021-2025.json` - official Solo Nationals class winners for the latest five completed events
- `src/data/vehicle-generations.ts` - reviewed generation ranges used to prevent cross-generation history matches
- `src/components/` - redesigned responsive interface
- `src/lib/classifier.test.ts` - regression tests
- `scripts/extract-rulebook-vehicles.py` - reproducible two-column Appendix A extractor with layout-damage validation
- `scripts/import-nationals-results.py` - coordinate-aware importer for official annual Nationals result PDFs
- `scripts/audit-rulebook-coverage.ts` - exhaustive selector-to-rulebook reachability audit
- `docs/CODE_REVIEW.md` - defects found in the original scaffold
- `docs/RULES_MODEL.md` - logic, limits, and update process
- `docs/DATA_SOURCES.md` - authority hierarchy and source lineage
- `docs/NATIONALS_FAMILY_RESEARCH.md` - reviewed competitive families, generations, and package boundaries

## Data and authority

The official authority is the current SCCA Solo Rules, Appendix A, and later Fastrack technical bulletins. Start here:

- https://www.scca.com/pages/solo-cars-and-rules

Current source review used by this repository:

- `2026 SCCA National Solo Rules` PDF from the Solo Cars and Rules page. The page showed `Updated 2026-01-27`; reviewed on Friday, July 24, 2026.
- `2026 SCCA Solo Fastrack All` PDF from the Fastrack archive page; reviewed on Friday, July 24, 2026.

Important date note:

- The June 2026 and future-dated August 2026 Fastrack Street tables include proposals for `2027` and `2028`. They are not treated as current 2026 classifications in this app unless and until they appear as effective rulebook text or current-year class listings.

The vehicle selector starts with the EPA fuel-economy vehicle dataset so an exact year exposes only
the makes and model families recorded for that year. EPA `baseModel` and `model` fields provide the
family/package split. SUV, pickup, truck, van, minivan, and special-purpose rows must also pass the
Section 3.1 average-track-to-height screen using official NHTSA/Transport Canada dimensions or have
an exact current SCCA eligibility listing. The historical SCCA-oriented archive cannot add a model
back to an exact year after this screen. An unqualified `all` record is never treated as proof that a
vehicle existed in every year. The imported
class arrays are never used to assign a class. See `docs/DATA_SOURCES.md` and
`THIRD_PARTY_NOTICES.md`.

Runtime placement starts with the versioned official Appendix A dataset. The EPA catalog supplies
vehicle identity but never a class. Exact official Street descriptions become year-specific package
choices, and higher Street Touring or Street Prepared placements are attached only when year,
model family, generation, and exclusion wording remain compatible. The reviewed override file is a
small correction and supplemental layer, not the primary classifier.

The app intentionally labels its data coverage. NOC rules and Street Modified, Prepared, or Modified
criteria that depend on seating, driven wheels, displacement, construction, or minimum weight stop
for manual review until those controlling facts are captured. Xtreme Street is evaluated separately
under Section 21 using production-car eligibility, road equipment, tires, original drivetrain and
powertrain type, and competition weight with the driver. A missing fact is never replaced by a class
copied from a prior year or third-party tool.

National competition history is intentionally conservative and source-backed. The result view
matches the selected vehicle to official class winners from the five completed Solo Nationals held
from 2021 through 2025. A winner must have a published vehicle year inside the selected car's
reviewed generation range and, when named, the same reviewed performance package. If a family or
year range has not been reviewed, the app shows no inferred history rather than mixing identities.
The annual reports publish the winning vehicle text and tire manufacturer, but not a dependable tire
size or exact tire model. The app therefore reports observed manufacturer counts and current class
tire rules without fabricating size/model win ratios. An empty panel means no matching class win was
found in the loaded records, not that the vehicle never entered or cannot be competitive. See
`docs/NATIONALS_FAMILY_RESEARCH.md`.

## Important limitation

This is an advisory tool, not an official SCCA ruling. The rulebook contains detailed dimensional limits, option-package wording, update/backdate conditions, weight formulas, and category-specific exceptions that cannot be safely reduced to a few generic dropdowns. When those details control the answer, the app returns manual review.
