import React, { useState } from 'react';
import useAuth from './authStore';
import './index.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const login = useAuth((state) => state.login);
  const { isLoading, isAuthenticated } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const success = await login(email, password);
    if (!success) {
      setError('Email atau kata sandi salah');
    }
  };

  if (isAuthenticated) {
    return <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">Selamat datang di VYAPARA</div>;
  }

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <aside
        className="w-64 fixed left-0 top-0 bottom-0 flex flex-col border-r border-vyapara-border bg-vyapara-navy">
        <div className="h-16 flex items-center justify-center">
          <div className="text-white text-xl font-bold">VYAPARA</div>
        </div>
        <nav className="flex-1 py-4 space-y-2">
          <a href="/#/" className="flex items-center px-4 py-2 rounded-md text-vyapara-text hover:bg-vyapara-blue transition-colors font-medium">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M10 12l4-4m0 0l4 4m-4-4h12a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5.586a1 1 0 0 1-.707-.293l-2.414 2.414a1 1 0 0 1-.707.293V12" />
            </svg>
            Beranda
          </a>
        </nav>
      </aside>

      <main className="ml-64 p-8 overflow-y-auto min-h-screen">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-vyapara-navy mb-2">Masuk ke VYAPARA</h1>
          <p className="text-vyapara-secondary">Aplikasi Manajemen Bisnis Terintegrasi</p>
        </header>

        <section className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-vyapara-border">
            <h2 className="text-xl font-medium text-vyapara-navy mb-4">Login</h2>
            {error && <p className="text-vyapara-red mb-4">{error}</p>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-vyapara-text mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-vyapara-border rounded-md focus:outline-none focus:border-vyapara-blue"
                />
              </div>
              <div>
                <label className="block text-vyapara-text mb-2">Kata Sandi</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-vyapara-border rounded-md focus:outline-none focus:border-vyapara-blue"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-vyapara-blue text-white rounded-md font-medium hover:bg-vyapara-dark transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Sedang login...' : 'Masuk'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LoginPage;