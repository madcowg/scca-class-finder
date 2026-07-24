# SCCA Solo Class Finder

A deployable React/TypeScript classing assistant that separates **vehicle placement** from **preparation legality**.

## What changed from the first scaffold

The first version had a structural classing error: the user selected a target prep level and the app treated that choice as part of the answer. It also hard-coded one 2016 Miata example, mixed non-Solo uses into the form, and referenced a TypeScript field that did not exist.

This rewrite:

- finds the exact make/model/year mapping first;
- evaluates every represented modification through the principal category ladder;
- selects the least-prepared category that is both legal and listed for the car;
- shows why lower categories failed;
- labels partially audited mappings instead of auto-promoting them into unverified categories;
- keeps supplemental categories separate;
- stops for manual review instead of guessing;
- includes tests, data validation, CI, and GitHub Pages deployment.

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
- `src/lib/vehicleData.ts` - vehicle lookup and data-layer handling
- `src/data/vehicles.generated.json` - broad imported class mapping
- `src/data/overrides2026.ts` - limited 2026 Street-only overlay
- `src/components/` - redesigned responsive interface
- `src/lib/classifier.test.ts` - regression tests
- `docs/CODE_REVIEW.md` - defects found in the original scaffold
- `docs/RULES_MODEL.md` - logic, limits, and update process
- `docs/DATA_SOURCES.md` - authority hierarchy and source lineage

## Data and authority

The official authority is the current SCCA Solo Rules, Appendix A, and later Fastrack technical bulletins. Start here:

- https://www.scca.com/pages/solo-cars-and-rules

Current source review used by this repository:

- `2026 SCCA National Solo Rules` PDF from the Solo Cars and Rules page. The page showed `Updated 2026-01-27`; reviewed on Friday, July 24, 2026.
- `2026 SCCA Solo Fastrack All` PDF from the Fastrack archive page; reviewed on Friday, July 24, 2026.

Important date note:

- The June 2026 and future-dated August 2026 Fastrack Street tables include proposals for `2027` and `2028`. They are not treated as current 2026 classifications in this app unless and until they appear as effective rulebook text or current-year class listings.

The broad vehicle mapping is imported from the MIT-licensed `Bjorn248/scca_classifier` project. See `THIRD_PARTY_NOTICES.md`.

The app intentionally labels its data coverage. A 2026 Street-only entry will not be auto-promoted into a modified category without a verified higher-category mapping.

## Important limitation

This is an advisory tool, not an official SCCA ruling. The rulebook contains detailed dimensional limits, option-package wording, update/backdate conditions, weight formulas, and category-specific exceptions that cannot be safely reduced to a few generic dropdowns. When those details control the answer, the app returns manual review.
