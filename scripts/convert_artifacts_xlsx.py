#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import sys
import zipfile
from collections import OrderedDict
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "wbrel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def col_to_index(cell_ref: str) -> int:
    letters = re.match(r"[A-Z]+", cell_ref)
    if not letters:
        return 0
    value = 0
    for ch in letters.group(0):
        value = value * 26 + (ord(ch) - 64)
    return value - 1


def read_zip_xml(zf: zipfile.ZipFile, name: str):
    try:
        return ET.fromstring(zf.read(name))
    except KeyError:
        return None


def load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    root = read_zip_xml(zf, "xl/sharedStrings.xml")
    if root is None:
        return []
    items: list[str] = []
    for si in root.findall("main:si", NS):
        parts = []
        for t in si.findall(".//main:t", NS):
            parts.append(t.text or "")
        items.append("".join(parts))
    return items


def load_workbook_sheet(zf: zipfile.ZipFile) -> tuple[str, str]:
    wb = read_zip_xml(zf, "xl/workbook.xml")
    rels = read_zip_xml(zf, "xl/_rels/workbook.xml.rels")
    if wb is None or rels is None:
        raise RuntimeError("Workbook structure missing")

    rel_map = {}
    for rel in rels.findall("rel:Relationship", NS):
        rel_map[rel.attrib["Id"]] = rel.attrib["Target"]

    first_sheet = wb.find("main:sheets/main:sheet", NS)
    if first_sheet is None:
        raise RuntimeError("No sheet found")
    sheet_name = first_sheet.attrib.get("name", "Sheet1")
    rel_id = first_sheet.attrib.get(f"{{{NS['wbrel']}}}id")
    target = rel_map.get(rel_id)
    if not target:
        raise RuntimeError("Sheet target not found")
    if not target.startswith("xl/"):
        target = f"xl/{target}"
    return sheet_name, target


def cell_value(cell, shared_strings: list[str]):
    cell_type = cell.attrib.get("t")
    v = cell.find("main:v", NS)
    if v is None or v.text is None:
        return None
    raw = v.text
    if cell_type == "s":
        idx = int(raw)
        return shared_strings[idx] if idx < len(shared_strings) else raw
    if cell_type == "b":
        return raw == "1"
    if cell_type == "inlineStr":
        t = cell.find(".//main:t", NS)
        return t.text if t is not None else ""
    if cell_type == "str":
        return raw
    if re.fullmatch(r"-?\d+(\.\d+)?", raw):
        num = float(raw)
        return int(num) if num.is_integer() else num
    return raw


def convert_xlsx(path: Path, out_dir: Path):
    with zipfile.ZipFile(path) as zf:
        shared_strings = load_shared_strings(zf)
        sheet_name, sheet_target = load_workbook_sheet(zf)
        root = read_zip_xml(zf, sheet_target)
        if root is None:
            raise RuntimeError(f"Missing sheet xml for {path}")

        rows_by_index: OrderedDict[int, list] = OrderedDict()
        for row in root.findall(".//main:row", NS):
            row_num = int(row.attrib.get("r", "0"))
            cells = []
            for cell in row.findall("main:c", NS):
                idx = col_to_index(cell.attrib.get("r", "A1"))
                while len(cells) <= idx:
                    cells.append(None)
                cells[idx] = cell_value(cell, shared_strings)
            rows_by_index[row_num] = cells

        if not rows_by_index:
            headers = []
            records = []
        else:
            ordered_rows = list(rows_by_index.values())
            headers = [str(h).strip() if h is not None else "" for h in ordered_rows[0]]
            records = []
            for row_cells in ordered_rows[1:]:
                obj = {}
                for i, header in enumerate(headers):
                    if not header:
                        continue
                    value = row_cells[i] if i < len(row_cells) else None
                    if value == "":
                        value = None
                    obj[header] = value
                if any(v is not None for v in obj.values()):
                    records.append(obj)

        report_type = path.stem
        m = re.match(r"Relatorio-([A-Za-z-]+)-Semana-", report_type)
        report_type = m.group(1).lower().replace("-", "_") if m else report_type.lower()
        payload = {
            "source_file": str(path).replace(str(Path.cwd()), "/app"),
            "folder_name": path.parent.name,
            "report_type": report_type,
            "sheet_name": sheet_name,
            "headers": headers,
            "rows": records,
        }

        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{path.stem}.json"
        out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return out_path


def main():
    root = Path.cwd()
    artifact_root = root / "artifacts"
    out_dir = artifact_root / "raw"
    xlsx_files = [p for p in artifact_root.rglob("*.xlsx") if "raw" not in p.parts]
    if not xlsx_files:
        print("No xlsx files found.")
        return 0
    count = 0
    for xlsx in xlsx_files:
        try:
            out_path = convert_xlsx(xlsx, out_dir)
            count += 1
            print(f"{xlsx} -> {out_path}")
        except Exception as exc:
            print(f"Failed {xlsx}: {exc}", file=sys.stderr)
    print(f"Converted {count} files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
