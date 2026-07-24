# Review of the original scaffold

## Critical logic defects

### 1. The user selected the answer

The original `VehicleInput` included a `prepLevel` field and the classifier branched directly on that value. That reverses the classing process. Preparation category must be derived from the complete modification set.

### 2. Vehicle placement and preparation legality were conflated

A vehicle's Appendix A placement is separate from whether its modifications comply with Street, Street Touring, Street Prepared, Street Modified, Prepared, or Modified rules. The original implementation did not model that distinction.

### 3. Only one exact vehicle was implemented

The classifier recognized only the normalized key for a 2016 Mazda MX-5 Miata Club. Every other input returned an unmapped placeholder, so the UI looked complete while the engine was not.

### 4. The modification model was too coarse

Selections such as `Flash tune`, `Coilovers`, `Big brake kit`, or `Mild bolt-ons` were not connected to category-specific allowances. The result could not explain which modification caused a category bump.

### 5. It assumed a simple preparation ladder

SCCA allowances do not universally carry forward from one category to another. The scaffold had no explicit category matrix and no way to represent exceptions.

### 6. Unknown cases were guessed or silently ignored

There was no catch-all for unrepresented modifications and no safe manual-review state tied to exact dimensions or construction details.

## Implementation defects

- `baseClassHint` was used in `App.tsx` and `VehicleForm.tsx` but did not exist in `VehicleInput`, producing a TypeScript error.
- Track Day and RallyCross were mixed into a Solo classing form despite using different rule systems.
- No regression tests existed.
- No data validation or source/version metadata existed.
- No deploy workflow or maintenance process existed.

## Rewrite outcome

The new engine:

1. resolves the exact vehicle mapping;
2. evaluates every represented modification against every principal category;
3. finds the first legal category that also contains a vehicle placement;
4. displays blockers for lower categories;
5. keeps supplemental categories separate;
6. returns manual review when details or data are insufficient;
7. applies versioned current overrides before the broad imported fallback;
8. includes regression tests, CI, GitHub Pages deployment, and data-maintenance documentation.
