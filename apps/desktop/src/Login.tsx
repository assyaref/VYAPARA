import React, { useEffect, useState } from 'react';
import useAuth from './authStore';
import logo from './assets/logo.png';
import './index.css';

const REMEMBER_FLAG = 'vyapara-remember';
const REMEMBER_EMAIL = 'vyapara-remember-email';

type Mode = 'checking' | 'login' | 'setup';

const LoginPage: React.FC = () => {
  const rememberInitially = typeof localStorage !== 'undefined' && localStorage.getItem(REMEMBER_FLAG) === '1';
  const [mode, setMode] = useState<Mode>('checking');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() =>
    rememberInitially ? localStorage.getItem(REMEMBER_EMAIL) ?? '' : '',
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(rememberInitially);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const login = useAuth((state) => state.login);
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await (window as any).vyapara?.authNeedsSetup?.();
        if (!cancelled) setMode(result?.ok && result?.data?.needsSetup ? 'setup' : 'login');
      } catch {
        if (!cancelled) setMode('login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const success = await login(email, password);
    if (!success) {
      setError('Email atau kata sandi salah');
      return;
    }
    if (remember) {
      localStorage.setItem(REMEMBER_FLAG, '1');
      localStorage.setItem(REMEMBER_EMAIL, email);
    } else {
      localStorage.removeItem(REMEMBER_FLAG);
      localStorage.removeItem(REMEMBER_EMAIL);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok');
      return;
    }
    if (password.length < 10) {
      setError('Kata sandi minimal 10 karakter');
      return;
    }
    setSubmitting(true);
    try {
      const result = await (window as any).vyapara?.authSetup?.({ name: name.trim(), email: email.trim(), password });
      if (!result?.ok) {
        setError(result?.error?.message ?? 'Gagal menyiapkan administrator');
        return;
      }
      const loggedIn = await login(email.trim(), password);
      if (!loggedIn) {
        setMode('login');
        setError('Administrator tersimpan. Silakan masuk dengan kredensial Anda.');
      }
    } catch {
      setError('Gagal menyiapkan administrator');
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-vyapara-surface flex items-center justify-center">
        <p className="text-vyapara-secondary">Selamat datang di VYAPARA</p>
      </div>
    );
  }

  const inputCls =
    'w-full pl-10 pr-3 py-2.5 text-sm border border-vyapara-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vyapara-blue focus:border-transparent';
  const iconCls = 'absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vyapara-secondary';

  return (
    <div className="min-h-screen w-full font-inter bg-gradient-to-br from-[#0D47A1] via-[#155FAD] to-[#1E88E5] relative overflow-hidden flex items-center justify-center">
      <div className="absolute -top-40 -left-40 w-[34rem] h-[34rem] rounded-full bg-[#FF8F00]/20 blur-3xl" />
      <div className="absolute -bottom-48 -right-40 w-[36rem] h-[36rem] rounded-full bg-[#0D47A1]/60 blur-3xl" />
      <div className="absolute top-16 right-24 w-40 h-40 rounded-full border border-white/10" />
      <div className="absolute bottom-20 left-24 w-24 h-24 rounded-full border border-white/10" />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md px-8 py-7">
        <div className="flex flex-col items-center border-b border-vyapara-border pb-5 mb-5">
          <img src={logo} alt="VYAPARA Business Management" className="h-16 w-auto object-contain" />
          <p className="text-[10px] tracking-[0.25em] uppercase text-vyapara-secondary mt-2">
            Sistem Manajemen Usaha Terpadu
          </p>
        </div>

        {mode === 'checking' && (
          <p className="text-sm text-vyapara-secondary text-center py-6">Memuat…</p>
        )}

        {error && mode !== 'checking' && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {mode === 'setup' && (
          <>
            <h1 className="text-lg font-bold text-vyapara-navy">Siapkan Administrator</h1>
            <p className="text-xs text-vyapara-secondary mb-5">Toko ini belum memiliki akun. Buat akun administrator utama.</p>

            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-vyapara-text mb-1.5">Nama Lengkap</label>
                <div className="relative">
                  <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
                  </svg>
                  <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
                    placeholder="Nama pemilik toko" className={inputCls} />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-vyapara-text mb-1.5">Username / Email</label>
                <div className="relative">
                  <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
                  </svg>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    placeholder="admin@vyapara.com" autoComplete="email" className={inputCls} />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-vyapara-text mb-1.5">Kata Sandi (min. 10 karakter)</label>
                <div className="relative">
                  <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="5" y="10" width="14" height="9" rx="2" /><path d="M8 10V8a4 4 0 018 0v2" />
                  </svg>
                  <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                    placeholder="••••••••••" autoComplete="new-password" className={inputCls} />
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-xs font-semibold text-vyapara-text mb-1.5">Ulangi Kata Sandi</label>
                <div className="relative">
                  <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="5" y="10" width="14" height="9" rx="2" /><path d="M8 10V8a4 4 0 018 0v2" />
                  </svg>
                  <input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                    placeholder="••••••••••" autoComplete="new-password" className={inputCls} />
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0D47A1] to-[#1976D2] text-white text-sm font-semibold tracking-wide shadow-lg hover:shadow-xl hover:brightness-110 transition disabled:opacity-60">
                {submitting ? 'Menyimpan…' : 'Buat Administrator & Masuk'}
              </button>
            </form>
          </>
        )}

        {mode === 'login' && (
          <>
            <h1 className="text-lg font-bold text-vyapara-navy">Masuk ke Aplikasi</h1>
            <p className="text-xs text-vyapara-secondary mb-5">Gunakan akun toko Anda untuk melanjutkan</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-vyapara-text mb-1.5">Username / Email</label>
                <div className="relative">
                  <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
                  </svg>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    placeholder="admin@vyapara.com" autoComplete="email" className={inputCls} />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-vyapara-text mb-1.5">Password</label>
                <div className="relative">
                  <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="5" y="10" width="14" height="9" rx="2" /><path d="M8 10V8a4 4 0 018 0v2" />
                  </svg>
                  <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                    placeholder="••••••••" autoComplete="current-password" className={inputCls} />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-vyapara-secondary select-none cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 accent-[#1976D2]" />
                  Ingat saya
                </label>
                <button type="button" onClick={() => setForgotOpen((v) => !v)} className="text-vyapara-blue font-semibold hover:underline">
                  Lupa password?
                </button>
              </div>
              {forgotOpen && (
                <p className="text-[11px] text-vyapara-secondary bg-vyapara-surface border border-vyapara-border rounded-lg px-3 py-2">
                  Hubungi administrator toko Anda untuk mereset kata sandi. Administrator dapat mengatur ulang lewat menu Pengaturan.
                </p>
              )}

              <button type="submit" disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0D47A1] to-[#1976D2] text-white text-sm font-semibold tracking-wide shadow-lg hover:shadow-xl hover:brightness-110 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {isLoading ? 'Memproses…' : (
                  <>
                    Masuk
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <p className="text-center text-[10px] text-vyapara-secondary mt-5">
          © 2026 VYAPARA Business Management · v1.0.0
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
