"""Extract current Appendix A production-vehicle listings from the official PDF.

The rulebook uses two independent columns. Reading whole pages interleaves
adjacent classes, so this extractor uses reviewed page/column segments and the
document's typography to preserve class, manufacturer, and wrapped model lines.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF = ROOT / "tmp" / "pdfs" / "2026-solo-rules.pdf"
OUTPUT = ROOT / "src" / "data" / "appendix-a-2026.json"
RULEBOOK_URL = "https://www.scca.com/downloads/78494/download"

production_data = json.loads(
    (ROOT / "src" / "data" / "vehicles.production.json").read_text("utf-8")
)
legacy_data = json.loads(
    (ROOT / "src" / "data" / "vehicles.generated.json").read_text("utf-8")
)
MANUFACTURER_HEADERS = {
    make
    for year in production_data.values()
    for make in year
} | set(legacy_data)
MANUFACTURER_HEADERS.update(
    {
        '"Catch-all"',
        '"Catch-all":',
        "Abarth",
        "Austin",
        "Austin-Healey",
        "Berkeley",
        "Bricklin",
        "Chevrolet & GMC",
        "Chevrolet, Pontiac, Buick, & Oldsmobile",
        "Chevrolet, Pontiac, Buick, Oldsmobile, & Geo",
        "Chevrolet, Pontiac, Buick, Oldsmobile, Geo, & Suzuki",
        "Chrysler & Plymouth",
        "Chrysler, Plymouth, & Dodge",
        "Chrysler/Plymouth/Dodge",
        "Daihatsu",
        "DeLorean",
        "DeTomaso",
        "Dodge, Mitsubishi, & Eagle",
        "Dodge & Mitsubishi",
        "Dodge & SRT",
        "Elva",
        "Fiat & Bertone",
        "Ford & Mercury",
        "General Motors",
        "Geo",
        "GMC",
        "Griffith",
        "Jensen",
        "Jensen-Healey",
        "Mercedes",
        "Mini",
        "Nissan & Datsun",
        "Nissan/Datsun",
        "Oldsmobile",
        "Pininfarina",
        "Pontiac & Saturn",
        "Pontiac & Toyota",
        "Tesla Motors",
        "Yugo",
    }
)
HEADER_LOOKUP = {
    re.sub(r"\s+", " ", header).strip().lower(): header
    for header in MANUFACTURER_HEADERS
}

CATEGORY_BY_CLASS = {
    "ss": "street",
    "as": "street",
    "bs": "street",
    "cs": "street",
    "ds": "street",
    "es": "street",
    "fs": "street",
    "gs": "street",
    "hs": "street",
    "sst": "streetTouring",
    "ast": "streetTouring",
    "bst": "streetTouring",
    "cst": "streetTouring",
    "dst": "streetTouring",
    "est": "streetTouring",
    "gst": "streetTouring",
    "ssp": "streetPrepared",
    "csp": "streetPrepared",
    "dsp": "streetPrepared",
    "esp": "streetPrepared",
    "fsp": "streetPrepared",
}

# Physical PDF page and left/right column. Segment order is also reading order.
SEGMENTS = {
    "ss": [(194, "R"), (195, "L")],
    "as": [(195, "R"), (196, "L")],
    "bs": [(196, "R"), (197, "L"), (197, "R")],
    "cs": [(198, "L"), (198, "R")],
    "ds": [(199, "L"), (199, "R"), (200, "L")],
    "es": [(200, "R")],
    "fs": [(201, "L"), (201, "R"), (202, "L"), (202, "R")],
    "gs": [(203, "L"), (203, "R"), (204, "L")],
    "hs": [
        (204, "R"),
        (205, "L"),
        (205, "R"),
        (206, "L"),
        (206, "R"),
        (207, "L"),
        (207, "R"),
        (208, "L"),
        (208, "R"),
    ],
    "sst": [(210, "L"), (210, "R")],
    "ast": [(211, "L")],
    "bst": [(211, "R"), (212, "L"), (212, "R")],
    "cst": [(213, "L")],
    "dst": [(213, "R"), (214, "L")],
    "est": [(214, "R"), (215, "L"), (215, "R")],
    "gst": [(216, "L"), (216, "R")],
    "ssp": [(218, "L"), (218, "R"), (219, "L"), (219, "R")],
    "csp": [(220, "L"), (220, "R")],
    "dsp": [(221, "L"), (221, "R"), (222, "L"), (222, "R")],
    "esp": [
        (223, "L"),
        (223, "R"),
        (224, "L"),
        (224, "R"),
        (225, "L"),
        (225, "R"),
        (226, "L"),
        (226, "R"),
    ],
    "fsp": [
        (227, "L"),
        (227, "R"),
        (228, "L"),
        (228, "R"),
        (229, "L"),
        (229, "R"),
        (230, "L"),
        (230, "R"),
    ],
}

SKIP_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"^appendix a\b",
        r"^street(?: touring®?)? \([a-z, ]+\) - appendix a$",
        r"^[a-z ]+ class(?: \([a-z]+\))?$",
        r"^[a-z ]+ touring®? ?\([a-z]+\)$",
        r"^[a-z]{1,3} \(continued\)$",
        r"^[a-z]{1,3} \(continued\)",
        r"^street (?:prepared|touring®?) category$",
        r"^2026 scca",
        r"^\d+ — 2026 scca",
        r"^all vehicles must meet",
        r"^ments of section 3\.1",
        r"^[a-z]{1,3}\)$",
    )
]

YEAR_RANGE = re.compile(
    r"(?<!\d)(19\d{2}|20\d{2})(?:1/2)?\s*[-–]\s*(\d{2}|19\d{2}|20\d{2})(?!\d)"
)
SHORT_YEAR_RANGE = re.compile(r"(?<!\d)(\d{2})\s*[-–]\s*(\d{2})(?!\d)")
SINGLE_YEAR = re.compile(r"(?<!\d)(19\d{2}|20\d{2})(?!\d)")


def clean_text(value: str) -> str:
    cleaned = (
        value.replace("\u00ad", "")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u00ae", "")
        .replace("\u00bd", "1/2")
        .replace("  ", " ")
        .strip(" \t-*")
        .strip()
    )
    replacements = {
        "Lim ited": "Limited",
        "Limted": "Limited",
        "therwise": "otherwise",
        "For ester": "Forester",
        "Tr feo": "Trofeo",
        "Stringray": "Stingray",
        "mini mum": "minimum",
        "re quirements": "requirements",
        "oth erwise": "otherwise",
        "limi tations": "limitations",
        "Sec tion": "Section",
        "Han dling": "Handling",
        "fac tory": "factory",
        "ver sions": "versions",
        "includ ing": "including",
        "Edi tion": "Edition",
        "EGallardo": "Gallardo",
        "exclc.": "excl.",
        "(2020-2 35 )": "(2020-25)",
        "(2020-2 6)": "(2020-26)",
        "(2021-2 6 )": "(2021-26)",
        "(2009-1 6 )": "(2009-16)",
        "GR Corolla (MORIZO Edition (2023 ) 24": (
            "GR Corolla (MORIZO Edition) (2023-24)"
        ),
        "CT4 (non-V, non-Blackwing (2020-26)": (
            "CT4 (non-V, non-Blackwing) (2020-26)"
        ),
        "Camaro (V8 non-supercharged, NOC)": "Camaro (V8 non-supercharged, NOC)",
        "Evora 400 )": "Evora 400",
        "Spectrum Turbo (1985-89": "Spectrum Turbo (1985-89)",
        "Spectrum Turbo (1985-89))": "Spectrum Turbo (1985-89)",
        ") 260 Series (all)": "260 Series (all)",
    }
    for source, target in replacements.items():
        cleaned = cleaned.replace(source, target)
    cleaned = re.sub(r"(?<=\d{4}) (?=\d{2}\))", "-", cleaned)
    return cleaned


def split_entries(description: str) -> list[str]:
    merged = (
        "Mustang Shelby GT350 (incl. Handling Package) (2019-20) "
        "Mustang Boss 302 (2012-13"
    )
    if description == merged:
        return [
            "Mustang Shelby GT350 (incl. Handling Package) (2019-20)",
            "Mustang Boss 302 (2012-13)",
        ]
    return [description]


def manufacturer_header(value: str) -> str | None:
    normalized = re.sub(r"\s+", " ", clean_text(value)).strip().lower()
    return HEADER_LOOKUP.get(normalized)


def join_wrapped(left: str, right: str) -> str:
    right = clean_text(right)
    if not left:
        return right
    if left.endswith("-"):
        return f"{left}{right}"
    return f"{left} {right}"


def class_heading(text: str) -> bool:
    normalized = clean_text(text)
    if normalized.upper() == "NOC)":
        return False
    return any(pattern.search(normalized) for pattern in SKIP_PATTERNS)


def column_lines(page, side: str) -> list[dict]:
    divider = next(
        (
            line["x0"]
            for line in page.lines
            if abs(line["x0"] - line["x1"]) < 0.5
            and line["height"] > page.height * 0.45
            and page.width * 0.4 < line["x0"] < page.width * 0.6
        ),
        page.width / 2,
    )
    x0, x1 = (0, divider) if side == "L" else (divider, page.width)
    words = page.crop((x0, 0, x1, page.height)).extract_words(
        x_tolerance=2,
        y_tolerance=3,
        extra_attrs=["fontname", "size"],
    )
    grouped: dict[float, list[dict]] = {}
    for word in words:
        if word["top"] < 42 or word["top"] > 570:
            continue
        grouped.setdefault(round(word["top"], 1), []).append(word)

    lines = []
    for top in sorted(grouped):
        line_words = sorted(grouped[top], key=lambda item: item["x0"])
        meaningful = [
            word for word in line_words if clean_text(word["text"]) not in {"", "-", "o"}
        ]
        if not meaningful:
            continue
        connected = [meaningful[0]]
        for word in meaningful[1:]:
            gap = word["x0"] - connected[-1]["x1"]
            if gap > 20 and len(clean_text(word["text"])) <= 2:
                continue
            connected.append(word)
        meaningful = connected
        text = clean_text(" ".join(word["text"] for word in meaningful))
        if not text:
            continue
        lines.append(
            {
                "text": text,
                "x": min(word["x0"] for word in meaningful) - x0,
                "size": max(float(word["size"]) for word in meaningful),
                "top": top,
            }
        )
    return lines


def parse_year_ranges(description: str) -> list[list[int]]:
    parenthetical = " ".join(re.findall(r"\(([^)]*)\)", description))
    ranges: list[list[int]] = []
    occupied: list[tuple[int, int]] = []
    for match in YEAR_RANGE.finditer(parenthetical):
        start = int(match.group(1))
        raw_end = match.group(2)
        end = int(raw_end)
        if len(raw_end) == 2:
            end = start // 100 * 100 + end
            if end < start:
                end += 100
        if 1900 <= start <= 2026 and start <= end <= 2026:
            ranges.append([start, end])
            occupied.append(match.span())

    for match in SHORT_YEAR_RANGE.finditer(parenthetical):
        if any(start <= match.start() < end for start, end in occupied):
            continue
        raw_start, raw_end = (int(part) for part in match.groups())
        start = (2000 if raw_start <= 26 else 1900) + raw_start
        end = start // 100 * 100 + raw_end
        if end < start:
            end += 100
        if 1900 <= start <= 2026 and start <= end <= 2026:
            ranges.append([start, end])
            occupied.append(match.span())

    for match in SINGLE_YEAR.finditer(parenthetical):
        if any(start <= match.start() < end for start, end in occupied):
            continue
        year = int(match.group(1))
        if 1900 <= year <= 2026:
            ranges.append([year, year])

    return sorted({(start, end) for start, end in ranges})


def extract_class(pdf, class_id: str) -> list[dict]:
    listings: list[dict] = []
    manufacturer = ""
    pending_entry = ""
    pending_page = 0
    pending_make = ""
    previous_was_manufacturer = False

    def flush_entry() -> None:
        nonlocal pending_entry, pending_page, pending_make
        description = clean_text(pending_entry)
        if (
            description
            and pending_make
            and not class_heading(description)
            and len(description) > 1
        ):
            for split_description in split_entries(description):
                listings.append(
                    {
                        "classId": class_id,
                        "category": CATEGORY_BY_CLASS[class_id],
                        "manufacturer": pending_make,
                        "description": split_description,
                        "yearRanges": [
                            list(item)
                            for item in parse_year_ranges(split_description)
                        ],
                        "page": pending_page,
                        "ruleSection": f"Appendix A - {class_id.upper()}",
                        "sourceUrl": f"{RULEBOOK_URL}#page={pending_page}",
                    }
                )
        pending_entry = ""
        pending_page = 0
        pending_make = ""

    for page_number, side in SEGMENTS[class_id]:
        page = pdf.pages[page_number - 1]
        lines = column_lines(page, side)
        recognized_positions = [
            line["x"] for line in lines if manufacturer_header(line["text"])
        ]
        manufacturer_x = min(
            recognized_positions,
            default=min((line["x"] for line in lines), default=15),
        )
        index = 0
        while index < len(lines):
            line = lines[index]
            text = line["text"]
            if class_heading(text):
                index += 1
                continue

            header = manufacturer_header(text)
            if not header and index + 1 < len(lines):
                combined = join_wrapped(text, lines[index + 1]["text"])
                header = manufacturer_header(combined)
                if header:
                    index += 1

            is_entry_start = (
                line["size"] <= 11.2 and line["x"] <= manufacturer_x + 10
            )

            if header:
                flush_entry()
                manufacturer = header
                previous_was_manufacturer = True
                index += 1
                continue

            if not manufacturer:
                index += 1
                continue

            if is_entry_start:
                flush_entry()
                pending_entry = text
                pending_page = page_number
                pending_make = manufacturer
                previous_was_manufacturer = False
            elif pending_entry:
                pending_entry = join_wrapped(pending_entry, text)
                previous_was_manufacturer = False
            index += 1

    flush_entry()
    return listings


def validate(listings: list[dict]) -> None:
    counts = {class_id: 0 for class_id in SEGMENTS}
    for listing in listings:
        counts[listing["classId"]] += 1
        if not listing["manufacturer"] or not listing["description"]:
            raise ValueError(f"Orphaned listing: {listing}")
        for start, end in listing["yearRanges"]:
            if start > end or start < 1900 or end > 2026:
                raise ValueError(f"Invalid year range: {listing}")
        if listing["description"].count("(") != listing["description"].count(")"):
            raise ValueError(f"Unbalanced listing text: {listing}")
        if re.search(r"\b(?:19|20)\d{2}-\d\s+\d", listing["description"]):
            raise ValueError(f"Malformed year in listing text: {listing}")

    empty = [class_id for class_id, count in counts.items() if count == 0]
    if empty:
        raise ValueError(f"Classes with no extracted listings: {', '.join(empty)}")

    suspicious = [
        listing
        for listing in listings
        if class_heading(listing["manufacturer"])
        or re.match(r"^\d+ ", listing["manufacturer"])
    ]
    if suspicious:
        raise ValueError(f"Suspicious manufacturer headings: {suspicious[:5]}")

    print(
        "Extracted "
        + ", ".join(f"{class_id.upper()}={counts[class_id]}" for class_id in SEGMENTS)
    )


def main() -> None:
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    with pdfplumber.open(pdf_path) as pdf:
        listings = [
            listing
            for class_id in SEGMENTS
            for listing in extract_class(pdf, class_id)
        ]
    validate(listings)
    payload = {
        "rulesYear": 2026,
        "sourceUrl": RULEBOOK_URL,
        "sourceFile": pdf_path.name,
        "extractionPolicy": (
            "Reviewed physical page/column segments with typography-based "
            "manufacturer and wrapped-entry detection."
        ),
        "classes": [
            {
                "classId": class_id,
                "category": CATEGORY_BY_CLASS[class_id],
                "listingCount": sum(
                    listing["classId"] == class_id for listing in listings
                ),
            }
            for class_id in SEGMENTS
        ],
        "listings": listings,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", "utf-8")
    print(f"Wrote {len(listings)} official listings to {OUTPUT}")


if __name__ == "__main__":
    main()
