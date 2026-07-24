import { CATEGORY_LABELS } from "../lib/classMetadata";
import type { RuleFinding } from "../lib/types";

interface Props {
  findings: RuleFinding[];
}

const RULEBOOK_PDF_URL = "https://www.scca.com/downloads/78494/download";
const FASTRACK_URL = "https://www.scca.com/pages/solo";
const SECTION_PAGES: Record<string, number> = {
  "13": 75,
  "14": 88,
  "15": 102,
  "16": 124,
  "17": 132,
  "18": 156
};

function ruleReferenceLinks(section: string) {
  return section.split(/\s*\/\s*/).map((reference, index) => {
    const topLevel = reference.match(/^(\d+)(?:\.|$)/)?.[1];
    const page = topLevel ? SECTION_PAGES[topLevel] : undefined;
    const href = reference.toLowerCase().includes("fastrack")
      ? FASTRACK_URL
      : `${RULEBOOK_PDF_URL}${page ? `#page=${page}` : ""}`;
    return (
      <span key={`${reference}-${index}`}>
        {index > 0 && " / "}
        {reference === "Manual review" ? (
          reference
        ) : (
          <a href={href} target="_blank" rel="noreferrer">
            {reference}
          </a>
        )}
      </span>
    );
  });
}

export function RuleLedger({ findings }: Props) {
  return (
    <details className="ledger" open>
      <summary>
        <span>Rule ledger</span>
        <span>{findings.length} build checks</span>
      </summary>
      <div className="ledger-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>Selected configuration</th>
              <th>Earliest modeled categories</th>
              <th>Rule reference</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((finding) => (
              <tr key={finding.field} className={finding.manualReview ? "review-row" : ""}>
                <td>{finding.title}</td>
                <td>
                  <strong>{finding.selectedLabel}</strong>
                  <span>{finding.description}</span>
                </td>
                <td>
                  {finding.manualReview
                    ? "Manual review"
                    : finding.allowedCategories
                        .map((category) => CATEGORY_LABELS[category])
                        .join(", ") || "None"}
                </td>
                <td>{ruleReferenceLinks(finding.section)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
