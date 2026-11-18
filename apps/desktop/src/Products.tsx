/* src/Products.tsx */
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import useAuth from './authStore';
import JsBarcode from 'jsbarcode';

const vyapara = (window as any).vyapara;
const idr = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const BarcodeSvg: React.FC<{ value: string }> = ({ value }) => {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, { format: 'CODE128', width: 1.6, height: 34, fontSize: 9, margin: 1, displayValue: true });
      } catch {
        if (ref.current) ref.current.innerHTML = '';
      }
    }
  }, [value]);
  return <svg ref={ref} />;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unitId: string | null;
  unitName: string | null;
  barcode: string | null;
  sku: string | null;
  price: number;
  cost: number | null;
  stock: number;
  wholesalePrice: number;
  wholesaleMinQty: number;
};

const EMPTY_FORM = {
  name: '',
  description: '',
  categoryId: '',
  unitId: '',
  barcode: '',
  sku: '',
  price: '',
  cost: '',
  stock: '',
  wholesalePrice: '',
  wholesaleMinQty: '',
};

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c, u] = await Promise.all([
        vyapara?.getProducts?.({ token: '', includeInactive: false }),
        vyapara?.getCategories?.(),
        vyapara?.getUnits?.(),
      ]);
      if (p?.ok) setProducts(Array.isArray(p.data) ? p.data : []);
      else setError(p?.error?.message ?? 'Gagal memuat produk');
      if (c?.ok) setCategories(Array.isArray(c.data) ? c.data : []);
      if (u?.ok) setUnits(Array.isArray(u.data) ? u.data : []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(
    () => products.filter((p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode || '').toLowerCase().includes(search.toLowerCase()),
    ),
    [products, search],
  );

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? '',
      categoryId: p.categoryId ?? '',
      unitId: p.unitId ?? '',
      barcode: p.barcode ?? '',
      sku: p.sku ?? '',
      price: String(p.price),
      cost: p.cost != null ? String(p.cost) : '',
      stock: String(p.stock),
      wholesalePrice: String(p.wholesalePrice ?? 0),
      wholesaleMinQty: String(p.wholesaleMinQty ?? 10),
    });
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const base = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId || undefined,
      unitId: form.unitId || undefined,
      barcode: form.barcode.trim() || undefined,
      sku: form.sku.trim() || undefined,
      price: Math.max(0, Math.round(Number(form.price) || 0)),
      cost: form.cost ? Math.max(0, Math.round(Number(form.cost))) : undefined,
      stock: Math.max(0, Math.round(Number(form.stock) || 0)),
      wholesalePrice: Math.max(0, Math.round(Number(form.wholesalePrice) || 0)),
      wholesaleMinQty: Math.max(1, Math.round(Number(form.wholesaleMinQty) || 10)),
    };
    try {
      if (editing) {
        const res = await vyapara.updateProduct({ token: '', id: editing.id, ...base });
        if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal menyimpan');
      } else {
        const res = await vyapara.createProduct({ token: '', ...base });
        if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal menyimpan');
      }
      setFormOpen(false);
      await load();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan produk');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (p: Product) => {
    if (!window.confirm(`Nonaktifkan "${p.name}"? Produk tidak akan tampil di POS.`)) return;
    try {
      const res = await vyapara.deactivateProduct({ token: '', id: p.id });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal');
      await load();
    } catch (err: any) {
      setError(err.message || 'Gagal menonaktifkan produk');
    }
  };

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelSelected, setLabelSelected] = useState<Record<string, boolean>>({});
  const [labelCopies, setLabelCopies] = useState('1');

  const openLabelPrint = () => {
    const init: Record<string, boolean> = {};
    products.forEach((p) => { if (p.barcode) init[p.id] = true; });
    setLabelSelected(init);
    setLabelOpen(true);
  };

  const printLabels = () => {
    window.setTimeout(() => window.print(), 150);
  };

  const selectedProducts = products.filter((p) => labelSelected[p.id] && p.barcode);
  const labelCount = selectedProducts.length * (Math.max(1, parseInt(labelCopies, 10) || 1));

  const downloadTemplateCsv = async () => {
    const template = [
      'name,sku,barcode,category,unit,price,cost,stock',
      '# CONTOH BARIS — HAPUS SEBELUM IMPORT (baris dengan awalan # dilewati)',
      '# Kertas HVS A4 80gsm,SKU-A4-80,8991234567890,Kertas,Rim,55000,42000,100',
      '# Pulpen Standard AE7,SKU-AE7-01,8991234567891,ATK,Pcs,3500,1800,250',
      '# A4,sku-example,barcode-example,category-example,unit-example,price-example,cost-example,stock-example',
    ].join('\r\n');
    try {
      const res = await vyapara.saveCsv({ token: '', filename: 'template-produk.csv', content: template });
      if (res?.ok && res.data?.saved) {
        setImportStatus('Template tersimpan. Isi dengan data Anda lalu klik Import CSV.');
      }
    } catch (err: any) {
      setImportStatus(err?.message || 'Gagal menyimpan template');
    }
  };

  const importCsv = async () => {
    setImportStatus(null);
    try {
      const res = await vyapara.importProductsCsv({ token: '' });
      if (res?.ok && res.data?.canceled) return;
      if (!res?.ok) {
        setImportStatus(res?.error?.message ?? 'Import gagal');
        return;
      }
      const d = res.data;
      setImportStatus(`Import selesai: ${d.imported} produk baru, ${d.skipped} dilewati (duplikat), ${d.errors?.length ?? 0} error.`);
      await load();
    } catch (err: any) {
      setImportStatus(err.message || 'Import gagal');
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-vyapara-border rounded-lg outline-none focus:ring-2 focus:ring-vyapara-blue';
  const labelCls = 'block text-xs font-semibold text-vyapara-secondary mb-1';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-vyapara-navy">Produk</h1>
          <p className="text-xs text-vyapara-secondary">Kelola katalog, harga, stok</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadTemplateCsv}
            className="inline-flex items-center gap-1.5 text-xs font-semibold border border-vyapara-border text-vyapara-secondary rounded-full px-4 py-2 hover:bg-vyapara-surface transition-colors"
            title="Unduh template CSV produk"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Template CSV
          </button>
          <button
            onClick={openLabelPrint}
            className="inline-flex items-center gap-1.5 text-xs font-semibold border border-emerald-600 text-emerald-700 rounded-full px-4 py-2 hover:bg-emerald-50 transition-colors"
            title="Cetak label barcode untuk produk terpilih"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="1" /><path d="M7 10h1M10 10h1M13 10h1M16 10h1M7 14h8" /></svg>
            Cetak Label
          </button>
          <button
            onClick={importCsv}
            className="inline-flex items-center gap-1.5 text-xs font-semibold border border-vyapara-border text-vyapara-navy rounded-full px-4 py-2 hover:bg-vyapara-surface transition-colors"
          >
            Import CSV
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-vyapara-navy text-white rounded-full px-4 py-2 hover:bg-vyapara-blue transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Tambah Produk
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}
      {importStatus && <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">{importStatus}</div>}

      <div className="bg-white rounded-2xl border border-vyapara-border shadow-sm">
        <div className="p-4 border-b border-vyapara-border flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vyapara-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / SKU / barcode…"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-vyapara-border rounded-xl outline-none focus:ring-2 focus:ring-vyapara-blue"
            />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-vyapara-secondary">{filtered.length} produk</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-vyapara-secondary text-sm">Memuat produk…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-vyapara-secondary text-sm">Belum ada produk. Klik "Tambah Produk" untuk membuat.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-vyapara-secondary bg-vyapara-surface">
                  <th className="px-4 py-2">Produk</th>
                  <th className="px-4 py-2">Kode</th>
                  <th className="px-4 py-2">Kategori</th>
                  <th className="px-4 py-2 text-right">Harga</th>
                  <th className="px-4 py-2 text-right">Stok</th>
                  <th className="px-4 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vyapara-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-vyapara-surface/60">
                    <td className="px-4 py-2">
                      <div className="font-semibold text-vyapara-navy">{p.name}</div>
                      {p.description && <p className="text-[10px] text-vyapara-secondary truncate max-w-[220px]">{p.description}</p>}
                    </td>
                    <td className="px-4 py-2 text-vyapara-secondary">
                      <div>SKU: {p.sku ?? '—'}</div>
                      <div>BC: {p.barcode ?? '—'}</div>
                    </td>
                    <td className="px-4 py-2 text-vyapara-secondary">{p.categoryName ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-semibold text-vyapara-navy">{idr(p.price)}{p.wholesalePrice > 0 && <div className="text-[10px] text-emerald-700 font-bold">Grosir ≥{p.wholesaleMinQty}: {idr(p.wholesalePrice)}</div>}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.stock <= 5 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                        {p.stock} {p.unitName ?? 'pcs'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => openEdit(p)} className="text-vyapara-blue hover:underline text-xs font-semibold mr-3">Edit</button>
                      <button onClick={() => deactivate(p)} className="text-vyapara-red hover:underline text-xs font-semibold">Nonaktif</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {labelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setLabelOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-vyapara-navy">Cetak Label Barcode</h3>
              <button onClick={() => setLabelOpen(false)} className="p-2 text-vyapara-secondary hover:text-vyapara-navy"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
            </div>
            <p className="text-xs text-vyapara-secondary mb-3">Produk tanpa barcode tidak bisa dicetak. Atur jumlah salinan, lalu cetak ke printer (pilih langsung tipe "Label" atau gunakan kertas stiker).</p>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs font-semibold text-vyapara-secondary" htmlFor="label-copies">Salinan per label</label>
              <input id="label-copies" type="number" min={1} max={50} value={labelCopies} onChange={(e) => setLabelCopies(e.target.value)} onBlur={() => setLabelCopies(String(Math.max(1, parseInt(labelCopies, 10) || 1)))} className="w-20 px-3 py-1.5 text-sm border border-vyapara-border rounded outline-none" />
              <span className="text-xs text-vyapara-secondary ml-auto">{labelCount} label akan dicetak</span>
            </div>
            <div className="border border-vyapara-border rounded-lg max-h-64 overflow-y-auto divide-y divide-vyapara-border">
              {products.map((p) => {
                const disabled = !p.barcode;
                return (
                  <label key={p.id} className={`flex items-center gap-3 px-3 py-2 text-sm ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-vyapara-surface cursor-pointer'}`}>
                    <input type="checkbox" disabled={disabled} checked={!!labelSelected[p.id] && !disabled} onChange={(e) => setLabelSelected({ ...labelSelected, [p.id]: e.target.checked })} className="w-4 h-4 accent-vyapara-blue" />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="font-mono text-[10px] text-vyapara-secondary">{p.barcode ?? 'NO BARCODE'}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setLabelOpen(false)} className="px-4 py-2 text-sm border border-vyapara-border rounded-lg hover:bg-vyapara-surface font-medium">Batal</button>
              <button onClick={printLabels} className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Cetak Sekarang</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden label sheet — only visible when printing */}
      {labelOpen && selectedProducts.length > 0 && (
        <div id="label-print-root" className="hidden print:block">
          {selectedProducts.flatMap((p) => Array.from({ length: Math.max(1, parseInt(labelCopies, 10) || 1) }).map((_, i) => (
            <div key={`${p.id}-${i}`} className="label-cell">
              <div className="label-name">{p.name}</div>
              <BarcodeSvg value={String(p.barcode)} />
              <div className="label-price">Rp {Number(p.price).toLocaleString('id-ID')}</div>
            </div>
          )))}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setFormOpen(false)} />
          <form onSubmit={submit} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <h2 className="text-lg font-bold text-vyapara-navy">{editing ? 'Edit Produk' : 'Tambah Produk'}</h2>
            <div>
              <label className={labelCls} htmlFor="f-name">Nama Produk *</label>
              <input id="f-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="f-desc">Deskripsi</label>
              <input id="f-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="f-sku">SKU</label>
                <input id="f-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="f-barcode">Barcode</label>
                <input id="f-barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="f-cat">Kategori</label>
                <select id="f-cat" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputCls}>
                  <option value="">— Tanpa kategori —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="f-unit">Satuan</label>
                <select id="f-unit" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} className={inputCls}>
                  <option value="">— Pilih satuan —</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls} htmlFor="f-price">Harga (Rp) *</label>
                <input id="f-price" required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="f-cost">HPP (Rp)</label>
                <input id="f-cost" type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="f-stock">Stok *</label>
                <input id="f-stock" required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-vyapara-border pt-3">
              <div>
                <label className={labelCls} htmlFor="f-wholesale">Harga Grosir (Rp)</label>
                <input id="f-wholesale" type="number" min="0" value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })} placeholder="0 = tidak aktif" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="f-wholesale-min">Min. Qty Grosir</label>
                <input id="f-wholesale-min" type="number" min="1" value={form.wholesaleMinQty} onChange={(e) => setForm({ ...form, wholesaleMinQty: e.target.value })} placeholder="10" className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm border border-vyapara-border rounded-lg hover:bg-vyapara-surface font-medium">Batal</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold bg-vyapara-navy text-white rounded-lg hover:bg-vyapara-blue disabled:opacity-60">{saving ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
