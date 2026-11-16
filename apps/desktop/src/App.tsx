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
  | 'offline';

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

function KpiCard(props: { label: string; value: string; sub: string; tone: 'blue' | 'green' | 'orange' | 'red'; icon: React.ReactNode }) {
  const tones = {
    blue: 'from-[#1976D2] to-[#42A5F5]',
    green: 'from-[#2E7D32] to-[#66BB6A]',
    orange: 'from-[#F57C00] to-[#FFB74D]',
    red: 'from-[#C62828] to-[#EF5350]',
  } as const;
  return (
    <div className="bg-white rounded-2xl border border-vyapara-border p-4 shadow-sm flex items-center gap-3 min-w-0">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tones[props.tone]} flex items-center justify-center text-white shrink-0`}>
        {props.icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-vyapara-secondary truncate">{props.label}</p>
        <p className="text-lg xl:text-xl font-extrabold text-vyapara-navy leading-tight truncate">{props.value}</p>
        <p className="text-[10px] text-vyapara-secondary truncate">{props.sub}</p>
      </div>
    </div>
  );
}

function Dashboard({ userName, userRole, isOnline }: { userName: string; userRole: string; isOnline: boolean }) {
  const [loading, setLoading] = useState(true);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p, a] = await Promise.all([
        (window as any).vyapara?.getTransactions?.({ token: '', limit: 200 }),
        (window as any).vyapara?.getProducts?.({ token: '', includeInactive: false }),
        (window as any).vyapara?.getLowStockAlerts?.(),
      ]);
      setTxns(Array.isArray(t?.data) ? t.data : []);
      setProducts(Array.isArray(p?.data) ? p.data : []);
      setAlerts(Array.isArray(a?.data) ? a.data : []);
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

  const recent = txns.slice(0, 5);
  const lowStock = alerts.slice(0, 5);

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
          icon={<svg {...svgProps}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg>} />
        <KpiCard label="Transaksi Hari Ini" value={String(todayTx.length)} sub="transaksi tercatat" tone="green"
          icon={<svg {...svgProps}><path d="M9 5h6M9 5a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2M9 12h6M9 16h6" /></svg>} />
        <KpiCard label="Produk Aktif" value={String(products.length)} sub="item di katalog" tone="orange"
          icon={<svg {...svgProps}><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /></svg>} />
        <KpiCard label="Stok Menipis" value={String(alerts.length)} sub={alerts.length > 0 ? 'perlu restock' : 'semua stok aman'} tone="red"
          icon={<svg {...svgProps}><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-vyapara-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-vyapara-navy">Grafik Penjualan 7 Hari Terakhir</h2>
            <span className="text-[10px] uppercase tracking-wider text-vyapara-secondary">Omzet harian</span>
          </div>
          <div className="flex items-end gap-2 sm:gap-3 h-44">
            {days.map((d, i) => {
              const daySum = daySums[i] ?? 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className="text-[10px] text-vyapara-secondary">{daySum > 0 ? fmtShort(daySum) : ''}</span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-[#1976D2] to-[#7CB3E8]"
                    style={{ height: `${Math.max(5, Math.round((daySum / maxSum) * 72))}%` }}
                    title={fmtIDR(daySum)}
                  />
                  <span className="text-[10px] font-medium text-vyapara-secondary capitalize">{d.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-vyapara-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-vyapara-navy">Stok Menipis</h2>
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
        {currentView === 'settings' && <Settings />}
        {currentView === 'supplier' && <Supplier />}
      </main>
    </div>
  );
}

export default App;
