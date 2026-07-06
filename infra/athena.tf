# Zone 3 consumer #2 (always-on, near-free): Athena queries the same
# Iceberg tables cataloged in Glue - a second proof point (alongside DuckDB)
# that "one copy, many engines" is real.

resource "aws_athena_workgroup" "jason_chletsos_cicd_odi_demo" {
  name = "jason_chletsos_cicd_odi_demo"

  configuration {
    enforce_workgroup_configuration    = true
    publish_cloudwatch_metrics_enabled = true

    result_configuration {
      output_location = "s3://${aws_s3_bucket.mdls.bucket}/athena-results/"

      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }
  }
}
