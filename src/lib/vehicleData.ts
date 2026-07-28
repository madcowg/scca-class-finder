import appendixAData from "../data/appendix-a-2026.json";
import productionCatalog from "../data/vehicles.production.json";
import rawVehicles from "../data/vehicles.generated.json";
import { CURRENT_MAPPING_OVERRIDES, STREET_OVERLAYS_2026 } from "../data/overrides2026";
import type {
  VehicleClassSource,
  VehicleMapping,
  VehicleSelection,
  VehicleVariant
} from "./types";

type ProductionVehicles = Record<string, Record<string, Record<string, string[]>>>;
type RawVehicles = Record<string, Record<string, Record<string, string[]>>>;
type ReviewedEntry = (typeof STREET_OVERLAYS_2026)[number] | (typeof CURRENT_MAPPING_OVERRIDES)[number];
type AppendixCategory = "street" | "streetTouring" | "streetPrepared";
interface AppendixListing {
  classId: string;
  category: AppendixCategory;
  manufacturer: string;
  description: string;
  yearRanges: Array<[number, number]>;
  page: number;
  ruleSection: string;
  sourceUrl: string;
}
interface AppendixData {
  rulesYear: number;
  sourceUrl: string;
  listings: AppendixListing[];
}

const productionVehicles = productionCatalog as ProductionVehicles;
const vehicles = rawVehicles as RawVehicles;
const appendixA = appendixAData as unknown as AppendixData;
const appendixListings = appendixA.listings.filter(
  (listing) => !/^"?catch-all"?/i.test(listing.manufacturer)
);
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
const NON_EXACT_RULEBOOK_MANUFACTURERS = new Set(["general motors"]);

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
  { make: "Chrysler", pattern: /^300M\b/i, family: "300M" },
  { make: "Dodge", pattern: /^Caliber\s+SRT4\b/i, family: "Caliber" },
  { make: "Dodge", pattern: /^Ram\s+SRT10\b/i, family: "Ram" },
  { make: "Tesla", pattern: /^Model 3\b/i, family: "Model 3" },
  { make: "Tesla", pattern: /^Model S\b/i, family: "Model S" },
  { make: "Tesla", pattern: /^Model X\b/i, family: "Model X" },
  { make: "Tesla", pattern: /^Model Y\b/i, family: "Model Y" },
  { make: "Chevrolet", pattern: /^C8\s+Z06\b/i, family: "Corvette" },
  { make: "Cadillac", pattern: /^CT4V\b/i, family: "CT4" },
  { make: "Cadillac", pattern: /^CT5V\b/i, family: "CT5" },
  { make: "Aston Martin", pattern: /^(?:V8|V12)\s+Vantage\b/i, family: "Vantage" },
  { make: "Audi", pattern: /^RS7\b/i, family: "RS 7" },
  { make: "Audi", pattern: /^TT\b/i, family: "TT Coupe" },
  { make: "Audi", pattern: /^TT\b/i, family: "TT Roadster" },
  { make: "Audi", pattern: /^TTS\b/i, family: "TTS Coupe" },
  { make: "Hyundai", pattern: /^Ioniq 5\b/i, family: "Ioniq 5" },
  { make: "Hyundai", pattern: /^Ionic 5\b/i, family: "Ioniq 5" },
  { make: "Lotus", pattern: /^Elise\b/i, family: "Elise/Exige" },
  { make: "Lotus", pattern: /^Exige\b/i, family: "Elise/Exige" },
  { make: "Mercedes-Benz", pattern: /^AMG CLA\b/i, family: "CLA-Class" },
  { make: "Mercedes-Benz", pattern: /^AMG A\b/i, family: "A-Class" },
  { make: "Mercedes-Benz", pattern: /^CLK\b/i, family: "CLK-Class" },
  { make: "Mercedes-Benz", pattern: /^(?:C450|C43)\b/i, family: "C-Class" },
  { make: "Mercedes-Benz", pattern: /^280\b/i, family: "C-Class" },
  { make: "Kia", pattern: /^Forte5\b/i, family: "Forte" },
  { make: "Polestar", pattern: /^(?:Polestar\s+)?2\b/i, family: "2" },
  { make: "Saab", pattern: /^9-2X\b/i, family: "9-2X" },
  { make: "Subaru", pattern: /^Legacy\s+2\.5GT\b/i, family: "Legacy/Outback" },
  { make: "Subaru", pattern: /^STI\b/i, family: "WRX" },
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

function rulebookManufacturerMakes(manufacturer: string): string[] {
  const header = clean(manufacturer.replace(/^"|"?:$/g, ""));
  if (NON_EXACT_RULEBOOK_MANUFACTURERS.has(normalized(header))) return [];
  if (normalized(header) === "tesla motors") return ["Tesla"];
  if (normalized(header) === "mercedes") return ["Mercedes-Benz"];

  return uniqueSorted(
    header
      .replace(/\band\b/gi, "&")
      .split(/\s*(?:,|&|\/)\s*/)
      .map((part) => part.replace(/\bEquivalents?\b/gi, "").trim())
      .filter(Boolean)
      .map(normalizeMakeName)
  );
}

function rulebookListingMatchesMake(listing: AppendixListing, make: string): boolean {
  const target = normalized(normalizeMakeName(make));
  if (
    target === "genesis" &&
    normalized(listing.manufacturer) === "hyundai" &&
    /^Genesis\b/i.test(listing.description)
  ) {
    return true;
  }
  return rulebookManufacturerMakes(listing.manufacturer).some(
    (candidate) => normalized(candidate) === target
  );
}

function rulebookYearApplies(listing: AppendixListing, selectedYear: string): boolean {
  if (selectedYear === "older") {
    return (
      listing.yearRanges.length === 0 ||
      listing.yearRanges.some(([start]) => start < 1990)
    );
  }
  const year = Number(selectedYear);
  if (!Number.isInteger(year)) return false;
  return (
    listing.yearRanges.length === 0 ||
    listing.yearRanges.some(([start, end]) => year >= start && year <= end)
  );
}

function identityText(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/\bmazdaspeed\b/g, "mazda speed")
    .replace(/\bmx[\s-]?5(?:\s+miata)?\b/g, "mx5")
    .replace(/\bs2000[\s-]?cr\b/g, "s2000 cr")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(\d+)\s+([a-z])\b/g, "$1$2")
    .replace(/\b([a-z])\s+(\d+)\b/g, "$1$2")
    .trim();
}

function containsIdentity(haystack: string, needle: string): boolean {
  const source = ` ${identityText(haystack)} `;
  const target = identityText(needle);
  return target.length > 1 && source.includes(` ${target} `);
}

function rulebookIdentity(description: string): string {
  const withoutPreparationLabel = description.replace(/\*?\s*Limited Prep\b/gi, "");
  const beforeQualifier = withoutPreparationLabel.split("(")[0];
  return identityText(beforeQualifier);
}

function rulebookVariantIdentity(description: string): string {
  const withoutYears = description
    .replace(/\*?\s*Limited Prep\b/gi, "")
    .replace(/\b(?:19|20)?\d{2}(?:1\/2)?\s*-\s*(?:19|20)?\d{2}\b/g, "")
    .replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(/\(\s*all\s*\)/gi, "")
    .replace(/\((?:inc(?:l(?:uding)?)?|excl(?:uding)?)[^)]*\)/gi, "")
    .replace(/\b(?:inc(?:l(?:uding)?)?|excl(?:uding)?)\b.*$/gi, "")
    .replace(/\bchassis\b/gi, "")
    .replace(/[()]/g, " ");
  return identityText(withoutYears);
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

function productionFamilyName(make: string, family: string, year: string): string {
  const numericYear = Number(year);
  if (make === "Chrysler" && family === "300" && numericYear >= 1999 && numericYear <= 2004) {
    return "300M";
  }
  if (make === "Saab" && family === "9-2" && numericYear >= 2005 && numericYear <= 2006) {
    return "9-2X";
  }
  return family;
}

function productionModelsFor(make: string, year: string): string[] {
  const makeKey = productionMakeKey(make, year);
  if (!makeKey) return [];
  return uniqueSorted(
    Object.keys(productionVehicles[year]?.[makeKey] ?? {}).map((family) =>
      productionFamilyName(make, family, year)
    )
  );
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

  for (const listing of appendixListings) {
    if (
      listing.category !== "street" ||
      listing.yearRanges.length === 0 ||
      !rulebookListingMatchesMake(listing, canonicalMakeName) ||
      !rulebookYearApplies(listing, year) ||
      /\bNOC\b/i.test(listing.description)
    ) {
      continue;
    }
    const existing = rulebookFamiliesForListing(
      canonicalMakeName,
      listing,
      year,
      [...families]
    );
    if (existing.length > 0) continue;

    const alias = MODEL_FAMILY_ALIASES.find(
      (candidate) =>
        candidate.make === canonicalMakeName &&
        candidate.pattern.test(removeMakePrefix(canonicalMakeName, listing.description))
    );
    const family = alias?.family ?? clean(listing.description.split("(")[0]);
    if (family && !/^all$/i.test(family)) families.add(family);
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
      (variant) =>
        names.includes(normalized(variant.value)) ||
        names.includes(normalized(variant.label))
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
  const familyKey = Object.keys(productionVehicles[year]?.[makeKey] ?? {}).find(
    (candidate) =>
      normalized(productionFamilyName(make, candidate, year)) === normalized(family)
  );
  return familyKey ? productionVehicles[year]?.[makeKey]?.[familyKey] ?? [] : [];
}

function rulebookFamiliesForListing(
  make: string,
  listing: AppendixListing,
  year: string,
  families: string[]
): string[] {
  if (!rulebookListingMatchesMake(listing, make) || !rulebookYearApplies(listing, year)) {
    return [];
  }

  const directMatches = families.filter((family) =>
    containsIdentity(listing.description, family)
  );
  if (directMatches.length > 0) {
    const longest = Math.max(...directMatches.map((family) => identityText(family).length));
    return directMatches.filter((family) => identityText(family).length === longest);
  }

  const canonicalMakeName = canonicalMake(make);
  const aliasMatches = MODEL_FAMILY_ALIASES.filter(
    (alias) =>
      alias.make === canonicalMakeName &&
      alias.pattern.test(removeMakePrefix(canonicalMakeName, listing.description))
  )
    .map((alias) =>
      families.find((family) => normalized(family) === normalized(alias.family))
    )
    .filter((family): family is string => Boolean(family));
  if (aliasMatches.length > 0) return uniqueSorted(aliasMatches);

  const listingIdentity = rulebookIdentity(listing.description);
  const productionMatches = families.filter((family) =>
    productionVariantsFor(canonicalMakeName, family, year).some((variant) => {
      const variantIdentity = rulebookIdentity(variant);
      return (
        variantIdentity === listingIdentity ||
        containsIdentity(variantIdentity, listingIdentity) ||
        containsIdentity(listingIdentity, variantIdentity)
      );
    })
  );
  return uniqueSorted(productionMatches);
}

function rulebookListingHasYearEvidence(
  listing: AppendixListing,
  make: string,
  family: string,
  year: string
): boolean {
  if (year === "older" || listing.yearRanges.length > 0) return true;
  const listingIdentity = rulebookVariantIdentity(listing.description);
  if (listingIdentity === identityText(family)) return true;

  if (
    productionVariantsFor(make, family, year).some(
      (variant) => rulebookVariantIdentity(variant) === listingIdentity
    )
  ) {
    return true;
  }

  if (
    reviewedVariantsFor(make, family, year).some(
      (entry) =>
        rulebookVariantIdentity(`${family} ${entry.variant ?? entry.model}`) ===
        listingIdentity
    )
  ) {
    return true;
  }

  return Object.entries(rawMakeEntries(make)).some(([sourceModel, years]) => {
    if (
      rulebookVariantIdentity(removeMakePrefix(make, sourceModel)) !==
      rulebookVariantIdentity(listing.description)
    ) {
      return false;
    }
    return Object.keys(years).some((yearKey) => explicitYearKeyApplies(yearKey, year));
  });
}

function positiveIdentityTokens(description: string): Set<string> {
  const positive = description
    .replace(/\((?:excl(?:uding)?|non-)[^)]*\)/gi, "")
    .replace(/\bexcl(?:uding)?\b.*$/gi, "")
    .replace(/\b(?:19|20)?\d{2}(?:1\/2)?\s*-\s*(?:19|20)?\d{2}\b/g, "")
    .replace(/\b(?:19|20)\d{2}\b/g, "");
  return new Set(
    identityText(positive)
      .replace(/\b(\d+)\s+0l\b/g, "$1 0")
      .split(" ")
      .filter(Boolean)
  );
}

function excludedIdentityGroups(description: string): string[][] {
  const groups: string[][] = [];
  for (const match of description.matchAll(/\bexcl(?:uding)?\.?\s*([^)]*)/gi)) {
    for (const clause of match[1].split(/,|&|\bor\b/i)) {
      const tokens = identityText(clause)
        .replace(/\b(\d+)\s+0l\b/g, "$1 0")
        .split(" ")
        .filter(
          (token) =>
            (token.length > 1 || /^\d$/.test(token)) &&
            !["and", "all", "edition", "model", "models", "package"].includes(token)
        );
      if (tokens.length > 0) groups.push(tokens);
    }
  }
  return groups;
}

function relatedListingIsCompatible(
  streetListing: AppendixListing,
  candidate: AppendixListing
): boolean {
  const streetTokens = positiveIdentityTokens(streetListing.description);
  if (
    excludedIdentityGroups(candidate.description).some((group) =>
      group.every((token) => streetTokens.has(token))
    )
  ) {
    return false;
  }

  if (
    streetListing.yearRanges.length > 0 &&
    candidate.yearRanges.length > 0 &&
    !streetListing.yearRanges.some(([streetStart, streetEnd]) =>
      candidate.yearRanges.some(
        ([candidateStart, candidateEnd]) =>
          streetStart <= candidateEnd && candidateStart <= streetEnd
      )
    )
  ) {
    return false;
  }

  if (streetTokens.has("all")) return true;

  const qualifierStart = candidate.description.indexOf("(");
  const qualifier = (qualifierStart >= 0 ? candidate.description.slice(qualifierStart) : "")
    .replace(/\((?:inc(?:l(?:uding)?)?|excl(?:uding)?)[^)]*\)/gi, "")
    .replace(/\b(?:inc(?:l(?:uding)?)?|excl(?:uding)?)\.?\b.*$/gi, "")
    .replace(/\b(?:19|20)?\d{2}(?:1\/2)?\s*-\s*(?:19|20)?\d{2}\b/g, "")
    .replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(/\bLimited Prep\b/gi, "");
  const requiredTokens = identityText(qualifier)
    .replace(/\b(\d+)\s+0l\b/g, "$1 0")
    .split(" ")
    .filter(
      (token) =>
        token.length > 1 &&
        !/^\d+$/.test(token) &&
        ![
          "all",
          "and",
          "chassis",
          "cyl",
          "cylinder",
          "edition",
          "engine",
          "model",
          "models",
          "non",
          "only",
          "or",
          "package",
          "prep"
        ].includes(token)
    );
  const chassisTokens = requiredTokens.filter((token) =>
    /^(?:c\d+|e\d+|f\d+|g\d+|w\d+|r\d+|s\d+|mk\d+|na|nb|nc|nd)$/i.test(token)
  );
  if (
    chassisTokens.length > 0 &&
    !chassisTokens.some((token) =>
      [...streetTokens].some(
        (streetToken) => streetToken === token || streetToken.startsWith(token)
      )
    )
  ) {
    return false;
  }

  return requiredTokens
    .filter((token) => !chassisTokens.includes(token))
    .every((token) => streetTokens.has(token));
}

function rulebookListingsForFamily(
  make: string,
  family: string,
  year: string,
  category?: AppendixCategory
): AppendixListing[] {
  const families = familiesForYear(make, year);
  return appendixListings.filter(
    (listing) =>
      (!category || listing.category === category) &&
      rulebookFamiliesForListing(make, listing, year, families).some(
        (candidate) => normalized(candidate) === normalized(family)
      ) &&
      rulebookListingHasYearEvidence(listing, make, family, year)
  );
}

function rulebookVariantMatches(
  listing: AppendixListing,
  requestedVariant: string,
  family: string
): boolean {
  if (normalized(listing.description) === normalized(requestedVariant)) return true;
  const requestedVariantIdentity = rulebookVariantIdentity(requestedVariant);
  const listingVariantIdentity = rulebookVariantIdentity(listing.description);
  if (requestedVariantIdentity === listingVariantIdentity) return true;
  const requestedIdentity = rulebookIdentity(requestedVariant);
  const listingIdentity = rulebookIdentity(listing.description);
  if (requestedIdentity === listingIdentity) return true;

  if (
    listingIdentity === identityText(family) &&
    requestedIdentity.startsWith(`${listingIdentity} `)
  ) {
    const qualifier = identityText(listing.description.slice(listing.description.indexOf("(")));
    const discriminators = ["awd", "performance", "turbo", "supercharged", "v6", "v8"];
    return discriminators.some(
      (token) => qualifier.includes(token) && requestedIdentity.includes(token)
    );
  }
  return false;
}

function officialStreetListingForSelection(
  selection: VehicleSelection
): AppendixListing | null {
  const directMatches = selection.variant
    ? appendixListings.filter(
      (listing) =>
        listing.category === "street" &&
        rulebookListingMatchesMake(listing, selection.make) &&
        rulebookYearApplies(listing, selection.year) &&
        normalized(listing.description) === normalized(selection.variant!)
    )
    : [];
  const directClasses = uniqueSorted(directMatches.map((listing) => listing.classId));
  if (directClasses.length === 1) return directMatches[0];

  const listings = rulebookListingsForFamily(
    selection.make,
    selection.model,
    selection.year,
    "street"
  );
  if (listings.length === 0) return null;

  const matches = selection.variant
    ? listings.filter((listing) =>
      rulebookVariantMatches(listing, selection.variant!, selection.model)
    )
    : listings;
  const classes = uniqueSorted(matches.map((listing) => listing.classId));
  return classes.length === 1 ? matches[0] ?? null : null;
}

function relatedOfficialListings(
  streetListing: AppendixListing,
  selection: VehicleSelection
): AppendixListing[] {
  const streetIdentity = rulebookIdentity(streetListing.description);
  const families = familiesForYear(selection.make, selection.year);
  return appendixListings.filter(
    (listing) => {
      const candidateIdentity = rulebookIdentity(listing.description);
      return (
        listing.category !== "street" &&
        rulebookYearApplies(listing, selection.year) &&
        (candidateIdentity === streetIdentity ||
          containsIdentity(candidateIdentity, streetIdentity) ||
          containsIdentity(streetIdentity, candidateIdentity)) &&
        relatedListingIsCompatible(streetListing, listing) &&
        rulebookFamiliesForListing(
          selection.make,
          listing,
          selection.year,
          families
        ).some((family) => normalized(family) === normalized(selection.model))
      );
    }
  );
}

function officialMappingFor(selection: VehicleSelection): VehicleMapping | null {
  const streetListing = officialStreetListingForSelection(selection);
  if (!streetListing) return null;

  const related = relatedOfficialListings(streetListing, selection);
  const curated = findReviewedEntry(selection);
  const allClasses = uniqueSorted([
    streetListing.classId,
    ...related.map((listing) => listing.classId),
    ...(curated?.classes ?? []).map((classId) => classId.toLowerCase())
  ]);
  const sources = [streetListing, ...related].reduce<Record<string, VehicleClassSource>>(
    (result, listing) => {
      const existing = result[listing.classId];
      result[listing.classId] = existing
        ? {
            ...existing,
            description: `${existing.description}; ${listing.description}`
          }
        : {
            description: listing.description,
            ruleSection: listing.ruleSection,
            sourceUrl: listing.sourceUrl
          };
      return result;
    },
    {}
  );

  return {
    selection: {
      ...selection,
      variant: selection.variant ?? streetListing.description
    },
    classes: allClasses,
    source: "2026-rulebook-appendix-a",
    coverage: "verified-classes",
    sourceNote:
      "The exact Street placement and any shown matching preparation-category placements come from the official 2026 Appendix A. Categories without an exact identity match remain unlisted.",
    classSources: sources
  };
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
      ...appendixListings
        .filter(
          (listing) =>
            listing.category === "street" &&
            listing.yearRanges.some(([start]) => start < 1990)
        )
        .flatMap((listing) => rulebookManufacturerMakes(listing.manufacturer)),
      ...SPECIAL_VEHICLES.map((entry) => entry.make)
    ]);
  }

  const makes = new Set(Object.keys(productionVehicles[year] ?? {}).map(normalizeMakeName));
  for (const entry of reviewedEntries) {
    if (entry.year === year) makes.add(canonicalMake(entry.make));
  }
  for (const listing of appendixListings) {
    if (
      listing.category !== "street" ||
      listing.yearRanges.length === 0 ||
      !rulebookYearApplies(listing, year)
    ) {
      continue;
    }
    for (const make of rulebookManufacturerMakes(listing.manufacturer)) {
      makes.add(canonicalMake(make));
    }
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
  const official = rulebookListingsForFamily(
    canonicalMakeName,
    family,
    year,
    "street"
  );

  for (const listing of official) {
    addVariant(variants, listing.description, listing.description);
  }

  for (const entry of reviewed) {
    const reviewedIdentity = rulebookVariantIdentity(
      `${family} ${entry.variant ?? entry.model}`
    );
    if (
      official.some(
        (listing) => rulebookVariantIdentity(listing.description) === reviewedIdentity
      )
    ) {
      continue;
    }
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
    const officialMatches = official.filter((listing) =>
      rulebookVariantMatches(listing, productionVariant, family)
    );
    if (matches.length === 1 || officialMatches.length === 1) continue;
    if (
      (reviewed.length > 0 || official.length > 0) &&
      normalized(productionVariant) === normalized(family)
    ) {
      continue;
    }
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
  const official = officialMappingFor(resolved);
  if (official) return official;

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
  const modelWords = selection.model.trim().split(/\s+/);
  const trailingModelAlias = modelWords[modelWords.length - 1];
  const variantPrefix = selection.variant?.toLowerCase();
  let displayVariant = selection.variant;

  if (variantPrefix?.startsWith(`${selection.model.toLowerCase()} `)) {
    displayVariant = selection.variant?.slice(selection.model.length).trim();
  } else if (
    trailingModelAlias.length >= 4 &&
    variantPrefix?.startsWith(`${trailingModelAlias.toLowerCase()} `)
  ) {
    displayVariant = selection.variant?.slice(trailingModelAlias.length).trim();
  }

  return [selection.year, selection.make, selection.model, displayVariant]
    .filter(Boolean)
    .join(" ");
}
