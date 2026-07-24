import rawVehicles from "../data/vehicles.generated.json";
import { CURRENT_MAPPING_OVERRIDES, STREET_OVERLAYS_2026 } from "../data/overrides2026";
import type { VehicleMapping, VehicleSelection } from "./types";

type RawVehicles = Record<string, Record<string, Record<string, string[]>>>;
const vehicles = rawVehicles as RawVehicles;

const currentOverrideIndex = new Map(
  CURRENT_MAPPING_OVERRIDES.map((entry) => [key(entry.make, entry.model, entry.year), entry])
);
const overlayIndex = new Map(
  STREET_OVERLAYS_2026.map((entry) => [key(entry.make, entry.model, entry.year), entry])
);
const aliasIndex = new Map<string, VehicleSelection>();
const aliasListIndex = new Map<string, string[]>();
const modelAliasIndex = new Map<string, string>();

for (const entry of [...STREET_OVERLAYS_2026, ...CURRENT_MAPPING_OVERRIDES]) {
  const canonicalKey = key(entry.make, entry.model, entry.year);
  aliasListIndex.set(canonicalKey, entry.aliases ?? []);

  for (const alias of entry.aliases ?? []) {
    modelAliasIndex.set(modelAliasKey(entry.make, alias), entry.model);
    aliasIndex.set(key(entry.make, alias, entry.year), {
      make: entry.make,
      model: entry.model,
      year: entry.year
    });
  }
}

function key(make: string, model: string, year: string): string {
  return `${make}\u0000${model}\u0000${year}`;
}

function modelAliasKey(make: string, model: string): string {
  return `${make}\u0000${model}`;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function getMakes(): string[] {
  return uniqueSorted([
    ...Object.keys(vehicles),
    ...STREET_OVERLAYS_2026.map((entry) => entry.make),
    ...CURRENT_MAPPING_OVERRIDES.map((entry) => entry.make)
  ]);
}

export function getModels(make: string): string[] {
  const base = Object.keys(vehicles[make] ?? {});
  const overlay = [...STREET_OVERLAYS_2026, ...CURRENT_MAPPING_OVERRIDES]
    .filter((entry) => entry.make === make)
    .map((entry) => entry.model);
  return uniqueSorted([...base, ...overlay]);
}

export function getYears(make: string, model: string): string[] {
  const resolvedModel = resolveVehicleSelection({ make, model, year: "" }).model || model;
  const base = Object.keys(vehicles[make]?.[resolvedModel] ?? {});
  const overlay = [...STREET_OVERLAYS_2026, ...CURRENT_MAPPING_OVERRIDES]
    .filter((entry) => entry.make === make && entry.model === resolvedModel)
    .map((entry) => entry.year);

  return [...new Set([...base, ...overlay])].sort((a, b) => {
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

export function resolveVehicleSelection(selection: VehicleSelection): VehicleSelection {
  if (!selection.make || !selection.model) return selection;

  const directMatch =
    currentOverrideIndex.has(key(selection.make, selection.model, selection.year)) ||
    overlayIndex.has(key(selection.make, selection.model, selection.year)) ||
    Boolean(
      vehicles[selection.make]?.[selection.model]?.[selection.year] ??
        vehicles[selection.make]?.[selection.model]?.all
    );
  if (directMatch) return selection;

  const exact = aliasIndex.get(key(selection.make, selection.model, selection.year));
  if (exact) return exact;

  const canonicalModel = modelAliasIndex.get(modelAliasKey(selection.make, selection.model));
  if (!canonicalModel) return selection;

  return {
    ...selection,
    model: canonicalModel
  };
}

export function getVehicleMapping(
  selection: VehicleSelection
): VehicleMapping | null {
  const resolved = resolveVehicleSelection(selection);
  if (!resolved.make || !resolved.model || !resolved.year) return null;

  const current = currentOverrideIndex.get(key(resolved.make, resolved.model, resolved.year));
  if (current) {
    return {
      selection: resolved,
      classes: current.classes.map((classId) => classId.toLowerCase()),
      source: "2026-current-override",
      coverage: current.coverage,
      sourceNote: current.sourceNote
    };
  }

  const overlay = overlayIndex.get(key(resolved.make, resolved.model, resolved.year));
  if (overlay) {
    return {
      selection: resolved,
      classes: overlay.classes.map((classId) => classId.toLowerCase()),
      source: "2026-street-overlay",
      coverage: "street-only",
      sourceNote: overlay.sourceNote
    };
  }

  const modelData = vehicles[resolved.make]?.[resolved.model];
  if (!modelData) return null;
  const classes = modelData[resolved.year] ?? modelData.all;
  if (!classes) return null;

  return {
    selection: resolved,
    classes: [...new Set(classes.map((classId) => classId.toLowerCase()))],
    source: "upstream",
    coverage: "full-mapping",
    sourceNote:
      "Imported from the MIT-licensed scca_classifier vehicle mapping. Verify against the current rulebook and Fastrack before entering an event."
  };
}

export function searchVehicles(query: string, limit = 20): VehicleSelection[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const results: VehicleSelection[] = [];
  const seen = new Set<string>();

  for (const make of getMakes()) {
    for (const model of getModels(make)) {
      const years = getYears(make, model).slice(0, 3);
      const labels = years.flatMap((year) => {
        const aliases = aliasListIndex.get(key(make, model, year)) ?? [];
        return [`${make} ${model}`.toLowerCase(), ...aliases.map((alias) => `${make} ${alias}`.toLowerCase())];
      });
      if (!labels.some((label) => label.includes(normalized))) continue;
      for (const year of years) {
        const entryKey = key(make, model, year);
        if (seen.has(entryKey)) continue;
        results.push({ make, model, year });
        seen.add(entryKey);
        if (results.length >= limit) return results;
      }
    }
  }

  return results;
}
