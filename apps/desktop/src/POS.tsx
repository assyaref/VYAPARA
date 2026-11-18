/* src/POS.tsx */
import React, { useState, useEffect, useCallback } from 'react';
import useAuth from './authStore';
import { getBranding } from './branding';

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
  { value: 'cash', label: 'Tunai', hint: 'Kas' },
  { value: 'qris', label: 'QRIS', hint: 'QR' },
  { value: 'transfer', label: 'Transfer', hint: 'Bank' },
  { value: 'debit', label: 'Debit', hint: 'Kartu' },
  { value: 'credit', label: 'Kredit', hint: 'Piutang' },
];

// deterministic hue from product id/name for image placeholder
function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
const idr = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const effectiveUnitPrice = (product: { price: number; wholesalePrice?: number; wholesaleMinQty?: number }, qty: number) => {
  if (product.wholesalePrice && product.wholesalePrice > 0 && qty >= (product.wholesaleMinQty ?? 10)) {
    return product.wholesalePrice;
  }
  return product.price;
};

const POS: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [doDoc, setDoDoc] = useState<any | null>(null);
  const [doLoading, setDoLoading] = useState(false);
  const [invLoading, setInvLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [loyaltyRedeemAmount, setLoyaltyRedeemAmount] = useState(100);
  const [loyaltyEarnAmount, setLoyaltyEarnAmount] = useState(10000);

  useEffect(() => {
    vyapara?.getCustomers?.({ token: '', includeInactive: false, limit: 500 }).then((res: any) => {
      if (res?.ok) setCustomers(Array.isArray(res.data) ? res.data : []);
    }).catch(() => {});
    vyapara?.settingsList?.().then((res: any) => {
      const list = res?.data ?? [];
      const find = (k: string) => Number(list.find((x: any) => x.key === k)?.value);
      const redeem = find('loyalty_redeem_amount');
      const earn = find('loyalty_earn_amount');
      if (Number.isFinite(redeem) && redeem > 0) setLoyaltyRedeemAmount(redeem);
      if (Number.isFinite(earn) && earn > 0) setLoyaltyEarnAmount(earn);
    }).catch(() => {});
  }, []);

  const [doDmLoading, setDoDmLoading] = useState(false);
  const [discountPct, setDiscountPct] = useState(0);
  const [discountManual, setDiscountManual] = useState('');
  const [taxRateBps, setTaxRateBps] = useState(0);

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountFromPct = Math.round((subtotal * discountPct) / 100);
  const discountFromManual = parseInt(discountManual, 10) || 0;
  const manualDiscount = Math.min(subtotal, discountPct > 0 ? discountFromPct : discountFromManual);
  const loyaltyPoints = selectedCustomer?.loyaltyPoints ?? 0;
  const loyaltyRedeemValue = useLoyalty ? Math.min(loyaltyPoints * loyaltyRedeemAmount, Math.max(0, subtotal - manualDiscount)) : 0;
  const discountAmount = manualDiscount + loyaltyRedeemValue;
  const taxAmount = Math.round(((subtotal - discountAmount) * taxRateBps) / 10_000);
  const total = subtotal - discountAmount + taxAmount;
  const paid = paymentMethod === 'cash' ? (parseInt(paymentAmount, 10) || 0) : total;
  const change = Math.max(0, paid - total);
  const filteredCustomers = customers
    .filter((c) => !customerQuery || `${c.name} ${c.code ?? ''} ${c.phone ?? ''}`.toLowerCase().includes(customerQuery.toLowerCase()))
    .slice(0, 8);
  const cartQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  const loadProducts = useCallback(async () => {
    const result = await vyapara.getProducts({ token: '', includeInactive: false });
    if (result.ok) {
      setProducts(result.data);
    } else {
      setError(result.error.message);
    }
  }, []);

  useEffect(() => {
    vyapara.getSettings?.({ token: '' }).then((res: any) => {
      if (res?.ok && res.data) setTaxRateBps(Number(res.data.taxRateBps) || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadProducts();
    void (async () => {
      try {
        const cats = await vyapara.getCategories();
        if (cats?.ok && Array.isArray(cats.data)) setCategories(cats.data);
      } catch { /* ignore */ }
    })();
  }, [loadProducts]);

  const filtered = products.filter((p) => {
    if (activeCat && p.categoryId !== activeCat) return false;
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase());
  });

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
      const eff = effectiveUnitPrice(product, 1);
      setCart([...cart, { productId: product.id, productName: product.name, quantity: 1, price: eff, subtotal: eff }]);
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
      const product = products.find((p) => p.id === productId);
      const eff = product ? effectiveUnitPrice(product, newQty) : item.price;
      return { ...item, quantity: newQty, price: eff, subtotal: newQty * eff };
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
        discountAmount,
        payments,
        notes: '',
        customerId: selectedCustomer?.id || undefined,
        loyaltyPointsRedeemed: useLoyalty && selectedCustomer ? selectedCustomer.loyaltyPoints : undefined,
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

  const buildReceiptPayload = () => {
    if (!receipt) return null;
    const b = getBranding();
    const items = (receipt.items ?? []).map((i: any) => ({ name: i.productName ?? 'Item', qty: i.quantity ?? 1, unitPrice: i.price ?? Math.round((i.subtotal ?? 0) / (i.quantity ?? 1)), subtotal: i.subtotal ?? 0 }));
    const subtotal = items.reduce((sum: number, i: any) => sum + Math.round(i.subtotal), 0);
    return {
      storeName: b.appName,
      tagline: b.tagline,
      footer: b.receiptFooter,
      transactionNumber: receipt.transactionNumber,
      date: new Date(receipt.createdAt).toLocaleString('id-ID'),
      cashier: user?.name ?? '-',
      customerName: receipt.customerName ?? null,
      items,
      subtotal,
      discount: receipt.discountAmount ?? 0,
      total: receipt.totalAmount,
      payments: [{ method: paymentMethod ?? 'Tunai', amount: receipt.paymentAmount }],
      change: receipt.changeAmount ?? 0,
    };
  };

  const printReceipt = async () => {
    if (!receipt) return;
    try {
      const payload = buildReceiptPayload();
      const res = await vyapara.printReceipt({ token: '', payload });
      if (res?.ok) return;
      if (res?.error) console.warn('Thermal print gagal, fallback ke window.print:', res.error.message);
      window.print();
    } catch {
      window.print();
    }
  };

  const printInvoice = async () => {
    if (!receipt) return;
    setInvLoading(true);
    setError(null);
    try {
      const payload = { ...buildReceiptPayload(), dueDate: null };
      const res = await vyapara.printInvoice({ token: '', payload });
      if (!res?.ok) {
        setError(res?.error?.message ?? 'Gagal mencetak invoice — periksa printer di Pengaturan');
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mencetak invoice');
    } finally {
      setInvLoading(false);
    }
  };

  const printDeliveryOrderDotMatrix = async () => {
    if (!receipt) return;
    setDoDmLoading(true);
    setError(null);
    try {
      const b = getBranding();
      const res = await vyapara.getDeliveryOrder({ token: '', transactionId: receipt.id });
      if (!res?.ok || !res.data) { setError(res?.error?.message ?? 'Gagal memuat delivery order'); return; }
      const d = res.data;
      const payload = {
        storeName: b.appName,
        tagline: b.tagline,
        footer: b.receiptFooter,
        transactionNumber: d.transactionNumber,
        date: new Date(d.createdAt).toLocaleString('id-ID'),
        cashier: user?.name ?? '-',
        customerName: d.customerName ?? null,
        customerPhone: d.customerPhone ?? null,
        customerAddress: d.customerAddress ?? null,
        customerCity: d.customerCity ?? null,
        items: d.items.map((i: any) => ({ productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, subtotal: i.subtotal })),
        subtotal: d.subtotal,
        notes: d.notes ?? null,
      };
      const send = await vyapara.printDeliveryOrder({ token: '', payload });
      if (!send?.ok) {
        setError(send?.error?.message ?? 'Gagal mencetak DO — periksa printer di Pengaturan');
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mencetak DO');
    } finally {
      setDoDmLoading(false);
    }
  };

  const printDeliveryOrder = async () => {
    if (!receipt) return;
    setDoLoading(true);
    try {
      const res = await vyapara.getDeliveryOrder({ token: '', transactionId: receipt.id });
      if (!res?.ok || !res.data) {
        setError(res?.error?.message ?? 'Gagal memuat delivery order');
        return;
      }
      setDoDoc(res.data);
      // allow DOM to paint the DO before print dialog
      setTimeout(() => window.print(), 150);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat delivery order');
    } finally {
      setDoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-vyapara-navy leading-tight">Transaksi &amp; Pesanan</h1>
          <p className="text-[11px] text-vyapara-secondary">Kasir (POS) — transaksi tunai dan non-tunai</p>
        </div>
        <button
          onClick={() => setCart([])}
          title="Kosongkan keranjang"
          className="text-[10px] uppercase tracking-wider font-semibold text-vyapara-secondary bg-white border border-vyapara-border rounded-full px-3 py-1.5 hover:text-vyapara-red hover:border-vyapara-red transition-colors"
        >
          Kosongkan ({cartQty})
        </button>
      </header>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ==== LEFT: catalogue ==== */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-vyapara-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-vyapara-border space-y-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vyapara-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
                <input
                  type="text"
                  autoFocus
                  placeholder="Cari produk atau layanan…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-vyapara-border rounded-xl outline-none focus:ring-2 focus:ring-vyapara-blue text-sm"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
                <button
                  onClick={() => setActiveCat(null)}
                  className={`shrink-0 text-[11px] font-semibold rounded-full px-3 py-1.5 transition-colors ${activeCat === null ? 'bg-vyapara-navy text-white' : 'bg-vyapara-surface text-vyapara-secondary hover:bg-vyapara-light-blue'}`}
                >
                  Semua
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCat(c.id)}
                    className={`shrink-0 text-[11px] font-semibold rounded-full px-3 py-1.5 transition-colors ${activeCat === c.id ? 'bg-vyapara-navy text-white' : 'bg-vyapara-surface text-vyapara-secondary hover:bg-vyapara-light-blue'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto max-h-[520px] p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group text-left bg-vyapara-surface hover:bg-white rounded-xl border border-vyapara-border hover:border-vyapara-blue hover:shadow-md transition-all p-2.5 focus:outline-none focus:ring-2 focus:ring-vyapara-blue"
                  >
                    <div
                      className="h-20 rounded-lg mb-2 flex items-center justify-center text-white text-xl font-extrabold tracking-wide select-none"
                      style={{ background: `linear-gradient(135deg, hsl(${hueFromString(product.id)} 65% 55%) 0%, hsl(${hueFromString(product.id)} 70% 40%) 100%)` }}
                    >
                      {initials(product.name)}
                    </div>
                    <div className="text-[12px] font-semibold text-vyapara-text leading-tight line-clamp-2 min-h-[2em]">{product.name}</div>
                    <div className="mt-1 flex items-end justify-between gap-1">
                      <div className="text-[13px] font-extrabold text-vyapara-navy">{idr(product.price)}</div>
                      <span className="text-[9px] uppercase font-bold text-white bg-vyapara-blue group-hover:bg-vyapara-navy rounded-full w-5 h-5 flex items-center justify-center transition-colors">+</span>
                    </div>
                    <div className="text-[9px] text-vyapara-secondary mt-0.5">{typeof product.stock === 'number' ? `Stok: ${product.stock}` : product.sku ?? product.barcode ?? '-'}</div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-full py-10 text-center text-vyapara-secondary text-sm">Produk tidak ditemukan</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==== RIGHT: order panel ==== */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-vyapara-border shadow-sm overflow-hidden flex flex-col h-full">
            {/* header */}
            <div className="px-4 py-3 border-b border-vyapara-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-vyapara-navy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6L5.2 3H3" /><circle cx="10" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></svg>
                <h2 className="font-extrabold text-vyapara-navy">Keranjang Pesanan</h2>
                {cart.length > 0 && <span className="text-[10px] font-bold text-vyapara-navy bg-vyapara-light-blue border border-vyapara-blue rounded-full px-2 py-0.5">{cartQty} item</span>}
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Dalam Proses</span>
            </div>

            {/* table */}
            <div className="overflow-y-auto max-h-[300px] p-3 flex-1">
              {cart.length === 0 ? (
                <div className="text-center text-vyapara-secondary py-10 text-sm">Keranjang kosong</div>
              ) : (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-[9px] uppercase tracking-wider text-vyapara-secondary">
                      <th className="pb-2 pr-2">Item</th>
                      <th className="pb-2 px-1 text-center">Qty</th>
                      <th className="pb-2 px-1 text-right">Harga</th>
                      <th className="pb-2 pl-2 text-right">Subtotal</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vyapara-border">
                    {cart.map((item) => (
                      <tr key={item.productId} className="align-top">
                        <td className="py-1.5 pr-1">
                          <p className="font-semibold text-vyapara-text leading-tight">{item.productName}</p>
                        </td>
                        <td className="py-1.5 px-1">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => changeQuantity(item.productId, -1)} className="w-5 h-5 rounded bg-vyapara-surface hover:bg-vyapara-blue hover:text-white text-xs font-bold flex items-center justify-center">−</button>
                            <span className="w-5 text-center font-semibold">{item.quantity}</span>
                            <button onClick={() => changeQuantity(item.productId, 1)} className="w-5 h-5 rounded bg-vyapara-surface hover:bg-vyapara-blue hover:text-white text-xs font-bold flex items-center justify-center">+</button>
                          </div>
                        </td>
                        <td className="py-1.5 px-1 text-right font-medium text-vyapara-text">{idr(item.price)}</td>
                        <td className="py-1.5 pl-2 text-right font-bold text-vyapara-navy">{idr(item.subtotal)}</td>
                        <td className="py-1.5 pl-1 text-right">
                          <button onClick={() => removeFromCart(item.productId)} title="Hapus item" className="text-vyapara-red hover:bg-red-50 rounded p-1">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v12a2 2 0 002 2h4a2 2 0 002-2V7" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* totals */}
            <div className="px-4 py-3 border-t border-vyapara-border space-y-1.5 text-[12px]">
              <div className="flex justify-between"><span className="text-vyapara-secondary">Subtotal</span><span className="font-medium">{idr(subtotal)}</span></div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-vyapara-secondary whitespace-nowrap">Diskon</span>
                <div className="flex items-center gap-1.5">
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => { setDiscountPct(pct); if (pct === 0) setDiscountManual(''); }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${discountPct === pct && discountManual === '' ? 'bg-vyapara-navy text-white border-vyapara-navy' : 'text-vyapara-text border-vyapara-border hover:border-vyapara-blue'}`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <input
                    type="number"
                    value={discountManual}
                    onChange={(e) => { setDiscountManual(e.target.value); setDiscountPct(0); }}
                    placeholder="Rp"
                    min={0}
                    className="w-20 px-2 py-0.5 text-right text-[11px] border border-vyapara-border rounded outline-none focus:ring-1 focus:ring-vyapara-blue"
                  />
                </div>
              </div>
              {manualDiscount > 0 && (
                <div className="flex justify-between text-emerald-700"><span>Diskon diterapkan</span><span className="font-semibold">− {idr(manualDiscount)}</span></div>
              )}
              {loyaltyRedeemValue > 0 && (
                <div className="flex justify-between text-emerald-700"><span>Diskon poin loyalti</span><span className="font-semibold">− {idr(loyaltyRedeemValue)}</span></div>
              )}
              {taxRateBps > 0 && (
                <div className="flex justify-between"><span className="text-vyapara-secondary">PPN {taxRateBps / 100}%</span><span className="font-medium">+ {idr(taxAmount)}</span></div>
              )}
              <div className="flex justify-between pt-1 border-t border-vyapara-border"><span className="font-extrabold text-vyapara-navy">Total</span><span className="font-extrabold text-2xl text-vyapara-navy">{idr(total)}</span></div>
            </div>

            {/* customer picker + loyalty */}
            <div className="px-4 py-2 border-t border-vyapara-border relative">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-vyapara-secondary mb-1">Pelanggan (opsional)</label>
              {selectedCustomer ? (
                <div className="flex items-center gap-2 bg-vyapara-light-blue border border-vyapara-navy/20 rounded-lg px-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-vyapara-navy truncate">{selectedCustomer.name}</p>
                    <p className="text-[10px] text-vyapara-secondary">{selectedCustomer.code ?? ''} • Piutang {Math.round(selectedCustomer.balance ?? 0).toLocaleString('id-ID')} • Poin {selectedCustomer.loyaltyPoints ?? 0}</p>
                  </div>
                  <button onClick={() => { setSelectedCustomer(null); setUseLoyalty(false); }} className="text-[10px] font-bold text-vyapara-red border border-vyapara-red/30 rounded px-2 py-1 hover:bg-red-50">Hapus</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={customerQuery}
                    onChange={(e) => { setCustomerQuery(e.target.value); setCustomerMenuOpen(true); }}
                    onFocus={() => setCustomerMenuOpen(true)}
                    placeholder="Ketik nama / kode / telepon…"
                    className="w-full px-3 py-1.5 text-xs border border-vyapara-border rounded-lg outline-none focus:ring-2 focus:ring-vyapara-blue"
                  />
                  {customerMenuOpen && filteredCustomers.length > 0 && (
                    <div className="absolute z-20 bg-white border border-vyapara-border rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto w-full">
                      {filteredCustomers.map((c) => (
                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerQuery(''); setCustomerMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-vyapara-surface border-b border-vyapara-border last:border-0">
                          <span className="font-semibold">{c.name}</span>
                          <span className="text-vyapara-secondary ml-2">{c.code ?? ''}{c.phone ? ` • ${c.phone}` : ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedCustomer && loyaltyPoints > 0 && (
                <label className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={useLoyalty} onChange={(e) => setUseLoyalty(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-600" />
                  Pakai {loyaltyPoints} poin (− {loyaltyPoints * loyaltyRedeemAmount}) &nbsp;|&nbsp; 1 poin = Rp {loyaltyRedeemAmount.toLocaleString('id-ID')} • earn 1 poin / Rp {loyaltyEarnAmount.toLocaleString('id-ID')}
                </label>
              )}
            </div>

            {/* payment */}
            <div className="px-4 py-3 border-t border-vyapara-border">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-vyapara-secondary mb-1.5">Metode Pembayaran</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {PAYMENT_METHODS.filter((pm) => pm.value !== 'credit' || selectedCustomer).map((pm) => (
                  <button
                    key={pm.value}
                    onClick={() => setPaymentMethod(pm.value)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${paymentMethod === pm.value ? 'bg-vyapara-navy text-white border-vyapara-navy shadow' : 'bg-vyapara-surface text-vyapara-text border-vyapara-border hover:border-vyapara-blue'}`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
              {paymentMethod === 'cash' && (
                <div className="flex items-center gap-3">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-vyapara-secondary whitespace-nowrap">Jumlah Bayar</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-vyapara-border rounded-lg outline-none focus:ring-2 focus:ring-vyapara-blue text-sm"
                  />
                </div>
              )}
              <p className="mt-1 text-[11px] text-vyapara-secondary">Kembalian: <span className="font-semibold text-vyapara-text">{idr(change)}</span></p>
            </div>

            {/* pay button */}
            <div className="p-4 border-t border-vyapara-border bg-vyapara-surface/60">
              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0 || (paymentMethod === 'cash' && paid < total)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0D47A1] to-[#1976D2] text-white font-bold text-sm tracking-wide shadow-lg hover:shadow-xl hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Memproses…' : (
                  <>
                    Bayar (F10)
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h2" /></svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==== Nota/Struk modal ==== */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReceipt(null)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center gap-3 border-b border-vyapara-border pb-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0D47A1] to-[#1976D2] flex items-center justify-center text-white font-extrabold text-lg">V</div>
              <div>
                <p className="font-extrabold text-vyapara-navy leading-tight">VYAPARA Business Management</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-vyapara-secondary">Contoh Nota / Struk</p>
              </div>
            </div>
            <div className="font-mono text-[12px] space-y-1 mb-4">
              <div className="flex justify-between"><span>No. :</span><span>{receipt.transactionNumber}</span></div>
              <div className="flex justify-between"><span>Kasir:</span><span>{user?.name}</span></div>
              <div className="flex justify-between"><span>Waktu:</span><span>{new Date(receipt.createdAt).toLocaleString('id-ID')}</span></div>
              <div className="border-t border-vyapara-border my-2"></div>
              {receipt.items.map((item: any) => (
                <div key={item.id} className="flex justify-between gap-2 text-[11px]"><span>{item.productName} × {item.quantity}</span><span>{idr(item.subtotal)}</span></div>
              ))}
              <div className="border-t border-vyapara-border my-2"></div>
              <div className="flex justify-between font-extrabold text-[13px]"><span>TOTAL</span><span>{idr(receipt.totalAmount)}</span></div>
              <div className="flex justify-between text-vyapara-secondary text-[11px]"><span>Bayar</span><span>{idr(receipt.paymentAmount)}</span></div>
              <div className="flex justify-between text-vyapara-secondary text-[11px]"><span>Kembali</span><span>{idr(receipt.changeAmount)}</span></div>
            </div>
            {/* barcode-style number */}
            <div className="flex justify-center mb-1">
              <div className="tracking-[0.35em] text-[13px] font-bold text-vyapara-text select-none">{receipt.transactionNumber?.replace(/[^0-9]/g, '').padStart(12, '0') ?? '000000000000'}</div>
            </div>
            <p className="text-center text-[10px] text-vyapara-secondary mb-4">Terima kasih telah berbelanja</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-vyapara-border">
              <button onClick={printReceipt} className="px-5 py-2 border border-vyapara-border rounded-lg text-vyapara-secondary hover:bg-vyapara-surface font-medium text-sm">Cetak Nota</button>
              <button onClick={printInvoice} disabled={invLoading} className="px-5 py-2 border border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50 font-medium text-sm disabled:opacity-60">{invLoading ? 'Mencetak…' : 'Cetak Invoice'}</button>
              <button onClick={printDeliveryOrder} disabled={doLoading} className="px-5 py-2 border border-vyapara-blue text-vyapara-blue rounded-lg hover:bg-vyapara-light-blue font-medium text-sm disabled:opacity-60">{doLoading ? 'Memuat…' : 'Cetak DO'}</button>
              <button onClick={printDeliveryOrderDotMatrix} disabled={doDmLoading} className="px-5 py-2 border border-amber-600 text-amber-800 rounded-lg hover:bg-amber-50 font-medium text-sm disabled:opacity-60">{doDmLoading ? 'Memuat…' : 'Cetak DO (Dot Matrix)'}</button>
              <button onClick={() => setReceipt(null)} className="px-5 py-2 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors text-sm">Selesai</button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Order — hidden until printed */}
      {doDoc && (
        <div id="do-print-root" className="hidden print:block">
          <div className="do-doc">
            <div className="do-head">
              <div className="do-brand">
                <div className="do-logo">V</div>
                <div>
                  <p className="do-store">VYAPARA Business Management</p>
                  <p className="do-tag">DELIVERY ORDER — SURAT JALAN</p>
                </div>
              </div>
              <div className="do-meta">
                <p>No. : <strong>{doDoc.transactionNumber}</strong></p>
                <p>Tanggal : {new Date(doDoc.createdAt).toLocaleString('id-ID')}</p>
                <p>Kasir : {user?.name}</p>
              </div>
            </div>
            <div className="do-cust">
              <p className="do-label">Kepada Yth.</p>
              <p className="do-cust-name">{doDoc.customerName || 'Pelanggan Umum'}</p>
              {doDoc.customerPhone && <p>{doDoc.customerPhone}</p>}
              {doDoc.customerAddress && <p>{doDoc.customerAddress}{doDoc.customerCity ? `, ${doDoc.customerCity}` : ''}</p>}
              {!doDoc.customerName && <p className="do-muted">(Pelanggan umum / walk-in)</p>}
            </div>
            <table className="do-table">
              <thead>
                <tr><th>#</th><th>Produk / Layanan</th><th>Qty</th><th style={{ textAlign: 'right' }}>Harga Satuan</th><th style={{ textAlign: 'right' }}>Subtotal</th></tr>
              </thead>
              <tbody>
                {doDoc.items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>Rp {Number(item.unitPrice).toLocaleString('id-ID')}</td>
                    <td style={{ textAlign: 'right' }}>Rp {Number(item.subtotal).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="do-totals">
              <div className="do-totals-row"><span>Subtotal</span><span>Rp {Number(doDoc.subtotal).toLocaleString('id-ID')}</span></div>
              <div className="do-totals-row do-total"><span>TOTAL</span><span>Rp {Number(doDoc.subtotal).toLocaleString('id-ID')}</span></div>
            </div>
            {doDoc.notes && <div className="do-notes"><strong>Catatan:</strong> {doDoc.notes}</div>}
            <div className="do-foot">
              <p>Barang yang tercantum di atas telah diserahkan dalam kondisi baik.</p>
              <div className="do-sig">
                <div className="do-sig-box">Penerima</div>
                <div className="do-sig-box">Kasir</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
