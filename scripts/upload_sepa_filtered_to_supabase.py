# DEPRECATED: Este script era parte del flujo manual anterior de SEPA.
# El pipeline actual usa scripts/update_sepa.py para ingestión diaria automática.

from __future__ import annotations

import argparse
import csv
import json
import os
from pathlib import Path
from urllib import error, request


NUMERIC_FIELDS = {
    "precio_unitario_con_iva",
    "precio_unitario_sin_iva",
    "precio_bulto_con_iva",
    "precio_bulto_sin_iva",
    "promo1_precio_con_iva",
    "promo2_precio_con_iva",
}


def load_env() -> None:
    for env_path in [Path(".env.local"), Path(".env.example")]:
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def normalize_row(row: dict[str, str]) -> dict[str, object | None]:
    normalized: dict[str, object | None] = {}
    for key, value in row.items():
        clean = value.strip()
        if clean == "":
            normalized[key] = None
        elif key in NUMERIC_FIELDS:
            normalized[key] = float(clean)
        else:
            normalized[key] = clean
    return normalized


def read_rows(path: Path) -> list[dict[str, object | None]]:
    with path.open("r", encoding="utf-8", newline="") as file:
        return [normalize_row(row) for row in csv.DictReader(file)]


def chunks(items: list[dict[str, object | None]], size: int):
    for index in range(0, len(items), size):
        yield items[index : index + size]


def upload_rows(rows: list[dict[str, object | None]], batch_size: int) -> None:
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        raise RuntimeError(
            "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local."
        )

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/sepa_filtered_prices"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    for batch in chunks(rows, batch_size):
        payload = json.dumps(batch, ensure_ascii=False).encode("utf-8")
        req = request.Request(
            f"{endpoint}?on_conflict=snapshot_key",
            data=payload,
            headers=headers,
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=60) as response:
                if response.status not in {200, 201, 204}:
                    raise RuntimeError(f"Supabase respondió HTTP {response.status}.")
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase respondió HTTP {exc.code}: {body}") from exc


def main() -> None:
    parser = argparse.ArgumentParser(description="Carga el CSV filtrado a Supabase.")
    parser.add_argument("--input", default="data/sepa_la_plata_productos_mvp.csv")
    parser.add_argument("--batch-size", type=int, default=500)
    args = parser.parse_args()

    load_env()
    rows = read_rows(Path(args.input))
    upload_rows(rows, args.batch_size)
    print(f"Filas subidas: {len(rows)}")


if __name__ == "__main__":
    main()
