import { RULE_GROUPS } from "../lib/rules";
import type { BuildField, BuildProfile } from "../lib/types";

interface Props {
  value: BuildProfile;
  onChange: (value: BuildProfile) => void;
}

export function BuildEditor({ value, onChange }: Props) {
  const update = (field: BuildField, next: string) => {
    onChange({ ...value, [field]: next });
  };

  return (
    <section className="panel" aria-labelledby="build-title">
      <div className="panel-heading">
        <div className="step-number">2</div>
        <div>
          <p className="eyebrow">Preparation legality</p>
          <h2 id="build-title">Describe the complete build</h2>
          <p>The highest-impact modification controls. Select “unknown” rather than guessing.</p>
        </div>
      </div>

      <div className="build-grid">
        {RULE_GROUPS.map((group) => {
          const selected = group.options.find((option) => option.value === value[group.field]);
          return (
            <label className="build-field" key={group.field}>
              <span className="field-title">{group.title}</span>
              <span className="field-help">{group.help}</span>
              <select
                value={value[group.field]}
                onChange={(event) => update(group.field, event.target.value)}
              >
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="selected-detail">{selected?.description}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
