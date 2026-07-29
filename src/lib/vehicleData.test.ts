import { describe, expect, it } from "vitest";
import { getVehicleMapping, getVehicleVariants } from "./vehicleData";

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
