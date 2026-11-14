/* src/POS.tsx */
import React, { useState, useEffect, useCallback } from 'react';
import useAuth from './authStore';

const vyapara = (window as any).vyapara;

type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type PaymentLine = {
  method: string;
  amount: number;
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Kredit' },
];

const POS: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const taxRateBps = 0;
  const taxAmount = Math.round((subtotal * taxRateBps) / 10_000);
  const total = subtotal + taxAmount;
  const paid = paymentMethod === 'cash' ? (parseInt(paymentAmount, 10) || 0) : total;
  const change = Math.max(0, paid - total);

  const loadProducts = useCallback(async () => {
    const result = await vyapara.getProducts({ token: '', includeInactive: false });
    if (result.ok) {
      setProducts(result.data);
    } else {
      setError(result.error.message);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const addToCart = (product: any) => {
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item,
        ),
      );
    } else {
      setCart([...cart, { productId: product.id, productName: product.name, quantity: 1, price: product.price, subtotal: product.price }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const changeQuantity = (productId: string, delta: number) => {
    const next = cart.map((item) => {
      if (item.productId !== productId) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return { ...item, quantity: 0, subtotal: 0 };
      return { ...item, quantity: newQty, subtotal: newQty * item.price };
    });
    setCart(next.filter((item) => item.quantity > 0));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const payments: PaymentLine[] = [{ method: paymentMethod, amount: paid }];
      const result = await vyapara.createTransaction({
        token: '',
        idempotencyKey,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        discountAmount: 0,
        payments,
        notes: '',
      });
      if (result.ok) {
        setReceipt(result.data);
        setCart([]);
        setPaymentAmount('');
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal checkout');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    if (!receipt) return;
    window.print();
  };

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-vyapara-navy mb-2">Point of Sale</h1>
          <p className="text-vyapara-secondary">Transaksi penjualan tunai dan non-tunai</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Scan barcode atau cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none w-full md:w-80"
          />
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <div className="bg-white rounded-xl shadow-sm border border-vyapara-border overflow-hidden">
            <div className="p-6 border-b border-vyapara-border">
              <h2 className="text-lg font-bold text-vyapara-navy">Produk</h2>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              <div className="grid grid-cols-3 gap-4 p-4">
                {products
                  .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()))
                  .map((product) => (
                    <div
                      key={product.id}
                      className="bg-vyapara-surface rounded-lg p-4 border border-vyapara-border hover:bg-vyapara-blue/10 cursor-pointer transition-colors"
                      onClick={() => addToCart(product)}
                    >
                      <div className="text-sm font-medium text-vyapara-text">{product.name}</div>
                      <div className="text-xs text-vyapara-secondary">{product.sku || product.barcode || '-'}</div>
                      <div className="mt-2 text-lg font-bold text-vyapara-navy">
                        {product.price.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                {products.length === 0 && (
                  <div className="p-8 text-center text-vyapara-secondary">Produk tidak ditemukan</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl shadow-sm border border-vyapara-border overflow-hidden">
            <div className="p-6 border-b border-vyapara-border">
              <h2 className="text-lg font-bold text-vyapara-navy">Keranjang</h2>
            </div>
            <div className="overflow-y-auto max-h-[400px] p-4">
              {cart.length === 0 ? (
                <div className="text-center text-vyapara-secondary py-8">Keranjang kosong</div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-2 border-b border-vyapara-border/50">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.productName}</div>
                        <div className="text-xs text-vyapara-secondary">
                          {item.price.toLocaleString('id-ID')} × {item.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => changeQuantity(item.productId, -1)}
                          className="w-6 h-6 rounded bg-vyapara-surface text-vyapara-text flex items-center justify-center hover:bg-vyapara-blue hover:text-white"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => changeQuantity(item.productId, 1)}
                          className="w-6 h-6 rounded bg-vyapara-surface text-vyapara-text flex items-center justify-center hover:bg-vyapara-blue hover:text-white"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="ml-2 text-red-600 hover:bg-red-50 rounded p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="text-sm font-medium text-right">
                        {item.subtotal.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-vyapara-border">
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-vyapara-secondary">Subtotal</span>
                  <span className="font-medium">{subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-vyapara-secondary">Pajak</span>
                  <span className="font-medium">{taxAmount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-vyapara-navy">Total</span>
                  <span>{total.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <label className="block text-sm font-medium text-vyapara-secondary">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.value}
                      onClick={() => setPaymentMethod(pm.value)}
                      className={`px-4 py-2 rounded border text-sm font-medium transition-colors ${paymentMethod === pm.value ? 'bg-vyapara-blue text-white border-vyapara-blue' : 'bg-vyapara-surface text-vyapara-text border-vyapara-border hover:bg-vyapara-blue/50'}`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div className="space-y-2 mb-6">
                  <label className="block text-sm font-medium text-vyapara-secondary">Jumlah Bayar</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                  <div className="text-sm text-vyapara-secondary">
                    Kembalian: {change.toLocaleString('id-ID')}
                  </div>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0 || (paymentMethod === 'cash' && paid < total)}
                className="w-full py-3 px-4 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Checkout'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setReceipt(null)}
          />
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-vyapara-navy mb-2">Struk Pembelian</h3>
            <div className="font-mono text-sm space-y-1 mb-4">
              <div className="text-center font-bold text-lg">VYAPARA</div>
              <div className="text-center text-vyapara-secondary text-xs">Terima kasih telah berbelanja</div>
              <div className="border-t border-b border-vyapara-border my-2"></div>
              <div className="flex justify-between">
                <span>Nomor: {receipt.transactionNumber}</span>
                <span>{new Date(receipt.createdAt).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir: {user?.name}</span>
                <span></span>
              </div>
              <div className="border-b border-vyapara-border my-2"></div>
              {receipt.items.map((item: any) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span>{item.productName} × {item.quantity}</span>
                  <span>{item.subtotal.toLocaleString('id-ID')}</span>
                </div>
              ))}
              <div className="border-t border-vyapara-border my-2"></div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{receipt.totalAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Bayar</span>
                <span>{receipt.paymentAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Kembali</span>
                <span>{receipt.changeAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="border-t border-vyapara-border my-2 text-center text-vyapara-secondary text-xs">
                Terima kasih
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={printReceipt}
                className="px-6 py-2 border border-vyapara-border rounded-lg text-vyapara-secondary hover:bg-vyapara-surface font-medium"
              >
                Cetak
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="px-6 py-2 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
