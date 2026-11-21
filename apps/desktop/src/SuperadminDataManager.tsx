/* src/SuperadminDataManager.tsx — superadmin-only full CRUD over settings and module tables.
   All access is enforced in the main process (superadmin:crud); this is only the UI. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const vyapara = (window as any).vyapara;

type TableInfo = { name: string; label: string; group: string; readOnly: boolean; rowCount: number };
type Column = { name: string; type: string; notNull: boolean; defaultValue: string | null; primaryKey: boolean; writeOnly: boolean };
type Row = Record<string, unknown> & { __rowid: number };

const PAGE = 50;
const inputCls = 'w-full px-3 py-2 text-sm border border-vyapara-border rounded-lg outline-none focus:ring-2 focus:ring-vyapara-blue bg-white';

async function call(input: Record<string, unknown>) {
  const res = await vyapara.superadminCrud({ token: '', ...input });
  if (!res?.ok) throw new Error(res?.error?.message ?? 'Permintaan gagal');
  return res.data;
}

const isNumeric = (c: Column) => /INT|REAL|NUM|FLOA|DOUB/.test(c.type);
const display = (v: unknown) => (v === null || v === undefined ? '∅' : String(v));

const SuperadminDataManager: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [table, setTable] = useState<string>('settings');
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [orderBy, setOrderBy] = useState<string | undefined>();
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);
  const [editing, setEditing] = useState<{ mode: 'create' | 'update'; rowid?: number; values: Record<string, string> } | null>(null);

  const current = tables.find((t) => t.name === table);
  const readable = useMemo(() => columns.filter((c) => !c.writeOnly), [columns]);

  const loadTables = useCallback(async () => {
    try { setTables(await call({ action: 'tables' })); } catch (e: any) { setStatus({ type: 'err', message: e.message }); }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call({ action: 'list', table, search: query || undefined, limit: PAGE, offset, orderBy, orderDir });
      setColumns(data.columns);
      setRows(data.rows);
      setTotal(data.total);
      setSelected(new Set());
    } catch (e: any) {
      setStatus({ type: 'err', message: e.message });
    } finally {
      setLoading(false);
    }
  }, [table, query, offset, orderBy, orderDir]);

  useEffect(() => { void loadTables(); }, [loadTables]);
  useEffect(() => { void loadRows(); }, [loadRows]);

  const pickTable = (name: string) => {
    setTable(name); setOffset(0); setSearch(''); setQuery(''); setOrderBy(undefined); setStatus(null); setEditing(null);
  };

  const sortBy = (col: string) => {
    if (orderBy === col) setOrderDir(orderDir === 'asc' ? 'desc' : 'asc');
    else { setOrderBy(col); setOrderDir('asc'); }
  };

  const openCreate = () => {
    const values: Record<string, string> = {};
    for (const c of columns) values[c.name] = '';
    setEditing({ mode: 'create', values });
  };

  const openEdit = (row: Row) => {
    const values: Record<string, string> = {};
    for (const c of columns) values[c.name] = c.writeOnly ? '' : row[c.name] === null || row[c.name] === undefined ? '' : String(row[c.name]);
    setEditing({ mode: 'update', rowid: row.__rowid, values });
  };

  const save = async () => {
    if (!editing) return;
    const values: Record<string, unknown> = {};
    for (const c of columns) {
      const v = editing.values[c.name] ?? '';
      if (editing.mode === 'create' && v === '' && (c.defaultValue !== null || !c.notNull || c.primaryKey)) continue;
      if (c.writeOnly && v === '') continue;
      values[c.name] = v === '' && !c.notNull ? null : v;
    }
    setLoading(true);
    try {
      if (editing.mode === 'create') await call({ action: 'create', table, values });
      else await call({ action: 'update', table, rowid: editing.rowid, values });
      setStatus({ type: 'ok', message: editing.mode === 'create' ? 'Data ditambahkan.' : 'Data diperbarui.' });
      setEditing(null);
      await Promise.all([loadRows(), loadTables()]);
    } catch (e: any) {
      setStatus({ type: 'err', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (rowids: number[]) => {
    if (rowids.length === 0) return;
    if (!window.confirm(`Hapus permanen ${rowids.length} baris dari "${current?.label ?? table}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setLoading(true);
    try {
      const data = await call({ action: 'delete', table, rowids });
      setStatus({ type: 'ok', message: `${data.deleted} baris dihapus.` });
      await Promise.all([loadRows(), loadTables()]);
    } catch (e: any) {
      setStatus({ type: 'err', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, TableInfo[]>();
    for (const t of tables) map.set(t.group, [...(map.get(t.group) ?? []), t]);
    return [...map.entries()];
  }, [tables]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.__rowid));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.__rowid)));
  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="flex gap-4 text-vyapara-text min-h-[520px]">
      {/* Table list */}
      <aside className="w-56 shrink-0 bg-white border border-vyapara-border rounded-xl p-2 overflow-y-auto max-h-[75vh]">
        {groups.map(([group, items]) => (
          <div key={group} className="mb-3">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-vyapara-secondary">{group}</p>
            {items.map((t) => (
              <button
                key={t.name}
                onClick={() => pickTable(t.name)}
                className={`w-full flex items-center justify-between gap-2 text-left px-2 py-1.5 rounded-md text-xs ${t.name === table ? 'bg-vyapara-blue text-white' : 'hover:bg-vyapara-surface'}`}
              >
                <span className="truncate">{t.label}</span>
                <span className={`text-[10px] font-mono ${t.name === table ? 'text-white/80' : 'text-vyapara-secondary'}`}>{t.rowCount}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* Grid */}
      <section className="flex-1 min-w-0 bg-white border border-vyapara-border rounded-xl p-4 flex flex-col">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="mr-auto">
            <h3 className="font-bold text-vyapara-navy">{current?.label ?? table}</h3>
            <p className="text-[11px] text-vyapara-secondary font-mono">{table} · {total} baris</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setOffset(0); setQuery(search.trim()); }} className="flex gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari di semua kolom…" className={`${inputCls} w-56`} />
            <button type="submit" className="px-3 py-2 text-sm rounded-lg border border-vyapara-border hover:bg-vyapara-surface">Cari</button>
          </form>
          <button onClick={() => void loadRows()} disabled={loading} className="px-3 py-2 text-sm rounded-lg border border-vyapara-border hover:bg-vyapara-surface disabled:opacity-50">Muat Ulang</button>
          {!current?.readOnly && (
            <>
              <button onClick={() => void remove([...selected])} disabled={loading || selected.size === 0} className="px-3 py-2 text-sm rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40">Hapus Terpilih ({selected.size})</button>
              <button onClick={openCreate} disabled={loading || columns.length === 0} className="px-3 py-2 text-sm rounded-lg bg-vyapara-blue text-white font-semibold hover:opacity-90 disabled:opacity-50">+ Tambah</button>
            </>
          )}
        </div>

        {status && (
          <div className={`mb-3 text-sm rounded-lg px-3 py-2 border ${status.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {status.message}
          </div>
        )}

        <div className="flex-1 overflow-auto border border-vyapara-border rounded-lg max-h-[60vh]">
          <table className="min-w-full text-xs">
            <thead className="bg-vyapara-surface sticky top-0">
              <tr>
                <th className="px-2 py-2 w-8"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                {readable.map((c) => (
                  <th key={c.name} onClick={() => sortBy(c.name)} className="px-3 py-2 text-left font-semibold whitespace-nowrap cursor-pointer select-none" title={`${c.type}${c.notNull ? ' NOT NULL' : ''}`}>
                    {c.primaryKey && <span className="text-amber-600 mr-1">🔑</span>}
                    {c.name}{orderBy === c.name ? (orderDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
                <th className="px-3 py-2 text-right sticky right-0 bg-vyapara-surface">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vyapara-border">
              {rows.map((row) => (
                <tr key={row.__rowid} className="hover:bg-vyapara-surface/50">
                  <td className="px-2 py-1.5"><input type="checkbox" checked={selected.has(row.__rowid)} onChange={() => toggle(row.__rowid)} /></td>
                  {readable.map((c) => (
                    <td key={c.name} className={`px-3 py-1.5 whitespace-nowrap max-w-[240px] truncate ${row[c.name] === null ? 'text-vyapara-secondary/60 italic' : ''} ${isNumeric(c) ? 'text-right font-mono' : ''}`} title={display(row[c.name])}>
                      {display(row[c.name])}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right whitespace-nowrap sticky right-0 bg-white">
                    {!current?.readOnly && (
                      <>
                        <button onClick={() => openEdit(row)} className="text-vyapara-blue font-semibold hover:underline mr-3">Ubah</button>
                        <button onClick={() => void remove([row.__rowid])} className="text-red-600 font-semibold hover:underline">Hapus</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={readable.length + 2} className="px-3 py-10 text-center text-vyapara-secondary">{loading ? 'Memuat…' : 'Tidak ada data'}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-vyapara-secondary">
          <span>{total === 0 ? 0 : offset + 1}–{Math.min(offset + PAGE, total)} dari {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset(Math.max(0, offset - PAGE))} disabled={offset === 0 || loading} className="px-3 py-1.5 rounded border border-vyapara-border disabled:opacity-40">‹ Sebelumnya</button>
            <button onClick={() => setOffset(offset + PAGE)} disabled={offset + PAGE >= total || loading} className="px-3 py-1.5 rounded border border-vyapara-border disabled:opacity-40">Berikutnya ›</button>
          </div>
        </div>
      </section>

      {/* Create / edit modal */}
      {editing && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white text-vyapara-text rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-vyapara-border">
              <h3 className="font-bold text-vyapara-navy">{editing.mode === 'create' ? 'Tambah' : 'Ubah'} — {current?.label ?? table}</h3>
              <p className="text-[11px] text-vyapara-secondary">
                {editing.mode === 'create' ? 'Kosongkan kolom ber-default / ID agar diisi otomatis.' : 'Kosongkan kolom kata sandi untuk mempertahankan nilai lama.'}
              </p>
            </div>
            <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
              {columns.map((c) => {
                const value = editing.values[c.name] ?? '';
                const setValue = (v: string) => setEditing({ ...editing, values: { ...editing.values, [c.name]: v } });
                const long = !isNumeric(c) && (value.length > 60 || c.name.includes('description') || c.name.includes('notes') || c.name === 'value');
                return (
                  <div key={c.name} className={long ? 'md:col-span-2' : ''}>
                    <label className="block text-[11px] font-semibold text-vyapara-secondary mb-1">
                      <span className="font-mono">{c.name}</span>
                      {c.notNull && c.defaultValue === null && !c.primaryKey && <span className="text-red-500"> *</span>}
                      <span className="ml-1 text-[10px] opacity-70">{c.type}{c.defaultValue !== null ? ` = ${c.defaultValue}` : ''}{c.primaryKey ? ' · PK' : ''}</span>
                    </label>
                    {c.writeOnly ? (
                      <input type="password" value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} placeholder={editing.mode === 'update' ? '(tidak diubah)' : 'min. 8 karakter'} autoComplete="new-password" />
                    ) : long ? (
                      <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} className={`${inputCls} font-mono`} />
                    ) : (
                      <input type={isNumeric(c) ? 'number' : 'text'} step="any" value={value} onChange={(e) => setValue(e.target.value)} className={`${inputCls} ${isNumeric(c) ? 'font-mono' : ''}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-4 border-t border-vyapara-border flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm rounded-lg border border-vyapara-border hover:bg-vyapara-surface">Batal</button>
              <button onClick={() => void save()} disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-vyapara-blue text-white font-semibold disabled:opacity-50">{loading ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminDataManager;
