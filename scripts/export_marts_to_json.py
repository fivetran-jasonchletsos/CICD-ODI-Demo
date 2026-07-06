#!/usr/bin/env python3
"""
Export the dbt mart tables from the DuckDB build (Zone 3 / DuckDB consumer)
into static JSON files consumed by the app/ frontend.

Reads transform/dev.duckdb (produced by `dbt run` against the default `dev`
target) and writes one JSON array-of-objects file per mart to
app/public/data/. Run after `dbt run` / `dbt test` in dbt_run.yml.

Usage:
    python3 scripts/export_marts_to_json.py
"""
import decimal
import json
import os

import duckdb

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)

DUCKDB_PATH = os.path.join(REPO_ROOT, "transform", "dev.duckdb")
OUTPUT_DIR = os.path.join(REPO_ROOT, "app", "public", "data")

MARTS = ["dim_customers", "fct_orders", "fct_daily_revenue"]


def _default_json(value):
    """Make DuckDB-native types (date, decimal, etc.) JSON-serializable."""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    return str(value)


def _coerce_value(value):
    """Convert Decimal columns (e.g. revenue/price) to plain floats so the
    frontend can chart/sum them without parsing strings."""
    if isinstance(value, decimal.Decimal):
        return float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def export_mart(con, table_name, output_dir):
    rows = con.execute(f"select * from main.{table_name}").fetchall()
    columns = [desc[0] for desc in con.description]

    records = [
        {col: _coerce_value(val) for col, val in zip(columns, row)}
        for row in rows
    ]

    output_path = os.path.join(output_dir, f"{table_name}.json")
    with open(output_path, "w") as f:
        json.dump(records, f, indent=2, default=_default_json)

    print(f"Exported {len(records)} rows from {table_name} -> {output_path}")


def main():
    if not os.path.exists(DUCKDB_PATH):
        raise SystemExit(
            f"DuckDB database not found at {DUCKDB_PATH}. Run `dbt run` in transform/ first."
        )

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    con = duckdb.connect(DUCKDB_PATH, read_only=True)
    try:
        for mart in MARTS:
            export_mart(con, mart, OUTPUT_DIR)
    finally:
        con.close()


if __name__ == "__main__":
    main()
