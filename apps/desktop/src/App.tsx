/* src/App.tsx */
import React, { useEffect, useState, useCallback } from 'react';
import useAuth from './authStore';
import Login from './Login';
import Supplier from './Supplier';
import Procurement from './Procurement';
import Finance from './Finance';
import Customer from './Customer';
import Reports from './Reports';
import Settings from './Settings';
import POS from './POS';
import OfflineSync from './OfflineSync';
import Products from './Products';
import SalesReturns from './SalesReturns';
import StockAdjustments from './StockAdjustments';
import Catalog from './Catalog';
import logo from './assets/logo.png';
import './index.css';

type View =
  | 'dashboard'
  | 'supplier'
  | 'procurement'
  | 'finance'
  | 'customer'
  | 'reports'
  | 'settings'
  | 'pos'
  | 'offline'
  | 'products'
  | 'returns'
  | 'adjustments'
  | 'catalog';

const iconCls = 'w-5 h-5 shrink-0';
const icons = {
  dashboard: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  pos: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6h15l-1.5 9h-12z" />
      <path d="M6 6L5.2 3H3" />
      <circle cx="10" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </svg>
  ),
  procurement: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  ),
  finance: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="10" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  ),
  customer: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.87 2.69-6.5 6-6.5s6 2.63 6 6.5" />
      <path d="M16 4.6a3.5 3.5 0 010 6.8" />
      <path d="M19 20c0-2.8-1.6-5-4-6" />
    </svg>
  ),
  reports: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M9 16v-5M14 16V8M19 16v-8" />
    </svg>
  ),
  supplier: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8h11v9H2z" />
      <path d="M13 11h4l3 3v3h-7z" />
      <circle cx="6.5" cy="17.5" r="1.5" />
      <circle cx="17" cy="17.5" r="1.5" />
    </svg>
  ),
  settings: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06-.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  sync: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 10-3.2 6.9" />
      <path d="M21 16v-5h-5" />
    </svg>
  ),
  box: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  ),
  tag: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 13.4L11 3.8a2 2 0 0 0-1.4-.6H4a2 2 0 0 0-2 2v5.6a2 2 0 0 0 .6 1.4l9.6 9.6a2 2 0 0 0 2.8 0l6.6-6.6a2 2 0 0 0 0-2.8z" />
      <path d="M7 7h.01" />
    </svg>
  ),
  products: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  returns: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14l-4-4 4-4" />
      <path d="M5 10h9a4 4 0 0 1 0 8h-3" />
    </svg>
  ),
};

const navItems: { id: View; label: string; permission?: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: icons.dashboard },
  { id: 'pos', label: 'Kasir (POS)', icon: icons.pos, permission: 'transaction:write' },
  { id: 'procurement', label: 'Pembelian', icon: icons.procurement, permission: 'procurement:read' },
  { id: 'finance', label: 'Keuangan', icon: icons.finance, permission: 'finance:read' },
  { id: 'customer', label: 'Pelanggan', icon: icons.customer, permission: 'customer:read' },
  { id: 'reports', label: 'Laporan & Analisis', icon: icons.reports, permission: 'reports:read' },
  { id: 'supplier', label: 'Pemasok', icon: icons.supplier, permission: 'supplier:read' },
  { id: 'offline', label: 'Offline Sync', icon: icons.sync },
  { id: 'products', label: 'Produk', icon: icons.products },
  { id: 'returns', label: 'Retur Penjualan', icon: icons.returns },
  { id: 'adjustments', label: 'Penyesuaian Stok', icon: icons.box },
  { id: 'catalog', label: 'Katalog', icon: icons.tag, permission: 'settings:read' },
  { id: 'settings', label: 'Pengaturan', icon: icons.settings, permission: 'settings:read' },
];

const idr = new Intl.NumberFormat('id-ID');
const fmtIDR = (n: number) => `Rp ${idr.format(Math.round(n || 0))}`;
const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}jt` : n >= 1_000 ? `${Math.round(n / 1_000)}rb` : String(Math.round(n));
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

type TxnRow = { createdAt?: string; totalAmount?: number; transactionNumber?: string; paymentMethod?: string; status?: string };
type ProductRow = { id: string; name: string; stock: number; price: number };
type AlertRow = { productId: string; productName: string; currentStock: number; minimumStock: number; unitName: string | null };

function KpiCard(props: { label: string; value: string; sub: string; tone: 'blue' | 'green' | 'orange' | 'red' | 'purple'; icon: React.ReactNode; trend?: 'up' | 'down' | 'flat'; trendLabel?: string }) {
  const tones = {
    blue: 'from-[#1976D2] to-[#42A5F5]',
    green: 'from-[#2E7D32] to-[#66BB6A]',
    orange: 'from-[#F57C00] to-[#FFB74D]',
    red: 'from-[#C62828] to-[#EF5350]',
    purple: 'from-[#5E35B1] to-[#9575CD]',
  } as const;
  const trendColor = props.trend === 'up' ? 'text-emerald-600' : props.trend === 'down' ? 'text-red-500' : 'text-vyapara-secondary';
  return (
    <div className="bg-white rounded-2xl border border-vyapara-border p-4 shadow-sm flex items-center gap-3 min-w-0">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tones[props.tone]} flex items-center justify-center text-white shrink-0`}>
        {props.icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-vyapara-secondary truncate">{props.label}</p>
        <p className="text-lg xl:text-xl font-extrabold text-vyapara-navy leading-tight truncate">{props.value}</p>
        <p className={`text-[10px] font-semibold ${trendColor} leading-tight`}>
          {props.trend === 'up' ? '▲' : props.trend === 'down' ? '▼' : '•'} {props.trendLabel ?? props.sub}
        </p>
      </div>
    </div>
  );
}

function Dashboard({ userName, userRole, isOnline }: { userName: string; userRole: string; isOnline: boolean }) {
  const [loading, setLoading] = useState(true);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p, a, c] = await Promise.all([
        (window as any).vyapara?.getTransactions?.({ token: '', limit: 200 }),
        (window as any).vyapara?.getProducts?.({ token: '', includeInactive: false }),
        (window as any).vyapara?.getLowStockAlerts?.(),
        (window as any).vyapara?.getCategories?.(),
      ]);
      setTxns(Array.isArray(t?.data) ? t.data : []);
      setProducts(Array.isArray(p?.data) ? p.data : []);
      setAlerts(Array.isArray(a?.data) ? a.data : []);
      setCategories(Array.isArray(c?.data) ? c.data : []);
    } catch {
      // keep previous state; cards render empty-state values
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Pagi' : hour < 15 ? 'Siang' : hour < 19 ? 'Sore' : 'Malam';
  const todayLong = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const today = dayKey(new Date());
  const todayTx = txns.filter((t) => String(t.createdAt ?? '').slice(0, 10) === today);
  const omzetToday = todayTx.reduce((s, t) => s + (Number(t.totalAmount) || 0), 0);

  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const daySums = days.map((d) =>
    txns.filter((t) => String(t.createdAt ?? '').slice(0, 10) === dayKey(d)).reduce((s, t) => s + (Number(t.totalAmount) || 0), 0),
  );
  const maxSum = Math.max(...daySums, 1);
  const todaySum = daySums[6] ?? 0;
  const yesterdaySum = daySums[5] ?? 0;
  const omzetTrend = yesterdaySum > 0 ? (todaySum >= yesterdaySum ? 'up' : 'down') : 'flat';
  const omzetTrendLabel = yesterdaySum > 0
    ? `${todaySum >= yesterdaySum ? '+' : ''}${(((todaySum - yesterdaySum) / yesterdaySum) * 100).toFixed(1)}% vs kemarin`
    : '— hari pertama';
  const todayTxCount = todayTx.length;
  const yesterdayTxCount = txns.filter((t) => String(t.createdAt ?? '').slice(0, 10) === dayKey(new Date(Date.now() - 86400000))).length;
  const txTrend = yesterdayTxCount > 0 ? (todayTxCount >= yesterdayTxCount ? 'up' : 'down') : 'flat';
  const txTrendLabel = yesterdayTxCount > 0
    ? `${todayTxCount >= yesterdayTxCount ? '+' : ''}${(((todayTxCount - yesterdayTxCount) / yesterdayTxCount) * 100).toFixed(1)}% vs kemarin`
    : '— hari pertama';

  const recent = txns.slice(0, 5);
  const lowStock = alerts.slice(0, 5);

  // --- composition of revenue by product category (real data) ---
  const productById = new Map((products as any[]).map((p: any) => [p.id, p]));
  const catName = new Map((categories as any[]).map((c: any) => [c.id, c.name]));
  const catTotals = new Map<string, number>();
  for (const t of txns) {
    for (const it of (t as any).items ?? []) {
      const p = productById.get(it.productId as string) as any | undefined;
      const label = (p?.categoryName as string) || (p?.categoryId && catName.get(p.categoryId)) || 'Tanpa Kategori';
      catTotals.set(label, (catTotals.get(label) ?? 0) + (Number(it.subtotal) || 0));
    }
  }
  const grandTotal = [...catTotals.values()].reduce((s, v) => s + v, 0);
  const composition = [...catTotals.entries()]
    .map(([label, value]) => ({ label, value, pct: grandTotal > 0 ? (value / grandTotal) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
  const compositionPal = ['#1976D2', '#FF8F00', '#42A5F5', '#66BB6A'];
  let compAccum = 0;
  const compSlices = composition.map((c, i) => {
    const start = compAccum;
    compAccum += c.pct;
    return { ...c, start, end: compAccum, color: compositionPal[i % compositionPal.length]! };
  });

  const svgProps = { className: 'w-6 h-6', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-vyapara-secondary">Beranda / Dashboard</p>
          <h1 className="text-2xl font-extrabold text-vyapara-navy leading-tight">Selamat {greeting}, {userName.split(' ')[0] || 'Pengguna'}</h1>
          <p className="text-xs text-vyapara-secondary capitalize">{todayLong}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-medium bg-white border border-vyapara-border rounded-full px-3 py-1.5 text-vyapara-secondary">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-white border border-vyapara-border rounded-full px-3 py-1.5 text-vyapara-navy">
            Toko Utama
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
          </span>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1 text-xs font-semibold bg-[#1976D2] text-white rounded-full px-3 py-1.5 hover:bg-[#1565B5] transition"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12a9 9 0 11-3-6.7" /><path d="M21 3v6h-6" />
            </svg>
            {loading ? 'Memuat' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Omzet Hari Ini" value={fmtIDR(omzetToday)} sub={`${todayTx.length} transaksi selesai`} tone="blue"
          icon={<svg {...svgProps}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg>} trend={omzetTrend as 'up' | 'down' | 'flat'} trendLabel={omzetTrendLabel} />
        <KpiCard label="Transaksi Hari Ini" value={String(todayTx.length)} sub="transaksi selesai" tone="green"
          icon={<svg {...svgProps}><path d="M9 5h6M9 5a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2M9 12h6M9 16h6" /></svg>} trend={txTrend as 'up' | 'down' | 'flat'} trendLabel={txTrendLabel} />
        <KpiCard label="Produk Aktif" value={String(products.length)} sub="item di katalog" tone="orange"
          icon={<svg {...svgProps}><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /></svg>} trend="flat" trendLabel="item di katalog" />
        <KpiCard label="Stok Menipis" value={String(alerts.length)} sub={alerts.length > 0 ? 'perlu restock' : 'semua stok aman'} tone="red"
          icon={<svg {...svgProps}><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>} trend="flat" trendLabel={alerts.length > 0 ? 'perlu restock' : 'semua stok aman'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-vyapara-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-vyapara-navy">Grafik Penjualan 7 Hari Terakhir</h2>
            <span className="text-[10px] uppercase tracking-wider text-vyapara-secondary">Omzet harian</span>
          </div>
          {(() => {
            const W = 640; const H = 180; const PAD = { l: 34, r: 10, t: 22, b: 26 };
            const max = Math.max(...daySums, 1);
            const pts = daySums.map((v, i) => {
              const x = PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(daySums.length - 1, 1);
              const y = PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
              return [x, y] as const;
            });
            const line = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
            const area = pts.length === 0
              ? ''
              : `${line} L${pts[pts.length - 1]![0]},${H - PAD.b} L${pts[0]![0]},${H - PAD.b} Z`;
            const yTicks = [0, 1, 2, 3].map((i) => Math.round((max / 3) * (3 - i)));
            const peak = Math.max(...daySums, 0);
            return (
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44" role="img" aria-label="Grafik penjualan 7 hari terakhir">
                {yTicks.map((v, i) => {
                  const y = PAD.t + (i * (H - PAD.t - PAD.b)) / 3;
                  return (
                    <g key={i}>
                      <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="3 4" />
                      <text x={PAD.l - 6} y={y + 3} fontSize="10" fill="#64748B" textAnchor="end">{fmtShort(v)}</text>
                    </g>
                  );
                })}
                <path d={area} fill="url(#gradArea)" opacity="0.25" />
                <path d={line} fill="none" stroke="#1976D2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#42A5F5" />
                    <stop offset="100%" stopColor="#42A5F5" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {pts.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="3.5" fill="#0D47A1" stroke="#fff" strokeWidth="1.5" />
                ))}
                <text x={PAD.l} y={14} fontSize="11" fontWeight="700" fill="#FF8F00">
                  {peak > 0 ? `Puncak ${fmtIDR(peak)}` : 'Belum ada data'}
                </text>
                {days.map((d, i) => (
                  <text key={i} x={pts[i]?.[0]} y={H - 6} fontSize="10" fill="#64748B" textAnchor="middle">
                    {d.toLocaleDateString('id-ID', { weekday: 'short' })}
                  </text>
                ))}
              </svg>
            );
          })()}
        </div>

        <div className="bg-white rounded-2xl border border-vyapara-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
        <div className="bg-white rounded-2xl border border-vyapara-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-vyapara-navy">Stok Menipis</h2>
            <span className="text-[10px] uppercase tracking-wider text-vyapara-secondary">{alerts.length} item</span>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-vyapara-secondary py-8 text-center">{loading ? 'Memuat…' : 'Semua stok aman.'}</p>
          ) : (
            <ul className="divide-y divide-vyapara-border">
              {lowStock.map((a) => (
                <li key={a.productId} className="py-2 flex items-center justify-between gap-2">
                  <span className="text-sm text-vyapara-text truncate">{a.productName}</span>
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5 whitespace-nowrap">
                    {a.currentStock} {a.unitName ?? 'pcs'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

            <h2 className="font-bold text-vyapara-navy">Komposisi Pendapatan</h2>
            <span className="text-[10px] uppercase tracking-wider text-vyapara-secondary">per kategori</span>
          </div>
          {grandTotal === 0 ? (
            <p className="text-sm text-vyapara-secondary py-8 text-center">{loading ? 'Memuat…' : 'Belum ada transaksi.'}</p>
          ) : (
            <div className="flex items-center gap-5">
              <svg viewBox="0 0 42 42" className="w-36 h-36 shrink-0" role="img" aria-label="Komposisi pendapatan per kategori">
                <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#F1F5F9" strokeWidth="6" />
                {compSlices.map((s) => {
                  const r = 15.9155;
                  const C = 2 * Math.PI * r;
                  const startAngle = (s.start / 100) * 360 - 90;
                  const endAngle = (s.end / 100) * 360 - 90;
                  const large = endAngle - startAngle > 180 ? 1 : 0;
                  const toXY = (deg: number) => {
                    const rad = (deg * Math.PI) / 180;
                    return { x: 21 + r * Math.cos(rad), y: 21 + r * Math.sin(rad) };
                  };
                  const p1 = toXY(startAngle); const p2 = toXY(endAngle);
                  const d = `M21,21 L${p1.x.toFixed(3)},${p1.y.toFixed(3)} A${r},${r} 0 ${large} 1 ${p2.x.toFixed(3)},${p2.y.toFixed(3)} Z`;
                  return <path key={s.label} d={d} fill={s.color} stroke="#fff" strokeWidth="1" />;
                })}
                <circle cx="21" cy="21" r="9" fill="#fff" />
                <text x="21" y="20" textAnchor="middle" fontSize="4.5" fontWeight="700" fill="#0D47A1">Total</text>
                <text x="21" y="26" textAnchor="middle" fontSize="6" fontWeight="800" fill="#0D47A1">{fmtShort(grandTotal)}</text>
              </svg>
              <ul className="flex-1 space-y-1.5 text-[12px]">
                {compSlices.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                      <span className="truncate text-vyapara-text font-medium">{s.label}</span>
                    </span>
                    <span className="font-semibold text-vyapara-navy">{s.pct.toFixed(0)}%</span>
                  </li>
                ))}
                {grandTotal > 0 && composition.length < catTotals.size && (
                  <li className="flex items-center justify-between gap-2 text-vyapara-secondary">
                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-vyapara-border" />Lainnya</span>
                    <span className="font-semibold">{(100 - composition.reduce((s, c) => s + c.pct, 0)).toFixed(0)}%</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-vyapara-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-vyapara-border">
          <h2 className="font-semibold text-vyapara-navy">Pesanan Terbaru</h2>
          <span className="text-[10px] uppercase tracking-wider text-vyapara-secondary">{txns.length} transaksi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-vyapara-secondary bg-vyapara-surface">
                <th className="px-5 py-2">No. Order</th>
                <th className="px-5 py-2">Waktu</th>
                <th className="px-5 py-2">Metode</th>
                <th className="px-5 py-2 text-right">Total</th>
                <th className="px-5 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vyapara-border">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-vyapara-secondary">
                    {loading ? 'Memuat…' : 'Belum ada transaksi tercatat.'}
                  </td>
                </tr>
              ) : (
                recent.map((t, i) => (
                  <tr key={i} className="hover:bg-vyapara-surface/60">
                    <td className="px-5 py-2 font-medium text-vyapara-navy">{t.transactionNumber ?? '-'}</td>
                    <td className="px-5 py-2 text-vyapara-secondary">{t.createdAt ? new Date(t.createdAt).toLocaleString('id-ID') : '-'}</td>
                    <td className="px-5 py-2 capitalize">{t.paymentMethod ?? '-'}</td>
                    <td className="px-5 py-2 text-right font-semibold">{fmtIDR(Number(t.totalAmount) || 0)}</td>
                    <td className="px-5 py-2 text-right">
                      <span className="text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                        {t.status === 'completed' ? 'Selesai' : t.status ?? 'Selesai'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const { user, isAuthenticated, isLoading: authIsLoading, checkSession, logout } = useAuth();

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const userPermissions = user?.permissions ?? [];
  const visibleNav = navItems.filter((item) => !item.permission || userPermissions.includes(item.permission));
  const initials = (user?.name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  if (authIsLoading) {
    return (
      <div className="min-h-screen bg-vyapara-surface flex items-center justify-center font-inter">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="VYAPARA" className="h-14 w-auto opacity-90" />
          <p className="text-sm text-vyapara-secondary">Memuat sesi…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-vyapara-text font-inter">
      <aside className="fixed left-0 top-0 bottom-0 w-64 flex flex-col bg-gradient-to-b from-[#0D47A1] via-[#114E9C] to-[#0B3B73] text-white z-10">
        <div className="px-4 pt-5 pb-5">
          <div className="bg-white rounded-xl px-3 py-2.5 shadow-md">
            <img src={logo} alt="VYAPARA Business Management" className="h-9 w-auto mx-auto object-contain" />
          </div>
          <p className="text-center text-[9px] uppercase tracking-[0.25em] text-white/55 mt-2">POS · ATK · Percetakan</p>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === item.id
                  ? 'bg-[#1976D2] text-white shadow-[inset_4px_0_0_#FF8F00]'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FF8F00] text-white text-sm font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/55">
                {user?.role === 'admin' ? 'Pemilik Toko' : user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              setCurrentView('dashboard');
            }}
            className="mt-3 w-full flex items-center gap-2 text-xs font-medium text-red-200 hover:text-white hover:bg-red-500/20 rounded-lg px-3 py-2 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      <main className="ml-64 min-h-screen p-6">
        {currentView === 'dashboard' && (
          <Dashboard userName={user?.name ?? 'Pengguna'} userRole={user?.role ?? 'viewer'} isOnline={isOnline} />
        )}
        {currentView === 'pos' && <POS />}
        {currentView === 'procurement' && <Procurement />}
        {currentView === 'finance' && <Finance />}
        {currentView === 'customer' && <Customer />}
        {currentView === 'reports' && <Reports />}
        {currentView === 'offline' && <OfflineSync />}
        {currentView === 'products' && <Products />}
        {currentView === 'returns' && <SalesReturns />}
        {currentView === 'adjustments' && <StockAdjustments />}
        {currentView === 'catalog' && <Catalog />}
        {currentView === 'settings' && <Settings />}
        {currentView === 'supplier' && <Supplier />}
      </main>
    </div>
  );
}

export default App;
