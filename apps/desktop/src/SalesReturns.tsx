/* src/SalesReturns.tsx */
import React, { useEffect, useState, useCallback } from 'react';
import useAuth from './authStore';

const vyapara = (window as any).vyapara;
const idr = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

type ReturnRow = {
  id: string;
  returnNumber: string;
  transactionId: string;
  returnDate: number;
  notes: string | null;
  status: string;
  createdAt: number;
  itemCount: number;
  totalCost: number;
};

type TxnRow = {
  id: string;
  transactionNumber?: string;
  totalAmount?: number;
  createdAt?: string;
  status?: string;
};

const SalesReturnsPage: React.FC = () => {
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, t] = await Promise.all([
        vyapara?.listSalesReturns?.({ token: '', limit: 100 }),
        vyapara?.getTransactions?.({ token: '', limit: 30 }),
      ]);
      if (r?.ok) setReturns(Array.isArray(r.data) ? r.data : []);
      else if (r?.error) setError(r.error.message);
      if (t?.ok) setTxns(Array.isArray(t.data) ? t.data : []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createReturn = async (txn: TxnRow) => {
    if (!window.confirm(`Retur untuk transaksi ${txn.transactionNumber ?? txn.id}? Stok akan dikembalikan ke gudang.`)) return;
    // note: createSalesReturn requires a real transactionId from the txn record
    setBusyId(txn.id);
    setError(null);
    try {
      // Fetch all transactions to find the one matching (id from txn)
      const res = await vyapara?.createSalesReturn?.({ token: '', transactionId: txn.id, notes: 'Retur dari POS' });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal membuat retur');
      await load();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat retur');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-vyapara-navy">Retur Penjualan</h1>
        <p className="text-xs text-vyapara-secondary">Catat pengembalian barang dari pelanggan; stok dikembalikan otomatis</p>
      </div>

      {error && <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-vyapara-border shadow-sm">
          <div className="p-4 border-b border-vyapara-border flex items-center justify-between">
            <h2 className="font-bold text-vyapara-navy">Transaksi Siap Retur</h2>
            <span className="text-[10px] uppercase tracking-wider text-vyapara-secondary">{txns.length} terbaru</span>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-vyapara-secondary bg-vyapara-surface">
                  <th className="px-4 py-2">No. Transaksi</th>
                  <th className="px-4 py-2">Waktu</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vyapara-border">
                {txns.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-vyapara-secondary">Belum ada transaksi.</td></tr>
                ) : txns.map((t) => (
                  <tr key={t.id} className="hover:bg-vyapara-surface/60">
                    <td className="px-4 py-2 font-semibold text-vyapara-navy">{t.transactionNumber ?? '-'}</td>
                    <td className="px-4 py-2 text-vyapara-secondary">{t.createdAt ? new Date(t.createdAt).toLocaleString('id-ID') : '-'}</td>
                    <td className="px-4 py-2 text-right font-semibold">{idr(Number(t.totalAmount) || 0)}</td>
                    <td className="px-4 py-2 text-right">
                      <button disabled={busyId === t.id} onClick={() => createReturn(t)} className="text-xs font-semibold bg-vyapara-navy text-white rounded-full px-3 py-1 hover:bg-vyapara-blue disabled:opacity-60">
                        {busyId === t.id ? 'Memproses…' : 'Retur'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-vyapara-border shadow-sm">
          <div className="p-4 border-b border-vyapara-border flex items-center justify-between">
            <h2 className="font-bold text-vyapara-navy">Riwayat Retur</h2>
            <span className="text-[10px] uppercase tracking-wider text-vyapara-secondary">{returns.length} retur</span>
          </div>
          {loading ? (
            <div className="p-10 text-center text-vyapara-secondary text-sm">Memuat…</div>
          ) : returns.length === 0 ? (
            <div className="p-10 text-center text-vyapara-secondary text-sm">Belum ada retur tercatat.</div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-vyapara-secondary bg-vyapara-surface">
                    <th className="px-4 py-2">No. Retur</th>
                    <th className="px-4 py-2">Waktu</th>
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2 text-right">HPP</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {returns.map((r) => (
                    <tr key={r.id} className="hover:bg-vyapara-surface/60">
                      <td className="px-4 py-2 font-semibold text-vyapara-navy">{r.returnNumber}</td>
                      <td className="px-4 py-2 text-vyapara-secondary">{new Date(r.returnDate).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2">{r.itemCount} item</td>
                      <td className="px-4 py-2 text-right">{idr(r.totalCost)}</td>
                      <td className="px-4 py-2"><span className="text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesReturnsPage;
