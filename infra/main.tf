provider "fivetran" {
  api_key    = var.fivetran_api_key
  api_secret = var.fivetran_api_secret
}

provider "aws" {
  region = var.aws_region
}

# The snowflake provider block is always declared so `terraform validate`
# succeeds whether or not enable_snowflake_consumer is true. When the flag
# is false, snowflake_* resources are count-gated to zero (see
# snowflake_consumer.tf) and this provider is simply never called.
#
# NOTE: the provider's account attribute is named `account_name` (not
# `account`) as of v2.x of the terraform-provider-snowflake SDK rewrite,
# and requires organization_name alongside it - var.snowflake_account and
# var.snowflake_organization_name map to them here.
provider "snowflake" {
  organization_name = var.snowflake_organization_name
  account_name      = var.snowflake_account
  user              = var.snowflake_user
  password          = var.snowflake_password
  role              = var.snowflake_role
}
