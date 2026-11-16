import React, { useState, useEffect, useCallback } from 'react';
import useAuth from './authStore';

const vyapara = (window as any).vyapara;

type Setting = { key: string; value: string; updatedAt: string };
type AdminUser = { id: string; name: string; email: string; roleId: string | null; roleName: string | null; mustChangePassword: boolean; isActive: boolean; createdAt: string; updatedAt: string };
type Role = { id: string; name: string; description: string | null; createdAt: string };
type Permission = { id: string; name: string; description: string | null };

const Settings: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const userPermissions = user?.permissions ?? [];
  const canWrite = userPermissions.includes('settings:write');
  const canRead = userPermissions.includes('settings:read');

  const [tab, setTab] = useState<'settings' | 'users' | 'roles' | 'permissions' | 'backup'>('settings');
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{ type: 'ok' | 'err' | 'info'; message: string } | null>(null);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingKey, setSettingKey] = useState('');
  const [settingValue, setSettingValue] = useState('');
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', roleId: '' });
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });

  const loadSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const result = await vyapara.settingsList({ token: '' });
      if (result.ok) {
        setSettings(result.data);
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadUsers = useCallback(async () => {
    const result = await vyapara.usersGetAll({ token: '', limit: 500 });
    if (result.ok) setUsers(result.data);
    else setError(result.error.message);
  }, []);

  const loadRoles = useCallback(async () => {
    const result = await vyapara.rolesGetAll({ token: '', limit: 500 });
    if (result.ok) setRoles(result.data);
    else setError(result.error.message);
  }, []);

  const loadPermissions = useCallback(async () => {
    const result = await vyapara.permissionsGetAll({ token: '' });
    if (result.ok) setPermissions(result.data);
    else setError(result.error.message);
  }, []);

  useEffect(() => {
    loadSettings();
    loadUsers();
    loadRoles();
    loadPermissions();
  }, [loadSettings, loadUsers, loadRoles, loadPermissions]);

  const handleUpsertSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await vyapara.settingsUpsert({ token: '', key: settingKey, value: settingValue });
      if (result.ok) {
        setSettingKey('');
        setSettingValue('');
        await loadSettings();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pengaturan');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await vyapara.usersCreate({
        token: '',
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        roleId: userForm.roleId,
      });
      if (result.ok) {
        setUserForm({ name: '', email: '', password: '', roleId: '' });
        await loadUsers();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal membuat pengguna');
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await vyapara.rolesCreate({
        token: '',
        name: roleForm.name,
        description: roleForm.description || undefined,
      });
      if (result.ok) {
        setRoleForm({ name: '', description: '' });
        await loadRoles();
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal membuat peran');
    }
  };

  const handleBackup = async () => {
    setBackupBusy(true);
    setBackupStatus(null);
    setError(null);
    try {
      const pick = await vyapara.pickBackupSavePath({ token: '', defaultName: `vyapara-backup-${new Date().toISOString().slice(0, 10)}.vyapara-backup` });
      if (!pick?.ok || !pick.data?.path) {
        setBackupStatus({ type: 'info', message: 'Backup dibatalkan.' });
        return;
      }
      const res = await vyapara.backupDatabase({ token: '', backupPath: pick.data.path });
      if (res?.ok) {
        setBackupStatus({ type: 'ok', message: `Backup berhasil disimpan di:\n${pick.data.path}` });
      } else {
        setBackupStatus({ type: 'err', message: res?.error?.message ?? 'Backup gagal' });
      }
    } catch (err: any) {
      setBackupStatus({ type: 'err', message: err.message || 'Backup gagal' });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestore = async () => {
    setRestoreBusy(true);
    setBackupStatus(null);
    setError(null);
    try {
      const pick = await vyapara.pickRestoreFile({ token: '' });
      if (!pick?.ok || !pick.data?.path) {
        setBackupStatus({ type: 'info', message: 'Restore dibatalkan.' });
        return;
      }
      const ok = window.confirm(
        `Anda yakin ingin mengganti seluruh database dengan file backup ini?\n\n${pick.data.path}\n\nData saat ini akan digantikan. Cadangan otomatis disimpan dengan nama .pre-restore di lokasi asli sebelum diganti.`,
      );
      if (!ok) {
        setBackupStatus({ type: 'info', message: 'Restore dibatalkan.' });
        return;
      }
      const res = await vyapara.restoreDatabase({ token: '', backupPath: pick.data.path });
      if (res?.ok) {
        setBackupStatus({ type: 'ok', message: 'Restore berhasil. Aplikasi akan dimuat ulang.' });
        window.setTimeout(() => window.location.reload(), 1500);
      } else {
        setBackupStatus({ type: 'err', message: res?.error?.message ?? 'Restore gagal' });
      }
    } catch (err: any) {
      setBackupStatus({ type: 'err', message: err.message || 'Restore gagal' });
    } finally {
      setRestoreBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-vyapara-navy mb-2">Pengaturan & Administrasi</h1>
          <p className="text-vyapara-secondary">Profil toko, pengguna, peran, dan izin akses</p>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-vyapara-border overflow-hidden">
        <div className="p-4 border-b border-vyapara-border flex flex-wrap gap-2">
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'settings' ? 'bg-vyapara-blue text-white' : 'text-vyapara-text hover:bg-vyapara-surface'
            }`}
          >
            Pengaturan Aplikasi
          </button>
          {canWrite && (
            <button
              onClick={() => setTab('backup')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'backup' ? 'bg-vyapara-blue text-white' : 'text-vyapara-text hover:bg-vyapara-surface'
              }`}
            >
              Backup &amp; Restore
            </button>
          )}
          {canWrite && (
            <button
              onClick={() => setTab('users')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'users' ? 'bg-vyapara-blue text-white' : 'text-vyapara-text hover:bg-vyapara-surface'
              }`}
            >
              Pengguna
            </button>
          )}
          {canWrite && (
            <button
              onClick={() => setTab('roles')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'roles' ? 'bg-vyapara-blue text-white' : 'text-vyapara-text hover:bg-vyapara-surface'
              }`}
            >
              Peran
            </button>
          )}
          {canWrite && (
            <button
              onClick={() => setTab('permissions')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'permissions' ? 'bg-vyapara-blue text-white' : 'text-vyapara-text hover:bg-vyapara-surface'
              }`}
            >
              Izin Akses
            </button>
          )}
        </div>

        <div className="p-6">
          {tab === 'settings' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold text-vyapara-navy mb-4">Konfigurasi Aplikasi</h3>
              <form onSubmit={handleUpsertSetting} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Kunci Pengaturan *</label>
                  <input
                    type="text"
                    value={settingKey}
                    onChange={(e) => setSettingKey(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                    placeholder="store_name, tax_rate_bps, receipt_footer, dll"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Nilai *</label>
                  <input
                    type="text"
                    value={settingValue}
                    onChange={(e) => setSettingValue(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors"
                >
                  Simpan Pengaturan
                </button>
              </form>

              <div className="mt-8">
                <h4 className="text-sm font-medium text-vyapara-secondary mb-2">Pengaturan Saat Ini</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-vyapara-surface border-b border-vyapara-border">
                      <tr>
                        <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Kunci</th>
                        <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Nilai</th>
                        <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Diperbarui</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-vyapara-border">
                      {settings.map((s) => (
                        <tr key={s.key}>
                          <td className="px-6 py-4 text-sm font-mono">{s.key}</td>
                          <td className="px-6 py-4 text-sm">{s.value}</td>
                          <td className="px-6 py-4 text-sm text-vyapara-secondary">{s.updatedAt}</td>
                        </tr>
                      ))}
                      {settings.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-vyapara-secondary">
                            Belum ada pengaturan
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'backup' && canWrite && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-vyapara-navy mb-2">Backup &amp; Restore Database</h3>
                <p className="text-sm text-vyapara-secondary">Cadangkan seluruh data toko (transaksi, produk, pengguna, pengaturan) ke file <code>.vyapara-backup</code>, dan pulihkan kapan pun diperlukan.</p>
              </div>

              {backupStatus && (
                <div className={`text-sm rounded-lg px-4 py-3 border ${
                  backupStatus.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  backupStatus.type === 'err' ? 'bg-red-50 text-red-800 border-red-200' :
                  'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  <pre className="whitespace-pre-wrap font-sans">{backupStatus.message}</pre>
                </div>
              )}

              <div className="bg-vyapara-surface rounded-xl border border-vyapara-border p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-vyapara-navy">1. Buat Backup</h4>
                  <p className="text-xs text-vyapara-secondary mt-1">Membuat salinan database terenkripsi-integrity-check. Gunakan USB atau drive eksternal untuk cadangan offline.</p>
                  <button
                    onClick={handleBackup}
                    disabled={backupBusy}
                    className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-vyapara-navy text-white text-sm font-semibold rounded-lg hover:bg-vyapara-blue disabled:opacity-60 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    {backupBusy ? 'Sedang membuat cadangan…' : 'Buat Backup Sekarang'}
                  </button>
                </div>

                <div className="border-t border-vyapara-border pt-4">
                  <h4 className="text-sm font-bold text-vyapara-navy">2. Restore dari File</h4>
                  <p className="text-xs text-vyapara-secondary mt-1"><strong className="text-vyapara-red">Perhatian:</strong> mengganti seluruh database aktif. File asli akan disimpan sebagai <code>vyapara.db.pre-restore</code> sebelum diganti. Restart otomatis setelah restore.</p>
                  <button
                    onClick={handleRestore}
                    disabled={restoreBusy}
                    className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 border border-vyapara-red text-vyapara-red text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-60 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 10a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                    </svg>
                    {restoreBusy ? 'Sedang memulihkan…' : 'Restore dari File'}
                  </button>
                </div>
              </div>

              <div className="text-xs text-vyapara-secondary border border-vyapara-border rounded-lg p-4 bg-white">
                <p className="font-semibold text-vyapara-navy mb-1">Tips penyimpanan:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Simpan file <code>.vyapara-backup</code> di minimal 2 lokasi (mis. USB + cloud folder).</li>
                  <li>Backup sebaiknya dilakukan setiap akhir shift/minggu.</li>
                  <li>Jangan hapus file <code>.pre-restore</code> sampai yakin restore sudah benar.</li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'users' && canWrite && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold text-vyapara-navy mb-4">Manajemen Pengguna</h3>
              <form onSubmit={handleCreateUser} className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-vyapara-secondary mb-1">Nama *</label>
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-vyapara-secondary mb-1">Email *</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-vyapara-secondary mb-1">Kata Sandi *</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-vyapara-secondary mb-1">Peran *</label>
                    <select
                      value={userForm.roleId}
                      onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                    >
                      <option value="">Pilih peran</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors"
                >
                  Buat Pengguna
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-vyapara-surface border-b border-vyapara-border">
                    <tr>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Nama</th>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Email</th>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Peran</th>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vyapara-border">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 text-sm">{u.name}</td>
                        <td className="px-6 py-4 text-sm font-mono">{u.email}</td>
                        <td className="px-6 py-4 text-sm">{u.roleName || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Aktif
                          </span>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-vyapara-secondary">
                          Belum ada pengguna
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'roles' && canWrite && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold text-vyapara-navy mb-4">Manajemen Peran</h3>
              <form onSubmit={handleCreateRole} className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Nama Peran *</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vyapara-secondary mb-1">Deskripsi</label>
                  <input
                    type="text"
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-vyapara-border rounded-lg focus:ring-2 focus:ring-vyapara-blue outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-vyapara-navy hover:bg-vyapara-blue text-white rounded-lg font-medium transition-colors"
                >
                  Buat Peran
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-vyapara-surface border-b border-vyapara-border">
                    <tr>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Nama</th>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vyapara-border">
                    {roles.map((r) => (
                      <tr key={r.id}>
                        <td className="px-6 py-4 text-sm">{r.name}</td>
                        <td className="px-6 py-4 text-sm">{r.description || '-'}</td>
                      </tr>
                    ))}
                    {roles.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-vyapara-secondary">
                          Belum ada peran
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'permissions' && canWrite && (
            <div className="max-w-lg">
              <h3 className="text-lg font-bold text-vyapara-navy mb-4">Daftar Izin Akses</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-vyapara-surface border-b border-vyapara-border">
                    <tr>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Nama Izin</th>
                      <th className="px-6 py-3 text-sm font-medium text-vyapara-secondary">Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vyapara-border">
                    {permissions.map((p) => (
                      <tr key={p.name}>
                        <td className="px-6 py-4 text-sm font-mono">{p.name}</td>
                        <td className="px-6 py-4 text-sm">{p.description || '-'}</td>
                      </tr>
                    ))}
                    {permissions.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-vyapara-secondary">
                          Belum ada izin
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
