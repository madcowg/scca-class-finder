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
}

export interface VehicleMapping {
  selection: VehicleSelection;
  classes: string[];
  source: "upstream" | "2026-street-overlay" | "2026-current-override";
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
  mappingAvailable: boolean;
  note?: string;
}

export interface ClassificationResult {
  mapping: VehicleMapping | null;
  selectedCategory: PrincipalCategory | null;
  selectedClass: string | null;
  confidence: "high" | "limited" | "manual-review";
  evaluations: CategoryEvaluation[];
  findings: RuleFinding[];
  supplementalClasses: string[];
  messages: string[];
}
