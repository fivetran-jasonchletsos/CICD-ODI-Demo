import ThreeZoneArchitecture from '../components/ThreeZoneArchitecture';

export default function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="eyebrow mb-3">Architecture</div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: 'var(--ink-strong)' }}>
        A three-zone MDLS lakehouse, not a source-to-destination pipeline
      </h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
        This is not a simple "source syncs into a warehouse" diagram. Fivetran's Managed Data Lake Service
        (MDLS) means the destination itself <em>is</em> an open Iceberg lakehouse in customer-owned S3 —
        so the interesting architecture question isn't "where does the data land," it's "how many engines
        can query it without a copy." That's the three-zone shape below, and it's the same pattern used
        across this workspace's other ODI demos.
      </p>

      <div className="mt-8">
        <ThreeZoneArchitecture />
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-sm font-semibold" style={{ color: 'var(--ink-strong)' }}>Zone 1 — Source</div>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
            A synthetic app (<code className="inline-code">scripts/generate_data.py</code>) writes raw CSVs
            to a small landing bucket. Fivetran's S3 connector reads from here — this bucket has nothing to
            do with the lakehouse itself.
          </p>
        </div>
        <div className="card p-5" style={{ borderColor: 'var(--terraform)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--ink-strong)' }}>Zone 2 — MDLS Data Lakehouse</div>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
            The core of the architecture. A separate S3 bucket holds open Iceberg tables, cataloged in Glue
            across bronze / silver / gold databases. Fivetran writes here via an assume-role trust policy
            gated on an external ID — all of it provisioned by Terraform and reviewed before it goes live.
          </p>
        </div>
        <div className="card p-5">
          <div className="text-sm font-semibold" style={{ color: 'var(--ink-strong)' }}>Zone 3 — Consumers</div>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
            DuckDB (free, always-on, powers CI) and Athena (always-on, near-free) read the Iceberg tables
            today. Snowflake is provisioned by the same Terraform, gated behind{' '}
            <code className="inline-code">enable_snowflake_consumer</code>, for when an SE wants to show it live.
          </p>
        </div>
      </div>

      <div className="mt-10 card p-6">
        <div className="text-sm font-semibold mb-2" style={{ color: 'var(--ink-strong)' }}>
          Why the MDLS destination itself isn't a Terraform resource
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
          The <code className="inline-code">fivetran/fivetran</code> Terraform provider can create the S3
          connector (<code className="inline-code">fivetran_connector.orders_s3</code> in{' '}
          <code className="inline-code">fivetran.tf</code>) but it cannot create the MDLS destination
          object itself — that operation is REST-API-only today. So destination creation stays a one-time
          bootstrap step: <code className="inline-code">scripts/create_mdls_destination.sh</code>, run manually
          via the <code className="inline-code">bootstrap-mdls.yml</code> workflow (<code className="inline-code">workflow_dispatch</code>{' '}
          only, never scheduled). Its output — the destination/group id — gets pasted into{' '}
          <code className="inline-code">terraform.tfvars</code> as{' '}
          <code className="inline-code">fivetran_mdls_destination_id</code>, and everything downstream of that
          (the connector, the bucket, the IAM roles, the Glue catalog, the optional Snowflake layer) is
          ordinary, PR-reviewed Terraform.
        </p>
      </div>
    </div>
  );
}
