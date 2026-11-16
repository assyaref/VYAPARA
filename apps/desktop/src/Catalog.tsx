/* src/Catalog.tsx */
import React, { useEffect, useState, useCallback } from 'react';
import useAuth from './authStore';

const vyapara = (window as any).vyapara;

type Category = { id: string; name: string; description: string | null; productCount: number };
type Unit = { id: string; name: string; symbol: string | null; productCount: number };

const inputCls = 'w-full px-3 py-2 text-sm border border-vyapara-border rounded-lg outline-none focus:ring-2 focus:ring-vyapara-blue';
const labelCls = 'block text-xs font-semibold text-vyapara-secondary mb-1';

const CatalogPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'kategori' | 'satuan'>('kategori');
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // create forms state
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [unitName, setUnitName] = useState('');
  const [unitSymbol, setUnitSymbol] = useState('');
  const [saving, setSaving] = useState(false);

  // inline edit state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editUnitName, setEditUnitName] = useState('');
  const [editUnitSymbol, setEditUnitSymbol] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, u] = await Promise.all([vyapara?.getCategories?.(), vyapara?.getUnits?.()]);
      if (c?.ok) setCategories(Array.isArray(c.data) ? c.data : []);
      if (u?.ok) setUnits(Array.isArray(u.data) ? u.data : []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat katalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) { setError('Nama kategori wajib diisi'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await vyapara?.createCategory?.({ token: '', name: catName.trim(), description: catDesc.trim() || null });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal membuat kategori');
      setCatName(''); setCatDesc('');
      await load();
    } catch (err: any) { setError(err.message || 'Gagal membuat kategori'); } finally { setSaving(false); }
  };

  const renameCategory = async (id: string) => {
    if (!editCatName.trim()) { setError('Nama tidak boleh kosong'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await vyapara?.updateCategory?.({ token: '', id, name: editCatName.trim(), description: editCatDesc.trim() || null });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal mengubah');
      setEditingCatId(null);
      await load();
    } catch (err: any) { setError(err.message || 'Gagal mengubah'); } finally { setSaving(false); }
  };

  const deleteCategory = async (c: Category) => {
    if (!window.confirm(`Hapus kategori "${c.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await vyapara?.deleteCategory?.({ token: '', id: c.id });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal menghapus');
      await load();
    } catch (err: any) { setError(err.message || 'Gagal menghapus'); } finally { setSaving(false); }
  };

  const createUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) { setError('Nama satuan wajib diisi'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await vyapara?.createUnit?.({ token: '', name: unitName.trim(), symbol: unitSymbol.trim() || null });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal membuat satuan');
      setUnitName(''); setUnitSymbol('');
      await load();
    } catch (err: any) { setError(err.message || 'Gagal membuat satuan'); } finally { setSaving(false); }
  };

  const renameUnit = async (id: string) => {
    if (!editUnitName.trim()) { setError('Nama tidak boleh kosong'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await vyapara?.updateUnit?.({ token: '', id, name: editUnitName.trim(), symbol: editUnitSymbol.trim() || null });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal mengubah');
      setEditingUnitId(null);
      await load();
    } catch (err: any) { setError(err.message || 'Gagal mengubah'); } finally { setSaving(false); }
  };

  const deleteUnit = async (u: Unit) => {
    if (!window.confirm(`Hapus satuan "${u.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await vyapara?.deleteUnit?.({ token: '', id: u.id });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal menghapus');
      await load();
    } catch (err: any) { setError(err.message || 'Gagal menghapus'); } finally { setSaving(false); }
  };

  const tabCls = (active: boolean) =>
    `px-4 py-2 text-xs font-semibold rounded-full transition-colors ${active ? 'bg-vyapara-navy text-white' : 'bg-vyapara-surface text-vyapara-secondary hover:bg-vyapara-light-blue'}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-vyapara-navy">Katalog</h1>
        <p className="text-xs text-vyapara-secondary">Kelola kategori produk dan satuan pengukuran</p>
      </div>

      {error && <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

      <div className="flex gap-2">
        <button className={tabCls(tab === 'kategori')} onClick={() => setTab('kategori')}>Kategori</button>
        <button className={tabCls(tab === 'satuan')} onClick={() => setTab('satuan')}>Satuan</button>
      </div>

      {tab === 'kategori' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <form onSubmit={createCategory} className="bg-white rounded-2xl border border-vyapara-border shadow-sm p-5 h-fit space-y-3">
            <h2 className="font-bold text-vyapara-navy">Tambah Kategori</h2>
            <div>
              <label className={labelCls} htmlFor="cat-name">Nama *</label>
              <input id="cat-name" required value={catName} onChange={(e) => setCatName(e.target.value)} className={inputCls} placeholder="mis. ATK / Kertas / Percetakan" />
            </div>
            <div>
              <label className={labelCls} htmlFor="cat-desc">Deskripsi</label>
              <input id="cat-desc" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className={inputCls} placeholder="opsional" />
            </div>
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg bg-vyapara-navy text-white text-sm font-semibold hover:bg-vyapara-blue disabled:opacity-60">{saving ? 'Menyimpan…' : 'Tambah'}</button>
            <p className="text-[10px] text-vyapara-secondary leading-snug">Hapus kategori hanya bisa jika tidak ada produk yang memakainya. Ubah nama? (klik Edit pada baris)</p>
          </form>

          <div className="bg-white rounded-2xl border border-vyapara-border shadow-sm xl:col-span-2">
            <div className="p-4 border-b border-vyapara-border flex items-center justify-between">
              <h2 className="font-bold text-vyapara-navy">Daftar Kategori</h2>
              <span className="text-[10px] uppercase tracking-wider text-vyapara-secondary">{categories.length} item</span>
            </div>
            {loading ? <div className="p-8 text-center text-vyapara-secondary text-sm">Memuat…</div> : categories.length === 0 ? <div className="p-8 text-center text-vyapara-secondary text-sm">Belum ada kategori.</div> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[10px] uppercase tracking-wider text-vyapara-secondary bg-vyapara-surface"><th className="px-4 py-2">Nama</th><th className="px-4 py-2">Deskripsi</th><th className="px-4 py-2 text-right">Produk</th><th className="px-4 py-2 text-right">Aksi</th></tr></thead>
                <tbody className="divide-y divide-vyapara-border">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-vyapara-surface/60">
                      {editingCatId === c.id ? (
                        <>
                          <td className="px-4 py-2"><input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} className={inputCls} autoFocus /></td>
                          <td className="px-4 py-2"><input value={editCatDesc} onChange={(e) => setEditCatDesc(e.target.value)} className={inputCls} /></td>
                          <td className="px-4 py-2 text-right text-vyapara-secondary">{c.productCount}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => renameCategory(c.id)} className="text-xs font-semibold text-emerald-700 mr-2">Simpan</button>
                            <button onClick={() => setEditingCatId(null)} className="text-xs font-semibold text-vyapara-secondary">Batal</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2 font-semibold text-vyapara-navy">{c.name}</td>
                          <td className="px-4 py-2 text-vyapara-secondary">{c.description ?? '—'}</td>
                          <td className="px-4 py-2 text-right text-vyapara-secondary">{c.productCount}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => { setEditingCatId(c.id); setEditCatName(c.name); setEditCatDesc(c.description ?? ''); }} className="text-xs font-semibold text-vyapara-blue hover:underline mr-3">Edit</button>
                            <button onClick={() => deleteCategory(c)} disabled={c.productCount > 0} title={c.productCount > 0 ? 'Kategori masih dipakai produk' : 'Hapus'} className="text-xs font-semibold text-vyapara-red hover:underline disabled:opacity-40 disabled:no-underline">Hapus</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'satuan' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <form onSubmit={createUnit} className="bg-white rounded-2xl border border-vyapara-border shadow-sm p-5 h-fit space-y-3">
            <h2 className="font-bold text-vyapara-navy">Tambah Satuan</h2>
            <div>
              <label className={labelCls} htmlFor="unit-name">Nama *</label>
              <input id="unit-name" required value={unitName} onChange={(e) => setUnitName(e.target.value)} className={inputCls} placeholder="mis. Pcs / Rim / Pack" />
            </div>
            <div>
              <label className={labelCls} htmlFor="unit-symbol">Simbol</label>
              <input id="unit-symbol" value={unitSymbol} onChange={(e) => setUnitSymbol(e.target.value)} className={inputCls} placeholder="mis. pcs / rim" />
            </div>
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg bg-vyapara-navy text-white text-sm font-semibold hover:bg-vyapara-blue disabled:opacity-60">{saving ? 'Menyimpan…' : 'Tambah'}</button>
            <p className="text-[10px] text-vyapara-secondary leading-snug">Satuan yang sudah dipakai produk tidak bisa dihapus — ubah nama (Edit) atau buat satuan baru.</p>
          </form>

          <div className="bg-white rounded-2xl border border-vyapara-border shadow-sm xl:col-span-2">
            <div className="p-4 border-b border-vyapara-border flex items-center justify-between">
              <h2 className="font-bold text-vyapara-navy">Daftar Satuan</h2>
              <span className="text-[10px] uppercase tracking-wider text-vyapara-secondary">{units.length} item</span>
            </div>
            {loading ? <div className="p-8 text-center text-vyapara-secondary text-sm">Memuat…</div> : units.length === 0 ? <div className="p-8 text-center text-vyapara-secondary text-sm">Belum ada satuan.</div> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[10px] uppercase tracking-wider text-vyapara-secondary bg-vyapara-surface"><th className="px-4 py-2">Nama</th><th className="px-4 py-2">Simbol</th><th className="px-4 py-2 text-right">Produk</th><th className="px-4 py-2 text-right">Aksi</th></tr></thead>
                <tbody className="divide-y divide-vyapara-border">
                  {units.map((u) => (
                    <tr key={u.id} className="hover:bg-vyapara-surface/60">
                      {editingUnitId === u.id ? (
                        <>
                          <td className="px-4 py-2"><input value={editUnitName} onChange={(e) => setEditUnitName(e.target.value)} className={inputCls} autoFocus /></td>
                          <td className="px-4 py-2"><input value={editUnitSymbol} onChange={(e) => setEditUnitSymbol(e.target.value)} className={inputCls} /></td>
                          <td className="px-4 py-2 text-right text-vyapara-secondary">{u.productCount}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => renameUnit(u.id)} className="text-xs font-semibold text-emerald-700 mr-2">Simpan</button>
                            <button onClick={() => setEditingUnitId(null)} className="text-xs font-semibold text-vyapara-secondary">Batal</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2 font-semibold text-vyapara-navy">{u.name}</td>
                          <td className="px-4 py-2 text-vyapara-secondary">{u.symbol ?? '—'}</td>
                          <td className="px-4 py-2 text-right text-vyapara-secondary">{u.productCount}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => { setEditingUnitId(u.id); setEditUnitName(u.name); setEditUnitSymbol(u.symbol ?? ''); }} className="text-xs font-semibold text-vyapara-blue hover:underline mr-3">Edit</button>
                            <button onClick={() => deleteUnit(u)} disabled={u.productCount > 0} title={u.productCount > 0 ? 'Satuan masih dipakai produk' : 'Hapus'} className="text-xs font-semibold text-vyapara-red hover:underline disabled:opacity-40 disabled:no-underline">Hapus</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogPage;
