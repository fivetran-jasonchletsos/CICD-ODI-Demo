#!/usr/bin/env bash
#
# One-time bootstrap: creates the Fivetran Managed Data Lake Service (MDLS)
# destination (Polaris/Iceberg on the mdls_bucket_name S3 bucket) via the
# Fivetran REST API. This is NOT a terraform resource - the fivetran
# terraform provider does not support creating MDLS destinations, so this
# script is the one-time step that produces the destination/group id you
# paste into terraform.tfvars as fivetran_mdls_destination_id.
#
# Run manually (or via the workflow_dispatch-only
# .github/workflows/bootstrap-mdls.yml workflow), never on a schedule -
# destination creation happens once per environment.
#
# Required environment variables:
#   FIVETRAN_API_KEY     - Fivetran REST API key
#   FIVETRAN_API_SECRET  - Fivetran REST API secret
#   MDLS_BUCKET_NAME      (optional, default: jason-chletsos-cicd-odi-demo-mdls)
#   AWS_REGION             (optional, default: us-west-2)
#   MDLS_ROLE_ARN         - IAM role ARN Fivetran assumes to write the MDLS
#                            bucket (aws_iam_role.fivetran_mdls_access output
#                            from `terraform apply` on infra/iam_mdls.tf)
#   MDLS_EXTERNAL_ID      - the same external ID used in
#                            var.fivetran_s3_external_id
#
# Usage:
#   FIVETRAN_API_KEY=... FIVETRAN_API_SECRET=... \
#   MDLS_ROLE_ARN=arn:aws:iam::123456789012:role/fivetran-mdls-access \
#   MDLS_EXTERNAL_ID=... \
#     ./scripts/create_mdls_destination.sh

set -euo pipefail

: "${FIVETRAN_API_KEY:?FIVETRAN_API_KEY must be set}"
: "${FIVETRAN_API_SECRET:?FIVETRAN_API_SECRET must be set}"
: "${MDLS_ROLE_ARN:?MDLS_ROLE_ARN must be set (apply infra/iam_mdls.tf first)}"
: "${MDLS_EXTERNAL_ID:?MDLS_EXTERNAL_ID must be set}"

MDLS_BUCKET_NAME="${MDLS_BUCKET_NAME:-jason-chletsos-cicd-odi-demo-mdls}"
AWS_REGION="${AWS_REGION:-us-west-2}"

echo "Creating Fivetran MDLS (Polaris/Iceberg) destination on s3://${MDLS_BUCKET_NAME} (${AWS_REGION})..." >&2

response="$(
  curl --silent --show-error --fail \
    --request POST "https://api.fivetran.com/v1/dest-groups" \
    --user "${FIVETRAN_API_KEY}:${FIVETRAN_API_SECRET}" \
    --header "Content-Type: application/json" \
    --data @- <<JSON
{
  "service": "managed_lake_service",
  "region": "${AWS_REGION}",
  "time_zone_offset": "-8",
  "config": {
    "catalog_type": "ICEBERG",
    "bucket_name": "${MDLS_BUCKET_NAME}",
    "role_arn": "${MDLS_ROLE_ARN}",
    "external_id": "${MDLS_EXTERNAL_ID}"
  }
}
JSON
)"

destination_id="$(echo "${response}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["id"])')"

echo "" >&2
echo "MDLS destination created: ${destination_id}" >&2
echo "Paste this into terraform.tfvars as fivetran_mdls_destination_id:" >&2
echo "" >&2
echo "fivetran_mdls_destination_id = \"${destination_id}\""
