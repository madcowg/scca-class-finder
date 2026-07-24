# Codex Task: Production SCCA Solo Class Finder

## Mission

Take full engineering ownership of this repository. Audit the existing implementation as untrusted, correct the SCCA Solo classification model using current official sources, redesign the user experience, validate the application, publish it to GitHub, and deploy it with GitHub Pages.

The final product must help a competitor determine:

1. the vehicle's official Appendix A placement for an otherwise standard car;
2. which preparation categories remain legal for the actual build;
3. the recommended least-prepared conventional class that both lists the vehicle and permits every declared modification;
4. independent supplemental-category options such as CAM, Xtreme Street, EVX, Club Spec, or Solo Spec Coupe when their separate eligibility requirements are met;
5. why each category passed, failed, or requires manual review.

Do not guess a class when the source data or user input is insufficient.

## Source-of-truth policy

Before changing classification logic, determine the currently effective rules as of the date the task is run.

Use authoritative sources in this order:

1. current official SCCA Solo Rules and Appendices;
2. current official SCCA Fastrack technical bulletins and published rule changes that supersede the annual rulebook;
3. official SCCA clarification material when applicable.

Third-party sites, previous repositories, generated data, and the current implementation may be used only as discovery aids. They are not authoritative. Verify every production mapping or rules claim against an official SCCA source before treating it as current.

Record for every imported rules/data release:

- source title;
- source URL;
- publication or effective date;
- retrieval date;
- applicable sections or appendices;
- whether a later Fastrack item overrides it.

Do not copy large portions of copyrighted rulebook text into the repository. Store concise derived facts, identifiers, citations, and brief explanations.

## Required classifier architecture

Do not implement classing as one linear list of increasingly modified categories. Evaluate every category independently.

Separate the engine into these concerns:

### A. Vehicle identity and official placement

Resolve exact make, model/generation, trim/package, body style, drivetrain, engine, transmission where relevant, and year range. Model descriptions must preserve distinctions used by Appendix A.

Return one of:

- exact match;
- multiple possible matches requiring another answer;
- not listed or unresolved, requiring manual review.

Never silently fall back to a similar trim, adjacent year, previous generation, or base model.

### B. Modification legality

Represent user modifications as normalized facts, not a user-selected preparation category. At minimum cover:

- tires and treadwear/competition construction;
- wheel diameter, width, offset, spacers, and quantity;
- shocks, springs, coilovers, anti-roll bars, bushings, control arms, pickup points, camber/alignment devices;
- brakes;
- intake, exhaust, emissions equipment, ECU/tune, boost, engine internals, swaps;
- transmission, differential, clutch, drivetrain conversion;
- seats, interior removal, battery relocation, weight reduction;
- bodywork, fenders, aero, splitters, wings, underbody changes;
- forced induction changes;
- safety equipment;
- any modification not otherwise represented.

For each category, every selected modification must produce:

- allowed;
- prohibited;
- conditional/manual review;
- rule section citation;
- concise explanation.

The default rule is conservative: a modification is not legal unless the applicable category authorizes it.

### C. Category placement

A category is a legal result only when both are true:

1. all relevant modifications are legal or conclusively satisfied for that category; and
2. the exact vehicle has a valid placement or applicable catch-all rule in that category.

Test Street, Street Touring, Street Prepared, Street Modified, Prepared, and Modified independently. Do not assume eligibility in one automatically implies eligibility in another.

Evaluate supplemental categories independently using their own gates. Do not present CAM, XS, EVX, SSC, Club Spec, or similar categories merely because a normal ladder category failed.

### D. Result semantics

Return:

- official standard-car placement;
- recommended primary class, when determinable;
- all other verified legal classes;
- supplemental options separately;
- rejected categories with specific blockers;
- manual-review questions and reasons;
- source version and citations used.

If no verified result exists, return `manual review required`; never return a fabricated nearest class.

## Data implementation requirements

1. Inspect the existing generated vehicle data and overrides. Treat them as unverified until audited.
2. Replace stale mappings with a reproducible, versioned import/update pipeline based on official sources where technically feasible.
3. Keep manual corrections in a small explicit override layer with source citations and rationale.
4. Add schema validation and duplicate/overlap detection.
5. Preserve source provenance at record level or release level.
6. Do not infer an unlisted newer model year from an older model year.
7. Do not infer one trim's class from another trim.
8. Add a documented workflow for future rulebook and Fastrack updates.

## Required regression coverage

Add meaningful automated tests for at least:

- exact model/year/trim matching;
- ambiguous vehicle descriptions;
- unlisted year and unlisted trim handling;
- a standard car with its Appendix A Street placement;
- 200-treadwear Street tire eligibility;
- tire below the Street treadwear threshold;
- wheel width or diameter outside Street allowances;
- changed springs/coilovers excluding Street;
- anti-roll-bar combinations at category boundaries;
- ECU/tune and boost changes;
- engine swap or opened engine;
- control-arm or pickup-point relocation;
- interior removal and major aero;
- a build legal in Street Touring but not Street;
- a build legal in Street Prepared but not lower categories;
- a build that resolves to Street Modified, Prepared, or Modified;
- a supplemental category that is independently eligible;
- a supplemental category that is independently ineligible;
- missing information producing manual review;
- unknown modification producing manual review;
- every audited stale mapping fixed during this task.

Tests must assert explanations and citations, not only class acronyms.

## Product and UX redesign

Redesign the app as an approachable, mobile-first classification assistant.

Required experience:

1. **Vehicle step** - searchable make, model/generation, year, trim/package, and relevant configuration.
2. **Build step** - modification questions grouped by system, with plain-language examples and an explicit `not sure` choice.
3. **Review step** - concise build summary that can be edited before classing.
4. **Results step** - prominent recommended result, standard-car placement, verified alternatives, supplemental options, rejected-category ladder, manual-review items, and rule citations.
5. **Share/export** - copyable or URL-encoded build summary without exposing secrets.

Design requirements:

- responsive at approximately 360 px, 768 px, and 1440 px widths;
- keyboard navigable;
- semantic labels and accessible focus states;
- WCAG-conscious contrast;
- no horizontal overflow;
- helpful empty, loading, invalid, and no-result states;
- no unsupported claim that a result is an official SCCA ruling;
- clear notice that the official rules and event officials control.

Do not add a runtime LLM classifier. Classification must remain deterministic and testable.

## Engineering requirements

- Keep TypeScript strict.
- Prefer pure, deterministic domain functions.
- Separate UI, rules evaluation, vehicle lookup, and source data.
- Avoid hidden global state.
- Add error boundaries or graceful failure behavior where appropriate.
- Keep the app deployable as a static site unless a backend is demonstrably necessary.
- Do not add paid services, API keys, or secrets.
- Remove dead code and repair all type inconsistencies.
- Document architectural decisions and known limitations.

Run and pass:

```bash
npm ci
npm run validate:data
npm test
npm run typecheck
npm run build
```

Add missing scripts where necessary. Run linting if configured, and add a reasonable lint step if absent.

Perform browser QA on the built application. Verify the main workflow, responsive layouts, keyboard use, browser console, asset loading, and share links.

## GitHub and deployment

Target repository:

```text
gabe-yosubi/scca-class-finder
```

Complete the following:

1. Inspect `git status` and repository history.
2. Initialize Git if this is not already a repository.
3. Authenticate with GitHub using the available approved method.
4. Create the public repository above if it does not exist.
5. Use `main` as the default branch.
6. Commit the completed project with clear commit messages.
7. Push all source code to GitHub.
8. Configure CI on pushes and pull requests to run install, data validation, tests, type checking, linting, and production build.
9. Configure GitHub Pages deployment through GitHub Actions.
10. Ensure Vite's base path works at `/scca-class-finder/` while preserving a workable local development setup.
11. Grant only the GitHub Actions permissions required for Pages deployment.
12. Monitor the CI and Pages workflows.
13. Diagnose and fix every failure.
14. Open the deployed URL and verify that the application loads and the primary workflow works.

Do not mark the task complete merely because files were pushed. Deployment must be green and the live page must be usable.

If a GitHub authentication, organization policy, or Pages setting requires a human action, stop only at that exact blocker and provide one concise, exact instruction. Continue automatically after access is available.

## Definition of done

The task is complete only when all of the following are true:

- classification logic is based on currently effective official SCCA sources;
- vehicle placement and modification legality are separate concerns;
- categories are tested independently rather than treated as a simple ladder;
- ambiguous or unsupported cases return manual review rather than guesses;
- all audited stale mappings have regression tests;
- the redesigned app is responsive and accessible;
- data validation, tests, type checking, linting, and production build pass;
- GitHub Actions CI passes;
- GitHub Pages deployment passes;
- the live site loads without asset or console errors;
- README documents local setup, architecture, source update workflow, deployment, and limitations;
- the final report includes repository URL, live URL, final commit SHA, checks run, authoritative sources used, corrected mappings, and remaining known limitations.

## Working behavior

- Start by auditing; do not immediately rewrite everything.
- Make conservative decisions and document them.
- Do not claim official endorsement.
- Do not hide unresolved data quality issues.
- Do not use third-party mappings as final authority.
- Do not stop after producing a plan. Implement, test, deploy, and verify.
- Do not ask routine preference questions. Ask only when a credential, permission, or genuinely product-defining choice blocks progress.
