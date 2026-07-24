import { getMakes, getModels, getVehicleVariants, getYears } from "../lib/vehicleData";
import type { VehicleSelection } from "../lib/types";

interface Props {
  value: VehicleSelection;
  onChange: (value: VehicleSelection) => void;
  onNext: () => void;
  canAdvance: boolean;
}

const NOT_LISTED = "__not-listed__";

export function VehicleSelector({ value, onChange, onNext, canAdvance }: Props) {
  const makes = getMakes();
  const models = value.make ? getModels(value.make) : [];
  const years = value.make && value.model ? getYears(value.make, value.model) : [];
  const variants =
    value.make && value.model && value.year
      ? getVehicleVariants(value.make, value.model, value.year)
      : [];

  const changeMake = (make: string) => {
    onChange({ make, model: "", year: "", variant: undefined, notListed: false });
  };

  const changeModel = (model: string) => {
    if (model === NOT_LISTED) {
      onChange({
        ...value,
        model: "",
        year: "",
        variant: undefined,
        notListed: true,
        manualDescription: ""
      });
      return;
    }
    onChange({
      ...value,
      model,
      year: "",
      variant: undefined,
      notListed: false,
      manualDescription: undefined
    });
  };

  return (
    <section className="panel vehicle-panel" id="vehicle-step" aria-labelledby="vehicle-title">
      <div className="panel-heading">
        <div className="step-number">1</div>
        <div>
          <p className="eyebrow">Start here</p>
          <h2 id="vehicle-title">Choose the exact vehicle</h2>
          <p>
            Select the rulebook family first. If that year has packages or trims that change
            class, they appear in the next selector.
          </p>
        </div>
      </div>

      <div className="vehicle-grid">
        <label>
          <span>Make</span>
          <select
            value={value.make}
            onChange={(event) => changeMake(event.target.value)}
          >
            <option value="">Select make</option>
            {makes.map((make) => (
              <option key={make} value={make}>
                {make}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Model family</span>
          <select
            value={value.notListed ? NOT_LISTED : value.model}
            disabled={!value.make}
            onChange={(event) => changeModel(event.target.value)}
          >
            <option value="">Select model family</option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
            <option value={NOT_LISTED}>Not listed</option>
          </select>
        </label>

        <label>
          <span>Model year</span>
          <select
            value={value.year}
            disabled={!value.model || value.notListed}
            onChange={(event) =>
              onChange({ ...value, year: event.target.value, variant: undefined })
            }
          >
            <option value="">Select year</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year === "all" ? "All listed years" : year}
              </option>
            ))}
          </select>
        </label>
      </div>

      {variants.length > 0 && (
        <label className="variant-field">
          <span>Submodel or package for {value.year}</span>
          <span className="field-help">
            Choose the exact entry. These variants can have different Appendix A placements.
          </span>
          <select
            value={value.variant ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                variant: event.target.value || undefined
              })
            }
          >
            <option value="">
              {variants.some((variant) => variant.value === value.model)
                ? "Base / standard listing"
                : "Select exact submodel or package"}
            </option>
            {variants
              .filter((variant) => variant.value !== value.model)
              .map((variant) => (
              <option key={variant.value} value={variant.value}>
                {variant.label}
              </option>
              ))}
          </select>
        </label>
      )}

      {value.notListed && (
        <div className="manual-vehicle-box">
          <p className="eyebrow">Regional chair path</p>
          <h3>Describe the vehicle for manual review</h3>
          <p>
            This keeps an unlisted vehicle from being matched to a similar trim by accident.
            Include the year, model, engine, drivetrain, and any package name you know.
          </p>
          <label>
            <span>Vehicle description</span>
            <input
              type="text"
              value={value.manualDescription ?? ""}
              placeholder="Example: 2026 Example GT, 2.0 turbo, factory performance package"
              onChange={(event) =>
                onChange({ ...value, manualDescription: event.target.value })
              }
            />
          </label>
        </div>
      )}

      <div className="wizard-actions wizard-actions-end">
        <button className="primary-button" type="button" onClick={onNext} disabled={!canAdvance}>
          Next: build details
        </button>
      </div>
    </section>
  );
}
