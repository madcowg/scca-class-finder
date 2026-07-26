export interface VehicleGenerationDefinition {
  label: string;
  startYear: number;
  endYear: number;
  sourceUrl: string;
}

export const VEHICLE_GENERATIONS: Record<string, VehicleGenerationDefinition[]> = {
  "mazda:mx5miata": [
    {
      label: "NA 1.6L",
      startYear: 1990,
      endYear: 1993,
      sourceUrl: "https://news.mazdausa.com/download/2016_Mazda_MX-5_Press_Kit.pdf"
    },
    {
      label: "NA 1.8L",
      startYear: 1994,
      endYear: 1997,
      sourceUrl: "https://news.mazdausa.com/download/2016_Mazda_MX-5_Press_Kit.pdf"
    },
    {
      label: "NB",
      startYear: 1999,
      endYear: 2005,
      sourceUrl: "https://newsroom.mazda.com/en/publicity/release/2016/201604/160425a.html"
    },
    {
      label: "NC",
      startYear: 2006,
      endYear: 2015,
      sourceUrl: "https://news.mazdausa.com/vehicles-2016-mx-5"
    },
    {
      label: "ND",
      startYear: 2016,
      endYear: 2026,
      sourceUrl: "https://news.mazdausa.com/vehicles-2026-mx-5"
    }
  ]
};
