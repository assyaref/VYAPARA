/* src/App.tsx */
import React, { useEffect, useState } from 'react';
import useAuth from './authStore';
import Login from './Login';
import Supplier from './Supplier';
import Procurement from './Procurement';
import Finance from './Finance';
import Customer from './Customer';
import Reports from './Reports';
import Settings from './Settings';
import POS from './POS';
import './index.css';

type View =
  | 'dashboard'
  | 'supplier'
  | 'procurement'
  | 'finance'
  | 'customer'
  | 'reports'
  | 'settings'
  | 'pos';

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const { user, isAuthenticated, isLoading: authIsLoading, login, logout } = useAuth();

  useEffect(() => {
    const checkSession = async () => {
      const result = await (window as any).vyapara.authSession?.();
      if (result?.success && result.user) {
        login(result.user.email, '');
      }
    };
    checkSession();
  }, [login]);

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

  const navItems: { id: View; label: string; permission?: string }[] = [
    { id: 'dashboard', label: 'Beranda' },
    { id: 'pos', label: 'POS', permission: 'transaction:write' },
    { id: 'procurement', label: 'Pembelian', permission: 'procurement:read' },
    { id: 'finance', label: 'Keuangan', permission: 'finance:read' },
    { id: 'customer', label: 'Pelanggan', permission: 'customer:read' },
    { id: 'reports', label: 'Laporan', permission: 'reports:read' },
    { id: 'settings', label: 'Pengaturan', permission: 'settings:read' },
    { id: 'supplier', label: 'Pemasok', permission: 'supplier:read' },
  ];

  const userPermissions = user?.permissions ?? [];
  const visibleNav = navItems.filter((item) => !item.permission || userPermissions.includes(item.permission));

  if (authIsLoading) {
    return (
      <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
        <aside className="w-64 fixed left-0 top-0 bottom-0 flex flex-col border-r border-vyapara-border bg-vyapara-navy">
          <div className="h-16 flex items-center justify-center">
            <div className="text-white text-xl font-bold">VYAPARA</div>
          </div>
        </aside>
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

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <aside
        className="w-64 fixed left-0 top-0 bottom-0 flex flex-col border-r border-vyapara-border bg-vyapara-navy"
      >
        <div className="h-16 flex items-center justify-center">
          <div className="text-white text-xl font-bold">VYAPARA</div>
        </div>
        <nav className="flex-1 py-4 space-y-2">
          {visibleNav.map((item) => (
            <a
              key={item.id}
              href="/#/"
              onClick={() => setCurrentView(item.id)}
              className={`flex items-center px-4 py-2 rounded-md text-vyapara-text hover:bg-vyapara-blue transition-colors font-medium ${
                currentView === item.id ? 'bg-vyapara-blue text-white' : ''
              }`}
            >
              {item.id === 'dashboard' && (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M10 12l4-4m0 0l4 4m-4-4h12a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5.586a1 1 0 0 1-.707-.293l-2.414 2.414a1 1 0 0 1-.707.293V12" />
                </svg>
              )}
              {item.id === 'pos' && (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M1 21h22L12 1 1 21z" />
                </svg>
              )}
              {item.id === 'procurement' && (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M16 11v7a4 4 0 00-8 0v-7M8 15l-4 4M8 15l4 4M12 11a4 4 0 018 0v7a4 4 0 01-8 0z" />
                </svg>
              )}
              {item.id === 'finance' && (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2c-4.714 0-7.398 1.783-9.033 4.386-.456.717-.53 1.437-.257 2.045.273.606.84.873 1.425.873H16a2 2 0 012 2v1.172c0 .657.192 1.285.514 1.821.321.535.662 1.063.99 1.573.197.31.384.621.572.93.272.448.486.948.572 1.495.055.353.094.715.112 1.083a1 1 0 01-.198 1.485c-.36.362-.797.534-1.248.534H4.96c-.45 0-.889-.172-1.249-.534a1 1 0 01-.198-1.485c.018-.368.057-.73.112-1.083.086-.547.3-.997.572-1.495.188-.309.375-.62.572-.93.328-.51.669-1.038.99-1.573.322-.536.514-1.164.514-1.821V5c0-.688-.394-1.23-1.025-1.463-.63-.233-1.08-.233-1.71 0-.631.233-1.025.775-1.025 1.463z" />
                </svg>
              )}
              {item.id === 'customer' && (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              )}
              {item.id === 'reports' && (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2zM9 19V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2zm0 0v10a2 2 0 002 2h2a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2zm8 0h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              )}
              {item.id === 'settings' && (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2h-2a2 2 0 01-2-2v-1a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1h-1a2 2 0 01-2-2v-2a2 2 0 012-2h1a1.65 1.65 0 001.51-1 1.65 1.65 0 00-1-1.51l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33h1a1.65 1.65 0 001-1.51V3a2 2 0 012-2h2a2 2 0 012 2v1a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v1a1.65 1.65 0 001.51 1h1a2 2 0 012 2v2a2 2 0 01-2 2h-1a1.65 1.65 0 00-1.51 1z" />
                </svg>
              )}
              {item.id === 'supplier' && (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
              {item.label}
            </a>
          ))}
          <a
            href="/#/"
            onClick={() => {
              logout();
              setCurrentView('dashboard');
            }}
            className="flex items-center px-4 py-2 rounded-md text-vyapara-text hover:bg-red-50 transition-colors font-medium mt-4"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 21l-6-6m6 6l6-6m-6 6h18v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2z" />
            </svg>
            Keluar
          </a>
        </nav>
      </aside>

      <main className="ml-64 p-8 overflow-y-auto min-h-screen">
        {currentView === 'dashboard' && (
          <>
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-vyapara-navy mb-2">
                Selamat Datang di VYAPARA, {user?.name || ''}
              </h1>
              <p className="text-vyapara-secondary">
                Login berhasil: {user?.email || ''}
              </p>
            </header>

            <section className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-vyapara-border">
                <h2 className="text-xl font-medium text-vyapara-navy mb-4">Dashboard</h2>
                <p className="text-vyapara-secondary">
                  Selamat datang kembali di VYAPARA. Aplikasi ini menyediakan fitur manajemen bisnis toko.
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
                    {'1.0.0'}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
        {currentView === 'pos' && <POS />}
        {currentView === 'procurement' && <Procurement />}
        {currentView === 'finance' && <Finance />}
        {currentView === 'customer' && <Customer />}
        {currentView === 'reports' && <Reports />}
        {currentView === 'settings' && <Settings />}
        {currentView === 'supplier' && <Supplier />}
      </main>
    </div>
  );
}

export default App;
