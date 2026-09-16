from __future__ import annotations

import re
from datetime import date
from dataclasses import dataclass
from typing import Any


THAI_MONTHS = {
    "มกราคม": 1,
    "กุมภาพันธ์": 2,
    "มีนาคม": 3,
    "เมษายน": 4,
    "พฤษภาคม": 5,
    "มิถุนายน": 6,
    "กรกฎาคม": 7,
    "สิงหาคม": 8,
    "กันยายน": 9,
    "ตุลาคม": 10,
    "พฤศจิกายน": 11,
    "ธันวาคม": 12,
}


@dataclass(frozen=True)
class FieldSuggestion:
    value: Any
    confidence: float
    source: str


def parse_expense_fields(
    raw_text: str,
    document_type: str | None = None,
    lines: list[dict[str, Any]] | None = None,
) -> dict[str, FieldSuggestion]:
    doc_type = (document_type or "Other").strip()
    text_lines = normalize_lines(raw_text, lines)

    if doc_type == "PaymentOrder":
        return parse_payment_order(raw_text, text_lines)
    if doc_type == "Receipt":
        return parse_receipt(raw_text, text_lines)

    fields = {}
    fields.update(parse_common_fields(raw_text, text_lines))
    fields.update(parse_receipt(raw_text, text_lines))
    fields.update(parse_payment_order(raw_text, text_lines))
    return fields


def parse_payment_order(raw_text: str, lines: list[dict[str, Any]]) -> dict[str, FieldSuggestion]:
    text = raw_text or ""
    fields = parse_common_fields(text, lines)

    bill_no = re.search(r"\bFB[-\s]?CM\s*\d{4}[-\s]?\d{4,5}\b", text, re.IGNORECASE)
    if bill_no:
        fields["billNo"] = suggestion(normalize_bill_no(bill_no.group(0)), 0.9, "payment-order-bill-no")

    thai_date = parse_thai_date(lines)
    if thai_date:
        fields["expenseDate"] = suggestion(thai_date, 0.82, "payment-order-thai-date")

    for item in lines:
        line = item["text"]
        driver_match = re.search(r"(?:ชื่อ|ซื่อ)\s*(?:พขร|ผู้ขับ|คนขับ)\.?\s*:?\s*(.+)", line, re.IGNORECASE)
        if driver_match and clean_text(driver_match.group(1)):
            fields["driverName"] = suggestion(clean_text(driver_match.group(1)), item_confidence(item, 0.72), "payment-order-driver-inline")
            break

    if "driverName" not in fields:
        for index, item in enumerate(lines):
            if re.search(r"(?:ชื่อ|ซื่อ)\s*(?:พขร|ผู้ขับ|คนขับ)", item["text"], re.IGNORECASE):
                next_value = next_meaningful_line(lines, index)
                if next_value and looks_like_thai_name(next_value["text"]):
                    fields["driverName"] = suggestion(clean_text(next_value["text"]), item_confidence(next_value, 0.7), "payment-order-driver-next-line")
                    break

    vehicle_plate = re.search(
        r"เบอร์รถ\s*:?\s*(\d{2,3}[-\s]\d{3})\s*(?:ทะเบียนรถ|ทะเบียน)\s*:?\s*(\d{2}[-\s]\d{4})",
        text,
        re.IGNORECASE,
    )
    if vehicle_plate:
        fields["vehicleNo"] = suggestion(normalize_dash(vehicle_plate.group(1)), 0.9, "payment-order-vehicle-inline")
        fields["plateNo"] = suggestion(normalize_dash(vehicle_plate.group(2)), 0.9, "payment-order-plate-inline")
    else:
        numbers = re.findall(r"\b\d{2,3}[-\s]\d{3,4}\b", text)
        for value in numbers:
            normalized = normalize_dash(value)
            if re.fullmatch(r"\d{3}-\d{3}", normalized) and "vehicleNo" not in fields:
                fields["vehicleNo"] = suggestion(normalized, 0.72, "payment-order-vehicle-pattern")
            elif re.fullmatch(r"\d{2}-\d{4}", normalized) and "plateNo" not in fields:
                fields["plateNo"] = suggestion(normalized, 0.72, "payment-order-plate-pattern")

    parse_transport_table(lines, fields)
    parse_transport_text(lines, fields)
    parse_fuel_liters(text, lines, fields)
    return fields


def parse_receipt(raw_text: str, lines: list[dict[str, Any]]) -> dict[str, FieldSuggestion]:
    text = raw_text or ""
    fields = parse_common_fields(text, lines)

    receipt_date = parse_receipt_date(text, lines)
    if receipt_date:
        fields["expenseDate"] = suggestion(receipt_date, 0.88, "receipt-date-label")

    for field, pattern in {
        "receiptTid": r"\bTID[:\s]*(\d+)",
        "receiptBatch": r"\bBATCH[:\s]*(\d+)",
        "receiptMid": r"\bMID[:\s]*(\d+)",
        "receiptTrace": r"\bTRACE[:\s]*(\d+)",
    }.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields[field] = suggestion(match.group(1), 0.88, f"receipt-{field}")

    merchant = parse_merchant_name(text, lines)
    if merchant:
        fields["merchantName"] = suggestion(merchant, 0.78, "receipt-merchant-lines")

    amount = parse_amount(text, lines)
    if amount is not None:
        fields["amount"] = suggestion(amount, 0.86, "receipt-total-amount")

    return fields


def parse_common_fields(raw_text: str, lines: list[dict[str, Any]]) -> dict[str, FieldSuggestion]:
    fields: dict[str, FieldSuggestion] = {}
    text = raw_text or ""

    date_match = re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", text)
    if date_match:
        normalized_date = normalize_date(date_match.group(1))
        if normalized_date:
            fields["expenseDate"] = suggestion(normalized_date, 0.8, "regex-date")

    liter_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:ลิตร|liter|litre|\bL\b)", text, re.IGNORECASE)
    if liter_match:
        fields["fuelLiters"] = suggestion(number_value(liter_match.group(1)), 0.78, "regex-liter")

    return fields


def parse_transport_table(lines: list[dict[str, Any]], fields: dict[str, FieldSuggestion]) -> None:
    for index, item in enumerate(lines):
        value = item["text"].strip()
        if not re.fullmatch(r"\d{9,10}", value):
            continue
        if not nearby_header(lines, index, "ใบขนส่ง"):
            continue
        if not has_bbox(item):
            continue

        fields["transportNo"] = suggestion(value, item_confidence(item, 0.84), "payment-order-transport-row")
        row = row_neighbors(lines, item)
        right_values = [line for line in row if center_x(line) > center_x(item) + 20]
        text_values = [
            clean_text(line["text"])
            for line in right_values
            if clean_text(line["text"]) and not looks_like_payment_table_label(line["text"])
        ]
        if text_values:
            fields["origin"] = suggestion(text_values[0], item_confidence(right_values[0], 0.62), "payment-order-origin-row")
        if len(text_values) > 1:
            fields["customerName"] = suggestion(text_values[1], item_confidence(right_values[1], 0.58), "payment-order-customer-row")

        numeric_after = [line for line in right_values if re.fullmatch(r"\d+(?:\.\d+)?", line["text"].strip())]
        if numeric_after:
            fields["tripCount"] = suggestion(int(float(numeric_after[0]["text"])), item_confidence(numeric_after[0], 0.7), "payment-order-trip-row")
        if len(numeric_after) > 1:
            fields["fuelLiters"] = suggestion(number_value(numeric_after[1]["text"]), item_confidence(numeric_after[1], 0.76), "payment-order-fuel-row")
        return


def parse_transport_text(lines: list[dict[str, Any]], fields: dict[str, FieldSuggestion]) -> None:
    if "transportNo" in fields:
        return

    for index, item in enumerate(lines):
        value = item["text"].strip()
        if not re.fullmatch(r"\d{8,10}", value):
            continue
        if not nearby_header(lines, index, "ใบขนส่ง"):
            continue

        fields["transportNo"] = suggestion(value, item_confidence(item, 0.72), "payment-order-transport-sequence")
        values = [
            clean_text(line["text"])
            for line in lines[index + 1 : index + 9]
            if clean_text(line["text"]) and not looks_like_payment_table_label(line["text"])
        ]
        text_values = [line for line in values if re.search(r"[ก-๙A-Za-z]", line)]
        numeric_values = [number_value(line) for line in values if re.fullmatch(r"\d+(?:\.\d+)?", line)]

        if text_values:
            fields["origin"] = suggestion(text_values[0], 0.56, "payment-order-origin-sequence")
        if len(text_values) > 1:
            fields["customerName"] = suggestion(text_values[1], 0.54, "payment-order-customer-sequence")

        trip_candidates = [value for value in numeric_values if float(value) <= 20]
        fuel_candidates = [value for value in numeric_values if 20 <= float(value) <= 1000]
        if trip_candidates:
            fields["tripCount"] = suggestion(int(float(trip_candidates[0])), 0.62, "payment-order-trip-sequence")
        if fuel_candidates:
            fields["fuelLiters"] = suggestion(fuel_candidates[-1], 0.66, "payment-order-fuel-sequence")
        return


def parse_fuel_liters(raw_text: str, lines: list[dict[str, Any]], fields: dict[str, FieldSuggestion]) -> None:
    if "fuelLiters" in fields:
        return

    for index, item in enumerate(lines):
        if re.search(r"น้ำมัน.*(?:ใช้|ใน้|เติม|เดิม)|ลิตร", item["text"], re.IGNORECASE):
            row = row_neighbors(lines, item, tolerance=28)
            numbers = [
                number_value(line["text"])
                for line in row
                if center_x(line) > center_x(item) and re.fullmatch(r"\d+(?:\.\d+)?", line["text"].strip())
            ]
            if numbers:
                fields["fuelLiters"] = suggestion(numbers[-1], 0.7, "payment-order-fuel-near-label")
                return


def parse_amount(raw_text: str, lines: list[dict[str, Any]]) -> int | float | None:
    text = raw_text or ""
    inline = re.search(r"(?:TOTAL|SALE|AMOUNT|รวม)[^\d]{0,20}(\d{1,3}(?:\s*,\s*\d{3})*(?:\.\d{2})?)", text, re.IGNORECASE)
    if inline:
        return number_value(inline.group(1))

    for index, item in enumerate(lines):
        if re.search(r"TOTAL|รวม|ยอด", item["text"], re.IGNORECASE):
            row = row_neighbors(lines, item, tolerance=26)
            right_numbers = [
                number_value(line["text"])
                for line in row
                if center_x(line) > center_x(item) and looks_like_money(line["text"])
            ]
            if right_numbers:
                return right_numbers[0]

            next_line = next_meaningful_line(lines, index)
            if next_line and looks_like_money(next_line["text"]):
                return number_value(next_line["text"])

    candidates = [number_value(match.group(0)) for match in re.finditer(r"\d{1,3}(?:\s*,\s*\d{3})+\.\d{2}", text)]
    return candidates[0] if candidates else None


def parse_merchant_name(raw_text: str, lines: list[dict[str, Any]]) -> str | None:
    raw_match = re.search(
        r"\b(PTTST\.?\s*D\s*VT\s+GROUP\s*\(2013\)\s*SARABURI)\b",
        raw_text,
        re.IGNORECASE,
    )
    if raw_match:
        return re.sub(r"\s+", " ", raw_match.group(1)).strip().upper()

    for index, item in enumerate(lines):
        text = clean_text(item["text"])
        if re.search(r"\bPTT|BANGCHAK|SHELL|CALTEX|ESSO|BSRC|ปตท", text, re.IGNORECASE):
            parts = [text]
            next_line = next_meaningful_line(lines, index)
            if next_line:
                next_text = clean_text(next_line["text"])
                if re.fullmatch(r"[A-Z .'-]{3,}", next_text):
                    parts.append(next_text)
            return " ".join(parts)
    return None


def parse_receipt_date(raw_text: str, lines: list[dict[str, Any]]) -> str | None:
    text = raw_text or ""
    inline = re.search(r"\bDATE\s*[:.]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", text, re.IGNORECASE)
    if inline:
        normalized = normalize_date(inline.group(1))
        if normalized:
            return normalized

    for index, item in enumerate(lines):
        if not re.search(r"\bDATE\b|วันที่", item["text"], re.IGNORECASE):
            continue
        window = " ".join(line["text"] for line in lines[index : index + 3])
        match = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", window)
        if match:
            normalized = normalize_date(match.group(1))
            if normalized:
                return normalized
    return None


def parse_thai_date(lines: list[dict[str, Any]]) -> str | None:
    for index, item in enumerate(lines):
        if not re.search(r"วันที่|วันที|เดือน|พ\.?\s*ศ\.?|ค\.?\s*ศ\.?", item["text"]):
            continue

        window = " ".join(line["text"] for line in lines[index : index + 6])
        direct_match = re.search(
            r"(?:วันที่|วันที)\s*(\d{1,2}).{0,80}?เดือน\s*([ก-๙]+).{0,80}?(?:พ\.?\s*ศ\.?|ค\.?\s*ศ\.?)\s*(\d{4})",
            window,
        )
        if direct_match:
            day = int(direct_match.group(1))
            month = thai_month_number(direct_match.group(2))
            year = normalize_year(direct_match.group(3))
            normalized = build_date(year, month, day)
            if normalized:
                return normalized

        day_match = re.search(r"(?:วันที่|วันที)\s*(\d{1,2})", window)
        if not day_match:
            continue
        day = int(day_match.group(1))

        month = thai_month_number(window)
        year_match = re.search(r"(?:พ\.?\s*ศ\.?|ค\.?\s*ศ\.?)\s*(\d{4})", window)
        year = normalize_year(year_match.group(1)) if year_match else None
        if year is None:
            for candidate in re.findall(r"\b(?:20\d{2}|25\d{2})\b", window):
                year = normalize_year(candidate)
                if year:
                    break

        normalized = build_date(year, month, day)
        if normalized:
            return normalized
    return None


def normalize_lines(raw_text: str, lines: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    if lines:
        return [
            {**line, "text": str(line.get("text") or "").strip()}
            for line in lines
            if str(line.get("text") or "").strip()
        ]
    return [
        {"text": line.strip(), "confidence": None, "bbox": None}
        for line in (raw_text or "").splitlines()
        if line.strip()
    ]


def next_meaningful_line(lines: list[dict[str, Any]], index: int) -> dict[str, Any] | None:
    for line in lines[index + 1 :]:
        text = clean_text(line["text"])
        if text and not re.fullmatch(r"[:.\-_/\\]+", text):
            return line
    return None


def nearby_header(lines: list[dict[str, Any]], index: int, keyword: str) -> bool:
    start = max(0, index - 8)
    return any(keyword in line["text"] for line in lines[start:index])


def row_neighbors(lines: list[dict[str, Any]], anchor: dict[str, Any], tolerance: int = 22) -> list[dict[str, Any]]:
    anchor_y = center_y(anchor)
    return sorted(
        [line for line in lines if abs(center_y(line) - anchor_y) <= tolerance],
        key=center_x,
    )


def center_x(line: dict[str, Any]) -> float:
    bbox = line.get("bbox")
    if isinstance(bbox, list) and len(bbox) >= 4 and all(isinstance(v, (int, float)) for v in bbox[:4]):
        return (float(bbox[0]) + float(bbox[2])) / 2
    return 0


def center_y(line: dict[str, Any]) -> float:
    bbox = line.get("bbox")
    if isinstance(bbox, list) and len(bbox) >= 4 and all(isinstance(v, (int, float)) for v in bbox[:4]):
        return (float(bbox[1]) + float(bbox[3])) / 2
    return 0


def has_bbox(line: dict[str, Any]) -> bool:
    bbox = line.get("bbox")
    return isinstance(bbox, list) and len(bbox) >= 4 and all(isinstance(v, (int, float)) for v in bbox[:4])


def item_confidence(item: dict[str, Any], fallback: float) -> float:
    value = item.get("confidence")
    return round(float(value), 4) if isinstance(value, (int, float)) and value > 0 else fallback


def suggestion(value: Any, confidence: float, source: str) -> FieldSuggestion:
    return FieldSuggestion(value=value, confidence=round(confidence, 4), source=source)


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("_", " ")).strip(" :.-")


def normalize_dash(value: str) -> str:
    normalized = value.replace("–", "-").replace("—", "-").strip()
    normalized = re.sub(r"\s*-\s*", "-", normalized)
    normalized = re.sub(r"\s+", "-", normalized)
    return normalized


def normalize_bill_no(value: str) -> str:
    normalized = normalize_dash(value).upper()
    match = re.search(r"FB-?CM-?(\d{4})-?(\d{4,5})", normalized)
    if match:
        return f"FB-CM{match.group(1)}-{match.group(2)}"
    return normalized


def normalize_date(value: str) -> str | None:
    value = value.strip()
    match = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", value)
    if not match:
        return None
    day, month, year = match.groups()
    return build_date(normalize_year(year), int(month), int(day))


def thai_month_number(value: str) -> int | None:
    compact = re.sub(r"\s+", "", value)
    for name, month_number in THAI_MONTHS.items():
        if name in compact:
            return month_number
    return None


def normalize_year(value: str | None) -> int | None:
    if not value:
        return None
    year = int(value)
    if year < 100:
        year += 2000
    if year > 2400:
        year -= 543
    return year if 2000 <= year <= 2100 else None


def build_date(year: int | None, month: int | None, day: int | None) -> str | None:
    if year is None or month is None or day is None:
        return None
    try:
        parsed = date(year, month, day)
    except ValueError:
        return None
    return parsed.isoformat()


def number_value(value: str) -> int | float:
    normalized = re.sub(r"\s+", "", value).replace(",", "")
    numeric = float(normalized)
    return int(numeric) if numeric.is_integer() else numeric


def looks_like_money(value: str) -> bool:
    return bool(re.fullmatch(r"\s*\d{1,3}(?:\s*,\s*\d{3})*(?:\.\d{2})\s*", value))


def looks_like_thai_name(value: str) -> bool:
    text = clean_text(value)
    return bool(re.search(r"[ก-๙]", text)) and not re.search(r"เลข|วันที่|เบอร์|ทะเบียน|ต้นทาง|ลูกค้า", text)


def looks_like_payment_table_label(value: str) -> bool:
    return bool(re.search(r"เลขที่ใบขนส่ง|ต้นทาง|ดันทาง|ชื่อ|ซื่อ|ลูกค้า|จำนวน|เที่ยว|น้ำมัน|รวม", value))
