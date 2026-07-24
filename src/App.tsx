import { useMemo, useState } from "react";
import { BuildReview } from "./components/BuildReview";
import { BuildEditor } from "./components/BuildEditor";
import { ResultPanel } from "./components/ResultPanel";
import { VehicleSelector } from "./components/VehicleSelector";
import { classifyVehicle } from "./lib/classifier";
import { DEFAULT_BUILD } from "./lib/rules";
import { resolveVehicleSelection } from "./lib/vehicleData";
import type { BuildProfile, VehicleSelection } from "./lib/types";

interface SavedState {
  selection: VehicleSelection;
  build: BuildProfile;
}

const DEFAULT_SELECTION: VehicleSelection = {
  make: "Mazda",
  model: "MX-5 Miata",
  year: "2016"
};

const TOURING_MIATA: SavedState = {
  selection: DEFAULT_SELECTION,
  build: {
    ...DEFAULT_BUILD,
    wheels: "streetTouringLegal",
    springs: "coilovers",
    swayBars: "bothChanged",
    alignment: "streetTouringHardware",
    intake: "toThrottleBody",
    exhaust: "headersHighFlowCat",
    ecu: "reflash"
  }
};

function readInitialState(): SavedState {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("build");
  if (!encoded) {
    return {
      selection: resolveVehicleSelection(DEFAULT_SELECTION),
      build: DEFAULT_BUILD
    };
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(encoded)) as Partial<SavedState>;
    return {
      selection: resolveVehicleSelection({
        make: parsed.selection?.make ?? DEFAULT_SELECTION.make,
        model: parsed.selection?.model ?? DEFAULT_SELECTION.model,
        year: parsed.selection?.year ?? DEFAULT_SELECTION.year,
        variant: parsed.selection?.variant,
        notListed: parsed.selection?.notListed,
        manualDescription: parsed.selection?.manualDescription
      }),
      build: { ...DEFAULT_BUILD, ...(parsed.build ?? {}) }
    };
  } catch {
    return {
      selection: resolveVehicleSelection(DEFAULT_SELECTION),
      build: DEFAULT_BUILD
    };
  }
}

export default function App() {
  const initial = useMemo(readInitialState, []);
  const [selection, setSelection] = useState<VehicleSelection>(initial.selection);
  const [build, setBuild] = useState<BuildProfile>(initial.build);
  const [shareLabel, setShareLabel] = useState("Copy share link");
  const [contactOpen, setContactOpen] = useState(false);

  const result = useMemo(
    () => classifyVehicle(selection, build),
    [selection, build]
  );

  const loadState = (state: SavedState) => {
    setSelection(resolveVehicleSelection(state.selection));
    setBuild(state.build);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyShareLink = async () => {
    const state: SavedState = { selection, build };
    const url = new URL(window.location.href);
    url.searchParams.set("build", encodeURIComponent(JSON.stringify(state)));
    try {
      await navigator.clipboard.writeText(url.toString());
      setShareLabel("Copied");
      window.setTimeout(() => setShareLabel("Copy share link"), 1500);
    } catch {
      window.history.replaceState({}, "", url);
      setShareLabel("Link added to address bar");
    }
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="./" aria-label="SCCA Solo Class Finder home">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>
            <strong>Solo Class Finder</strong>
            <small>Explainable, conservative classing</small>
          </span>
        </a>

        <div className="header-actions">
          <span className="data-badge">2026 rules framework</span>
          <a
            className="header-link"
            href="https://www.scca.com/pages/solo-cars-and-rules"
            target="_blank"
            rel="noreferrer"
          >
            Current Solo Rules
          </a>
          <button
            className="contact-button"
            type="button"
            aria-expanded={contactOpen}
            aria-controls="contact-panel"
            onClick={() => setContactOpen((open) => !open)}
          >
            Contact regional chair
          </button>
          <button className="secondary-button" type="button" onClick={copyShareLink}>
            {shareLabel}
          </button>
          <span className="sr-only" aria-live="polite">
            {shareLabel === "Copy share link" ? "" : shareLabel}
          </span>
        </div>
      </header>

      {contactOpen && (
        <aside className="contact-panel" id="contact-panel" aria-labelledby="contact-title">
          <div>
            <p className="eyebrow">Regional support</p>
            <h2 id="contact-title">Need a human answer?</h2>
            <p>
              ZIP-code routing to the right regional chair is planned for the next release. Until
              then, keep the exact vehicle and build details from this page ready for your region.
            </p>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setContactOpen(false)}
          >
            Close
          </button>
        </aside>
      )}

      <main>
        <section className="intro-band">
          <div>
            <p className="eyebrow">SCCA Solo classification assistant</p>
            <h1>Class the car you actually built.</h1>
            <p className="intro-copy">
              Choose the car, describe the build, review the facts, and then read the result. The
              engine stops rather than inventing an answer when the data or modification detail is
              incomplete.
            </p>
          </div>
        </section>

        <nav className="progress-nav" aria-label="Classification steps">
          <a href="#vehicle-step"><span>1</span><strong>Vehicle</strong><small>Make, model, year</small></a>
          <a href="#build-step"><span>2</span><strong>Build</strong><small>Preparation details</small></a>
          <a href="#review-step"><span>3</span><strong>Review</strong><small>Check your inputs</small></a>
          <a href="#result-step"><span>4</span><strong>Result</strong><small>Class and rule path</small></a>
        </nav>

        <div className="workspace">
          <div className="input-column">
            <VehicleSelector value={selection} onChange={setSelection} />

            <div className="preset-bar" aria-label="Example builds">
              <span>Examples</span>
              <button
                type="button"
                onClick={() => loadState({ selection: DEFAULT_SELECTION, build: DEFAULT_BUILD })}
              >
                Stock 2016 Miata
              </button>
              <button type="button" onClick={() => loadState(TOURING_MIATA)}>
                AST Miata build
              </button>
              <button
                type="button"
                onClick={() =>
                  loadState({
                    selection: {
                      make: "Chevrolet",
                      model: "Camaro (V6)",
                      year: "2010"
                    },
                    build: DEFAULT_BUILD
                  })
                }
              >
                Stock 2010 Camaro V6
              </button>
            </div>

            <BuildEditor value={build} onChange={setBuild} />
            <BuildReview selection={selection} build={build} />
          </div>

          <ResultPanel selection={selection} result={result} />
        </div>
      </main>

      <footer>
        <p>
          Advisory tool only. Verify the current SCCA Solo Rules, Appendix A, Fastrack bulletins, and any event-specific supplemental regulations before competition.
        </p>
        <p>
          SCCA and Solo are trademarks of Sports Car Club of America. This project is not affiliated with or endorsed by SCCA.
        </p>
      </footer>
    </div>
  );
}
