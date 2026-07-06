# Zone 2: MDLS Data Lakehouse
#
# Fivetran's Managed Data Lake Service lands data as open Iceberg tables in
# this bucket, cataloged via three Glue databases (bronze/silver/gold). This
# is the core of the ODI three-zone architecture: one copy of the data,
# queried in place by every downstream consumer (DuckDB, Athena, and
# optionally Snowflake - see snowflake_consumer.tf).

resource "aws_s3_bucket" "mdls" {
  bucket = var.mdls_bucket_name
}

resource "aws_s3_bucket_versioning" "mdls" {
  bucket = aws_s3_bucket.mdls.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "mdls" {
  bucket = aws_s3_bucket.mdls.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "mdls" {
  bucket = aws_s3_bucket.mdls.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "mdls" {
  bucket = aws_s3_bucket.mdls.id

  rule {
    id     = "transition-to-ia-after-90-days"
    status = "Enabled"

    filter {}

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
}

# Bronze / silver / gold - the medallion layers of the MDLS lakehouse,
# mirroring the Glue database pattern used across this workspace's ODI demos.
resource "aws_glue_catalog_database" "bronze" {
  name        = "jason_chletsos_cicd_bronze"
  description = "MDLS bronze layer - raw Iceberg tables as landed by Fivetran."
}

resource "aws_glue_catalog_database" "silver" {
  name        = "jason_chletsos_cicd_silver"
  description = "MDLS silver layer - cleaned/conformed Iceberg tables."
}

resource "aws_glue_catalog_database" "gold" {
  name        = "jason_chletsos_cicd_gold"
  description = "MDLS gold layer - mart Iceberg tables."
}
