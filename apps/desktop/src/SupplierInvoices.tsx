/* src/SupplierInvoices.tsx */
import React, { useEffect, useState, useCallback } from 'react';
import useAuth from './authStore';

const vyapara = (window as any).vyapara;

type Supplier = { id: string; name: string };
type Invoice = {
  id: string; invoiceNumber: string; supplierId: string; supplierName?: string;
  invoiceDate: number; dueDate?: number | null; taxAmount?: number;
  subtotal: number; totalAmount: number; paidAmount: number; status: 'unpaid' | 'partial' | 'paid';
  notes?: string | null;
};
type Payables = { total: number; unpaid: number; overdue: number };

const idr = (n: number) => Math.round(n).toLocaleString('id-ID');
const statusCls = (s: string) =>
  s === 'paid' ? 'bg-emerald-100 text-emerald-700' : s === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700';
const statusLabel = (s: string) => (s === 'paid' ? 'Lunas' : s === 'partial' ? 'Sebagian' : 'Belum Lunas');

const SupplierInvoices: React.FC = () => {
  const { user } = useAuth();
  const canWrite = (user?.permissions ?? []).includes('supplier:transactions');
  const canRead = (user?.permissions ?? []).includes('supplier:read');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payables, setPayables] = useState<Payables>({ total: 0, unpaid: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formInvoiceDate, setFormInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formDueDate, setFormDueDate] = useState('');
  const [formTax, setFormTax] = useState('0');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState([{ productId: '', description: '', quantity: '1', unitPrice: '0' }]);
  const [saving, setSaving] = useState(false);

  const [payOpen, setPayOpen] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('0');
  const [payDescription, setPayDescription] = useState('');
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, supRes, payRes] = await Promise.all([
        vyapara.getSupplierInvoices({ token: '', limit: 100 }),
        vyapara.getSuppliers({ token: '', includeInactive: false }),
        vyapara.getPayablesSummary(),
      ]);
      if (invRes?.ok) setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
      else setError(invRes?.error?.message ?? 'Gagal memuat faktur');
      if (supRes?.ok) setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
      if (payRes?.ok) setPayables(payRes.data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const addItemRow = () => setFormItems((rows) => [...rows, { productId: '', description: '', quantity: '1', unitPrice: '0' }]);
  const removeItemRow = (idx: number) => setFormItems((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows));
  const updateItem = (idx: number, key: 'productId' | 'description' | 'quantity' | 'unitPrice', value: string) =>
    setFormItems((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));

  const submitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplierId) { setError('Pilih pemasok terlebih dahulu'); return; }
    const items = formItems
      .map((r) => ({
        productId: r.productId || undefined,
        description: r.description.trim() || 'Item pembelian',
        quantity: Number(r.quantity),
        unitPrice: Math.round(Number(r.unitPrice)),
      }))
      .filter((r) => Number.isFinite(r.quantity) && r.quantity > 0);
    if (items.length === 0) { setError('Minimal satu item wajib diisi dengan benar'); return; }
    setSaving(true);
    setError(null);
    try {
      const invoiceDate = formInvoiceDate ? new Date(formInvoiceDate + 'T00:00:00').getTime() : Date.now();
      const dueDate = formDueDate ? new Date(formDueDate + 'T00:00:00').getTime() : undefined;
      const res = await vyapara.createSupplierInvoice({
        token: '',
        supplierId: formSupplierId,
        invoiceDate,
        dueDate,
        taxAmount: Math.round(Number(formTax) || 0),
        notes: formNotes.trim() || undefined,
        items,
      });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal membuat faktur');
      setCreateOpen(false);
      setFormNotes('');
      setFormDueDate('');
      setFormTax('0');
      setFormItems([{ productId: '', description: '', quantity: '1', unitPrice: '0' }]);
      await load();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat faktur');
    } finally {
      setSaving(false);
    }
  };

  const openPay = (inv: Invoice) => {
    const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);
    setPayOpen(inv);
    setPayAmount(String(remaining));
    setPayDescription('');
  };

  const submitPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payOpen) return;
    const amount = Math.round(Number(payAmount));
    if (!Number.isFinite(amount) || amount <= 0) { setError('Nominal pembayaran tidak valid'); return; }
    setPaying(true);
    setError(null);
    try {
      const res = await vyapara.paySupplierInvoice({ token: '', invoiceId: payOpen.id, amount, description: payDescription.trim() || undefined });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal membayar faktur');
      setPayOpen(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Gagal membayar faktur');
    } finally {
      setPaying(false);
    }
  };

  const filtered = statusFilter === 'all' ? invoices : invoices.filter((i) => i.status === statusFilter);
  const inputCls = 'w-full px-3 py-2 text-sm border border-vyapara-border rounded-lg outline-none focus:ring-2 focus:ring-vyapara-blue';
  const labelCls = 'block text-[11px] font-semibold text-vyapara-secondary mb-1 uppercase tracking-wide';

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-vyapara-navy mb-1">Faktur Pemasok</h1>
          <p className="text-vyapara-secondary">Catat tagihan pembelian, bayar, dan pantau hutang jatuh tempo</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-vyapara-navy hover:bg-vyapara-blue text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 8v8M8 12h8M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3l-2-3H10L8 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
            </svg>
            Faktur Baru
          </button>
        )}
      </header>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-vyapara-border shadow-sm p-5">
          <p className="text-[11px] uppercase tracking-wider text-vyapara-secondary font-semibold">Total Hutang Pemasok</p>
          <p className="text-2xl font-extrabold text-vyapara-navy mt-1">Rp {idr(payables.total)}</p>
          <p className="text-xs text-vyapara-secondary mt-1">Seluruh tagihan belum lunas/sebagian</p>
        </div>
        <div className="bg-white rounded-xl border border-vyapara-border shadow-sm p-5">
          <p className="text-[11px] uppercase tracking-wider text-vyapara-secondary font-semibold">Belum Lunas</p>
          <p className="text-2xl font-extrabold text-red-600 mt-1">Rp {idr(payables.unpaid)}</p>
          <p className="text-xs text-vyapara-secondary mt-1">Tertanggung belum dibayar</p>
        </div>
        <div className="bg-white rounded-xl border border-vyapara-border shadow-sm p-5">
          <p className="text-[11px] uppercase tracking-wider text-vyapara-secondary font-semibold">Jatuh Tempo Lewat</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">Rp {idr(payables.overdue)}</p>
          <p className="text-xs text-vyapara-secondary mt-1">Faktur melewati tanggal jatuh tempo</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-vyapara-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-vyapara-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-vyapara-navy">Daftar Faktur</h2>
          <div className="flex items-center gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-vyapara-border rounded-lg bg-vyapara-surface">
              <option value="all">Semua Status</option>
              <option value="unpaid">Belum Lunas</option>
              <option value="partial">Sebagian</option>
              <option value="paid">Lunas</option>
            </select>
            <span className="text-xs text-vyapara-secondary">{filtered.length} faktur</span>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-vyapara-secondary text-sm">Memuat faktur…</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-vyapara-surface border-b border-vyapara-border text-[10px] uppercase tracking-wider text-vyapara-secondary">
              <tr>
                <th className="px-5 py-3">No. Faktur</th>
                <th className="px-5 py-3">Pemasok</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Jatuh Tempo</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Sisa</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vyapara-border">
              {filtered.map((inv) => {
                const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);
                return (
                  <tr key={inv.id} className="hover:bg-vyapara-surface/50">
                    <td className="px-5 py-3 font-mono font-semibold text-vyapara-navy">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3">{inv.supplierName ?? suppliers.find((s) => s.id === inv.supplierId)?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-vyapara-secondary">{new Date(inv.invoiceDate).toLocaleDateString('id-ID')}</td>
                    <td className="px-5 py-3 text-vyapara-secondary">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('id-ID') : '—'}</td>
                    <td className="px-5 py-3 text-right font-semibold">Rp {idr(inv.totalAmount)}</td>
                    <td className="px-5 py-3 text-right text-red-600 font-semibold">Rp {idr(remaining)}</td>
                    <td className="px-5 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${statusCls(inv.status)}`}>{statusLabel(inv.status)}</span></td>
                    <td className="px-5 py-3 text-right">
                      {remaining > 0 && canWrite ? (
                        <button onClick={() => openPay(inv)} className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md">
                          Bayar
                        </button>
                      ) : (
                        <span className="text-xs text-vyapara-secondary">✓</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-vyapara-secondary">Belum ada faktur</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setCreateOpen(false)} />
          <form onSubmit={submitInvoice} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-vyapara-navy">Faktur Pemasok Baru</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="p-2 text-vyapara-secondary hover:text-vyapara-navy">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls} htmlFor="f-supplier">Pemasok *</label>
                <select id="f-supplier" required value={formSupplierId} onChange={(e) => setFormSupplierId(e.target.value)} className={inputCls}>
                  <option value="">Pilih pemasok…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="f-date">Tgl. Faktur</label>
                <input id="f-date" type="date" value={formInvoiceDate} onChange={(e) => setFormInvoiceDate(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="f-due">Jatuh Tempo</label>
                <input id="f-due" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="f-tax">Pajak (Rp)</label>
                <input id="f-tax" type="number" min={0} value={formTax} onChange={(e) => setFormTax(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="f-notes">Catatan</label>
                <input id="f-notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className={inputCls} placeholder="opsional" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}>Item Faktur *</label>
                <button type="button" onClick={addItemRow} className="text-xs font-semibold text-vyapara-blue hover:underline">+ Tambah baris</button>
              </div>
              <div className="border border-vyapara-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-vyapara-surface text-[10px] uppercase text-vyapara-secondary">
                    <tr><th className="px-3 py-2 text-left">Deskripsi</th><th className="px-3 py-2 w-20 text-right">Qty</th><th className="px-3 py-2 text-right">Harga</th><th className="px-3 py-2 w-10"></th></tr>
                  </thead>
                  <tbody>
                    {formItems.map((row, idx) => (
                      <tr key={idx} className="border-t border-vyapara-border">
                        <td className="px-2 py-1.5"><input value={row.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className="w-full px-2 py-1.5 border border-vyapara-border rounded outline-none focus:ring-2 focus:ring-vyapara-blue" placeholder="Kertas HVS A4 / sewa printer…" /></td>
                        <td className="px-2 py-1.5"><input type="number" min={1} value={row.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="w-full px-2 py-1.5 text-right border border-vyapara-border rounded outline-none" /></td>
                        <td className="px-2 py-1.5"><input type="number" min={0} value={row.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} className="w-full px-2 py-1.5 text-right border border-vyapara-border rounded outline-none" placeholder="0" /></td>
                        <td className="px-1 py-1.5 text-center"><button type="button" onClick={() => removeItemRow(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Hapus baris"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 6l12 12" /></svg></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-vyapara-navy text-white font-semibold hover:bg-vyapara-blue disabled:opacity-60">{saving ? 'Menyimpan…' : 'Simpan Faktur'}</button>
          </form>
        </div>
      )}

      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPayOpen(null)} />
          <form onSubmit={submitPay} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-vyapara-navy">Pembayaran Faktur</h3>
              <button type="button" onClick={() => setPayOpen(null)} className="p-2 text-vyapara-secondary"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
            </div>
            <div className="text-sm">
              <p className="font-mono font-bold text-vyapara-navy">{payOpen.invoiceNumber}</p>
              <p className="text-vyapara-secondary">{suppliers.find((s) => s.id === payOpen.supplierId)?.name}</p>
              <p className="mt-1">Total: <strong>Rp {idr(payOpen.totalAmount)}</strong> • Sisa: <strong className="text-red-600">Rp {idr(Math.max(0, payOpen.totalAmount - payOpen.paidAmount))}</strong></p>
            </div>
            <div>
              <label className={labelCls} htmlFor="pay-amount">Nominal Bayar *</label>
              <input id="pay-amount" type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required className={inputCls} autoFocus />
            </div>
            <div>
              <label className={labelCls} htmlFor="pay-desc">Deskripsi</label>
              <input id="pay-desc" value={payDescription} onChange={(e) => setPayDescription(e.target.value)} className={inputCls} placeholder="mis. Transfer BCA 1234…" />
            </div>
            <button type="submit" disabled={paying} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60">{paying ? 'Memproses…' : 'Bayar Sekarang'}</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SupplierInvoices;
