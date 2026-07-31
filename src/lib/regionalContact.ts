import { DEFAULT_BUILD, RULE_GROUPS, findRuleOption } from "./rules";
import type { BuildProfile, VehicleSelection } from "./types";
import { vehicleSelectionLabel } from "./vehicleData";

export const SCCA_REGION_LOCATOR_URL = "https://www.scca.com/regions";
export const ALSCCA_SOLO_CHAIR_EMAIL = "alscca.solochair@gmail.com";

const ALSCCA_DIRECT_ZIP_PREFIXES = new Set(["350", "351", "352", "360", "361"]);

export type RegionalContactResolution =
  | { status: "invalid" }
  | { status: "direct"; zip: string; regionName: "Alabama Region (ALSCCA)"; email: string }
  | { status: "locator"; zip: string };

export interface RegionalContactDraft {
  subject: string;
  body: string;
  vehicle: string;
  modifications: string;
}

export function resolveRegionalContact(zip: string): RegionalContactResolution {
  const normalizedZip = zip.trim();
  if (!/^\d{5}$/.test(normalizedZip)) {
    return { status: "invalid" };
  }

  if (ALSCCA_DIRECT_ZIP_PREFIXES.has(normalizedZip.slice(0, 3))) {
    return {
      status: "direct",
      zip: normalizedZip,
      regionName: "Alabama Region (ALSCCA)",
      email: ALSCCA_SOLO_CHAIR_EMAIL
    };
  }

  return { status: "locator", zip: normalizedZip };
}

export function summarizeBuild(build: BuildProfile): string {
  const changes = RULE_GROUPS.flatMap((group) => {
    if (build[group.field] === DEFAULT_BUILD[group.field]) return [];
    const option = findRuleOption(group.field, build[group.field]);
    return option ? [`${group.title}: ${option.label}`] : [];
  });

  return changes.length === 0 ? "stock" : changes.join("; ");
}

export function buildRegionalContactDraft(
  name: string,
  selection: VehicleSelection,
  build: BuildProfile
): RegionalContactDraft {
  const cleanName = name.trim().replace(/\s+/g, " ") || "[your name]";
  const vehicle = vehicleSelectionLabel(selection) || "vehicle details not entered yet";
  const modifications = summarizeBuild(build);
  const buildDescription =
    modifications === "stock"
      ? "that is stock"
      : `with these modifications: ${modifications}`;

  return {
    subject: "Solo classification help",
    body: [
      "Hello,",
      "",
      `I'm looking to participate in your region's autocross events. I have a ${vehicle} ${buildDescription}, and I would like to know which class I belong to and what events are upcoming in the region.`,
      "",
      "Respectfully,",
      cleanName
    ].join("\n"),
    vehicle,
    modifications
  };
}

export function buildClassificationClarificationDraft(
  name: string,
  selection: VehicleSelection,
  build: BuildProfile
): RegionalContactDraft {
  const cleanName = name.trim().replace(/\s+/g, " ") || "[your name]";
  const vehicle = vehicleSelectionLabel(selection) || "vehicle details not entered yet";
  const modifications = summarizeBuild(build);
  const buildDescription =
    modifications === "stock"
      ? "that is stock"
      : `with these modifications: ${modifications}`;

  return {
    subject: "Solo classification help needed",
    body: [
      "Hello,",
      "",
      `I'm trying to classify my ${vehicle} ${buildDescription} for autocross using the SCCA Solo Class Finder tool, but it could not find an official Appendix A placement for this exact vehicle. Could you help me confirm which class it should run in?`,
      "",
      "Respectfully,",
      cleanName
    ].join("\n"),
    vehicle,
    modifications
  };
}

export function buildMailto(email: string, draft: RegionalContactDraft): string {
  return `mailto:${email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
}
