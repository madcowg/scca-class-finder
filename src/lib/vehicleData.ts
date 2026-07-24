import rawVehicles from "../data/vehicles.generated.json";
import { CURRENT_MAPPING_OVERRIDES, STREET_OVERLAYS_2026 } from "../data/overrides2026";
import type { VehicleMapping, VehicleSelection, VehicleVariant } from "./types";

type RawVehicles = Record<string, Record<string, Record<string, string[]>>>;
type ReviewedEntry = (typeof STREET_OVERLAYS_2026)[number] | (typeof CURRENT_MAPPING_OVERRIDES)[number];

const vehicles = rawVehicles as RawVehicles;
const reviewedEntries: ReviewedEntry[] = [
  ...STREET_OVERLAYS_2026,
  ...CURRENT_MAPPING_OVERRIDES
];

const SELECTOR_YEARS = [
  ...Array.from({ length: 2026 - 1990 + 1 }, (_, index) => String(2026 - index)),
  "older"
];
const NOC_MAKE = "NOC (Not Otherwise Classified)";

const SPECIAL_VEHICLES: Array<{
  make: string;
  model: string;
  variant: string;
  classes: string[];
  sourceNote: string;
}> = [
  {
    make: "Formula SAE",
    model: "Formula SAE",
    variant: "Formula SAE car",
    classes: ["fsae"],
    sourceNote: "Formula SAE is a separate supplemental path; it is not forced into a principal Street through Modified class."
  }
];

const currentOverrideIndex = new Map(
  CURRENT_MAPPING_OVERRIDES.map((entry) => [entryKey(entry), entry])
);
const aliasIndex = new Map<string, { model: string; variant?: string }>();
const sourceModelsByMake = new Map<string, Set<string>>();

for (const [make, models] of Object.entries(vehicles)) {
  sourceModelsByMake.set(make, new Set(Object.keys(models)));
}
for (const entry of reviewedEntries) {
  const models = sourceModelsByMake.get(entry.make) ?? new Set<string>();
  models.add(entry.model);
  sourceModelsByMake.set(entry.make, models);
  for (const alias of entry.aliases ?? []) {
    aliasIndex.set(aliasKey(entry.make, alias, entry.year), {
      model: entry.model,
      variant: entry.variant
    });
  }
}
for (const entry of SPECIAL_VEHICLES) {
  const models = sourceModelsByMake.get(entry.make) ?? new Set<string>();
  models.add(entry.model);
  sourceModelsByMake.set(entry.make, models);
}

const canonicalBySourceKey = new Map<string, string>();
const sourceModelsByFamilyKey = new Map<string, string[]>();

const MODEL_FAMILY_ALIASES: Array<{
  make: string;
  pattern: RegExp;
  family: string;
}> = [
  {
    make: "Mazda",
    pattern: /^(?:mx-?5(?:\s+miata)?|miata|mazdaspeed\s+miata|spec\s+miata)\b/i,
    family: "MX-5 Miata"
  },
  { make: "Tesla", pattern: /^Model 3\b/i, family: "Model 3" },
  { make: "Tesla", pattern: /^Model S\b/i, family: "Model S" },
  { make: "Tesla", pattern: /^Model X\b/i, family: "Model X" },
  { make: "Tesla", pattern: /^Model Y\b/i, family: "Model Y" },
  { make: "Hyundai", pattern: /^Ioniq 5\b/i, family: "Ioniq 5" }
];

function entryKey(entry: Pick<ReviewedEntry, "make" | "model" | "year" | "variant">): string {
  return `${entry.make}\u0000${entry.model}\u0000${entry.year}\u0000${entry.variant ?? ""}`;
}

function familyKey(make: string, model: string): string {
  return `${make}\u0000${model}`;
}

function aliasKey(make: string, value: string, year: string): string {
  return `${make.trim().toLowerCase()}\u0000${value.trim().toLowerCase()}\u0000${year}`;
}

function cleanModel(model: string): string {
  return model.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeMakePrefix(make: string, model: string): string {
  const prefix = new RegExp(`^${escapeRegExp(make)}\\s+`, "i");
  return cleanModel(model).replace(prefix, "");
}

function parentheticalBase(model: string): string | null {
  const index = model.search(/\s+\(/);
  return index > 0 ? model.slice(0, index).trim() : null;
}

function alternatePartBase(model: string): string | null {
  const index = model.search(/\s+-\s+Alternate/i);
  return index > 0 ? model.slice(0, index).trim() : null;
}

function canonicalModel(make: string, sourceModel: string): string {
  const cleaned = removeMakePrefix(make, sourceModel);
  const alias = MODEL_FAMILY_ALIASES.find(
    (candidate) => candidate.make === make && candidate.pattern.test(cleaned)
  );
  if (alias) return alias.family;

  const sourceModels = sourceModelsByMake.get(make) ?? new Set<string>();
  const candidates = [...sourceModels]
    .map((candidate) => removeMakePrefix(make, candidate))
    .map((candidate) => parentheticalBase(candidate) ?? alternatePartBase(candidate) ?? candidate)
    .filter((candidate) => candidate.length >= 3 && candidate.toLowerCase() !== cleaned.toLowerCase())
    .filter((candidate, index, values) => values.indexOf(candidate) === index)
    .filter((candidate) => cleaned.toLowerCase().startsWith(`${candidate.toLowerCase()} `))
    .sort((left, right) => left.length - right.length);

  if (candidates[0]) return candidates[0];

  const firstToken = cleaned.split(/\s+/)[0];
  const siblingCount = [...sourceModels].filter((candidate) => {
    const sibling = removeMakePrefix(make, candidate).toLowerCase();
    return sibling.startsWith(`${firstToken.toLowerCase()} `);
  }).length;
  return firstToken.length >= 3 && siblingCount > 1 ? firstToken : cleaned;
}

for (const [make, sourceModels] of sourceModelsByMake) {
  const families = new Map<string, string[]>();
  for (const sourceModel of sourceModels) {
    const canonical = canonicalModel(make, sourceModel);
    canonicalBySourceKey.set(familyKey(make, sourceModel), canonical);
    const members = families.get(canonical) ?? [];
    members.push(sourceModel);
    families.set(canonical, members);
  }
  for (const [canonical, members] of families) {
    sourceModelsByFamilyKey.set(
      familyKey(make, canonical),
      [...new Set(members)].sort((left, right) => left.localeCompare(right))
    );
  }
}

function canonicalMake(make: string): string {
  return (
    [...sourceModelsByMake.keys()].find((candidate) => candidate.toLowerCase() === make.toLowerCase()) ?? make
  );
}

function sourceModelFamily(make: string, model: string): string {
  const canonicalMakeName = canonicalMake(make);
  return (
    canonicalBySourceKey.get(familyKey(canonicalMakeName, model)) ??
    canonicalModel(canonicalMakeName, model)
  );
}

function sourceModelsFor(make: string, model: string): string[] {
  const canonicalMakeName = canonicalMake(make);
  const canonical = sourceModelFamily(canonicalMakeName, model);
  return sourceModelsByFamilyKey.get(familyKey(canonicalMakeName, canonical)) ?? [model];
}

function numericYear(year: string): number | null {
  return /^\d{4}$/.test(year) ? Number(year) : null;
}

function yearKeyHasOlderVehicle(yearKey: string): boolean {
  if (yearKey === "all") return true;
  if (/^\d{4}$/.test(yearKey)) return Number(yearKey) < 1990;
  if (/^\d{4}-\d{4}$/.test(yearKey)) return Number(yearKey.slice(0, 4)) < 1990;
  if (/^\d{4}-any$/.test(yearKey)) return Number(yearKey.slice(0, 4)) < 1990;
  if (/^any-\d{4}$/.test(yearKey)) return Number(yearKey.slice(4)) < 1990;
  return false;
}

function yearKeyApplies(yearKey: string, selectedYear: string): boolean {
  if (selectedYear === "older") return yearKeyHasOlderVehicle(yearKey);
  const year = numericYear(selectedYear);
  if (year === null) return false;
  if (yearKey === "all") return true;
  if (yearKey === selectedYear) return true;
  if (/^\d{4}-\d{4}$/.test(yearKey)) {
    const [start, end] = yearKey.split("-").map(Number);
    return year >= start && year <= end;
  }
  if (/^\d{4}-any$/.test(yearKey)) return year >= Number(yearKey.slice(0, 4));
  if (/^any-\d{4}$/.test(yearKey)) return year <= Number(yearKey.slice(4));
  return false;
}

function hasRawVehicleData(make: string, sourceModel: string, year: string): boolean {
  return Object.keys(vehicles[make]?.[sourceModel] ?? {}).some((yearKey) =>
    yearKeyApplies(yearKey, year)
  );
}

function hasRawYearSpecificVariant(make: string, sourceModel: string, year: string): boolean {
  return Object.keys(vehicles[make]?.[sourceModel] ?? {}).some(
    (yearKey) => yearKey !== "all" && yearKeyApplies(yearKey, year)
  );
}

function reviewedEntryMatchesSourceModel(
  entry: ReviewedEntry,
  make: string,
  sourceModel: string,
  family: string,
  year: string
): boolean {
  if (entry.make !== make || entry.model !== family || entry.year !== year) return false;
  if (!entry.variant) return true;
  const normalizedSource = sourceModel.trim().toLowerCase();
  return [entry.variant, ...(entry.aliases ?? [])].some(
    (candidate) => candidate.trim().toLowerCase() === normalizedSource
  );
}

function hasFamilyData(make: string, family: string, year: string): boolean {
  const canonicalMakeName = canonicalMake(make);
  return (
    reviewedVariantsFor(canonicalMakeName, family, year).length > 0 ||
    SPECIAL_VEHICLES.some(
      (entry) => entry.make === canonicalMakeName && entry.model === family && year !== ""
    ) ||
    (canonicalMakeName === NOC_MAKE && year !== "")
  );
}

function hasVehicleData(make: string, sourceModel: string, year: string): boolean {
  const canonicalMakeName = canonicalMake(make);
  const family = sourceModelFamily(canonicalMakeName, sourceModel);
  return (
    hasRawVehicleData(canonicalMakeName, sourceModel, year) ||
    reviewedEntries.some((entry) =>
      reviewedEntryMatchesSourceModel(entry, canonicalMakeName, sourceModel, family, year)
    ) ||
    SPECIAL_VEHICLES.some(
      (entry) => entry.make === canonicalMakeName && entry.model === family && year !== ""
    ) ||
    (canonicalMakeName === NOC_MAKE && year !== "")
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function variantLabel(make: string, canonical: string, sourceModel: string): string {
  if (sourceModel === canonical) return "Base / standard listing";
  const displayModel = removeMakePrefix(make, sourceModel);
  const canonicalPrefix = new RegExp(`^${escapeRegExp(canonical)}\\s*`, "i");
  const remainder = displayModel.replace(canonicalPrefix, "").trim();
  return (remainder || displayModel).replace(/^\((.*)\)$/, "$1");
}

function addVariant(
  variants: Map<string, VehicleVariant>,
  value: string,
  label: string,
  aliases: string[] = []
) {
  const names = [value, label, ...aliases].map((item) => item.trim().toLowerCase());
  if ([...variants.values()].some((variant) => names.includes(variant.value.trim().toLowerCase()))) {
    return;
  }
  variants.set(value.toLowerCase(), { value, label });
}

function reviewedVariantsFor(make: string, family: string, year: string): ReviewedEntry[] {
  return reviewedEntries.filter(
    (entry) => entry.make === make && entry.model === family && entry.year === year
  );
}

export function getMakes(year = ""): string[] {
  const makes = [...sourceModelsByMake.entries()]
    .filter(([make, models]) =>
      !year ||
      [...models].some(
        (model) => hasVehicleData(make, model, year) || hasFamilyData(make, sourceModelFamily(make, model), year)
      )
    )
    .map(([make]) => make);

  if (year) {
    makes.push(NOC_MAKE, "Formula SAE");
  }
  return uniqueSorted(makes);
}

export function getModels(make: string, year = ""): string[] {
  const canonicalMakeName = canonicalMake(make);
  if (canonicalMakeName === "Formula SAE") return ["Formula SAE"];

  return uniqueSorted(
    [...(sourceModelsByMake.get(canonicalMakeName) ?? [])]
      .filter(
        (model) =>
          !year ||
          hasVehicleData(canonicalMakeName, model, year) ||
          hasFamilyData(canonicalMakeName, sourceModelFamily(canonicalMakeName, model), year)
      )
      .map((model) => sourceModelFamily(canonicalMakeName, model))
  );
}

export function getYears(make = "", model = ""): string[] {
  if (!make && !model) return [...SELECTOR_YEARS];

  const canonicalMakeName = canonicalMake(make);
  const canonicalModelName = model ? sourceModelFamily(canonicalMakeName, model) : "";
  const sourceModels = model
    ? sourceModelsFor(canonicalMakeName, canonicalModelName)
    : [...(sourceModelsByMake.get(canonicalMakeName) ?? [])];
  return SELECTOR_YEARS.filter((year) =>
    sourceModels.some(
      (sourceModel) =>
        hasVehicleData(canonicalMakeName, sourceModel, year) ||
        hasFamilyData(canonicalMakeName, sourceModelFamily(canonicalMakeName, sourceModel), year)
    )
  );
}

export function getVehicleVariants(
  make: string,
  model: string,
  year: string
): VehicleVariant[] {
  const canonicalMakeName = canonicalMake(make);
  const canonical = sourceModelFamily(canonicalMakeName, model);
  const variants = new Map<string, VehicleVariant>();

  for (const entry of reviewedVariantsFor(canonicalMakeName, canonical, year)) {
    addVariant(variants, entry.variant ?? entry.model, entry.variant ?? "Base / standard listing", entry.aliases);
  }
  for (const sourceModel of sourceModelsFor(canonicalMakeName, canonical)) {
    const hasReviewedSourceVariant = reviewedVariantsFor(canonicalMakeName, canonical, year).some(
      (entry) => matchesVariant(entry, sourceModel)
    );
    if (
      (year === "older" ? hasVehicleData(canonicalMakeName, sourceModel, year) : hasRawYearSpecificVariant(canonicalMakeName, sourceModel, year)) ||
      hasReviewedSourceVariant
    ) {
      const reviewed = reviewedVariantsFor(canonicalMakeName, canonical, year).find((entry) =>
        matchesVariant(entry, sourceModel)
      );
      addVariant(
        variants,
        reviewed?.variant ?? sourceModel,
        reviewed?.variant ?? variantLabel(canonicalMakeName, canonical, sourceModel),
        reviewed?.aliases
      );
    }
  }
  for (const entry of SPECIAL_VEHICLES) {
    if (entry.make === canonicalMakeName && entry.model === canonical) {
      addVariant(variants, entry.variant, entry.variant);
    }
  }

  if (variants.size <= 1) return [];

  return [...variants.values()].sort((left, right) => {
    if (left.value === canonical) return -1;
    if (right.value === canonical) return 1;
    const leftBase = /^(?:base|non-|standard)/i.test(left.label) ? 0 : 1;
    const rightBase = /^(?:base|non-|standard)/i.test(right.label) ? 0 : 1;
    if (leftBase !== rightBase) return leftBase - rightBase;
    return left.label.localeCompare(right.label);
  });
}

function matchesVariant(entry: ReviewedEntry, requested: string): boolean {
  const normalized = requested.trim().toLowerCase();
  return [entry.variant ?? "", entry.model, ...(entry.aliases ?? [])].some(
    (candidate) => candidate.trim().toLowerCase() === normalized
  );
}

function findReviewedEntry(selection: VehicleSelection): ReviewedEntry | null {
  const make = canonicalMake(selection.make);
  const alias = aliasIndex.get(aliasKey(make, selection.model, selection.year));
  const family = alias?.model ?? sourceModelFamily(make, selection.model);
  const entries = reviewedVariantsFor(make, family, selection.year);
  const requestedVariant = alias?.variant ?? selection.variant;

  if (requestedVariant) return entries.find((entry) => matchesVariant(entry, requestedVariant)) ?? null;
  return getVehicleVariants(make, family, selection.year).length <= 1 && entries.length === 1
    ? entries[0]
    : null;
}

export function resolveVehicleSelection(selection: VehicleSelection): VehicleSelection {
  if (selection.notListed || !selection.make || !selection.model || !selection.year) return selection;

  const make = canonicalMake(selection.make);
  const alias = aliasIndex.get(aliasKey(make, selection.model, selection.year));
  const model = alias?.model ?? sourceModelFamily(make, selection.model);
  return {
    ...selection,
    make,
    model,
    variant: alias?.variant ?? selection.variant,
    notListed: false,
    manualDescription: undefined
  };
}

export function getVehicleMapping(selection: VehicleSelection): VehicleMapping | null {
  if (selection.notListed) return null;

  const resolved = resolveVehicleSelection(selection);
  const reviewed = findReviewedEntry(resolved);
  if (reviewed) {
    const current = currentOverrideIndex.get(entryKey(reviewed));
    return {
      selection: {
        make: reviewed.make,
        model: reviewed.model,
        year: reviewed.year,
        variant: reviewed.variant
      },
      classes: reviewed.classes.map((classId) => classId.toLowerCase()),
      source: current ? "2026-current-override" : "2026-street-overlay",
      coverage: current?.coverage ?? "street-only",
      sourceNote: reviewed.sourceNote
    };
  }

  const special = SPECIAL_VEHICLES.find(
    (entry) =>
      entry.make === resolved.make &&
      entry.model === resolved.model &&
      (!resolved.variant || entry.variant === resolved.variant)
  );
  if (special) {
    return {
      selection: { ...resolved, variant: special.variant },
      classes: special.classes,
      source: "2026-current-override",
      coverage: "verified-classes",
      sourceNote: special.sourceNote
    };
  }

  // The broad catalog is used for selection only. A class is returned only
  // when this repository has a reviewed first-party placement for the exact vehicle.
  return null;
}

export function searchVehicles(query: string, limit = 20): VehicleSelection[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const results: VehicleSelection[] = [];
  const seen = new Set<string>();

  for (const make of getMakes()) {
    for (const model of getModels(make)) {
      for (const year of getYears(make, model)) {
        const variants = getVehicleVariants(make, model, year);
        const choices = variants.length > 0 ? variants : [{ value: model, label: model }];
        for (const variant of choices) {
          const label = `${make} ${model} ${variant.label} ${year}`.toLowerCase();
          if (!label.includes(normalized)) continue;
          const result = {
            make,
            model,
            year,
            variant: variants.length > 0 ? variant.value : undefined
          };
          const resultKey = JSON.stringify(result);
          if (seen.has(resultKey)) continue;
          results.push(result);
          seen.add(resultKey);
          if (results.length >= limit) return results;
        }
      }
    }
  }
  return results;
}

export function vehicleSelectionLabel(selection: VehicleSelection): string {
  if (selection.notListed) return selection.manualDescription || "Vehicle not listed";
  const displayVariant = selection.variant?.toLowerCase().startsWith(`${selection.model.toLowerCase()} `)
    ? selection.variant.slice(selection.model.length).trim()
    : selection.variant;
  return [selection.year, selection.make, selection.model, displayVariant]
    .filter(Boolean)
    .join(" ");
}
