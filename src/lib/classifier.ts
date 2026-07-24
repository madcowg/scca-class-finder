import {
  CATEGORY_ORDER,
  SUPPLEMENTAL_CLASS_IDS,
  classForCategory
} from "./classMetadata";
import { RULE_GROUPS, findRuleOption } from "./rules";
import { getVehicleMapping } from "./vehicleData";
import type {
  BuildProfile,
  CategoryEvaluation,
  ClassificationResult,
  PrincipalCategory,
  RuleFinding,
  VehicleMapping,
  VehicleSelection
} from "./types";

function evaluateFindings(build: BuildProfile): RuleFinding[] {
  return RULE_GROUPS.map((group) => {
    const selected = findRuleOption(group.field, build[group.field]);
    if (!selected) {
      return {
        field: group.field,
        title: group.title,
        selectedLabel: "Unknown option",
        description: "The selected value is not recognized by this rule model.",
        section: "Manual review",
        allowedCategories: [],
        manualReview: true
      };
    }
    return {
      field: group.field,
      title: group.title,
      selectedLabel: selected.label,
      description: selected.description,
      section: selected.section,
      allowedCategories: selected.allowedCategories,
      manualReview: Boolean(selected.manualReview)
    };
  });
}

function evaluateCategory(
  category: PrincipalCategory,
  mapping: NonNullable<ClassificationResult["mapping"]>,
  findings: RuleFinding[]
): CategoryEvaluation {
  const classId = classForCategory(mapping.classes, category);
  const mappingAvailable = Boolean(classId);
  const blockers = findings.filter(
    (finding) => !finding.allowedCategories.includes(category)
  );
  const anyManualFinding = findings.some((finding) => finding.manualReview);
  const verifiedClassSummary =
    mapping.classes
      .filter((classId) => !SUPPLEMENTAL_CLASS_IDS.has(classId))
      .map((classId) => classId.toUpperCase())
      .join(", ") || "the listed classes";

  if (mapping.coverage === "street-only" && category !== "street") {
    return {
      category,
      status: "manual-review",
      mappingAvailable: false,
      blockers,
      note: "This 2026 overlay verifies Street only; no higher-category class is inferred."
    };
  }

  if (anyManualFinding) {
    return {
      category,
      status: "manual-review",
      classId,
      blockers: findings.filter((finding) => finding.manualReview),
      mappingAvailable,
      note: "At least one selected modification requires exact rule-text review."
    };
  }

  if (blockers.length > 0) {
    return {
      category,
      status: "blocked",
      classId,
      blockers,
      mappingAvailable
    };
  }

  if (mapping.coverage === "verified-classes" && !mappingAvailable) {
    return {
      category,
      status: "manual-review",
      blockers: [],
      mappingAvailable: false,
      note: `Current source review verified ${verifiedClassSummary} for this exact car; this category was not inferred.`
    };
  }

  if (!mappingAvailable) {
    return {
      category,
      status: "not-listed",
      blockers: [],
      mappingAvailable: false,
      note: "The modification profile fits, but this vehicle mapping has no class in this category."
    };
  }

  return {
    category,
    status: "eligible",
    classId,
    blockers: [],
    mappingAvailable: true
  };
}

export function classifyVehicleWithMapping(
  selection: VehicleSelection,
  build: BuildProfile,
  mapping: VehicleMapping
): ClassificationResult {
  const findings = evaluateFindings(build);
  const messages: string[] = [];

  const evaluations = CATEGORY_ORDER.map((category) =>
    evaluateCategory(category, mapping, findings)
  );

  const selected = evaluations.find((evaluation) => evaluation.status === "eligible");
  const hasManualFinding = findings.some((finding) => finding.manualReview);
  const supplementalClasses = mapping.classes.filter((classId) =>
    SUPPLEMENTAL_CLASS_IDS.has(classId)
  );

  if (mapping.coverage === "street-only") {
    messages.push(
      "Only the 2026 Street placement is verified for this entry. A modified build requires a current Appendix A lookup."
    );
  }

  if (mapping.coverage === "verified-classes") {
    const verifiedClassSummary =
      mapping.classes
        .filter((classId) => !SUPPLEMENTAL_CLASS_IDS.has(classId))
        .map((classId) => classId.toUpperCase())
        .join(", ");
    messages.push(
      `Only the current verified classes ${verifiedClassSummary} are used for this exact entry. Additional category mappings are not guessed from older or third-party data.`
    );
  }

  if (!selected) {
    messages.push(
      "No principal category is both legal for the selected build and present in this vehicle mapping. Manual review is required."
    );
  }

  if (hasManualFinding) {
    messages.push(
      "One or more selections are intentionally not auto-classed because exact dimensions, construction, or rule wording control eligibility."
    );
  }

  return {
    mapping,
    selectedCategory: selected?.category ?? null,
    selectedClass: selected?.classId ?? null,
    confidence:
      !selected || hasManualFinding
        ? "manual-review"
        : mapping.coverage !== "full-mapping"
          ? "limited"
          : "high",
    evaluations,
    findings,
    supplementalClasses,
    messages
  };
}

export function classifyVehicle(
  selection: VehicleSelection,
  build: BuildProfile
): ClassificationResult {
  const mapping = getVehicleMapping(selection);
  if (!mapping) {
    const vehicleMessage = selection.notListed
      ? "This vehicle is outside the current listed catalog. Send the exact year, make, model, and package details to a regional chair instead of guessing."
      : "This exact vehicle does not yet have a reviewed first-party placement in this app. Do not guess from a similar trim; send it for manual review.";
    return {
      mapping: null,
      selectedCategory: null,
      selectedClass: null,
      confidence: "manual-review",
      evaluations: CATEGORY_ORDER.map((category) => ({
        category,
        status: "manual-review",
        blockers: [],
        mappingAvailable: false,
        note: selection.notListed
          ? "Vehicle is not listed in the current catalog."
          : "This exact vehicle needs a first-party placement review."
      })),
      findings: evaluateFindings(build),
      supplementalClasses: [],
      messages: [vehicleMessage]
    };
  }
  return classifyVehicleWithMapping(selection, build, mapping);
}
