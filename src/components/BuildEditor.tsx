import { RULE_GROUPS } from "../lib/rules";
import type { BuildField, BuildProfile } from "../lib/types";

interface Props {
  value: BuildProfile;
  onChange: (value: BuildProfile) => void;
}

const BUILD_SECTIONS: Array<{ title: string; description: string; fields: BuildField[] }> = [
  {
    title: "Chassis, tires, and alignment",
    description: "The choices that most often determine Street and Street Touring legality.",
    fields: ["tires", "wheels", "shocks", "springs", "swayBars", "alignment"]
  },
  {
    title: "Powertrain and differential",
    description: "Intake, exhaust, ECU, engine, and drivetrain changes.",
    fields: ["intake", "exhaust", "ecu", "engine", "differential", "brakes"]
  },
  {
    title: "Aero, safety, cabin, and body",
    description: "Exterior, interior, safety equipment, and anything outside the common paths.",
    fields: ["aero", "safety", "interior", "body", "other"]
  }
];

export function BuildEditor({ value, onChange }: Props) {
  const update = (field: BuildField, next: string) => {
    onChange({ ...value, [field]: next });
  };

  return (
    <section className="panel" id="build-step" aria-labelledby="build-title">
      <div className="panel-heading">
        <div className="step-number">2</div>
        <div>
          <p className="eyebrow">Preparation legality</p>
          <h2 id="build-title">Describe the complete build</h2>
          <p>The highest-impact modification controls. Select “unknown” rather than guessing.</p>
        </div>
      </div>

      <div className="build-sections">
        {BUILD_SECTIONS.map((section, index) => (
          <details className="build-section" key={section.title} open={index === 0}>
            <summary>
              <span>
                <strong>{section.title}</strong>
                <small>{section.description}</small>
              </span>
              <span className="summary-action">{index === 0 ? "Open" : "Show"}</span>
            </summary>
            <div className="build-grid">
              {section.fields.map((field) => {
                const group = RULE_GROUPS.find((candidate) => candidate.field === field);
                if (!group) return null;
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
          </details>
        ))}
      </div>
    </section>
  );
}
