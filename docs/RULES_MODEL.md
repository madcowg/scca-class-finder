# Rules model

## The classification sequence

The app separates three questions that the original scaffold combined incorrectly:

1. **What exact vehicle is being discussed?** The reviewed catalog resolves year, make, model family, and any year-specific trim, engine, drivetrain, or package.
2. **What preparation categories permit the complete build?** Sections 13 through 18 are evaluated independently from vehicle placement.
3. **Where is that exact vehicle listed?** Appendix A or another reviewed official placement is then intersected with the legal preparation categories.

The engine evaluates every modification against every principal category. The displayed category order is a least-prepared preference order, not a claim that SCCA permissions form a linear ladder. Each category receives its own blocker list from the current rule profiles, so a category never becomes legal merely because an earlier category was legal:

1. Street
2. Street Touring
3. Street Prepared
4. Street Modified
5. Prepared
6. Modified

It returns the first category in that preference order that is both:

- legal for every represented modification; and
- present in the vehicle mapping.

The current 2026 rule profiles are anchored to the rulebook sections for tires, wheels, shocks, brakes, anti-roll bars, suspension, electrical systems, engine/drivetrain, and category-specific bodywork. For example, Street Touring can permit both anti-roll bars and coilover spring perches under Section 14, while Street permits only the specific allowances in Sections 13.5-13.8. A profile marked unknown or outside the represented dimensional limits becomes manual review rather than being promoted by category order.

The result also exposes the **minimum legal category** from the modification set alone. If that category has no reviewed placement for the exact vehicle, the engine may use a later category only when that category is independently legal and independently listed. It never uses a higher class listing to make a modification legal.

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

- `vehicles.generated.json`: broad selector catalog imported from the MIT-licensed project. Its class arrays are not used by the runtime classifier.
- `reviewed-vehicles2026.json` and `overrides2026.ts`: explicit reviewed family/package entries and first-party exact placements used by the runtime classifier. They intentionally do not copy previous-year or third-party mappings forward.
- `rules.ts`: explicit category allowances for the user-facing modification profiles.

## Current source-handling rules

- Future-dated Fastrack proposals are not treated as current class listings.
- If an official source review only confirms `Street` or a few exact classes for a vehicle, the engine returns a limited result for those verified classes and manual review for the rest.
- The Street Touring spring model follows the January 2026 Fastrack coilover clarification: changing from a divorced spring layout to a coilover layout is not auto-classed here.

## Updating the model

1. Download the current official Solo Rules from the SCCA Solo Cars and Rules page.
2. Review Fastrack technical bulletins published after the annual rulebook.
3. Update the broad selector catalog for name and year coverage, but never promote its class arrays into runtime decisions.
4. Add a reviewed vehicle family or package only when the exact naming and year-specific placement have been reviewed.
5. Update the current placement only from current official text, and keep future-dated proposals out of the live mapping until they become effective.
6. Add regression tests for every corrected vehicle or allowance.
7. Run `npm run validate:data`, `npm test`, `npm run typecheck`, and `npm run build`.

The repository also runs ten exact, stock 2026 Appendix A cases from different makes through `npx vite-node scripts/verify-current-cases.ts`.

## Limits

This app models common modification boundaries. It does not attempt to encode every dimensional limit, equivalency clause, update/backdate rule, option-package restriction, minimum weight formula, or safety requirement. Those cases must remain manual reviews until represented with exact, testable inputs.
