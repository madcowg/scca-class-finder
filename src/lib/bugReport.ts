import { classLabel } from "./classMetadata";
import { summarizeBuild } from "./regionalContact";
import type { BuildProfile, ClassificationResult, VehicleSelection } from "./types";
import { vehicleSelectionLabel } from "./vehicleData";

export const GITHUB_REPO_URL = "https://github.com/madcowg/scca-class-finder";

export function buildBugReportUrl(
  selection: VehicleSelection,
  build: BuildProfile,
  result: ClassificationResult,
  shareUrl: string
): string {
  const vehicle = vehicleSelectionLabel(selection) || "not entered yet";
  const modifications = summarizeBuild(build);
  const outcome = result.selectedClass ? classLabel(result.selectedClass) : "no class resolved";

  const body = [
    "**What went wrong?**",
    "",
    "",
    "---",
    `Vehicle: ${vehicle}`,
    `Build: ${modifications}`,
    `Result shown: ${outcome}`,
    `Link to reproduce: ${shareUrl}`
  ].join("\n");

  const params = new URLSearchParams({ title: `Bug: ${vehicle}`, body });
  return `${GITHUB_REPO_URL}/issues/new?${params.toString()}`;
}
