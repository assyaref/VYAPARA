/* src/PurchaseReturns.tsx */
import React, { useEffect, useState, useCallback } from 'react';
import useAuth from './authStore';

const vyapara = (window as any).vyapara;

type PurchaseOrder = {
  id: string; poNumber: string; supplierId: string; supplierName: string; status: string;
  subtotal: number; totalAmount: number; createdAt: number;
};
type PoDetail = PurchaseOrder & {
  items: { productId: string; productName: string; quantityOrdered: number; quantityReceived: number; unitPrice: number; subtotal: number }[];
};
type PurchaseReturn = {
  id: string; returnNumber: string; purchaseOrderId?: string | null; userName?: string | null;
  returnDate: number; notes?: string | null;
  items: { productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number }[];
};

const idr = (n: number) => Math.round(n).toLocaleString('id-ID');
const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

const PurchaseReturns: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const canRead = (user?.permissions ?? []).includes('procurement:read');
  const canWrite = (user?.permissions ?? []).includes('procurement:write');

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [selected, setSelected] = useState<PoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returnQty, setReturnQty] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [poRes, retRes] = await Promise.all([
        vyapara.getPurchaseOrders({ token: '', limit: 50 }),
        vyapara.getPurchaseReturns({ token: '', limit: 50 }),
      ]);
      if (poRes?.ok) setOrders(Array.isArray(poRes.data) ? poRes.data : []);
      if (retRes?.ok) setReturns(Array.isArray(retRes.data) ? retRes.data : []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (po: PurchaseOrder) => {
    setDetailLoading(true);
    setError(null);
    setReturnQty({});
    setNotes('');
    try {
      const res = await vyapara.getPurchaseOrder({ token: '', id: po.id });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal memuat detail PO');
      setSelected(res.data as PoDetail);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat detail PO');
    } finally {
      setDetailLoading(false);
    }
  };

  const submitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const items = selected.items
      .map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: Number(returnQty[it.productId]) || 0,
        unitPrice: it.unitPrice,
        max: it.quantityReceived,
      }))
      .filter((it) => it.quantity > 0);
    if (items.length === 0) { setError('Isi minimal satu baris retur dengan kuantitas > 0'); return; }
    for (const it of items) {
      if (it.quantity > it.max) { setError(`Kuantitas retur untuk ${it.productName} melebihi jumlah diterima (${it.max})`); return; }
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await vyapara.createPurchaseReturn({
        token: '',
        purchaseOrderId: selected.id,
        items: items.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
        notes: notes.trim() || undefined,
      });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal membuat retur');
      setSelected(null);
      setReturnQty({});
      setNotes('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat retur');
    } finally {
      setSubmitting(false);
    }
  };

  const receivedOrders = orders.filter((o) => ['received', 'partial', 'completed'].includes(o.status));
  const inputCls = 'w-20 px-2 py-1.5 text-sm border border-vyapara-border rounded text-right outline-none focus:ring-2 focus:ring-vyapara-blue';

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-vyapara-navy mb-1">Retur Pembelian</h1>
        <p className="text-vyapara-secondary">Kembalikan barang yang diterima ke pemasok; stok dan hutang otomatis disesuaikan</p>
      </header>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Eligible POs */}
        <section className="bg-white rounded-xl border border-vyapara-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-vyapara-border flex items-center justify-between">
            <h2 className="font-bold text-vyapara-navy">PO yang Sudah Diterima</h2>
            <span className="text-xs text-vyapara-secondary">{receivedOrders.length} PO</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-vyapara-secondary">Memuat…</div>
          ) : receivedOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-vyapara-secondary">Belum ada PO yang bisa diretur (terapkan barang lebih dulu di menu Pembelian).</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-vyapara-surface border-b border-vyapara-border text-[10px] uppercase tracking-wider text-vyapara-secondary">
                <tr><th className="px-4 py-3">No. PO</th><th className="px-4 py-3">Pemasok</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-vyapara-border">
                {receivedOrders.map((po) => (
                  <tr key={po.id} className={selected?.id === po.id ? 'bg-vyapara-light-blue/40' : 'hover:bg-vyapara-surface/60'}>
                    <td className="px-4 py-3 font-mono font-semibold text-vyapara-navy">{po.poNumber}</td>
                    <td className="px-4 py-3">{po.supplierName}</td>
                    <td className="px-4 py-3 text-vyapara-secondary">{fmtDate(po.createdAt)}</td>
                    <td className="px-4 py-3 text-right">Rp {idr(po.totalAmount)}</td>
                    <td className="px-4 py-3 text-right">
                      {canWrite && (
                        <button onClick={() => openDetail(po)} className="text-xs font-semibold bg-vyapara-navy hover:bg-vyapara-blue text-white px-3 py-1.5 rounded-md">Retur</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Selected PO — return form */}
        <section className="bg-white rounded-xl border border-vyapara-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-vyapara-border">
            <h2 className="font-bold text-vyapara-navy">Form Retur{selected ? ` — ${selected.poNumber}` : ''}</h2>
          </div>
          {detailLoading ? (
            <div className="p-8 text-center text-sm text-vyapara-secondary">Memuat detail PO…</div>
          ) : selected ? (
            <form onSubmit={submitReturn} className="p-4 space-y-3">
              <p className="text-xs text-vyapara-secondary">Pemasok: <strong>{selected.supplierName}</strong> • Isi kuantitas retur pada baris yang ingin dikembalikan.</p>
              <table className="w-full text-sm">
                <thead className="bg-vyapara-surface text-[10px] uppercase tracking-wider text-vyapara-secondary">
                  <tr><th className="px-3 py-2 text-left">Produk</th><th className="px-3 py-2 text-right">Diterima</th><th className="px-3 py-2 text-right">Retur</th><th className="px-3 py-2 text-right">Harga</th></tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {selected.items.map((it) => (
                    <tr key={it.productId}>
                      <td className="px-3 py-2 text-xs">{it.productName}</td>
                      <td className="px-3 py-2 text-right text-xs text-vyapara-secondary">{it.quantityReceived}</td>
                      <td className="px-3 py-2 text-right"><input type="number" min={0} max={it.quantityReceived} value={returnQty[it.productId] ?? ''} onChange={(e) => setReturnQty({ ...returnQty, [it.productId]: e.target.value })} placeholder="0" className={inputCls} /></td>
                      <td className="px-3 py-2 text-right text-xs">Rp {idr(it.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div>
                <label className="block text-[11px] font-semibold text-vyapara-secondary mb-1 uppercase tracking-wide" htmlFor="ret-notes">Catatan</label>
                <input id="ret-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 text-sm border border-vyapara-border rounded-lg outline-none focus:ring-2 focus:ring-vyapara-blue" placeholder="mis. 2 pcs rusak saat bongkar" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-vyapara-navy text-white font-semibold hover:bg-vyapara-blue disabled:opacity-60">{submitting ? 'Memproses…' : 'Ajukan Retur'}</button>
                <button type="button" onClick={() => setSelected(null)} className="px-4 py-3 rounded-xl border border-vyapara-border text-vyapara-secondary hover:bg-vyapara-surface">Batal</button>
              </div>
            </form>
          ) : (
            <div className="p-8 text-center text-sm text-vyapara-secondary">Pilih PO di sebelah kiri untuk mulai retur.</div>
          )}
        </section>
      </div>

      {/* History */}
      <section className="mt-6 bg-white rounded-xl border border-vyapara-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-vyapara-border flex items-center justify-between">
          <h2 className="font-bold text-vyapara-navy">Riwayat Retur Pembelian</h2>
          <span className="text-xs text-vyapara-secondary">{returns.length} retur</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-vyapara-secondary">Memuat…</div>
        ) : returns.length === 0 ? (
          <div className="p-8 text-center text-sm text-vyapara-secondary">Belum ada retur pembelian.</div>
        ) : (
          <div className="divide-y divide-vyapara-border">
            {returns.map((r) => (
              <div key={r.id} className="p-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
                <span className="font-mono font-bold text-vyapara-navy">{r.returnNumber}</span>
                <span className="text-xs text-vyapara-secondary">{fmtDate(r.returnDate)}</span>
                <span className="text-xs">{r.items.length} item • Rp {idr(r.items.reduce((s, i) => s + i.subtotal, 0))}</span>
                {r.userName && <span className="text-xs text-vyapara-secondary">oleh {r.userName}</span>}
                {r.notes && <span className="text-xs text-vyapara-secondary italic">{r.notes}</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PurchaseReturns;
