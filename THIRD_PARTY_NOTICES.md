# Third-party notices

## Bjorn248/scca_classifier vehicle mapping

`src/data/vehicles.generated.json` was derived from the `allSoloCars` mapping in:

- Project: `Bjorn248/scca_classifier`
- Source file: `src/common.js`
- License: MIT
- Repository: https://github.com/Bjorn248/scca_classifier

The upstream mapping is used only to enrich exact-year SCCA package names and the pre-1990 `Older`
bucket. An unqualified `all` entry is not used as model-year evidence, and its class arrays are not
used by the runtime classifier. This project adds its own production-year hierarchy, reviewed
family/package catalog, rules engine, first-party placements, user interface, tests, and
documentation.

The presence of a vehicle/class entry does not replace the current official SCCA Solo Rules or Fastrack bulletins.
