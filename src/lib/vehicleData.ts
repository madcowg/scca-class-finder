import { CURRENT_MAPPING_OVERRIDES, STREET_OVERLAYS_2026 } from "../data/overrides2026";
import type { VehicleMapping, VehicleSelection, VehicleVariant } from "./types";

type ReviewedEntry = (typeof STREET_OVERLAYS_2026)[number] | (typeof CURRENT_MAPPING_OVERRIDES)[number];

const reviewedEntries: ReviewedEntry[] = [
  ...STREET_OVERLAYS_2026,
  ...CURRENT_MAPPING_OVERRIDES
];

const currentOverrideIndex = new Map(
  CURRENT_MAPPING_OVERRIDES.map((entry) => [entryKey(entry), entry])
);
const aliasIndex = new Map<string, { model: string; variant?: string }>();
const modelsByMake = new Map<string, Set<string>>();

for (const entry of reviewedEntries) {
  const models = modelsByMake.get(entry.make) ?? new Set<string>();
  models.add(entry.model);
  modelsByMake.set(entry.make, models);

  for (const alias of entry.aliases ?? []) {
    aliasIndex.set(aliasKey(entry.make, alias, entry.year), {
      model: entry.model,
      variant: entry.variant
    });
  }
}

function entryKey(entry: Pick<ReviewedEntry, "make" | "model" | "year" | "variant">): string {
  return `${entry.make}\u0000${entry.model}\u0000${entry.year}\u0000${entry.variant ?? ""}`;
}

function aliasKey(make: string, value: string, year: string): string {
  return `${make.trim().toLowerCase()}\u0000${value.trim().toLowerCase()}\u0000${year}`;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function canonicalMake(make: string): string {
  return (
    [...modelsByMake.keys()].find((candidate) => candidate.toLowerCase() === make.toLowerCase()) ?? make
  );
}

function canonicalModel(make: string, model: string): string {
  const canonical = canonicalMake(make);
  return (
    [...(modelsByMake.get(canonical) ?? [])].find(
      (candidate) => candidate.toLowerCase() === model.toLowerCase()
    ) ?? model
  );
}

function activeEntries(make: string, model: string, year: string): ReviewedEntry[] {
  const canonical = canonicalModel(make, model);
  return reviewedEntries.filter(
    (entry) => entry.make === canonicalMake(make) && entry.model === canonical && entry.year === year
  );
}

function findEntry(selection: VehicleSelection): ReviewedEntry | null {
  const make = canonicalMake(selection.make);
  const alias = aliasIndex.get(aliasKey(make, selection.model, selection.year));
  const model = alias?.model ?? canonicalModel(make, selection.model);
  const entries = reviewedEntries.filter(
    (entry) => entry.make === make && entry.model === model && entry.year === selection.year
  );
  if (entries.length === 0) return null;

  const requestedVariant = alias?.variant ?? selection.variant;
  if (requestedVariant) {
    return (
      entries.find(
        (entry) =>
          entry.variant === requestedVariant ||
          (entry.aliases ?? []).some((entryAlias) => entryAlias === requestedVariant)
      ) ?? null
    );
  }

  return entries.length === 1 ? entries[0] : null;
}

function sortYears(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => Number(right) - Number(left));
}

export function getMakes(year = ""): string[] {
  return uniqueSorted(
    reviewedEntries
      .filter((entry) => !year || entry.year === year)
      .map((entry) => entry.make)
  );
}

export function getModels(make: string, year = ""): string[] {
  const canonical = canonicalMake(make);
  return uniqueSorted(
    reviewedEntries
      .filter((entry) => entry.make === canonical && (!year || entry.year === year))
      .map((entry) => entry.model)
  );
}

export function getYears(make = "", model = ""): string[] {
  const canonical = make && model ? canonicalModel(make, model) : model;
  const aliasModels = model
    ? reviewedEntries
        .filter((entry) =>
          (entry.aliases ?? []).some((alias) => alias.toLowerCase() === model.toLowerCase())
        )
        .map((entry) => entry.model)
    : [];
  const models = model ? new Set([canonical, ...aliasModels]) : null;
  const canonicalMakeName = make ? canonicalMake(make) : "";

  return sortYears(
    reviewedEntries
      .filter(
        (entry) =>
          (!make || entry.make === canonicalMakeName) && (!models || models.has(entry.model))
      )
      .map((entry) => entry.year)
  );
}

export function getVehicleVariants(
  make: string,
  model: string,
  year: string
): VehicleVariant[] {
  const entries = activeEntries(make, model, year);
  if (entries.length <= 1) return [];

  return entries.map((entry) => ({
    value: entry.variant ?? entry.model,
    label: entry.variant ?? "Standard listing"
  }));
}

export function resolveVehicleSelection(selection: VehicleSelection): VehicleSelection {
  if (selection.notListed || !selection.make || !selection.model || !selection.year) {
    return selection;
  }

  const make = canonicalMake(selection.make);
  const alias = aliasIndex.get(aliasKey(make, selection.model, selection.year));
  const model = alias?.model ?? canonicalModel(make, selection.model);
  const entries = activeEntries(make, model, selection.year);
  const requestedVariant = alias?.variant ?? selection.variant;
  const entry = requestedVariant
    ? entries.find(
        (candidate) =>
          candidate.variant === requestedVariant ||
          (candidate.aliases ?? []).includes(requestedVariant)
      )
    : entries.length === 1
      ? entries[0]
      : undefined;

  return {
    ...selection,
    make,
    model,
    variant: entry?.variant ?? requestedVariant,
    notListed: false,
    manualDescription: undefined
  };
}

export function getVehicleMapping(selection: VehicleSelection): VehicleMapping | null {
  if (selection.notListed) return null;

  const resolved = resolveVehicleSelection(selection);
  const entry = findEntry(resolved);
  if (!entry) return null;

  const canonicalSelection: VehicleSelection = {
    make: entry.make,
    model: entry.model,
    year: entry.year,
    variant: entry.variant
  };
  const current = currentOverrideIndex.get(entryKey(entry));
  return {
    selection: canonicalSelection,
    classes: entry.classes.map((classId) => classId.toLowerCase()),
    source: current ? "2026-current-override" : "2026-street-overlay",
    coverage: current?.coverage ?? "street-only",
    sourceNote: entry.sourceNote
  };
}

export function searchVehicles(query: string, limit = 20): VehicleSelection[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return reviewedEntries
    .filter((entry) => {
      const label = [entry.year, entry.make, entry.model, entry.variant, ...(entry.aliases ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return label.includes(normalized);
    })
    .slice(0, limit)
    .map((entry) => ({
      make: entry.make,
      model: entry.model,
      year: entry.year,
      variant: entry.variant
    }));
}

export function vehicleSelectionLabel(selection: VehicleSelection): string {
  if (selection.notListed) {
    return selection.manualDescription || "Vehicle not listed";
  }

  const displayVariant = selection.variant?.toLowerCase().startsWith(`${selection.model.toLowerCase()} `)
    ? selection.variant.slice(selection.model.length).trim()
    : selection.variant;

  return [selection.year, selection.make, selection.model, displayVariant]
    .filter(Boolean)
    .join(" ");
}
