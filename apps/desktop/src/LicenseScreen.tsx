/* src/LicenseScreen.tsx — Activation / revoked gate for client installs */
import React, { useState } from 'react';
import { getBranding, logoSrc } from './branding';
import './index.css';

const vyapara = (window as any).vyapara;

const LicenseScreen: React.FC<{ onLicensed?: () => void; revokedReason?: string | null }> = ({ onLicensed, revokedReason }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [serial, setSerial] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const branding = getBranding();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await vyapara.activateLicense({ licenseKey: serial.trim(), serverUrl: serverUrl.trim(), organizationName: organizationName.trim() || undefined });
      if (!res?.ok) {
        setError(res?.error?.message ?? 'Aktivasi gagal');
        return;
      }
      onLicensed?.();
    } catch (err: any) {
      setError(err?.message || 'Aktivasi gagal');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-3 pl-11 text-sm border border-vyapara-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vyapara-blue';

  if (revokedReason) {
    return (
      <div className="min-h-screen w-full font-inter bg-gradient-to-br from-[#050E1E] via-[#0B2447] to-[#123E73] relative overflow-hidden flex items-center justify-center">
        <div className="absolute -top-40 -left-40 w-[34rem] h-[34rem] rounded-full bg-[#FF8F00]/20 blur-3xl" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md px-8 py-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg mb-4 mx-auto">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-vyapara-navy">Lisensi Dinonaktifkan</h1>
          <p className="text-sm text-vyapara-secondary mt-2">{revokedReason}</p>
          <p className="text-xs text-vyapara-secondary mt-4">Hubungi penyedia aplikasi Anda untuk mengaktifkan kembali.</p>
          <button onClick={() => window.location.reload()} className="mt-6 w-full py-3 rounded-xl bg-vyapara-navy text-white text-sm font-semibold hover:bg-vyapara-blue transition-colors">Periksa Lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full font-inter bg-gradient-to-br from-[#050E1E] via-[#0B2447] to-[#123E73] relative overflow-hidden flex items-center justify-center">

      <div className="absolute -top-40 -left-40 w-[34rem] h-[34rem] rounded-full bg-[#FF8F00]/20 blur-3xl" />
      <div className="absolute -bottom-48 -right-40 w-[36rem] h-[36rem] rounded-full bg-[#0D47A1]/60 blur-3xl" />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md px-8 py-7">
        <div className="flex flex-col items-center border-b border-vyapara-border pb-5 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF8F00] to-[#E65100] flex items-center justify-center shadow-lg mb-3">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <img src={logoSrc(branding)} alt={branding.appName} className="h-14 w-auto object-contain" />
          <p className="text-[10px] tracking-[0.25em] uppercase text-vyapara-secondary mt-2">Aktivasi Lisensi</p>
        </div>

        <h1 className="text-lg font-bold text-vyapara-navy">Aplikasi ini berlisensi</h1>
        <p className="text-xs text-vyapara-secondary mb-5">Masukkan Serial Number yang Anda terima dari penjual/pemilik aplikasi, beserta URL server lisensi yang diberikan.</p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="license-server" className="block text-xs font-semibold text-vyapara-text mb-1.5">URL Server Lisensi *</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vyapara-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
              </svg>
              <input id="license-server" required value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://license.tokomu.co.id" className={inputCls} autoComplete="off" />
            </div>
          </div>

          <div>
            <label htmlFor="license-serial" className="block text-xs font-semibold text-vyapara-text mb-1.5">Serial Number *</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vyapara-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="10" rx="2" />
                <path d="M7 11h1.5M10.5 11H12M14 11h1.5" />
              </svg>
              <input id="license-serial" required value={serial} onChange={(e) => setSerial(e.target.value.toUpperCase())} placeholder="VYPR-XXXX-XXXX-XXXX" className={`${inputCls} font-mono tracking-wider`} autoComplete="off" spellCheck={false} />
            </div>
          </div>

          <div>
            <label htmlFor="license-org" className="block text-xs font-semibold text-vyapara-text mb-1.5">Nama Toko / Organisasi (opsional)</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vyapara-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z" />
                <path d="M9 21V12h6v9" />
              </svg>
              <input id="license-org" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Toko Berkah Sejahtera" className={inputCls} autoComplete="off" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0D47A1] to-[#1976D2] text-white text-sm font-semibold tracking-wide shadow-lg hover:shadow-xl hover:brightness-110 transition disabled:opacity-60">
            {loading ? 'Memverifikasi…' : 'Aktivasi Sekarang'}
          </button>
        </form>

        <p className="text-center text-[10px] text-vyapara-secondary/70 mt-5">
          Tidak punya serial? Hubungi penyedia aplikasi Anda.
        </p>
      </div>
    </div>
  );
};

export default LicenseScreen;
