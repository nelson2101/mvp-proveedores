#!/usr/bin/env python3
"""
Automated SEPA Mayoristas ETL Pipeline

This script automatically:
1. Discovers the latest SEPA ZIP from the dataset page
2. Downloads and extracts it
3. Filters relevant products
4. Normalizes product names using fuzzy matching
5. Inserts data into Supabase

Run daily via cron or GitHub Actions.
"""

import argparse
import io
import json
import logging
import os
import re
import tempfile
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup
from rapidfuzz import fuzz, process
from supabase import create_client

# Configuration
DATASET_URL = "https://datos.produccion.gob.ar/dataset/precios-claros-sepa-mayoristas"
SIMILARITY_THRESHOLD = 85
LOG_FORMAT = "%(asctime)s - %(levelname)s - %(message)s"

# Relevant product categories (based on existing filter logic)
RELEVANT_PRODUCTS = {
    "aceite": {
        "include": [r"^aceite\b", r"\baceite\s+(girasol|maiz|mezcla|oliva|canola)\b"],
        "exclude": [r"\b(aerosol|esencial|corporal)\b", r"\b(en aceite|al aceite|sardina|atun|caballa|calamar|conserva)\b"],
    },
    "harina": {"include": [r"\bharina\b"], "exclude": []},
    "azucar": {"include": [r"\bazucar\b"], "exclude": []},
    "arroz": {"include": [r"\barroz\b"], "exclude": []},
    "fideos": {"include": [r"\bfideos?\b", r"\btallarines?\b", r"\bspaghetti\b"], "exclude": []},
    "yerba-mate": {"include": [r"\byerba\b"], "exclude": []},
    "leche": {"include": [r"\bleche\b"], "exclude": [r"\b(chocolatada|postre|crema|dulce de leche)\b"]},
    "gaseosas": {
        "include": [r"\bgaseosas?\b", r"\bcoca cola\b", r"\bpepsi\b", r"\bsprite\b", r"\bfanta\b", r"\bseven up\b", r"\b7up\b", r"\bmanaos\b", r"\bmirinda\b", r"\bschweppes\b"],
        "exclude": [r"\b(jugo|agua|soda|energizante)\b"],
    },
    "cerveza": {"include": [r"\bcervezas?\b"], "exclude": []},
    "agua-mineral": {"include": [r"\bagua mineral\b", r"\bagua sin gas\b", r"\bagua con gas\b"], "exclude": [r"\bsaborizada\b"]},
    "detergente": {"include": [r"\bdetergente\b"], "exclude": []},
    "papel-higienico": {"include": [r"\bpapel higienico\b"], "exclude": []},
}


def setup_logging(log_file: Path) -> None:
    """Setup logging to file and console."""
    logging.basicConfig(
        level=logging.INFO,
        format=LOG_FORMAT,
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(),
        ],
    )


def normalize_text(text: str) -> str:
    """Normalize text for matching."""
    if not text:
        return ""
    # Remove accents and lowercase
    import unicodedata
    decomposed = unicodedata.normalize("NFKD", text)
    ascii_text = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", ascii_text.casefold()).strip()


def compile_rules(raw_rules: Dict[str, Dict[str, List[str]]]) -> List[Dict[str, Any]]:
    """Compile regex patterns for product matching."""
    rules = []
    for slug, rule in raw_rules.items():
        rules.append({
            "slug": slug,
            "include": [re.compile(pattern, re.IGNORECASE) for pattern in rule["include"]],
            "exclude": [re.compile(pattern, re.IGNORECASE) for pattern in rule.get("exclude", [])],
        })
    return rules


def match_product(description: str, rules: List[Dict[str, Any]]) -> Optional[str]:
    """Match product description to category."""
    text = normalize_text(description)
    for rule in rules:
        if any(pattern.search(text) for pattern in rule["exclude"]):
            continue
        if any(pattern.search(text) for pattern in rule["include"]):
            return rule["slug"]
    return None


def discover_latest_zip() -> Optional[Dict[str, str]]:
    """Discover the latest SEPA ZIP from the dataset page."""
    logging.info("Discovering latest SEPA ZIP...")
    try:
        response = requests.get(DATASET_URL, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")

        # Find all ZIP links
        zip_links = []
        for link in soup.find_all("a", href=True):
            href = link["href"]
            if href.endswith(".zip") and "sepa" in href.lower():
                # Extract date from filename (e.g., sepa_viernes.zip -> viernes)
                match = re.search(r"sepa_(\w+)\.zip", href, re.IGNORECASE)
                if match:
                    day_name = match.group(1).lower()
                    # Map to date (assuming current week)
                    days_map = {
                        "lunes": 0, "martes": 1, "miercoles": 2, "jueves": 3,
                        "viernes": 4, "sabado": 5, "domingo": 6
                    }
                    if day_name in days_map:
                        today = datetime.now()
                        day_offset = days_map[day_name] - today.weekday()
                        if day_offset > 0:
                            day_offset -= 7  # Previous week
                        date = today + timedelta(days=day_offset)
                        zip_links.append({
                            "url": urljoin(DATASET_URL, href),
                            "filename": href.split("/")[-1],
                            "date": date.date().isoformat(),
                        })

        if not zip_links:
            logging.warning("No ZIP links found")
            return None

        # Sort by date descending and pick latest
        latest = max(zip_links, key=lambda x: x["date"])
        logging.info(f"Latest ZIP: {latest['filename']} ({latest['date']})")
        return latest

    except Exception as e:
        logging.error(f"Failed to discover ZIP: {e}")
        return None


def download_zip(zip_info: Dict[str, str], temp_dir: Path) -> Optional[Path]:
    """Download the ZIP file."""
    logging.info(f"Downloading {zip_info['url']}...")
    try:
        response = requests.get(zip_info["url"], timeout=300)
        response.raise_for_status()

        zip_path = temp_dir / zip_info["filename"]
        with open(zip_path, "wb") as f:
            f.write(response.content)

        logging.info(f"Downloaded to {zip_path}")
        return zip_path

    except Exception as e:
        logging.error(f"Failed to download ZIP: {e}")
        return None


def extract_zip(zip_path: Path, temp_dir: Path) -> Optional[Path]:
    """Extract ZIP and find CSV. Handles nested ZIPs."""
    logging.info("Extracting ZIP...")
    try:
        with zipfile.ZipFile(zip_path) as zf:
            # List all files in ZIP
            logging.info("Files in ZIP:")
            for file_info in zf.filelist:
                logging.info(f"  {file_info.filename}")

            zf.extractall(temp_dir / "extracted")

        # Check if there are nested ZIPs
        nested_zips = list((temp_dir / "extracted").rglob("*.zip"))
        if nested_zips:
            logging.info(f"Found {len(nested_zips)} nested ZIPs")
            # List all ZIP names for debugging
            for z in nested_zips:
                logging.info(f"  Available ZIP: {z.name}")

            # Try to find one with product data by extracting and checking
            for zip_path in nested_zips[:3]:  # Try first 3 ZIPs
                logging.info(f"Trying ZIP: {zip_path.name}")
                try:
                    with zipfile.ZipFile(zip_path) as zf:
                        zf.extractall(temp_dir / f"test_{zip_path.name}")
                    csv_files = list((temp_dir / f"test_{zip_path.name}").rglob("*.csv"))
                    if csv_files:
                        csv_path = csv_files[0]
                        # Check if it has product columns
                        df_sample = pd.read_csv(csv_path, nrows=1)
                        if 'producto_descripcion' in df_sample.columns:
                            logging.info(f"Found product CSV in: {zip_path.name}")
                            return csv_path
                        else:
                            logging.info(f"ZIP {zip_path.name} has columns: {list(df_sample.columns)}")
                except Exception as e:
                    logging.warning(f"Failed to check {zip_path.name}: {e}")

            # Fallback: use the first ZIP
            logging.warning("No product ZIP found, using first available")
            latest_nested = nested_zips[0]
            with zipfile.ZipFile(latest_nested) as zf:
                zf.extractall(temp_dir / "nested_extracted")

            csv_files = list((temp_dir / "nested_extracted").rglob("*.csv"))
            if csv_files:
                csv_path = csv_files[0]
                logging.info(f"Using fallback CSV: {csv_path}")
                return csv_path

        # Fallback: look for CSV in main extraction
        csv_files = list((temp_dir / "extracted").rglob("*.csv"))
        if not csv_files:
            logging.error("No CSV found in ZIP")
            # List all files extracted
            all_files = list((temp_dir / "extracted").rglob("*"))
            logging.info("All extracted files:")
            for f in all_files:
                if f.is_file():
                    logging.info(f"  {f}")
            return None

        csv_path = csv_files[0]  # Assume first CSV
        logging.info(f"Found CSV: {csv_path}")
        return csv_path

    except Exception as e:
        logging.error(f"Failed to extract ZIP: {e}")
        return None


def load_and_filter_csv(csv_path: Path, rules: List[Dict[str, Any]]) -> pd.DataFrame:
    """Load CSV and filter relevant products."""
    logging.info("Loading and filtering CSV...")
    try:
        # Read CSV (assuming | delimiter based on existing code)
        df = pd.read_csv(csv_path, delimiter="|", low_memory=False)

        logging.info(f"Columns: {list(df.columns)}")
        logging.info(f"Total rows: {len(df)}")

        # Filter for relevant products
        if "producto_descripcion" not in df.columns:
            logging.error("Missing 'producto_descripcion' column")
            return pd.DataFrame()

        df["categoria"] = df["producto_descripcion"].apply(lambda x: match_product(str(x), rules))
        df_filtered = df[df["categoria"].notna()]

        logging.info(f"Filtered rows: {len(df_filtered)}")
        return df_filtered

    except Exception as e:
        logging.error(f"Failed to load/filter CSV: {e}")
        return pd.DataFrame()


def normalize_products(df: pd.DataFrame, catalog: List[Dict[str, Any]]) -> pd.DataFrame:
    """Normalize product names using fuzzy matching."""
    logging.info("Normalizing products...")
    if catalog:
        product_names = [p["name"] for p in catalog]
        df["normalized_product"] = df["producto_descripcion"].apply(
            lambda desc: process.extractOne(str(desc), product_names, scorer=fuzz.token_sort_ratio)
        )
        # Filter by threshold
        df = df[df["normalized_product"].apply(lambda x: x[1] >= SIMILARITY_THRESHOLD if x else False)]
        df["product_id"] = df["normalized_product"].apply(lambda x: catalog[x[2]]["id"] if x else None)
        df["product_name"] = df["normalized_product"].apply(lambda x: catalog[x[2]]["name"] if x else None)
        df["category"] = df["normalized_product"].apply(lambda x: catalog[x[2]]["category"] if x else None)
        df["unit"] = df["normalized_product"].apply(lambda x: catalog[x[2]]["unit"] if x else None)
    else:
        logging.warning("No product catalog available, skipping normalization")

    return df


def insert_to_supabase(df: pd.DataFrame, supabase: Any, zip_info: Dict[str, str]) -> None:
    """Insert filtered data into Supabase."""
    logging.info("Inserting to Supabase...")

    try:
        # Create or get supplier (assuming global SEPA supplier)
        supplier_name = "SEPA Mayoristas"
        supplier_slug = "sepa-mayoristas"

        supplier = supabase.table("suppliers").select("*").eq("slug", supplier_slug).execute()
        if not supplier.data:
            supplier = supabase.table("suppliers").insert({
                "name": supplier_name,
                "slug": supplier_slug,
                "is_global": True,
                "source_type": "scraping",
                "source_url": DATASET_URL,
            }).execute()
        supplier_id = supplier.data[0]["id"]

        # Mark old price lists as not current
        supabase.table("price_lists").update({"is_current": False}).eq("supplier_id", supplier_id).execute()

        # Create new price list
        price_list = supabase.table("price_lists").insert({
            "supplier_id": supplier_id,
            "valid_from": zip_info["date"],
            "is_current": True,
            "source_file": zip_info["filename"],
        }).execute().data[0]

        # Prepare prices
        prices = []
        for _, row in df.iterrows():
            if pd.isna(row.get("product_id")) or pd.isna(row.get("precio_unitario_con_iva")):
                continue
            prices.append({
                "price_list_id": price_list["id"],
                "supplier_id": supplier_id,
                "product_id": row["product_id"],
                "price": float(row["precio_unitario_con_iva"]),
                "unit": row.get("unit", "unidad"),
                "brand": row.get("producto_marca"),
            })

        # Insert in batches
        batch_size = 500
        for i in range(0, len(prices), batch_size):
            batch = prices[i:i+batch_size]
            supabase.table("prices").insert(batch).execute()

        logging.info(f"Inserted {len(prices)} prices")

    except Exception as e:
        logging.error(f"Failed to insert to Supabase: {e}")
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Automated SEPA ETL Pipeline")
    parser.add_argument("--log-dir", default="logs", help="Log directory")
    parser.add_argument("--temp-dir", default="tmp", help="Temporary directory")
    args = parser.parse_args()

    # Setup directories
    log_dir = Path(args.log_dir)
    temp_dir = Path(args.temp_dir)
    log_dir.mkdir(exist_ok=True)
    temp_dir.mkdir(exist_ok=True)

    # Setup logging
    log_file = log_dir / f"sepa_{datetime.now().date().isoformat()}.log"
    setup_logging(log_file)

    logging.info("Starting SEPA ETL Pipeline")

    # Load environment
    from dotenv import load_dotenv
    load_dotenv()

    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        logging.error("Missing Supabase credentials")
        return

    supabase = create_client(supabase_url, service_key)

    # Load product catalog
    catalog = supabase.table("products").select("*").eq("is_active", True).execute().data or []

    # Compile rules
    rules = compile_rules(RELEVANT_PRODUCTS)

    # Discover latest ZIP
    zip_info = discover_latest_zip()
    if not zip_info:
        logging.error("No ZIP to process")
        return

    # Download and extract
    with tempfile.TemporaryDirectory(dir=temp_dir) as tmp:
        tmp_path = Path(tmp)
        zip_path = download_zip(zip_info, tmp_path)
        if not zip_path:
            return

        csv_path = extract_zip(zip_path, tmp_path)
        if not csv_path:
            return

        # Process data
        df = load_and_filter_csv(csv_path, rules)
        if df.empty:
            logging.warning("No data to process")
            return

        df = normalize_products(df, catalog)

        # Insert to Supabase
        insert_to_supabase(df, supabase, zip_info)

    logging.info("SEPA ETL Pipeline completed successfully")


if __name__ == "__main__":
    main()