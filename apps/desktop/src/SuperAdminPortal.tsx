/* src/SuperAdminPortal.tsx — hidden superadmin portal (F7).
   Full-screen overlay with its own login; only role === 'superadmin' can proceed. */
import React, { useState, useEffect, useCallback } from 'react';
import useAuth from './authStore';
import { loadBranding, getBranding, logoSrc } from './branding';

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

  const [tab, setTab] = useState<'branding' | 'danger'>('branding');
  const [branding, setBrandingState] = useState(getBranding());
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  const [appName, setAppName] = useState(branding.appName);
  const [tagline, setTagline] = useState(branding.tagline);
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [sidebarColor, setSidebarColor] = useState(branding.sidebarColor);
  const [accentColor, setAccentColor] = useState(branding.accentColor);

  useEffect(() => { setBrandingState(getBranding()); }, []);

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
        patch: { appName, tagline, primaryColor, sidebarColor, accentColor },
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
      <div className="max-w-5xl mx-auto h-full flex flex-col p-6 text-white">
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
          <button onClick={() => setTab('danger')} className={`px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest rounded-full ${tab === 'danger' ? 'bg-red-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}>Danger Zone</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'branding' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white/[.06] border border-white/12 rounded-2xl p-5 space-y-3">
                <h2 className="font-bold uppercase tracking-widest text-xs text-orange-300/80">Logo &amp; Nama</h2>
                <div className="flex items-center gap-4 p-3 rounded-xl bg-black/30 border border-white/10">
                  <img src={logo} alt="Logo" className="h-16 w-auto object-contain" />
                  <div className="flex flex-col gap-2">
                    <button onClick={pickLogo} disabled={busy} className="text-xs font-bold px-4 py-2 rounded-lg bg-[#FF8F00] text-[#1B1000] disabled:opacity-60">Ganti Logo…</button>
                    <button onClick={resetLogo} disabled={busy} className="text-xs font-semibold px-4 py-2 rounded-lg border border-white/20 text-white/75 hover:bg-white/10 disabled:opacity-60">Kembalikan Bawaan</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Nama Aplikasi</label>
                  <input value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Tagline / Subjudul</label>
                  <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white" />
                </div>
                <p className="text-[10px] text-white/35">Perubahan tampil di: Layar login, sidebar, dan title bar.</p>
              </div>

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
                <div className="flex gap-3 pt-2">
                  <button onClick={saveBranding} disabled={busy} className="flex-1 py-3 rounded-xl font-extrabold uppercase tracking-widest text-sm text-[#1B1000] bg-gradient-to-r from-[#FFD54F] to-[#FF8F00] disabled:opacity-60">Simpan &amp; Terapkan</button>
                  <button onClick={() => { setAppName(branding.appName); setTagline(branding.tagline); setPrimaryColor(branding.primaryColor); setSidebarColor(branding.sidebarColor); setAccentColor(branding.accentColor); }} className="px-5 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 text-sm font-bold">Batal</button>
                </div>
              </div>
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
