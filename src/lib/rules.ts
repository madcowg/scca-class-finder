import type { BuildProfile, PrincipalCategory, RuleGroup } from "./types";
import { CATEGORY_ORDER } from "./classMetadata";

const ALL = [...CATEGORY_ORDER];
const ST_PLUS: PrincipalCategory[] = [
  "streetTouring",
  "streetPrepared",
  "streetModified",
  "prepared",
  "modified"
];
const SP_PLUS: PrincipalCategory[] = [
  "streetPrepared",
  "streetModified",
  "prepared",
  "modified"
];
const SM_PLUS: PrincipalCategory[] = ["streetModified", "prepared", "modified"];
const P_PLUS: PrincipalCategory[] = ["prepared", "modified"];
const M_ONLY: PrincipalCategory[] = ["modified"];

export const RULE_GROUPS: RuleGroup[] = [
  {
    field: "tires",
    title: "Tires",
    help: "Choose the most aggressive tire installed for competition.",
    options: [
      {
        value: "street200",
        label: "200+ UTQG street tire",
        description: "DOT passenger-car tire meeting the Street-category 200 UTQG floor.",
        allowedCategories: ALL,
        section: "13.3"
      },
      {
        value: "dotBelow200",
        label: "DOT tire below 200 UTQG / R-comp",
        description: "Not Street or Street Touring legal; evaluate in Street Prepared or a higher category.",
        allowedCategories: SP_PLUS,
        section: "13.3 / 14.3 / 15.3"
      },
      {
        value: "slick",
        label: "Non-DOT slick",
        description: "Requires Prepared or Modified tire allowances.",
        allowedCategories: P_PLUS,
        section: "17 / 18"
      },
      {
        value: "unknown",
        label: "Unknown / not represented",
        description: "The tire cannot be evaluated safely without its exact model and specification.",
        allowedCategories: [],
        section: "Manual review",
        manualReview: true
      }
    ]
  },
  {
    field: "wheels",
    title: "Wheels",
    help: "Use the option describing diameter, width, and offset together.",
    options: [
      {
        value: "streetLegal",
        label: "OEM width; diameter within +/-1 in; Street-legal offset",
        description: "Fits the Street wheel envelope.",
        allowedCategories: ALL,
        section: "13.4"
      },
      {
        value: "streetTouringLegal",
        label: "Wider wheel within Street Touring limits",
        description: "Outside Street, but intended to remain within the applicable Street Touring width limits.",
        allowedCategories: ST_PLUS,
        section: "14.4"
      },
      {
        value: "unrestricted",
        label: "Beyond Street Touring wheel limits",
        description: "Requires Street Prepared or a higher category.",
        allowedCategories: SP_PLUS,
        section: "15.4"
      },
      {
        value: "unknown",
        label: "Unknown dimensions or offset",
        description: "Exact diameter, width, and offset are required.",
        allowedCategories: [],
        section: "Manual review",
        manualReview: true
      }
    ]
  },
  {
    field: "shocks",
    title: "Shocks / struts",
    help: "Mounting points and spring-perch changes matter more than brand.",
    options: [
      {
        value: "streetLegal",
        label: "Replacement shocks using standard mounting points",
        description: "Replacement dampers within the Street allowance and without geometry changes.",
        allowedCategories: ALL,
        section: "13.5"
      },
      {
        value: "stMountingBrackets",
        label: "Alternate brackets / perches without moving attachment points",
        description: "Street Touring allows alternate shock brackets and upper perches so long as attachment points and geometry stay within the rule.",
        allowedCategories: ST_PLUS,
        section: "14.5.B"
      },
      {
        value: "changedMounts",
        label: "Moved attachment points or geometry-changing shock/strut change",
        description: "Once attachment points or geometry are in question, this simplified model stops and requires exact rule-text review.",
        allowedCategories: [],
        section: "14.5.B / 15.5.C / 16.1.E",
        manualReview: true
      },
      {
        value: "unknown",
        label: "Unknown shock configuration",
        description: "Mounts, adjustments, and spring-perch configuration must be checked.",
        allowedCategories: [],
        section: "Manual review",
        manualReview: true
      }
    ]
  },
  {
    field: "springs",
    title: "Springs / ride height",
    help: "Street Touring spring legality depends on keeping the original spring type and attachment points.",
    options: [
      {
        value: "stock",
        label: "Standard springs and ride-height hardware",
        description: "No spring or ride-height modification beyond standard configuration.",
        allowedCategories: ALL,
        section: "13.8"
      },
      {
        value: "lowering",
        label: "Alternate springs using the original spring type and attachment points",
        description: "A spring change can fit Street Touring when it keeps the original spring type and original spring attachment points.",
        allowedCategories: ST_PLUS,
        section: "14.8.A"
      },
      {
        value: "coilovers",
        label: "Coilovers / adjustable perches using original spring type and attachment points",
        description: "Modeled as Street Touring-legal only when the setup keeps the original spring type and original spring attachment points.",
        allowedCategories: ST_PLUS,
        section: "14.8.A"
      },
      {
        value: "changedAttachmentPoints",
        label: "Spring-type change or moved spring attachment points",
        description: "Divorced-to-coilover conversions and similar spring-location changes need exact architecture review before classing.",
        allowedCategories: [],
        section: "14.8.A / Jan. 2026 Solo Fastrack #39118 / 15.8.A",
        manualReview: true
      },
      {
        value: "unknown",
        label: "Unknown spring configuration",
        description: "The spring and perch arrangement needs manual review.",
        allowedCategories: [],
        section: "Manual review",
        manualReview: true
      }
    ]
  },
  {
    field: "swayBars",
    title: "Anti-roll bars",
    help: "Street permits changing one end, not both ends.",
    options: [
      {
        value: "stock",
        label: "Both standard",
        description: "No anti-roll bar change.",
        allowedCategories: ALL,
        section: "13.7"
      },
      {
        value: "oneChanged",
        label: "One bar changed (front or rear)",
        description: "Fits the Street anti-roll bar allowance if all attachment details comply.",
        allowedCategories: ALL,
        section: "13.7"
      },
      {
        value: "bothChanged",
        label: "Both front and rear changed",
        description: "Not Street legal; Street Touring and higher categories may permit both.",
        allowedCategories: ST_PLUS,
        section: "14.7"
      },
      {
        value: "customGeometry",
        label: "Custom mounts / altered pickup geometry",
        description: "Requires Street Prepared or a higher category and may still need detailed review.",
        allowedCategories: SP_PLUS,
        section: "15.7"
      }
    ]
  },
  {
    field: "alignment",
    title: "Alignment hardware / control arms",
    help: "Distinguish allowed adjustment hardware from relocated suspension points.",
    options: [
      {
        value: "standard",
        label: "Standard hardware and adjustment range",
        description: "No non-standard alignment or suspension-locating components.",
        allowedCategories: ALL,
        section: "13.8"
      },
      {
        value: "streetTouringHardware",
        label: "Camber bolts, plates, or category-legal adjustment hardware",
        description: "Requires Street Touring or a higher category and must stay within detailed component limits.",
        allowedCategories: ST_PLUS,
        section: "14.8.B / 14.8.C / 14.8.F / 14.8.H"
      },
      {
        value: "changedArms",
        label: "Changed control arms / bushings beyond ST allowance",
        description: "Requires Street Prepared or a higher category.",
        allowedCategories: SP_PLUS,
        section: "15.8.C / 15.8.F-H / 15.8.N"
      },
      {
        value: "relocatedPoints",
        label: "Relocated pickup points / major geometry changes",
        description: "Relocated pickup points or broader geometry changes can no longer be modeled safely from this simplified input set.",
        allowedCategories: [],
        section: "15.8 / 16.1.E / 17.8 / 18",
        manualReview: true
      }
    ]
  },
  {
    field: "intake",
    title: "Intake",
    help: "Choose based on how far upstream/downstream the system was changed.",
    options: [
      {
        value: "standardOrFilter",
        label: "Standard intake or replacement filter element",
        description: "Within the conservative Street intake profile.",
        allowedCategories: ALL,
        section: "13.10"
      },
      {
        value: "toThrottleBody",
        label: "Cold-air intake to throttle body / turbo inlet",
        description: "Typical Street Touring intake scope; exact sensors and emissions equipment still matter.",
        allowedCategories: ST_PLUS,
        section: "14.10"
      },
      {
        value: "customBeyond",
        label: "Custom manifold / throttle-body or induction changes beyond ST",
        description: "Requires Street Prepared or a higher category.",
        allowedCategories: SP_PLUS,
        section: "15.10"
      },
      {
        value: "unknown",
        label: "Unknown intake configuration",
        description: "The exact component boundary must be identified.",
        allowedCategories: [],
        section: "Manual review",
        manualReview: true
      }
    ]
  },
  {
    field: "exhaust",
    title: "Exhaust / emissions",
    help: "Catalyst location and emissions-equipment removal are decisive.",
    options: [
      {
        value: "standardOrCatBack",
        label: "Standard or cat-back / axle-back",
        description: "Fits the conservative Street exhaust profile when catalysts remain compliant.",
        allowedCategories: ALL,
        section: "13.10.C"
      },
      {
        value: "headersHighFlowCat",
        label: "Headers and category-legal high-flow catalyst",
        description: "Requires Street Touring or a higher category and detailed catalyst-location review.",
        allowedCategories: ST_PLUS,
        section: "14.10.D / 14.10.E"
      },
      {
        value: "emissionsRemoved",
        label: "Catalyst or emissions equipment removed / relocated beyond ST",
        description: "Requires Street Prepared or a higher category, subject to local law and category wording.",
        allowedCategories: SP_PLUS,
        section: "15.10.F / 15.10.I"
      },
      {
        value: "unknown",
        label: "Unknown exhaust configuration",
        description: "Catalyst and emissions details are required.",
        allowedCategories: [],
        section: "Manual review",
        manualReview: true
      }
    ]
  },
  {
    field: "ecu",
    title: "ECU / engine management",
    help: "A reflash and a standalone ECU do not have the same allowance.",
    options: [
      {
        value: "standard",
        label: "Standard calibration and controller",
        description: "No engine-management modification.",
        allowedCategories: ALL,
        section: "13.9.D / 13.9.H"
      },
      {
        value: "reflash",
        label: "ECU reflash within Street Touring constraints",
        description: "Requires Street Touring or higher; the tune must still comply with the exact category restrictions.",
        allowedCategories: ST_PLUS,
        section: "14.10.F.1.a"
      },
      {
        value: "standalone",
        label: "Standalone / piggyback beyond ST constraints",
        description: "Requires Street Prepared or a higher category.",
        allowedCategories: SP_PLUS,
        section: "15.1.D / 15.10"
      },
      {
        value: "unknown",
        label: "Unknown calibration or controller",
        description: "Exact ECU hardware and functions need manual review.",
        allowedCategories: [],
        section: "Manual review",
        manualReview: true
      }
    ]
  },
  {
    field: "engine",
    title: "Engine / forced induction",
    help: "Internal work, added boost, and swaps move the car far more than bolt-on intake/exhaust parts.",
    options: [
      {
        value: "standard",
        label: "Standard long block and standard forced induction",
        description: "No internal engine, boost-system, or engine-swap change.",
        allowedCategories: ALL,
        section: "13.10"
      },
      {
        value: "boostOrInternal",
        label: "Street Prepared-scope internal engine or boost-control changes",
        description: "Modeled for Street Prepared or higher when the build stays within SP limits for forced-induction hardware, engine position, and configuration.",
        allowedCategories: SP_PLUS,
        section: "15.10.C / 15.10.R-Z"
      },
      {
        value: "swapOrAddedInduction",
        label: "Engine swap or added/swapped forced induction",
        description: "Requires Street Modified, Prepared, or Modified and must satisfy category-specific weight and drivetrain rules.",
        allowedCategories: SM_PLUS,
        section: "16.1.D"
      },
      {
        value: "extreme",
        label: "Purpose-built engine / construction beyond production-based limits",
        description: "Requires Modified or a detailed Prepared/Modified determination.",
        allowedCategories: M_ONLY,
        section: "18",
        manualReview: true
      }
    ]
  },
  {
    field: "differential",
    title: "Differential / transmission",
    help: "Use the highest-impact drivetrain change present.",
    options: [
      {
        value: "standard",
        label: "Standard differential, gearbox, and ratios",
        description: "No drivetrain change outside standard configuration.",
        allowedCategories: ALL,
        section: "13.1"
      },
      {
        value: "streetTouringLsd",
        label: "Limited-slip differential change within ST rules",
        description: "Requires Street Touring or higher and is subject to drivetrain layout restrictions.",
        allowedCategories: ST_PLUS,
        section: "14.10.G / 14.10.H",
        manualReview: true
      },
      {
        value: "gearOrDrivetrainChange",
        label: "Gear ratio, transmission, or major drivetrain change",
        description: "Requires Street Prepared or higher; an actual swap may require Street Modified.",
        allowedCategories: SP_PLUS,
        section: "15.10.O-Q / 16.1.D"
      },
      {
        value: "swap",
        label: "Transmission or driven-wheel layout swap",
        description: "Conservatively treated as Street Modified or higher and may require manual review.",
        allowedCategories: SM_PLUS,
        section: "16",
        manualReview: true
      }
    ]
  },
  {
    field: "brakes",
    title: "Brakes",
    help: "Pads and fluid are different from caliper, rotor, and mounting changes.",
    options: [
      {
        value: "streetLegal",
        label: "Standard hardware; pads, lines, and fluid only",
        description: "Within the conservative Street brake profile.",
        allowedCategories: ALL,
        section: "13.6"
      },
      {
        value: "streetTouringKit",
        label: "Brake changes within Street Touring allowances",
        description: "Requires Street Touring or higher and exact dimensional/component review.",
        allowedCategories: ST_PLUS,
        section: "14.6"
      },
      {
        value: "custom",
        label: "Custom brake system or mounting changes beyond ST",
        description: "Requires Street Prepared or higher.",
        allowedCategories: SP_PLUS,
        section: "15.6"
      },
      {
        value: "unknown",
        label: "Unknown brake configuration",
        description: "Caliper, rotor, bracket, and ABS details need review.",
        allowedCategories: [],
        section: "Manual review",
        manualReview: true
      }
    ]
  },
  {
    field: "aero",
    title: "Aerodynamics",
    help: "Street appearance changes cannot create meaningful aerodynamic performance.",
    options: [
      {
        value: "standard",
        label: "Standard aero / appearance-only changes",
        description: "No performance aero outside standard configuration.",
        allowedCategories: ALL,
        section: "13.2"
      },
      {
        value: "smallSpSpoiler",
        label: "Small spoiler or splitter within Street Prepared limits",
        description: "Requires Street Prepared or higher and exact size/location review.",
        allowedCategories: SP_PLUS,
        section: "15.2.I"
      },
      {
        value: "wingSplitter",
        label: "Wing, large splitter, diffuser, or broad aero package",
        description: "Requires Street Modified or higher, subject to dimensional rules.",
        allowedCategories: SM_PLUS,
        section: "16.1.K / 16.1.L"
      },
      {
        value: "activeOrExtreme",
        label: "Active / extreme aero or body-integrated downforce system",
        description: "Requires detailed Modified-category review.",
        allowedCategories: M_ONLY,
        section: "18",
        manualReview: true
      }
    ]
  },
  {
    field: "safety",
    title: "Safety equipment",
    help: "Roll bars, harnesses, and seat installations often need exact fitment review.",
    options: [
      {
        value: "streetLegal",
        label: "Standard restraints or clearly rule-compliant safety additions",
        description: "No non-standard safety installation that would need a seat/interior/airbag legality review in this tool.",
        allowedCategories: ALL,
        section: "3.3 / 13.2.F / 13.2.G / 15.2.J"
      },
      {
        value: "reviewRequired",
        label: "Seat, harness, roll bar, or cage install needs exact review",
        description: "Safety hardware is not ignored, but this app requires exact installation details before relying on an automatic answer.",
        allowedCategories: [],
        section: "3.3 / 13.2.F / 13.2.G / 15.2.J / 16.1",
        manualReview: true
      }
    ]
  },
  {
    field: "interior",
    title: "Interior / weight reduction",
    help: "Choose the most extensive removal performed.",
    options: [
      {
        value: "full",
        label: "Full required interior retained",
        description: "No broad interior removal or deliberate weight reduction.",
        allowedCategories: ALL,
        section: "13.2"
      },
      {
        value: "rearSeatRemoved",
        label: "Rear seat removed beyond a safety-device clearance allowance",
        description: "Conservatively treated as Street Modified or higher.",
        allowedCategories: SM_PLUS,
        section: "16.1"
      },
      {
        value: "gutted",
        label: "Gutted / extensive interior and weight removal",
        description: "Requires Prepared or Modified and exact category construction review.",
        allowedCategories: P_PLUS,
        section: "17 / 18"
      },
      {
        value: "unknown",
        label: "Unknown interior removals",
        description: "List every removed component before relying on a class result.",
        allowedCategories: [],
        section: "Manual review",
        manualReview: true
      }
    ]
  },
  {
    field: "body",
    title: "Body / chassis",
    help: "Flares and panel changes differ from structural or pickup-point fabrication.",
    options: [
      {
        value: "standard",
        label: "Standard body and chassis; appearance-only accessories",
        description: "No performance bodywork or structural alteration.",
        allowedCategories: ALL,
        section: "13.2"
      },
      {
        value: "flaresPanels",
        label: "Flares or body panels within Street Prepared allowances",
        description: "Requires Street Prepared or higher and exact material/dimensional review.",
        allowedCategories: SP_PLUS,
        section: "15.2"
      },
      {
        value: "majorFabrication",
        label: "Major structural fabrication or broad panel replacement",
        description: "Likely Prepared or Modified; exact construction must be reviewed manually.",
        allowedCategories: P_PLUS,
        section: "17.2 / 18",
        manualReview: true
      },
      {
        value: "tubeFrame",
        label: "Tube-frame / silhouette / special construction",
        description: "Requires Modified-category determination.",
        allowedCategories: M_ONLY,
        section: "18.4",
        manualReview: true
      }
    ]
  },
  {
    field: "other",
    title: "Other modifications",
    help: "Use this catch-all so an unrepresented performance change cannot be silently ignored.",
    options: [
      {
        value: "none",
        label: "No other performance-affecting modifications",
        description: "Every performance-affecting change is represented above.",
        allowedCategories: ALL,
        section: "13.1 / 14.1 / 15.1 / 16.1 / 17.1 / 18.1"
      },
      {
        value: "unlisted",
        label: "One or more additional / unlisted modifications",
        description: "An unrepresented modification cannot be classed safely from this profile.",
        allowedCategories: [],
        section: "Manual review",
        manualReview: true
      }
    ]
  }

];

export const DEFAULT_BUILD: BuildProfile = {
  tires: "street200",
  wheels: "streetLegal",
  shocks: "streetLegal",
  springs: "stock",
  swayBars: "stock",
  alignment: "standard",
  intake: "standardOrFilter",
  exhaust: "standardOrCatBack",
  ecu: "standard",
  engine: "standard",
  differential: "standard",
  brakes: "streetLegal",
  aero: "standard",
  safety: "streetLegal",
  interior: "full",
  body: "standard",
  other: "none"
};

export function findRuleOption(field: keyof BuildProfile, value: string) {
  const group = RULE_GROUPS.find((item) => item.field === field);
  return group?.options.find((option) => option.value === value);
}
