export type PrincipalCategory =
  | "street"
  | "streetTouring"
  | "streetPrepared"
  | "streetModified"
  | "prepared"
  | "modified";

export type CategoryStatus =
  | "eligible"
  | "blocked"
  | "not-listed"
  | "manual-review";

export interface VehicleSelection {
  make: string;
  model: string;
  year: string;
  /** Raw rulebook/import model key when a family has multiple variants. */
  variant?: string;
  notListed?: boolean;
  manualDescription?: string;
}

export interface VehicleVariant {
  value: string;
  label: string;
}

export interface VehicleClassSource {
  description: string;
  ruleSection: string;
  sourceUrl: string;
}

export interface VehicleMapping {
  selection: VehicleSelection;
  classes: string[];
  source:
    | "2026-rulebook-appendix-a"
    | "2026-street-overlay"
    | "2026-current-override";
  coverage: "full-mapping" | "street-only" | "verified-classes";
  sourceNote: string;
  classSources?: Record<string, VehicleClassSource>;
}

export type BuildProfile = {
  tires: string;
  wheels: string;
  shocks: string;
  springs: string;
  swayBars: string;
  alignment: string;
  intake: string;
  exhaust: string;
  ecu: string;
  engine: string;
  differential: string;
  brakes: string;
  aero: string;
  safety: string;
  interior: string;
  body: string;
  other: string;
  xtremeVehicleType: string;
  drivetrainLayout: string;
  xtremePowertrain: string;
  competitionWeight: string;
  roadEquipment: string;
  bodyConfiguration: string;
  engineDisplacementLiters: string;
  inductionType: string;
  measuredWeightNoDriver: string;
  tireWidthCategory: string;
  solidAxleRwd: string;
  measuredWeightWithDriverModified: string;
  tractionAidsPresent: string;
  aeroWingsPresent: string;
  activeReactiveSuspension: string;
  rearWeightBiasOver51: string;
  cpEngineConfiguration: string;
  valveCountPerCylinder: string;
  variableCamTiming: string;
  wheelWidthCategory: string;
  alternateEngineAllowance: string;
};

export type BuildField = keyof BuildProfile;

export interface RuleOption {
  value: string;
  label: string;
  /** Plain-language rewrite of `label` for the build-wizard dropdown; `label` stays the technical/audit-trail text. */
  plainLabel?: string;
  description: string;
  allowedCategories: PrincipalCategory[];
  section: string;
  manualReview?: boolean;
  classConstraints?: Partial<Record<PrincipalCategory, string[]>>;
}

export interface RuleGroup {
  field: BuildField;
  title: string;
  help: string;
  options: RuleOption[];
  principalRelevant?: boolean;
  /** "number" renders a free-text numeric input instead of the options dropdown. */
  inputType?: "select" | "number";
  numberPlaceholder?: string;
}

export interface RuleFinding {
  field: BuildField;
  title: string;
  selectedLabel: string;
  description: string;
  section: string;
  allowedCategories: PrincipalCategory[];
  manualReview: boolean;
  classConstraints?: Partial<Record<PrincipalCategory, string[]>>;
}

export interface CategoryEvaluation {
  category: PrincipalCategory;
  status: CategoryStatus;
  classId?: string;
  blockers: RuleFinding[];
  preparationLegal: boolean;
  mappingAvailable: boolean;
  note?: string;
}

export interface ModificationAssessment {
  /** Categories where every selected modification is represented as legal. */
  legalCategories: PrincipalCategory[];
  /** Least-prepared category permitted by the modification set alone. */
  minimumLegalCategory: PrincipalCategory | null;
  manualFindings: RuleFinding[];
  /** Independent blockers for each category; categories do not inherit one another's result. */
  categoryBlockers: Record<PrincipalCategory, RuleFinding[]>;
}

export interface ClassificationResult {
  mapping: VehicleMapping | null;
  selectedCategory: PrincipalCategory | null;
  selectedClass: string | null;
  confidence: "high" | "limited" | "manual-review";
  evaluations: CategoryEvaluation[];
  findings: RuleFinding[];
  preparation: ModificationAssessment;
  supplementalClasses: string[];
  xtremeStreet: XtremeStreetEvaluation;
  streetModified: StreetModifiedEvaluation;
  modifiedProduction: ModifiedProductionEvaluation;
  preparedXp: PreparedXpEvaluation;
  preparedCp: PreparedCpEvaluation;
  preparedDp: PreparedDpEvaluation;
  preparedEp: PreparedEpEvaluation;
  messages: string[];
}

export type StreetModifiedClassId = "ssm" | "sm" | "smf";

export interface StreetModifiedEvaluation {
  status: "eligible" | "blocked" | "manual-review";
  eligibleClasses: StreetModifiedClassId[];
  recommendedClass: StreetModifiedClassId | null;
  reasons: string[];
  blockers: string[];
  /** Calculated minimum weight (without driver, lbs) for each class that was evaluated. */
  minimumWeights: Partial<Record<StreetModifiedClassId, number>>;
}

export interface XtremeStreetEvaluation {
  status: "eligible" | "blocked" | "manual-review";
  eligibleClasses: Array<"xa" | "xb">;
  recommendedClass: "xa" | "xb" | null;
  reasons: string[];
  blockers: string[];
}

export type ModifiedProductionClassId = "dm" | "em";

export interface ModifiedProductionEvaluation {
  status: "eligible" | "blocked" | "manual-review";
  classId: ModifiedProductionClassId | null;
  reasons: string[];
  blockers: string[];
  /** Minimum weight with driver (lbs) required for the evaluated class. */
  minimumWeight: number | null;
}

export interface PreparedXpEvaluation {
  status: "eligible" | "blocked" | "manual-review";
  reasons: string[];
  blockers: string[];
  /** Minimum weight without driver (lbs) computed from the Section 17 XP formula. */
  minimumWeight: number | null;
}

export interface PreparedCpEvaluation {
  status: "eligible" | "blocked" | "manual-review" | "not-listed";
  reasons: string[];
  blockers: string[];
  /** Minimum weight without driver (lbs) computed from the CP flat-rate table. */
  minimumWeight: number | null;
  /** The matched CP listing's description, when the vehicle is specifically listed. */
  matchedListing: string | null;
}

export interface PreparedDpEvaluation {
  status: "eligible" | "blocked" | "manual-review" | "not-listed";
  reasons: string[];
  blockers: string[];
  /** Minimum weight without driver (lbs) computed from the DP displacement formula. */
  minimumWeight: number | null;
  /** The matched DP listing's description, when the vehicle is specifically listed. */
  matchedListing: string | null;
}

export interface PreparedEpEvaluation {
  status: "eligible" | "blocked" | "manual-review" | "not-listed";
  reasons: string[];
  blockers: string[];
  /** Minimum weight without driver (lbs) computed from the EP displacement formula. */
  minimumWeight: number | null;
  /** The matched EP listing's description, when the vehicle is specifically listed. */
  matchedListing: string | null;
}

export interface NationalCompetitionRecord {
  year: number;
  classId: string;
  finish: string;
  sourceLabel: string;
  sourceUrl: string;
  division: "open" | "ladies";
  vehicle: string;
  vehicleYear: number | null;
  tireManufacturer: string | null;
}
