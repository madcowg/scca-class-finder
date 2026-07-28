import { CATEGORY_ORDER, CATEGORY_SECTIONS, SUPPLEMENTAL_CLASS_IDS, classForCategory } from "./classMetadata";
import { RULE_GROUPS, findRuleOption } from "./rules";
import { getVehicleMapping } from "./vehicleData";
import { evaluateStreetModified } from "./streetModified";
import { evaluateModifiedProduction } from "./modified";
import { evaluatePreparedXp } from "./prepared";
import { evaluatePreparedCP } from "./preparedCP";
import { evaluatePreparedDP } from "./preparedDP";
import { evaluatePreparedEP } from "./preparedEP";
import type {
  BuildProfile,
  CategoryEvaluation,
  ClassificationResult,
  ModificationAssessment,
  ModifiedProductionEvaluation,
  PreparedCpEvaluation,
  PreparedDpEvaluation,
  PreparedEpEvaluation,
  PreparedXpEvaluation,
  PrincipalCategory,
  RuleFinding,
  StreetModifiedEvaluation,
  VehicleMapping,
  VehicleSelection,
  XtremeStreetEvaluation
} from "./types";

function evaluateFindings(build: BuildProfile): RuleFinding[] {
  return RULE_GROUPS.filter((group) => group.principalRelevant !== false).map((group) => {
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
      manualReview: Boolean(selected.manualReview),
      classConstraints: selected.classConstraints
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

interface FormulaCategoryEval {
  status: "eligible" | "blocked" | "manual-review";
  classId?: string;
  blockers: string[];
}

function formulaEvalFor(
  category: PrincipalCategory,
  streetModifiedEval: StreetModifiedEvaluation | null,
  modifiedProductionEval: ModifiedProductionEvaluation | null,
  preparedXpEval: PreparedXpEvaluation | null,
  preparedCpEval: PreparedCpEvaluation | null,
  preparedDpEval: PreparedDpEvaluation | null,
  preparedEpEval: PreparedEpEvaluation | null
): FormulaCategoryEval | null {
  if (category === "streetModified" && streetModifiedEval) {
    return {
      status: streetModifiedEval.status,
      classId: streetModifiedEval.recommendedClass ?? undefined,
      blockers: streetModifiedEval.blockers
    };
  }
  if (category === "modified" && modifiedProductionEval) {
    return {
      status: modifiedProductionEval.status,
      classId: modifiedProductionEval.classId ?? undefined,
      blockers: modifiedProductionEval.blockers
    };
  }
  if (category === "prepared") {
    // A vehicle specifically listed in CP or DP is authoritative over XP's generic
    // catch-all formula; CP and DP are mutually exclusive per-vehicle lists.
    if (preparedCpEval && preparedCpEval.status !== "not-listed") {
      return {
        status: preparedCpEval.status,
        classId: preparedCpEval.status === "eligible" ? "cp" : undefined,
        blockers: preparedCpEval.blockers
      };
    }
    if (preparedDpEval && preparedDpEval.status !== "not-listed") {
      return {
        status: preparedDpEval.status,
        classId: preparedDpEval.status === "eligible" ? "dp" : undefined,
        blockers: preparedDpEval.blockers
      };
    }
    if (preparedEpEval && preparedEpEval.status !== "not-listed") {
      return {
        status: preparedEpEval.status,
        classId: preparedEpEval.status === "eligible" ? "ep" : undefined,
        blockers: preparedEpEval.blockers
      };
    }
    if (preparedXpEval) {
      return {
        status: preparedXpEval.status,
        classId: preparedXpEval.status === "eligible" ? "xp" : undefined,
        blockers: preparedXpEval.blockers
      };
    }
  }
  return null;
}

function evaluateCategory(
  category: PrincipalCategory,
  mapping: VehicleMapping | null,
  findings: RuleFinding[],
  preparation: ModificationAssessment,
  streetModifiedEval: StreetModifiedEvaluation | null,
  modifiedProductionEval: ModifiedProductionEvaluation | null = null,
  preparedXpEval: PreparedXpEvaluation | null = null,
  preparedCpEval: PreparedCpEvaluation | null = null,
  preparedDpEval: PreparedDpEvaluation | null = null,
  preparedEpEval: PreparedEpEvaluation | null = null
): CategoryEvaluation {
  // A specifically-listed vehicle classId (from the reviewed catalog or official Appendix A)
  // is authoritative over the generic Section 16/17/18 formula, which only fills in when no
  // vehicle-specific placement exists for that category.
  const mappedClassId = mapping ? classForCategory(mapping.classes, category) : undefined;
  const formulaEval = mappedClassId
    ? null
    : formulaEvalFor(
        category,
        streetModifiedEval,
        modifiedProductionEval,
        preparedXpEval,
        preparedCpEval,
        preparedDpEval,
        preparedEpEval
      );
  const classId = mappedClassId ?? (formulaEval?.status === "eligible" ? formulaEval.classId : undefined);
  const classSpecificBlockers = classId
    ? findings.filter((finding) => {
        const allowedClasses = finding.classConstraints?.[category];
        return allowedClasses && !allowedClasses.includes(classId);
      })
    : [];
  const blockers = [
    ...preparation.categoryBlockers[category],
    ...classSpecificBlockers
  ];
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

  if (formulaEval && formulaEval.status !== "eligible") {
    const fallbackNote =
      category === "streetModified"
        ? "Section 16 SSM/SM/SMF eligibility could not be established from the current inputs."
        : category === "modified"
          ? "Section 18 DM/EM eligibility could not be established from the current inputs."
          : "Section 17 XP eligibility could not be established from the current inputs.";
    return {
      category,
      status: formulaEval.status === "manual-review" ? "manual-review" : "blocked",
      blockers: [],
      preparationLegal: preparation.legalCategories.includes(category),
      mappingAvailable: false,
      note: formulaEval.blockers.join(" ") || fallbackNote
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

const WEIGHT_FLOORS: Record<string, number | null> = {
  unknown: null,
  under2180: 0,
  "2180to2329": 2180,
  "2330to2479": 2330,
  "2480to2679": 2480,
  "2680to2929": 2680,
  "2930to3179": 2930,
  "3180plus": 3180
};

const XTREME_MINIMUMS = {
  fwd: { xa: 2680, xb: 2180 },
  rwd: { xa: 2930, xb: 2330 },
  awd: { xa: 3180, xb: 2480 }
} as const;

function evaluateXtremeStreet(
  build: BuildProfile,
  mapping: VehicleMapping | null
): XtremeStreetEvaluation {
  const blockers: string[] = [];
  const manual: string[] = [];
  const reasons: string[] = [];
  const mappedCamClass = mapping?.classes.find((classId) =>
    ["camc", "camt", "cams"].includes(classId)
  );

  if (mappedCamClass || build.xtremeVehicleType === "camEligible") {
    blockers.push("CAM-eligible vehicles are expressly excluded from XA and XB.");
  } else if (build.xtremeVehicleType === "kitOrComponent") {
    blockers.push("Owner-completed kit or component cars are excluded from XA and XB.");
  } else if (build.xtremeVehicleType === "unknown") {
    manual.push("Confirm that the car is a factory-VIN production road car and is neither CAM-eligible nor an excluded kit/component car.");
  } else {
    reasons.push("The selected vehicle type passes the modeled XA/XB production-car exclusions.");
  }

  if (build.roadEquipment === "missing") {
    blockers.push("Required headlights, brake lights, turn signals, horn, or factory-equipped wipers are missing or inoperative.");
  } else if (build.roadEquipment === "unknown") {
    manual.push("Confirm that every required Section 21 road-equipment item works.");
  } else {
    reasons.push("The required Section 21 road equipment is reported functional.");
  }

  if (build.xtremePowertrain === "electrifiedModified") {
    blockers.push("XA/XB prohibits changes to a hybrid or EV tractive system or its programming.");
  } else if (build.xtremePowertrain === "converted") {
    blockers.push("XA/XB prohibits converting between combustion, hybrid, and electric powertrain types.");
  } else if (build.xtremePowertrain === "unknown") {
    manual.push("Identify the original powertrain type and, for a hybrid or EV, confirm that the complete tractive system and programming remain original.");
  } else {
    reasons.push(
      build.xtremePowertrain === "electrifiedFactory"
        ? "The hybrid/EV tractive system and programming are reported as original."
        : "The car retains its original internal-combustion powertrain type."
    );
  }

  if (build.drivetrainLayout === "converted") {
    blockers.push("XA/XB prohibits conversion to a different driven-wheel layout.");
  } else if (build.drivetrainLayout === "unknown") {
    manual.push("Identify whether the factory driven-wheel layout is FWD, RWD, or AWD.");
  }

  if (!["street200", "vitourP1"].includes(build.tires)) {
    blockers.push("XA/XB permits only Section 13.3 Street-eligible tires or the Vitour Tempesta P1/P1+ exception.");
  } else {
    reasons.push("The selected tire path is permitted by Section 21.4.");
  }

  if (build.aero === "activeOrExtreme") {
    manual.push("Confirm the aero dimensions and lock any in-motion-adjustable wing in one position.");
  }
  if (build.body === "tubeFrame") {
    manual.push("Confirm that the body still has the recognizable shape of the original make and model.");
  }
  if (build.other === "unlisted") {
    manual.push("Describe every unlisted modification so its Section 21 legality can be checked.");
  }

  const weightFloor = WEIGHT_FLOORS[build.competitionWeight];
  const drivetrain =
    build.drivetrainLayout === "fwd" ||
    build.drivetrainLayout === "rwd" ||
    build.drivetrainLayout === "awd"
      ? build.drivetrainLayout
      : null;

  if (weightFloor === null || weightFloor === undefined) {
    manual.push("Provide measured competition weight with the driver; published curb weight is not sufficient.");
  }

  if (blockers.length > 0) {
    return {
      status: "blocked",
      eligibleClasses: [],
      recommendedClass: null,
      reasons,
      blockers
    };
  }

  if (manual.length > 0 || !drivetrain || weightFloor === null || weightFloor === undefined) {
    return {
      status: "manual-review",
      eligibleClasses: [],
      recommendedClass: null,
      reasons,
      blockers: manual
    };
  }

  const minimums = XTREME_MINIMUMS[drivetrain];
  const eligibleClasses: Array<"xa" | "xb"> = [];
  if (weightFloor >= minimums.xa) eligibleClasses.push("xa");
  if (weightFloor >= minimums.xb) eligibleClasses.push("xb");

  if (eligibleClasses.length === 0) {
    return {
      status: "blocked",
      eligibleClasses: [],
      recommendedClass: null,
      reasons,
      blockers: [
        `The reported weight band is below the ${minimums.xb} lb XB minimum for ${drivetrain.toUpperCase()}.`
      ]
    };
  }

  const recommendedClass = eligibleClasses.includes("xa") ? "xa" : "xb";
  reasons.push(
    `${recommendedClass.toUpperCase()} is the closest minimum-weight match for the reported ${drivetrain.toUpperCase()} competition-weight band.`
  );
  if (eligibleClasses.length > 1) {
    reasons.push("Both XA and XB pass the objective minimum-weight check; they are separate class descriptions, not preparation steps.");
  }

  return {
    status: "eligible",
    eligibleClasses,
    recommendedClass,
    reasons,
    blockers: []
  };
}

function buildMessages(
  mapping: VehicleMapping,
  preparation: ModificationAssessment,
  evaluations: CategoryEvaluation[],
  xtremeStreet: XtremeStreetEvaluation
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

  if (!selected && xtremeStreet.status === "eligible" && xtremeStreet.recommendedClass) {
    messages.push(
      `No principal category is complete for this build, but the separately evaluated Section 21 path supports ${xtremeStreet.recommendedClass.toUpperCase()}.`
    );
  } else if (!selected) {
    messages.push(
      "No principal category is both legal for the selected modifications and reviewed for this exact vehicle. Manual review is required."
    );
  }

  if (preparation.manualFindings.length > 0) {
    messages.push(
      !selected && xtremeStreet.status === "eligible"
        ? "The selected build cannot be auto-placed in a principal Street-through-Modified category, but it passed the independent Section 21 Xtreme Street checks."
        : "One or more selections are intentionally not auto-classed because exact dimensions, construction, or rule wording control eligibility."
    );
  }

  if (mapping.coverage !== "full-mapping" && selected) {
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
  const streetModified = evaluateStreetModified(build, mapping);
  const modifiedProduction = evaluateModifiedProduction(build);
  const preparedXp = evaluatePreparedXp(build);
  const preparedCp = evaluatePreparedCP(selection, build);
  const preparedDp = evaluatePreparedDP(selection, build);
  const preparedEp = evaluatePreparedEP(selection, build);
  const evaluations = CATEGORY_ORDER.map((category) =>
    evaluateCategory(
      category,
      mapping,
      findings,
      preparation,
      streetModified,
      modifiedProduction,
      preparedXp,
      preparedCp,
      preparedDp,
      preparedEp
    )
  );
  const selectedPrincipal = evaluations.find((evaluation) => evaluation.status === "eligible");
  const xtremeStreet = evaluateXtremeStreet(build, mapping);
  const selectedClass =
    selectedPrincipal?.classId ??
    (xtremeStreet.status === "eligible" ? xtremeStreet.recommendedClass : null);
  const supplementalClasses = [
    ...new Set([
      ...mapping.classes.filter((classId) => SUPPLEMENTAL_CLASS_IDS.has(classId)),
      ...xtremeStreet.eligibleClasses
    ])
  ];

  return {
    mapping,
    selectedCategory: selectedPrincipal?.category ?? null,
    selectedClass,
    confidence:
      !selectedClass ||
      (Boolean(selectedPrincipal) && preparation.manualFindings.length > 0)
        ? "manual-review"
        : mapping.coverage !== "full-mapping"
          ? "limited"
          : "high",
    evaluations,
    findings,
    preparation,
    supplementalClasses,
    xtremeStreet,
    streetModified,
    modifiedProduction,
    preparedXp,
    preparedCp,
    preparedDp,
    preparedEp,
    messages: buildMessages(mapping, preparation, evaluations, xtremeStreet)
  };
}

export function classifyVehicle(
  selection: VehicleSelection,
  build: BuildProfile
): ClassificationResult {
  const findings = evaluateFindings(build);
  const preparation = assessModifications(findings);
  const mapping = getVehicleMapping(selection);
  const xtremeStreet = evaluateXtremeStreet(build, mapping);
  const streetModified = evaluateStreetModified(build, mapping);
  const modifiedProduction = evaluateModifiedProduction(build);
  const preparedXp = evaluatePreparedXp(build);
  const preparedCp = evaluatePreparedCP(selection, build);
  const preparedDp = evaluatePreparedDP(selection, build);
  const preparedEp = evaluatePreparedEP(selection, build);

  if (!mapping) {
    const vehicleMessage = selection.notListed
      ? "This vehicle is outside the reviewed catalog. Send the exact year, make, model, and package details to a regional chair instead of guessing."
      : "This exact year, model, and submodel does not yet have a reviewed first-party placement in this app. Do not guess from a similar trim; send it for manual review.";
    const formulaOnlyCategories: PrincipalCategory[] = ["streetModified", "prepared", "modified"];
    const evaluations = CATEGORY_ORDER.map((category) =>
      formulaOnlyCategories.includes(category)
        ? evaluateCategory(
            category,
            null,
            findings,
            preparation,
            streetModified,
            modifiedProduction,
            preparedXp,
            preparedCp,
            preparedDp,
            preparedEp
          )
        : {
            category,
            status: "manual-review" as const,
            blockers: preparation.manualFindings,
            preparationLegal: preparation.legalCategories.includes(category),
            mappingAvailable: false,
            note: vehicleMessage
          }
    );
    const selectedPrincipal = evaluations.find((evaluation) => evaluation.status === "eligible");
    const xtremeEligible = xtremeStreet.status === "eligible" && xtremeStreet.recommendedClass;
    const selectedClass = selectedPrincipal?.classId ?? (xtremeEligible ? xtremeStreet.recommendedClass : null);
    return {
      mapping: null,
      selectedCategory: selectedPrincipal?.category ?? null,
      selectedClass: selectedClass ?? null,
      confidence: selectedClass ? "limited" : "manual-review",
      evaluations,
      findings,
      preparation,
      supplementalClasses: [...xtremeStreet.eligibleClasses],
      xtremeStreet,
      streetModified,
      modifiedProduction,
      preparedXp,
      preparedCp,
      preparedDp,
      preparedEp,
      messages: selectedPrincipal
        ? [
            `The exact Appendix A vehicle placement is still missing, but the separately evaluated ${CATEGORY_SECTIONS[selectedPrincipal.category]} formula supports ` +
              `${selectedPrincipal.classId?.toUpperCase()} independent of that placement.`
          ]
        : xtremeEligible
          ? [
              "The exact Appendix A vehicle placement is still missing, but the separately evaluated Section 21 path supports " +
                `${xtremeStreet.recommendedClass?.toUpperCase()} independent of that placement.`
            ]
          : [
              vehicleMessage,
              preparation.minimumLegalCategory
                ? `The modification profile is first legal in ${preparation.minimumLegalCategory}, but the exact vehicle placement is still missing.`
                : "The modification profile cannot be completed automatically from the selected details."
            ]
    };
  }

  return classifyVehicleWithMapping(selection, build, mapping);
}
