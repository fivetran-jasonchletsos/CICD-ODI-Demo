# IAM role Fivetran assumes to write MDLS Iceberg data + Glue catalog
# entries into this bucket. Gated by an external_id condition supplied by
# Fivetran (var.fivetran_s3_external_id), distinct from the source-read role
# in source_landing.tf.

data "aws_iam_policy_document" "fivetran_mdls_trust" {
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

resource "aws_iam_role" "fivetran_mdls_access" {
  name               = "fivetran-mdls-access"
  description        = "Assumed by Fivetran to write Iceberg data and Glue catalog entries for the MDLS lakehouse."
  assume_role_policy = data.aws_iam_policy_document.fivetran_mdls_trust.json
}

data "aws_iam_policy_document" "fivetran_mdls_access" {
  statement {
    sid    = "MDLSBucketReadWrite"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.mdls.arn,
      "${aws_s3_bucket.mdls.arn}/*",
    ]
  }

  statement {
    sid    = "MDLSGlueCatalog"
    effect = "Allow"
    actions = [
      "glue:*",
    ]
    resources = [
      "arn:aws:glue:${var.aws_region}:*:catalog",
      "arn:aws:glue:${var.aws_region}:*:database/${aws_glue_catalog_database.bronze.name}",
      "arn:aws:glue:${var.aws_region}:*:database/${aws_glue_catalog_database.silver.name}",
      "arn:aws:glue:${var.aws_region}:*:database/${aws_glue_catalog_database.gold.name}",
      "arn:aws:glue:${var.aws_region}:*:table/${aws_glue_catalog_database.bronze.name}/*",
      "arn:aws:glue:${var.aws_region}:*:table/${aws_glue_catalog_database.silver.name}/*",
      "arn:aws:glue:${var.aws_region}:*:table/${aws_glue_catalog_database.gold.name}/*",
    ]
  }
}

resource "aws_iam_role_policy" "fivetran_mdls_access" {
  name   = "fivetran-mdls-access"
  role   = aws_iam_role.fivetran_mdls_access.id
  policy = data.aws_iam_policy_document.fivetran_mdls_access.json
}
