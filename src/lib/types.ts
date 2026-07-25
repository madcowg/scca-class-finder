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

export interface VehicleMapping {
  selection: VehicleSelection;
  classes: string[];
  source: "2026-street-overlay" | "2026-current-override";
  coverage: "full-mapping" | "street-only" | "verified-classes";
  sourceNote: string;
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
};

export type BuildField = keyof BuildProfile;

export interface RuleOption {
  value: string;
  label: string;
  description: string;
  allowedCategories: PrincipalCategory[];
  section: string;
  manualReview?: boolean;
}

export interface RuleGroup {
  field: BuildField;
  title: string;
  help: string;
  options: RuleOption[];
}

export interface RuleFinding {
  field: BuildField;
  title: string;
  selectedLabel: string;
  description: string;
  section: string;
  allowedCategories: PrincipalCategory[];
  manualReview: boolean;
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
  messages: string[];
}

export interface NationalCompetitionRecord {
  year: number;
  classId: string;
  finish: string;
  sourceLabel: string;
  sourceUrl: string;
}
