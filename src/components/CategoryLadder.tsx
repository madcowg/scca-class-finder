import {
  CATEGORY_LABELS,
  CATEGORY_SECTIONS,
  categorySectionUrl,
  classLabel
} from "../lib/classMetadata";
import type { CategoryEvaluation } from "../lib/types";

interface Props {
  evaluations: CategoryEvaluation[];
}

const STATUS_LABEL: Record<CategoryEvaluation["status"], string> = {
  eligible: "Eligible",
  blocked: "Blocked by build",
  "not-listed": "No Appendix A placement",
  "manual-review": "Manual review"
};

export function CategoryLadder({ evaluations }: Props) {
  return (
    <div className="category-ladder">
      {evaluations.map((evaluation, index) => (
        <article
          className={`category-card status-${evaluation.status}`}
          key={evaluation.category}
        >
          <div className="category-rail" aria-hidden="true">
            <span>{index + 1}</span>
          </div>
          <div className="category-content">
            <div className="category-title-row">
              <div>
                <h4>{CATEGORY_LABELS[evaluation.category]}</h4>
                <a
                  href={categorySectionUrl(evaluation.category)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {CATEGORY_SECTIONS[evaluation.category]}
                </a>
              </div>
              <span className="status-pill">{STATUS_LABEL[evaluation.status]}</span>
            </div>

            {evaluation.classId && (
              <p className="mapped-class">{classLabel(evaluation.classId)}</p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
