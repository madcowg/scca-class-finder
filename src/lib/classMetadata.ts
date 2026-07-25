import type { PrincipalCategory } from "./types";

export const CATEGORY_ORDER: PrincipalCategory[] = [
  "street",
  "streetTouring",
  "streetPrepared",
  "streetModified",
  "prepared",
  "modified"
];

export const CATEGORY_LABELS: Record<PrincipalCategory, string> = {
  street: "Street",
  streetTouring: "Street Touring",
  streetPrepared: "Street Prepared",
  streetModified: "Street Modified",
  prepared: "Prepared",
  modified: "Modified"
};

export const CATEGORY_SECTIONS: Record<PrincipalCategory, string> = {
  street: "Section 13",
  streetTouring: "Section 14",
  streetPrepared: "Section 15",
  streetModified: "Section 16",
  prepared: "Section 17",
  modified: "Section 18"
};

const categoryClassIds: Record<PrincipalCategory, Set<string>> = {
  street: new Set(["ss", "as", "bs", "cs", "ds", "es", "fs", "gs", "hs", "ssr"]),
  streetTouring: new Set(["sst", "ast", "bst", "cst", "dst", "est", "gst", "sts", "str", "stu", "stx", "sth", "stf", "stp"]),
  streetPrepared: new Set(["ssp", "asp", "bsp", "csp", "dsp", "esp", "fsp"]),
  streetModified: new Set(["ssm", "sm", "smf"]),
  prepared: new Set(["xp", "bp", "cp", "dp", "ep", "fp"]),
  modified: new Set(["am", "bm", "cm", "dm", "em", "fm"])
};

export const SUPPLEMENTAL_CLASS_IDS = new Set([
  "ssc",
  "csm",
  "csx",
  "fsae",
  "evx",
  "camc",
  "camt",
  "cams",
  "xs",
  "xa",
  "xb",
  "xu"
]);

export const CLASS_NAMES: Record<string, string> = {
  ss: "Super Street",
  as: "A Street",
  bs: "B Street",
  cs: "C Street",
  ds: "D Street",
  es: "E Street",
  fs: "F Street",
  gs: "G Street",
  hs: "H Street",
  ssr: "Super Street R",
  sst: "Super Street Touring",
  ast: "A Street Touring",
  bst: "B Street Touring",
  cst: "C Street Touring",
  dst: "D Street Touring",
  est: "E Street Touring",
  gst: "G Street Touring",
  sts: "Street Touring Sport",
  str: "Street Touring Roadster",
  stu: "Street Touring Ultra",
  stx: "Street Touring Xtreme",
  sth: "Street Touring Hatch",
  stf: "Street Touring FWD (historical)",
  stp: "Street Touring Pony (historical)",
  ssp: "Super Street Prepared",
  asp: "A Street Prepared (historical)",
  bsp: "B Street Prepared (historical)",
  csp: "C Street Prepared",
  dsp: "D Street Prepared",
  esp: "E Street Prepared",
  fsp: "F Street Prepared",
  ssm: "Super Street Modified",
  sm: "Street Modified",
  smf: "Street Modified FWD",
  xp: "X Prepared",
  bp: "B Prepared (historical)",
  cp: "C Prepared",
  dp: "D Prepared",
  ep: "E Prepared",
  fp: "F Prepared",
  am: "A Modified",
  bm: "B Modified",
  cm: "C Modified",
  dm: "D Modified",
  em: "E Modified",
  fm: "F Modified",
  km: "Kart Modified",
  ja: "Formula Junior A",
  jb: "Formula Junior B",
  jc: "Formula Junior C",
  hcr: "Heritage Classic Race",
  hcs: "Heritage Classic Street",
  ssc: "Solo Spec Coupe",
  csm: "Club Spec Mustang",
  csx: "Club Spec MX-5",
  fsae: "Formula SAE",
  evx: "Electric Vehicle Experimental",
  camc: "Classic American Muscle Contemporary",
  camt: "Classic American Muscle Traditional",
  cams: "Classic American Muscle Sports",
  xs: "Xtreme Street S (2023 experimental)",
  xa: "Xtreme Street A",
  xb: "Xtreme Street B",
  xu: "Xtreme Street Unlimited"
};

export function categoryForClass(classId: string): PrincipalCategory | null {
  const normalized = classId.toLowerCase();
  for (const category of CATEGORY_ORDER) {
    if (categoryClassIds[category].has(normalized)) return category;
  }
  return null;
}

export function classForCategory(
  classes: string[],
  category: PrincipalCategory
): string | undefined {
  return classes.find((classId) => categoryClassIds[category].has(classId.toLowerCase()));
}

export function classLabel(classId: string): string {
  const normalized = classId.toLowerCase();
  return `${normalized.toUpperCase()} - ${CLASS_NAMES[normalized] ?? "Class"}`;
}
