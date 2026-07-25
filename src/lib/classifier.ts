import { CATEGORY_ORDER, SUPPLEMENTAL_CLASS_IDS, classForCategory } from "./classMetadata";
import { RULE_GROUPS, findRuleOption } from "./rules";
import { getVehicleMapping } from "./vehicleData";
import type {
  BuildProfile,
  CategoryEvaluation,
  ClassificationResult,
  ModificationAssessment,
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

/**
 * Preparation is evaluated without looking at Appendix A. CATEGORY_ORDER is a
 * preference order from least to most prepared, not a claim that permissions
 * form a ladder. Each category is tested independently against every finding.
 */
function assessModifications(findings: RuleFinding[]): ModificationAssessment {
  const manualFindings = findings.filter((finding) => finding.manualReview);
  const categoryBlockers = Object.fromEntries(
    CATEGORY_ORDER.map((category) => [
      category,
      findings.filter((finding) => !finding.allowedCategories.includes(category))
    ])
  ) as Record<PrincipalCategory, RuleFinding[]>;

  if (manualFindings.length > 0) {
    return {
      legalCategories: [],
      minimumLegalCategory: null,
      manualFindings,
      categoryBlockers
    };
  }

  const legalCategories = CATEGORY_ORDER.filter(
    (category) => categoryBlockers[category].length === 0
  );

  return {
    legalCategories,
    minimumLegalCategory: legalCategories[0] ?? null,
    manualFindings: [],
    categoryBlockers
  };
}

function evaluateCategory(
  category: PrincipalCategory,
  mapping: VehicleMapping,
  findings: RuleFinding[],
  preparation: ModificationAssessment
): CategoryEvaluation {
  const classId = classForCategory(mapping.classes, category);
  const blockers = preparation.categoryBlockers[category];
  const manualFindings = findings.filter((finding) => finding.manualReview);
  const preparationLegal = manualFindings.length === 0 && blockers.length === 0;
  const mappingAvailable = Boolean(classId);

  if (manualFindings.length > 0) {
    return {
      category,
      status: "manual-review",
      classId,
      blockers: manualFindings,
      preparationLegal: false,
      mappingAvailable,
      note: "At least one selected modification requires exact rule-text or fitment review."
    };
  }

  if (blockers.length > 0) {
    return {
      category,
      status: "blocked",
      classId,
      blockers,
      preparationLegal: false,
      mappingAvailable
    };
  }

  if (!mappingAvailable) {
    const note =
      category === "street" ||
      category === "streetTouring" ||
      category === "streetPrepared"
        ? "The build passes the modeled preparation checks, but this exact vehicle has no unambiguous current Appendix A placement in this category."
        : category === "streetModified"
          ? "Section 16 eligibility depends on original seating, driven wheels, exclusions, and minimum-weight compliance; those controlling facts are not inferred from the model name."
          : category === "prepared"
            ? "Section 17 uses explicit Prepared listings, construction limits, displacement, and minimum-weight formulas; this profile does not invent a Prepared class without those facts."
            : "Section 18 classing depends on vehicle construction, engine displacement, formula or sports-racer specification, and weight; a model-family match alone cannot establish a Modified class.";
    return {
      category,
      status: "not-listed",
      blockers: [],
      preparationLegal: preparation.legalCategories.includes(category),
      mappingAvailable: false,
      note
    };
  }

  return {
    category,
    status: "eligible",
    classId,
    blockers: [],
    preparationLegal: true,
    mappingAvailable: true
  };
}

function buildMessages(
  mapping: VehicleMapping,
  preparation: ModificationAssessment,
  evaluations: CategoryEvaluation[]
): string[] {
  const messages: string[] = [];
  const selected = evaluations.find((evaluation) => evaluation.status === "eligible");

  if (preparation.minimumLegalCategory) {
    messages.push(
      `The modification profile is first legal in ${preparation.minimumLegalCategory} before vehicle placement is considered.`
    );
  }

  if (selected && preparation.minimumLegalCategory !== selected.category) {
    messages.push(
      `The build is legal in ${preparation.minimumLegalCategory ?? "the modeled categories"}, but that exact vehicle has no reviewed placement there. ${selected.category} is the least-prepared category that is both legal and listed.`
    );
  }

  if (!selected) {
    messages.push(
      "No principal category is both legal for the selected modifications and reviewed for this exact vehicle. Manual review is required."
    );
  }

  if (preparation.manualFindings.length > 0) {
    messages.push(
      "One or more selections are intentionally not auto-classed because exact dimensions, construction, or rule wording control eligibility."
    );
  }

  if (mapping.coverage !== "full-mapping") {
    messages.push(
      "Only the exact placements listed in the current source review are used. Older, similar, or unverified category mappings are not carried forward."
    );
  }

  return messages;
}

export function classifyVehicleWithMapping(
  selection: VehicleSelection,
  build: BuildProfile,
  mapping: VehicleMapping
): ClassificationResult {
  const findings = evaluateFindings(build);
  const preparation = assessModifications(findings);
  const evaluations = CATEGORY_ORDER.map((category) =>
    evaluateCategory(category, mapping, findings, preparation)
  );
  const selected = evaluations.find((evaluation) => evaluation.status === "eligible");
  const supplementalClasses = mapping.classes.filter((classId) =>
    SUPPLEMENTAL_CLASS_IDS.has(classId)
  );

  return {
    mapping,
    selectedCategory: selected?.category ?? null,
    selectedClass: selected?.classId ?? null,
    confidence:
      !selected || preparation.manualFindings.length > 0
        ? "manual-review"
        : mapping.coverage !== "full-mapping"
          ? "limited"
          : "high",
    evaluations,
    findings,
    preparation,
    supplementalClasses,
    messages: buildMessages(mapping, preparation, evaluations)
  };
}

export function classifyVehicle(
  selection: VehicleSelection,
  build: BuildProfile
): ClassificationResult {
  const findings = evaluateFindings(build);
  const preparation = assessModifications(findings);
  const mapping = getVehicleMapping(selection);

  if (!mapping) {
    const vehicleMessage = selection.notListed
      ? "This vehicle is outside the reviewed catalog. Send the exact year, make, model, and package details to a regional chair instead of guessing."
      : "This exact year, model, and submodel does not yet have a reviewed first-party placement in this app. Do not guess from a similar trim; send it for manual review.";
    return {
      mapping: null,
      selectedCategory: null,
      selectedClass: null,
      confidence: "manual-review",
      evaluations: CATEGORY_ORDER.map((category) => ({
        category,
        status: "manual-review",
        blockers: preparation.manualFindings,
        preparationLegal: preparation.legalCategories.includes(category),
        mappingAvailable: false,
        note: vehicleMessage
      })),
      findings,
      preparation,
      supplementalClasses: [],
      messages: [
        vehicleMessage,
        preparation.minimumLegalCategory
          ? `The modification profile is first legal in ${preparation.minimumLegalCategory}, but the exact vehicle placement is still missing.`
          : "The modification profile cannot be completed automatically from the selected details."
      ]
    };
  }

  return classifyVehicleWithMapping(selection, build, mapping);
}
