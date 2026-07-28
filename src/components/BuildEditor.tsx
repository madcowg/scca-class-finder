import { DEFAULT_BUILD, RULE_GROUPS } from "../lib/rules";
import type { BuildField, BuildProfile } from "../lib/types";
import { useState } from "react";

interface Props {
  value: BuildProfile;
  onChange: (value: BuildProfile) => void;
  onBack: () => void;
  onNext: () => void;
}

const BUILD_SECTIONS: Array<{
  title: string;
  description: string;
  tip: string;
  fields: BuildField[];
}> = [
  {
    title: "Chassis, tires, and alignment",
    description: "The choices that most often determine Street and Street Touring legality.",
    tip: "These parts change grip, response, and how quickly the car changes direction.",
    fields: ["tires", "wheels", "shocks", "springs", "swayBars", "alignment"]
  },
  {
    title: "Powertrain and differential",
    description: "Intake, exhaust, ECU, engine, and drivetrain changes.",
    tip: "These parts change how power is made and how efficiently it reaches the tires.",
    fields: ["intake", "exhaust", "ecu", "engine", "differential", "brakes"]
  },
  {
    title: "Aero, safety, cabin, and body",
    description: "Exterior, interior, safety equipment, and anything outside the common paths.",
    tip: "These changes affect stability, safety, balance, and how much weight the car carries.",
    fields: ["aero", "safety", "interior", "body", "other"]
  },
  {
    title: "Xtreme Street eligibility",
    description: "Required only when you want XA/XB considered for a highly modified street car.",
    tip: "XA and XB use separate production-car, road-equipment, tire, drivetrain, and minimum-weight rules rather than the normal preparation ladder.",
    fields: [
      "xtremeVehicleType",
      "drivetrainLayout",
      "xtremePowertrain",
      "competitionWeight",
      "roadEquipment"
    ]
  },
  {
    title: "Street Modified (SSM/SM/SMF) eligibility",
    description: "Required only when you want SSM, SM, or SMF considered for a heavily modified street car.",
    tip: "Street Modified is not a per-model list — SCCA places SSM/SM/SMF by body configuration, drivetrain, and a minimum-weight formula based on engine displacement.",
    fields: [
      "bodyConfiguration",
      "inductionType",
      "engineDisplacementLiters",
      "measuredWeightNoDriver",
      "tireWidthCategory",
      "solidAxleRwd"
    ]
  },
  {
    title: "Prepared (XP/CP/DP/EP/FP) eligibility",
    description: "Required only when you want XP, CP, DP, EP, or FP considered for a car built beyond Street Prepared.",
    tip: "XP is Prepared's catch-all class. CP, DP, EP, and FP are curated lists of specific vehicles, each with their own weight formula -- CP is a flat rate by engine type; DP, EP, and FP use displacement-based formulas that also depend on valve count, induction type, and (for FP) drivetrain and rotary engine family.",
    fields: [
      "activeReactiveSuspension",
      "rearWeightBiasOver51",
      "cpEngineConfiguration",
      "valveCountPerCylinder",
      "variableCamTiming",
      "wheelWidthCategory",
      "alternateEngineAllowance",
      "rotaryEngineFamily",
      "peripheralPortRotary"
    ]
  },
  {
    title: "Modified (DM/EM) eligibility",
    description: "Required only when you want DM or EM considered for a production-based car built beyond Prepared.",
    tip: "DM/EM use a flat minimum weight with the driver based on engine displacement, with additions for AWD, traction aids, and wings. AM/BM/CM/FM are dedicated race-chassis classes a modified production car cannot enter.",
    fields: ["tractionAidsPresent", "aeroWingsPresent", "measuredWeightWithDriverModified"]
  }
];

export function BuildEditor({ value, onChange, onBack, onNext }: Props) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());
  const [stockMode, setStockMode] = useState(() =>
    RULE_GROUPS.every((group) => value[group.field] === DEFAULT_BUILD[group.field])
  );
  const isStock = stockMode;

  const update = (field: BuildField, next: string) => {
    setStockMode(false);
    onChange({ ...value, [field]: next });
  };

  const toggleSection = (title: string, open: boolean) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (open) next.add(title);
      else next.delete(title);
      return next;
    });
  };

  return (
    <section className="panel" id="build-step" aria-labelledby="build-title">
      <div className="panel-heading">
        <div className="step-number">2</div>
        <div>
          <p className="eyebrow">Preparation legality</p>
          <h2 id="build-title">Describe the complete build</h2>
          <p>The highest-impact modification controls. Select "unknown" rather than guessing.</p>
        </div>
      </div>

      <label className="stock-toggle">
        <input
          type="checkbox"
          checked={isStock}
          onChange={(event) => {
            setStockMode(event.target.checked);
            if (event.target.checked) onChange(DEFAULT_BUILD);
          }}
        />
        <span>
          <strong>My car is stock</strong>
          <small>Skip the modification questions and review the standard configuration.</small>
        </span>
      </label>

      {isStock ? (
        <div className="stock-confirmation">
          <strong>Stock selected.</strong> You can continue to review, or uncheck this box to
          describe a modified build.
        </div>
      ) : (
        <div className="build-sections">
          {BUILD_SECTIONS.map((section) => {
            const open = openSections.has(section.title);
            return (
              <details
                className="build-section"
                key={section.title}
                open={open}
                onToggle={(event) => toggleSection(section.title, event.currentTarget.open)}
              >
                <summary>
                  <span>
                    <strong>
                      {section.title}{" "}
                      <span
                        className="section-info"
                        title={section.tip}
                        aria-label={`Why this matters: ${section.tip}`}
                      >
                        ?
                      </span>
                    </strong>
                    <small>{section.description}</small>
                  </span>
                  <span className="summary-action">{open ? "Hide" : "Show"}</span>
                </summary>
                <div className="build-grid">
                  {section.fields.map((field) => {
                    const group = RULE_GROUPS.find((candidate) => candidate.field === field);
                    if (!group) return null;
                    if (group.inputType === "number") {
                      return (
                        <label className="build-field" key={group.field}>
                          <span className="field-title">{group.title}</span>
                          <span className="field-help">{group.help}</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder={group.numberPlaceholder}
                            value={value[group.field]}
                            onChange={(event) => update(group.field, event.target.value)}
                          />
                        </label>
                      );
                    }
                    const selected = group.options.find(
                      (option) => option.value === value[group.field]
                    );
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
                              {option.plainLabel ?? option.label}
                            </option>
                          ))}
                        </select>
                        <span className="selected-detail">{selected?.description}</span>
                        {selected?.plainLabel && (
                          <span className="selected-technical">
                            Rulebook wording: {selected.label} ({selected.section})
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      )}

      <div className="wizard-actions">
        <button className="secondary-button" type="button" onClick={onBack}>
          Back: vehicle
        </button>
        <button className="primary-button" type="button" onClick={onNext}>
          Next: review
        </button>
      </div>
    </section>
  );
}
