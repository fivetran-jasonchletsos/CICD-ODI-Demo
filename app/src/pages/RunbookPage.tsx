import type { ReactNode } from 'react';

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span
          className="h-8 w-8 rounded-full inline-flex items-center justify-center text-white font-bold font-mono text-sm shrink-0"
          style={{ background: 'var(--terraform)' }}
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[16px]" style={{ color: 'var(--ink-strong)' }}>{title}</div>
          <div className="mt-2 text-[13.5px] leading-relaxed space-y-2" style={{ color: 'var(--ink-muted)' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre
      className="mt-2 rounded-md p-3 text-[12px] font-mono overflow-x-auto"
      style={{ background: 'var(--slate-deep)', color: '#d7dcea' }}
    >
      {children}
    </pre>
  );
}

export default function RunbookPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="eyebrow mb-3">Runbook</div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: 'var(--ink-strong)' }}>
        Add Terraform + CI/CD to any ODI/MDLS demo in 5 steps
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
        This repo is the template. Every file referenced below actually exists here — copy the shape,
        rename the vertical, keep the mechanics. Written for the #se_demo_improvements thread with Aaron
        Dear, since every other ODI demo in this workspace still applies Terraform by hand.
      </p>

      <div className="mt-8 space-y-5">
        <Step n={1} title="Lay out infra/ before you touch a console">
          <p>
            Copy the <code className="inline-code">infra/</code> file layout: <code className="inline-code">versions.tf</code>,{' '}
            <code className="inline-code">main.tf</code> (providers), <code className="inline-code">variables.tf</code>,{' '}
            <code className="inline-code">glue_lakehouse.tf</code> (the MDLS bucket + bronze/silver/gold Glue
            databases), <code className="inline-code">iam_mdls.tf</code>, <code className="inline-code">athena.tf</code>,{' '}
            <code className="inline-code">source_landing.tf</code>, <code className="inline-code">fivetran.tf</code>,{' '}
            <code className="inline-code">snowflake_consumer.tf</code>, and <code className="inline-code">outputs.tf</code>.
            One file per concern keeps each PR diff small enough for an SE reviewer to actually read.
          </p>
          <p>
            Ship <code className="inline-code">terraform.tfvars.example</code> with a placeholder for every
            variable and no real secrets — that's the file a new SE copies to{' '}
            <code className="inline-code">terraform.tfvars</code> locally.
          </p>
        </Step>

        <Step n={2} title="Make the optional consumer actually optional">
          <p>
            Any "as needed" consumer (Snowflake here) gets one boolean:{' '}
            <code className="inline-code">enable_snowflake_consumer</code>, default <code className="inline-code">false</code>.
            Every resource that depends on it uses a count guard, not a separate module or workspace:
          </p>
          <Code>{`resource "snowflake_external_volume" "mdls" {
  count = var.enable_snowflake_consumer ? 1 : 0
  ...
}`}</Code>
          <p>
            This is what makes <code className="inline-code">terraform validate</code> and{' '}
            <code className="inline-code">plan</code> pass with zero Snowflake credentials configured — the
            default path for every fork of this demo.
          </p>
        </Step>

        <Step n={3} title="Gate infra changes with a PR-triggered plan, not a human running apply locally">
          <p>
            <code className="inline-code">terraform-plan.yml</code> runs on every pull request touching{' '}
            <code className="inline-code">infra/**</code>: <code className="inline-code">terraform fmt -check</code>,{' '}
            <code className="inline-code">init -backend=false</code>, <code className="inline-code">validate</code>, then{' '}
            <code className="inline-code">plan</code>, with the output posted back as a PR comment via{' '}
            <code className="inline-code">actions/github-script</code>. Reviewers approve a diff, not a
            console screenshot.
          </p>
          <p>
            <code className="inline-code">terraform-apply.yml</code> only runs on push to{' '}
            <code className="inline-code">main</code>, and targets a GitHub Environment (<code className="inline-code">production</code>)
            with a required manual-approval reviewer — the same mechanism GitHub already gives you, no
            extra tooling.
          </p>
        </Step>

        <Step n={4} title="Keep one workflow that needs zero secrets to prove out">
          <p>
            <code className="inline-code">dbt_run.yml</code> is the load-bearing one: it installs{' '}
            <code className="inline-code">dbt-core</code> + <code className="inline-code">dbt-duckdb</code>,
            regenerates seeds if missing, runs <code className="inline-code">dbt seed / run / test / docs
            generate</code> against the default DuckDB target, exports the marts to{' '}
            <code className="inline-code">app/public/data/*.json</code>, and commits the refreshed snapshot
            back to <code className="inline-code">main</code> with{' '}
            <code className="inline-code">stefanzweifel/git-auto-commit-action</code>. No AWS, no Fivetran,
            no Snowflake — this must go green on a bare fork.
          </p>
          <p>
            Guard every cloud-touching step in the other workflows on secret presence, e.g.{' '}
            <code className="inline-code">if: env.FIVETRAN_API_KEY != ''</code> in{' '}
            <code className="inline-code">generate_and_sync.yml</code> — so a fresh clone doesn't hard-fail
            CI just because it lacks live credentials.
          </p>
        </Step>

        <Step n={5} title="Wire the secrets once, name them the same way everywhere">
          <p>
            Six repo secrets cover the whole thing: <code className="inline-code">FIVETRAN_API_KEY</code>,{' '}
            <code className="inline-code">FIVETRAN_API_SECRET</code>,{' '}
            <code className="inline-code">FIVETRAN_MDLS_DESTINATION_ID</code>,{' '}
            <code className="inline-code">FIVETRAN_S3_EXTERNAL_ID</code>,{' '}
            <code className="inline-code">FIVETRAN_CONNECTOR_ID</code>, and standard AWS credentials for{' '}
            <code className="inline-code">aws-actions/configure-aws-credentials</code>.
          </p>
          <p>
            Bootstrap the MDLS destination exactly once per environment with{' '}
            <code className="inline-code">scripts/create_mdls_destination.sh</code>, triggered manually via{' '}
            <code className="inline-code">bootstrap-mdls.yml</code> (<code className="inline-code">workflow_dispatch</code> only
            — never scheduled or on push, since destination creation isn't idempotent infrastructure). Paste
            the printed id into <code className="inline-code">terraform.tfvars</code> and into the{' '}
            <code className="inline-code">FIVETRAN_MDLS_DESTINATION_ID</code> repo secret, then everything
            downstream — the connector, the bucket, the IAM roles — is ordinary reviewed Terraform.
          </p>
        </Step>
      </div>

      <div className="mt-10 card p-6">
        <div className="text-sm font-semibold mb-2" style={{ color: 'var(--ink-strong)' }}>The six workflow files, at a glance</div>
        <ul className="text-[13px] leading-relaxed space-y-1.5" style={{ color: 'var(--ink-muted)' }}>
          <li><code className="inline-code">terraform-plan.yml</code> — PR gate for infra/**</li>
          <li><code className="inline-code">terraform-apply.yml</code> — push-to-main apply, environment-gated</li>
          <li><code className="inline-code">bootstrap-mdls.yml</code> — manual, one-time MDLS destination creation</li>
          <li><code className="inline-code">generate_and_sync.yml</code> — daily delta generation + forced Fivetran sync</li>
          <li><code className="inline-code">dbt_run.yml</code> — the zero-secret, always-green dbt build + mart export</li>
          <li><code className="inline-code">deploy.yml</code> — builds app/ and deploys to GitHub Pages</li>
        </ul>
      </div>
    </div>
  );
}
