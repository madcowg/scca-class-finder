import { useMemo, useState } from "react";
import {
  SCCA_REGION_LOCATOR_URL,
  buildMailto,
  buildRegionalContactDraft,
  resolveRegionalContact
} from "../lib/regionalContact";
import type { BuildProfile, VehicleSelection } from "../lib/types";

interface Props {
  selection: VehicleSelection;
  build: BuildProfile;
  onClose: () => void;
}

export function RegionalContactPanel({ selection, build, onClose }: Props) {
  const [name, setName] = useState("");
  const [zip, setZip] = useState("");
  const [copyStatus, setCopyStatus] = useState("Copy prepared message");
  const route = resolveRegionalContact(zip);
  const draft = useMemo(
    () => buildRegionalContactDraft(name, selection, build),
    [name, selection, build]
  );
  const nameReady = Boolean(name.trim());
  const preparedMessage = `Subject: ${draft.subject}\n\n${draft.body}`;
  const directMailto =
    route.status === "direct" ? buildMailto(route.email, draft) : "";

  const copyPreparedMessage = async () => {
    try {
      await navigator.clipboard.writeText(preparedMessage);
      setCopyStatus("Message copied");
      window.setTimeout(() => setCopyStatus("Copy prepared message"), 1500);
    } catch {
      setCopyStatus("Copy unavailable; select the preview below");
    }
  };

  return (
    <aside
      className="contact-panel"
      id="contact-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="contact-title"
    >
      <div className="contact-panel-main">
        <div className="contact-heading">
          <p className="eyebrow">Regional support</p>
          <h2 id="contact-title">Contact a Solo chair</h2>
          <p>
            Enter your name and ZIP. We will prepare a message with the vehicle and build
            currently shown in the assistant.
          </p>
        </div>

        <div className="contact-fields">
          <label className="contact-field">
            <span>Your name</span>
            <input
              type="text"
              autoComplete="name"
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name for the email signature"
            />
          </label>
          <label className="contact-field">
            <span>Five-digit ZIP code</span>
            <input
              type="text"
              autoComplete="postal-code"
              inputMode="numeric"
              pattern="[0-9]{5}"
              maxLength={5}
              value={zip}
              onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="35203"
              aria-describedby="zip-help"
            />
            <span className="sr-only" id="zip-help">
              Enter exactly five numeric digits.
            </span>
          </label>
        </div>

        <p className="contact-privacy">
          Your name and ZIP stay in this browser. This site does not send or store them.
        </p>

        {route.status === "invalid" && (
          <p className="contact-help">
            Enter a five-digit ZIP to find the safest available contact path.
          </p>
        )}

        {route.status === "direct" && (
          <section className="contact-route contact-route-direct" aria-live="polite">
            <div>
              <span className="field-title">Available direct contact</span>
              <h3>{route.regionName}</h3>
              <p>
                This is a conservative Central Alabama routing match, not an official region
                boundary determination. You can verify your region with SCCA before sending.
              </p>
            </div>
            <div className="contact-actions">
              {nameReady ? (
                <a className="primary-button" href={directMailto}>
                  Open email draft
                </a>
              ) : (
                <button className="primary-button" type="button" disabled>
                  Add your name to open the draft
                </button>
              )}
              <a
                className="secondary-button"
                href={SCCA_REGION_LOCATOR_URL}
                target="_blank"
                rel="noreferrer"
              >
                Verify with SCCA locator
              </a>
            </div>
          </section>
        )}

        {route.status === "locator" && (
          <section className="contact-route" aria-live="polite">
            <div>
              <span className="field-title">Official locator needed</span>
              <h3>Find the correct SCCA Region</h3>
              <p>
                We do not have a verified Solo-chair address for this ZIP, so the app will not
                guess. Use SCCA's official locator, then copy the prepared message below.
              </p>
            </div>
            <div className="contact-actions">
              <a
                className="primary-button"
                href={SCCA_REGION_LOCATOR_URL}
                target="_blank"
                rel="noreferrer"
              >
                Find my SCCA Region
              </a>
              <button
                className="secondary-button"
                type="button"
                disabled={!nameReady}
                onClick={copyPreparedMessage}
              >
                {nameReady ? copyStatus : "Add your name to copy the message"}
              </button>
            </div>
          </section>
        )}

        {route.status !== "invalid" && (
          <details className="contact-preview">
            <summary>Preview prepared message</summary>
            <pre>{preparedMessage}</pre>
          </details>
        )}

        <span className="sr-only" aria-live="polite">
          {copyStatus === "Copy prepared message" ? "" : copyStatus}
        </span>
      </div>

      <button className="secondary-button contact-close" type="button" onClick={onClose}>
        Close
      </button>
    </aside>
  );
}
