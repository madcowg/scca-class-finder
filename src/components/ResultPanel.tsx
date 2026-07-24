import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CLASS_NAMES,
  categoryForClass,
  classLabel
} from "../lib/classMetadata";
import type { ClassificationResult, VehicleSelection } from "../lib/types";
import { getNationalCompetitionHistory, NATIONAL_ARCHIVE_URL } from "../lib/nationalHistory";
import { vehicleSelectionLabel } from "../lib/vehicleData";
import { CategoryLadder } from "./CategoryLadder";
import { CategoryPaths } from "./CategoryPaths";
import { RuleLedger } from "./RuleLedger";

interface Props {
  selection: VehicleSelection;
  result: ClassificationResult;
}

function ClassificationReason({
  result,
  vehicleName
}: {
  result: ClassificationResult;
  vehicleName: string;
}) {
  if (!result.selectedCategory || !result.selectedClass) {
    return (
      <div className="panel classification-reason">
        <div className="section-heading">
          <div>
            <p className="eyebrow">How we got here</p>
            <h3>Why this needs a human review</h3>
          </div>
        </div>
        <p>
          We checked the exact vehicle selection and each build answer, but there is not enough
          first-party placement or rule detail to safely choose a category for{" "}
          {vehicleName || "this vehicle"}.
          The category cards below show exactly where the decision stopped.
        </p>
      </div>
    );
  }

  const selectedIndex = CATEGORY_ORDER.indexOf(result.selectedCategory);
  const earlierCategories = result.evaluations
    .slice(0, selectedIndex)
    .filter((evaluation) => evaluation.status !== "eligible")
    .map((evaluation) => CATEGORY_LABELS[evaluation.category]);

  return (
    <div className="panel classification-reason">
      <div className="section-heading">
        <div>
          <p className="eyebrow">How we got here</p>
          <h3>Why this vehicle belongs in {CATEGORY_LABELS[result.selectedCategory]}</h3>
        </div>
      </div>
      <p>
        We first matched the exact year, make, model family, and submodel or package. Then we
        checked every selected modification against the modeled preparation allowances. {" "}
        {CATEGORY_LABELS[result.selectedCategory]} is the first category where the complete build
        passes those checks and the exact vehicle has a reviewed class placement: {" "}
        <strong>{classLabel(result.selectedClass)}</strong>.
      </p>
      <p>
        {earlierCategories.length > 0
          ? `The earlier categories were not selected because they failed a build check or do not list this exact vehicle: ${earlierCategories.join(", ")}. `
          : "No earlier category was available for this exact selection. "}
        Categories are evaluated independently; we do not assume that every preparation category is a linear progression.
      </p>
    </div>
  );
}

export function ResultPanel({ selection, result }: Props) {
  const vehicleName = vehicleSelectionLabel(selection);
  const nationalHistory = getNationalCompetitionHistory(selection);
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

      </div>

      <ClassificationReason result={result} vehicleName={vehicleName} />

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

      <CategoryPaths result={result} />

      <div className="panel national-history-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Verified national record</p>
            <h3>Exact-vehicle Nationals competition history</h3>
          </div>
        </div>
        {nationalHistory.length > 0 ? (
          <>
            <p className="category-path-note">
              These exact-year results are verified in the current loaded dataset. They show that
              the selected vehicle has appeared competitively in these classes; they do not replace
              a current rules or preparation review.
            </p>
            <ul className="placement-list">
              {nationalHistory.map((record) => (
                <li key={`${record.year}-${record.classId}`}>
                  <span>{record.year} {classLabel(record.classId)}</span>
                  <strong>
                    {record.finish}<br />
                    <a href={record.sourceUrl} target="_blank" rel="noreferrer">
                      {record.sourceLabel}
                    </a>
                  </strong>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="category-path-note">
            No exact-year Nationals record is loaded for this selection yet. That is a data
            coverage limitation, not evidence that the vehicle has never competed. Browse the
            official <a href={NATIONAL_ARCHIVE_URL} target="_blank" rel="noreferrer">SCCA results archive</a> for broader history.
          </p>
        )}
      </div>

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
