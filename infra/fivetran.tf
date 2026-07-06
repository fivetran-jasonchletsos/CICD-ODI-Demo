# Zone 1 -> Zone 2: the Fivetran S3 connector reads raw CSVs from the
# source landing bucket and lands them into the MDLS Iceberg lakehouse
# (group_id points at the MDLS destination created one-time by
# scripts/create_mdls_destination.sh - see variables.tf for why this can't
# be a terraform resource).

resource "fivetran_connector" "orders_s3" {
  service  = "s3"
  group_id = var.fivetran_mdls_destination_id

  destination_schema {
    name = "jason_chletsos_cicd_orders"
  }

  config {
    bucket    = var.source_bucket_name
    prefix    = "orders/"
    pattern   = ".*\\.csv"
    file_type = "csv"
    role_arn  = aws_iam_role.fivetran_source_read.arn
  }
}
