import React, { useState, useEffect, useCallback } from 'react';
import useAuth from './authStore';

const vyapara = (window as any).vyapara;

type SalesRow = { date: string; count: number; total: number };
type BestSellingRow = { productId: string; productName: string; quantity: number; revenue: number };
type SlowMovingRow = { productId: string; productName: string; stock: number; lastSold: string | null };
type GrossProfitRow = { period: string; revenue: number; cogs: number; grossProfit: number };
type ValuationRow = { productId: string; productName: string; quantity: number; unitCost: number; costValue: number; unitRetail: number; retailValue: number };
type PurchaseRow = { date: string; poNumber: string; supplierName: string; totalAmount: number };
type ExpenseRow = { date: string; category: string; amount: number };
type CashierRow = { userId: string; userName: string; count: number; total: number };
type TransactionRow = { id: string; transactionNumber: string; userName: string; totalAmount: number; paymentMethod: string; createdAt: string };

const Reports: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const userPermissions = user?.permissions ?? [];
  const canRead = userPermissions.includes('reports:read');

  const [tab, setTab] = useState<'sales' | 'bestselling' | 'slowmoving' | 'grossprofit' | 'valuation' | 'purchase' | 'expense' | 'cashier' | 'transactions'>('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sales, setSales] = useState<SalesRow[]>([]);
  const [bestSelling, setBestSelling] = useState<BestSellingRow[]>([]);
  const [slowMoving, setSlowMoving] = useState<SlowMovingRow[]>([]);
  const [grossProfit, setGrossProfit] = useState<GrossProfitRow[]>([]);
  const [valuation, setValuation] = useState<ValuationRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [cashiers, setCashiers] = useState<CashierRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
  const defaultEnd = new Date().toISOString().split('T')[0]!;

  useEffect(() => {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
  }, []);

  const fetchReport = useCallback(async () => {
    if (!isAuthenticated || !canRead) return;
    setLoading(true);
    setError(null);
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : 0;

    try {
      switch (tab) {
        case 'sales': {
          const result = await vyapara.reportSales({ token: '', startDate: start, endDate: end });
          if (result.ok) setSales(result.data);
          else setError(result.error.message);
          break;
        }
        case 'bestselling': {
          const result = await vyapara.reportBestSelling({ token: '', startDate: start, endDate: end, limit: 50 });
          if (result.ok) setBestSelling(result.data);
          else setError(result.error.message);
          break;
        }
        case 'slowmoving': {
          const result = await vyapara.reportSlowMoving({ token: '', startDate: start, endDate: end });
          if (result.ok) setSlowMoving(result.data);
          else setError(result.error.message);
          break;
        }
        case 'grossprofit': {
          const result = await vyapara.reportGrossProfit({ token: '', startDate: start, endDate: end });
          if (result.ok) setGrossProfit(result.data);
          else setError(result.error.message);
          break;
        }
        case 'valuation': {
          const result = await vyapara.reportInventoryValuation({ token: '', startDate: start, endDate: end });
          if (result.ok) setValuation(result.data);
          else setError(result.error.message);
          break;
        }
        case 'purchase': {
          const result = await vyapara.reportPurchase({ token: '', startDate: start, endDate: end });
          if (result.ok) setPurchases(result.data);
          else setError(result.error.message);
          break;
        }
        case 'expense': {
          const result = await vyapara.reportExpense({ token: '', startDate: start, endDate: end });
          if (result.ok) setExpenses(result.data);
          else setError(result.error.message);
          break;
        }
        case 'cashier': {
          const result = await vyapara.reportCashierPerformance({ token: '', startDate: start, endDate: end });
          if (result.ok) setCashiers(result.data);
          else setError(result.error.message);
          break;
        }
        case 'transactions': {
          const result = await vyapara.reportTransaction({ token: '', startDate: start, endDate: end, limit: 200 });
          if (result.ok) setTransactions(result.data);
          else setError(result.error.message);
          break;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [tab, startDate, endDate, isAuthenticated, canRead]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-vyapara-navy mb-2">Laporan & Analitik</h1>
          <p className="text-vyapara-secondary">Laporan penjualan, keuntungan, inventaris, pembelian, dan pengeluaran</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
          />
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-vyapara-border overflow-hidden">
        <div className="p-4 border-b border-vyapara-border flex flex-wrap gap-2">
          {['sales', 'bestselling', 'slowmoving', 'grossprofit', 'valuation', 'purchase', 'expense', 'cashier', 'transactions'].map((key) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-vyapara-blue text-white'
                  : 'text-vyapara-text hover:bg-vyapara-surface'
              }`}
            >
              {key === 'sales' ? 'Penjualan Harian' : key === 'bestselling' ? 'Produk Terlaris' : key === 'slowmoving' ? 'Produk Lambat Gerak' : key === 'grossprofit' ? 'Laba Kotor' : key === 'valuation' ? 'Nilai Inventaris' : key === 'purchase' ? 'Pembelian' : key === 'expense' ? 'Pengeluaran' : key === 'cashier' ? 'Kinerja Kasir' : 'Transaksi'}
            </button>
          ))}
        </div>
        <div className="p-6">
          {loading ? (
            <div className="p-8 text-center text-vyapara-secondary">Memuat laporan...</div>
          ) : tab === 'sales' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-vyapara-surface border-b border-vyapara-border">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Tanggal</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Jumlah Transaksi</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {sales.map((row) => (
                    <tr key={row.date}>
                      <td className="px-6 py-4 text-sm">{row.date}</td>
                      <td className="px-6 py-4 text-sm text-right">{row.count}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">{row.total.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-vyapara-secondary">
                        Tidak ada data penjualan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'bestselling' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-vyapara-surface border-b border-vyapara-border">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Produk</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Terjual</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Pendapatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {bestSelling.map((row) => (
                    <tr key={row.productId}>
                      <td className="px-6 py-4 text-sm">{row.productName}</td>
                      <td className="px-6 py-4 text-sm text-right">{row.quantity}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">{row.revenue.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {bestSelling.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-vyapara-secondary">
                        Tidak ada data produk terlaris
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'slowmoving' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-vyapara-surface border-b border-vyapara-border">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Produk</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Stok</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Terjual Terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {slowMoving.map((row) => (
                    <tr key={row.productId}>
                      <td className="px-6 py-4 text-sm">{row.productName}</td>
                      <td className="px-6 py-4 text-sm text-right">{row.stock}</td>
                      <td className="px-6 py-4 text-sm">{row.lastSold ? new Date(row.lastSold).toLocaleDateString('id-ID') : 'Belum pernah'}</td>
                    </tr>
                  ))}
                  {slowMoving.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-vyapara-secondary">
                        Tidak ada produk lambat gerak
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'grossprofit' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-vyapara-surface border-b border-vyapara-border">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Periode</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Pendapatan</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">HPP</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Laba Kotor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {grossProfit.map((row) => (
                    <tr key={row.period}>
                      <td className="px-6 py-4 text-sm">{row.period}</td>
                      <td className="px-6 py-4 text-sm text-right">{row.revenue.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-sm text-right">{row.cogs.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">{row.grossProfit.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {grossProfit.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-vyapara-secondary">
                        Tidak ada data laba kotor
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'valuation' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-vyapara-surface border-b border-vyapara-border">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Produk</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Qty</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Harga Pokok</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Nilai Pokok</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Harga Jual</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Nilai Jual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {valuation.map((row) => (
                    <tr key={row.productId}>
                      <td className="px-6 py-4 text-sm">{row.productName}</td>
                      <td className="px-6 py-4 text-sm text-right">{row.quantity}</td>
                      <td className="px-6 py-4 text-sm text-right">{row.unitCost.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-sm text-right">{row.costValue.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-sm text-right">{row.unitRetail.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-sm text-right">{row.retailValue.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {valuation.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-vyapara-secondary">
                        Tidak ada data inventaris
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'purchase' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-vyapara-surface border-b border-vyapara-border">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Tanggal</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Nomor PO</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Pemasok</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {purchases.map((row) => (
                    <tr key={row.poNumber}>
                      <td className="px-6 py-4 text-sm">{row.date}</td>
                      <td className="px-6 py-4 text-sm font-mono">{row.poNumber}</td>
                      <td className="px-6 py-4 text-sm">{row.supplierName}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">{row.totalAmount.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {purchases.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-vyapara-secondary">
                        Tidak ada data pembelian
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'expense' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-vyapara-surface border-b border-vyapara-border">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Tanggal</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Kategori</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {expenses.map((row) => (
                    <tr key={`${row.date}-${row.category}`}>
                      <td className="px-6 py-4 text-sm">{row.date}</td>
                      <td className="px-6 py-4 text-sm">{row.category}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">{row.amount.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-vyapara-secondary">
                        Tidak ada data pengeluaran
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'cashier' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-vyapara-surface border-b border-vyapara-border">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Kasir</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Transaksi</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {cashiers.map((row) => (
                    <tr key={row.userId}>
                      <td className="px-6 py-4 text-sm">{row.userName}</td>
                      <td className="px-6 py-4 text-sm text-right">{row.count}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">{row.total.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {cashiers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-vyapara-secondary">
                        Tidak ada data kinerja kasir
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-vyapara-surface border-b border-vyapara-border">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Nomor Transaksi</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Kasir</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Total</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Metode</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {transactions.map((row) => (
                    <tr key={row.id}>
                      <td className="px-6 py-4 text-sm font-mono">{row.transactionNumber}</td>
                      <td className="px-6 py-4 text-sm">{row.userName}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">{row.totalAmount.toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-sm">{row.paymentMethod}</td>
                      <td className="px-6 py-4 text-sm">{new Date(row.createdAt).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-vyapara-secondary">
                        Tidak ada data transaksi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
