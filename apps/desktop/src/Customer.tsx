import React, { useState, useEffect, useCallback } from 'react';
import useAuth from './authStore';

const vyapara = (window as any).vyapara;

type CustomerRecord = {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  balance: number;
  status: string;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
};

const Customer: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const userPermissions = user?.permissions ?? [];
  const canWrite = userPermissions.includes('customer:write');
  const canRead = userPermissions.includes('customer:read');

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: '',
  });

  const loadCustomers = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const result = await vyapara.getCustomers({
        token: '',
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        limit: 1000,
      });
      if (result.ok) {
        setCustomers(result.data);
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat pelanggan');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, search, statusFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await vyapara.createCustomer({
        token: '',
        name: formData.name,
        contactPerson: formData.contactPerson || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        notes: formData.notes || undefined,
      });
      if (result.ok) {
        setFormOpen(false);
        setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', city: '', notes: '' });
        await loadCustomers();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal membuat pelanggan');
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!editingId) return;
    try {
      const result = await vyapara.updateCustomer({
        token: '',
        id: editingId,
        name: formData.name || undefined,
        contactPerson: formData.contactPerson || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        city: formData.city || null,
        notes: formData.notes || null,
      });
      if (result.ok) {
        setFormOpen(false);
        setEditMode(false);
        setEditingId(null);
        setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', city: '', notes: '' });
        await loadCustomers();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui pelanggan');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Yakin ingin menonaktifkan pelanggan ini?')) return;
    setError(null);
    try {
      const result = await vyapara.deactivateCustomer({ token: '', id });
      if (result.ok) {
        await loadCustomers();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menonaktifkan pelanggan');
    }
  };

  const loadTransactions = async (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
    setTransactions([]);
    setTxLoading(true);
    try {
      const result = await vyapara.getCustomerTransactions({
        token: '',
        customerId: customer.id,
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

  const handlePayCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setError(null);
    const amount = parseInt(payAmount, 10) || 0;
    try {
      const result = await vyapara.payCustomerCredit({
        token: '',
        customerId: selectedCustomer.id,
        amount,
      });
      if (result.ok) {
        setSelectedCustomer(result.data);
        setPayOpen(false);
        setPayAmount('');
        await loadCustomers();
        await loadTransactions(result.data);
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mencatat pembayaran');
    }
  };

  const handleEdit = (customer: CustomerRecord) => {
    setEditMode(true);
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      contactPerson: customer.contactPerson || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      notes: customer.notes || '',
    });
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditMode(false);
    setEditingId(null);
    setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', city: '', notes: '' });
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-vyapara-navy mb-2">Manajemen Pelanggan</h1>
          <p className="text-vyapara-secondary">Data pelanggan, riwayat pembelian, dan piutang</p>
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
            Tambah Pelanggan
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
                placeholder="Cari nama pelanggan..."
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
              {customers.length} pelanggan ditemukan
            </div>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-vyapara-secondary">Memuat data pelanggan...</div>
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
                  <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Piutang</th>
                  <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Status</th>
                  <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vyapara-border">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-vyapara-surface/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{customer.code}</td>
                    <td className="px-6 py-4 text-sm font-medium">{customer.name}</td>
                    <td className="px-6 py-4 text-sm">{customer.contactPerson || '-'}</td>
                    <td className="px-6 py-4 text-sm">{customer.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm">{customer.email || '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {customer.balance >= 0 ? '+' : '-'}{Math.abs(customer.balance).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          customer.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {customer.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canWrite && (
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-2 text-vyapara-blue hover:bg-vyapara-blue/10 rounded-lg"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                        {canWrite && customer.status === 'active' && (
                          <button
                            onClick={() => handleDeactivate(customer.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Nonaktifkan"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => loadTransactions(customer)}
                          className="p-2 text-vyapara-navy hover:bg-vyapara-navy/10 rounded-lg"
                          title="Transaksi & Piutang"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-vyapara-secondary">
                      Belum ada data pelanggan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-vyapara-border overflow-hidden">
          <div className="p-6 border-b border-vyapara-border flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-vyapara-navy">{selectedCustomer.name}</h2>
              <p className="text-vyapara-secondary text-sm">
                Riwayat Pelanggan • Piutang: {selectedCustomer.balance >= 0 ? '+' : '-'}{Math.abs(selectedCustomer.balance).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selectedCustomer.balance > 0 && (
                <button
                  onClick={() => setPayOpen(true)}
                  className="px-4 py-2 rounded-md bg-vyapara-blue text-white text-sm font-medium"
                >
                  Terima Pembayaran
                </button>
              )}
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 text-vyapara-secondary hover:text-vyapara-navy"
              >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M15 19l-7-7 7-7" />
                <path d="M14 4l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            </div>
          </div>
          <div className="p-6">
            {txLoading ? (
              <div className="text-center py-8 text-vyapara-secondary">Memuat transaksi...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-vyapara-secondary">
                Tidak ada transaksi untuk pelanggan ini
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
                      <td className="px-6 py-4 text-sm">{tx.transactionType}</td>
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

      {payOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPayOpen(false)} />
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <h3 className="text-xl font-bold text-vyapara-navy mb-2">Terima Pembayaran Piutang</h3>
            <p className="text-vyapara-secondary text-sm mb-4">
              {selectedCustomer.name} • Sisa piutang {selectedCustomer.balance.toLocaleString('id-ID')}
            </p>
            <form onSubmit={handlePayCredit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Jumlah *</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  min={1}
                  max={selectedCustomer.balance}
                  className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setPayOpen(false)} className="px-4 py-2 rounded-md border border-vyapara-border">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-md bg-vyapara-blue text-white font-medium">
                  Simpan
                </button>
              </div>
            </form>
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
              {editMode ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
            </h3>
            <form onSubmit={editMode ? handleUpdateSubmit : handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Nama Pelanggan *</label>
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
                  {editMode ? 'Simpan Perubahan' : 'Simpan Pelanggan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customer;
