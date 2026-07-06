# Zone 3 consumer #3 (OPTIONAL, "as needed"): when an SE wants a live demo
# with Snowflake sitting on top of the same MDLS S3 bucket, these resources
# stand up an external volume + Glue catalog integration so Snowflake reads
# the existing Iceberg tables in place - no data copy. Every resource here
# is count-gated on var.enable_snowflake_consumer so `terraform validate`
# and `terraform plan` succeed with zero Snowflake credentials when the
# flag is left at its default (false).
#
# NOTE on provider version: as of the terraform-provider-snowflake releases
# available at authoring time, Snowflake/Glue catalog integrations are
# exposed as the type-specific resource `snowflake_catalog_integration_aws_glue`
# (catalog_source is a computed/fixed attribute on that resource, not a
# settable enum on a generic `snowflake_catalog_integration` resource). This
# file targets that resource; see versions.tf for the corresponding provider
# version floor.
#
# NOTE on IAM: `glue_aws_role_arn` below reuses the MDLS write role
# (iam_mdls.tf) as a scaffold placeholder. A real deployment should mint a
# dedicated, read-only role for Snowflake once the external volume's
# generated STORAGE_AWS_IAM_USER_ARN is known (a two-step bootstrap, since
# Snowflake's own AWS principal isn't known until after the external volume
# is created).

data "aws_caller_identity" "current" {
  count = var.enable_snowflake_consumer ? 1 : 0
}

resource "snowflake_external_volume" "mdls" {
  count = var.enable_snowflake_consumer ? 1 : 0

  name         = "cicd_odi_demo_mdls_volume"
  comment      = "External volume over the MDLS Iceberg lakehouse S3 bucket (one copy, many engines)."
  allow_writes = false

  storage_location {
    storage_location_name = "cicd-odi-demo-mdls"
    storage_provider      = "S3"
    storage_base_url      = "s3://${aws_s3_bucket.mdls.bucket}/"
  }
}

resource "snowflake_catalog_integration_aws_glue" "mdls" {
  count = var.enable_snowflake_consumer ? 1 : 0

  name    = "cicd_odi_demo_glue_catalog"
  comment = "Reads the bronze/silver/gold Iceberg tables cataloged in Glue by MDLS - same tables Athena and DuckDB read, no copy."
  enabled = true

  glue_aws_role_arn = aws_iam_role.fivetran_mdls_access.arn
  glue_catalog_id   = data.aws_caller_identity.current[0].account_id
  glue_region       = var.aws_region
  catalog_namespace = aws_glue_catalog_database.gold.name
}
