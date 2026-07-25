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
const ST_2WD_LSD_CLASSES = [
  "sst",
  "ast",
  "bst",
  "cst",
  "dst",
  "gst",
  "sts",
  "str",
  "stu",
  "stx",
  "sth"
];
const ST_AWD_LSD_CLASSES = ["sst", "ast", "bst", "cst", "dst", "stu", "stx", "sth"];

export const RULE_GROUPS: RuleGroup[] = [
  {
    field: "tires",
    title: "Tires",
    help: "Choose the most aggressive tire installed for competition.",
    options: [
      {
        value: "street200",
        label: "Street tire: DOT, 200+ UTQG, 7/32 in new tread",
        description: "Street requires a DOT passenger tire with at least 200 UTQG, at least 7/32 in molded tread depth when new, and a current or prior-two-year SCCA Tire Guide listing. In Street Touring, maximum section width is class-dependent: 225, 245, 255, 265, 295, or 315 mm; SST is unlimited.",
        allowedCategories: ALL,
        section: "13.3"
      },
      {
        value: "vitourP1",
        label: "Vitour Tempesta P1 / P1+ (Xtreme Street exception)",
        description: "Section 21 expressly permits the Vitour Tempesta P1 and P1+ in Xtreme Street. They do not satisfy this app's normal Street or Street Touring tire path unless the tire independently meets Section 13.3.",
        allowedCategories: SP_PLUS,
        section: "21.4"
      },
      {
        value: "dotBelow200",
        label: "Other DOT tire below 200 UTQG / R-comp",
        description: "A tire below 200 UTQG is not legal in Street or Street Touring. Other than the named Vitour Xtreme Street exception, evaluate it in Street Prepared or a category whose tire rules permit it.",
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
        label: "Wider wheel no wider than my ST class permits",
        description: "Street Touring maximum wheel widths are 7.5 in for AST/CST AWD and EST; 8 in for DST AWD; 9 in for AST/CST 2WD, DST, and GST; 11 in for BST; SST is unlimited.",
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
        label: "ST hardware at factory mounting points; no pickup-point relocation",
        description: "Street Touring permits camber plates or bolts at original mounts, bushings in the original location without changing bushing type, and limited replacement arms: one upper or lower arm, not both; one lateral link per corner on multi-link cars. Every replacement arm must use the original mounting points.",
        allowedCategories: ST_PLUS,
        section: "14.8.B / 14.8.C / 14.8.F / 14.8.H"
      },
      {
        value: "changedArms",
        label: "More than one ST-allowed arm/link, or non-ST bushings",
        description: "Multiple arm changes at one corner, changing bushing type, or hardware beyond the Section 14.8 limits is not Street Touring legal; evaluate Street Prepared or higher.",
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
        label: "Factory intake, or replacement filter in the factory airbox",
        description: "Street permits a replacement air-filter element but does not permit replacing or rerouting the intake system.",
        allowedCategories: ALL,
        section: "13.10"
      },
      {
        value: "toThrottleBody",
        label: "Intake changed only before the throttle body / carb / turbo inlet",
        description: "Street Touring permits intake changes only up to, but not including, the first throttle body, carburetor, compressor inlet, or intake manifold. Do not modify body structure, remove or replace engine-management sensors, or defeat PCV function.",
        allowedCategories: ST_PLUS,
        section: "14.10"
      },
      {
        value: "customBeyond",
        label: "Throttle body, intake manifold, sensors, or structure changed",
        description: "Changing the throttle body or manifold, altering required sensors/PCV, or cutting body structure exceeds the Street Touring intake allowance; evaluate Street Prepared or higher.",
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
        label: "Factory exhaust, or cat-back after the final factory catalyst",
        description: "Street permits exhaust changes only downstream of the final catalytic converter while required emissions equipment remains functional.",
        allowedCategories: ALL,
        section: "13.10.C"
      },
      {
        value: "headersHighFlowCat",
        label: "Headers/downpipe with a 100+ cell catalyst no more than 6 in downstream",
        description: "Street Touring permits headers and downpipes when the replacement catalyst has at least 100 cells per inch and a 3 in substrate, and its inlet is no more than 6 in downstream of the original final catalyst outlet.",
        allowedCategories: ST_PLUS,
        section: "14.10.D / 14.10.E"
      },
      {
        value: "emissionsRemoved",
        label: "Catalyst removed, too far downstream, or other emissions equipment defeated",
        description: "Removing the catalyst, moving it beyond the Street Touring 6 in limit, or defeating emissions equipment is not Street Touring legal. Evaluate Street Prepared or higher, while still complying with applicable law.",
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
        label: "Reflash of the factory ECU; factory sensors and OBD-II retained",
        description: "Street Touring permits reprogramming the standard ECU. The factory OBD-II port must remain functional and only factory-type engine-management sensors may be used.",
        allowedCategories: ST_PLUS,
        section: "14.10.F.1.a"
      },
      {
        value: "legacyPiggyback",
        label: "2005-or-older plug-in piggyback; no cut or spliced harness",
        description: "For 2005-and-older vehicles, Street Touring permits a plug-compatible piggyback only when the factory harness is not cut or spliced and all other ECU restrictions are met.",
        allowedCategories: ST_PLUS,
        section: "14.10.F.1.b"
      },
      {
        value: "legacyStandalone",
        label: "1995-or-older standalone ECU using the factory harness",
        description: "For 1995-and-older vehicles, Street Touring permits a standalone ECU under the legacy allowance when installation and sensor rules are met.",
        allowedCategories: ST_PLUS,
        section: "14.10.F.1.c"
      },
      {
        value: "standalone",
        label: "Modern standalone ECU, cut/spliced harness, or non-factory sensors",
        description: "A modern standalone, cut or spliced engine harness, or non-factory engine-management sensors exceeds Street Touring; evaluate Street Prepared or higher.",
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
        label: "2WD mechanical limited-slip differential; not E Street Touring",
        description: "For a two-wheel-drive car, SST, AST, BST, CST, DST, and GST may use a mechanical limited-slip differential. EST permits no LSD change except a standard viscous unit.",
        allowedCategories: ST_PLUS,
        section: "14.10.G / 14.10.H",
        classConstraints: { streetTouring: ST_2WD_LSD_CLASSES }
      },
      {
        value: "streetTouringAwdLsd",
        label: "AWD: one mechanical front, rear, or center LSD; not EST/GST",
        description: "For AWD cars in SST, AST, BST, CST, or DST, one front, rear, or center differential may be replaced with a mechanical LSD. EST and GST do not receive this AWD allowance.",
        allowedCategories: ST_PLUS,
        section: "14.10.G",
        classConstraints: { streetTouring: ST_AWD_LSD_CLASSES }
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
        label: "Factory calipers/rotors; pads, fluid, and compliant lines only",
        description: "Street keeps the standard calipers and rotors while allowing pad, fluid, and compliant brake-line changes.",
        allowedCategories: ALL,
        section: "13.6"
      },
      {
        value: "streetTouringKit",
        label: "ST brake kit: equal/larger ferrous rotors, standard mounts, parking brake works",
        description: "Street Touring replacement rotors must be ferrous and at least the factory diameter and thickness; slots/holes may remove no more than 10% of swept area. Calipers must bolt to standard locations with at least the factory piston count, and the factory-type parking brake must work.",
        allowedCategories: ST_PLUS,
        section: "14.6"
      },
      {
        value: "custom",
        label: "Smaller/thinner or non-ferrous rotors, relocated mounts, or parking brake removed",
        description: "A brake setup outside the Street Touring rotor, caliper-mount, piston-count, or parking-brake limits requires Street Prepared or higher.",
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
        label: "Wing/splitter/diffuser within Section 21 Xtreme Street dimensions",
        description: "For Xtreme Street: a front device may project up to 6 in and not pass the front-axle centerline; a diffuser may start no farther forward than the rear-wheel centerline and project up to 6 in; a wing has an 8 sq ft maximum, two elements, vehicle-width limit, and position/height limits in Section 21.",
        allowedCategories: SM_PLUS,
        section: "16.1.K / 16.1.L"
      },
      {
        value: "activeOrExtreme",
        label: "Aero outside Section 21 dimensions, or active aero not locked",
        description: "Aero beyond the Section 21 size/location limits, or an adjustable wing that is not locked in one position while moving, cannot be auto-classed as XA/XB and needs Modified-category review.",
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
    field: "xtremeVehicleType",
    title: "Xtreme Street vehicle eligibility",
    help: "XA and XB exclude CAM-eligible cars and kit/component cars.",
    principalRelevant: false,
    options: [
      {
        value: "unknown",
        label: "Not sure whether the car passes the XA/XB vehicle exclusions",
        description: "Choose a more specific answer before relying on an XA or XB result.",
        allowedCategories: ALL,
        section: "Appendix A - Xtreme Street"
      },
      {
        value: "production",
        label: "Production road car with factory VIN; not CAM-eligible or a kit car",
        description: "This answers the XA/XB production-car gate only. The car must still pass Section 3.1, retain recognizable original shape, and meet all other Section 21 requirements.",
        allowedCategories: ALL,
        section: "21 / Appendix A - Xtreme Street"
      },
      {
        value: "camEligible",
        label: "CAM-eligible: qualifying North American front-engine RWD car",
        description: "Any CAM-eligible vehicle is expressly excluded from XA and XB; use the applicable CAM class instead.",
        allowedCategories: ALL,
        section: "Appendix A - Xtreme Street / CAM"
      },
      {
        value: "kitOrComponent",
        label: "Kit/component car intended for owner completion",
        description: "Kit and component cars from low-volume manufacturers that are intended for end-user completion are excluded from XA and XB.",
        allowedCategories: ALL,
        section: "Appendix A - Xtreme Street"
      }
    ]
  },
  {
    field: "drivetrainLayout",
    title: "Driven wheels for Xtreme Street",
    help: "XA/XB weight limits depend on FWD, RWD, or AWD, and drivetrain-type conversions are prohibited.",
    principalRelevant: false,
    options: [
      {
        value: "unknown",
        label: "Not sure which drivetrain rule applies",
        description: "The app cannot choose XA or XB without the driven-wheel layout.",
        allowedCategories: ALL,
        section: "21.9 / Appendix A - Xtreme Street"
      },
      {
        value: "fwd",
        label: "Front-wheel drive (factory drivetrain type)",
        description: "Minimum weight with driver: 2,680 lb for XA or 2,180 lb for XB.",
        allowedCategories: ALL,
        section: "21.9 / Appendix A - Xtreme Street"
      },
      {
        value: "rwd",
        label: "Rear-wheel drive (factory drivetrain type)",
        description: "Minimum weight with driver: 2,930 lb for XA or 2,330 lb for XB.",
        allowedCategories: ALL,
        section: "21.9 / Appendix A - Xtreme Street"
      },
      {
        value: "awd",
        label: "All-wheel drive (factory drivetrain type)",
        description: "Minimum weight with driver: 3,180 lb for XA or 2,480 lb for XB.",
        allowedCategories: ALL,
        section: "21.9 / Appendix A - Xtreme Street"
      },
      {
        value: "converted",
        label: "Converted to a different drivetrain type",
        description: "Section 21 permits drivetrain changes but prohibits converting the vehicle's drivetrain type, such as FWD to AWD.",
        allowedCategories: ALL,
        section: "21.9"
      }
    ]
  },
  {
    field: "competitionWeight",
    title: "Competition weight with driver",
    help: "Use the car's measured event weight including the driver, not published curb weight.",
    principalRelevant: false,
    options: [
      {
        value: "unknown",
        label: "Not weighed with the driver",
        description: "XA/XB cannot be confirmed from curb weight because the rule uses competition weight with the driver.",
        allowedCategories: ALL,
        section: "Appendix A - Xtreme Street"
      },
      {
        value: "under2180",
        label: "Under 2,180 lb with driver",
        description: "Below every XA and XB minimum weight.",
        allowedCategories: ALL,
        section: "Appendix A - Xtreme Street"
      },
      {
        value: "2180to2329",
        label: "2,180-2,329 lb with driver",
        description: "Meets XB minimum weight only for FWD.",
        allowedCategories: ALL,
        section: "Appendix A - Xtreme Street"
      },
      {
        value: "2330to2479",
        label: "2,330-2,479 lb with driver",
        description: "Meets XB minimum weight for FWD and RWD, but not AWD.",
        allowedCategories: ALL,
        section: "Appendix A - Xtreme Street"
      },
      {
        value: "2480to2679",
        label: "2,480-2,679 lb with driver",
        description: "Meets XB minimum weight for FWD, RWD, and AWD.",
        allowedCategories: ALL,
        section: "Appendix A - Xtreme Street"
      },
      {
        value: "2680to2929",
        label: "2,680-2,929 lb with driver",
        description: "Meets XA minimum weight for FWD and XB minimum weight for every drivetrain.",
        allowedCategories: ALL,
        section: "Appendix A - Xtreme Street"
      },
      {
        value: "2930to3179",
        label: "2,930-3,179 lb with driver",
        description: "Meets XA minimum weight for FWD/RWD and XB minimum weight for every drivetrain.",
        allowedCategories: ALL,
        section: "Appendix A - Xtreme Street"
      },
      {
        value: "3180plus",
        label: "3,180 lb or more with driver",
        description: "Meets XA and XB minimum weight for FWD, RWD, and AWD.",
        allowedCategories: ALL,
        section: "Appendix A - Xtreme Street"
      }
    ]
  },
  {
    field: "xtremePowertrain",
    title: "Xtreme Street powertrain type",
    help: "Electric and hybrid cars have a stricter tractive-system rule than combustion cars.",
    principalRelevant: false,
    options: [
      {
        value: "unknown",
        label: "Not sure which powertrain rule applies",
        description: "Choose the vehicle's original powertrain type before relying on XA/XB.",
        allowedCategories: ALL,
        section: "21.9"
      },
      {
        value: "ice",
        label: "Factory-type internal-combustion powertrain",
        description: "Section 21 leaves internal and external engine and drivetrain components unrestricted, but does not permit converting to another powertrain type.",
        allowedCategories: ALL,
        section: "21.9"
      },
      {
        value: "electrifiedFactory",
        label: "Hybrid/EV with factory motors, battery, controllers, sensors, and programming",
        description: "Hybrid and EV tractive systems and programming must remain original, including motors, batteries, controllers, computers, and sensors.",
        allowedCategories: ALL,
        section: "21.9"
      },
      {
        value: "electrifiedModified",
        label: "Hybrid/EV motor, battery, controller, sensor, or tractive programming changed",
        description: "Any listed tractive-system or programming change is prohibited in XA/XB.",
        allowedCategories: ALL,
        section: "21.9"
      },
      {
        value: "converted",
        label: "Converted between combustion, hybrid, or electric power",
        description: "Converting the vehicle from one powertrain type to another is prohibited in XA/XB.",
        allowedCategories: ALL,
        section: "21.9"
      }
    ]
  },
  {
    field: "roadEquipment",
    title: "Required road equipment",
    help: "Section 21 keeps the road-going equipment that makes Xtreme Street a street-car category.",
    principalRelevant: false,
    options: [
      {
        value: "complete",
        label: "Headlights, brake lights, signals, horn, and factory-equipped wipers work",
        description: "This satisfies the modeled Section 21 road-equipment check; safety, sound, and all other rules still apply.",
        allowedCategories: ALL,
        section: "21.2"
      },
      {
        value: "missing",
        label: "One or more required lights, signals, horn, or wipers is missing or inoperative",
        description: "The car is not XA/XB legal until the required road equipment is restored and functional.",
        allowedCategories: ALL,
        section: "21.2"
      },
      {
        value: "unknown",
        label: "Not sure whether all required road equipment works",
        description: "Confirm the listed equipment before relying on an XA/XB result.",
        allowedCategories: ALL,
        section: "21.2"
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
  other: "none",
  xtremeVehicleType: "unknown",
  drivetrainLayout: "unknown",
  xtremePowertrain: "unknown",
  competitionWeight: "unknown",
  roadEquipment: "complete"
};

export function findRuleOption(field: keyof BuildProfile, value: string) {
  const group = RULE_GROUPS.find((item) => item.field === field);
  return group?.options.find((option) => option.value === value);
}
