# CICD ODI Demo — Terraform + GitHub Actions Around Fivetran + dbt

Teaches Fivetran SEs how to wrap a full ODI/MDLS-style Fivetran + dbt demo in
infrastructure-as-code and PR-gated CI/CD, instead of applying Terraform by
hand with no review step. Built in response to an internal Slack thread with
Aaron Dear in `#se_demo_improvements` about functionality demos for assets
that need more setup. The data domain (synthetic orders) is intentionally
generic — the DevOps mechanics are the star, not the vertical. Everything
here — the three-zone lakehouse shape, the bronze/silver/gold Glue layers,
the "one copy, many engines" consumer pattern — is the same ODI architecture
used across this workspace's other Fivetran demos; only the Terraform +
GitHub Actions wrapper is new.

```
ZONE 1 — SOURCE
  scripts/generate_data.py ("the app")
        |
        | writes raw CSVs (customers / orders / order_items)
        v
  S3 landing bucket (source_bucket_name)
        |
        | Fivetran S3 connector (fivetran_connector.orders_s3)
        | assumes: fivetran-source-read (external_id-gated)
        v
ZONE 2 — MDLS DATA LAKEHOUSE  (the core of the architecture)
  S3 bucket (mdls_bucket_name) + versioning + SSE + public-access-block
  + lifecycle-to-IA-after-90-days
  Iceberg tables, cataloged in AWS Glue:
    jason_chletsos_cicd_bronze   (raw landed)
    jason_chletsos_cicd_silver   (cleaned / conformed)
    jason_chletsos_cicd_gold     (marts)
  Fivetran writes here via: fivetran-mdls-access (external_id-gated)
        |
        | ONE copy of the data — every consumer below reads it in place
        v
ZONE 3 — CONSUMERS  ("one copy, many engines")
  +---------------------+  +----------------------+  +------------------------+
  | DuckDB              |  | Athena               |  | Snowflake              |
  | default, always-on, |  | always-on, near-free |  | OPTIONAL, "as needed"  |
  | free                |  | aws_athena_workgroup |  | enable_snowflake_      |
  | dbt build ->        |  | queries the same     |  | consumer = true ->     |
  | transform/dev.duckdb|  | Glue-cataloged       |  | snowflake_external_    |
  | zero cloud creds     |  | Iceberg tables       |  | volume + snowflake_    |
  | required — the CI    |  |                      |  | catalog_integration_   |
  | path                 |  |                      |  | aws_glue over the same |
  |                      |  |                      |  | Glue databases         |
  +---------------------+  +----------------------+  +------------------------+
```

## Why this repo exists

The other Fivetran ODI demos in this workspace get their infrastructure
provisioned by hand: an SE runs `terraform apply` locally, no one reviews the
diff, and there's no record of what changed or why. That's fine for a
one-person demo, but it doesn't teach the DevOps discipline SEs increasingly
need to show customers who ask "how would we actually operationalize this?"

This repo answers that question concretely, using the exact same three-zone
ODI/MDLS shape as the rest of the catalog (Zone 1 source, Zone 2 MDLS
Iceberg/Glue lakehouse, Zone 3 multi-engine consumers) so the lesson
transplants directly onto any existing demo. The two things worth stealing:

1. **A PR-gated infra workflow.** Every Terraform change goes through
   `terraform-plan.yml` (runs on the PR, posts the plan as a PR comment)
   before `terraform-apply.yml` (runs on merge to `main`, gated by a GitHub
   Environment approval) touches anything live — a real Fivetran connector,
   a real S3 bucket, real IAM roles.
2. **A CI pipeline that requires zero cloud credentials to prove the demo
   still works.** `dbt_run.yml` builds the entire dbt project against the
   DuckDB target and refreshes the frontend's data — no AWS, Fivetran, or
   Snowflake secrets needed. Everything that *does* touch a live cloud
   account is explicitly guarded so a fresh clone with no secrets configured
   still runs green.

## Infrastructure (`infra/`)

Terraform provisions all three zones (see the file-by-file breakdown below).
It does **not** create the Fivetran MDLS destination itself — the Fivetran
provider only supports Terraform-managing a connector *into* an existing
MDLS destination, not creating a Polaris/Iceberg destination via the API
resource model. That one-time step is `scripts/create_mdls_destination.sh`,
a curl script against the Fivetran REST API, wired up as a manual-only
workflow (`bootstrap-mdls.yml`) so it can never accidentally run on a
schedule or a push.

| File | Provisions |
|---|---|
| `versions.tf` | Provider version floors: `fivetran/fivetran ~> 1.1`, `hashicorp/aws ~> 5.0`, `snowflakedb/snowflake >= 2.15.0, < 3.0.0` (the Glue/Iceberg catalog integration resource used in `snowflake_consumer.tf` only exists from 2.15 onward) |
| `main.tf` | `fivetran`, `aws`, and `snowflake` provider blocks. The `snowflake` block is always declared — even when Snowflake is disabled — so `terraform validate` passes regardless of `enable_snowflake_consumer` |
| `variables.tf` | All inputs, including `enable_snowflake_consumer` (bool, default `false`) and the sensitive Fivetran/AWS/Snowflake credentials, all defaulted to `""` so validate/plan work with zero secrets |
| `glue_lakehouse.tf` | Zone 2: the MDLS S3 bucket (versioning, SSE-AES256, public-access-block, 90-day transition to STANDARD_IA) plus the three Glue catalog databases — `jason_chletsos_cicd_bronze` / `_silver` / `_gold` |
| `iam_mdls.tf` | `fivetran-mdls-access` IAM role — external_id-gated trust policy for Fivetran's AWS principal, scoped to S3 read/write on the MDLS bucket and Glue actions on the three catalog databases |
| `source_landing.tf` | Zone 1: the source landing S3 bucket, plus a **separate** `fivetran-source-read` role (read-only, scoped only to the landing bucket) — kept distinct from the MDLS write role so each Fivetran-assumed role's blast radius is exactly one job |
| `fivetran.tf` | `fivetran_connector.orders_s3` — the S3 source connector that reads `orders/*.csv` from the landing bucket into the MDLS destination, schema `jason_chletsos_cicd_orders` |
| `athena.tf` | `aws_athena_workgroup` — a third, always-on, near-free Zone 3 consumer, proving "one copy, many engines" isn't just a DuckDB trick |
| `snowflake_consumer.tf` | Zone 3's optional consumer: `snowflake_external_volume` + `snowflake_catalog_integration_aws_glue`, both `count = var.enable_snowflake_consumer ? 1 : 0`. When the flag is left at its default (`false`), these resources evaluate to zero instances and `terraform validate` / `terraform plan` succeed with no Snowflake credentials at all |
| `outputs.tf` | Bucket names, Glue database names, the connector id, the Athena workgroup name, and a computed `snowflake_consumer_status` string reporting enabled/disabled |
| `terraform.tfvars.example` | Every variable with a placeholder value and a comment — copy to `terraform.tfvars` (gitignored) and fill in real values |

**Do not run a live `terraform apply` against this repo's example values.**
`terraform validate` (with `-backend=false`) is the correctness bar this repo
holds itself to in CI; `terraform apply` only fires from the `terraform-apply.yml`
workflow, on merge to `main`, behind a manual environment approval.

### Turning on the optional Snowflake consumer

Set `enable_snowflake_consumer = true` in `terraform.tfvars` and supply
`snowflake_organization_name`, `snowflake_account`, `snowflake_user`,
`snowflake_password`, and `snowflake_role`. Terraform then stands up an
external volume pointed at the MDLS bucket's S3 location and a Glue catalog
integration pointed at the same three Glue databases Athena and DuckDB
already read from — Snowflake never gets its own copy of the data.

## GitHub Actions (`.github/workflows/`)

Six workflows, each doing one job. The load-bearing one is `dbt_run.yml` — it
must go green with **no secrets configured at all**, since DuckDB is the
always-on, zero-cost consumer this whole demo is built to always be able to
run.

| Workflow | Trigger | Why it exists |
|---|---|---|
| `terraform-plan.yml` | `pull_request` on `infra/**` | The PR-review gate: `fmt -check`, `init -backend=false`, `validate`, `plan`, then posts the plan as a PR comment — so an SE reviews an infra diff *before* it can touch a live connector or bucket |
| `terraform-apply.yml` | `push` to `main` on `infra/**` | Applies the reviewed diff. Runs under `environment: production` — configure a required reviewer on that GitHub Environment so merging to `main` still requires a manual approval click even though the workflow itself fires automatically |
| `bootstrap-mdls.yml` | `workflow_dispatch` only | Runs `scripts/create_mdls_destination.sh` to create the Fivetran MDLS destination. Manual-only, on purpose — destination creation is a one-time step per environment and must never run on a schedule or a push |
| `generate_and_sync.yml` | `schedule` (daily) + `workflow_dispatch` | Generates a delta of synthetic orders, uploads it to the source landing bucket, and force-triggers a Fivetran sync. Every cloud-touching step is guarded on its secret being non-empty, so a fresh clone with no AWS/Fivetran secrets still runs green (it just skips the upload/sync steps) |
| `dbt_run.yml` | `schedule` (`25 3,9,15,21 * * *`) + `workflow_dispatch` | The self-contained workflow: a `gitleaks` secret scan gates a job that installs `dbt-core`/`dbt-duckdb` 1.9.0, runs `dbt deps/seed/run/test/docs generate` against the default DuckDB target, exports the marts to JSON, and commits `transform/dev.duckdb` + `app/public/data/*.json` back to `main`. Requires zero cloud credentials |
| `deploy.yml` | `push` to `main` on `app/**` | Builds the frontend (`npm ci && npm run build`) and deploys it to GitHub Pages. Fires naturally after `dbt_run.yml`'s auto-commit touches `app/public/data/**` |

## Transform (`transform/`) — dbt project `orders_pipeline`

Profile `orders_pipeline` (`transform/profiles.yml`) defines two targets:

- **`dev` (default, DuckDB)** — builds `transform/dev.duckdb` straight from
  the seed CSVs. Zero cloud credentials. This is the target CI and local dev
  both use.
- **`snowflake`** — env-var driven, points at the same MDLS-backed database
  once `enable_snowflake_consumer = true` has been applied. Never used in CI.

Seeds (`transform/seeds/`, generated by `scripts/generate_data.py` with
`random.seed(42)` for reproducibility):

- `customers.csv` — `customer_id, customer_name, region (NA/EMEA/APAC/LATAM), signup_date, plan_tier (Starter/Growth/Enterprise)`, ~500 rows
- `orders.csv` — `order_id, customer_id, order_date, status (placed/shipped/delivered/cancelled), channel (web/mobile/partner)`, ~5,000 rows
- `order_items.csv` — `order_item_id, order_id, sku, product_name, category, quantity, unit_price`, ~12,000 rows

Staging (`+materialized: view`, schema `staging`):
`stg_orders__customers`, `stg_orders__orders`, `stg_orders__order_items`.

Marts (`+materialized: table`):

| Model | Grain | Key fields |
|---|---|---|
| `dim_customers` | one row per customer | `customer_id, customer_name, region, plan_tier, signup_date, lifetime_order_count, lifetime_revenue` |
| `fct_orders` | one row per order | `order_id, customer_id, order_date, status, channel, order_total, item_count` |
| `fct_daily_revenue` | one row per calendar day | `order_date, order_count, revenue, avg_order_value` |

Tests: `unique`/`not_null` on primary keys (`schema.yml`) plus a custom test,
`transform/tests/assert_no_negative_order_totals.sql`.

## Frontend (`app/`)

Vite + React + TypeScript + Tailwind SPA, deployed to GitHub Pages at
`/CICD-ODI-Demo/`. Route per concept, matching the shape used by the other
functionality demos in this workspace:

- **`/` Overview** — what this repo teaches, plus a KPI scorecard (total
  revenue, total orders, active customers, average order value) read from
  `public/data/fct_daily_revenue.json` and `dim_customers.json`
- **`/architecture`** — a custom three-zone SVG/HTML component
  (`ThreeZoneArchitecture.tsx`) showing Source -> MDLS Iceberg/Glue
  lakehouse -> Consumers, calling out "one copy in S3, many engines on top"
  as the core lesson, plus the PR-review and environment-approval gates as
  the CI/CD safety mechanism
- **`/pipeline`** — live workflow run status pulled from the public GitHub
  REST API (`.../actions/runs`, no auth token needed on a public repo), with
  a graceful "not yet run" empty state before this repo is pushed
- **`/runbook`** — "Add Terraform + CI/CD to any ODI/MDLS demo in 5 steps,"
  referencing this repo's actual files (`variables.tf`,
  `enable_snowflake_consumer`, the six workflow files, the secret names) as
  the template to copy
- **`/dashboard`** — daily revenue trend, orders by channel, top regions by
  customer count, plan-tier mix, built with `recharts` against
  `public/data/*.json`

`transform/dev.duckdb` and `app/public/data/*.json` are committed as static
snapshots (refreshed automatically by `dbt_run.yml`), so the frontend has
real data even before anyone has run Terraform or configured a single
secret.

## Setup checklist — getting this live on GitHub

The repo works fully unread with zero setup: `dbt_run.yml` and `deploy.yml` run
green on a fresh push with no secrets at all, because DuckDB + the committed
`dev.duckdb`/`app/public/data/*.json` snapshots are the always-on path. Everything
below is only needed if you want the *live* Fivetran/AWS/Snowflake path — the
part that actually demonstrates the PR-gated infra workflow end to end.

1. **Push the repo** (nothing to configure yet — `dbt_run.yml` and `deploy.yml`
   will run on the first push to `main` and publish the frontend to GitHub Pages).
2. **Create a `production` GitHub Environment** (Settings → Environments) and
   add at least one required reviewer. This is what makes `terraform-apply.yml`
   pause for a human click even though the workflow itself fires automatically
   on merge.
3. **Add repository secrets** (Settings → Secrets and variables → Actions).
   Every secret referenced anywhere in `.github/workflows/`:

   | Secret | Used by | Notes |
   |---|---|---|
   | `FIVETRAN_API_KEY` | terraform-plan, terraform-apply, bootstrap-mdls, generate_and_sync | Fivetran REST/Terraform API key |
   | `FIVETRAN_API_SECRET` | terraform-plan, terraform-apply, bootstrap-mdls, generate_and_sync | Fivetran REST/Terraform API secret |
   | `FIVETRAN_MDLS_DESTINATION_ID` | terraform-plan, terraform-apply | The MDLS destination/group id — only exists *after* step 4 below |
   | `FIVETRAN_S3_EXTERNAL_ID` | terraform-plan, terraform-apply | Your own chosen external-ID string for the assume-role trust policies |
   | `FIVETRAN_CONNECTOR_ID` | generate_and_sync | The `fivetran_connector.orders_s3` id — only exists after the first `terraform-apply.yml` run (see `infra/outputs.tf`) |
   | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | generate_and_sync | Only needs `s3:PutObject` on the source landing bucket |
   | `SOURCE_BUCKET_NAME` | generate_and_sync | Must match `source_bucket_name` in `terraform.tfvars` |

   `secrets.GITHUB_TOKEN` is provided automatically by Actions — nothing to add.
4. **Run `bootstrap-mdls.yml` once** (Actions tab → "Run workflow"). Paste the
   printed destination/group id into the `FIVETRAN_MDLS_DESTINATION_ID` secret
   above, and into `terraform.tfvars` if you're also planning locally.
5. **Open a PR that touches `infra/`** (even a comment change) to see
   `terraform-plan.yml` post a real plan as a PR comment — that's the gate this
   whole repo exists to demonstrate.
6. **Merge it.** `terraform-apply.yml` fires, pauses on the `production`
   environment's required reviewer, and — once approved — actually provisions
   Zone 1 and Zone 2. Grab the connector id from the run's output and add it as
   `FIVETRAN_CONNECTOR_ID` so `generate_and_sync.yml` can start feeding it.

Steps 2-6 need a real Fivetran account and AWS account with permissions to
create S3 buckets, IAM roles, Glue databases, and an Athena workgroup. Skipping
them entirely is fine — the repo's teaching value (the workflow files
themselves, the README, and the `/runbook` page) doesn't depend on ever running
them live.

## Running locally

### Prerequisites

- Python 3.12
- Node.js >= 20, npm
- `dbt-core` 1.9.0, `dbt-duckdb` 1.9.0 (`pip install -r requirements.txt`)
- Terraform >= 1.5 (only needed to touch `infra/`)
- Fivetran API credentials + an MDLS destination (only needed for a live sync)

### 1. Configure environment

```bash
cp .env.example .env
# fill in FIVETRAN_API_KEY / FIVETRAN_API_SECRET / etc. only if you're
# running a live sync — the DuckDB path below needs none of this
```

### 2. Generate seed data (optional — the repo already ships committed seeds)

```bash
pip install -r requirements.txt
python scripts/generate_data.py          # full deterministic base dataset
python scripts/generate_data.py --delta  # append a small daily-sync-style batch
```

### 3. Run dbt against DuckDB

```bash
cd transform
dbt deps
dbt seed
dbt run
dbt test
```

Output: `transform/dev.duckdb`.

### 4. Export marts to JSON for the frontend

```bash
pip install duckdb
python scripts/export_marts_to_json.py
```

Writes `app/public/data/dim_customers.json`, `fct_orders.json`,
`fct_daily_revenue.json`.

### 5. Run the frontend

```bash
cd app
npm install
npm run dev
```

### 6. (Optional) Provision infra

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# fill in real values — never commit terraform.tfvars
terraform init -backend=false
terraform validate
terraform plan
```

Live `apply` is intentionally left to the `terraform-apply.yml` workflow
(merge to `main`, behind a GitHub Environment approval) rather than run by
hand — that gate is the entire point of this repo.

### 7. (Optional, one-time per environment) Bootstrap the MDLS destination

```bash
FIVETRAN_API_KEY=... FIVETRAN_API_SECRET=... \
MDLS_ROLE_ARN=<fivetran-mdls-access role arn from terraform output> \
MDLS_EXTERNAL_ID=<same value as fivetran_s3_external_id> \
  ./scripts/create_mdls_destination.sh
```

Paste the printed id into `terraform.tfvars` as `fivetran_mdls_destination_id`.
Never commit it.

## Repo layout

```
infra/                     Terraform — Zones 1, 2, and optional Zone 3 (Snowflake)
  versions.tf                provider version floors
  main.tf                    fivetran / aws / snowflake provider blocks
  variables.tf                all inputs, incl. enable_snowflake_consumer
  glue_lakehouse.tf           MDLS S3 bucket + bronze/silver/gold Glue databases
  iam_mdls.tf                 fivetran-mdls-access role (external_id-gated)
  source_landing.tf           source S3 bucket + fivetran-source-read role
  fivetran.tf                 fivetran_connector.orders_s3
  athena.tf                   aws_athena_workgroup (always-on consumer #2)
  snowflake_consumer.tf       count-gated external volume + Glue catalog integration
  outputs.tf                  bucket/database/connector/workgroup outputs
  terraform.tfvars.example    placeholder values for every variable

transform/                 dbt project: orders_pipeline
  seeds/                      customers.csv, orders.csv, order_items.csv
  models/staging/orders/      stg_orders__customers/orders/order_items
  models/marts/                dim_customers, fct_orders, fct_daily_revenue
  tests/                       assert_no_negative_order_totals.sql
  profiles.yml                 dev (DuckDB, default) + snowflake (optional) targets
  dev.duckdb                   committed static snapshot, refreshed by dbt_run.yml

scripts/
  generate_data.py             synthetic orders data generator (--delta for daily syncs)
  create_mdls_destination.sh   one-time Fivetran REST API bootstrap for the MDLS destination
  export_marts_to_json.py      transform/dev.duckdb -> app/public/data/*.json

app/                        Vite + React + TypeScript + Tailwind SPA
  src/pages/                   OverviewPage, ArchitecturePage, PipelinePage, RunbookPage, DashboardPage
  src/components/              Layout, ThreeZoneArchitecture
  public/data/                 dim_customers.json, fct_orders.json, fct_daily_revenue.json (committed)

.github/workflows/
  terraform-plan.yml           PR-gate: fmt/init/validate/plan, posts plan as PR comment
  terraform-apply.yml          apply on merge to main, behind a production Environment approval
  bootstrap-mdls.yml           workflow_dispatch-only MDLS destination creation
  generate_and_sync.yml        daily delta generation + S3 upload + Fivetran sync trigger
  dbt_run.yml                  self-contained dbt-on-DuckDB build + JSON export + auto-commit
  deploy.yml                   builds and deploys app/ to GitHub Pages
```
