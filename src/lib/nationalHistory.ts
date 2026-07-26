import nationalsData from "../data/nationals-winners-2021-2025.json";
import {
  VEHICLE_GENERATIONS,
  VEHICLE_HISTORY_VARIANTS,
  type VehicleHistoryVariantDefinition
} from "../data/vehicle-generations";
import type { NationalCompetitionRecord, VehicleSelection } from "./types";

export const NATIONAL_ARCHIVE_URL = "https://www.scca.com/pages/solo-archives";
export const NATIONAL_EVENT_YEARS = nationalsData.eventYears;
export const NATIONAL_DATA_POLICY = nationalsData.policy;

interface ImportedWinner {
  eventYear: number;
  classId: string;
  division: "open" | "ladies";
  vehicleYear: number | null;
  vehicle: string;
  tireManufacturer: string | null;
  finish: number;
  sourceUrl: string;
}

export interface TireBrandSummary {
  manufacturer: string;
  wins: number;
  share: number;
}

export interface NationalHistoryScope {
  label: string;
  startYear: number;
  endYear: number;
  sourceUrl: string;
  variantLabel: string | null;
}

const RECORDS = nationalsData.records as ImportedWinner[];

const MAKE_ALIASES: Record<string, string[]> = {
  chevrolet: ["chevrolet", "chevy", "corvette"],
  mercedesbenz: ["mercedesbenz", "mercedes"],
  volkswagen: ["volkswagen", "vw"],
  alfaromeo: ["alfaromeo", "alfa"],
  bmw: ["bmw", "bimmer"],
  porsche: ["porsche", "porch"]
};

const MODEL_ALIASES: Record<string, string[]> = {
  tt: ["auditt", "tts", "ttrs"],
  mx5miata: ["miata", "mx5", "nd1", "nd2"],
  mustang: ["mustang", "shelbygt350", "shelbygt500"],
  "3series": ["325", "328", "330", "335", "340"],
  m2: ["bmwm2", "m2"],
  m3: ["bmwm3", "m3", "lrpm3"],
  "4series": ["m4", "428", "430", "435", "440"],
  model3: ["model3"],
  rx7: ["rx7"],
  rx8: ["rx8"],
  s2000: ["s2000", "pos2000"],
  eliseexige: ["elise", "exige"],
  mazda6: ["mazda6", "speed6", "mazdaspeed6"],
  lancer: ["lancer", "evo", "evolution"],
  wrx: ["wrx", "sti"],
  "350z": ["350z"],
  z: ["nissanz", "zperformance"],
  "911": ["911", "gt3", "gt3rs", "porscheturbo"],
  cayman: ["cayman", "gt4", "gt4rs"],
  "718": ["718", "boxster", "cayman", "spyder", "gt4", "gt4rs"],
  golf: ["golf", "gti"],
  gr86: ["gr86", "toyota86"],
  "86": ["gr86", "toyota86"],
  frs: ["frs"]
};

const MODEL_STOPWORDS = new Set([
  "car",
  "convertible",
  "coupe",
  "hatch",
  "hatchback",
  "model",
  "roadster",
  "sedan",
  "series",
  "sport",
  "sports",
  "wagon"
]);

function compact(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function generationKey(make: string, model: string): string {
  const normalizedMake = compact(make);
  const normalizedModel = compact(model);

  if (
    normalizedMake === "porsche" &&
    (
      normalizedModel.includes("911") ||
      normalizedModel.startsWith("turbo") ||
      normalizedModel.includes("gt2")
    )
  ) {
    return "porsche:911";
  }
  if (normalizedMake === "mini" && normalizedModel === "johncooperworks") {
    return "mini:cooper";
  }
  if (normalizedMake === "toyota" && normalizedModel === "grsupra") {
    return "toyota:supra";
  }

  return `${normalizedMake}:${normalizedModel}`;
}

export function hasReviewedNationalFamily(selection: VehicleSelection): boolean {
  return Boolean(
    selection.make &&
    selection.model &&
    VEHICLE_GENERATIONS[generationKey(selection.make, selection.model)]
  );
}

function findHistoryVariant(
  familyKey: string,
  value: string,
  termsKey: "selectionTerms" | "winnerTerms"
): VehicleHistoryVariantDefinition | null {
  const normalizedValue = compact(value);
  return (
    VEHICLE_HISTORY_VARIANTS[familyKey]?.find((variant) =>
      variant[termsKey].some((term) => normalizedValue.includes(compact(term)))
    ) ?? null
  );
}

function selectedHistoryIdentity(
  selection: VehicleSelection,
  familyKey: string
): string {
  if (selection.variant) return selection.variant;

  const model = compact(selection.model);
  if (
    (familyKey === "porsche:911" && model.includes("turbo")) ||
    (familyKey === "mini:cooper" && model === "johncooperworks")
  ) {
    return selection.model;
  }

  return "";
}

export function getNationalHistoryScope(
  selection: VehicleSelection
): NationalHistoryScope | null {
  const selectedYear = Number(selection.year);
  if (
    selection.notListed ||
    !selection.make ||
    !selection.model ||
    !Number.isInteger(selectedYear)
  ) {
    return null;
  }

  const familyKey = generationKey(selection.make, selection.model);
  const familyGenerations = VEHICLE_GENERATIONS[familyKey];
  if (!familyGenerations) return null;

  const generation = familyGenerations.find(
    (candidate) =>
      selectedYear >= candidate.startYear && selectedYear <= candidate.endYear
  );

  if (!generation) return null;
  const variant = findHistoryVariant(
    familyKey,
    selectedHistoryIdentity(selection, familyKey),
    "selectionTerms"
  );

  return {
    label: `${generation.label} (${generation.startYear}-${generation.endYear})${
      variant ? ` • ${variant.label}` : ""
    }`,
    startYear: generation.startYear,
    endYear: generation.endYear,
    sourceUrl: generation.sourceUrl,
    variantLabel: variant?.label ?? null
  };
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(
      (token) =>
        token &&
        !MODEL_STOPWORDS.has(token) &&
        (token.length >= 3 || /^[a-z]\d$/i.test(token))
    );
}

function makeMatches(make: string, vehicle: string): boolean {
  const normalizedMake = compact(make);
  const normalizedVehicle = compact(vehicle);
  const aliases = MAKE_ALIASES[normalizedMake] ?? [normalizedMake];
  return aliases.some((alias) => normalizedVehicle.includes(alias));
}

function modelMatches(make: string, model: string, vehicle: string): boolean {
  const normalizedModel =
    generationKey(make, model).split(":").at(-1) ?? compact(model);
  const normalizedVehicle = compact(vehicle);
  const aliases = MODEL_ALIASES[normalizedModel] ?? [];
  if (aliases.some((alias) => normalizedVehicle.includes(alias))) return true;
  if (normalizedModel.length >= 3 && normalizedVehicle.includes(normalizedModel)) return true;
  return tokens(model).some((token) => normalizedVehicle.includes(token));
}

export function getNationalCompetitionHistory(
  selection: VehicleSelection
): NationalCompetitionRecord[] {
  const scope = getNationalHistoryScope(selection);
  if (!scope) return [];
  const familyKey = generationKey(selection.make, selection.model);
  const selectedVariant = findHistoryVariant(
    familyKey,
    selectedHistoryIdentity(selection, familyKey),
    "selectionTerms"
  );

  return RECORDS.filter(
    (record) => {
      const winningVariant = findHistoryVariant(
        familyKey,
        record.vehicle,
        "winnerTerms"
      );
      const variantMatches = selectedVariant
        ? winningVariant?.id === selectedVariant.id
        : winningVariant === null;

      return (
        record.vehicleYear !== null &&
        record.vehicleYear >= scope.startYear &&
        record.vehicleYear <= scope.endYear &&
        makeMatches(selection.make, record.vehicle) &&
        modelMatches(selection.make, selection.model, record.vehicle) &&
        variantMatches
      );
    }
  )
    .map((record) => ({
      year: record.eventYear,
      classId: record.classId,
      finish: `1st${record.division === "ladies" ? " Ladies" : ""}`,
      sourceLabel: `${record.eventYear} Solo Nationals official class results`,
      sourceUrl: record.sourceUrl,
      division: record.division,
      vehicle: record.vehicle,
      vehicleYear: record.vehicleYear,
      tireManufacturer: record.tireManufacturer
    }))
    .sort((left, right) => right.year - left.year || left.classId.localeCompare(right.classId));
}

export function summarizeTireBrands(
  records: NationalCompetitionRecord[]
): TireBrandSummary[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (!record.tireManufacturer) continue;
    counts.set(
      record.tireManufacturer,
      (counts.get(record.tireManufacturer) ?? 0) + 1
    );
  }
  const observed = [...counts.values()].reduce((total, count) => total + count, 0);
  return [...counts.entries()]
    .map(([manufacturer, wins]) => ({
      manufacturer,
      wins,
      share: observed ? wins / observed : 0
    }))
    .sort(
      (left, right) =>
        right.wins - left.wins || left.manufacturer.localeCompare(right.manufacturer)
    );
}

export function legalTireGuidance(classId: string | null): string {
  if (!classId) {
    return "A legal tire-size recommendation requires a completed current class result.";
  }

  const normalized = classId.toLowerCase();
  if (["ss", "as", "bs", "cs", "ds", "es", "fs", "gs", "hs"].includes(normalized)) {
    return "Street has no fixed section-width cap: the tire must fit the allowed wheels and unmodified fenders, and meet every Section 13.3 tire requirement.";
  }

  const streetTouringLimits: Record<string, string> = {
    sst: "SST has no tire-section-width or wheel-width maximum.",
    ast: "AST permits up to 225 mm on AWD or 255 mm on 2WD cars; wheel width is limited to 7.5 in AWD or 9 in 2WD.",
    bst: "BST permits up to 295 mm on AWD, mid-engine RWD, or forced-induction RWD cars, and 315 mm on naturally aspirated RWD or FWD cars; wheel width is limited to 11 in.",
    cst: "CST permits up to 225 mm on AWD or 255 mm on 2WD cars; wheel width is limited to 7.5 in AWD or 9 in 2WD.",
    dst: "DST permits up to 245 mm on AWD or 265 mm on 2WD cars; wheel width is limited to 8 in AWD or 9 in 2WD.",
    est: "EST permits up to 225 mm tires on wheels no wider than 7.5 in.",
    gst: "GST permits up to 245 mm on AWD or 265 mm on 2WD cars; wheel width is limited to 9 in."
  };
  if (streetTouringLimits[normalized]) return streetTouringLimits[normalized];

  if (["xa", "xb"].includes(normalized)) {
    return "XA/XB permits any tire size that otherwise meets Section 13.3 Street eligibility, plus the Vitour Tempesta P1/P1+ exception; fitment must remain safe and compliant.";
  }

  return "This category's legal tire size depends on vehicle-specific wheel, body, and class rules that are not established by the Nationals result reports.";
}
