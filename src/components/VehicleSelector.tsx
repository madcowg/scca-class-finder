import { useMemo, useState } from "react";
import { getMakes, getModels, getYears, searchVehicles } from "../lib/vehicleData";
import type { VehicleSelection } from "../lib/types";

interface Props {
  value: VehicleSelection;
  onChange: (value: VehicleSelection) => void;
}

export function VehicleSelector({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const makes = getMakes();
  const models = value.make ? getModels(value.make) : [];
  const years = value.make && value.model ? getYears(value.make, value.model) : [];
  const matches = useMemo(
    () => (query.trim().length >= 2 ? searchVehicles(query, 8) : []),
    [query]
  );

  return (
    <section className="panel vehicle-panel" aria-labelledby="vehicle-title">
      <div className="panel-heading">
        <div className="step-number">1</div>
        <div>
          <p className="eyebrow">Appendix A placement</p>
          <h2 id="vehicle-title">Choose the exact vehicle</h2>
          <p>Trim and package wording matters. Never substitute a similar model.</p>
        </div>
      </div>

      <div className="vehicle-search">
        <label htmlFor="vehicle-search-input">
          <span>Search make / model / trim</span>
          <span className="field-help">
            Use exact Appendix A wording when you can. Common shorthand like FL5, DE5, RZ34, and Mk8 is also matched for curated current entries.
          </span>
        </label>
        <input
          id="vehicle-search-input"
          className="search-input"
          type="text"
          value={query}
          placeholder="Example: FL5, Integra Type S, Golf GTI, Corvette Z06"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="sr-only" aria-live="polite">
          {query.trim().length < 2
            ? ""
            : matches.length > 0
              ? `${matches.length} vehicle suggestions available`
              : "No exact vehicle suggestions found"}
        </span>

        {query.trim().length >= 2 && (
          <div className="search-results" role="list" aria-label="Vehicle search results">
            {matches.length > 0 ? (
              matches.map((match) => {
                const label = [match.year, match.make, match.model].join(" ");
                return (
                  <button
                    className="search-result"
                    key={label}
                    type="button"
                    onClick={() => {
                      onChange(match);
                      setQuery(label);
                    }}
                  >
                    {label}
                  </button>
                );
              })
            ) : (
              <p className="search-empty">
                No exact current match found. Keep using the official dropdown wording below rather than guessing.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="vehicle-grid">
        <label>
          <span>Make</span>
          <select
            value={value.make}
            onChange={(event) =>
              onChange({ make: event.target.value, model: "", year: "" })
            }
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
          <span>Model / rulebook description</span>
          <select
            value={value.model}
            disabled={!value.make}
            onChange={(event) =>
              onChange({ ...value, model: event.target.value, year: "" })
            }
          >
            <option value="">Select model</option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Model year</span>
          <select
            value={value.year}
            disabled={!value.model}
            onChange={(event) => onChange({ ...value, year: event.target.value })}
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
    </section>
  );
}
