import type { NationalCompetitionRecord, VehicleSelection } from "./types";

export const NATIONAL_ARCHIVE_URL = "https://www.scca.com/pages/solo-archives";

const RECORDS: Array<
  NationalCompetitionRecord & {
    make: string;
    model: string;
    vehicleYear: string;
  }
> = [
  {
    make: "mazda",
    model: "mx-5 miata",
    vehicleYear: "2016",
    year: 2025,
    classId: "cs",
    finish: "8th and 18th",
    sourceLabel: "2025 Solo Nationals combined official class results",
    sourceUrl: "https://www.scca.com/downloads/77334-2025-combined-official-class-results-w-protest/download"
  },
  {
    make: "mazda",
    model: "mx-5 miata",
    vehicleYear: "2016",
    year: 2025,
    classId: "csp",
    finish: "3rd and 4th",
    sourceLabel: "2025 Solo Nationals combined official class results",
    sourceUrl: "https://www.scca.com/downloads/77334-2025-combined-official-class-results-w-protest/download"
  }
];

export function getNationalCompetitionHistory(
  selection: VehicleSelection
): NationalCompetitionRecord[] {
  if (selection.notListed) return [];

  return RECORDS.filter(
    (record) =>
      record.make === selection.make.toLowerCase() &&
      record.model === selection.model.toLowerCase() &&
      record.vehicleYear === selection.year
  ).map(({ make: _make, model: _model, vehicleYear: _vehicleYear, ...record }) => record);
}
