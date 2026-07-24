import reviewedVehicleData from "./reviewed-vehicles2026.json";

export interface StreetOverlay {
  make: string;
  /** Canonical model family shown in the first vehicle selector. */
  model: string;
  year: string;
  /** Exact year-specific trim, engine, drivetrain, or package when needed. */
  variant?: string;
  classes: string[];
  sourceNote: string;
  aliases?: string[];
}

const streetOnlyNote =
  "Current Appendix A Street placement verified from the official 2026 Solo Rules; no higher-category placement is inferred.";

const partialMappingNote =
  "Current official source review verified only the listed exact Appendix A or Appendix B classes for this entry; additional category mappings were not inferred from older or third-party data.";

type ReviewedVehicleRecord = Omit<StreetOverlay, "sourceNote"> & {
  source: "street-only" | "verified-classes";
};

const reviewedRecords = reviewedVehicleData as ReviewedVehicleRecord[];

/**
 * This is deliberately a reviewed catalog, not a copy of the legacy vehicle
 * import. Model families are explicit, so trim and package names cannot leak
 * into the model selector as duplicate vehicles.
 */
export const STREET_OVERLAYS_2026: StreetOverlay[] = reviewedRecords
  .filter((entry) => entry.source === "street-only")
  .map(({ source: _source, ...entry }) => ({
    ...entry,
    sourceNote: streetOnlyNote
  }));

export interface CurrentMappingOverride extends StreetOverlay {
  coverage: "full-mapping" | "verified-classes";
}

export const CURRENT_MAPPING_OVERRIDES: CurrentMappingOverride[] = reviewedRecords
  .filter((entry) => entry.source === "verified-classes")
  .map(({ source: _source, ...entry }) => ({
    ...entry,
    coverage: "verified-classes" as const,
    sourceNote: partialMappingNote
  }));
