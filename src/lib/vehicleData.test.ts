import { describe, expect, it } from "vitest";
import {
  familiesForYear,
  getVehicleMapping,
  getVehicleVariants,
  rulebookFamiliesForListing
} from "./vehicleData";

describe("getVehicleMapping Street Touring / Street Prepared relation matching", () => {
  it("relates a Street row to an ST/SP row whose qualifier excludes a trim the Street row never names", () => {
    // Street BS "M3 & M4 (F80/F82 chassis; non-CS) (2015-20)" never mentions
    // "GTS", but the SST row "... non-CS, non-GTS ..." for the exact same
    // cars must still relate to it -- "non-GTS" narrows the candidate, it
    // does not require the Street row to positively name GTS.
    const m3 = getVehicleMapping({
      make: "BMW",
      model: "M3",
      year: "2018",
      variant: "M3 & M4 (F80/F82 chassis; non-CS) (2015-20)"
    });
    expect(m3?.classes).toEqual(expect.arrayContaining(["bs", "sst"]));
  });

  it("relates a Street row naming a shared family to an ST row naming one of its listed trims directly", () => {
    // The Street DS row "2 Series (228i, 230i) (4-cyl Turbo; F22 chassis)"
    // names its trims only inside its own qualifier; the BST row is named
    // directly "228i" with no "2 Series" prefix, so neither row's pre-
    // qualifier identity is a substring of the other's.
    const bmw228i = getVehicleMapping({
      make: "BMW",
      model: "2 Series",
      year: "2015",
      variant: "2 Series (228i, 230i) (4-cyl Turbo; F22 chassis) (2014-21)"
    });
    expect(bmw228i?.classes).toEqual(expect.arrayContaining(["ds", "bst"]));
  });

  it("does not require a Street row to be the sole listing for its family before relating to a genuinely matching ST/SP row", () => {
    // Regression guard: the "sole listing for its family" year-evidence
    // fallback must not accidentally suppress real, already-working relations
    // (e.g. Honda Accord, which has multiple related rows across classes).
    const accord = getVehicleMapping({ make: "Honda", model: "Accord", year: "2000" });
    expect(accord?.classes).toEqual(expect.arrayContaining(["hs", "dst", "est", "fsp"]));
  });
});

describe("getVehicleMapping year-evidence for 'all, excl.' qualifiers", () => {
  it("treats 'Golf (all, excl. R)' as sufficient year evidence instead of leaving it unreachable", () => {
    // Street HS "Golf (all, excl. R)" has no year range. Its qualifier reads
    // as "every Golf/GTI except R", not a specific named trim, so it must not
    // be treated as failing to match plain "Golf" the way a real
    // distinguishing trim qualifier would -- this used to resolve to no
    // mapping at all for every year/variant of this selection.
    const golf2016 = getVehicleMapping({
      make: "Volkswagen",
      model: "Golf",
      year: "2016",
      variant: "Golf (all, excl. R)"
    });
    expect(golf2016?.classes).toEqual(expect.arrayContaining(["hs", "gst"]));
  });
});

describe("getVehicleMapping Acura NSX Street placement", () => {
  it("splits the regular NSX from the rare 1999 Zanardi Signature Edition instead of returning an ambiguous null", () => {
    const regular = getVehicleMapping({
      make: "Acura",
      model: "NSX",
      year: "1995",
      variant: "NSX (non-Zanardi Edition)"
    });
    expect(regular?.classes).toContain("bs");

    const zanardi = getVehicleMapping({
      make: "Acura",
      model: "NSX",
      year: "1999",
      variant: "NSX Alex Zanardi Signature Edition"
    });
    expect(zanardi?.classes).toContain("as");

    const regular1999 = getVehicleMapping({
      make: "Acura",
      model: "NSX",
      year: "1999",
      variant: "NSX (non-Zanardi Edition)"
    });
    expect(regular1999?.classes).toContain("bs");
  });

  it("only offers the Zanardi Signature Edition variant in its real production year", () => {
    const variants2017 = getVehicleVariants("Acura", "NSX", "2017").map((v) => v.value);
    expect(variants2017).not.toContain("NSX Alex Zanardi Signature Edition");

    const variants1999 = getVehicleVariants("Acura", "NSX", "1999").map((v) => v.value);
    expect(variants1999).toContain("NSX Alex Zanardi Signature Edition");
    expect(variants1999).toContain("NSX (non-Zanardi Edition)");
  });
});

describe("getVehicleMapping submodel-word ambiguity guard", () => {
  it("does not let 'quattro' (a drivetrain suffix shared across many Audi families) cross-attach the vintage Quattro coupe's class to an unrelated current-year quattro-trim car", () => {
    // Audi's own "quattro" AWD-suffix appears in many current families' variant names
    // (A4 quattro, A6 quattro, TT quattro, ...). The vintage "Quattro (Coupe Turbo)"
    // Street listing and "Quattro Turbo Coupe" Street Prepared listing (a distinct,
    // separately-classed 1980s model) have no year range, so without a guard against
    // this fan-out, a bare "quattro" identity could be loosely matched to any of those
    // unrelated families. A submodel name being reused does not mean it is the same
    // vehicle across different years/families.
    const tt2018 = getVehicleMapping({
      make: "Audi",
      model: "TT",
      year: "2018",
      variant: "TT quattro (AWD) (2008-20)"
    });
    expect(tt2018?.classes).toEqual(expect.arrayContaining(["ds", "gst"]));
    expect(tt2018?.classes).not.toContain("gs");
    // "dsp" is legitimately present here from TT's own real "TT (2014-19)" Street
    // Prepared row -- the guard is that it must never come from the unrelated vintage
    // "Quattro Turbo Coupe" DSP listing instead.
    expect(tt2018?.classSources?.dsp?.description).toBe("TT (2014-19)");
    expect(tt2018?.classSources?.gs).toBeUndefined();
  });

  it("does not attribute a bare single-word listing identity to unrelated families via loose containment", () => {
    // Direct unit test of the vulnerable function itself: end-to-end coverage via
    // getVehicleMapping can't prove this on its own, since other independent gates
    // (relatedListingIsCompatible's token requirements) happen to also block the
    // symptom for every case checked so far -- but this function's own logic must
    // still be correct on its own terms, since a future unrelated change to those
    // other gates could otherwise re-expose the same cross-family contamination.
    const vintageQuattroCoupe = {
      classId: "gs",
      category: "street" as const,
      manufacturer: "Audi",
      description: "Quattro (Coupe Turbo)",
      yearRanges: [] as Array<[number, number]>,
      page: 203,
      ruleSection: "Appendix A - GS",
      sourceUrl: "https://www.scca.com/downloads/78494/download#page=203"
    };
    const families2020 = familiesForYear("Audi", "2020");
    expect(families2020).toEqual(expect.arrayContaining(["A4", "A6", "TT"]));

    const matchedFamilies = rulebookFamiliesForListing("Audi", vintageQuattroCoupe, "2020", families2020);
    expect(matchedFamilies).not.toContain("A4");
    expect(matchedFamilies).not.toContain("A6");
    expect(matchedFamilies).not.toContain("TT");
  });
});

describe("getVehicleMapping for vehicles with no Street-category placement", () => {
  it("resolves a Street Prepared class directly for a vehicle Appendix A never places in Street at all", () => {
    // The Chevrolet Chevelle (1964-67) has an ESP Street Prepared listing but no
    // Street-category counterpart anywhere in Appendix A -- the rulebook structure
    // itself classes some vintage platforms straight into a preparation category.
    // Requiring a Street placement first would make this permanently unreachable.
    const chevelle = getVehicleMapping({
      make: "Chevrolet",
      model: "Chevelle",
      year: "older",
      variant: "Chevelle (1964-67)"
    });
    expect(chevelle?.classes).toEqual(["esp"]);
    expect(chevelle?.classSources?.esp?.description).toBe("Chevelle (1964-67)");
  });

  it("still refuses to guess when real Street listings exist but are ambiguous, instead of falling through to an easier-to-resolve category", () => {
    // Regression guard: Honda S2000 has two real Street listings (AS for the CR
    // package, CS otherwise), so bare "S2000" with no package specified is a genuine
    // Street-level ambiguity -- NOT a "no Street placement exists" case. It must keep
    // resolving to no mapping at all rather than silently recommending Street
    // Prepared (CSP, which doesn't split by package) just because that category
    // happened to be easier to pin down. Confirming the correct Street class always
    // takes priority over guessing into a different category.
    const ambiguous = getVehicleMapping({ make: "Honda", model: "S2000", year: "2008" });
    expect(ambiguous).toBeNull();
  });
});

describe("getVehicleMapping generic-family-catch-all-by-elimination matching", () => {
  it("resolves a plain EPA trim name (328i) against a chassis+exclusion-worded Street row by elimination", () => {
    // Reported bug: a stock 2011 BMW 328i could not be classified at all. Appendix A's GS
    // row for the E9x-era 3 Series reads "3 Series (E9x chassis; non-M3, non-turbo)" -- it
    // never names "328i" anywhere, describing the class purely by what it excludes. "328i"
    // shares no vocabulary with that text, but it also doesn't match any of the OTHER 3
    // Series rows that positively name what's excluded (the M3, or the turbocharged 335i/
    // 335is row), so by elimination it can only be the one remaining catch-all.
    const bmw328i = getVehicleMapping({ make: "BMW", model: "3 Series", year: "2011", variant: "328i" });
    expect(bmw328i?.classSources?.gs?.description).toBe(
      "3 Series (E9x chassis; non-M3, non-turbo) (2007-13)"
    );
  });

  it("does not let a genuinely turbocharged sibling trim fall into the same catch-all", () => {
    // The turbocharged 335i/335is have their own positively-named row ("335i & 335is (E9X
    // chassis; 6-cyl Turbo)") -- a bare "335i" selection must resolve there, specifically NOT
    // to the non-turbo GS catch-all, even though both are nominally "3 Series" trims.
    const bmw335i = getVehicleMapping({
      make: "BMW",
      model: "3 Series",
      year: "2011",
      variant: "335i & 335is (E9X chassis; 6-cyl Turbo) (2007-13)"
    });
    expect(bmw335i?.classSources?.fs?.description).toBe(
      "335i & 335is (E9X chassis; 6-cyl Turbo) (2007-13)"
    );
    expect(bmw335i?.classSources?.gs).toBeUndefined();
  });

  it("matches a trim named only inside a listing's qualifier, without losing sibling trims to a greedy incl/excl strip", () => {
    // Regression guard for a second bug found alongside the elimination fix: the current
    // G20/21-generation row "3 series (G20/21 Chassis 330i incl. xDrive, 330e incl xDrive,
    // M340i)" names three trims inside its qualifier. rulebookVariantIdentity's "incl X"
    // stripping used to be anchored to the end of the whole string, so the first "incl"
    // match deleted everything after it -- including "M340i", which has no "incl" of its own
    // and would otherwise have been silently unmatchable.
    const m340i = getVehicleMapping({
      make: "BMW",
      model: "3 Series",
      year: "2024",
      variant: "M340i Sedan"
    });
    expect(m340i?.classSources?.fs?.description).toContain("G20/21");

    const car330e = getVehicleMapping({
      make: "BMW",
      model: "3 Series",
      year: "2024",
      variant: "330e xDrive Sedan"
    });
    expect(car330e?.classSources?.fs?.description).toContain("G20/21");
  });
});

describe("getVehicleMapping engine-displacement numbers mistaken for a model year", () => {
  it("does not restrict the Datsun 2000 Roadster to model year 2000, which the row never named", () => {
    // Appendix A CSP "Roadster (1500, 1600, & 2000)" lists three engine
    // displacements (1500cc, 1600cc, 2000cc), not a model year -- the extraction
    // pipeline's bare-4-digit-number year detection previously misread "2000"
    // as a year range, which made this row unreachable for the real "older"
    // Datsun 2000 catalog entry (Datsun never sold a model-year-2000 Roadster).
    const datsun2000 = getVehicleMapping({ make: "Datsun", model: "2000", year: "older" });
    expect(datsun2000?.classSources?.csp?.description).toBe("Roadster (1500, 1600, & 2000)");
  });

  it("does not restrict the Plymouth Sapporo to model year 2000, which the row never named", () => {
    // Appendix A FSP "Sapporo (1600, 2000, & 2600)" lists three engine
    // displacements, not a model year; same transcription bug as the Datsun row.
    const sapporo = getVehicleMapping({ make: "Plymouth", model: "Sapporo", year: "older" });
    expect(sapporo?.classSources?.fsp?.description).toBe("Sapporo (1600, 2000, & 2600)");
  });

  it("does not restrict the Ford Pinto Wagon to model year 2000, which the row never named", () => {
    // Appendix A FSP "Pinto Wagon (2000, 2300, & 2600)" lists three engine
    // displacements, not a model year; same transcription bug as the Datsun row.
    const pinto = getVehicleMapping({ make: "Ford", model: "Pinto", year: "older" });
    expect(pinto?.classSources?.fsp?.description).toContain("Pinto Wagon (2000, 2300, & 2600)");
  });
});

describe("getVehicleMapping Fiat 2000 Spider transcription typo", () => {
  it("matches the naturally-aspirated 2000 Spider to its own non-turbo row instead of the unrelated Turbo-only row", () => {
    // Appendix A CSP listed this row's second clause as "2000 Spi der (non-turbo)"
    // -- a PDF-extraction typo that split "Spider" in two. The broken token
    // failed to match the naturally-aspirated "2000 Spider" catalog entry, so it
    // fell through to Fiat's other CSP row, "2000 Spider Turbo", misclassifying a
    // non-turbo car into a turbo-only class. Fixing the typo must resolve the
    // non-turbo row and must NOT resolve the Turbo-only row.
    const fiat2000Spider = getVehicleMapping({ make: "Fiat", model: "2000 Spider", year: "older" });
    expect(fiat2000Spider?.classSources?.csp?.description).toBe(
      "124 Spider (1975-78) & 2000 Spider (non-turbo)"
    );
    expect(fiat2000Spider?.classSources?.csp?.description).not.toBe("2000 Spider Turbo");
  });
});

describe("getVehicleMapping Volvo R-badge naming (S60R/V70R fused vs. spaced)", () => {
  it("resolves the 2004 Volvo S60 R to its Street GS listing and Street Touring BST listing", () => {
    // Appendix A writes the performance trim with no space, "S60R (except Polestar)" and bare
    // "S60R" -- but the reviewed/EPA catalog spells the same car "S60 R AWD". Without treating
    // those as the same identity, this real, selectable car was entirely unclassifiable despite
    // Appendix A covering it in two categories.
    const variants = getVehicleVariants("Volvo", "S60", "2004").map((v) => v.value);
    const s60rVariant = variants.find((value) => /S60R/i.test(value));
    expect(s60rVariant).toBeDefined();

    const s60r = getVehicleMapping({ make: "Volvo", model: "S60", year: "2004", variant: s60rVariant });
    expect(s60r?.classSources?.gs?.description).toBe("S60R (except Polestar)");
    expect(s60r?.classes).toEqual(expect.arrayContaining(["gs", "bst"]));
  });

  it("resolves the 2004 Volvo V70 R to its Street GS listing without picking up the unrelated S60-only BST row", () => {
    const variants = getVehicleVariants("Volvo", "V70", "2004").map((v) => v.value);
    const v70rVariant = variants.find((value) => /V70R/i.test(value));
    expect(v70rVariant).toBeDefined();

    const v70r = getVehicleMapping({ make: "Volvo", model: "V70", year: "2004", variant: v70rVariant });
    expect(v70r?.classSources?.gs?.description).toBe("V70R (except Polestar)");
    expect(v70r?.classes).not.toContain("bst");
  });

  it("does not let the base non-R S60/V70 trims pick up the R-only Street listing", () => {
    // Regression guard: the fusion/alias fix must stay scoped to the actual R trim -- a plain
    // AWD or FWD S60/V70 selection has no Street placement of its own and must keep resolving
    // to no mapping at all, not spuriously inherit the R-only GS row.
    const s60Awd = getVehicleMapping({ make: "Volvo", model: "S60", year: "2004", variant: "S60 AWD" });
    expect(s60Awd).toBeNull();
  });
});

describe("getVehicleMapping resolves a family's other members once a sibling trim gets a dedicated Street row", () => {
  it("still resolves the base non-R 'older' S60 & V70 directly to its ESP row", () => {
    // Regression guard for the S60R alias fix above: before it, family "S60" had NO Street
    // listing at all (a family resolution bug), so this plain "S60 & V70" catalog entry
    // reached ESP through the same no-Street-placement fallback Chevelle uses. Once the S60R
    // alias correctly gives family "S60" a real (but R-specific) Street listing, this base
    // trim must still resolve to ESP -- the fallback must key off "does any Street listing
    // actually describe THIS selection", not "does the family have a Street listing at all".
    const baseS60 = getVehicleMapping({ make: "Volvo", model: "S60", year: "older", variant: "S60 & V70" });
    expect(baseS60?.classes).toEqual(["esp"]);
    expect(baseS60?.classSources?.esp?.description).toBe("S60 & V70");
  });

  it("resolves the BMW 228i Gran Coupe to its Street Touring row", () => {
    const car = getVehicleMapping({
      make: "BMW",
      model: "2 Series",
      year: "2024",
      variant: "228i Gran Coupe"
    });
    expect(car?.classSources?.bst?.description).toBe("228i Gran Coupe (FWD & AWD) (2020-26)");
  });

  it("resolves the Mercedes CLK430 to its Street Touring row", () => {
    const car = getVehicleMapping({
      make: "Mercedes-Benz",
      model: "CLK-Class",
      year: "2002",
      variant: "CLK430"
    });
    expect(car?.classSources?.bst?.description).toBe("CLK430 (1999-2003)");
  });

  it("resolves the BMW Z4 sDrive35i/35is to its Street Prepared row", () => {
    const car = getVehicleMapping({ make: "BMW", model: "Z4", year: "2013", variant: "Z4 sDrive35i" });
    expect(car?.classSources?.ssp?.description).toBe("Z4 sDrive35i & sDrive35is (2012-13)");
  });

  it("resolves the Ford Mustang Shelby GT500 (2020-22) to its Street Prepared row", () => {
    const car = getVehicleMapping({
      make: "Ford",
      model: "Mustang",
      year: "2021",
      variant: "Shelby GT500 Mustang"
    });
    expect(car?.classSources?.dsp?.description).toBe("Mustang Shelby GT500 (2020-22) *Limited Prep");
  });
});

describe("getVehicleVariants suppresses generic trim names that can only ever resolve ambiguously", () => {
  it("does not offer a bare '911 Carrera' for 2016, where Porsche's mid-year 991.1/991.2 chassis transition means the plain EPA trim name is positively listed by two different Street rows with two different classes", () => {
    // Regression guard for a real selector bug, not a matching bug: Appendix A's 991.1 row
    // ("911 (991.1 Carrera, 4, S, 4S, GTS, 4 GTS) (2012-16)", class AS) and 991.2 row ("911
    // (991.2 Carrera, T, 4, S, 4S, GTS, 4 GTS, GT3, Turbo, ...) (2015-19)", class SS) both
    // positively list plain "Carrera" among their trims, and both cover model year 2016. A
    // bare "911 Carrera" selection is genuinely ambiguous between them (different classes),
    // and always resolves to null -- but each chassis-specific row is ALREADY offered as its
    // own clearly-labeled variant (year range and chassis code included), so the bare name
    // was a guaranteed dead end shadowing two options that work. It must not be offered at all.
    const variants = getVehicleVariants("Porsche", "911", "2016").map((v) => v.value);
    expect(variants).not.toContain("911 Carrera");
    expect(variants).not.toContain("911 Carrera 4S");
    expect(variants.some((value) => value.includes("991.1"))).toBe(true);
    expect(variants.some((value) => value.includes("991.2"))).toBe(true);
  });

  it("still resolves every offered 2016 911 variant to a real class", () => {
    const variants = getVehicleVariants("Porsche", "911", "2016").map((v) => v.value);
    const resolvable = variants.filter(
      (variant) => getVehicleMapping({ make: "Porsche", model: "911", year: "2016", variant })?.classes.length
    );
    // "911 R" is a genuinely separate, still-unresolved case (not covered by any Street row's
    // text at all) -- everything else offered for this year must actually resolve, since the
    // whole point of suppressing the ambiguous generic names was to leave only working choices.
    expect(resolvable.length).toBe(variants.length - 1);
  });
});

describe("resolveListingForSelectionInCategory tie-breaks a false loose-match ambiguity without over-narrowing real single-listing matches", () => {
  it("resolves the vintage Mustang 4-cyl/6-cyl trims to their combined HS row, not the unrelated V8-only row", () => {
    // Ford's older "Mustang" family has two Street rows that both reduce to bare "Mustang"
    // before their own parenthetical -- HS "Mustang (4-cyl, 6-cyl, & 4-cyl Turbo except SVO)"
    // and FS "Mustang (V8, NOC)". rulebookVariantMatches's loose bare-name/containment checks
    // treat both as plausible for ANY bare "Mustang (...)" request, which used to make a
    // request for the 4-cylinder car ambiguous between two rows with different classes and
    // resolve to null. The tie-breaker must recognize this as the "V8, NOC" row not actually
    // describing a 4-cylinder car and resolve to the HS row alone.
    for (const variant of ["Mustang (4-cyl)", "Mustang (4-cyl Turbo except SVO)", "Mustang (6-cyl)"]) {
      const car = getVehicleMapping({ make: "Ford", model: "Mustang", year: "older", variant });
      expect(car?.classSources?.hs?.description).toBe(
        "Mustang (4-cyl, 6-cyl, & 4-cyl Turbo except SVO) (19641/2-93)"
      );
    }

    const v8 = getVehicleMapping({ make: "Ford", model: "Mustang", year: "older", variant: "Mustang (V8, NOC)" });
    expect(v8?.classSources?.fs?.description).toBe("Mustang (V8, NOC)");
    expect(v8?.classSources?.hs).toBeUndefined();
  });

  it("does not over-narrow a real single-listing match just because the selected variant carries its own extra qualifier", () => {
    // Regression guard: an earlier version of this fix required the SELECTED variant to have
    // no qualifier of its own before trusting a loose match at all, which broke every one of
    // these -- each is the ONLY Street Prepared listing for its family, so there is no
    // competing row to be ambiguous with, and the selected car's own engine-size/edition detail
    // (which the single listing's broader qualifier never repeats) must not block the match.
    const volvo = getVehicleMapping({ make: "Volvo", model: "P-1800", year: "older", variant: "P-1800 (1780 cc)" });
    expect(volvo?.classSources?.fsp?.description).toBe("1800, P1800, & ES1800 (all)");

    const renault = getVehicleMapping({
      make: "Renault",
      model: "R-5",
      year: "older",
      variant: "R-5 (Not Otherwise Classified) & LeCar"
    });
    expect(renault?.classSources?.fsp?.description).toBe("R-5 (NOC) & LeCar");

    const subaru = getVehicleMapping({
      make: "Subaru",
      model: "Turbo 4WD",
      year: "older",
      variant: "Turbo 4WD (all, Not Otherwise Classified)"
    });
    expect(subaru?.classSources?.fsp?.description).toBe("Turbo 4WD (all, NOC)");

    const mini = getVehicleMapping({
      make: "MINI",
      model: "Cooper S",
      year: "older",
      variant: "Cooper S (including JCW & JCWGP except Countryman)"
    });
    expect(mini?.classSources?.esp?.description).toContain("Cooper S");
  });
});

describe("getVehicleMapping spelled-out 'Not Otherwise Classified' vs. Appendix A's 'NOC' abbreviation", () => {
  it("resolves the Camaro V8 non-supercharged NOC trim to its Street row", () => {
    // Appendix A abbreviates this listing "Camaro (V8 non-supercharged, NOC)", but the
    // catalog spells it out in full. Ford's older Camaro family also has an unrelated HS row,
    // "Camaro (4-cyl & 6-cyl)", that reduces to the same bare "Camaro" identity -- so this only
    // resolves once "not otherwise classified" and "NOC" are recognized as the same token,
    // letting the tie-breaker's token-coverage check correctly prefer the V8 row.
    const camaro = getVehicleMapping({
      make: "Chevrolet",
      model: "Camaro",
      year: "older",
      variant: "Camaro (V8 non-supercharged, not otherwise classified)"
    });
    expect(camaro?.classSources?.fs?.description).toBe("Camaro (V8 non-supercharged, NOC)");
    expect(camaro?.classSources?.hs).toBeUndefined();
  });

  it("does not let the 'NOC' synonym hijack family resolution for Renault's own unrelated 'Not Otherwise Classified' legacy model", () => {
    // Regression guard: an earlier version of this fix normalized "not otherwise classified"
    // in the SHARED identityText function (used for family names too), which made Renault's
    // raw legacy catalog -- which happens to have its own distinct family literally named
    // "Not Otherwise Classified" -- spuriously outrank the real "R-5" family in
    // rulebookFamiliesForListing's longest-match tiebreak for the FSP "R-5 (NOC) & LeCar" row,
    // since "Not Otherwise Classified" normalized to a longer identity match than "R-5". The
    // fix must stay scoped to rulebookVariantIdentity (description/variant text only).
    const renault = getVehicleMapping({
      make: "Renault",
      model: "R-5",
      year: "older",
      variant: "R-5 (Not Otherwise Classified) & LeCar"
    });
    expect(renault?.classSources?.fsp?.description).toBe("R-5 (NOC) & LeCar");
  });
});

describe("getVehicleMapping does not let a compound 'Turbo' name absorb an unrelated non-turbo sibling", () => {
  it("resolves the non-turbo Porsche 924 to its own row, not the Turbo-only row", () => {
    // Appendix A's ES "924 Turbo (Audi engine) (1979-81)" and HS "924 (Audi engine, non-turbo)"
    // both reduce to bare "924" once their own qualifiers are stripped -- "Turbo" here is a
    // discriminating adjective naming a DIFFERENT, mutually exclusive car, not a second listed
    // trim the way "335i & 335is" is. A non-turbo request must resolve only to the HS row.
    const nonTurbo924 = getVehicleMapping({ make: "Porsche", model: "924", year: "older", variant: "924 (Audi engine)" });
    expect(nonTurbo924?.classSources?.hs?.description).toBe("924 (Audi engine, non-turbo)");
    expect(nonTurbo924?.classSources?.es).toBeUndefined();
  });

  it("resolves the Turbo Porsche 924 to its own row, not the non-turbo row", () => {
    const turbo924 = getVehicleMapping({ make: "Porsche", model: "924", year: "older", variant: "924 Turbo" });
    expect(turbo924?.classSources?.es?.description).toBe("924 Turbo (Audi engine) (1979-81)");
    expect(turbo924?.classSources?.hs).toBeUndefined();
  });

  it("resolves the non-turbo Eagle Talon to its own row, not the unrelated Turbo AWD row", () => {
    const talon = getVehicleMapping({ make: "Eagle", model: "Talon", year: "older", variant: "Talon (non-turbo)" });
    expect(talon?.classSources?.hs?.description).toBe("Talon (FWD)");
    expect(talon?.classSources?.ds).toBeUndefined();
  });

  it("resolves the Turbo Nissan 300ZX to its own row, not the unrelated non-turbo row", () => {
    const turbo300zx = getVehicleMapping({ make: "Nissan", model: "300ZX", year: "older", variant: "300ZX Turbo" });
    expect(turbo300zx?.classSources?.fs?.description).toBe("300ZX Turbo (1984-89)");
    expect(turbo300zx?.classSources?.hs).toBeUndefined();
  });

  it("still resolves the M340i to its 3 Series row naming it only inside a bare-family-name qualifier", () => {
    // Regression guard: an earlier version of the "924 Turbo" fix required a listing's
    // pre-qualifier tokens to all be echoed back by the request, but never excluded the bare
    // family name's OWN tokens first -- so a request like "M340i" (which never repeats "3
    // Series") failed against the G20/21 row's pre-qualifier "3 series", even though "3
    // series" is just the family name here, not a discriminating adjective like "Turbo".
    const m340i = getVehicleMapping({ make: "BMW", model: "3 Series", year: "2024", variant: "M340i Sedan" });
    expect(m340i?.classSources?.fs?.description).toContain("G20/21");
  });
});

describe("getVehicleMapping Corvette C4 transcription typo and bare-name dead end", () => {
  it("resolves the C4 Corvette excluding LT4/ZR1 to its Street/Street Touring/Street Prepared rows", () => {
    // src/data/vehicles.generated.json's raw catalog key literally read "Corvette (C4, all,
    // bst excl. LT4 engine & ZR1)" -- a stray "bst" (a real classId) transcribed directly into
    // the display text, which never matched anything since no Appendix A row phrases it that
    // way. Fixed to "Corvette (C4, excl. LT4 engine & ZR1)", matching the official wording.
    const c4 = getVehicleMapping({
      make: "Chevrolet",
      model: "Corvette",
      year: "older",
      variant: "Corvette (C4, excl. LT4 engine & ZR1)"
    });
    expect(c4?.classes).toEqual(expect.arrayContaining(["bst", "cs"]));
  });

  it("does not offer a bare 'Corvette' with no generation/qualifier once other Corvette variants exist", () => {
    // A plain "Corvette" with no generation, engine, or chassis qualifier at all is a
    // guaranteed dead end -- Appendix A never has one undated row spanning the whole
    // multi-generation family -- and every real Corvette selection already has its own
    // properly-labeled variant, so this bare name only ever shadowed working choices.
    const variants = getVehicleVariants("Chevrolet", "Corvette", "older").map((v) => v.value);
    expect(variants).not.toContain("Corvette");
    expect(variants.length).toBeGreaterThan(0);
  });
});
