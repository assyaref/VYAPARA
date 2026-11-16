/* src/StockOpname.tsx */
import React, { useEffect, useState, useCallback } from 'react';
import useAuth from './authStore';

const vyapara = (window as any).vyapara;

type Product = { id: string; name: string; stock: number; price: number; cost: number; unitName?: string | null };
type Opname = {
  id: string; opnameNumber: string; opnameDate: string; location?: string | null;
  status: string; totalItemsCounted: number; totalItemsDifference: number;
  userName?: string | null; approvedByName?: string | null; notes?: string | null; createdAt: string;
};
type OpnameItem = {
  id: string; opnameId: string; productId: string; productName: string;
  systemStock: number; physicalStock: number; difference: number; notes?: string | null;
};
type Valuation = { totalItems: number; totalCostValue: number; totalRetailValue: number };

const idr = (n: number) => Math.round(n).toLocaleString('id-ID');
const fmtDate = (s: string | number | Date) => new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

const StockOpname: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const canWrite = (user?.permissions ?? []).includes('inventory:opname');
  const canAlert = (user?.permissions ?? []).includes('inventory:write');

  const [tab, setTab] = useState<'opname' | 'setelan'>('opname');
  const [valuation, setValuation] = useState<Valuation>({ totalItems: 0, totalCostValue: 0, totalRetailValue: 0 });
  const [opnames, setOpnames] = useState<Opname[]>([]);
  const [active, setActive] = useState<Opname | null>(null);
  const [items, setItems] = useState<OpnameItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newLocation, setNewLocation] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [pickProduct, setPickProduct] = useState('');
  const [physicalStock, setPhysicalStock] = useState('');
  const [itemNotes, setItemNotes] = useState('');

  const [settingsProductId, setSettingsProductId] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [reorderPoint, setReorderPoint] = useState('');
  const [alertEnabled, setAlertEnabled] = useState(true);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [valRes, opRes, prodRes] = await Promise.all([
        vyapara.getInventoryValuation({ token: '' }),
        vyapara.getStockOpnames({ token: '', limit: 20 }),
        vyapara.getProducts({ token: '', includeInactive: false }),
      ]);
      if (valRes?.ok) setValuation(valRes.data);
      if (opRes?.ok) setOpnames(Array.isArray(opRes.data) ? opRes.data : []);
      if (prodRes?.ok) setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { void load(); }, [load]);

  const loadItems = useCallback(async (opnameId: string) => {
    try {
      const res = await vyapara.listOpnameItems({ token: '', opnameId });
      if (res?.ok) setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat item opname');
    }
  }, []);

  useEffect(() => {
    if (active?.id) void loadItems(active.id);
    else setItems([]);
  }, [active?.id, loadItems]);

  const createOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    setError(null);
    try {
      const res = await vyapara.createStockOpname({ token: '', location: newLocation.trim() || undefined, notes: newNotes.trim() || undefined });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal membuat opname');
      setNewLocation('');
      setNewNotes('');
      await load();
      setActive(res.data);
    } catch (err: any) {
      setError(err.message || 'Gagal membuat opname');
    } finally {
      setBusy(false);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !canWrite) return;
    const qty = Number(physicalStock);
    if (!pickProduct) { setError('Pilih produk'); return; }
    if (!Number.isFinite(qty) || qty < 0) { setError('Stok fisik tidak valid'); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await vyapara.addOpnameItem({ token: '', opnameId: active.id, productId: pickProduct, physicalStock: Math.round(qty), notes: itemNotes.trim() || undefined });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal menambah item');
      setPickProduct('');
      setPhysicalStock('');
      setItemNotes('');
      await loadItems(active.id);
    } catch (err: any) {
      setError(err.message || 'Gagal menambah item');
    } finally {
      setBusy(false);
    }
  };

  const completeOpname = async () => {
    if (!active || !canWrite) return;
    if (!window.confirm('Selesaikan opname? Selisih akan mengatur stok dan tidak dapat dibatalkan.')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await vyapara.completeStockOpname({ token: '', opnameId: active.id });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal menyelesaikan opname');
      setActive(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Gagal menyelesaikan opname');
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAlert) return;
    if (!settingsProductId) { setError('Pilih produk'); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await vyapara.upsertInventorySettings({
        token: '',
        productId: settingsProductId,
        minimumStock: minStock === '' ? undefined : Number(minStock),
        maximumStock: maxStock === '' ? undefined : Number(maxStock),
        reorderPoint: reorderPoint === '' ? undefined : Number(reorderPoint),
        isLowStockAlertEnabled: alertEnabled,
      });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal menyimpan setelan');
      setMinStock('');
      setMaxStock('');
      setReorderPoint('');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan setelan');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-vyapara-border rounded-lg outline-none focus:ring-2 focus:ring-vyapara-blue';
  const labelCls = 'block text-[11px] font-semibold text-vyapara-secondary mb-1 uppercase tracking-wide';
  const tabCls = (activeTab: boolean) => `px-5 py-2.5 text-sm font-semibold rounded-full transition-colors ${activeTab ? 'bg-vyapara-navy text-white' : 'bg-vyapara-surface text-vyapara-secondary hover:bg-vyapara-light-blue'}`;

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-vyapara-navy mb-1">Opname Stok &amp; Valuasi</h1>
        <p className="text-vyapara-secondary">Cocokkan stok fisik vs sistem, lalu tetapkan alarm stok menipis</p>
      </header>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-vyapara-border shadow-sm p-5">
          <p className="text-[11px] uppercase tracking-wider text-vyapara-secondary font-semibold">Produk Aktif</p>
          <p className="text-2xl font-extrabold text-vyapara-navy mt-1">{valuation.totalItems}</p>
        </div>
        <div className="bg-white rounded-xl border border-vyapara-border shadow-sm p-5">
          <p className="text-[11px] uppercase tracking-wider text-vyapara-secondary font-semibold">Valuasi (HPP)</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">Rp {idr(valuation.totalCostValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-vyapara-border shadow-sm p-5">
          <p className="text-[11px] uppercase tracking-wider text-vyapara-secondary font-semibold">Valuasi (Harga Jual)</p>
          <p className="text-2xl font-extrabold text-vyapara-blue mt-1">Rp {idr(valuation.totalRetailValue)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button className={tabCls(tab === 'opname')} onClick={() => setTab('opname')}>Opname Stok</button>
        <button className={tabCls(tab === 'setelan')} onClick={() => setTab('setelan')}>Setelan Alarm Stok</button>
      </div>

      {tab === 'opname' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="space-y-4">
            {!active && canWrite && (
              <form onSubmit={createOpname} className="bg-white rounded-xl border border-vyapara-border shadow-sm p-5 space-y-3">
                <h2 className="font-bold text-vyapara-navy">Opname Baru</h2>
                <div>
                  <label className={labelCls} htmlFor="opn-loc">Lokasi (opsional)</label>
                  <input id="opn-loc" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className={inputCls} placeholder="mis. Gudang utama / Area ATK" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="opn-notes">Catatan</label>
                  <input id="opn-notes" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className={inputCls} placeholder="mis. Opname mingguan" />
                </div>
                <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-vyapara-navy text-white font-semibold hover:bg-vyapara-blue disabled:opacity-60">{busy ? 'Membuat…' : 'Buat Sesi Opname'}</button>
              </form>
            )}

            <section className="bg-white rounded-xl border border-vyapara-border shadow-sm overflow-hidden">
              <div className="p-4 border-b border-vyapara-border flex items-center justify-between">
                <h2 className="font-bold text-vyapara-navy">Sesi Opname</h2>
                <span className="text-xs text-vyapara-secondary">{opnames.length} sesi</span>
              </div>
              {loading ? <div className="p-8 text-center text-sm text-vyapara-secondary">Memuat…</div> : opnames.length === 0 ? (
                <div className="p-8 text-center text-sm text-vyapara-secondary">Belum ada sesi opname.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-vyapara-surface border-b border-vyapara-border text-[10px] uppercase tracking-wider text-vyapara-secondary">
                    <tr><th className="px-4 py-3">No.</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Selisih</th><th className="px-4 py-3 text-right">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-vyapara-border">
                    {opnames.map((o) => (
                      <tr key={o.id} className={active?.id === o.id ? 'bg-vyapara-light-blue/40' : 'hover:bg-vyapara-surface/60'}>
                        <td className="px-4 py-3 font-mono font-semibold text-vyapara-navy">{o.opnameNumber}</td>
                        <td className="px-4 py-3 text-vyapara-secondary">{fmtDate(o.opnameDate)}{o.location ? ` • ${o.location}` : ''}</td>
                        <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : o.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{o.status}</span></td>
                        <td className="px-4 py-3 text-right">{o.totalItemsDifference > 0 ? <span className="text-emerald-600">+{o.totalItemsDifference}</span> : o.totalItemsDifference}</td>
                        <td className="px-4 py-3 text-right">
                          {o.status !== 'completed' && canWrite && (
                            <button onClick={() => setActive(o)} className="text-xs font-semibold bg-vyapara-navy hover:bg-vyapara-blue text-white px-3 py-1.5 rounded-md">Buka</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </section>

          {/* Active session */}
          <section className="bg-white rounded-xl border border-vyapara-border shadow-sm overflow-hidden h-fit">
            <div className="p-4 border-b border-vyapara-border">
              <h2 className="font-bold text-vyapara-navy">Sesi Aktif{active ? ` — ${active.opnameNumber}` : ''}</h2>
            </div>
            {active ? (
              <div className="p-4 space-y-4">
                <p className="text-xs text-vyapara-secondary">{active.location ? `Lokasi: ${active.location} • ` : ''}{active.notes ?? ''}</p>
                {canWrite && (
                  <form onSubmit={addItem} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <label className={labelCls} htmlFor="opn-item-prod">Produk</label>
                      <select id="opn-item-prod" value={pickProduct} onChange={(e) => setPickProduct(e.target.value)} className={inputCls} required>
                        <option value="">Pilih produk…</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} (sistem: {p.stock} {p.unitName ?? 'pcs'})</option>)}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className={labelCls} htmlFor="opn-item-qty">Fisik</label>
                      <input id="opn-item-qty" type="number" min={0} value={physicalStock} onChange={(e) => setPhysicalStock(e.target.value)} className={inputCls} required />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls} htmlFor="opn-item-notes">Ket.</label>
                      <input id="opn-item-notes" value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} className={inputCls} placeholder="opsional" />
                    </div>
                    <button type="submit" disabled={busy} className="col-span-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60">Tambah</button>
                  </form>
                )}
                <table className="w-full text-sm">
                  <thead className="bg-vyapara-surface text-[10px] uppercase tracking-wider text-vyapara-secondary">
                    <tr><th className="px-3 py-2 text-left">Produk</th><th className="px-3 py-2 text-right">Sistem</th><th className="px-3 py-2 text-right">Fisik</th><th className="px-3 py-2 text-right">Selisih</th></tr>
                  </thead>
                  <tbody className="divide-y divide-vyapara-border">
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-3 py-2 text-xs">{it.productName}</td>
                        <td className="px-3 py-2 text-right">{it.systemStock}</td>
                        <td className="px-3 py-2 text-right">{it.physicalStock}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${it.difference < 0 ? 'text-red-600' : it.difference > 0 ? 'text-emerald-600' : ''}`}>{it.difference > 0 ? `+${it.difference}` : it.difference}</td>
                      </tr>
                    ))}
                    {items.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-vyapara-secondary text-xs">Belum ada item. Tambah minimal satu di atas.</td></tr>}
                  </tbody>
                </table>
                {canWrite && items.length > 0 && (
                  <button onClick={completeOpname} disabled={busy} className="w-full py-3 rounded-xl bg-vyapara-red text-white font-semibold hover:brightness-110 disabled:opacity-60">{busy ? 'Menyelesaikan…' : 'Selesaikan Opname & Terapkan Selisih'}</button>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-vyapara-secondary">Pilih sesi opname di sebelah kiri atau buat baru.</div>
            )}
          </section>
        </div>
      )}

      {tab === 'setelan' && (
        <form onSubmit={saveSettings} className="bg-white rounded-xl border border-vyapara-border shadow-sm p-5 max-w-2xl space-y-4">
          <h2 className="font-bold text-vyapara-navy">Alarm Stok Menipis</h2>
          <p className="text-sm text-vyapara-secondary">Ketika stok terjual mencapai titik ini, produk akan ditandai pada daftar stok rendah di Dashboard.</p>
          <div>
            <label className={labelCls} htmlFor="set-prod">Produk *</label>
            <select id="set-prod" value={settingsProductId} onChange={(e) => setSettingsProductId(e.target.value)} className={inputCls} required>
              <option value="">Pilih produk…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} (stok {p.stock})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls} htmlFor="set-min">Stok Minimum</label>
              <input id="set-min" type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} className={inputCls} placeholder="10" />
            </div>
            <div>
              <label className={labelCls} htmlFor="set-max">Stok Maksimum</label>
              <input id="set-max" type="number" min={0} value={maxStock} onChange={(e) => setMaxStock(e.target.value)} className={inputCls} placeholder="100" />
            </div>
            <div>
              <label className={labelCls} htmlFor="set-rop">Titik Reorder</label>
              <input id="set-rop" type="number" min={0} value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} className={inputCls} placeholder="5" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={alertEnabled} onChange={(e) => setAlertEnabled(e.target.checked)} className="w-4 h-4 accent-vyapara-blue" />
            Aktifkan alarm stok menipis untuk produk ini
          </label>
          <button type="submit" disabled={busy} className="px-6 py-2.5 rounded-lg bg-vyapara-navy text-white text-sm font-semibold hover:bg-vyapara-blue disabled:opacity-60">{busy ? 'Menyimpan…' : 'Simpan Setelan'}</button>
        </form>
      )}
    </div>
  );
};

export default StockOpname;
