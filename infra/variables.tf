variable "fivetran_api_key" {
  description = "Fivetran REST API key (used by the fivetran provider)."
  type        = string
  sensitive   = true
  default     = ""
}

variable "fivetran_api_secret" {
  description = "Fivetran REST API secret (used by the fivetran provider)."
  type        = string
  sensitive   = true
  default     = ""
}

variable "fivetran_mdls_destination_id" {
  description = <<-EOT
    The group id of the Fivetran Managed Data Lake Service (MDLS) destination.
    The fivetran Terraform provider cannot create the MDLS destination itself
    (Polaris/Iceberg destination creation is REST-API-only) - run
    scripts/create_mdls_destination.sh once per environment and paste the
    resulting id here.
  EOT
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_region" {
  description = "AWS region for the landing bucket, MDLS bucket, Glue catalog, and Athena workgroup."
  type        = string
  default     = "us-west-2"
}

variable "mdls_bucket_name" {
  description = "S3 bucket that stores the MDLS Iceberg lakehouse (bronze/silver/gold)."
  type        = string
  default     = "jason-chletsos-cicd-odi-demo-mdls"
}

variable "source_bucket_name" {
  description = "S3 landing bucket the synthetic app writes raw CSVs into; read by the Fivetran S3 connector."
  type        = string
  default     = "jason-chletsos-cicd-odi-demo-landing"
}

variable "fivetran_s3_external_id" {
  description = "External ID Fivetran supplies for the IAM role trust policies (both the MDLS write role and the source read role)."
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_snowflake_consumer" {
  description = "When true, provisions Snowflake as an additional read-only consumer (external volume + Glue catalog integration) on top of the same MDLS Iceberg tables. Default false: Snowflake is an 'as needed' consumer, not always-on."
  type        = bool
  default     = false
}

variable "snowflake_account" {
  description = "Snowflake account identifier. Only required when enable_snowflake_consumer is true."
  type        = string
  default     = ""
}

variable "snowflake_organization_name" {
  description = "Snowflake organization name. The provider's account_name argument requires organization_name alongside it; only required when enable_snowflake_consumer is true."
  type        = string
  default     = ""
}

variable "snowflake_user" {
  description = "Snowflake user. Only required when enable_snowflake_consumer is true."
  type        = string
  default     = ""
}

variable "snowflake_password" {
  description = "Snowflake password. Only required when enable_snowflake_consumer is true."
  type        = string
  sensitive   = true
  default     = ""
}

variable "snowflake_role" {
  description = "Snowflake role used to create the external volume and catalog integration. Only required when enable_snowflake_consumer is true."
  type        = string
  default     = ""
}
