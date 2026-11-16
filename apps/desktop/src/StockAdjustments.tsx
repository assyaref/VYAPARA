/* src/StockAdjustments.tsx */
import React, { useEffect, useState, useCallback } from 'react';
import useAuth from './authStore';

const vyapara = (window as any).vyapara;

type Product = { id: string; name: string; stock: number; unitName: string | null };
type Adjustment = {
  id: string;
  productId: string;
  productName: string;
  adjustmentType: string;
  quantity: number;
  reason: string | null;
  referenceNumber: string | null;
  status: string;
  notes: string | null;
  createdAt: string | number;
};

const StockAdjustmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [pending, setPending] = useState<Adjustment[]>([]);
  const [history, setHistory] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ productId: '', adjustmentType: 'increase' as 'increase' | 'decrease', quantity: '', reason: '', referenceNumber: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, pd, hist] = await Promise.all([
        vyapara?.getProducts?.({ token: '', includeInactive: false }),
        vyapara?.getStockAdjustments?.({ token: '', status: 'pending', limit: 100 }),
        vyapara?.getStockAdjustments?.({ token: '', limit: 50 }),
      ]);
      if (p?.ok) setProducts(Array.isArray(p.data) ? p.data : []);
      if (pd?.ok) setPending(Array.isArray(pd.data) ? pd.data : []);
      if (hist?.ok) setHistory(Array.isArray(hist.data) ? hist.data : []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId) { setError('Pilih produk'); return; }
    const qty = Math.max(1, Math.round(Number(form.quantity) || 0));
    if (qty <= 0) { setError('Jumlah harus > 0'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await vyapara?.createStockAdjustment?.({
        token: '',
        productId: form.productId,
        adjustmentType: form.adjustmentType,
        quantity: qty,
        reason: form.reason || undefined,
        referenceNumber: form.referenceNumber || undefined,
        notes: form.notes || undefined,
      });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal membuat penyesuaian');
      setForm({ productId: '', adjustmentType: 'increase', quantity: '', reason: '', referenceNumber: '', notes: '' });
      await load();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat penyesuaian');
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id: string, ok: boolean) => {
    try {
      const res = await vyapara?.approveStockAdjustment?.({ token: '', adjustmentId: id, approved: ok, notes: undefined });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal');
      await load();
    } catch (err: any) {
      setError(err.message || 'Gagal memproses persetujuan');
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-vyapara-border rounded-lg outline-none focus:ring-2 focus:ring-vyapara-blue';
  const labelCls = 'block text-xs font-semibold text-vyapara-secondary mb-1';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-vyapara-navy">Penyesuaian Stok</h1>
        <p className="text-xs text-vyapara-secondary">Ubah stok di luar penjualan/penerimaan; butuh persetujuan admin</p>
      </div>

      {error && <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <form onSubmit={submit} className="bg-white rounded-2xl border border-vyapara-border shadow-sm p-5 space-y-3 h-fit">
          <h2 className="font-bold text-vyapara-navy">Buat Penyesuaian</h2>
          <div>
            <label className={labelCls} htmlFor="sa-product">Produk *</label>
            <select id="sa-product" required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className={inputCls}>
              <option value="">— Pilih produk —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (stok: {p.stock} {p.unitName ?? 'pcs'})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="sa-type">Arah</label>
              <select id="sa-type" value={form.adjustmentType} onChange={(e) => setForm({ ...form, adjustmentType: e.target.value as any })} className={inputCls}>
                <option value="increase">Tambah</option>
                <option value="decrease">Kurang</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="sa-qty">Jumlah *</label>
              <input id="sa-qty" required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="sa-reason">Alasan *</label>
            <input id="sa-reason" required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="mis. rusak / kadaluarsa / selisih opname" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="sa-ref">No. Referensi</label>
              <input id="sa-ref" value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} placeholder="opsional" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="sa-notes">Catatan</label>
              <input id="sa-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="opsional" className={inputCls} />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg bg-vyapara-navy text-white text-sm font-semibold hover:bg-vyapara-blue disabled:opacity-60">
            {saving ? 'Menyimpan…' : 'Ajukan Penyesuaian'}
          </button>
        </form>

        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-vyapara-border shadow-sm">
            <div className="p-4 border-b border-vyapara-border flex items-center justify-between">
              <h2 className="font-bold text-vyapara-navy">Menunggu Persetujuan</h2>
              <span className="text-[10px] uppercase tracking-wider text-vyapara-secondary">{pending.length} pending</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {pending.length === 0 ? (
                <div className="p-6 text-center text-vyapara-secondary text-sm">Tidak ada penyesuaian menunggu.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-vyapara-secondary bg-vyapara-surface"><th className="px-4 py-2">Produk</th><th className="px-4 py-2">Arah</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2">Alasan</th><th className="px-4 py-2 text-right">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-vyapara-border">
                    {pending.map((a) => (
                      <tr key={a.id}>
                        <td className="px-4 py-2 font-medium text-vyapara-navy">{a.productName}</td>
                        <td className="px-4 py-2 capitalize">{a.adjustmentType === 'increase' ? 'Tambah' : 'Kurang'}</td>
                        <td className="px-4 py-2 text-right font-semibold">{a.quantity}</td>
                        <td className="px-4 py-2 text-vyapara-secondary">{a.reason ?? '-'}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => approve(a.id, true)} className="text-xs font-semibold text-emerald-700 mr-2">Setuju</button>
                          <button onClick={() => approve(a.id, false)} className="text-xs font-semibold text-red-600">Tolak</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-vyapara-border shadow-sm">
            <div className="p-4 border-b border-vyapara-border flex items-center justify-between">
              <h2 className="font-bold text-vyapara-navy">Riwayat</h2>
              <span className="text-[10px] uppercase tracking-wider text-vyapara-secondary">{history.length} terakhir</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-6 text-center text-vyapara-secondary text-sm">Belum ada riwayat.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[10px] uppercase tracking-wider text-vyapara-secondary bg-vyapara-surface"><th className="px-4 py-2">Waktu</th><th className="px-4 py-2">Produk</th><th className="px-4 py-2">Arah</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2">Status</th></tr></thead>
                  <tbody className="divide-y divide-vyapara-border">
                    {history.map((a) => (
                      <tr key={a.id}>
                        <td className="px-4 py-2 text-vyapara-secondary">{new Date(a.createdAt).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-2 font-medium text-vyapara-navy">{a.productName}</td>
                        <td className="px-4 py-2 capitalize">{a.adjustmentType === 'increase' ? 'Tambah' : 'Kurang'}</td>
                        <td className="px-4 py-2 text-right">{a.quantity}</td>
                        <td className="px-4 py-2"><span className={`text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 ${a.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : a.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAdjustmentsPage;
