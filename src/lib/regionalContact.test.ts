import { describe, expect, it } from "vitest";
import {
  ALSCCA_SOLO_CHAIR_EMAIL,
  buildMailto,
  buildRegionalContactDraft,
  resolveRegionalContact,
  summarizeBuild
} from "./regionalContact";
import { DEFAULT_BUILD } from "./rules";
import type { VehicleSelection } from "./types";

const miata: VehicleSelection = {
  year: "1997",
  make: "Mazda",
  model: "MX-5 Miata",
  variant: "1.8L"
};

describe("regional contact routing", () => {
  it.each(["35094", "35203", "36067", "36104"])(
    "routes verified Central Alabama coverage for %s to ALSCCA",
    (zip) => {
      expect(resolveRegionalContact(zip)).toEqual({
        status: "direct",
        zip,
        regionName: "Alabama Region (ALSCCA)",
        email: ALSCCA_SOLO_CHAIR_EMAIL
      });
    }
  );

  it.each(["35801", "36301", "36602", "30303"])(
    "uses the official locator rather than guessing for %s",
    (zip) => {
      expect(resolveRegionalContact(zip)).toEqual({ status: "locator", zip });
    }
  );

  it.each(["", "3520", "35203-1234", "abcde"])("rejects invalid ZIP input %j", (zip) => {
    expect(resolveRegionalContact(zip)).toEqual({ status: "invalid" });
  });
});

describe("regional contact draft", () => {
  it("uses the selected exact vehicle and stock wording", () => {
    const draft = buildRegionalContactDraft("Gabriel", miata, DEFAULT_BUILD);

    expect(draft.subject).toBe("Solo classification help");
    expect(draft.vehicle).toBe("1997 Mazda MX-5 Miata 1.8L");
    expect(draft.modifications).toBe("stock");
    expect(draft.body).toContain("I have a 1997 Mazda MX-5 Miata 1.8L that is stock");
    expect(draft.body).toContain("Respectfully,\nGabriel");
  });

  it("does not repeat a model alias already present in the family name", () => {
    const draft = buildRegionalContactDraft(
      "Gabriel",
      {
        year: "1997",
        make: "Mazda",
        model: "MX-5 Miata",
        variant: "Miata (non-Club Sport 2003) (1990-2005)"
      },
      DEFAULT_BUILD
    );

    expect(draft.vehicle).toBe("1997 Mazda MX-5 Miata (non-Club Sport 2003) (1990-2005)");
    expect(draft.vehicle).not.toContain("Miata Miata");
  });

  it("lists each selected modification instead of calling the car stock", () => {
    const build = {
      ...DEFAULT_BUILD,
      tires: "dotBelow200",
      springs: "lowering"
    };
    const summary = summarizeBuild(build);
    const draft = buildRegionalContactDraft("Gabriel", miata, build);

    expect(summary).toContain("Tires: Other DOT tire below 200 UTQG / R-comp");
    expect(summary).toContain(
      "Springs / ride height: Alternate springs using the original spring type and attachment points"
    );
    expect(draft.body).toContain("with these modifications:");
    expect(draft.body).not.toContain("that is stock");
  });

  it("builds an encoded mailto URL with the corrected ALSCCA address", () => {
    const draft = buildRegionalContactDraft("Gabriel", miata, DEFAULT_BUILD);
    const mailto = buildMailto(ALSCCA_SOLO_CHAIR_EMAIL, draft);

    expect(mailto.startsWith(`mailto:${ALSCCA_SOLO_CHAIR_EMAIL}?`)).toBe(true);
    expect(mailto).toContain("subject=Solo%20classification%20help");
    expect(decodeURIComponent(mailto)).toContain("Respectfully,\nGabriel");
  });
});
