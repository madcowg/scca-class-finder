import { useState } from "react";
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CLASS_NAMES,
  categoryForClass,
  classLabel
} from "../lib/classMetadata";
import type { ClassificationResult, VehicleSelection } from "../lib/types";
import {
  getNationalCompetitionHistory,
  getNationalHistoryScope,
  hasReviewedNationalFamily,
  legalTireGuidance,
  NATIONAL_ARCHIVE_URL,
  NATIONAL_EVENT_YEARS,
  summarizeTireBrands
} from "../lib/nationalHistory";
import { vehicleSelectionLabel } from "../lib/vehicleData";
import { CategoryLadder } from "./CategoryLadder";
import { RuleLedger } from "./RuleLedger";

interface Props {
  selection: VehicleSelection;
  result: ClassificationResult;
}

const HIDDEN_MESSAGE_PATTERNS = [
  /^The modification profile is first legal in /,
  /^Only the exact placements listed in the current source review are used\./
];

function visibleMessages(messages: string[]): string[] {
  return messages.filter(
    (message) => !HIDDEN_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))
  );
}

function classComparison(classId: string, currentClass: string | null): string {
  if (!currentClass) return "No completed current class is available for comparison.";
  if (classId === currentClass) return "Same class as the current setup.";

  const historicalCategory = categoryForClass(classId);
  const currentCategory = categoryForClass(currentClass);
  if (!historicalCategory || !currentCategory) {
    return "Separate or historical rules path; modification level is not inferred.";
  }

  const historicalIndex = CATEGORY_ORDER.indexOf(historicalCategory);
  const currentIndex = CATEGORY_ORDER.indexOf(currentCategory);
  if (historicalIndex < currentIndex) {
    return "Closer-to-stock rules than the current result; current changes not allowed there would need to be removed.";
  }
  if (historicalIndex > currentIndex) {
    return "More-prepared rules than the current result; it permits broader modifications.";
  }
  return "A different class in the same preparation category.";
}

function ClassificationReason({
  result,
  vehicleName
}: {
  result: ClassificationResult;
  vehicleName: string;
}) {
  const minimumLegalCategory = result.preparation.minimumLegalCategory;

  if (
    result.selectedClass &&
    !result.selectedCategory &&
    result.xtremeStreet.status === "eligible"
  ) {
    return (
      <details className="panel classification-reason">
        <summary className="section-heading">
          <div>
            <p className="eyebrow">How we got here</p>
            <h3>Why this build fits {classLabel(result.selectedClass)}</h3>
          </div>
        </summary>
        <p>
          No principal Street-through-Modified result was complete for this build. XA/XB was
          then evaluated independently under Section 21 using the production-car exclusions,
          working road equipment, permitted tires, original drivetrain and powertrain types,
          and measured competition weight with the driver.
        </p>
        <ul className="reason-list">
          {result.xtremeStreet.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </details>
    );
  }

  if (!result.selectedCategory || !result.selectedClass) {
    const supplementalOnly = result.supplementalClasses.length > 0;
    return (
      <details className="panel classification-reason">
        <summary className="section-heading">
          <div>
            <p className="eyebrow">How we got here</p>
            <h3>{supplementalOnly ? "Why this is a separate class path" : "Why this needs a human review"}</h3>
          </div>
        </summary>
        <p>
          We first evaluated the modification profile without using the vehicle's class listing.
          {minimumLegalCategory
            ? ` The selected build is modeled as legal starting in ${CATEGORY_LABELS[minimumLegalCategory]}. `
            : " The selected build contains a detail that requires manual rule review. "}
          {supplementalOnly
            ? ` The exact vehicle has a supplemental path (${result.supplementalClasses.map((classId) => classLabel(classId)).join(", ")}), which is kept separate from the principal Street through Modified categories.`
            : ` We then checked the exact year, model, and submodel or package, but there is no reviewed Appendix A placement that safely completes this result for ${vehicleName || "this vehicle"}.`}
          The category cards below show exactly where the decision stopped.
        </p>
      </details>
    );
  }

  const selectedIndex = CATEGORY_ORDER.indexOf(result.selectedCategory);
  const earlierCategories = result.evaluations
    .slice(0, selectedIndex)
    .filter((evaluation) => evaluation.status !== "eligible")
    .map((evaluation) => CATEGORY_LABELS[evaluation.category]);

  return (
    <details className="panel classification-reason">
      <summary className="section-heading">
        <div>
          <p className="eyebrow">How we got here</p>
          <h3>Why this vehicle belongs in {CATEGORY_LABELS[result.selectedCategory]}</h3>
        </div>
      </summary>
      <p>
        We first evaluated every selected modification against the modeled preparation allowances.
        {minimumLegalCategory
          ? ` That build is legal starting in ${CATEGORY_LABELS[minimumLegalCategory]}. `
          : " "}
        We then matched the exact year, make, model family, and submodel or package. {" "}
        {CATEGORY_LABELS[result.selectedCategory]} is the least-prepared category where the
        complete build passes those checks and the exact vehicle has a reviewed class placement: {" "}
        <strong>{classLabel(result.selectedClass)}</strong>.
      </p>
      <p>
        {earlierCategories.length > 0
          ? `The earlier categories were not selected because they failed a build check or do not list this exact vehicle: ${earlierCategories.join(", ")}. `
          : "No earlier category was available for this exact selection. "}
        Categories are evaluated independently; we do not assume that every preparation category is a linear progression.
      </p>
    </details>
  );
}

export function ResultPanel({ selection, result }: Props) {
  const [proRequested, setProRequested] = useState(false);
  const vehicleName = vehicleSelectionLabel(selection);
  const nationalHistory = getNationalCompetitionHistory(selection);
  const nationalHistoryScope = getNationalHistoryScope(selection);
  const reviewedNationalFamily = hasReviewedNationalFamily(selection);
  const tireBrands = summarizeTireBrands(nationalHistory);
  const historyByClass = [...nationalHistory.reduce((groups, record) => {
    const records = groups.get(record.classId) ?? [];
    records.push(record);
    groups.set(record.classId, records);
    return groups;
  }, new Map<string, typeof nationalHistory>())].sort(
    ([left], [right]) => left.localeCompare(right)
  );
  const supplementalOnly = !result.selectedClass && result.supplementalClasses.length > 0;
  const selectedXtreme =
    Boolean(result.selectedClass) &&
    !result.selectedCategory &&
    result.xtremeStreet.status === "eligible";

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
        ) : selectedXtreme && result.selectedClass ? (
          <>
            <div className="class-lockup">
              <span className="class-code">{result.selectedClass.toUpperCase()}</span>
              <div>
                <h2 id="result-title">
                  {CLASS_NAMES[result.selectedClass] ?? "Xtreme Street class"}
                </h2>
                <p>Separate Section 21 eligibility path</p>
              </div>
            </div>
            <p className="vehicle-name">{vehicleName}</p>
          </>
        ) : (
          <>
            <h2 id="result-title">{supplementalOnly ? "Supplemental class path" : "Manual review required"}</h2>
            <p>
              {supplementalOnly
                ? `${vehicleName || "This vehicle"} is eligible for a separately governed supplemental path.`
                : `${vehicleName || "Choose an exact vehicle"} does not currently have a safe automatic result.`}
            </p>
          </>
        )}

        {visibleMessages(result.messages).length > 0 && (
          <div className="message-stack">
            {visibleMessages(result.messages).map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}

      </div>

      <ClassificationReason result={result} vehicleName={vehicleName} />

      {result.supplementalClasses.length > 0 && (
        <details className="supplemental-panel">
          <summary className="section-heading">
            <div>
              <p className="eyebrow">Separate rule paths</p>
              <h3>Supplemental classes listed for this vehicle</h3>
            </div>
          </summary>
          <div className="chip-row">
            {result.supplementalClasses.map((classId) => (
              <span className="class-chip" key={classId} title={classLabel(classId)}>
                {classId.toUpperCase()}
              </span>
            ))}
          </div>
          <p>
            {selectedXtreme
              ? `${result.selectedClass?.toUpperCase()} was selected only after its separate Section 21 checks passed. Other supplemental classes keep their own eligibility tests.`
              : "CAM, Xtreme Street, EVX, Club Spec, and spec classes have separate eligibility and preparation tests and do not displace a legal, closer-to-stock principal result."}
          </p>
        </details>
      )}

      {!result.selectedCategory && result.xtremeStreet.status !== "eligible" && (
        <details className="panel xtreme-review-panel">
          <summary className="section-heading">
            <div>
              <p className="eyebrow">XA / XB check</p>
              <h3>
                {result.xtremeStreet.status === "blocked"
                  ? "Why Xtreme Street is not available"
                  : "What is still needed for Xtreme Street"}
              </h3>
            </div>
          </summary>
          <ul className="reason-list">
            {result.xtremeStreet.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </details>
      )}

      <details className="panel national-history-panel">
        <summary className="section-heading">
          <div>
            <p className="eyebrow">Five-year official evidence</p>
            <h3>How competitive is my car in Nationals?</h3>
          </div>
        </summary>
        <p className="category-path-note">
          This view uses official Solo Nationals class winners from {NATIONAL_EVENT_YEARS[0]}-
          {NATIONAL_EVENT_YEARS.at(-1)} and only includes records whose published vehicle year
          fits the selected history scope.
        </p>
        {nationalHistoryScope && (
          <p className="generation-scope">
            <strong>Compared vehicle scope:</strong>{" "}
            {nationalHistoryScope.sourceUrl ? (
              <a href={nationalHistoryScope.sourceUrl} target="_blank" rel="noreferrer">
                {nationalHistoryScope.label}
              </a>
            ) : (
              nationalHistoryScope.label
            )}
            .{" "}
            Winner records from other generations are excluded.
            {nationalHistoryScope.variantLabel
              ? " Records for other named performance packages are excluded too."
              : ""}
          </p>
        )}
        {nationalHistory.length > 0 ? (
          <>
            <div className="competitiveness-list">
              {historyByClass.map(([classId, records]) => {
                const years = [...new Set(records.map((record) => record.year))].sort(
                  (left, right) => right - left
                );
                const vehicles = [...new Set(
                  records.map((record) =>
                    `${record.vehicleYear ?? "Year not listed"} ${record.vehicle}`.trim()
                  )
                )];
                return (
                  <article className="competitiveness-card" key={classId}>
                    <div>
                      <span className="class-chip">{classId.toUpperCase()}</span>
                      <h4>{classLabel(classId)}</h4>
                    </div>
                    <strong>
                      {records.length} class {records.length === 1 ? "win" : "wins"}
                    </strong>
                    <p>{classComparison(classId, result.selectedClass)}</p>
                    <p>
                      <strong>Winning years:</strong> {years.join(", ")}
                    </p>
                    <p>
                      <strong>Published winning vehicle text:</strong>{" "}
                      {vehicles.slice(0, 3).join("; ")}
                      {vehicles.length > 3 ? `; and ${vehicles.length - 3} more` : ""}
                    </p>
                    <details>
                      <summary>View official winner records</summary>
                      <ul className="winner-records">
                        {records.map((record, index) => (
                          <li
                            key={`${record.year}-${record.classId}-${record.division}-${index}`}
                          >
                            <span>
                              {record.year} {record.finish}:{" "}
                              {record.vehicleYear ? `${record.vehicleYear} ` : ""}
                              {record.vehicle}
                              {record.tireManufacturer
                                ? ` on ${record.tireManufacturer}`
                                : ""}
                            </span>
                            <a href={record.sourceUrl} target="_blank" rel="noreferrer">
                              Official results
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </article>
                );
              })}
            </div>

            <div className="tire-evidence-grid">
              <div>
                <h4>Observed winning tire brands</h4>
                {tireBrands.length > 0 ? (
                  <ul className="tire-brand-list">
                    {tireBrands.slice(0, 5).map((brand) => (
                      <li key={brand.manufacturer}>
                        <span>{brand.manufacturer}</span>
                        <strong>
                          {brand.wins} of{" "}
                          {tireBrands.reduce((total, item) => total + item.wins, 0)} observed
                          wins ({Math.round(brand.share * 100)}%)
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No tire manufacturer was published for the matched winner records.</p>
                )}
              </div>
              <div>
                <h4>Legal tire-size guidance</h4>
                <p>{legalTireGuidance(result.selectedClass)}</p>
                <p className="evidence-caution">
                  Official Nationals results name the tire manufacturer, not tire dimensions or
                  exact tire model. The app therefore does not claim that a size such as
                  205/50R15, or a model such as Potenza RE-71RS, has a measured winning ratio.
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="category-path-note">
            {reviewedNationalFamily
              ? "This competitive model family does not have a safe same-generation match for the selected year, or no class win was found inside that generation during the five loaded Nationals. "
              : "This model family does not appear in the reviewed 2021-2025 National Championship winner families, so no broader vehicle-history match is shown. "}
            That is not proof that the car cannot be competitive or has never entered Nationals.
            Browse the{" "}
            official{" "}
            <a href={NATIONAL_ARCHIVE_URL} target="_blank" rel="noreferrer">
              SCCA results archive
            </a>{" "}
            for complete finishing orders.
          </p>
        )}
      </details>

      <details className="panel result-detail-panel">
        <summary className="section-heading">
          <div>
            <p className="eyebrow">Why this result</p>
            <h3>Category-by-category evaluation</h3>
          </div>
        </summary>
        <CategoryLadder evaluations={result.evaluations} />
      </details>

      <RuleLedger findings={result.findings} />

      {result.selectedClass && (
        <details className="panel pro-choice-panel">
          <summary className="section-heading">
            <div>
              <p className="eyebrow">Driver challenge</p>
              <h3>Are you looking to compete in ALSCCA PRO?</h3>
            </div>
          </summary>
          <label className="pro-toggle">
            <input
              type="checkbox"
              checked={proRequested}
              onChange={(event) => setProRequested(event.target.checked)}
            />
            <span>
              <strong>Yes, show my PRO registration</strong>
              <small>
                PRO is a driver-selected PAX competition group. It does not change the car's
                preparation rules or SCCA class.
              </small>
            </span>
          </label>
          {proRequested && (
            <div className="pro-result" role="status">
              Register as <strong>PRO / {result.selectedClass.toUpperCase()}</strong>, not{" "}
              <strong>X{result.selectedClass.toUpperCase()}</strong>. Your normal class remains{" "}
              {classLabel(result.selectedClass)} and supplies the PAX index.
            </div>
          )}
          <p className="category-path-note">
            See the{" "}
            <a href="https://alscca.net/autocross/" target="_blank" rel="noreferrer">
              ALSCCA autocross program
            </a>{" "}
            for the current regional competition-group rules.
          </p>
        </details>
      )}
    </section>
  );
}
