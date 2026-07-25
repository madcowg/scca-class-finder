# Rules model

## The classification sequence

The app separates three questions that the original scaffold combined incorrectly:

1. **What exact vehicle is being discussed?** The production catalog first constrains make, model family, and trim/package to the selected model year. The reviewed rules catalog then resolves any exact class-affecting package.
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

### Xtreme Street

XA/XB does not participate in the principal least-prepared category order. After the principal
Street-through-Modified evaluation, the engine independently checks the Section 21 facts represented
by the interface:

- factory-VIN production-road-car eligibility and the CAM/kit-car exclusions;
- working required road equipment;
- Street-eligible tires or the named Vitour Tempesta P1/P1+ exception;
- retention of the original driven-wheel and powertrain types;
- original tractive-system hardware and programming for hybrid/electric vehicles; and
- measured competition weight with the driver against the XA/XB driven-wheel minimums.

Confirmed failures block XA/XB. Missing facts produce manual review. XA/XB can become the result
only when no principal category is complete and every modeled Section 21 check passes. If both
weight-based descriptions are objectively available, the interface reports both and recommends the
class whose minimum is closest to the entered weight band; it does not describe XA and XB as
preparation steps.

ALSCCA PRO is handled only after the car has a class. It is a driver-selected PAX competition group,
not another vehicle-preparation category, so the displayed registration is `PRO / SS`, not `XSS`.

## Conservative behavior

A classing tool should fail safely. The engine returns **manual review required** when:

- the exact vehicle is not present;
- the selected year/trim has no mapping;
- a modification is marked unknown;
- construction details control legality;
- the current official source review only verifies some exact classes for the vehicle and the rest would need to be inferred;
- a 2026 Street-only overlay would require inferring an unverified higher-category placement.

## Data layers

- `vehicles.production.json`: eligibility-filtered EPA model-year, make, base-model, and production-variant hierarchy used to constrain the selector.
- `vehicles.eligibility.json`: generated Section 3.1 audit ledger for high-rollover-risk body classes, using official NHTSA/Transport Canada dimensions and explicit current-rule exclusions.
- `appendix-a-2026.json`: official 2026 Street, Street Touring, and Street Prepared table rows extracted from reviewed physical page/column segments. Every row retains its class, rule section, physical PDF page, and source link.
- `vehicles.generated.json`: historical SCCA-oriented name archive imported from the MIT-licensed project. It is limited to the `Older` bucket and cannot provide a runtime class. Its class arrays are not used by the runtime classifier.
- `reviewed-vehicles2026.json` and `overrides2026.ts`: a small correction and supplemental layer for exact package aliases and separately reviewed classes. It intentionally does not copy previous-year or third-party mappings forward.
- `rules.ts`: explicit category allowances for the user-facing modification profiles.
- `nationals-winners-2016-2025.json`: official class-winner evidence from the nine Nationals held in the ten-year 2016-2025 window.

## Current source-handling rules

- Future-dated Fastrack proposals are not treated as current class listings.
- If an official source review only confirms `Street` or a few exact classes for a vehicle, the engine returns a limited result for those verified classes and manual review for the rest.
- The Street Touring spring model follows the January 2026 Fastrack coilover clarification: changing from a divorced spring layout to a coilover layout is not auto-classed here.

## Updating the model

1. Download the current official Solo Rules from the SCCA Solo Cars and Rules page.
2. Review Fastrack technical bulletins published after the annual rulebook.
3. Refresh the EPA production hierarchy and Section 3.1 audit with `npm run import:epa`, then review both diffs.
4. Regenerate `appendix-a-2026.json` from the downloaded official PDF, then review the extraction diff and validator landmarks.
5. Update exact-year aliases only in the reviewed first-party data; never promote imported archive class arrays into runtime decisions.
6. Update current placement only from current official text, and keep future-dated proposals out of the live mapping until they become effective.
7. Run `npx vite-node scripts/audit-rulebook-coverage.ts` and investigate every reachability regression.
8. Regenerate the Nationals winner dataset from the official annual PDFs when the ten-year window changes, and review importer exceptions.
9. Add regression tests for every corrected vehicle or allowance.
10. Run `npm run validate:data`, `npm test`, `npm run typecheck`, and `npm run build`.

The repository also runs ten exact, stock 2026 Appendix A cases from different makes through `npx vite-node scripts/verify-current-cases.ts`.

## Limits

This app models common modification boundaries and the explicit Street/ST/SP tables. Street Modified,
Prepared, and Modified are often criteria-driven rather than simple trim tables. The app does not
claim an automatic result when seating, driven wheels, displacement, equivalency, update/backdate,
minimum weight, construction, or safety facts are missing. Those cases remain manual reviews until
represented with exact, testable inputs.
