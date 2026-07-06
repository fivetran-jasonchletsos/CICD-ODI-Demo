import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  loadDimCustomers,
  loadFctDailyRevenue,
  sum,
  fmtCurrency,
  fmtNumber,
  type DimCustomer,
  type FctDailyRevenue,
} from '../lib/data';

interface Kpis {
  totalRevenue: number;
  totalOrders: number;
  activeCustomers: number;
  avgOrderValue: number;
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-5">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 text-3xl font-semibold" style={{ color: 'var(--ink-strong)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div className="mt-1 text-[13px]" style={{ color: 'var(--ink-soft)' }}>{sub}</div>
    </div>
  );
}

export default function OverviewPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadFctDailyRevenue(), loadDimCustomers()])
      .then(([daily, customers]: [FctDailyRevenue[], DimCustomer[]]) => {
        if (cancelled) return;
        const totalRevenue = sum(daily.map((d) => d.revenue));
        const totalOrders = sum(daily.map((d) => d.order_count));
        const activeCustomers = customers.filter((c) => c.lifetime_order_count > 0).length;
        setKpis({
          totalRevenue,
          totalOrders,
          activeCustomers,
          avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        });
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="eyebrow mb-3">Overview</div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: 'var(--ink-strong)' }}>
        Terraform + GitHub Actions around an MDLS Fivetran + dbt pipeline
      </h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
        Infra changes go through a PR-reviewed <code className="inline-code">terraform plan</code> before
        they touch anything live. The data (synthetic orders) is just a stand-in — see{' '}
        <code className="inline-code">infra/</code> for the Terraform and the README for setup.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/architecture"
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--terraform)' }}
        >
          See the three-zone architecture
        </Link>
        <Link
          to="/runbook"
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold border"
          style={{ borderColor: 'var(--hairline)', color: 'var(--ink)' }}
        >
          Read the 5-step runbook
        </Link>
      </div>

      <section className="mt-10">
        <div className="eyebrow mb-3">Gold-layer KPI scorecard</div>
        {error && (
          <div className="card p-4 text-sm" style={{ color: 'var(--bad)' }}>
            Could not load public/data/*.json ({error}). Run <code className="inline-code">dbt run</code> then{' '}
            <code className="inline-code">scripts/export_marts_to_json.py</code> to generate the mart snapshots.
          </div>
        )}
        {!error && !kpis && (
          <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>Loading mart snapshots…</div>
        )}
        {kpis && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total revenue" value={fmtCurrency(kpis.totalRevenue)} sub="fct_daily_revenue, summed" />
            <KpiCard label="Total orders" value={fmtNumber(kpis.totalOrders)} sub="fct_daily_revenue, summed" />
            <KpiCard label="Active customers" value={fmtNumber(kpis.activeCustomers)} sub="dim_customers, lifetime_order_count > 0" />
            <KpiCard label="Avg order value" value={fmtCurrency(kpis.avgOrderValue)} sub="total revenue / total orders" />
          </div>
        )}
      </section>
    </div>
  );
}
