import rawVehicles from "../data/vehicles.generated.json";
import { CURRENT_MAPPING_OVERRIDES, STREET_OVERLAYS_2026 } from "../data/overrides2026";
import type { VehicleMapping, VehicleSelection, VehicleVariant } from "./types";

type RawVehicles = Record<string, Record<string, Record<string, string[]>>>;
const vehicles = rawVehicles as RawVehicles;

const currentOverrideIndex = new Map(
  CURRENT_MAPPING_OVERRIDES.map((entry) => [key(entry.make, entry.model, entry.year), entry])
);
const overlayIndex = new Map(
  STREET_OVERLAYS_2026.map((entry) => [key(entry.make, entry.model, entry.year), entry])
);
const aliasIndex = new Map<string, VehicleSelection>();

const sourceModelsByMake = new Map<string, Set<string>>();
for (const [make, models] of Object.entries(vehicles)) {
  sourceModelsByMake.set(make, new Set(Object.keys(models)));
}
for (const entry of [...STREET_OVERLAYS_2026, ...CURRENT_MAPPING_OVERRIDES]) {
  const models = sourceModelsByMake.get(entry.make) ?? new Set<string>();
  models.add(entry.model);
  sourceModelsByMake.set(entry.make, models);
  for (const alias of entry.aliases ?? []) {
    aliasIndex.set(key(entry.make, alias, entry.year), {
      make: entry.make,
      model: entry.model,
      year: entry.year
    });
  }
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
  {
    make: "Tesla",
    pattern: /^Model 3\b/i,
    family: "Model 3"
  },
  {
    make: "Tesla",
    pattern: /^Model S\b/i,
    family: "Model S"
  },
  {
    make: "Tesla",
    pattern: /^Model X\b/i,
    family: "Model X"
  },
  {
    make: "Tesla",
    pattern: /^Model Y\b/i,
    family: "Model Y"
  }
];

function key(make: string, model: string, year: string): string {
  return `${make}\u0000${model}\u0000${year}`;
}

function familyKey(make: string, model: string): string {
  return `${make}\u0000${model}`;
}

function cleanModel(model: string): string {
  return model.replace(/\s+/g, " ").trim();
}

function removeMakePrefix(make: string, model: string): string {
  const prefix = new RegExp(`^${escapeRegExp(make)}\\s+`, "i");
  return cleanModel(model).replace(prefix, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parentheticalBase(model: string): string | null {
  const index = model.search(/\s+\(/);
  if (index <= 0) return null;
  return model.slice(0, index).trim();
}

function alternatePartBase(model: string): string | null {
  const index = model.search(/\s+-\s+Alternate/i);
  if (index <= 0) return null;
  return model.slice(0, index).trim();
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

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function sourceModelFamily(make: string, model: string): string {
  return canonicalBySourceKey.get(familyKey(make, model)) ?? canonicalModel(make, model);
}

function sourceModelsFor(make: string, model: string): string[] {
  const canonical = sourceModelFamily(make, model);
  return sourceModelsByFamilyKey.get(familyKey(make, canonical)) ?? [model];
}

function yearKeyApplies(yearKey: string, selectedYear: string): boolean {
  if (yearKey === "all" || yearKey === selectedYear) return true;
  if (!/^\d{4}$/.test(selectedYear)) return false;
  if (/^\d{4}-\d{4}$/.test(yearKey)) {
    const [start, end] = yearKey.split("-").map(Number);
    const year = Number(selectedYear);
    return year >= start && year <= end;
  }
  if (/^\d{4}-any$/.test(yearKey)) return Number(selectedYear) >= Number(yearKey.slice(0, 4));
  if (/^any-\d{4}$/.test(yearKey)) return Number(selectedYear) <= Number(yearKey.slice(4));
  return false;
}

function hasVehicleData(make: string, sourceModel: string, year: string): boolean {
  return Boolean(
    currentOverrideIndex.has(key(make, sourceModel, year)) ||
      overlayIndex.has(key(make, sourceModel, year)) ||
      Object.keys(vehicles[make]?.[sourceModel] ?? {}).some((yearKey) =>
        yearKeyApplies(yearKey, year)
      )
  );
}

function sortYears(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => {
    const numericA = /^\d{4}$/.test(a) ? Number(a) : null;
    const numericB = /^\d{4}$/.test(b) ? Number(b) : null;
    if (numericA !== null && numericB !== null) return numericB - numericA;
    if (numericA !== null) return -1;
    if (numericB !== null) return 1;
    if (a === "all") return 1;
    if (b === "all") return -1;
    return a.localeCompare(b);
  });
}

function variantLabel(make: string, canonical: string, sourceModel: string): string {
  if (sourceModel === canonical) return "Base / standard listing";
  const displayModel = removeMakePrefix(make, sourceModel);
  const canonicalPrefix = new RegExp(`^${escapeRegExp(canonical)}\\s*`, "i");
  const remainder = displayModel.replace(canonicalPrefix, "").trim();
  const label = remainder || displayModel;
  return label.replace(/^\((.*)\)$/, "$1");
}

function sourceModelForSelection(selection: VehicleSelection): string | null {
  if (selection.variant && hasVehicleData(selection.make, selection.variant, selection.year)) {
    return selection.variant;
  }
  const canonical = sourceModelFamily(selection.make, selection.model);
  const members = sourceModelsFor(selection.make, canonical);
  if (selection.variant && members.includes(selection.variant)) {
    return hasVehicleData(selection.make, selection.variant, selection.year)
      ? selection.variant
      : null;
  }
  if (members.includes(selection.model) && hasVehicleData(selection.make, selection.model, selection.year)) {
    return selection.model;
  }
  if (members.includes(canonical) && hasVehicleData(selection.make, canonical, selection.year)) {
    return canonical;
  }
  const active = members.filter((model) => hasVehicleData(selection.make, model, selection.year));
  return active.length === 1 ? active[0] : null;
}

export function getMakes(year = ""): string[] {
  return uniqueSorted(
    [...sourceModelsByMake.entries()]
      .filter(([make, models]) => !year || [...models].some((model) => hasMakeVehicleData(make, model, year)))
      .map(([make]) => make)
  );
}

function hasMakeVehicleData(make: string, sourceModel: string, year: string): boolean {
  return Boolean(
    currentOverrideIndex.has(key(make, sourceModel, year)) ||
      overlayIndex.has(key(make, sourceModel, year)) ||
      Object.keys(vehicles[make]?.[sourceModel] ?? {}).some((yearKey) =>
        yearKeyApplies(yearKey, year)
      )
  );
}

export function getModels(make: string, year = ""): string[] {
  return uniqueSorted(
    [...(sourceModelsByMake.get(make) ?? [])]
      .filter((model) => !year || hasMakeVehicleData(make, model, year))
      .map((model) => sourceModelFamily(make, model))
  );
}

export function getYears(make = "", model = ""): string[] {
  const years: string[] = [];
  const sourceGroups = make
    ? [[make, new Set(model ? sourceModelsFor(make, model) : [...(sourceModelsByMake.get(make) ?? [])])] as const]
    : [...sourceModelsByMake.entries()].map(([sourceMake, sourceModels]) => [sourceMake, sourceModels] as const);

  for (const [sourceMake, sourceModels] of sourceGroups) {
    for (const sourceModel of sourceModels) {
      years.push(...Object.keys(vehicles[sourceMake]?.[sourceModel] ?? {}));
      years.push(
        ...STREET_OVERLAYS_2026.filter(
          (entry) => entry.make === sourceMake && entry.model === sourceModel
        ).map((entry) => entry.year),
        ...CURRENT_MAPPING_OVERRIDES.filter(
          (entry) => entry.make === sourceMake && entry.model === sourceModel
        ).map((entry) => entry.year)
      );
    }
  }
  return sortYears(years);
}

export function getVehicleVariants(
  make: string,
  model: string,
  year: string
): VehicleVariant[] {
  const canonical = sourceModelFamily(make, model);
  const active = sourceModelsFor(make, canonical).filter((sourceModel) =>
    hasVehicleData(make, sourceModel, year)
  );
  if (active.length <= 1) return [];

  return active.map((sourceModel) => ({
    value: sourceModel,
    label: variantLabel(make, canonical, sourceModel)
  }));
}

export function resolveVehicleSelection(selection: VehicleSelection): VehicleSelection {
  if (selection.notListed || !selection.make || !selection.model) return selection;

  const alias = aliasIndex.get(key(selection.make, selection.model, selection.year));
  const sourceModel = alias?.model ?? selection.variant ?? selection.model;
  const directVariant =
    selection.variant && hasVehicleData(selection.make, selection.variant, selection.year)
      ? selection.variant
      : undefined;
  const canonical = sourceModelFamily(selection.make, sourceModel);
  const members = sourceModelsFor(selection.make, canonical);
  const variant = directVariant ?? (members.includes(sourceModel) && sourceModel !== canonical ? sourceModel : undefined);

  return {
    ...selection,
    make: selection.make,
    model: canonical,
    variant,
    notListed: false,
    manualDescription: undefined
  };
}

export function getVehicleMapping(selection: VehicleSelection): VehicleMapping | null {
  if (selection.notListed) return null;

  const resolved = resolveVehicleSelection(selection);
  if (!resolved.make || !resolved.model || !resolved.year) return null;

  const sourceModel = sourceModelForSelection(resolved);
  if (!sourceModel) return null;
  const canonicalSelection = { ...resolved, model: sourceModelFamily(resolved.make, sourceModel) };
  if (sourceModel !== canonicalSelection.model) canonicalSelection.variant = sourceModel;

  const current = currentOverrideIndex.get(key(resolved.make, sourceModel, resolved.year));
  if (current) {
    return {
      selection: canonicalSelection,
      classes: current.classes.map((classId) => classId.toLowerCase()),
      source: "2026-current-override",
      coverage: current.coverage,
      sourceNote: current.sourceNote
    };
  }

  const overlay = overlayIndex.get(key(resolved.make, sourceModel, resolved.year));
  if (overlay) {
    return {
      selection: canonicalSelection,
      classes: overlay.classes.map((classId) => classId.toLowerCase()),
      source: "2026-street-overlay",
      coverage: "street-only",
      sourceNote: overlay.sourceNote
    };
  }

  // The broad catalog is used for selection only. A class is returned only when
  // this repository has a reviewed first-party placement for the exact vehicle.
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
            variant: variants.length > 0 && variant.value !== model ? variant.value : undefined
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
  if (selection.notListed) {
    return selection.manualDescription || "Vehicle not listed";
  }
  const variant = selection.variant
    ? variantLabel(selection.make, selection.model, selection.variant)
    : undefined;
  return [selection.year, selection.make, selection.model, variant === "Base / standard listing" ? undefined : variant]
    .filter(Boolean)
    .join(" ");
}
