export interface VehicleGenerationDefinition {
  label: string;
  startYear: number;
  endYear: number;
  sourceUrl: string;
}

export interface VehicleHistoryVariantDefinition {
  id: string;
  label: string;
  selectionTerms: string[];
  winnerTerms: string[];
}

const SCCA_RULEBOOK = "https://www.scca.com/downloads/78494/download";
const FORD_MUSTANG_HISTORY =
  "https://media.ford.com/content/dam/fordmedia/North%20America/US/2013/12/05/Mustang_Milestones.pdf";
const FORD_MUSTANG_S650_HISTORY =
  "https://media.ford.com/content/fordmedia/feu/de/de/news/2022/09/15/der-neue-ford-mustang-setzt-neue-pony-car-massstaebe-in-puncto-d.html";
const MAZDA_MX5_HISTORY =
  "https://news.mazdausa.com/download/2016_Mazda_MX-5_Press_Kit.pdf";
const MAZDA_MX5_NB_HISTORY =
  "https://newsroom.mazda.com/en/publicity/release/2016/201604/160425a.html";
const MAZDA_MX5_ND_HISTORY =
  "https://news.mazdausa.com/vehicles-2026-mx-5";
const PORSCHE_911_HISTORY =
  "https://newsroom.porsche.com/en/press-kits/60-Years-Porsche-911/60-Jahre-911---Generationen.html";

const generation = (
  label: string,
  startYear: number,
  endYear: number,
  sourceUrl = SCCA_RULEBOOK
): VehicleGenerationDefinition => ({ label, startYear, endYear, sourceUrl });

const porsche911Generations = [
  generation("964", 1990, 1994, PORSCHE_911_HISTORY),
  generation("993", 1995, 1998, PORSCHE_911_HISTORY),
  generation("996", 1999, 2004, PORSCHE_911_HISTORY),
  generation("997", 2005, 2011, PORSCHE_911_HISTORY),
  generation("991.1", 2012, 2016, PORSCHE_911_HISTORY),
  generation("991.2", 2017, 2019, PORSCHE_911_HISTORY),
  generation("992", 2020, 2026, PORSCHE_911_HISTORY)
];

export const VEHICLE_GENERATIONS: Record<string, VehicleGenerationDefinition[]> = {
  "acura:nsx": [
    generation("first generation", 1991, 2005),
    generation("second generation", 2017, 2022)
  ],
  "audi:tt": [
    generation("Mk1 / 8N", 2000, 2006),
    generation("Mk2 / 8J", 2008, 2015),
    generation("Mk3 / 8S", 2016, 2023)
  ],
  "bmw:3series": [
    generation("E30", 1990, 1991),
    generation("E36", 1992, 1998),
    generation("E46", 1999, 2005),
    generation("E9x", 2006, 2011),
    generation("F3x", 2012, 2019),
    generation("G20/G21", 2020, 2026)
  ],
  "bmw:m2": [
    generation("F87", 2016, 2021),
    generation("G87", 2023, 2026)
  ],
  "bmw:m3": [
    generation("E30", 1990, 1991),
    generation("E36", 1995, 1999),
    generation("E46", 2001, 2006),
    generation("E9x", 2008, 2013),
    generation("F80", 2015, 2018),
    generation("G80", 2021, 2026)
  ],
  "bmw:z3": [generation("E36/7 and E36/8", 1996, 2002)],
  "chevrolet:camaro": [
    generation("third generation", 1990, 1992),
    generation("fourth generation", 1993, 2002),
    generation("fifth generation", 2010, 2015),
    generation("sixth generation", 2016, 2024)
  ],
  "chevrolet:corvette": [
    generation("C4", 1990, 1996),
    generation("C5", 1997, 2004),
    generation("C6", 2005, 2013),
    generation("C7", 2014, 2019),
    generation("C8", 2020, 2026)
  ],
  "eagle:talon": [
    generation("first generation / 1G", 1990, 1994),
    generation("second generation / 2G", 1995, 1998)
  ],
  "ford:focus": [
    generation("first-generation US Focus", 2000, 2011),
    generation("third-generation US Focus", 2012, 2018)
  ],
  "ford:mustang": [
    generation("Fox", 1990, 1993, FORD_MUSTANG_HISTORY),
    generation("SN95 / New Edge", 1994, 2004, FORD_MUSTANG_HISTORY),
    generation("S197", 2005, 2014, FORD_MUSTANG_HISTORY),
    generation("S550", 2015, 2023, FORD_MUSTANG_HISTORY),
    generation("S650", 2024, 2026, FORD_MUSTANG_S650_HISTORY)
  ],
  "honda:civic": [
    generation("fourth generation / EF", 1990, 1991),
    generation("fifth generation / EG", 1992, 1995),
    generation("sixth generation / EK", 1996, 2000),
    generation("seventh generation", 2001, 2005),
    generation("eighth generation", 2006, 2011),
    generation("ninth generation", 2012, 2015),
    generation("tenth generation", 2016, 2021),
    generation("eleventh generation", 2022, 2026)
  ],
  "honda:s2000": [
    generation("AP1", 2000, 2003),
    generation("AP2", 2004, 2009)
  ],
  "lotus:eliseexige": [generation("Federal Series 2", 2005, 2011)],
  "lotus:evora": [generation("Evora Type 122", 2010, 2021)],
  "mazda:mazda3": [
    generation("BK", 2004, 2009),
    generation("BL", 2010, 2013),
    generation("BM/BN", 2014, 2018),
    generation("BP", 2019, 2026)
  ],
  "mazda:mazda6": [
    generation("GG/GY", 2003, 2008),
    generation("GH", 2009, 2013),
    generation("GJ/GL", 2014, 2021)
  ],
  "mazda:mx5miata": [
    generation("NA 1.6L", 1990, 1993, MAZDA_MX5_HISTORY),
    generation("NA 1.8L", 1994, 1997, MAZDA_MX5_HISTORY),
    generation("NB", 1999, 2005, MAZDA_MX5_NB_HISTORY),
    generation("NC", 2006, 2015, SCCA_RULEBOOK),
    generation("ND", 2016, 2026, MAZDA_MX5_ND_HISTORY)
  ],
  "mazda:rx7": [
    generation("FC", 1990, 1992),
    generation("FD", 1993, 1995)
  ],
  "mazda:rx8": [generation("SE3P", 2004, 2011)],
  "mini:cooper": [
    generation("R50/R52/R53", 2002, 2006),
    generation("R55/R56/R57", 2007, 2013),
    generation("F55/F56/F57", 2014, 2024),
    generation("F65/F66", 2025, 2026)
  ],
  "mitsubishi:lancer": [
    generation("CT9A Evolution VIII/IX", 2003, 2007),
    generation("CZ4A Evolution X", 2008, 2015)
  ],
  "nissan:240sx": [
    generation("S13", 1990, 1994),
    generation("S14", 1995, 1998)
  ],
  "nissan:350z": [generation("Z33", 2003, 2009)],
  "nissan:z": [generation("RZ34", 2023, 2026)],
  "pontiac:solstice": [generation("Kappa", 2006, 2010)],
  "porsche:718": [
    generation("718 / 982", 2017, 2025)
  ],
  "porsche:911": porsche911Generations,
  "porsche:boxster": [
    generation("986", 1997, 2004),
    generation("987.1", 2005, 2008),
    generation("987.2", 2009, 2012),
    generation("981", 2013, 2016),
    generation("718 / 982", 2017, 2025)
  ],
  "porsche:cayman": [
    generation("987.1", 2006, 2008),
    generation("987.2", 2009, 2012),
    generation("981", 2013, 2016),
    generation("718 / 982", 2017, 2025)
  ],
  "scion:frs": [generation("ZN6 first-generation 86 platform", 2013, 2016)],
  "subaru:brz": [
    generation("ZC6 first generation", 2013, 2020),
    generation("ZD8 second generation", 2022, 2026)
  ],
  "subaru:wrx": [
    generation("GD/GG", 2002, 2007),
    generation("GR/GV", 2008, 2014),
    generation("VA", 2015, 2021),
    generation("VB", 2022, 2026)
  ],
  "tesla:model3": [
    generation("pre-2024 configuration", 2018, 2023),
    generation("2024+ SCCA range", 2024, 2026)
  ],
  "toyota:86": [generation("ZN6 first-generation 86 platform", 2017, 2021)],
  "toyota:celica": [
    generation("T180", 1990, 1993),
    generation("T200", 1994, 1999),
    generation("T230", 2000, 2005)
  ],
  "toyota:gr86": [generation("ZN8 second-generation 86 platform", 2022, 2026)],
  "toyota:mr2": [
    generation("SW20", 1991, 1995),
    generation("ZZW30 Spyder", 2000, 2005)
  ],
  "toyota:supra": [
    generation("A70", 1990, 1992),
    generation("A80", 1993, 1998),
    generation("A90/A91", 2020, 2026)
  ],
  "volkswagen:golf": [
    generation("Mk2 / A2", 1990, 1992),
    generation("Mk3 / A3", 1993, 1998),
    generation("Mk4 / A4", 1999, 2005),
    generation("Mk5 / A5", 2006, 2009),
    generation("Mk6 / A6", 2010, 2014),
    generation("Mk7 / A7", 2015, 2021),
    generation("Mk8 / A8", 2022, 2026)
  ]
};

const porsche718HistoryVariants: VehicleHistoryVariantDefinition[] = [
  {
    id: "gt4-rs",
    label: "Cayman GT4 RS",
    selectionTerms: ["GT4 RS", "GT4RS"],
    winnerTerms: ["GT4 RS", "GT4RS"]
  },
  {
    id: "gt4",
    label: "Cayman GT4",
    selectionTerms: ["Cayman GT4", "718 GT4"],
    winnerTerms: ["Cayman GT4", "Porsche GT4"]
  },
  {
    id: "cayman-gts",
    label: "Cayman GTS",
    selectionTerms: ["Cayman GTS"],
    winnerTerms: ["Cayman GTS", "718 Cayman GBridgestone"]
  },
  {
    id: "boxster-gts",
    label: "Boxster GTS",
    selectionTerms: ["Boxster GTS"],
    winnerTerms: ["Boxster GTS"]
  },
  {
    id: "spyder",
    label: "Boxster Spyder",
    selectionTerms: ["Boxster Spyder", "718 Spyder"],
    winnerTerms: ["Boxster Spyder", "718 Spyder"]
  },
  {
    id: "cayman-s",
    label: "Cayman S",
    selectionTerms: ["Cayman S"],
    winnerTerms: ["Cayman S"]
  },
  {
    id: "boxster-s",
    label: "Boxster S",
    selectionTerms: ["Boxster S"],
    winnerTerms: ["Boxster S"]
  }
];

export const VEHICLE_HISTORY_VARIANTS: Record<
  string,
  VehicleHistoryVariantDefinition[]
> = {
  "bmw:3series": [
    {
      id: "328",
      label: "328",
      selectionTerms: ["328"],
      winnerTerms: ["BMW 328"]
    },
    {
      id: "330",
      label: "330",
      selectionTerms: ["330"],
      winnerTerms: ["BMW 330"]
    }
  ],
  "audi:tt": [
    {
      id: "tt-rs",
      label: "TT RS",
      selectionTerms: ["TT RS"],
      winnerTerms: ["TT RS"]
    },
    {
      id: "tts",
      label: "TTS",
      selectionTerms: ["TTS"],
      winnerTerms: ["TTS"]
    }
  ],
  "chevrolet:camaro": [
    {
      id: "zl1",
      label: "ZL1",
      selectionTerms: ["Camaro ZL1", "ZL1"],
      winnerTerms: ["Camaro ZL1"]
    },
    {
      id: "z28",
      label: "Z/28",
      selectionTerms: ["Camaro Z28", "Z/28", "Z28"],
      winnerTerms: ["Camaro Z28", "Camaro Z/28"]
    },
    {
      id: "ss",
      label: "SS",
      selectionTerms: ["Camaro SS", "V8 non-supercharged"],
      winnerTerms: ["Camaro SS"]
    }
  ],
  "chevrolet:corvette": [
    {
      id: "z06",
      label: "Z06",
      selectionTerms: ["Corvette Z06", "C5 Z06", "C6 Z06", "C7 Z06", "C8 Z06"],
      winnerTerms: ["Corvette Z06", "Corvette Z0"]
    },
    {
      id: "grand-sport",
      label: "Grand Sport",
      selectionTerms: ["Grand Sport"],
      winnerTerms: ["Grand Sport"]
    },
    {
      id: "stingray",
      label: "Stingray",
      selectionTerms: ["Stingray"],
      winnerTerms: ["Stingray"]
    }
  ],
  "eagle:talon": [
    {
      id: "tsi-awd",
      label: "TSi AWD",
      selectionTerms: ["Talon TSi AWD", "Talon Turbo AWD"],
      winnerTerms: ["Talon TSi AWD"]
    }
  ],
  "ford:focus": [
    {
      id: "rs",
      label: "RS",
      selectionTerms: ["Focus RS"],
      winnerTerms: ["Focus RS"]
    },
    {
      id: "st",
      label: "ST",
      selectionTerms: ["Focus ST"],
      winnerTerms: ["Focus ST"]
    }
  ],
  "ford:mustang": [
    {
      id: "dark-horse",
      label: "Dark Horse",
      selectionTerms: ["Dark Horse"],
      winnerTerms: ["Dark Horse", "Dark Ho"]
    },
    {
      id: "mach-1",
      label: "Mach 1",
      selectionTerms: ["Mach 1"],
      winnerTerms: ["Mach 1"]
    },
    {
      id: "svo",
      label: "SVO",
      selectionTerms: ["Mustang SVO", "SVO"],
      winnerTerms: ["Mustang SVO"]
    },
    {
      id: "shelby",
      label: "Shelby",
      selectionTerms: ["Shelby", "GT350", "GT500"],
      winnerTerms: ["Shelby", "GT350", "GT500"]
    },
    {
      id: "gt",
      label: "GT",
      selectionTerms: ["Mustang GT", "V8, NOC"],
      winnerTerms: ["Mustang GT"]
    },
    {
      id: "ecoboost",
      label: "EcoBoost",
      selectionTerms: ["EcoBoost"],
      winnerTerms: ["EcoBoost"]
    }
  ],
  "honda:civic": [
    {
      id: "type-r",
      label: "Type R",
      selectionTerms: ["Type R", "Type-R"],
      winnerTerms: ["Type R", "Type-R", "Type LL"]
    },
    {
      id: "crx",
      label: "CRX",
      selectionTerms: ["Civic CRX", "CRX"],
      winnerTerms: ["CRX"]
    },
    {
      id: "si",
      label: "Si",
      selectionTerms: ["Civic Si", "Civic SI"],
      winnerTerms: ["Civic Si", "Civic SI"]
    },
    {
      id: "sport",
      label: "Sport",
      selectionTerms: ["Civic Sport"],
      winnerTerms: ["Civic Sport", "Civic S"]
    }
  ],
  "honda:s2000": [
    {
      id: "cr",
      label: "CR",
      selectionTerms: ["S2000 CR"],
      winnerTerms: ["S2000 CR"]
    },
    {
      id: "non-cr",
      label: "non-CR",
      selectionTerms: ["non-CR"],
      winnerTerms: ["S2000 non-CR"]
    }
  ],
  "lotus:eliseexige": [
    {
      id: "exige",
      label: "Exige",
      selectionTerms: ["Exige"],
      winnerTerms: ["Exige"]
    },
    {
      id: "elise",
      label: "Elise",
      selectionTerms: ["Elise"],
      winnerTerms: ["Elise"]
    }
  ],
  "lotus:evora": [
    {
      id: "gt",
      label: "GT",
      selectionTerms: ["Evora GT"],
      winnerTerms: ["Evora GT"]
    },
    {
      id: "s",
      label: "S",
      selectionTerms: ["Evora S"],
      winnerTerms: ["Evora S"]
    }
  ],
  "mazda:mazda6": [
    {
      id: "mazdaspeed6",
      label: "Mazdaspeed6",
      selectionTerms: ["Mazdaspeed6", "Speed6"],
      winnerTerms: ["Mazdaspeed6", "Speed6"]
    }
  ],
  "mini:cooper": [
    {
      id: "jcw",
      label: "John Cooper Works",
      selectionTerms: ["John Cooper Works", "JCW"],
      winnerTerms: ["John Cooper Works", "JCW"]
    },
    {
      id: "s",
      label: "Cooper S",
      selectionTerms: ["Cooper S", "Hardtop S", "Clubman S"],
      winnerTerms: ["Cooper S"]
    }
  ],
  "mitsubishi:lancer": [
    {
      id: "evolution",
      label: "Lancer Evolution",
      selectionTerms: ["Lancer Evolution", "Evolution", "Evo"],
      winnerTerms: ["Lancer Evolution", "Evolution", "Evo"]
    }
  ],
  "nissan:350z": [
    {
      id: "nismo",
      label: "NISMO",
      selectionTerms: ["NISMO"],
      winnerTerms: ["NISMO"]
    }
  ],
  "nissan:z": [
    {
      id: "nismo",
      label: "NISMO",
      selectionTerms: ["NISMO"],
      winnerTerms: ["NISMO"]
    },
    {
      id: "performance",
      label: "Performance",
      selectionTerms: ["Z Performance", "Performance"],
      winnerTerms: ["Z Performance"]
    }
  ],
  "pontiac:solstice": [
    {
      id: "gxp",
      label: "GXP",
      selectionTerms: ["Solstice GXP", "GXP"],
      winnerTerms: ["Solstice GXP"]
    }
  ],
  "porsche:718": porsche718HistoryVariants,
  "porsche:911": [
    {
      id: "gt3-rs",
      label: "GT3 RS",
      selectionTerms: ["GT3 RS", "GT3RS"],
      winnerTerms: ["GT3 RS", "GT3RS"]
    },
    {
      id: "gt3",
      label: "GT3",
      selectionTerms: ["GT3"],
      winnerTerms: ["GT3"]
    },
    {
      id: "turbo",
      label: "Turbo",
      selectionTerms: ["911 Turbo", "Turbo 911", "Turbo"],
      winnerTerms: ["Porsche Turbo", "911 Turbo"]
    }
  ],
  "porsche:boxster": [
    {
      id: "gts",
      label: "GTS",
      selectionTerms: ["Boxster GTS"],
      winnerTerms: ["Boxster GTS"]
    },
    {
      id: "spyder",
      label: "Spyder",
      selectionTerms: ["Boxster Spyder", "718 Spyder"],
      winnerTerms: ["Boxster Spyder", "718 Spyder"]
    },
    {
      id: "s",
      label: "S",
      selectionTerms: ["Boxster S"],
      winnerTerms: ["Boxster S"]
    }
  ],
  "porsche:cayman": porsche718HistoryVariants,
  "subaru:brz": [
    {
      id: "ts",
      label: "tS",
      selectionTerms: ["BRZ tS", "including tS"],
      winnerTerms: ["BRZ tS"]
    }
  ],
  "subaru:wrx": [
    {
      id: "sti",
      label: "STI",
      selectionTerms: ["STI", "STi"],
      winnerTerms: ["STI", "STi", "Sti"]
    },
    {
      id: "wrx",
      label: "WRX",
      selectionTerms: ["WRX"],
      winnerTerms: ["WRX"]
    }
  ],
  "tesla:model3": [
    {
      id: "awd-performance",
      label: "AWD / Performance",
      selectionTerms: ["AWD", "Performance"],
      winnerTerms: ["Model 3 AWD", "Model 3 Performance"]
    },
    {
      id: "rwd",
      label: "RWD",
      selectionTerms: ["RWD"],
      winnerTerms: ["Model 3 RWD"]
    }
  ],
  "toyota:celica": [
    {
      id: "gts",
      label: "GT-S",
      selectionTerms: ["Celica GTS", "Celica GT-S"],
      winnerTerms: ["Celica GTS", "Celica GT-S"]
    },
    {
      id: "gt",
      label: "GT",
      selectionTerms: ["Celica GT"],
      winnerTerms: ["Celica GT"]
    }
  ],
  "toyota:mr2": [
    {
      id: "spyder",
      label: "Spyder",
      selectionTerms: ["MR2 Spyder"],
      winnerTerms: ["MR2 Spyder"]
    },
    {
      id: "supercharged",
      label: "Supercharged",
      selectionTerms: ["MR2 Supercharged"],
      winnerTerms: ["MR2 Supercharged"]
    },
    {
      id: "turbo",
      label: "Turbo",
      selectionTerms: ["MR2 Turbo"],
      winnerTerms: ["MR2 Turbo"]
    },
    {
      id: "non-turbo",
      label: "non-turbo",
      selectionTerms: ["MR2 (non-turbo)", "MR2 non-turbo"],
      winnerTerms: ["MR2 non-turbo"]
    }
  ],
  "toyota:supra": [
    {
      id: "six-cylinder",
      label: "six-cylinder",
      selectionTerms: ["6 cyl", "6cyl", "3.0"],
      winnerTerms: ["Supra 3.0", "Supra MT"]
    },
    {
      id: "four-cylinder",
      label: "four-cylinder",
      selectionTerms: ["4 cyl", "4cyl", "2.0"],
      winnerTerms: ["Supra 2.0"]
    }
  ],
  "volkswagen:golf": [
    {
      id: "golf-r",
      label: "Golf R",
      selectionTerms: ["Golf R"],
      winnerTerms: ["Golf R"]
    },
    {
      id: "gti",
      label: "GTI",
      selectionTerms: ["Golf GTI", "GTI"],
      winnerTerms: ["Golf GTI", "Volkswagen GTI", "Volkswagen Gti"]
    }
  ]
};
