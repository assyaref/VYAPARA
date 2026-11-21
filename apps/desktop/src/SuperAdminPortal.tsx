/* src/SuperAdminPortal.tsx — hidden superadmin portal (F7).
   Full-screen overlay with its own login; only role === 'superadmin' can proceed. */
import React, { useState, useEffect, useCallback } from 'react';
import useAuth from './authStore';
import { loadBranding, getBranding, logoSrc, FONT_OPTIONS } from './branding';
import SuperadminDataManager from './SuperadminDataManager';

const vyapara = (window as any).vyapara;
const inputCls = 'w-full px-3 py-2 text-sm border border-vyapara-border rounded-lg outline-none focus:ring-2 focus:ring-vyapara-blue';
const labelCls = 'block text-[11px] font-semibold text-vyapara-secondary mb-1 uppercase tracking-wide';

const SuperAdminPortal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const auth = useAuth();
  const userRole = (auth.user as any)?.role ?? '';
  const isSuper = userRole === 'superadmin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<'branding' | 'data' | 'danger'>('branding');
  const [branding, setBrandingState] = useState(getBranding());
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  const [appName, setAppName] = useState(branding.appName);
  const [tagline, setTagline] = useState(branding.tagline);
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [sidebarColor, setSidebarColor] = useState(branding.sidebarColor);
  const [accentColor, setAccentColor] = useState(branding.accentColor);
  const [fontFamily, setFontFamily] = useState(branding.fontFamily);
  const [receiptFooter, setReceiptFooter] = useState(branding.receiptFooter);

  useEffect(() => {
    setBrandingState(getBranding());
    setAppName(branding.appName);
    setTagline(branding.tagline);
    setPrimaryColor(branding.primaryColor);
    setSidebarColor(branding.sidebarColor);
    setAccentColor(branding.accentColor);
    setFontFamily(branding.fontFamily);
    setReceiptFooter(branding.receiptFooter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setLoginError(null);
    try {
      const ok = await auth.login(email.trim(), password);
      if (!ok) setLoginError('Email atau kata sandi salah');
    } catch (err: any) {
      setLoginError(err.message || 'Gagal masuk');
    } finally {
      setBusy(false);
    }
  };

  const saveBranding = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await vyapara.setBranding({
        token: '',
        patch: { appName, tagline, primaryColor, sidebarColor, accentColor, fontFamily, receiptFooter },
      });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal menyimpan branding');
      await loadBranding();
      setBrandingState(getBranding());
      setStatus({ type: 'ok', message: 'Branding tersimpan dan diterapkan.' });
    } catch (err: any) {
      setStatus({ type: 'err', message: err.message || 'Gagal menyimpan' });
    } finally {
      setBusy(false);
    }
  };

  const pickLogo = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await vyapara.pickLogo({ token: '' });
      if (res?.ok && res.data?.canceled) { setStatus({ type: 'ok', message: 'Pemilihan logo dibatalkan.' }); return; }
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal memilih logo');
      await loadBranding();
      setBrandingState(getBranding());
      setStatus({ type: 'ok', message: 'Logo diganti.' });
    } catch (err: any) {
      setStatus({ type: 'err', message: err.message || 'Gagal mengganti logo' });
    } finally {
      setBusy(false);
    }
  };

  const pickIcon = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await vyapara.pickIcon({ token: '' });
      if (res?.ok && res.data?.canceled) { setStatus({ type: 'ok', message: 'Pemilihan ikon dibatalkan.' }); return; }
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal memilih ikon');
      await loadBranding();
      setBrandingState(getBranding());
      setStatus({ type: 'ok', message: 'Ikon jendela diganti.' });
    } catch (err: any) {
      setStatus({ type: 'err', message: err.message || 'Gagal mengganti ikon' });
    } finally {
      setBusy(false);
    }
  };

  const resetIcon = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await vyapara.resetIcon({ token: '' });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal mereset ikon');
      await loadBranding();
      setBrandingState(getBranding());
      setStatus({ type: 'ok', message: 'Ikon dikembalikan ke bawaan.' });
    } catch (err: any) {
      setStatus({ type: 'err', message: err.message || 'Gagal mereset ikon' });
    } finally {
      setBusy(false);
    }
  };

  const resetLogo = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await vyapara.resetLogo({ token: '' });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal mereset logo');
      await loadBranding();
      setBrandingState(getBranding());
      setStatus({ type: 'ok', message: 'Logo dikembalikan ke bawaan.' });
    } catch (err: any) {
      setStatus({ type: 'err', message: err.message || 'Gagal mereset logo' });
    } finally {
      setBusy(false);
    }
  };

  const wipeSessions = async () => {
    if (!window.confirm('Hapus SEMUA sesi aktif semua pengguna? Mereka harus login ulang.')) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await vyapara.dangerWipeSessions({ token: '' });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal');
      setStatus({ type: 'ok', message: `${res.data?.deleted ?? 0} sesi dihapus.` });
    } catch (err: any) {
      setStatus({ type: 'err', message: err.message || 'Gagal' });
    } finally {
      setBusy(false);
    }
  };

  const wipeAdminUsers = async () => {
    if (!window.confirm('Hapus SEMUA akun admin/kasir/viewer (kecuali superadmin)? Tindakan ini tidak bisa dibatalkan.')) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await vyapara.dangerWipeAdminUsers({ token: '' });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal');
      setStatus({ type: 'ok', message: `${res.data?.deleted ?? 0} akun dihapus.` });
    } catch (err: any) {
      setStatus({ type: 'err', message: err.message || 'Gagal' });
    } finally {
      setBusy(false);
    }
  };

  const [factoryConfirm, setFactoryConfirm] = useState('');
  const factoryReset = async () => {
    if (factoryConfirm !== 'HAPUS-SEMUA-DATA') {
      setStatus({ type: 'err', message: 'Ketik HAPUS-SEMUA-DATA persis di kolom konfirmasi.' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await vyapara.dangerFactoryReset({ token: '', confirm: factoryConfirm });
      if (!res?.ok) throw new Error(res?.error?.message ?? 'Gagal');
      setStatus({ type: 'ok', message: 'Reset pabrik selesai. Aplikasi akan memuat ulang.' });
      window.setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setStatus({ type: 'err', message: err.message || 'Gagal' });
    } finally {
      setBusy(false);
    }
  };

  const portalBg = 'radial-gradient(1200px 700px at 15% 10%, rgba(255,143,0,.18), transparent 60%), linear-gradient(160deg,#050E1E 0%,#0B2447 55%,#123E73 100%)';
  const logo = logoSrc(branding);

  if (!isSuper) {
    return (
      <div className="fixed inset-0 z-[100]" style={{ background: portalBg }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white text-sm font-semibold border border-white/20 rounded-lg px-4 py-2">Tutup (F7)</button>
        <div className="min-h-full flex items-center justify-center p-6">
          <form onSubmit={login} className="w-full max-w-sm bg-white/[.06] backdrop-blur border border-white/15 rounded-2xl p-8 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8F00] to-[#E65100] grid place-items-center font-black text-xl shadow-lg">S</div>
              <div>
                <h1 className="font-extrabold tracking-wide">SUPERADMIN</h1>
                <p className="text-[10px] uppercase tracking-[.2em] text-white/45">Portal Rahasia</p>
              </div>
            </div>
            {loginError && <div className="mb-3 text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">{loginError}</div>}
            <label className="block text-[10px] font-bold uppercase tracking-widest text-orange-300/80 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className="w-full px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-orange-400 mb-3" placeholder="superadmin@assyaref.dev" />
            <label className="block text-[10px] font-bold uppercase tracking-widest text-orange-300/80 mb-1">Kata Sandi</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-orange-400 mb-5" placeholder="••••••••••" />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl font-extrabold uppercase tracking-widest text-sm text-[#1B1000] bg-gradient-to-r from-[#FFD54F] to-[#FF8F00] hover:brightness-110 disabled:opacity-60 shadow-lg">{busy ? 'Memverifikasi…' : 'Buka Portal'}</button>
            <p className="text-[9px] text-white/30 text-center mt-5 uppercase tracking-widest">Akses terbatas — bukan untuk pengguna umum</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100]" style={{ background: portalBg }}>
      <div className={`${tab === 'data' ? 'max-w-[1400px]' : 'max-w-5xl'} mx-auto h-full flex flex-col p-6 text-white`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF8F00] to-[#E65100] grid place-items-center font-black text-lg">S</div>
            <div>
              <h1 className="font-extrabold tracking-wide leading-tight">SUPERADMIN PORTAL</h1>
              <p className="text-[10px] uppercase tracking-[.2em] text-orange-300/80">{auth.user?.name} · {userRole}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-sm font-semibold border border-white/20 rounded-lg px-4 py-2">Tutup (F7)</button>
        </div>

        {status && (
          <div className={`mb-4 text-sm rounded-lg px-4 py-2 border ${status.type === 'ok' ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300' : 'bg-red-500/10 border-red-400/30 text-red-300'}`}>{status.message}</div>
        )}

        <div className="flex gap-2 mb-5">
          <button onClick={() => setTab('branding')} className={`px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest rounded-full ${tab === 'branding' ? 'bg-[#FF8F00] text-[#1B1000]' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}>Branding</button>
          <button onClick={() => setTab('data')} className={`px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest rounded-full ${tab === 'data' ? 'bg-[#FF8F00] text-[#1B1000]' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}>Data Manager (CRUD)</button>
          <button onClick={() => setTab('danger')} className={`px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest rounded-full ${tab === 'danger' ? 'bg-red-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}>Danger Zone</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'branding' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Left: controls */}
              <div className="lg:col-span-3 space-y-5">

                {/* Identity card */}
                <div className="bg-white/[.06] border border-white/12 rounded-2xl p-5 space-y-3">
                  <h2 className="font-bold uppercase tracking-widest text-xs text-orange-300/80">Identitas &amp; Logo</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-black/30 border border-white/10 p-3 flex flex-col items-center gap-2">
                      <img src={logo} alt="Logo" className="h-16 w-auto object-contain" />
                      <div className="flex flex-col gap-1.5 w-full">
                        <button onClick={pickLogo} disabled={busy} className="w-full text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FF8F00] text-[#1B1000] disabled:opacity-60">Ganti Logo…</button>
                        <button onClick={resetLogo} disabled={busy} className="w-full text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-white/20 text-white/70 hover:bg-white/10 disabled:opacity-60">Reset Logo</button>
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/30 border border-white/10 p-3 flex flex-col items-center gap-2">
                      <div className="h-16 w-16 rounded-lg bg-white/10 grid place-items-center text-2xl font-black text-white">Aa</div>
                      <div className="flex flex-col gap-1.5 w-full">
                        <button onClick={pickIcon} disabled={busy} className="w-full text-xs font-bold px-3 py-1.5 rounded-lg bg-white/80 text-[#0F2C52] disabled:opacity-60">Ganti Ikon…</button>
                        <button onClick={resetIcon} disabled={busy} className="w-full text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-white/20 text-white/70 hover:bg-white/10 disabled:opacity-60">Reset Ikon</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Nama Aplikasi *</label>
                    <input value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white font-bold tracking-wide" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Tagline / Subjudul</label>
                    <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white" />
                  </div>
                  <div className="flex items-end gap-2 pt-1">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Font Aplikasi</label>
                      <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white">
                        {FONT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="grid place-items-center h-10 w-10 rounded-lg border border-white/15 bg-black/30 shrink-0" style={{ fontFamily }}>
                      <span className="text-lg font-black text-white">Aa</span>
                    </div>
                  </div>
                </div>

                {/* Colors card */}
                <div className="bg-white/[.06] border border-white/12 rounded-2xl p-5 space-y-3">
                  <h2 className="font-bold uppercase tracking-widest text-xs text-orange-300/80">Warna</h2>
                  {([
                    ['Warna Utama', primaryColor, setPrimaryColor],
                    ['Warna Sidebar', sidebarColor, setSidebarColor],
                    ['Warna Aksen', accentColor, setAccentColor],
                  ] as const).map(([label, value, setter]) => (
                    <div key={label} className="flex items-center gap-3">
                      <input type="color" value={value} onChange={(e) => setter(e.target.value)} className="w-12 h-10 rounded border border-white/15 bg-black/30 cursor-pointer" />
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">{label}</label>
                        <input value={value} onChange={(e) => setter(e.target.value)} className="w-full px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white font-mono" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Receipt footer card */}
                <div className="bg-white/[.06] border border-white/12 rounded-2xl p-5 space-y-2">
                  <h2 className="font-bold uppercase tracking-widest text-xs text-orange-300/80">Nota / Struk</h2>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Footer di nota (max 120 karakter)</label>
                  <input value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} className="w-full px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white" placeholder="Terima kasih atas kunjungan Anda" />
                  <p className="text-[10px] text-white/35">Tampil di struk kasir &amp; invoice A4.</p>
                </div>
              </div>

              {/* Right: live preview */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                <div className="bg-white/[.06] border border-white/12 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold uppercase tracking-widest text-xs text-orange-300/80">Pratinjau Langsung</h2>
                    <span className="text-[9px] uppercase tracking-widest text-white/40">belum disimpan</span>
                  </div>
                  {/* mini window preview */}
                  <div className="rounded-xl overflow-hidden border border-white/20 shadow-2xl select-none" style={{ fontFamily }}>
                    {/* titlebar */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#1F2937] text-white text-[10px]">
                      <div className="flex items-center gap-1.5 font-semibold tracking-wide">
                        <img src={logo} className="h-3.5 w-3.5 object-contain rounded-[3px] bg-white p-[2px]" alt="" />
                        {appName || 'Aplikasi'} POS
                      </div>
                      <div className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block" /><span className="w-2.5 h-2.5 rounded-full bg-amber-400 block" /><span className="w-2.5 h-2.5 rounded-full bg-red-400 block" /></div>
                    </div>
                    <div className="flex" style={{ minHeight: 170 }}>
                      {/* sidebar */}
                      <div className="w-1/3 p-2.5 flex flex-col gap-1.5 text-white" style={{ background: 'linear-gradient(to bottom, ' + primaryColor + ' 0%, ' + sidebarColor + ' 100%)' }}>
                        <div className="bg-white rounded-md px-1.5 py-1 flex items-center justify-center">
                          <img src={logo} className="h-5 w-auto object-contain" alt="" />
                        </div>
                        <p className="text-center text-[7px] uppercase tracking-[0.2em] text-white/60">{tagline || 'TAGLINE'}</p>
                        {['Dashboard', 'Kasir (POS)', 'Pembelian', 'Laporan', 'Pengaturan'].map((label, i) => (
                          <div key={i} className={'flex items-center gap-1.5 rounded px-1.5 py-1 text-[8px] font-semibold ' + (i === 1 ? 'text-white' : 'text-white/75')} style={i === 1 ? { background: primaryColor } : undefined}>
                            <span className="w-2.5 h-2.5 rounded-sm bg-white/30 inline-block" />{label}
                          </div>
                        ))}
                      </div>
                      {/* content */}
                      <div className="flex-1 bg-[#F5F7FA] p-3 text-[#1F2937]">
                        <p className="text-[10px] font-extrabold text-[#0F2C52] leading-tight">Selamat pagi</p>
                        <p className="text-[8px] text-[#64748B] mb-2">Ringkasan hari ini</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[['Omzet', 'Rp 1.250.000'], ['Transaksi', '24'], ['Produk', '128'], ['Stok Menipis', '3']].map(([k, v], i) => (
                            <div key={i} className="bg-white rounded border border-[#E2E8F0] px-2 py-1.5">
                              <p className="text-[7px] uppercase text-[#64748B] font-bold">{k}</p>
                              <p className="text-[9px] font-extrabold text-[#0F2C52]">{v}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 h-10 rounded bg-white border border-[#E2E8F0] flex items-end gap-[3px] p-1.5">
                          {[40, 70, 55, 90, 65, 30, 80].map((h, i) => <div key={i} className="flex-1 rounded-t-[2px]" style={{ height: h + '%', background: i === 4 ? accentColor : primaryColor }} />)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* footer preview for receipts */}
                  <div className="mt-3 rounded-xl border border-white/12 bg-black/20 p-3">
                    <p className="text-[9px] uppercase tracking-widest text-white/45 font-bold mb-1.5">Pratinjau Footer Nota</p>
                    <div className="bg-white rounded p-2 text-center text-[#172033] font-mono">
                      <p className="text-[8px] font-extrabold">{appName || 'VYAPARA'}</p>
                      <p className="text-[6px] border-b border-dashed border-black my-1">INV-20261118-0001</p>
                      <p className="text-[6px]">TOTAL Rp 45.000</p>
                      <p className="text-[6px] border-t border-dashed border-black mt-1 pt-1">{receiptFooter || 'Terima kasih atas kunjungan Anda'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveBranding} disabled={busy} className="flex-1 py-3.5 rounded-2xl font-extrabold uppercase tracking-widest text-sm text-[#1B1000] bg-gradient-to-r from-[#FFD54F] to-[#FF8F00] shadow-[0_6px_24px_rgba(255,143,0,.35)] hover:brightness-110 disabled:opacity-60">Simpan &amp; Terapkan</button>
                  <button onClick={() => { setAppName(branding.appName); setTagline(branding.tagline); setPrimaryColor(branding.primaryColor); setSidebarColor(branding.sidebarColor); setAccentColor(branding.accentColor); setFontFamily(branding.fontFamily); setReceiptFooter(branding.receiptFooter); }} className="px-5 rounded-2xl border border-white/20 text-white/70 hover:bg-white/10 text-xs font-bold uppercase tracking-widest">Batal</button>
                </div>
              </div>

            </div>
          )}

          {tab === 'data' && (
            <div className="rounded-2xl bg-[#F5F7FA] p-3">
              <SuperadminDataManager />
            </div>
          )}

          {tab === 'danger' && (
            <div className="max-w-2xl space-y-4">
              <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-5">
                <h2 className="font-extrabold uppercase tracking-widest text-xs text-red-400 mb-2">3 Aksi Penghancur — Tidak Bisa Dibatalkan</h2>
                <div className="space-y-3 text-sm text-red-100/80">
                  <div className="flex items-center justify-between gap-4 border border-white/10 rounded-xl p-3">
                    <div><p className="font-bold text-white">Hapus Semua Sesi</p><p className="text-xs text-white/45">Paksa semua pengguna login ulang di semua perangkat.</p></div>
                    <button onClick={wipeSessions} disabled={busy} className="shrink-0 text-xs font-extrabold uppercase tracking-widest px-4 py-2 rounded-lg border border-red-400/50 text-red-300 hover:bg-red-500/15 disabled:opacity-50">Hapus</button>
                  </div>
                  <div className="flex items-center justify-between gap-4 border border-white/10 rounded-xl p-3">
                    <div><p className="font-bold text-white">Hapus Semua Akun Admin</p><p className="text-xs text-white/45">Menghapus SEMUA akun kecuali superadmin. Data transaksi &amp; produk tetap ada.</p></div>
                    <button onClick={wipeAdminUsers} disabled={busy} className="shrink-0 text-xs font-extrabold uppercase tracking-widest px-4 py-2 rounded-lg border border-red-400/50 text-red-300 hover:bg-red-500/15 disabled:opacity-50">Hapus</button>
                  </div>
                  <div className="border border-red-500/40 rounded-xl p-3 bg-red-950/60">
                    <p className="font-bold text-red-300">Factory Reset — Hapus SEMUA Data Toko</p>
                    <p className="text-xs text-red-100/60 mt-1">Menghapus: produk, transaksi, pelanggan, pemasok, pembelian, stok, laporan, sesi, akun — KECUALI superadmin dan konfigurasi bawaan. Ketik <code className="font-mono bg-black/40 px-1 rounded">HAPUS-SEMUA-DATA</code> untuk melanjutkan.</p>
                    <div className="flex gap-2 mt-3">
                      <input value={factoryConfirm} onChange={(e) => setFactoryConfirm(e.target.value)} placeholder="HAPUS-SEMUA-DATA" className="flex-1 px-3 py-2 text-sm bg-black/40 border border-red-400/40 rounded-lg text-red-200 font-mono placeholder-red-200/25 focus:outline-none focus:ring-2 focus:ring-red-500" />
                      <button onClick={factoryReset} disabled={busy} className="shrink-0 text-xs font-extrabold uppercase tracking-widest px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50">Reset</button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-white/35 text-center uppercase tracking-widest">Superadmin privilege — tindakan Anda tidak tercatat di audit log aplikasi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminPortal;
