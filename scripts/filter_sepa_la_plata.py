# DEPRECATED: Este script era parte del flujo manual anterior de SEPA.
# El pipeline actual usa scripts/update_sepa.py para descarga, filtrado y carga automática.

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import unicodedata
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


DEFAULT_PRODUCTS = {
    "aceite": {
        "include": [
            r"^aceite\b",
            r"\baceite\s+(girasol|maiz|mezcla|oliva|canola)\b",
        ],
        "exclude": [
            r"\b(aerosol|esencial|corporal)\b",
            r"\b(en aceite|al aceite|sardina|atun|caballa|calamar|conserva)\b",
        ],
    },
    "harina": {
        "include": [r"\bharina\b"],
        "exclude": [],
    },
    "azucar": {
        "include": [r"\bazucar\b"],
        "exclude": [],
    },
    "arroz": {
        "include": [r"\barroz\b"],
        "exclude": [],
    },
    "fideos": {
        "include": [r"\bfideos?\b", r"\btallarines?\b", r"\bspaghetti\b"],
        "exclude": [],
    },
    "yerba-mate": {
        "include": [r"\byerba\b"],
        "exclude": [],
    },
    "leche": {
        "include": [r"\bleche\b"],
        "exclude": [r"\b(chocolatada|postre|crema|dulce de leche)\b"],
    },
    "gaseosas": {
        "include": [
            r"\bgaseosas?\b",
            r"\bcoca cola\b",
            r"\bpepsi\b",
            r"\bsprite\b",
            r"\bfanta\b",
            r"\bseven up\b",
            r"\b7up\b",
            r"\bmanaos\b",
            r"\bmirinda\b",
            r"\bschweppes\b",
        ],
        "exclude": [r"\b(jugo|agua|soda|energizante)\b"],
    },
    "cerveza": {
        "include": [r"\bcervezas?\b"],
        "exclude": [],
    },
    "agua-mineral": {
        "include": [r"\bagua mineral\b", r"\bagua sin gas\b", r"\bagua con gas\b"],
        "exclude": [r"\bsaborizada\b"],
    },
    "detergente": {
        "include": [r"\bdetergente\b"],
        "exclude": [],
    },
    "papel-higienico": {
        "include": [r"\bpapel higienico\b"],
        "exclude": [],
    },
}

OUTPUT_FIELDS = [
    "snapshot_key",
    "fecha_lista",
    "producto_objetivo",
    "id_comercio",
    "id_bandera",
    "id_sucursal",
    "proveedor_razon_social",
    "proveedor_nombre",
    "sucursal_nombre",
    "sucursal_tipo",
    "sucursal_localidad",
    "sucursal_provincia",
    "sucursal_direccion",
    "producto_id",
    "producto_ean",
    "producto_descripcion",
    "producto_marca",
    "producto_presentacion",
    "precio_unitario_con_iva",
    "precio_unitario_sin_iva",
    "unidad_venta",
    "precio_bulto_con_iva",
    "precio_bulto_sin_iva",
    "promo1_precio_con_iva",
    "promo1_leyenda",
    "promo2_precio_con_iva",
    "promo2_leyenda",
    "comercio_ultima_actualizacion",
    "archivo_origen",
]


@dataclass(frozen=True)
class CompiledRule:
    slug: str
    include: tuple[re.Pattern[str], ...]
    exclude: tuple[re.Pattern[str], ...]


def normalize(value: str | None) -> str:
    if not value:
        return ""
    decomposed = unicodedata.normalize("NFKD", value)
    ascii_text = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", ascii_text.casefold()).strip()


def compile_rules(raw_rules: dict[str, dict[str, list[str]]]) -> list[CompiledRule]:
    rules: list[CompiledRule] = []
    for slug, rule in raw_rules.items():
        rules.append(
            CompiledRule(
                slug=slug,
                include=tuple(re.compile(pattern) for pattern in rule["include"]),
                exclude=tuple(re.compile(pattern) for pattern in rule.get("exclude", [])),
            )
        )
    return rules


def match_product(description: str, rules: list[CompiledRule]) -> str | None:
    text = normalize(description)
    for rule in rules:
        if any(pattern.search(text) for pattern in rule.exclude):
            continue
        if any(pattern.search(text) for pattern in rule.include):
            return rule.slug
    return None


def extract_presentation(description: str) -> str:
    text = normalize(description).replace(",", ".")
    patterns = [
        r"\bx\s*(\d+(?:\.\d+)?)\s*(ml|cc|lt|lts|l|gr|g|kg|un|u|uni|unidad|unidades)\b",
        r"\b(\d+(?:\.\d+)?)\s*(ml|cc|lt|lts|l|gr|g|kg|un|u|uni|unidad|unidades)\b",
        r"\bpack\s*x\s*(\d+)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0)
    return ""


def read_csv_from_zip(zip_file: zipfile.ZipFile, name: str) -> list[dict[str, str]]:
    with zip_file.open(name) as raw:
        wrapper = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
        return list(csv.DictReader(wrapper, delimiter="|"))


def iter_inner_zips(outer_zip_path: Path) -> Iterable[tuple[str, bytes]]:
    with zipfile.ZipFile(outer_zip_path) as outer:
        for entry in outer.infolist():
            if entry.is_dir() or not entry.filename.lower().endswith(".zip"):
                continue
            yield entry.filename, outer.read(entry)


def parse_date_from_path(path: Path) -> str:
    match = re.search(r"(\d{4}-\d{2}-\d{2})", path.name)
    return match.group(1) if match else datetime.now().date().isoformat()


def build_filtered_rows(zip_path: Path, locality: str, rules: list[CompiledRule]) -> list[dict[str, str]]:
    target_locality = normalize(locality)
    filtered_rows: list[dict[str, str]] = []
    seen: set[tuple[str, ...]] = set()
    fecha_lista = parse_date_from_path(zip_path)

    for inner_name, inner_bytes in iter_inner_zips(zip_path):
        with zipfile.ZipFile(io.BytesIO(inner_bytes)) as inner:
            names = {Path(name).name.casefold(): name for name in inner.namelist()}
            if not {"comercio.csv", "sucursales.csv", "productos.csv"}.issubset(names):
                continue

            comercio_rows = read_csv_from_zip(inner, names["comercio.csv"])
            sucursal_rows = read_csv_from_zip(inner, names["sucursales.csv"])
            comercio = comercio_rows[0] if comercio_rows else {}

            sucursales = {
                row["id_sucursal"]: row
                for row in sucursal_rows
                if normalize(row.get("sucursales_localidad")) == target_locality
            }
            if not sucursales:
                continue

            with inner.open(names["productos.csv"]) as raw:
                wrapper = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
                reader = csv.DictReader(wrapper, delimiter="|")

                for product in reader:
                    sucursal = sucursales.get(product.get("id_sucursal", ""))
                    if not sucursal:
                        continue

                    matched_slug = match_product(product.get("productos_descripcion", ""), rules)
                    if not matched_slug:
                        continue

                    key = (
                        product.get("id_comercio", ""),
                        product.get("id_bandera", ""),
                        product.get("id_sucursal", ""),
                        product.get("id_producto", ""),
                        product.get("productos_descripcion", ""),
                        product.get("precio_unitario_bulto_por_unidad_venta_con_iva", ""),
                    )
                    if key in seen:
                        continue
                    seen.add(key)

                    address = " ".join(
                        part
                        for part in [
                            sucursal.get("sucursales_calle", ""),
                            sucursal.get("sucursales_numero", ""),
                        ]
                        if part
                    ).strip()

                    filtered_rows.append(
                        {
                            "snapshot_key": "|".join(key),
                            "fecha_lista": fecha_lista,
                            "producto_objetivo": matched_slug,
                            "id_comercio": product.get("id_comercio", ""),
                            "id_bandera": product.get("id_bandera", ""),
                            "id_sucursal": product.get("id_sucursal", ""),
                            "proveedor_razon_social": comercio.get("comercio_razon_social", ""),
                            "proveedor_nombre": comercio.get("comercio_bandera_nombre", ""),
                            "sucursal_nombre": sucursal.get("sucursales_nombre", ""),
                            "sucursal_tipo": sucursal.get("sucursales_tipo", ""),
                            "sucursal_localidad": sucursal.get("sucursales_localidad", ""),
                            "sucursal_provincia": sucursal.get("sucursales_provincia", ""),
                            "sucursal_direccion": address,
                            "producto_id": product.get("id_producto", ""),
                            "producto_ean": product.get("productos_ean", ""),
                            "producto_descripcion": product.get("productos_descripcion", ""),
                            "producto_marca": product.get("productos_marca", ""),
                            "producto_presentacion": extract_presentation(
                                product.get("productos_descripcion", "")
                            ),
                            "precio_unitario_con_iva": product.get(
                                "precio_unitario_bulto_por_unidad_venta_con_iva", ""
                            ),
                            "precio_unitario_sin_iva": product.get(
                                "precio_unitario_bulto_por_unidad_venta_sin_iva", ""
                            ),
                            "unidad_venta": product.get("unidad_venta", ""),
                            "precio_bulto_con_iva": product.get("precio_bulto_con_iva", ""),
                            "precio_bulto_sin_iva": product.get("precio_bulto_sin_iva", ""),
                            "promo1_precio_con_iva": product.get(
                                "productos_precio_unitario_con_iva_promo1", ""
                            ),
                            "promo1_leyenda": product.get("productos_leyenda_promo1", ""),
                            "promo2_precio_con_iva": product.get(
                                "productos_precio_unitario_con_iva_promo2", ""
                            ),
                            "promo2_leyenda": product.get("productos_leyenda_promo2", ""),
                            "comercio_ultima_actualizacion": comercio.get(
                                "comercio_ultima_actualizacion", ""
                            ),
                            "archivo_origen": inner_name,
                        }
                    )

    return sorted(
        filtered_rows,
        key=lambda row: (
            row["producto_objetivo"],
            row["proveedor_nombre"],
            row["producto_marca"],
            row["producto_descripcion"],
        ),
    )


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def write_summary(path: Path, rows: list[dict[str, str]], source: Path, locality: str) -> None:
    by_product: dict[str, int] = {}
    by_supplier: dict[str, int] = {}
    branches: set[tuple[str, str, str]] = set()

    for row in rows:
        by_product[row["producto_objetivo"]] = by_product.get(row["producto_objetivo"], 0) + 1
        by_supplier[row["proveedor_nombre"]] = by_supplier.get(row["proveedor_nombre"], 0) + 1
        branches.add((row["proveedor_nombre"], row["id_sucursal"], row["sucursal_nombre"]))

    payload = {
        "source": str(source),
        "locality": locality,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "rows": len(rows),
        "branches": [
            {"proveedor": supplier, "id_sucursal": branch_id, "sucursal": branch_name}
            for supplier, branch_id, branch_name in sorted(branches)
        ],
        "rows_by_product": dict(sorted(by_product.items())),
        "rows_by_supplier": dict(sorted(by_supplier.items())),
    }

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Filtra ZIP diario SEPA a una lista única para La Plata y productos MVP."
    )
    parser.add_argument("--input", default="sepa_viernes.zip", help="ZIP diario descargado.")
    parser.add_argument(
        "--output",
        default="data/sepa_la_plata_productos_mvp.csv",
        help="CSV único filtrado.",
    )
    parser.add_argument(
        "--summary",
        default="data/sepa_la_plata_productos_mvp.summary.json",
        help="Resumen JSON del filtrado.",
    )
    parser.add_argument("--locality", default="La Plata")
    args = parser.parse_args()

    input_path = Path(args.input)
    rows = build_filtered_rows(input_path, args.locality, compile_rules(DEFAULT_PRODUCTS))
    write_csv(Path(args.output), rows)
    write_summary(Path(args.summary), rows, input_path, args.locality)
    print(f"Filas filtradas: {len(rows)}")
    print(f"CSV: {args.output}")
    print(f"Resumen: {args.summary}")


if __name__ == "__main__":
    main()
