#!/usr/bin/env python3
"""
Generate synthetic orders-domain data for the CICD-ODI-Demo.

Zone 1 (SOURCE) of the demo's three-zone ODI architecture: this script plays the
role of the "app" that writes raw CSVs which Fivetran's S3 connector would pick
up from a landing bucket. For the self-contained dbt-on-DuckDB path used in CI,
the same CSVs are written straight into transform/seeds/ so `dbt seed` can load
them with zero cloud dependencies.

Usage:
    python3 scripts/generate_data.py            # full deterministic base dataset
    python3 scripts/generate_data.py --delta     # append a small batch of new rows

Base generation always uses random.seed(42) so the dataset is reproducible across
machines and CI runs. --delta uses a distinct fixed seed (4242) rather than a
time-based seed, so even the "daily sync" delta batches are reproducible in a
docs / demo context.
"""
import argparse
import csv
import datetime
import os
import random

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
SEEDS_DIR = os.path.join(REPO_ROOT, "transform", "seeds")

CUSTOMERS_CSV = os.path.join(SEEDS_DIR, "customers.csv")
ORDERS_CSV = os.path.join(SEEDS_DIR, "orders.csv")
ORDER_ITEMS_CSV = os.path.join(SEEDS_DIR, "order_items.csv")

BASE_SEED = 42
DELTA_SEED = 4242

N_CUSTOMERS = 500
N_ORDERS = 5000
N_ORDER_ITEMS = 12000

DELTA_N_CUSTOMERS = 5
DELTA_N_ORDERS = 40
DELTA_N_ORDER_ITEMS = 90

REGIONS = ["NA", "EMEA", "APAC", "LATAM"]
PLAN_TIERS = ["Starter", "Growth", "Enterprise"]
PLAN_TIER_WEIGHTS = [0.55, 0.32, 0.13]
ORDER_STATUSES = ["placed", "shipped", "delivered", "cancelled"]
ORDER_STATUS_WEIGHTS = [0.15, 0.20, 0.55, 0.10]
CHANNELS = ["web", "mobile", "partner"]
CHANNEL_WEIGHTS = [0.55, 0.30, 0.15]

CATEGORIES = ["Electronics", "Home", "Apparel", "Outdoors", "Office", "Kitchen"]
PRODUCTS = {
    "Electronics": ["Wireless Earbuds", "USB-C Hub", "Bluetooth Speaker", "Webcam HD", "Power Bank"],
    "Home": ["Throw Blanket", "Table Lamp", "Wall Clock", "Storage Bin", "Candle Set"],
    "Apparel": ["Crew Socks 3-Pack", "Zip Hoodie", "Rain Jacket", "Baseball Cap", "Canvas Tote"],
    "Outdoors": ["Camp Chair", "Insulated Bottle", "Trail Backpack", "Hiking Poles", "Headlamp"],
    "Office": ["Notebook Set", "Desk Organizer", "Standing Mat", "Ergo Mouse", "Whiteboard"],
    "Kitchen": ["Chef Knife", "Cutting Board", "French Press", "Mixing Bowls", "Spice Rack"],
}

FIRST_NAMES = [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery",
    "Quinn", "Reese", "Skyler", "Dakota", "Rowan", "Emerson", "Finley", "Harper",
    "Sage", "Blake", "Cameron", "Drew", "Hayden", "Kendall", "Logan", "Parker",
]
LAST_NAMES = [
    "Nguyen", "Garcia", "Smith", "Kim", "Patel", "Johnson", "Chen", "Muller",
    "Silva", "Kowalski", "Rossi", "Andersson", "Tanaka", "Osei", "Haddad", "Novak",
    "Fernandez", "Dubois", "Ivanova", "Costa", "Larsen", "Botha", "Yamamoto", "Alvarez",
]


def _customer_name(rng):
    return f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"


def _random_date(rng, start, end):
    delta_days = (end - start).days
    return start + datetime.timedelta(days=rng.randint(0, delta_days))


def _write_rows(path, header, rows, append):
    mode = "a" if append and os.path.exists(path) else "w"
    write_header = not (mode == "a")
    with open(path, mode, newline="") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(header)
        writer.writerows(rows)


def _max_existing_id(path, id_col_index):
    if not os.path.exists(path):
        return 0
    max_id = 0
    with open(path, newline="") as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if not row:
                continue
            try:
                max_id = max(max_id, int(row[id_col_index]))
            except (ValueError, IndexError):
                continue
    return max_id


def generate_customers(rng, count, start_id, signup_start, signup_end):
    rows = []
    for i in range(count):
        customer_id = start_id + i
        name = _customer_name(rng)
        region = rng.choice(REGIONS)
        plan_tier = rng.choices(PLAN_TIERS, weights=PLAN_TIER_WEIGHTS, k=1)[0]
        signup_date = _random_date(rng, signup_start, signup_end)
        rows.append([customer_id, name, region, signup_date.isoformat(), plan_tier])
    return rows


def generate_orders(rng, count, start_id, customer_ids, order_start, order_end):
    rows = []
    for i in range(count):
        order_id = start_id + i
        customer_id = rng.choice(customer_ids)
        order_date = _random_date(rng, order_start, order_end)
        status = rng.choices(ORDER_STATUSES, weights=ORDER_STATUS_WEIGHTS, k=1)[0]
        channel = rng.choices(CHANNELS, weights=CHANNEL_WEIGHTS, k=1)[0]
        rows.append([order_id, customer_id, order_date.isoformat(), status, channel])
    return rows


def generate_order_items(rng, count, start_id, order_ids):
    rows = []
    for i in range(count):
        order_item_id = start_id + i
        order_id = rng.choice(order_ids)
        category = rng.choice(CATEGORIES)
        product_name = rng.choice(PRODUCTS[category])
        sku = f"{category[:3].upper()}-{rng.randint(1000, 9999)}"
        quantity = rng.choices([1, 2, 3, 4, 5], weights=[0.5, 0.25, 0.13, 0.07, 0.05], k=1)[0]
        unit_price = round(rng.uniform(6.99, 189.99), 2)
        rows.append([order_item_id, order_id, sku, product_name, category, quantity, unit_price])
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--delta",
        action="store_true",
        help="Append a small deterministic delta batch instead of generating the full base dataset.",
    )
    args = parser.parse_args()

    os.makedirs(SEEDS_DIR, exist_ok=True)

    today = datetime.date.today()

    if args.delta:
        rng = random.Random(DELTA_SEED)

        last_customer_id = _max_existing_id(CUSTOMERS_CSV, 0)
        last_order_id = _max_existing_id(ORDERS_CSV, 0)

        new_customers = generate_customers(
            rng,
            DELTA_N_CUSTOMERS,
            start_id=last_customer_id + 1,
            signup_start=today - datetime.timedelta(days=7),
            signup_end=today,
        )
        _write_rows(
            CUSTOMERS_CSV,
            ["customer_id", "customer_name", "region", "signup_date", "plan_tier"],
            new_customers,
            append=True,
        )

        existing_customer_ids = list(range(1, last_customer_id + DELTA_N_CUSTOMERS + 1))
        new_orders = generate_orders(
            rng,
            DELTA_N_ORDERS,
            start_id=last_order_id + 1,
            customer_ids=existing_customer_ids,
            order_start=today - datetime.timedelta(days=1),
            order_end=today,
        )
        _write_rows(
            ORDERS_CSV,
            ["order_id", "customer_id", "order_date", "status", "channel"],
            new_orders,
            append=True,
        )

        last_order_item_id = _max_existing_id(ORDER_ITEMS_CSV, 0)
        new_order_ids = [row[0] for row in new_orders]
        new_order_items = generate_order_items(
            rng, DELTA_N_ORDER_ITEMS, start_id=last_order_item_id + 1, order_ids=new_order_ids
        )
        _write_rows(
            ORDER_ITEMS_CSV,
            ["order_item_id", "order_id", "sku", "product_name", "category", "quantity", "unit_price"],
            new_order_items,
            append=True,
        )

        print(
            f"Delta generated: +{len(new_customers)} customers, "
            f"+{len(new_orders)} orders, +{len(new_order_items)} order_items"
        )
        return

    rng = random.Random(BASE_SEED)

    signup_start = today - datetime.timedelta(days=730)
    signup_end = today - datetime.timedelta(days=1)
    customers = generate_customers(rng, N_CUSTOMERS, start_id=1, signup_start=signup_start, signup_end=signup_end)
    _write_rows(
        CUSTOMERS_CSV,
        ["customer_id", "customer_name", "region", "signup_date", "plan_tier"],
        customers,
        append=False,
    )

    customer_ids = [row[0] for row in customers]
    order_start = today - datetime.timedelta(days=365)
    order_end = today
    orders = generate_orders(rng, N_ORDERS, start_id=1, customer_ids=customer_ids, order_start=order_start, order_end=order_end)
    _write_rows(
        ORDERS_CSV,
        ["order_id", "customer_id", "order_date", "status", "channel"],
        orders,
        append=False,
    )

    order_ids = [row[0] for row in orders]
    order_items = generate_order_items(rng, N_ORDER_ITEMS, start_id=1, order_ids=order_ids)
    _write_rows(
        ORDER_ITEMS_CSV,
        ["order_item_id", "order_id", "sku", "product_name", "category", "quantity", "unit_price"],
        order_items,
        append=False,
    )

    print(
        f"Base dataset generated: {len(customers)} customers, "
        f"{len(orders)} orders, {len(order_items)} order_items -> {SEEDS_DIR}"
    )


if __name__ == "__main__":
    main()
