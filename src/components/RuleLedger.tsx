import { CATEGORY_LABELS } from "../lib/classMetadata";
import type { RuleFinding } from "../lib/types";

interface Props {
  findings: RuleFinding[];
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
                <td>{finding.section}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
