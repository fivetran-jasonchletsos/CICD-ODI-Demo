// Fresh three-zone lakehouse diagram for CICD-ODI-Demo, matching the ODI
// pattern used across this workspace (Source -> MDLS Data Lakehouse ->
// Consumers) without depending on any component from another repo.

import type { ReactNode } from 'react';

function HArrow({ label }: { label?: string }) {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center px-1 shrink-0" style={{ width: '3.25rem' }} aria-hidden>
      <svg width="52" height="22" viewBox="0 0 52 22">
        <line x1="2" y1="11" x2="42" y2="11" stroke="var(--ink-soft)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
        <polygon points="38,5 46,11 38,17" fill="var(--ink-soft)" opacity="0.65" />
      </svg>
      {label && <div className="mt-1 text-center text-[9px] font-mono uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>{label}</div>}
    </div>
  );
}

function VArrow({ label }: { label?: string }) {
  return (
    <div className="flex lg:hidden flex-col items-center justify-center py-1" aria-hidden>
      <svg width="22" height="34" viewBox="0 0 22 34">
        <line x1="11" y1="2" x2="11" y2="24" stroke="var(--ink-soft)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
        <polygon points="5,20 11,28 17,20" fill="var(--ink-soft)" opacity="0.65" />
      </svg>
      {label && <div className="text-center text-[9px] font-mono uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>{label}</div>}
    </div>
  );
}

function ZoneShell({
  index,
  title,
  subtitle,
  accent,
  children,
}: {
  index: number;
  title: string;
  subtitle: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex-1 rounded-lg border-2 flex flex-col"
      style={{ borderColor: accent, background: `${accent}08`, minWidth: 0 }}
    >
      <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: `${accent}30` }}>
        <div className="flex items-center gap-2">
          <span
            className="h-6 w-6 rounded-full inline-flex items-center justify-center text-white text-[11px] font-bold font-mono shrink-0"
            style={{ background: accent }}
          >
            {index}
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-[15px] truncate" style={{ color: 'var(--ink-strong)' }}>{title}</div>
            <div className="text-[11px] font-mono uppercase tracking-wide" style={{ color: accent }}>{subtitle}</div>
          </div>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-block text-[10px] font-mono font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: color ? `${color}18` : 'var(--paper-deep)', color: color ?? 'var(--ink-soft)' }}
    >
      {children}
    </span>
  );
}

function Block({
  title,
  detail,
  code,
  color,
  dashed = false,
}: {
  title: string;
  detail: string;
  code?: string;
  color: string;
  dashed?: boolean;
}) {
  return (
    <div
      className="rounded-md p-3"
      style={{
        background: 'var(--card)',
        border: `1px ${dashed ? 'dashed' : 'solid'} ${dashed ? color + '60' : 'var(--hairline)'}`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[13px] font-semibold" style={{ color: 'var(--ink-strong)' }}>{title}</div>
        {dashed && <Chip color={color}>optional</Chip>}
      </div>
      <div className="mt-1 text-[12px] leading-snug" style={{ color: 'var(--ink-muted)' }}>{detail}</div>
      {code && (
        <code className="inline-code mt-2 inline-block text-[10.5px]">{code}</code>
      )}
    </div>
  );
}

const TERRAFORM = 'var(--terraform)';
const GHA = 'var(--gha)';
const FIVETRAN = 'var(--fivetran)';
const DBT = 'var(--dbt-green)';

export default function ThreeZoneArchitecture() {
  return (
    <div>
      <div
        className="rounded-md px-4 py-2.5 mb-5 text-center text-[13px] font-semibold font-mono uppercase tracking-wide"
        style={{ background: 'var(--slate-deep)', color: '#fff' }}
      >
        One copy in S3, many engines on top
      </div>

      <div className="flex flex-col lg:flex-row items-stretch">
        <ZoneShell index={1} title="Source" subtitle="Zone 1" accent={FIVETRAN}>
          <Block
            title="Synthetic app"
            detail="scripts/generate_data.py writes deterministic customers / orders / order_items CSVs."
            code="python scripts/generate_data.py --delta"
            color={FIVETRAN}
          />
          <Block
            title="S3 landing bucket"
            detail="source_bucket_name — versioned, encrypted, public access blocked. Just raw CSVs, no lakehouse logic."
            code="var.source_bucket_name"
            color={FIVETRAN}
          />
          <Block
            title="Fivetran S3 connector"
            detail="Assumes fivetran_source_read (source_landing.tf) — read-only, scoped to this bucket only."
            code="fivetran_connector.orders_s3"
            color={FIVETRAN}
          />
        </ZoneShell>

        <HArrow label="Fivetran sync" />
        <VArrow label="Fivetran sync" />

        <ZoneShell index={2} title="MDLS Data Lakehouse" subtitle="Zone 2 — the core of this architecture" accent={TERRAFORM}>
          <Block
            title="S3 Iceberg lakehouse"
            detail="mdls_bucket_name — a separate bucket from Zone 1. Fivetran's Managed Data Lake Service lands open Iceberg tables here."
            code="var.mdls_bucket_name"
            color={TERRAFORM}
          />
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md p-2.5 text-center" style={{ background: 'var(--card)', border: '1px solid var(--hairline)' }}>
              <Chip color="#a16207">bronze</Chip>
              <div className="mt-1 text-[11px]" style={{ color: 'var(--ink-muted)' }}>raw landed</div>
              <code className="inline-code mt-1 block text-[9.5px]">_cicd_bronze</code>
            </div>
            <div className="rounded-md p-2.5 text-center" style={{ background: 'var(--card)', border: '1px solid var(--hairline)' }}>
              <Chip color="#64748b">silver</Chip>
              <div className="mt-1 text-[11px]" style={{ color: 'var(--ink-muted)' }}>cleaned</div>
              <code className="inline-code mt-1 block text-[9.5px]">_cicd_silver</code>
            </div>
            <div className="rounded-md p-2.5 text-center" style={{ background: 'var(--card)', border: '1px solid var(--hairline)' }}>
              <Chip color="#b45309">gold</Chip>
              <div className="mt-1 text-[11px]" style={{ color: 'var(--ink-muted)' }}>marts</div>
              <code className="inline-code mt-1 block text-[9.5px]">_cicd_gold</code>
            </div>
          </div>
          <Block
            title="AWS Glue catalog"
            detail="Three aws_glue_catalog_database resources — the metadata layer every consumer in Zone 3 reads through."
            color={TERRAFORM}
          />
          <Block
            title="fivetran_mdls_access IAM role"
            detail="Fivetran assumes this role to write Iceberg data + Glue entries. Trust policy gated on sts:ExternalId, distinct from the Zone 1 read role."
            code="var.fivetran_s3_external_id"
            color={TERRAFORM}
          />
          <div
            className="rounded-md p-3 flex items-start gap-2"
            style={{ background: 'var(--gha-bg)', border: `1px solid ${GHA}40` }}
          >
            <span className="h-5 w-5 rounded flex items-center justify-center text-white text-[9px] font-bold font-mono shrink-0 mt-0.5" style={{ background: GHA }}>CI</span>
            <div className="text-[11.5px] leading-snug" style={{ color: 'var(--ink-muted)' }}>
              <strong style={{ color: 'var(--ink-strong)' }}>Everything above is Terraform-provisioned</strong> and PR-reviewed:{' '}
              <code className="inline-code">terraform-plan.yml</code> posts the diff on every pull request touching{' '}
              <code className="inline-code">infra/**</code>; only <code className="inline-code">terraform-apply.yml</code>,
              gated by a GitHub Environment approval, can change anything live.
            </div>
          </div>
        </ZoneShell>

        <HArrow label="read Iceberg" />
        <VArrow label="read Iceberg" />

        <ZoneShell index={3} title="Consumers" subtitle="Zone 3 — same tables, no copies" accent={DBT}>
          <Block
            title="DuckDB"
            detail="Default, free, always-on. Reads local seeds into transform/dev.duckdb for CI and local dbt dev — zero cloud credentials required."
            code="dbt run --target duckdb"
            color={DBT}
          />
          <Block
            title="Athena"
            detail="Always-on, near-free proof point. aws_athena_workgroup queries the same Glue-cataloged Iceberg tables directly — no separate copy."
            code="aws_athena_workgroup.jason_chletsos_cicd_odi_demo"
            color={DBT}
          />
          <Block
            title="Snowflake"
            detail="Optional, 'as needed'. An external volume + Glue catalog integration read the same Iceberg tables in place when an SE wants a live Snowflake demo."
            code="var.enable_snowflake_consumer = true"
            color={TERRAFORM}
            dashed
          />
        </ZoneShell>
      </div>

      <div className="mt-5 text-[12px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
        Every Snowflake resource in <code className="inline-code">snowflake_consumer.tf</code> is{' '}
        <code className="inline-code">count = var.enable_snowflake_consumer ? 1 : 0</code>, so{' '}
        <code className="inline-code">terraform validate</code> and <code className="inline-code">plan</code> succeed with
        zero Snowflake credentials when the flag is left at its default of <code className="inline-code">false</code>.
      </div>
    </div>
  );
}
