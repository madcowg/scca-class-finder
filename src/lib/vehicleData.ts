import productionCatalog from "../data/vehicles.production.json";
import rawVehicles from "../data/vehicles.generated.json";
import { CURRENT_MAPPING_OVERRIDES, STREET_OVERLAYS_2026 } from "../data/overrides2026";
import type { VehicleMapping, VehicleSelection, VehicleVariant } from "./types";

type ProductionVehicles = Record<string, Record<string, Record<string, string[]>>>;
type RawVehicles = Record<string, Record<string, Record<string, string[]>>>;
type ReviewedEntry = (typeof STREET_OVERLAYS_2026)[number] | (typeof CURRENT_MAPPING_OVERRIDES)[number];

const productionVehicles = productionCatalog as ProductionVehicles;
const vehicles = rawVehicles as RawVehicles;
const reviewedEntries: ReviewedEntry[] = [
  ...STREET_OVERLAYS_2026,
  ...CURRENT_MAPPING_OVERRIDES
];

const SELECTOR_YEARS = [
  ...Array.from({ length: 2026 - 1990 + 1 }, (_, index) => String(2026 - index)),
  "older"
];

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
    sourceNote:
      "Formula SAE is a separate supplemental path; it is not forced into a principal Street through Modified class."
  }
];

const MAKE_ALIASES = new Map([
  ["mercedes", "Mercedes-Benz"],
  ["mercedes benz", "Mercedes-Benz"],
  ["mini", "MINI"],
  ["rolls royce", "Rolls-Royce"]
]);
const NON_MAKE_SELECTOR_ENTRIES = new Set(["NOC (Not Otherwise Classified)"]);

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
  { make: "Mazda", pattern: /^mazda\s*3\b/i, family: "Mazda3" },
  { make: "Mazda", pattern: /^mazda\s*6\b/i, family: "Mazda6" },
  { make: "Tesla", pattern: /^Model 3\b/i, family: "Model 3" },
  { make: "Tesla", pattern: /^Model S\b/i, family: "Model S" },
  { make: "Tesla", pattern: /^Model X\b/i, family: "Model X" },
  { make: "Tesla", pattern: /^Model Y\b/i, family: "Model Y" },
  { make: "Aston Martin", pattern: /^(?:V8|V12)\s+Vantage\b/i, family: "Vantage" },
  { make: "Hyundai", pattern: /^Ioniq 5\b/i, family: "Ioniq 5" },
  { make: "Toyota", pattern: /^GR\s*86\b/i, family: "GR86" },
  { make: "Volkswagen", pattern: /^(?:Golf|GTI)\b/i, family: "Golf" },
  { make: "Volkswagen", pattern: /^GLI\b/i, family: "Jetta" }
];

const allMakeNames = new Set<string>([
  ...Object.values(productionVehicles)
    .flatMap((makes) => Object.keys(makes))
    .map(normalizeMakeName),
  ...Object.keys(vehicles).map(normalizeMakeName),
  ...reviewedEntries.map((entry) => normalizeMakeName(entry.make)),
  ...SPECIAL_VEHICLES.map((entry) => entry.make)
]);

const currentOverrideIndex = new Map(
  CURRENT_MAPPING_OVERRIDES.map((entry) => [entryKey(entry), entry])
);

function entryKey(entry: Pick<ReviewedEntry, "make" | "model" | "year" | "variant">): string {
  return `${entry.make}\u0000${entry.model}\u0000${entry.year}\u0000${entry.variant ?? ""}`;
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalized(value: string): string {
  return clean(value).toLowerCase();
}

function normalizeMakeName(make: string): string {
  return MAKE_ALIASES.get(normalized(make)) ?? clean(make);
}

function canonicalMake(make: string): string {
  const normalizedMake = normalizeMakeName(make);
  return (
    [...allMakeNames].find((candidate) => normalized(candidate) === normalized(normalizedMake)) ??
    normalizedMake
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeMakePrefix(make: string, model: string): string {
  const prefixes = [
    make,
    ...[...MAKE_ALIASES.entries()]
      .filter(([, canonical]) => canonical === make)
      .map(([alias]) => alias)
  ];
  let cleaned = clean(model);
  for (const prefix of prefixes) {
    cleaned = cleaned.replace(new RegExp(`^${escapeRegExp(prefix)}\\s+`, "i"), "");
  }
  return cleaned;
}

function yearKeyHasOlderVehicle(yearKey: string): boolean {
  if (yearKey === "all") return true;
  if (/^\d{4}$/.test(yearKey)) return Number(yearKey) < 1990;
  if (/^\d{4}-\d{4}$/.test(yearKey)) return Number(yearKey.slice(0, 4)) < 1990;
  if (/^\d{4}-any$/.test(yearKey)) return Number(yearKey.slice(0, 4)) < 1990;
  if (/^any-\d{4}$/.test(yearKey)) return Number(yearKey.slice(4)) < 1990;
  return false;
}

function explicitYearKeyApplies(yearKey: string, selectedYear: string): boolean {
  if (yearKey === "all") return false;
  if (yearKey === selectedYear) return true;
  const year = Number(selectedYear);
  if (!Number.isInteger(year)) return false;
  if (/^\d{4}-\d{4}$/.test(yearKey)) {
    const [start, end] = yearKey.split("-").map(Number);
    return year >= start && year <= end;
  }
  if (/^\d{4}-any$/.test(yearKey)) return year >= Number(yearKey.slice(0, 4));
  if (/^any-\d{4}$/.test(yearKey)) return year <= Number(yearKey.slice(4));
  return false;
}

function rawMakeEntries(make: string): Record<string, Record<string, string[]>> {
  const rawMake = Object.keys(vehicles).find(
    (candidate) => canonicalMake(candidate) === canonicalMake(make)
  );
  return rawMake ? vehicles[rawMake] : {};
}

function rawSourceModelsForYear(make: string, year: string): string[] {
  return Object.entries(rawMakeEntries(make))
    .filter(([, yearEntries]) =>
      Object.keys(yearEntries).some((yearKey) =>
        year === "older"
          ? yearKeyHasOlderVehicle(yearKey)
          : explicitYearKeyApplies(yearKey, year)
      )
    )
    .map(([model]) => model);
}

function olderSourceModelIsEligible(make: string, model: string): boolean {
  const identity = `${make} ${model}`;
  if (/\b(?:pickup|pick-up|truck|suv|minivan|van)\b/i.test(identity)) return false;
  if (/^Geo\s+Tracker\b/i.test(identity)) return false;
  if (/^Jeep\s+CJ(?:\b|-|\d)/i.test(identity)) return false;
  if (/^MINI\s+Countryman\b/i.test(identity) && !/\b(?:JCW|John Cooper Works)\b/i.test(identity)) {
    return false;
  }
  if (/^Nissan\s+Juke\b/i.test(identity)) return false;
  if (/^Scion\s+(?:iQ|xB)\b/i.test(identity)) return false;
  if (/^Subaru\s+Forester\b/i.test(identity)) return false;
  if (/^Suzuki\s+(?:Samurai|Sidekick)\b/i.test(identity)) return false;
  return true;
}

function rawCanonicalFamily(make: string, sourceModel: string): string {
  const cleaned = removeMakePrefix(make, sourceModel);
  const alias = MODEL_FAMILY_ALIASES.find(
    (candidate) => candidate.make === make && candidate.pattern.test(cleaned)
  );
  if (alias) return alias.family;

  const base = cleaned.match(/^(.+?)\s+\(/)?.[1] ?? cleaned.match(/^(.+?)\s+-\s+Alternate/i)?.[1];
  if (base) return base;

  const firstToken = cleaned.split(/\s+/)[0];
  const siblingCount = Object.keys(rawMakeEntries(make)).filter((candidate) =>
    removeMakePrefix(make, candidate).toLowerCase().startsWith(`${firstToken.toLowerCase()} `)
  ).length;
  return firstToken.length >= 3 && siblingCount > 1 ? firstToken : cleaned;
}

function productionMakeKey(make: string, year: string): string | undefined {
  const canonicalMakeName = canonicalMake(make);
  return Object.keys(productionVehicles[year] ?? {}).find(
    (candidate) => normalizeMakeName(candidate) === canonicalMakeName
  );
}

function productionModelsFor(make: string, year: string): string[] {
  const makeKey = productionMakeKey(make, year);
  if (!makeKey) return [];
  return Object.keys(productionVehicles[year]?.[makeKey] ?? {});
}

function reviewedFamily(entry: ReviewedEntry): string {
  if (entry.make === "BMW" && entry.model === "M240i") return "2 Series";
  return entry.model;
}

function familiesForYear(make: string, year: string): string[] {
  const canonicalMakeName = canonicalMake(make);
  const families = new Set(productionModelsFor(canonicalMakeName, year));

  for (const entry of reviewedEntries) {
    if (canonicalMake(entry.make) === canonicalMakeName && entry.year === year) {
      families.add(reviewedFamily(entry));
    }
  }

  if (year === "older") {
    for (const sourceModel of rawSourceModelsForYear(canonicalMakeName, year)) {
      if (!olderSourceModelIsEligible(canonicalMakeName, sourceModel)) continue;
      const family = familyForSourceModel(canonicalMakeName, sourceModel, year, [...families]);
      families.add(family);
    }
  }

  return uniqueSorted([...families]);
}

function familyForSourceModel(
  make: string,
  sourceModel: string,
  year: string,
  availableFamilies = familiesForYearWithoutRaw(make, year)
): string {
  const canonicalMakeName = canonicalMake(make);
  const cleaned = removeMakePrefix(canonicalMakeName, sourceModel);
  const alias = MODEL_FAMILY_ALIASES.find(
    (candidate) => candidate.make === canonicalMakeName && candidate.pattern.test(cleaned)
  );
  if (alias && availableFamilies.some((family) => normalized(family) === normalized(alias.family))) {
    return availableFamilies.find((family) => normalized(family) === normalized(alias.family))!;
  }

  const matchingReviewed = reviewedEntries.find(
    (entry) =>
      canonicalMake(entry.make) === canonicalMakeName &&
      entry.year === year &&
      [entry.model, entry.variant ?? "", ...(entry.aliases ?? [])].some((candidate) =>
        normalized(cleaned).startsWith(normalized(candidate))
      )
  );
  if (matchingReviewed) return reviewedFamily(matchingReviewed);

  const anchored = availableFamilies
    .filter((family) => {
      const source = normalized(cleaned);
      const candidate = normalized(family);
      const boundary = source[candidate.length] ?? "";
      return (
        source === candidate ||
        (source.startsWith(candidate) && boundary !== "" && !/[a-z0-9]/i.test(boundary))
      );
    })
    .sort((left, right) => right.length - left.length)[0];

  return anchored ?? rawCanonicalFamily(canonicalMakeName, sourceModel);
}

function familiesForYearWithoutRaw(make: string, year: string): string[] {
  const canonicalMakeName = canonicalMake(make);
  const families = new Set(productionModelsFor(canonicalMakeName, year));
  for (const entry of reviewedEntries) {
    if (canonicalMake(entry.make) === canonicalMakeName && entry.year === year) {
      families.add(reviewedFamily(entry));
    }
  }
  return [...families];
}

function canonicalModel(make: string, model: string, year: string): string {
  const families = familiesForYear(make, year);
  return (
    families.find((candidate) => normalized(candidate) === normalized(model)) ??
    familyForSourceModel(make, model, year, families)
  );
}

function reviewedVariantsFor(make: string, family: string, year: string): ReviewedEntry[] {
  const canonicalMakeName = canonicalMake(make);
  return reviewedEntries.filter(
    (entry) =>
      canonicalMake(entry.make) === canonicalMakeName &&
      entry.year === year &&
      normalized(reviewedFamily(entry)) === normalized(family)
  );
}

function variantLabel(make: string, family: string, sourceModel: string): string {
  const displayModel = removeMakePrefix(make, sourceModel);
  const familyPrefix = new RegExp(`^${escapeRegExp(family)}\\s*`, "i");
  const remainder = displayModel.replace(familyPrefix, "").trim();
  return (remainder || displayModel).replace(/^\((.*)\)$/, "$1");
}

function addVariant(
  variants: Map<string, VehicleVariant>,
  value: string,
  label: string,
  aliases: string[] = []
) {
  const names = [value, label, ...aliases].map(normalized);
  if (
    [...variants.values()].some(
      (variant) => names.includes(normalized(variant.value)) || names.includes(normalized(variant.label))
    )
  ) {
    return;
  }
  variants.set(normalized(value), { value, label });
}

function variantMatchesEntry(
  entry: ReviewedEntry,
  requested: string,
  family: string
): boolean {
  const target = normalized(requested);
  const withoutFamily = normalized(
    requested.replace(new RegExp(`^${escapeRegExp(family)}\\s*`, "i"), "")
  );
  if (
    normalized(entry.model) === normalized(family) &&
    /^(?:including|incl\.?)\b/i.test(entry.variant ?? "") &&
    (target === normalized(family) || target.startsWith(`${normalized(family)} `))
  ) {
    return true;
  }
  return [entry.variant ?? "", ...(entry.aliases ?? [])].some((candidate) => {
    const name = normalized(candidate);
    return (
      target === name ||
      withoutFamily === name ||
      target.startsWith(`${name} `) ||
      withoutFamily.startsWith(`${name} `) ||
      (withoutFamily.length > 1 && name.startsWith(`${withoutFamily} `))
    );
  });
}

function productionVariantsFor(make: string, family: string, year: string): string[] {
  const makeKey = productionMakeKey(make, year);
  if (!makeKey) return [];
  return productionVehicles[year]?.[makeKey]?.[family] ?? [];
}

export function getMakes(year = ""): string[] {
  if (!year) {
    return uniqueSorted(
      [...allMakeNames].filter((make) => !NON_MAKE_SELECTOR_ENTRIES.has(make))
    );
  }
  if (year === "older") {
    return uniqueSorted([
      ...Object.keys(vehicles)
        .filter(
          (make) =>
            !NON_MAKE_SELECTOR_ENTRIES.has(normalizeMakeName(make)) &&
            rawSourceModelsForYear(make, "older").some((model) =>
              olderSourceModelIsEligible(normalizeMakeName(make), model)
            )
        )
        .map(normalizeMakeName),
      ...SPECIAL_VEHICLES.map((entry) => entry.make)
    ]);
  }

  const makes = new Set(Object.keys(productionVehicles[year] ?? {}).map(normalizeMakeName));
  for (const entry of reviewedEntries) {
    if (entry.year === year) makes.add(canonicalMake(entry.make));
  }
  for (const entry of SPECIAL_VEHICLES) makes.add(entry.make);
  return uniqueSorted([...makes]);
}

export function getModels(make: string, year = ""): string[] {
  const canonicalMakeName = canonicalMake(make);
  if (canonicalMakeName === "Formula SAE") return ["Formula SAE"];
  if (year) return familiesForYear(canonicalMakeName, year);

  const models = new Set<string>();
  for (const selectorYear of SELECTOR_YEARS) {
    for (const model of familiesForYear(canonicalMakeName, selectorYear)) models.add(model);
  }
  return uniqueSorted([...models]);
}

export function getYears(make = "", model = ""): string[] {
  if (!make && !model) return [...SELECTOR_YEARS];
  const canonicalMakeName = canonicalMake(make);
  return SELECTOR_YEARS.filter((year) => {
    if (!getMakes(year).includes(canonicalMakeName)) return false;
    return !model || familiesForYear(canonicalMakeName, year).some(
      (family) => normalized(family) === normalized(model)
    );
  });
}

export function getVehicleVariants(
  make: string,
  model: string,
  year: string
): VehicleVariant[] {
  const canonicalMakeName = canonicalMake(make);
  const family = canonicalModel(canonicalMakeName, model, year);
  const variants = new Map<string, VehicleVariant>();
  const reviewed = reviewedVariantsFor(canonicalMakeName, family, year);

  for (const entry of reviewed) {
    addVariant(
      variants,
      entry.variant ?? entry.model,
      entry.variant ?? "Base / standard listing",
      entry.aliases
    );
  }

  for (const productionVariant of productionVariantsFor(canonicalMakeName, family, year)) {
    const matches = reviewed.filter((entry) =>
      variantMatchesEntry(entry, productionVariant, family)
    );
    if (matches.length === 1) continue;
    if (reviewed.length > 0 && normalized(productionVariant) === normalized(family)) continue;
    addVariant(
      variants,
      productionVariant,
      variantLabel(canonicalMakeName, family, productionVariant)
    );
  }

  if (year === "older") {
    for (const sourceModel of rawSourceModelsForYear(canonicalMakeName, year)) {
      if (!olderSourceModelIsEligible(canonicalMakeName, sourceModel)) continue;
      if (
        normalized(familyForSourceModel(canonicalMakeName, sourceModel, year)) !==
        normalized(family)
      ) {
        continue;
      }
      addVariant(
        variants,
        sourceModel,
        variantLabel(canonicalMakeName, family, sourceModel)
      );
    }
  }

  for (const entry of SPECIAL_VEHICLES) {
    if (entry.make === canonicalMakeName && entry.model === family) {
      addVariant(variants, entry.variant, entry.variant);
    }
  }

  if (variants.size === 0) return [];
  if (variants.size === 1) {
    const onlyVariant = [...variants.values()][0];
    if (normalized(onlyVariant.value) === normalized(family)) return [];
  }
  return [...variants.values()].sort((left, right) => {
    const leftBase = /^(?:base|non-|standard)/i.test(left.label) ? 0 : 1;
    const rightBase = /^(?:base|non-|standard)/i.test(right.label) ? 0 : 1;
    if (leftBase !== rightBase) return leftBase - rightBase;
    return left.label.localeCompare(right.label);
  });
}

function findReviewedEntry(selection: VehicleSelection): ReviewedEntry | null {
  const make = canonicalMake(selection.make);
  const family = canonicalModel(make, selection.model, selection.year);
  const entries = reviewedVariantsFor(make, family, selection.year);
  if (entries.length === 0) return null;

  if (selection.variant) {
    const matches = entries.filter((entry) =>
      variantMatchesEntry(entry, selection.variant!, family)
    );
    return matches.length === 1 ? matches[0] : null;
  }

  return getVehicleVariants(make, family, selection.year).length === 0 && entries.length === 1
    ? entries[0]
    : null;
}

export function resolveVehicleSelection(selection: VehicleSelection): VehicleSelection {
  if (selection.notListed || !selection.make || !selection.model || !selection.year) return selection;
  const make = canonicalMake(selection.make);
  const directMatches = reviewedEntries.filter(
    (entry) =>
      canonicalMake(entry.make) === make &&
      entry.year === selection.year &&
      [entry.model, ...(entry.aliases ?? [])].some(
        (candidate) => normalized(candidate) === normalized(selection.model)
      )
  );
  const directEntry = directMatches.length === 1 ? directMatches[0] : undefined;
  const model = directEntry
    ? reviewedFamily(directEntry)
    : canonicalModel(make, selection.model, selection.year);
  return {
    ...selection,
    make,
    model,
    variant: selection.variant ?? directEntry?.variant,
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

  return null;
}

export function searchVehicles(query: string, limit = 20): VehicleSelection[] {
  const target = normalized(query);
  if (!target) return [];
  const results: VehicleSelection[] = [];

  for (const year of SELECTOR_YEARS) {
    for (const make of getMakes(year)) {
      for (const model of getModels(make, year)) {
        const variants = getVehicleVariants(make, model, year);
        const choices = variants.length > 0 ? variants : [{ value: "", label: "" }];
        for (const variant of choices) {
          if (!normalized(`${year} ${make} ${model} ${variant.label}`).includes(target)) continue;
          results.push({
            make,
            model,
            year,
            variant: variant.value || undefined
          });
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
