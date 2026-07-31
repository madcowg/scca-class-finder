import { useMemo, useState } from "react";
import alsccaLogo from "./assets/ALSCCA_logo.png";
import { BuildReview } from "./components/BuildReview";
import { BuildEditor } from "./components/BuildEditor";
import { RegionalContactPanel } from "./components/RegionalContactPanel";
import { ResultPanel } from "./components/ResultPanel";
import { VehicleSelector } from "./components/VehicleSelector";
import { buildBugReportUrl } from "./lib/bugReport";
import { classifyVehicle } from "./lib/classifier";
import { DEFAULT_BUILD } from "./lib/rules";
import { getVehicleVariants, resolveVehicleSelection } from "./lib/vehicleData";
import type { BuildProfile, VehicleSelection } from "./lib/types";

type Step = 1 | 2 | 3 | 4;

interface SavedState {
  selection: VehicleSelection;
  build: BuildProfile;
  step: Step;
}

interface SharedStatePayload {
  selection: VehicleSelection;
  build: Partial<BuildProfile>;
  step: Step;
}

const EMPTY_SELECTION: VehicleSelection = { make: "", model: "", year: "" };

function isStep(value: unknown): value is Step {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function buildDiff(build: BuildProfile): Partial<BuildProfile> {
  const diff: Partial<BuildProfile> = {};
  for (const key of Object.keys(build) as (keyof BuildProfile)[]) {
    if (build[key] !== DEFAULT_BUILD[key]) {
      (diff as Record<string, unknown>)[key] = build[key];
    }
  }
  return diff;
}

function readInitialState(): SavedState {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("build");
  if (!encoded) {
    return {
      selection: EMPTY_SELECTION,
      build: DEFAULT_BUILD,
      step: 1
    };
  }

  try {
    const parsed = JSON.parse(encoded) as Partial<SharedStatePayload>;
    return {
      selection: resolveVehicleSelection({
        make: parsed.selection?.make ?? EMPTY_SELECTION.make,
        model: parsed.selection?.model ?? EMPTY_SELECTION.model,
        year: parsed.selection?.year ?? EMPTY_SELECTION.year,
        variant: parsed.selection?.variant,
        notListed: parsed.selection?.notListed,
        manualDescription: parsed.selection?.manualDescription
      }),
      build: { ...DEFAULT_BUILD, ...(parsed.build ?? {}) },
      step: isStep(parsed.step) ? parsed.step : 1
    };
  } catch {
    return {
      selection: EMPTY_SELECTION,
      build: DEFAULT_BUILD,
      step: 1
    };
  }
}

export default function App() {
  const initial = useMemo(readInitialState, []);
  const [selection, setSelection] = useState<VehicleSelection>(initial.selection);
  const [build, setBuild] = useState<BuildProfile>(initial.build);
  const [activeStep, setActiveStep] = useState<Step>(initial.step);
  const [shareLabel, setShareLabel] = useState("Share my results");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactReason, setContactReason] = useState<"general" | "classification">("general");

  const result = useMemo(
    () => classifyVehicle(selection, build),
    [selection, build]
  );

  const vehicleReady = selection.notListed
    ? Boolean(selection.manualDescription?.trim())
    : Boolean(
        selection.make &&
          selection.model &&
          selection.year &&
          (selection.variant || getVehicleVariants(selection.make, selection.model, selection.year).length <= 1)
      );

  const showIntro = activeStep === 1;

  const goToStep = (step: Step) => {
    setActiveStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildShareUrl = (step: Step) => {
    const payload: SharedStatePayload = { selection, build: buildDiff(build), step };
    const url = new URL(window.location.href);
    url.searchParams.set("build", JSON.stringify(payload));
    return url;
  };

  const shareResults = async () => {
    const url = buildShareUrl(4);
    try {
      await navigator.clipboard.writeText(url.toString());
      setShareLabel("Copied");
      window.setTimeout(() => setShareLabel("Share my results"), 1500);
    } catch {
      window.history.replaceState({}, "", url);
      setShareLabel("Link added to address bar");
    }
  };

  const bugReportUrl = buildBugReportUrl(selection, build, result, buildShareUrl(activeStep).toString());

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="./" aria-label="SCCA Solo Class Finder home">
          <img className="brand-logo" src={alsccaLogo} alt="" />
          <span>
            <strong>SCCA Solo Classification Assistant</strong>
          </span>
        </a>

        <div className="header-actions">
          <a
            className="header-link"
            href="https://www.scca.com/downloads/78494/download"
            target="_blank"
            rel="noreferrer"
          >
            2026 Solo Rulebook
          </a>
          <button
            className="contact-button"
            type="button"
            aria-expanded={contactOpen}
            aria-controls="contact-panel"
            onClick={() => {
              setContactReason("general");
              setContactOpen((open) => !open);
            }}
          >
            Contact regional chair
          </button>
          <a className="header-link" href={bugReportUrl} target="_blank" rel="noreferrer">
            Report a bug
          </a>
          {activeStep === 4 && (
            <>
              <button className="secondary-button" type="button" onClick={shareResults}>
                {shareLabel}
              </button>
              <span className="sr-only" aria-live="polite">
                {shareLabel === "Share my results" ? "" : shareLabel}
              </span>
            </>
          )}
        </div>
      </header>

      {contactOpen && (
        <RegionalContactPanel
          selection={selection}
          build={build}
          reason={contactReason}
          onClose={() => setContactOpen(false)}
        />
      )}

      <main>
        {showIntro && (
          <section className="intro-band">
            <div>
              <p className="eyebrow">SCCA Solo classification assistant</p>
              <h1>Find where you belong before sign up</h1>
              <p className="intro-copy">It's ok not to know!</p>
            </div>
          </section>
        )}

        <div className="content-grid">
          <nav className="progress-nav" aria-label="Classification steps">
            {[
              [1, "Vehicle"],
              [2, "Build"],
              [3, "Review"],
              [4, "Result"]
            ].map(([step, title]) => {
              const stepNumber = step as Step;
              return (
                <button
                  className={activeStep === stepNumber ? "progress-step active" : "progress-step"}
                  type="button"
                  key={stepNumber}
                  disabled={stepNumber > activeStep}
                  aria-current={activeStep === stepNumber ? "step" : undefined}
                  onClick={() => goToStep(stepNumber)}
                >
                  <span>{stepNumber}</span>
                  <strong>{title}</strong>
                </button>
              );
            })}
          </nav>

          <div className="workspace">
          {activeStep === 1 && (
            <div className="input-column">
              <VehicleSelector
                value={selection}
                onChange={setSelection}
                canAdvance={vehicleReady}
                onNext={() => goToStep(2)}
              />
            </div>
          )}

          {activeStep === 2 && (
            <div className="input-column">
              <BuildEditor
                value={build}
                onChange={setBuild}
                onBack={() => goToStep(1)}
                onNext={() => goToStep(3)}
              />
            </div>
          )}

          {activeStep === 3 && (
            <div className="input-column">
              <BuildReview
                selection={selection}
                build={build}
                onBack={() => goToStep(2)}
                onNext={() => goToStep(4)}
              />
            </div>
          )}

          {activeStep === 4 && (
            <div className="input-column">
              <ResultPanel
                selection={selection}
                result={result}
                onRequestClarification={() => {
                  setContactReason("classification");
                  setContactOpen(true);
                }}
              />
            </div>
          )}
          </div>
        </div>
      </main>

      <footer>
        <span className="footer-spacer" aria-hidden="true" />
        <p className="footer-copyright">Copyright 2026 Gabriel Marrero</p>
        <details className="legal-disclaimer">
          <summary>Legal Disclaimer</summary>
          <div className="legal-disclaimer-content">
            <p>
              Advisory tool only. Verify the current SCCA Solo Rules, Appendix A, Fastrack
              bulletins, and any event-specific supplemental regulations before competition.
            </p>
            <p>
              SCCA and Solo are trademarks of Sports Car Club of America. This project is not
              affiliated with or endorsed by SCCA.
            </p>
          </div>
        </details>
      </footer>
    </div>
  );
}
