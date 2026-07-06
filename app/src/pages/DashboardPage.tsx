import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { loadAllMarts, countBy, fmtCurrency, type DimCustomer, type FctOrder, type FctDailyRevenue } from '../lib/data';

const TERRAFORM = '#7B42BC';
const GHA = '#2088FF';
const DBT_GREEN = '#0DB052';
const PALETTE = [TERRAFORM, GHA, DBT_GREEN, '#d97706', '#dc2626', '#64748b'];

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <div className="text-sm font-semibold" style={{ color: 'var(--ink-strong)' }}>{title}</div>
        <div className="text-[11.5px] font-mono uppercase tracking-wide mt-0.5" style={{ color: 'var(--ink-soft)' }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function tooltipStyle() {
  return {
    contentStyle: { background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 6, fontSize: 12 },
    labelStyle: { color: 'var(--ink-strong)', fontWeight: 600 },
  };
}

export default function DashboardPage() {
  const [customers, setCustomers] = useState<DimCustomer[] | null>(null);
  const [orders, setOrders] = useState<FctOrder[] | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<FctDailyRevenue[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAllMarts()
      .then((data) => {
        if (cancelled) return;
        setCustomers(data.customers);
        setOrders(data.orders);
        setDailyRevenue(data.dailyRevenue);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => { cancelled = true; };
  }, []);

  const revenueTrend = useMemo(() => {
    if (!dailyRevenue) return [];
    // Downsample to weekly points if there's a full year of daily data, so the
    // line chart stays legible instead of a dense 366-point smear.
    const sorted = [...dailyRevenue].sort((a, b) => a.order_date.localeCompare(b.order_date));
    const bucketed: { order_date: string; revenue: number; order_count: number }[] = [];
    for (let i = 0; i < sorted.length; i += 7) {
      const slice = sorted.slice(i, i + 7);
      bucketed.push({
        order_date: slice[0].order_date,
        revenue: slice.reduce((a, d) => a + d.revenue, 0),
        order_count: slice.reduce((a, d) => a + d.order_count, 0),
      });
    }
    return bucketed;
  }, [dailyRevenue]);

  const ordersByChannel = useMemo(() => {
    if (!orders) return [];
    const counts = countBy(orders, (o) => o.channel);
    return Object.entries(counts).map(([channel, count]) => ({ channel, count }));
  }, [orders]);

  const regionCounts = useMemo(() => {
    if (!customers) return [];
    const counts = countBy(customers, (c) => c.region);
    return Object.entries(counts)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);
  }, [customers]);

  const planTierMix = useMemo(() => {
    if (!customers) return [];
    const counts = countBy(customers, (c) => c.plan_tier);
    return Object.entries(counts).map(([tier, count]) => ({ tier, count }));
  }, [customers]);

  const loading = !customers || !orders || !dailyRevenue;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="eyebrow mb-3">Dashboard</div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: 'var(--ink-strong)' }}>
        Gold-layer marts, straight from the DuckDB consumer
      </h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
        Every chart below reads the static <code className="inline-code">public/data/*.json</code> snapshots
        exported from <code className="inline-code">dim_customers</code>, <code className="inline-code">fct_orders</code>,
        and <code className="inline-code">fct_daily_revenue</code> — the same gold-layer Iceberg tables
        DuckDB, Athena, and (optionally) Snowflake all read in Zone 3.
      </p>

      {error && (
        <div className="mt-6 card p-4 text-sm" style={{ color: 'var(--bad)' }}>
          Could not load mart snapshots ({error}).
        </div>
      )}
      {loading && !error && (
        <div className="mt-6 text-sm" style={{ color: 'var(--ink-soft)' }}>Loading mart snapshots…</div>
      )}

      {!loading && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Daily revenue trend" subtitle="fct_daily_revenue, weekly buckets">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                <XAxis dataKey="order_date" tick={{ fontSize: 10 }} stroke="var(--ink-soft)" minTickGap={24} />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--ink-soft)" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle()} formatter={(v) => fmtCurrency(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke={TERRAFORM} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Orders by channel" subtitle="fct_orders, grouped by channel">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ordersByChannel}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                <XAxis dataKey="channel" tick={{ fontSize: 11 }} stroke="var(--ink-soft)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--ink-soft)" />
                <Tooltip {...tooltipStyle()} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {ordersByChannel.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top regions by customer count" subtitle="dim_customers, grouped by region">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={regionCounts} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--ink-soft)" />
                <YAxis type="category" dataKey="region" tick={{ fontSize: 11 }} stroke="var(--ink-soft)" width={60} />
                <Tooltip {...tooltipStyle()} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {regionCounts.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Plan-tier mix" subtitle="dim_customers, grouped by plan_tier">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={planTierMix} dataKey="count" nameKey="tier" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {planTierMix.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip {...tooltipStyle()} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
