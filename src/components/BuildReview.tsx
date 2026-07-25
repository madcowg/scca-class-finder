import { DEFAULT_BUILD, RULE_GROUPS, findRuleOption } from "../lib/rules";
import type { BuildProfile, VehicleSelection } from "../lib/types";
import { vehicleSelectionLabel } from "../lib/vehicleData";

interface Props {
  selection: VehicleSelection;
  build: BuildProfile;
  onBack: () => void;
  onNext: () => void;
}

export function BuildReview({ selection, build, onBack, onNext }: Props) {
  const selectedVehicle = vehicleSelectionLabel(selection);

  const changedFields = RULE_GROUPS.flatMap((group) => {
    if (build[group.field] === DEFAULT_BUILD[group.field]) return [];
    const option = findRuleOption(group.field, build[group.field]);
    return option
      ? [
          {
            field: group.field,
            title: group.title,
            label: option.label,
            manualReview: Boolean(option.manualReview),
            principalRelevant: group.principalRelevant !== false
          }
        ]
      : [];
  });

  return (
    <section className="panel review-panel" id="review-step" aria-labelledby="review-title">
      <div className="panel-heading">
        <div className="step-number">3</div>
        <div>
          <p className="eyebrow">Review</p>
          <h2 id="review-title">Check the exact car and selected build facts</h2>
          <p>Confirm the exact vehicle and the build details before opening the classification result.</p>
        </div>
      </div>

      <div className="review-vehicle">
        <span className="field-title">Vehicle</span>
        <strong>{selectedVehicle || "Choose the exact make, model, and year."}</strong>
      </div>

      <div className="review-mods">
        <span className="field-title">Mods</span>
      {changedFields.filter((item) => item.principalRelevant).length === 0 ? (
        <p className="review-stock">Stock</p>
      ) : (
        <ul className="review-list">
          {changedFields.filter((item) => item.principalRelevant).map((item) => (
            <li key={item.field}>
              <strong>{item.title}:</strong> {item.label}
              {item.manualReview && <span className="review-flag">Manual review</span>}
            </li>
          ))}
        </ul>
      )}
      </div>

      {changedFields.some((item) => !item.principalRelevant) && (
        <div className="review-mods">
          <span className="field-title">Xtreme Street facts</span>
          <ul className="review-list">
            {changedFields.filter((item) => !item.principalRelevant).map((item) => (
              <li key={item.field}>
                <strong>{item.title}:</strong> {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="wizard-actions">
        <button className="secondary-button" type="button" onClick={onBack}>
          Back: build details
        </button>
        <button className="primary-button" type="button" onClick={onNext}>
          Show classification result
        </button>
      </div>
    </section>
  );
}
