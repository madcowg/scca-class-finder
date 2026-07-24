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
            manualReview: Boolean(option.manualReview)
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
          <p>Results update instantly. Edit any vehicle or build detail above instead of assuming a near match.</p>
        </div>
      </div>

      <div className="review-grid">
        <div className="review-card">
          <span className="field-title">Exact vehicle</span>
          <strong>{selectedVehicle || "Choose the exact make, model, and year."}</strong>
        </div>

        <div className="review-card">
          <span className="field-title">Modeled changes</span>
          <strong>
            {changedFields.length === 0 ? "Standard build profile" : `${changedFields.length} selected change${changedFields.length === 1 ? "" : "s"}`}
          </strong>
        </div>
      </div>

      {changedFields.length === 0 ? (
        <p className="review-empty">
          No modification fields currently move the car beyond the modeled stock configuration.
        </p>
      ) : (
        <ul className="review-list">
          {changedFields.map((item) => (
            <li key={item.field}>
              <strong>{item.title}:</strong> {item.label}
              {item.manualReview && <span className="review-flag">Manual review</span>}
            </li>
          ))}
        </ul>
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
