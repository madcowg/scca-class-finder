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
  const years = getYears();
  const makes = value.year ? getMakes(value.year) : [];
  const models = value.make && value.year ? getModels(value.make, value.year) : [];
  const variants =
    value.make && value.model && value.year
      ? getVehicleVariants(value.make, value.model, value.year)
      : [];

  const setNotListed = () => {
    onChange({
      make: "",
      model: "",
      year: "",
      variant: undefined,
      notListed: true,
      manualDescription: ""
    });
  };

  const changeYear = (year: string) => {
    if (year === NOT_LISTED) {
      setNotListed();
      return;
    }
    onChange({ make: "", model: "", year, variant: undefined, notListed: false });
  };

  const changeMake = (make: string) => {
    if (make === NOT_LISTED) {
      setNotListed();
      return;
    }
    onChange({ ...value, make, model: "", variant: undefined, notListed: false });
  };

  const changeModel = (model: string) => {
    if (model === NOT_LISTED) {
      setNotListed();
      return;
    }
    onChange({
      ...value,
      model,
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
            Start with the model year. We then narrow the make, model family, and any year-specific
            submodel or package so the exact car is identified before the build is evaluated.
          </p>
        </div>
      </div>

      <div className="vehicle-grid">
        <label>
          <span>Model year</span>
          <select
            value={value.notListed ? NOT_LISTED : value.year}
            onChange={(event) => changeYear(event.target.value)}
          >
            <option value="">Select year</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year === "all" ? "All listed years" : year}
              </option>
            ))}
            <option value={NOT_LISTED}>Not listed</option>
          </select>
        </label>

        <label>
          <span>Make</span>
          <select
            value={value.notListed ? NOT_LISTED : value.make}
            disabled={!value.year || value.notListed}
            onChange={(event) => changeMake(event.target.value)}
          >
            <option value="">Select make</option>
            {makes.map((make) => (
              <option key={make} value={make}>
                {make}
              </option>
            ))}
            <option value={NOT_LISTED}>Not listed</option>
          </select>
        </label>

        <label>
          <span>Model family</span>
          <select
            value={value.notListed ? NOT_LISTED : value.model}
            disabled={!value.make || !value.year || value.notListed}
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
