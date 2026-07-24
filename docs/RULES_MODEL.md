# Rules model

## The classification sequence

The app separates two questions that the original scaffold combined incorrectly:

1. **Where is this exact vehicle listed?**  Appendix A places a make/model/year/trim in one or more classes across categories.
2. **What is the least-prepared category that permits the complete build?**  Sections 13 through 18 govern preparation.

The engine evaluates every modification against each principal category in order:

1. Street
2. Street Touring
3. Street Prepared
4. Street Modified
5. Prepared
6. Modified

It returns the first category that is both:

- legal for every represented modification; and
- present in the vehicle mapping.

Supplemental categories such as CAM, Xtreme Street, EVX, Solo Spec Coupe, and Club Spec are presented separately because each has its own eligibility and preparation path.

## Conservative behavior

A classing tool should fail safely. The engine returns **manual review required** when:

- the exact vehicle is not present;
- the selected year/trim has no mapping;
- a modification is marked unknown;
- construction details control legality;
- the current official source review only verifies some exact classes for the vehicle and the rest would need to be inferred;
- a 2026 Street-only overlay would require inferring an unverified higher-category placement.

## Data layers

- `vehicles.generated.json`: broad mapping imported from the MIT-licensed `Bjorn248/scca_classifier` project.
- `overrides2026.ts`: a small set of current Street or partially audited exact placements cross-checked against official 2026 Appendix A / Appendix B text. It intentionally does not copy previous-year or third-party higher-category mappings forward.
- `rules.ts`: explicit category allowances for the user-facing modification profiles.

## Current source-handling rules

- Future-dated Fastrack proposals are not treated as current class listings.
- If an official source review only confirms `Street` or a few exact classes for a vehicle, the engine returns a limited result for those verified classes and manual review for the rest.
- The Street Touring spring model follows the January 2026 Fastrack coilover clarification: changing from a divorced spring layout to a coilover layout is not auto-classed here.

## Updating the model

1. Download the current official Solo Rules from the SCCA Solo Cars and Rules page.
2. Review Fastrack technical bulletins published after the annual rulebook.
3. Run `npm run import:upstream` only after reviewing the upstream source and license. (The script is currently invoked directly with `node scripts/import-upstream.mjs`.)
4. Update the current overlay only from current official text, and keep future-dated proposals out of the live mapping until they become effective.
5. Add regression tests for every corrected vehicle or allowance.
6. Run `npm run validate:data`, `npm test`, `npm run typecheck`, and `npm run build`.

## Limits

This app models common modification boundaries. It does not attempt to encode every dimensional limit, equivalency clause, update/backdate rule, option-package restriction, minimum weight formula, or safety requirement. Those cases must remain manual reviews until represented with exact, testable inputs.
