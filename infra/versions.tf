terraform {
  required_version = ">= 1.5.0"

  required_providers {
    fivetran = {
      source  = "fivetran/fivetran"
      version = "~> 1.1"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # NOTE: the type-specific catalog integration resources used in
    # snowflake_consumer.tf (snowflake_catalog_integration_aws_glue) only
    # exist from provider v2.15.0 onward - earlier releases (including the
    # 0.94.x line) have no Iceberg/Glue catalog integration resource at
    # all. Floored here at >= 2.15 so `terraform validate` passes.
    snowflake = {
      source  = "snowflakedb/snowflake"
      version = ">= 2.15.0, < 3.0.0"
    }
  }
}
