export interface StreetOverlay {
  make: string;
  model: string;
  year: string;
  classes: string[];
  sourceNote: string;
  aliases?: string[];
}

const streetOnlyNote =
  "Current Appendix A Street placement verified from the official 2026 Solo Rules; later 2026 Solo Fastrack issues were reviewed and no higher-category mapping is inferred.";

const partialMappingNote =
  "Current official source review verified only the listed exact Appendix A or Appendix B classes for this entry; additional category mappings were not inferred from older or third-party data.";

export const STREET_OVERLAYS_2026: StreetOverlay[] = [
  { make: "Acura", model: "Integra (Base)", year: "2026", classes: ["hs"], sourceNote: streetOnlyNote },
  { make: "Acura", model: "Integra (A-Spec)", year: "2026", classes: ["gs"], sourceNote: streetOnlyNote },
  {
    make: "Acura",
    model: "Integra Type S",
    year: "2026",
    classes: ["as"],
    sourceNote: streetOnlyNote,
    aliases: ["Integra Type S (DE5)", "DE5"]
  },
  {
    make: "BMW",
    model: "M240i (incl. xDrive)",
    year: "2026",
    classes: ["es"],
    sourceNote: streetOnlyNote
  },
  {
    make: "Chevrolet",
    model: "Corvette Stingray (C8)",
    year: "2026",
    classes: ["ss"],
    sourceNote: streetOnlyNote
  },
  {
    make: "Honda",
    model: "Civic (non-Si, non-type R)",
    year: "2026",
    classes: ["hs"],
    sourceNote: streetOnlyNote
  },
  { make: "Honda", model: "Civic Si", year: "2026", classes: ["gs"], sourceNote: streetOnlyNote },
  {
    make: "Honda",
    model: "Civic Type-R",
    year: "2026",
    classes: ["as"],
    sourceNote: streetOnlyNote,
    aliases: ["Civic Type R", "FL5"]
  },
  {
    make: "Hyundai",
    model: "Elantra N (non-TCR)",
    year: "2026",
    classes: ["gs"],
    sourceNote: streetOnlyNote
  },
  {
    make: "Mazda",
    model: "Mazda3 (non-turbo)",
    year: "2026",
    classes: ["hs"],
    sourceNote: streetOnlyNote
  },
  {
    make: "Mazda",
    model: "Mazda Mazda3 Turbo",
    year: "2026",
    classes: ["gs"],
    sourceNote: streetOnlyNote,
    aliases: ["Mazda3 Turbo"]
  },
  {
    make: "Nissan",
    model: "Z (incl. NISMO)",
    year: "2026",
    classes: ["bs"],
    sourceNote: streetOnlyNote,
    aliases: ["Z (RZ34, incl. NISMO)", "RZ34"]
  },
  {
    make: "Subaru",
    model: "BRZ (including tS)",
    year: "2026",
    classes: ["ds"],
    sourceNote: streetOnlyNote,
    aliases: ["BRZ"]
  },
  {
    make: "Toyota",
    model: "GR Corolla (excl. MORIZO Edition excl. Performance Shocks and Springs Package)",
    year: "2026",
    classes: ["bs"],
    sourceNote: streetOnlyNote,
    aliases: ["GR Corolla"]
  },
  {
    make: "Toyota",
    model: "GR Corolla (with Performance Shocks and Springs Package)",
    year: "2026",
    classes: ["as"],
    sourceNote: streetOnlyNote,
    aliases: ["GR Corolla Performance Package"]
  },
  {
    make: "Toyota",
    model: "GR86 (without TRD equipment, excl. 10th Anniv. Edition)",
    year: "2026",
    classes: ["ds"],
    sourceNote: streetOnlyNote
  },
  {
    make: "Volkswagen",
    model: "Golf GTI (incl. 380 Edition)",
    year: "2026",
    classes: ["gs"],
    sourceNote: streetOnlyNote,
    aliases: ["Golf GTI (Mk8, incl. 380)", "Mk8 GTI"]
  },
  {
    make: "Volkswagen",
    model: "Golf R",
    year: "2026",
    classes: ["ds"],
    sourceNote: streetOnlyNote,
    aliases: ["Golf R (Mk8)", "Mk8 Golf R"]
  }
];

export interface CurrentMappingOverride extends StreetOverlay {
  coverage: "full-mapping" | "verified-classes";
}

export const CURRENT_MAPPING_OVERRIDES: CurrentMappingOverride[] = [
  ...["2010", "2011", "2012", "2013", "2014", "2015"].map((year) => ({
    make: "Chevrolet",
    model: "Camaro (V6)",
    year,
    classes: ["ds"],
    coverage: "verified-classes" as const,
    sourceNote: partialMappingNote
  })),
  ...["2004", "2005", "2006", "2007", "2008"].map((year) => ({
    make: "Nissan",
    model: "350Z NISMO",
    year,
    classes: ["cs"],
    coverage: "verified-classes" as const,
    sourceNote: partialMappingNote
  })),
  ...["2005", "2006", "2007", "2008"].map((year) => ({
    make: "Porsche",
    model: "Boxster (987.1 base)",
    year,
    classes: ["cs", "bst"],
    coverage: "verified-classes" as const,
    sourceNote: partialMappingNote,
    aliases: ["Boxster (non-S)"]
  })),
  ...["2023", "2024", "2025", "2026"].map((year) => ({
    make: "Chevrolet",
    model: "C8 Z06 (including Z07 package)",
    year,
    classes: ["ss"],
    coverage: "verified-classes" as const,
    sourceNote: partialMappingNote,
    aliases: ["Corvette Z06 (C8)", "C8 Z06"]
  })),
  ...["2025"].map((year) => ({
    make: "Hyundai",
    model: "IONIQ 5 N",
    year,
    classes: ["ss", "evx"],
    coverage: "verified-classes" as const,
    sourceNote: partialMappingNote
  })),
  ...["2026"].map((year) => ({
    make: "Hyundai",
    model: "Ioniq 5 N",
    year,
    classes: ["ss"],
    coverage: "verified-classes" as const,
    sourceNote: partialMappingNote,
    aliases: ["IONIQ 5 N"]
  }))
];
