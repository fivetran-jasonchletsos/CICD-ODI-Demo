// Shared types + loaders for the static mart snapshots exported by
// scripts/export_marts_to_json.py into public/data/*.json. Field names here
// mirror the dbt mart column list exactly (see transform/models/marts/*.sql).

export interface DimCustomer {
  customer_id: number;
  customer_name: string;
  region: 'NA' | 'EMEA' | 'APAC' | 'LATAM' | string;
  plan_tier: 'Starter' | 'Growth' | 'Enterprise' | string;
  signup_date: string;
  lifetime_order_count: number;
  lifetime_revenue: number;
}

export interface FctOrder {
  order_id: number;
  customer_id: number;
  order_date: string;
  status: 'placed' | 'shipped' | 'delivered' | 'cancelled' | string;
  channel: 'web' | 'mobile' | 'partner' | string;
  order_total: number;
  item_count: number;
}

export interface FctDailyRevenue {
  order_date: string;
  order_count: number;
  revenue: number;
  avg_order_value: number;
}

function dataUrl(file: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/data/${file}`;
}

async function loadJson<T>(file: string): Promise<T> {
  const res = await fetch(dataUrl(file));
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${file}`);
  return res.json() as Promise<T>;
}

export const loadDimCustomers = () => loadJson<DimCustomer[]>('dim_customers.json');
export const loadFctOrders = () => loadJson<FctOrder[]>('fct_orders.json');
export const loadFctDailyRevenue = () => loadJson<FctDailyRevenue[]>('fct_daily_revenue.json');

export async function loadAllMarts() {
  const [customers, orders, dailyRevenue] = await Promise.all([
    loadDimCustomers(),
    loadFctOrders(),
    loadFctDailyRevenue(),
  ]);
  return { customers, orders, dailyRevenue };
}

// ── small aggregation helpers used across pages ──────────────────────────

export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

export function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function fmtNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function countBy<T, K extends string | number>(items: T[], key: (item: T) => K): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
