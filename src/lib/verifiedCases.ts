import type { VehicleSelection } from "./types";

export interface VerifiedVehicleCase {
  label: string;
  selection: VehicleSelection;
  expectedClass: string;
  sourceUrl: string;
  ruleReference: string;
}

/**
 * These are deliberately stock, exact 2026 Appendix A cases. They exercise
 * different makes and classes without asking the classifier to infer a trim
 * or copy a placement from another model year.
 */
export const CURRENT_APPENDIX_A_STOCK_CASES: VerifiedVehicleCase[] = [
  {
    label: "2026 Acura Integra Type S",
    selection: { make: "Acura", model: "Integra", variant: "Type S", year: "2026" },
    expectedClass: "as",
    sourceUrl: "https://www.scca.com/downloads/78494/download",
    ruleReference: "Appendix A, A Street"
  },
  {
    label: "2026 BMW M240i",
    selection: { make: "BMW", model: "M240i", year: "2026" },
    expectedClass: "es",
    sourceUrl: "https://www.scca.com/downloads/78494/download",
    ruleReference: "Appendix A, E Street"
  },
  {
    label: "2026 Chevrolet Corvette Stingray",
    selection: { make: "Chevrolet", model: "Corvette", variant: "Stingray (C8)", year: "2026" },
    expectedClass: "ss",
    sourceUrl: "https://www.scca.com/downloads/78494/download",
    ruleReference: "Appendix A, Super Street"
  },
  {
    label: "2026 Ford Mustang EcoBoost",
    selection: { make: "Ford", model: "Mustang", variant: "EcoBoost", year: "2026" },
    expectedClass: "ds",
    sourceUrl: "https://www.scca.com/downloads/78494/download",
    ruleReference: "Appendix A, D Street"
  },
  {
    label: "2026 Honda Civic Type R",
    selection: { make: "Honda", model: "Civic", variant: "Type R", year: "2026" },
    expectedClass: "as",
    sourceUrl: "https://www.scca.com/downloads/78494/download",
    ruleReference: "Appendix A, A Street"
  },
  {
    label: "2026 Hyundai Ioniq 5 N",
    selection: { make: "Hyundai", model: "Ioniq 5", variant: "N", year: "2026" },
    expectedClass: "ss",
    sourceUrl: "https://www.scca.com/downloads/78494/download",
    ruleReference: "Appendix A, Super Street"
  },
  {
    label: "2026 Nissan Z",
    selection: { make: "Nissan", model: "Z", variant: "Including NISMO", year: "2026" },
    expectedClass: "bs",
    sourceUrl: "https://www.scca.com/downloads/78494/download",
    ruleReference: "Appendix A, B Street"
  },
  {
    label: "2026 Subaru BRZ",
    selection: { make: "Subaru", model: "BRZ", variant: "Including tS", year: "2026" },
    expectedClass: "ds",
    sourceUrl: "https://www.scca.com/downloads/78494/download",
    ruleReference: "Appendix A, D Street"
  },
  {
    label: "2026 Toyota GR Corolla",
    selection: {
      make: "Toyota",
      model: "GR Corolla",
      variant: "Standard (not MORIZO; no Performance Shocks and Springs Package)",
      year: "2026"
    },
    expectedClass: "bs",
    sourceUrl: "https://www.scca.com/downloads/78494/download",
    ruleReference: "Appendix A, B Street"
  },
  {
    label: "2026 Volkswagen Golf R",
    selection: { make: "Volkswagen", model: "Golf", variant: "R", year: "2026" },
    expectedClass: "ds",
    sourceUrl: "https://www.scca.com/downloads/78494/download",
    ruleReference: "Appendix A, D Street"
  }
];
