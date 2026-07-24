import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CLASS_NAMES,
  categoryForClass,
  classLabel
} from "../lib/classMetadata";
import type { ClassificationResult, VehicleSelection } from "../lib/types";
import { vehicleSelectionLabel } from "../lib/vehicleData";
import { CategoryLadder } from "./CategoryLadder";
import { RuleLedger } from "./RuleLedger";

interface Props {
  selection: VehicleSelection;
  result: ClassificationResult;
}

const CONFIDENCE_LABELS: Record<ClassificationResult["confidence"], string> = {
  high: "complete model",
  limited: "limited data",
  "manual-review": "manual review"
};

export function ResultPanel({ selection, result }: Props) {
  const vehicleName = vehicleSelectionLabel(selection);
  const verifiedPrincipalPlacements = result.mapping
    ? result.mapping.classes
        .map((classId) => ({
          classId,
          category: categoryForClass(classId)
        }))
        .filter(
          (item): item is { classId: string; category: keyof typeof CATEGORY_LABELS } =>
            Boolean(item.category)
        )
        .sort(
          (left, right) =>
            CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category)
        )
    : [];

  return (
    <section className="results-column" id="result-step" aria-labelledby="result-title">
      <div className={`result-hero confidence-${result.confidence}`}>
        <div className="result-kicker">
          <span>Current result</span>
          <span className="confidence-badge">{CONFIDENCE_LABELS[result.confidence]}</span>
        </div>

        {result.selectedClass && result.selectedCategory ? (
          <>
            <div className="class-lockup">
              <span className="class-code">{result.selectedClass.toUpperCase()}</span>
              <div>
                <h2 id="result-title">{CLASS_NAMES[result.selectedClass] ?? "SCCA Solo class"}</h2>
                <p>
                  Lowest modeled legal category: {CATEGORY_LABELS[result.selectedCategory]}
                </p>
              </div>
            </div>
            <p className="vehicle-name">{vehicleName}</p>
          </>
        ) : (
          <>
            <h2 id="result-title">Manual review required</h2>
            <p>
              {vehicleName || "Choose an exact vehicle"} does not currently have a safe automatic result.
            </p>
          </>
        )}

        {result.messages.length > 0 && (
          <div className="message-stack">
            {result.messages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}

        {result.mapping && (
          <div className="mapping-source">
            <strong>Mapping coverage:</strong>{" "}
            {result.mapping.source === "2026-current-override"
              ? result.mapping.coverage === "verified-classes"
                ? "Current partial source audit"
                : "Current 2026 principal-category override"
              : result.mapping.coverage === "street-only"
                ? "2026 Street only"
                : "Imported category mapping"}
            <span>{result.mapping.sourceNote}</span>
          </div>
        )}
      </div>

      {result.mapping && verifiedPrincipalPlacements.length > 0 && (
        <div className="panel placement-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Official placement</p>
              <h3>Verified current principal-category listings</h3>
            </div>
          </div>
          <ul className="placement-list">
            {verifiedPrincipalPlacements.map((placement) => (
              <li key={`${placement.category}-${placement.classId}`}>
                <span>{CATEGORY_LABELS[placement.category]}</span>
                <strong>{classLabel(placement.classId)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.supplementalClasses.length > 0 && (
        <div className="supplemental-panel">
          <div>
            <p className="eyebrow">Separate rule paths</p>
            <h3>Supplemental classes listed for this vehicle</h3>
          </div>
          <div className="chip-row">
            {result.supplementalClasses.map((classId) => (
              <span className="class-chip" key={classId} title={classLabel(classId)}>
                {classId.toUpperCase()}
              </span>
            ))}
          </div>
          <p>
            These are not automatically selected because CAM, Xtreme Street, EVX, Club Spec, and spec classes have separate eligibility and preparation tests.
          </p>
        </div>
      )}

      <div className="panel result-detail-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Why this result</p>
            <h3>Category-by-category evaluation</h3>
          </div>
        </div>
        <CategoryLadder evaluations={result.evaluations} />
      </div>

      <RuleLedger findings={result.findings} />
    </section>
  );
}
