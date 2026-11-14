import React, { useState, useEffect, useCallback } from 'react';
import useAuth from './authStore';

const vyapara = (window as any).vyapara;

type PoItem = {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  userId: string;
  userName: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  items: PoItem[];
};

type ReceiveItem = {
  productId: string;
  quantity: number;
};

const Procurement: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const userPermissions = user?.permissions ?? [];
  const canWrite = userPermissions.includes('procurement:write');
  const canRead = userPermissions.includes('procurement:read');

  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    supplierId: '',
    items: [{ productId: '', quantity: '', unitPrice: '' }],
    notes: '',
  });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const loadSuppliers = useCallback(async () => {
    const result = await vyapara.getSuppliers({ token: '', limit: 1000 });
    if (result.ok) {
      setSuppliers(result.data);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    const result = await vyapara.getProducts({ token: '', includeInactive: false });
    if (result.ok) {
      setProducts(result.data);
    }
  }, []);

  const loadPurchaseOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const result = await vyapara.getPurchaseOrders({
        token: '',
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        limit: 500,
      });
      if (result.ok) {
        setPurchaseOrders(result.data);
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat purchase order');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, search, statusFilter]);

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, [loadSuppliers, loadProducts]);

  useEffect(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const items = formData.items
        .filter((it: any) => it.productId && it.quantity && it.unitPrice)
        .map((it: any) => ({
          productId: it.productId,
          quantity: parseInt(it.quantity, 10),
          unitPrice: parseInt(it.unitPrice, 10),
        }));
      if (items.length === 0) {
        setError('Minimal satu item wajib diisi');
        return;
      }
      const result = await vyapara.createPurchaseOrder({
        token: '',
        supplierId: formData.supplierId,
        items,
        notes: formData.notes || undefined,
      });
      if (result.ok) {
        setFormOpen(false);
        setFormData({ supplierId: '', items: [{ productId: '', quantity: '', unitPrice: '' }], notes: '' });
        await loadPurchaseOrders();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal membuat purchase order');
    }
  };

  const handleReceive = async (po: PurchaseOrder) => {
    setSelectedPo(po);
    setView('detail');
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo) return;
    setError(null);
    try {
      const items = formData.items
        .filter((it: any) => it.productId && it.quantity)
        .map((it: any) => ({
          productId: it.productId,
          quantity: parseInt(it.quantity, 10),
        }));
      if (items.length === 0) {
        setError('Minimal satu item wajib diisi');
        return;
      }
      const result = await vyapara.receiveGoods({
        token: '',
        purchaseOrderId: selectedPo.id,
        items,
        notes: formData.notes || undefined,
      });
      if (result.ok) {
        setFormOpen(false);
        setFormData({ supplierId: '', items: [{ productId: '', quantity: '', unitPrice: '' }], notes: '' });
        setSelectedPo(null);
        setView('list');
        await loadPurchaseOrders();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menerima barang');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Yakin ingin membatalkan purchase order ini?')) return;
    setError(null);
    try {
      const result = await vyapara.cancelPurchaseOrder({ token: '', id });
      if (result.ok) {
        await loadPurchaseOrders();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal membatalkan purchase order');
    }
  };

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-vyapara-navy mb-2">Manajemen Pembelian</h1>
          <p className="text-vyapara-secondary">Purchase order, penerimaan barang, dan retur pembelian</p>
        </div>
        {canWrite && (
          <button
            onClick={() => { setFormOpen(true); setView('create'); }}
            className="bg-vyapara-navy hover:bg-vyapara-blue text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Tambah Purchase Order
          </button>
        )}
      </header>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {view === 'create' && canWrite && (
        <div className="bg-white rounded-xl shadow-sm border border-vyapara-border p-6 mb-8">
          <h2 className="text-xl font-bold text-vyapara-navy mb-4">Buat Purchase Order</h2>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Pemasok *</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                >
                  <option value="">Pilih pemasok</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>
              {formData.items.map((item: any, idx: number) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      const items = [...formData.items];
                      items[idx] = { ...items[idx], productId: e.target.value };
                      setFormData({ ...formData, items });
                    }}
                    className="px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  >
                    <option value="">Pilih produk</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.sku || p.barcode || p.id} - {p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const items = [...formData.items];
                      items[idx] = { ...items[idx], quantity: e.target.value };
                      setFormData({ ...formData, items });
                    }}
                    className="px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                    placeholder="Qty"
                  />
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const items = [...formData.items];
                      items[idx] = { ...items[idx], unitPrice: e.target.value };
                      setFormData({ ...formData, items });
                    }}
                    className="px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                    placeholder="Harga"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const items = [...formData.items];
                      items.splice(idx, 1);
                      if (items.length === 0) items.push({ productId: '', quantity: '', unitPrice: '' });
                      setFormData({ ...formData, items });
                    }}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    Hapus
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, items: [...formData.items, { productId: '', quantity: '', unitPrice: '' }] });
                }}
                className="col-span-3 px-4 py-2 border border-vyapara-border rounded-lg text-vyapara-blue hover:bg-vyapara-blue/10"
              >
                + Tambah Item
              </button>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-vyapara-secondary mb-1">Catatan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
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
              <button type="submit" className="px-6 py-2 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors">
                Simpan Purchase Order
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-vyapara-border overflow-hidden">
          <div className="p-6 border-b border-vyapara-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cari nomor PO atau pemasok..."
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
                  <option value="draft">Draft</option>
                  <option value="partially_received">Parsial Terima</option>
                  <option value="received">Terima</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
              <div className="text-sm text-vyapara-secondary mt-2">
                {purchaseOrders.length} purchase order ditemukan
              </div>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-vyapara-secondary">Memuat data pembelian...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-vyapara-surface border-b border-vyapara-border">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Nomor PO</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Pemasok</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Total</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Status</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Tanggal</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-vyapara-surface/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{po.poNumber}</td>
                      <td className="px-6 py-4 text-sm">{po.supplierName}</td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {po.totalAmount.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            po.status === 'received'
                              ? 'bg-green-100 text-green-700'
                              : po.status === 'partially_received'
                                ? 'bg-blue-100 text-blue-700'
                                : po.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(po.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setSelectedPo(po); setView('detail'); }}
                            className="p-2 text-vyapara-blue hover:bg-vyapara-blue/10 rounded-lg"
                            title="Detail"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {canWrite && po.status === 'draft' && (
                            <button
                              onClick={() => handleCancel(po.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Batalkan"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          {canWrite && (po.status === 'draft' || po.status === 'partially_received') && (
                            <button
                              onClick={() => handleReceive(po)}
                              className="p-2 text-vyapara-navy hover:bg-vyapara-navy/10 rounded-lg"
                              title="Terima Barang"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {purchaseOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-vyapara-secondary">
                        Belum ada data purchase order
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === 'detail' && selectedPo && (
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-vyapara-border p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-vyapara-navy mb-1">
                  {selectedPo.poNumber}
                </h2>
                <p className="text-vyapara-secondary text-sm">
                  {selectedPo.supplierName} • {selectedPo.status}
                </p>
              </div>
              {canWrite && selectedPo.status !== 'cancelled' && selectedPo.status !== 'received' && (
                <button
                  onClick={() => handleCancel(selectedPo.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                >
                  Batalkan PO
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-vyapara-surface border-b border-vyapara-border">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Produk</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Qty Pesan</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Qty Terima</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Harga Satuan</th>
                    <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vyapara-border">
                  {selectedPo.items.map((item) => (
                    <tr key={item.id} className="hover:bg-vyapara-surface/50 transition-colors">
                      <td className="px-6 py-4 text-sm">{item.productName}</td>
                      <td className="px-6 py-4 text-sm text-right">{item.quantityOrdered}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium">
                        {item.quantityReceived}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {item.unitPrice.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium">
                        {item.subtotal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {canWrite && (
            <div className="bg-white rounded-xl shadow-sm border border-vyapara-border p-6">
              <h3 className="text-lg font-bold text-vyapara-navy mb-4">Terima Barang</h3>
              <form onSubmit={handleReceiveSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {selectedPo.items.map((item) => (
                    <div key={item.id}>
                      <label className="block text-xs font-medium text-vyapara-secondary mb-1">
                        {item.productName}
                      </label>
                      <input
                        type="number"
                        defaultValue={item.quantityOrdered - item.quantityReceived}
                        className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Catatan Penerimaan</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className="px-6 py-2 border border-vyapara-border rounded-lg text-vyapara-secondary hover:bg-vyapara-surface font-medium"
                  >
                    Batal
                  </button>
                  <button type="submit" className="px-6 py-2 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors">
                    Konfirmasi Penerimaan
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Procurement;
