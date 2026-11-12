/* src/App.tsx */
import React, { useEffect, useState } from 'react';
import useAuth from './authStore';
import Login from './Login';
import './index.css';

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const appInfo = user ? { name: user.name, version: '1.0.0' } : null;

  // Initialize session check on mount
  useEffect(() => {
    const checkSession = async () => {
      await login('admin@vyapara.com', 'admin123');
    };
    checkSession();
  }, [login]);

  // Online/offline status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // If loading, show spinner; if authenticated, show main app; otherwise show login
  if (isLoading) {
    return (
      <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
        <aside className="w-64 fixed left-0 top-0 bottom-0 flex flex-col border-r border-vyapara-border bg-vyapara-navy">
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
        {/* Main content area for loading state */}
        <main className="ml-64 p-8 overflow-y-auto min-h-screen">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-vyapara-navy mb-2">VYAPARA</h1>
            <p className="text-vyapara-secondary">Sistem sedang memeriksa sesi...</p>
          </header>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Show main application when authenticated
  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <aside
        className="w-64 fixed left-0 top-0 bottom-0 flex flex-col border-r border-vyapara-border bg-vyapara-navy"
      >
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
          {/* Modul-modul akan ditambahkan di phase selanjutnya */}
        </nav>
      </aside>

      <main className="ml-64 p-8 overflow-y-auto min-h-screen">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-vyapara-navy mb-2">
            Selamat Datang di VYAPARA, {user?.name || ''}
          </h1>
          <p className="text-vyapara-secondary">Login berhasil: {user?.email || ''}</p>
        </header>

        <section className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-vyapara-border">
            <h2 className="text-xl font-medium text-vyapara-navy mb-4">Dashboard</h2>
            <p className="text-vyapara-secondary">
              Selamat datang kembali di VYAPARA. Aplikasi ini menyediakan fitur manajemen bisnis toko ATK dan jasa percetakan.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-vyapara-navy rounded-xl p-4 text-white">
              <h3 className="text-semibold">Koneksi</h3>
              <p className="mt-2 opacity-90">Status: <span id="online-status">{isOnline ? 'Online' : 'Offline'}</span></p>
            </div>
            <div className="bg-vyapara-blue rounded-xl p-4 text-white">
              <h3 className="text-semibold">Versi Aplikasi</h3>
              <p className="mt-2" id="app-version">
                {appInfo?.name || 'Memuat...'} {appInfo?.version || ''}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;