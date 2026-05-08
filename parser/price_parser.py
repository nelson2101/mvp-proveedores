from __future__ import annotations

import argparse
import os
import re
from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd
import pdfplumber
from rapidfuzz import fuzz, process
from supabase import create_client

SIMILARITY_THRESHOLD = 85


def parse_pdf(file_path: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with pdfplumber.open(file_path) as pdf:
      for page in pdf.pages:
          for table in page.extract_tables() or []:
              for row in table:
                  parsed = parse_row(row)
                  if parsed:
                      rows.append(parsed)
    return rows


def parse_excel(file_path: str) -> list[dict[str, Any]]:
    sheets = pd.read_excel(file_path, header=None, sheet_name=None)
    rows: list[dict[str, Any]] = []

    for df in sheets.values():
        for _, row in df.iterrows():
            parsed = parse_row(row.tolist())
            if parsed:
                rows.append(parsed)

    return rows


def parse_row(row: list[Any]) -> dict[str, Any] | None:
    cells = [str(cell).strip() for cell in row if cell is not None and str(cell).strip()]
    if len(cells) < 2:
        return None

    for index, cell in enumerate(cells):
        price = parse_price(cell)
        if price is None:
            continue

        product_name = cells[0] if index > 0 else cells[1]
        brand = extract_brand(product_name)
        return {
            "raw_name": product_name,
            "price": price,
            "brand": brand,
        }

    return None


def parse_price(value: str) -> float | None:
    candidate = re.sub(r"[^\d,.$]", "", value)
    if not candidate:
        return None

    candidate = candidate.replace("$", "")

    if "," in candidate and "." in candidate:
        candidate = candidate.replace(".", "").replace(",", ".")
    elif "," in candidate:
        candidate = candidate.replace(",", ".")

    try:
        price = float(candidate)
    except ValueError:
        return None

    return price if price > 0 else None


def extract_brand(raw_name: str) -> str | None:
    match = re.search(r"\b(Arcor|Marolio|Coca Cola|Manaos|Molto|La Serenisima)\b", raw_name, re.I)
    return match.group(1) if match else None


def normalize_product(raw_name: str, catalog: list[dict[str, Any]]) -> dict[str, Any] | None:
    names = [product["name"] for product in catalog]
    result = process.extractOne(raw_name, names, scorer=fuzz.token_sort_ratio)

    if not result:
        return None

    _, score, index = result
    if score >= SIMILARITY_THRESHOLD:
        return catalog[index]

    return None


def ingest_price_list(supplier_id: str, file_path: str, file_type: str) -> int:
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        raise RuntimeError("Faltan SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.")

    supabase = create_client(supabase_url, service_key)
    catalog = supabase.table("products").select("*").eq("is_active", True).execute().data

    extension = file_type.lower().lstrip(".")
    if extension == "pdf":
        raw_rows = parse_pdf(file_path)
    elif extension in {"xls", "xlsx"}:
        raw_rows = parse_excel(file_path)
    else:
        raise ValueError(f"Formato no soportado: {file_type}")

    supabase.table("price_lists").update({"is_current": False}).eq(
        "supplier_id", supplier_id
    ).execute()

    price_list = (
        supabase.table("price_lists")
        .insert(
            {
                "supplier_id": supplier_id,
                "valid_from": date.today().isoformat(),
                "is_current": True,
                "source_file": file_path,
            }
        )
        .execute()
        .data[0]
    )

    prices_to_insert: list[dict[str, Any]] = []
    for row in raw_rows:
        product = normalize_product(row["raw_name"], catalog)
        if not product:
            continue

        prices_to_insert.append(
            {
                "price_list_id": price_list["id"],
                "supplier_id": supplier_id,
                "product_id": product["id"],
                "price": row["price"],
                "unit": product["unit"],
                "brand": row.get("brand"),
            }
        )

    if prices_to_insert:
        supabase.table("prices").insert(prices_to_insert).execute()

    return len(prices_to_insert)


def main() -> None:
    parser = argparse.ArgumentParser(description="Parsea una lista de precios e inserta datos.")
    parser.add_argument("--supplier-id", required=True)
    parser.add_argument("--file", required=True)
    parser.add_argument("--type", choices=["pdf", "xls", "xlsx"], default=None)
    args = parser.parse_args()

    file_type = args.type or Path(args.file).suffix.lstrip(".")
    inserted = ingest_price_list(args.supplier_id, args.file, file_type)
    print(f"inserted={inserted}")


if __name__ == "__main__":
    main()
