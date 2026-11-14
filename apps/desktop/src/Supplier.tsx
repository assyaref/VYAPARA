/* src/Supplier.tsx */
import React, { useState, useEffect, useCallback } from 'react';
import useAuth from './authStore';

type SupplierRecord = {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  paymentTerms: number;
  creditLimit: number;
  balance: number;
  status: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
};

type SupplierTransaction = {
  id: string;
  supplierId: string;
  transactionType: string;
  referenceType?: string;
  referenceId?: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  transactionDate: number;
  createdAt: number;
  createdBy?: string;
};

const vyapara = (window as any).vyapara;

const Supplier: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    taxId: '',
    paymentTerms: '',
    creditLimit: '',
    notes: '',
  });
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(null);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const userPermissions = user?.permissions ?? [];
  const canWrite = userPermissions.includes('supplier:write');
  const canDelete = userPermissions.includes('supplier:delete');
  const canReadTx = userPermissions.includes('supplier:transactions');

  const loadSuppliers = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const result = await vyapara.getSuppliers({
        token: '',
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        limit: 1000,
      });
      if (result.ok) {
        setSuppliers(result.data);
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat pemasok');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, search, statusFilter]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await vyapara.createSupplier({
        token: '',
        name: formData.name,
        contactPerson: formData.contactPerson || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country || undefined,
        taxId: formData.taxId || undefined,
        paymentTerms: formData.paymentTerms ? parseInt(formData.paymentTerms, 10) : undefined,
        creditLimit: formData.creditLimit ? parseInt(formData.creditLimit, 10) : undefined,
        notes: formData.notes || undefined,
      });
      if (result.ok) {
        setFormOpen(false);
        setFormData({
          name: '', contactPerson: '', phone: '', email: '', address: '',
          city: '', postalCode: '', country: '', taxId: '', paymentTerms: '',
          creditLimit: '', notes: '',
        });
        await loadSuppliers();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal membuat pemasok');
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!editingId) return;
    try {
      const result = await vyapara.updateSupplier({
        token: '',
        id: editingId,
        name: formData.name || undefined,
        contactPerson: formData.contactPerson || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        city: formData.city || null,
        postalCode: formData.postalCode || null,
        country: formData.country || null,
        taxId: formData.taxId || null,
        paymentTerms: formData.paymentTerms ? parseInt(formData.paymentTerms, 10) : undefined,
        creditLimit: formData.creditLimit ? parseInt(formData.creditLimit, 10) : undefined,
        notes: formData.notes || null,
      });
      if (result.ok) {
        setFormOpen(false);
        setEditMode(false);
        setEditingId(null);
        setFormData({
          name: '', contactPerson: '', phone: '', email: '', address: '',
          city: '', postalCode: '', country: '', taxId: '', paymentTerms: '',
          creditLimit: '', notes: '',
        });
        await loadSuppliers();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui pemasok');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Yakin ingin menonaktifkan pemasok ini?')) return;
    setError(null);
    try {
      const result = await vyapara.deactivateSupplier({ token: '', id });
      if (result.ok) {
        await loadSuppliers();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menonaktifkan pemasok');
    }
  };

  const loadTransactions = async (supplier: SupplierRecord) => {
    setSelectedSupplier(supplier);
    setTransactions([]);
    setTxLoading(true);
    try {
      const result = await vyapara.getSupplierTransactions({
        token: '',
        supplierId: supplier.id,
        limit: 100,
      });
      if (result.ok) {
        setTransactions(result.data);
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat transaksi');
    } finally {
      setTxLoading(false);
    }
  };

  const handleEdit = (supplier: SupplierRecord) => {
    setEditMode(true);
    setEditingId(supplier.id);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      city: supplier.city || '',
      postalCode: supplier.postalCode || '',
      country: supplier.country || '',
      taxId: supplier.taxId || '',
      paymentTerms: String(supplier.paymentTerms || 0),
      creditLimit: String(supplier.creditLimit || 0),
      notes: supplier.notes || '',
    });
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditMode(false);
    setEditingId(null);
    setFormData({
      name: '', contactPerson: '', phone: '', email: '', address: '',
      city: '', postalCode: '', country: '', taxId: '', paymentTerms: '',
      creditLimit: '', notes: '',
    });
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-vyapara-navy mb-2">Manajemen Pemasok</h1>
          <p className="text-vyapara-secondary">Kelola data pemasok dan transaksi pembelian</p>
        </div>
        {canWrite && (
          <button
            onClick={handleNew}
            className="bg-vyapara-navy hover:bg-vyapara-blue text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Pemasok
          </button>
        )}
      </header>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-vyapara-border overflow-hidden">
        <div className="p-6 border-b border-vyapara-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Cari nama pemasok..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none w-full sm:w-auto max-w-xs"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none bg-vyapara-surface"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
            <div className="text-sm text-vyapara-secondary mt-2">
              {suppliers.length} pemasok ditemukan
            </div>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-vyapara-secondary">Memuat data pemasok...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-vyapara-surface border-b border-vyapara-border">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Kode</th>
                  <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Nama</th>
                  <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Kontak</th>
                  <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Telepon</th>
                  <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Email</th>
                  <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Saldo</th>
                  <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Status</th>
                  <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vyapara-border">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-vyapara-surface/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{supplier.code}</td>
                    <td className="px-6 py-4 text-sm font-medium">{supplier.name}</td>
                    <td className="px-6 py-4 text-sm">{supplier.contactPerson || '-'}</td>
                    <td className="px-6 py-4 text-sm">{supplier.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm">{supplier.email || '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {supplier.balance >= 0 ? '+' : '-'}{Math.abs(supplier.balance).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          supplier.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {supplier.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canWrite && (
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="p-2 text-vyapara-blue hover:bg-vyapara-blue/10 rounded-lg"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                        {canDelete && supplier.status === 'active' && (
                          <button
                            onClick={() => handleDeactivate(supplier.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Nonaktifkan"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        {canReadTx && (
                          <button
                            onClick={() => loadTransactions(supplier)}
                            className="p-2 text-vyapara-navy hover:bg-vyapara-navy/10 rounded-lg"
                            title="Transaksi"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-vyapara-secondary">
                      Belum ada data pemasok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSupplier && canReadTx && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-vyapara-border overflow-hidden">
          <div className="p-6 border-b border-vyapara-border flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-vyapara-navy">{selectedSupplier.name}</h2>
              <p className="text-vyapara-secondary text-sm">
                Transaksi Pemasok • Saldo: {selectedSupplier.balance >= 0 ? '+' : '-'}{Math.abs(selectedSupplier.balance).toLocaleString('id-ID')}
              </p>
            </div>
            <button
              onClick={() => setSelectedSupplier(null)}
              className="p-2 text-vyapara-secondary hover:text-vyapara-navy"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M15 19l-7-7 7-7" />
                <path d="M14 4l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
          <div className="p-6">
            {txLoading ? (
              <div className="text-center py-8 text-vyapara-secondary">Memuat transaksi...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-vyapara-secondary">
                Tidak ada transaksi untuk pemasok ini
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-vyapara-surface border-b border-vyapara-border">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Tanggal</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Tipe</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Jumlah</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Saldo Setelah</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Deskripsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-6 py-4 text-sm">
                        {new Date(tx.transactionDate).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            tx.transactionType === 'purchase'
                              ? 'bg-blue-100 text-blue-700'
                              : tx.transactionType === 'payment'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {tx.transactionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {tx.amount >= 0 ? '+' : '-'}{Math.abs(tx.amount).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {tx.balanceAfter >= 0 ? '+' : '-'}{Math.abs(tx.balanceAfter).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm">{tx.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setFormOpen(false)}
          />
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative">
            <h3 className="text-xl font-bold text-vyapara-navy mb-4">
              {editMode ? 'Edit Pemasok' : 'Tambah Pemasok'}
            </h3>
            <form onSubmit={editMode ? handleUpdateSubmit : handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Nama Pemasok *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Telepon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Alamat</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Kota</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Kode Pos</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Negara</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Tax ID</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Payment Terms (hari)</label>
                  <input
                    type="number"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Credit Limit</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Catatan</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-6 py-2 border border-vyapara-border rounded-lg text-vyapara-secondary hover:bg-vyapara-surface font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors"
                >
                  {editMode ? 'Simpan Perubahan' : 'Simpan Pemasok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Supplier;
