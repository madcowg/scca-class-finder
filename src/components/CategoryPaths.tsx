import { CATEGORY_LABELS, CATEGORY_ORDER, classLabel } from "../lib/classMetadata";
import type { CategoryEvaluation, ClassificationResult } from "../lib/types";

interface Props {
  result: ClassificationResult;
}

function PathList({ title, evaluations }: { title: string; evaluations: CategoryEvaluation[] }) {
  if (evaluations.length === 0) {
    return (
      <div className="path-group path-group-empty">
        <h4>{title}</h4>
        <p>No additional legal category path is modeled for this build and mapping.</p>
      </div>
    );
  }

  return (
    <div className="path-group">
      <h4>{title}</h4>
      <ul className="path-list">
        {evaluations.map((evaluation) => (
          <li key={evaluation.category}>
            <span>{CATEGORY_LABELS[evaluation.category]}</span>
            <strong>{evaluation.classId ? classLabel(evaluation.classId) : "Manual review"}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CategoryPaths({ result }: Props) {
  const selectedIndex = result.selectedCategory
    ? CATEGORY_ORDER.indexOf(result.selectedCategory)
    : -1;
  const eligible = result.evaluations.filter(
    (evaluation) => evaluation.status === "eligible" && evaluation.category !== result.selectedCategory
  );
  const closerToStock =
    selectedIndex >= 0
      ? eligible.filter((evaluation) => CATEGORY_ORDER.indexOf(evaluation.category) < selectedIndex)
      : [];
  const morePrepared =
    selectedIndex >= 0
      ? eligible.filter((evaluation) => CATEGORY_ORDER.indexOf(evaluation.category) > selectedIndex)
      : [];

  return (
    <div className="panel category-path-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Other modeled paths</p>
          <h3>Where this car may fit with a different build</h3>
        </div>
      </div>
      <p className="category-path-note">
        These are independent category evaluations for the same exact vehicle. "Closer to stock"
        and "more prepared" are orientation labels, not a claim that every category is a legal
        progression from the one beside it.
      </p>
      {selectedIndex >= 0 ? (
        <div className="path-groups">
          <PathList title="Closer-to-stock paths" evaluations={closerToStock} />
          <PathList title="More-prepared paths" evaluations={morePrepared} />
        </div>
      ) : (
        <p className="category-path-note">
          A current category was not selected, so the detailed evaluation below is the complete
          set of modeled paths.
        </p>
      )}
    </div>
  );
}
