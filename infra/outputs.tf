output "mdls_bucket_name" {
  description = "S3 bucket backing the MDLS Iceberg lakehouse (Zone 2)."
  value       = aws_s3_bucket.mdls.bucket
}

output "source_bucket_name" {
  description = "S3 landing bucket the synthetic app writes raw CSVs into (Zone 1)."
  value       = aws_s3_bucket.source_landing.bucket
}

output "glue_database_names" {
  description = "The bronze/silver/gold Glue catalog databases that make up the MDLS lakehouse."
  value = {
    bronze = aws_glue_catalog_database.bronze.name
    silver = aws_glue_catalog_database.silver.name
    gold   = aws_glue_catalog_database.gold.name
  }
}

output "fivetran_connector_id" {
  description = "ID of the Fivetran S3 -> MDLS connector."
  value       = fivetran_connector.orders_s3.id
}

output "athena_workgroup_name" {
  description = "Athena workgroup used to query the MDLS Iceberg tables (Zone 3, always-on consumer)."
  value       = aws_athena_workgroup.jason_chletsos_cicd_odi_demo.name
}

output "snowflake_consumer_status" {
  description = "Whether the optional Snowflake consumer (external volume + Glue catalog integration) is enabled."
  value = var.enable_snowflake_consumer ? (
    "enabled - snowflake_external_volume '${snowflake_external_volume.mdls[0].name}' and snowflake_catalog_integration_aws_glue '${snowflake_catalog_integration_aws_glue.mdls[0].name}' provisioned on top of the MDLS Iceberg tables"
    ) : (
    "disabled - Snowflake is an 'as needed' consumer; set enable_snowflake_consumer = true and supply snowflake_account/user/password/role to provision it"
  )
}
