# Zone 1: Source
#
# The synthetic app (scripts/generate_data.py) writes raw CSVs here. The
# Fivetran S3 connector (fivetran.tf) reads from this bucket and lands the
# data into the MDLS lakehouse (glue_lakehouse.tf). This bucket and its read
# role are intentionally separate from the MDLS bucket/write role so the
# blast radius of each Fivetran-assumed role is scoped to exactly one job.

resource "aws_s3_bucket" "source_landing" {
  bucket = var.source_bucket_name
}

resource "aws_s3_bucket_versioning" "source_landing" {
  bucket = aws_s3_bucket.source_landing.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "source_landing" {
  bucket = aws_s3_bucket.source_landing.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "source_landing" {
  bucket = aws_s3_bucket.source_landing.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_iam_policy_document" "fivetran_source_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::834469178297:root"]
    }

    condition {
      test     = "StringEquals"
      variable = "sts:ExternalId"
      values   = [var.fivetran_s3_external_id]
    }
  }
}

resource "aws_iam_role" "fivetran_source_read" {
  name               = "fivetran-source-read"
  description        = "Assumed by the Fivetran S3 source connector to read raw CSVs from the landing bucket."
  assume_role_policy = data.aws_iam_policy_document.fivetran_source_trust.json
}

data "aws_iam_policy_document" "fivetran_source_read" {
  statement {
    sid    = "SourceBucketReadOnly"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.source_landing.arn,
      "${aws_s3_bucket.source_landing.arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "fivetran_source_read" {
  name   = "fivetran-source-read"
  role   = aws_iam_role.fivetran_source_read.id
  policy = data.aws_iam_policy_document.fivetran_source_read.json
}
