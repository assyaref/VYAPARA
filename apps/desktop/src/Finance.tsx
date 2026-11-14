import React, { useState, useEffect, useCallback } from 'react';
import useAuth from './authStore';

const vyapara = (window as any).vyapara;

const Finance: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const userPermissions = user?.permissions ?? [];
  const canWrite = userPermissions.includes('finance:write');
  const canRead = userPermissions.includes('finance:read');

  const [view, setView] = useState<'drawer' | 'income' | 'expense' | 'reports'>('drawer');
  const [cashDrawers, setCashDrawers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [closeForm, setCloseForm] = useState(false);
  const [incomeForm, setIncomeForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState(false);
  const [openDrawerData, setOpenDrawerData] = useState({ openingBalance: '', notes: '' });
  const [closeDrawerData, setCloseDrawerData] = useState({ cashDrawerId: '', closingBalance: '', notes: '' });
  const [incomeData, setIncomeData] = useState({ incomeType: '', amount: '', description: '' });
  const [expenseData, setExpenseData] = useState({ category: '', amount: '', description: '' });

  const loadCashDrawers = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const result = await vyapara.getCashDrawers({ token: '', limit: 100 });
      if (result.ok) {
        setCashDrawers(result.data);
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat dompet kas');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCashDrawers();
  }, [loadCashDrawers]);

  const handleOpenDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await vyapara.openCashDrawer({
        token: '',
        openingBalance: parseInt(openDrawerData.openingBalance, 10) || 0,
        notes: openDrawerData.notes || undefined,
      });
      if (result.ok) {
        setOpenForm(false);
        setOpenDrawerData({ openingBalance: '', notes: '' });
        await loadCashDrawers();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal membuka dompet kas');
    }
  };

  const handleCloseDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await vyapara.closeCashDrawer({
        token: '',
        cashDrawerId: closeDrawerData.cashDrawerId,
        closingBalance: parseInt(closeDrawerData.closingBalance, 10) || 0,
        notes: closeDrawerData.notes || undefined,
      });
      if (result.ok) {
        setCloseForm(false);
        setCloseDrawerData({ cashDrawerId: '', closingBalance: '', notes: '' });
        await loadCashDrawers();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menutup dompet kas');
    }
  };

  const handleRecordIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await vyapara.recordIncome({
        token: '',
        incomeType: incomeData.incomeType,
        amount: parseInt(incomeData.amount, 10) || 0,
        description: incomeData.description || undefined,
      });
      if (result.ok) {
        setIncomeForm(false);
        setIncomeData({ incomeType: '', amount: '', description: '' });
        await loadCashDrawers();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mencatat pemasukan');
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await vyapara.recordExpense({
        token: '',
        category: expenseData.category,
        amount: parseInt(expenseData.amount, 10) || 0,
        description: expenseData.description || undefined,
      });
      if (result.ok) {
        setExpenseForm(false);
        setExpenseData({ category: '', amount: '', description: '' });
        await loadCashDrawers();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mencatat pengeluaran');
    }
  };

  const openDrawer = cashDrawers.find((d) => d.status === 'open');

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-vyapara-navy mb-2">Manajemen Keuangan</h1>
          <p className="text-vyapara-secondary">Dompet kas, pemasukan, pengeluaran, dan laporan keuangan</p>
        </div>
        <div className="flex gap-2">
          {canWrite && openDrawer ? (
            <button
              onClick={() => setCloseForm(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Tutup Dompet Kas
            </button>
          ) : canWrite && !openDrawer ? (
            <button
              onClick={() => setOpenForm(true)}
              className="bg-vyapara-navy hover:bg-vyapara-blue text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Buka Dompet Kas
            </button>
          ) : null}
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-vyapara-border">
          <h3 className="text-sm font-medium text-vyapara-secondary mb-3">Status Dompet Kas</h3>
          <div className="text-2xl font-bold">
            {openDrawer ? 'Terbuka' : 'Tertutup'}
          </div>
          {openDrawer && (
            <p className="text-vyapara-secondary text-sm mt-1">
              Saldo pembuka: {openDrawer.openingBalance.toLocaleString('id-ID')}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-vyapara-border">
          <h3 className="text-sm font-medium text-vyapara-secondary mb-3">Total Pemasukan</h3>
          <div className="text-2xl font-bold text-green-600">
            {cashDrawers.reduce((sum, d) => sum + d.opening_balance, 0).toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-vyapara-border">
          <h3 className="text-sm font-medium text-vyapara-secondary mb-3">Total Transaksi</h3>
          <div className="text-2xl font-bold text-blue-600">
            {cashDrawers.length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-vyapara-border overflow-hidden">
        <div className="p-6 border-b border-vyapara-border flex gap-4">
          <button
            onClick={() => setView('drawer')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
              view === 'drawer' ? 'bg-vyapara-blue text-white' : 'text-vyapara-text hover:bg-vyapara-surface'
            }`}
          >
            Dompet Kas
          </button>
          {canWrite && (
            <button
              onClick={() => setView('income')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                view === 'income' ? 'bg-vyapara-blue text-white' : 'text-vyapara-text hover:bg-vyapara-surface'
              }`}
            >
              Pemasukan
            </button>
          )}
          {canWrite && (
            <button
              onClick={() => setView('expense')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                view === 'expense' ? 'bg-vyapara-blue text-white' : 'text-vyapara-text hover:bg-vyapara-surface'
              }`}
            >
              Pengeluaran
            </button>
          )}
          {canRead && (
            <button
              onClick={() => setView('reports')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                view === 'reports' ? 'bg-vyapara-blue text-white' : 'text-vyapara-text hover:bg-vyapara-surface'
              }`}
            >
              Laporan
            </button>
          )}
        </div>

        {view === 'drawer' && (
          <div className="p-6">
            {loading ? (
              <div className="p-8 text-center text-vyapara-secondary">Memuat dompet kas...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-vyapara-surface border-b border-vyapara-border">
                    <tr>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Tanggal Buka</th>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Pengguna</th>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Saldo Pembuka</th>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Saldo Penutup</th>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vyapara-border">
                    {cashDrawers.map((drawer) => (
                      <tr key={drawer.id} className="hover:bg-vyapara-surface/50 transition-colors">
                        <td className="px-6 py-4 text-sm">
                          {new Date(drawer.openedAt).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-sm">{drawer.userName}</td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {drawer.openingBalance.toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {drawer.closingBalance?.toLocaleString('id-ID') || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              drawer.status === 'open'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {drawer.status === 'open' ? 'Terbuka' : 'Tertutup'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {cashDrawers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-vyapara-secondary">
                          Belum ada dompet kas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === 'income' && canWrite && (
          <div className="p-6">
            <h3 className="text-lg font-bold text-vyapara-navy mb-4">Catat Pemasukan</h3>
            <form onSubmit={handleRecordIncome} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Tipe Pemasukan *</label>
                <input
                  type="text"
                  value={incomeData.incomeType}
                  onChange={(e) => setIncomeData({ ...incomeData, incomeType: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  placeholder="Penjualan, pembiayaan, dll"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Jumlah *</label>
                <input
                  type="number"
                  value={incomeData.amount}
                  onChange={(e) => setIncomeData({ ...incomeData, amount: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={incomeData.description}
                  onChange={(e) => setIncomeData({ ...incomeData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIncomeForm(false)}
                  className="px-6 py-2 border border-vyapara-border rounded-lg text-vyapara-secondary hover:bg-vyapara-surface font-medium"
                >
                  Batal
                </button>
                <button type="submit" className="px-6 py-2 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors">
                  Catat Pemasukan
                </button>
              </div>
            </form>
          </div>
        )}

        {view === 'expense' && canWrite && (
          <div className="p-6">
            <h3 className="text-lg font-bold text-vyapara-navy mb-4">Catat Pengeluaran</h3>
            <form onSubmit={handleRecordExpense} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Kategori *</label>
                <input
                  type="text"
                  value={expenseData.category}
                  onChange={(e) => setExpenseData({ ...expenseData, category: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  placeholder="Listrik, sewa, gaji, dll"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Jumlah *</label>
                <input
                  type="number"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={expenseData.description}
                  onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setExpenseForm(false)}
                  className="px-6 py-2 border border-vyapara-border rounded-lg text-vyapara-secondary hover:bg-vyapara-surface font-medium"
                >
                  Batal
                </button>
                <button type="submit" className="px-6 py-2 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors">
                  Catat Pengeluaran
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {openForm && canWrite && openDrawer === undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpenForm(false)}
          />
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <h3 className="text-xl font-bold text-vyapara-navy mb-4">Buka Dompet Kas</h3>
            <form onSubmit={handleOpenDrawer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Saldo Pembuka *</label>
                <input
                  type="number"
                  value={openDrawerData.openingBalance}
                  onChange={(e) => setOpenDrawerData({ ...openDrawerData, openingBalance: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Catatan</label>
                <input
                  type="text"
                  value={openDrawerData.notes}
                  onChange={(e) => setOpenDrawerData({ ...openDrawerData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOpenForm(false)}
                  className="px-6 py-2 border border-vyapara-border rounded-lg text-vyapara-secondary hover:bg-vyapara-surface font-medium"
                >
                  Batal
                </button>
              </div>
              <button type="submit" className="px-6 py-2 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors">
                Buka Dompet
              </button>
            </form>
          </div>
        </div>
      )}

      {closeForm && canWrite && openDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setCloseForm(false)}
          />
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <h3 className="text-xl font-bold text-vyapara-navy mb-4">Tutup Dompet Kas</h3>
            <p className="text-vyapara-secondary text-sm mb-4">
              Saldo pembuka: {openDrawer.openingBalance.toLocaleString('id-ID')}
            </p>
            <form onSubmit={handleCloseDrawer} className="space-y-4">
              <input type="hidden" value={openDrawer.id} onChange={(e) => setCloseDrawerData({ ...closeDrawerData, cashDrawerId: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Saldo Penutup *</label>
                <input
                  type="number"
                  value={closeDrawerData.closingBalance}
                  onChange={(e) => setCloseDrawerData({ ...closeDrawerData, closingBalance: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Catatan</label>
                <input
                  type="text"
                  value={closeDrawerData.notes}
                  onChange={(e) => setCloseDrawerData({ ...closeDrawerData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCloseForm(false)}
                  className="px-6 py-2 border border-vyapara-border rounded-lg text-vyapara-secondary hover:bg-vyapara-surface font-medium"
                >
                  Batal
                </button>
                <button type="submit" className="px-6 py-2 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors">
                  Tutup Dompet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
