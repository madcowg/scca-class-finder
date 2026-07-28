import { describe, expect, it } from "vitest";
import { evaluatePreparedCP } from "./preparedCP";
import { DEFAULT_BUILD } from "./rules";

function build(overrides: Partial<typeof DEFAULT_BUILD>) {
  return { ...DEFAULT_BUILD, ...overrides };
}

describe("evaluatePreparedCP", () => {
  it("returns not-listed for a vehicle with no CP entry", () => {
    const result = evaluatePreparedCP(
      { make: "Toyota", model: "Corolla", year: "2020" },
      DEFAULT_BUILD
    );
    expect(result.status).toBe("not-listed");
    expect(result.matchedListing).toBeNull();
  });

  it("uses the explicit weight override for a specifically-listed vehicle (Corvair)", () => {
    const result = evaluatePreparedCP(
      { make: "Chevrolet", model: "Corvair", year: "1962" },
      DEFAULT_BUILD
    );
    expect(result.status).toBe("eligible");
    expect(result.minimumWeight).toBe(1850);
    expect(result.matchedListing).toContain("Corvair");
  });

  it("does not match the Corvair listing outside its year range", () => {
    const result = evaluatePreparedCP(
      { make: "Chevrolet", model: "Corvair", year: "1975" },
      DEFAULT_BUILD
    );
    expect(result.status).toBe("not-listed");
  });

  it("requires engine configuration before computing a flat-rate weight", () => {
    const result = evaluatePreparedCP(
      { make: "Chevrolet", model: "Camaro", year: "1975" },
      DEFAULT_BUILD
    );
    expect(result.status).toBe("manual-review");
  });

  it("computes the flat 2600 lb rate for a 4/6-cylinder CP-listed car", () => {
    const result = evaluatePreparedCP(
      { make: "Chevrolet", model: "Camaro", year: "1975" },
      build({ cpEngineConfiguration: "fourOrSixCyl" })
    );
    expect(result.status).toBe("eligible");
    expect(result.minimumWeight).toBe(2600);
  });

  it("computes the V8 flat rate using the 5100cc displacement break", () => {
    const smallV8 = evaluatePreparedCP(
      { make: "Ford", model: "Mustang", year: "1966" },
      build({ cpEngineConfiguration: "v8", engineDisplacementLiters: "4.7" })
    );
    expect(smallV8.status).toBe("eligible");
    expect(smallV8.minimumWeight).toBe(2700);

    const bigV8 = evaluatePreparedCP(
      { make: "Ford", model: "Mustang", year: "1966" },
      build({ cpEngineConfiguration: "v8", engineDisplacementLiters: "5.5" })
    );
    expect(bigV8.status).toBe("eligible");
    expect(bigV8.minimumWeight).toBe(3000);
  });

  it("matches a manufacturer written as a combined header (Ford & Mercury)", () => {
    const result = evaluatePreparedCP(
      { make: "Mercury", model: "Capri", year: "1985" },
      build({ cpEngineConfiguration: "fourOrSixCyl" })
    );
    expect(result.status).toBe("eligible");
    expect(result.matchedListing).toContain("Capri");
  });

  it("matches a manufacturer written as a parenthetical brand list (General Motors)", () => {
    const result = evaluatePreparedCP(
      { make: "Honda", model: "S10", year: "1990" },
      build({ cpEngineConfiguration: "fourOrSixCyl" })
    );
    expect(result.status).toBe("not-listed");

    // Pontiac is one of the makes listed in the "General Motors (Cadillac, Chevrolet, GMC,
    // Oldsmobile, & Pontiac)" combined manufacturer heading.
    const pontiac = evaluatePreparedCP(
      { make: "Pontiac", model: "S10", year: "1990" },
      build({ cpEngineConfiguration: "fourOrSixCyl" })
    );
    expect(pontiac.status).toBe("eligible");

    const gmc = evaluatePreparedCP(
      { make: "GMC", model: "Sonoma", year: "1990" },
      build({ cpEngineConfiguration: "fourOrSixCyl" })
    );
    expect(gmc.status).toBe("eligible");
  });

  it("uses the tube-frame flat rate when body construction is tube-frame", () => {
    const result = evaluatePreparedCP(
      { make: "Chevrolet", model: "Camaro", year: "1975" },
      build({ cpEngineConfiguration: "v8", engineDisplacementLiters: "5.5", body: "tubeFrame" })
    );
    expect(result.status).toBe("eligible");
    expect(result.minimumWeight).toBe(3300);
  });
});
