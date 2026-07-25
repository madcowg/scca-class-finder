"""Import Solo Nationals class winners from official SCCA result PDFs.

The Pronto reports use a stable table layout. Parsing word coordinates keeps
the car and tire columns separate even when ordinary PDF text extraction
interleaves sponsors, regions, and run times.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = ROOT / "tmp" / "nationals"
OUTPUT = ROOT / "src" / "data" / "nationals-winners-2016-2025.json"
OCR_DEPENDENCIES = ROOT / "tmp" / "ocr"
OCR_YEARS = {2022, 2024}
TIRE_MANUFACTURERS = [
    "BFGoodrich",
    "Bridgestone",
    "Continental",
    "Dunlop",
    "Falken",
    "Goodyear",
    "Hoosier",
    "Kumho",
    "Michelin",
    "Nankang",
    "Nexen",
    "Pirelli",
    "Toyo",
    "Vitour",
    "Yokohama",
    "Avon",
    "Multi",
    "Other",
]

SOURCES = {
    2025: "https://www.scca.com/downloads/77334-2025-combined-official-class-results-w-protest/download",
    2024: "https://www.scca.com/downloads/73224-revised-official-class-results-w-protests-appeals/download",
    2023: "https://www.scca.com/downloads/69295-combined-official-class-results-w-protests/download",
    2022: "https://www.scca.com/downloads/64048-official-class-results-w-protest/download",
    2021: "https://www.scca.com/downloads/63415-2021-solo-nats-results-w-protest/download",
    2019: "https://www.scca.com/downloads/47295-2019-tire-rack-solo-nationals-official-class-result/download",
    2018: "https://www.scca.com/downloads/42353-2018-solo-nationals-official-class-results-combined/download",
    2017: "https://cdn.connectsites.net/user_files/scca/downloads/000/037/986/2017_Tire_Rack_SCCA_Solo_Nationals_Results.pdf",
    2016: "https://cdn.connectsites.net/user_files/scca/downloads/000/018/284/Nationals_10.14.pdf",
}

CLASS_IDS = {
    "super street": "ss",
    "a street": "as",
    "b street": "bs",
    "c street": "cs",
    "d street": "ds",
    "e street": "es",
    "f street": "fs",
    "g street": "gs",
    "h street": "hs",
    "super street r": "ssr",
    "super street touring": "sst",
    "a street touring": "ast",
    "b street touring": "bst",
    "c street touring": "cst",
    "d street touring": "dst",
    "e street touring": "est",
    "g street touring": "gst",
    "street touring sport": "sts",
    "street touring roadster": "str",
    "street touring ultra": "stu",
    "street touring xtreme": "stx",
    "street touring hatch": "sth",
    "street touring pony": "stp",
    "street touring pony car": "stp",
    "street touring fwd": "stf",
    "street touring r": "str",
    "super street prepared": "ssp",
    "a street prepared": "asp",
    "b street prepared": "bsp",
    "c street prepared": "csp",
    "d street prepared": "dsp",
    "e street prepared": "esp",
    "f street prepared": "fsp",
    "super street modified": "ssm",
    "street modified": "sm",
    "street modified fwd": "smf",
    "x prepared": "xp",
    "b prepared": "bp",
    "c prepared": "cp",
    "d prepared": "dp",
    "e prepared": "ep",
    "f prepared": "fp",
    "a modified": "am",
    "b modified": "bm",
    "c modified": "cm",
    "d modified": "dm",
    "e modified": "em",
    "f modified": "fm",
    "kart modified": "km",
    "formula junior a": "ja",
    "formula junior b": "jb",
    "formula junior c": "jc",
    "solo spec coupe": "ssc",
    "club spec mustang": "csm",
    "club spec mx 5": "csx",
    "classic american muscle contemporary": "camc",
    "classic american muscle classic": "camc",
    "classic american muscle traditional": "camt",
    "classic american muscle sport": "cams",
    "xtreme street a": "xa",
    "xtreme a": "xa",
    "xtreme street b": "xb",
    "xtreme b": "xb",
    "xtreme street s": "xs",
    "xtreme street unlimited": "xu",
    "electric vehicle experimental": "evx",
    "electric vehicle": "evx",
    "heritage classic race": "hcr",
    "heritage classic race tire": "hcr",
    "heritage classic street": "hcs",
    "formula sae": "fsae",
}

SKIP_CLASS_NAMES = {
    "",
    "index class 1",
    "kart modified electric",
    "ladies index",
    "masters index",
    "supplemental ladies index",
}


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("®", "")).strip()


def clean_tire_manufacturer(value: str) -> str | None:
    normalized = re.sub(r"[^a-z0-9]", "", value.lower())
    for manufacturer in TIRE_MANUFACTURERS:
        if re.sub(r"[^a-z0-9]", "", manufacturer.lower()) in normalized:
            return manufacturer
    return None


def normalized_class_name(value: str) -> tuple[str, str]:
    normalized = clean(value).lower().replace("-", " ").replace("~", "p")
    normalized = re.sub(r"\bpre ared\b", "prepared", normalized)
    normalized = re.sub(r"\btourin\b", "touring", normalized)
    normalized = re.sub(r"\bcontempory\b|\bcontem or\b", "contemporary", normalized)
    division = "open"
    if normalized.endswith(" ladies"):
        normalized = normalized.removesuffix(" ladies").strip()
        division = "ladies"
    compact = re.sub(r"[^a-z0-9]", "", normalized)
    if compact.endswith("ladies"):
        compact = compact.removesuffix("ladies")
        division = "ladies"
    for known_name in [*CLASS_IDS, *SKIP_CLASS_NAMES]:
        if compact == re.sub(r"[^a-z0-9]", "", known_name):
            normalized = known_name
            break
    return normalized, division


def grouped_lines(words: list[dict]) -> list[list[dict]]:
    lines: list[list[dict]] = []
    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        if not lines or abs(lines[-1][0]["top"] - word["top"]) > 1.8:
            lines.append([word])
        else:
            lines[-1].append(word)
    return [sorted(line, key=lambda item: item["x0"]) for line in lines]


def text_in_column(line: list[dict], start: float, end: float) -> str:
    return clean(" ".join(word["text"] for word in line if start <= word["x0"] < end))


def parse_text_pdf(year: int, path: Path) -> tuple[list[dict], set[str]]:
    records: list[dict] = []
    unknown_classes: set[str] = set()
    current_class: tuple[str, str] | None = None

    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            words = page.extract_words(x_tolerance=2, y_tolerance=3)
            for line in grouped_lines(words):
                line_text = clean(" ".join(word["text"] for word in line))
                if "Drivers:" in line_text or "Drivers :" in line_text:
                    if current_class is not None:
                        print(
                            f"  no winner row found before {year} page {page_number}: "
                            f"{current_class[0]} ({current_class[1]})"
                        )
                    heading = text_in_column(line, 0, 296)
                    class_name, division = normalized_class_name(heading)
                    if class_name in SKIP_CLASS_NAMES:
                        current_class = None
                    elif class_name in CLASS_IDS:
                        current_class = (CLASS_IDS[class_name], division)
                    else:
                        unknown_classes.add(class_name)
                        print(
                            f"  unmapped {year} page {page_number}: "
                            f"{heading!r} -> {class_name!r}"
                        )
                        current_class = None
                    continue

                if current_class is None:
                    continue
                position = (
                    text_in_column(line, 0, 42)
                    .lower()
                    .replace(" ", "")
                    .replace("|", "i")
                )
                if position not in {"1", "i", "l", "t1", "ti", "tl"}:
                    continue

                vehicle = text_in_column(line, 175, 296)
                tire = text_in_column(line, 296, 353)
                if not vehicle:
                    continue
                vehicle_year_match = re.match(r"^(19|20)\d{2}", vehicle)
                vehicle_year = (
                    int(vehicle_year_match.group(0)) if vehicle_year_match else None
                )
                vehicle_name = (
                    vehicle[vehicle_year_match.end() :].strip()
                    if vehicle_year_match
                    else vehicle
                )
                class_id, division = current_class
                records.append(
                    {
                        "eventYear": year,
                        "classId": class_id,
                        "division": division,
                        "vehicleYear": vehicle_year,
                        "vehicle": vehicle_name,
                        "tireManufacturer": clean_tire_manufacturer(tire),
                        "finish": 1,
                        "sourceUrl": SOURCES[year],
                    }
                )
                current_class = None

        if current_class is not None:
            print(
                f"  no winner row found at end of {year}: "
                f"{current_class[0]} ({current_class[1]})"
            )

    return records, unknown_classes


def ocr_lines(result: list, scale: float) -> list[list[dict]]:
    words = []
    for box, value, confidence in result or []:
        x0 = sum(point[0] for point in box) / (len(box) * scale)
        x1 = max(point[0] for point in box) / scale
        top = sum(point[1] for point in box) / (len(box) * scale)
        words.append(
            {
                "text": value,
                "x0": x0,
                "x1": x1,
                "top": top,
                "confidence": confidence,
            }
        )
    return grouped_lines(words)


def load_ocr_pages(year: int, path: Path) -> list[list]:
    cache_path = INPUT_DIR / f"{year}-ocr-cache.json"
    if cache_path.exists():
        return json.loads(cache_path.read_text(encoding="utf-8"))

    if not OCR_DEPENDENCIES.exists():
        raise RuntimeError(
            "OCR dependencies are missing. Install rapidocr-onnxruntime into "
            f"{OCR_DEPENDENCIES} before importing scanned result PDFs."
        )

    sys.path.insert(0, str(OCR_DEPENDENCIES))
    import numpy as np
    import pypdfium2 as pdfium
    from rapidocr_onnxruntime import RapidOCR

    scale = 1.5
    engine = RapidOCR()
    document = pdfium.PdfDocument(path)
    pages: list[list] = []
    for index, page in enumerate(document):
        image = page.render(scale=scale).to_pil()
        result, _ = engine(np.asarray(image))
        pages.append(
            [
                [
                    box.tolist() if hasattr(box, "tolist") else box,
                    value,
                    float(confidence),
                ]
                for box, value, confidence in (result or [])
            ]
        )
        if (index + 1) % 10 == 0 or index + 1 == len(document):
            print(f"  {year}: OCR page {index + 1}/{len(document)}")

    cache_path.write_text(json.dumps(pages), encoding="utf-8")
    return pages


def parse_ocr_pdf(year: int, path: Path) -> tuple[list[dict], set[str]]:
    records: list[dict] = []
    unknown_classes: set[str] = set()
    scale = 1.5

    for page_number, result in enumerate(load_ocr_pages(year, path), start=1):
        lines = ocr_lines(result, scale)
        current_class: tuple[str, str] | None = None
        for line in lines:
            line_text = clean(" ".join(word["text"] for word in line))
            compact_line = re.sub(r"\s+", "", line_text.lower())
            if "drivers:" in compact_line:
                heading = text_in_column(line, 0, 296)
                heading = re.split(r"\bDrivers\s*:", heading, maxsplit=1, flags=re.I)[0]
                class_name, division = normalized_class_name(heading)
                if class_name in SKIP_CLASS_NAMES:
                    current_class = None
                elif class_name in CLASS_IDS:
                    current_class = (CLASS_IDS[class_name], division)
                else:
                    unknown_classes.add(class_name)
                    current_class = None
                    print(
                        f"  unmapped OCR {year} page {page_number}: "
                        f"{heading!r} -> {class_name!r}"
                    )
                continue

            if current_class is None:
                continue
            position = clean(text_in_column(line, 0, 60)).lower().replace(" ", "")
            if position not in {"1", "t1"}:
                continue

            vehicle = text_in_column(line, 175, 296)
            tire = text_in_column(line, 296, 353)
            if not vehicle:
                continue
            vehicle_year_match = re.match(r"^(19|20)\d{2}", vehicle)
            vehicle_year = (
                int(vehicle_year_match.group(0)) if vehicle_year_match else None
            )
            vehicle_name = (
                vehicle[vehicle_year_match.end() :].strip()
                if vehicle_year_match
                else vehicle
            )
            class_id, division = current_class
            records.append(
                {
                    "eventYear": year,
                    "classId": class_id,
                    "division": division,
                    "vehicleYear": vehicle_year,
                    "vehicle": vehicle_name,
                    "tireManufacturer": clean_tire_manufacturer(tire),
                    "finish": 1,
                    "sourceUrl": SOURCES[year],
                }
            )
            current_class = None

    return records, unknown_classes


def main() -> None:
    years = [int(argument) for argument in sys.argv[1:]] or sorted(SOURCES)
    records: list[dict] = []
    unknown_classes: set[str] = set()

    for year in years:
        path = INPUT_DIR / f"{year}.pdf"
        if not path.exists():
            raise FileNotFoundError(f"Missing official result PDF: {path}")
        parser = parse_ocr_pdf if year in OCR_YEARS else parse_text_pdf
        year_records, year_unknown = parser(year, path)
        records.extend(year_records)
        unknown_classes.update(year_unknown)
        print(f"{year}: parsed {len(year_records)} class winners")

    if unknown_classes:
        raise ValueError(f"Unmapped class headings: {sorted(unknown_classes)}")

    records.sort(
        key=lambda record: (
            -record["eventYear"],
            record["classId"],
            record["division"],
        )
    )
    payload = {
        "eventYears": sorted(years),
        "cancelledYears": [2020],
        "sourceArchive": "https://www.scca.com/pages/solo-archives",
        "policy": (
            "Official class winners only. Vehicle text and tire manufacturer are "
            "transcribed from the published result columns; tire size and model are "
            "not present in these reports. A winner row is omitted when the official "
            "report does not publish any vehicle text because it cannot support a "
            "vehicle-competitiveness claim."
        ),
        "records": records,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} records to {OUTPUT}")


if __name__ == "__main__":
    main()
