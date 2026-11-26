import React, { useCallback, useEffect, useState } from 'react';
import type { SyncConnection, SyncStatusSnapshot } from './vyapara';

const initial: SyncStatusSnapshot = {
  phase: 'idle',
  online: navigator.onLine,
  lastSyncAt: null,
  pendingCount: 0,
  failedCount: 0,
  lastError: null,
  retryAt: null,
  inProgress: false,
};

function phaseLabel(phase: SyncStatusSnapshot['phase']): string {
  switch (phase) {
    case 'idle': return 'Idle';
    case 'connecting': return 'Menghubungkan';
    case 'uploading': return 'Mengunggah';
    case 'downloading': return 'Mengunduh';
    case 'applying': return 'Menerapkan';
    case 'retrying': return 'Mencoba ulang';
    case 'offline': return 'Offline';
    case 'error': return 'Error';
    default: return phase;
  }
}

const inputCls = 'w-full rounded-md border border-vyapara-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vyapara-blue';

const SyncConnectionPanel: React.FC<{ onConnected: () => void }> = ({ onConnected }) => {
  const [conn, setConn] = useState<SyncConnection | null>(null);
  const [editing, setEditing] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await (window as any).vyapara?.syncGetConnection?.();
      if (res?.ok && res.data) {
        const c = res.data as SyncConnection;
        setConn(c);
        setServerUrl((cur) => cur || c.apiBaseUrl || c.licenseServerUrl || '');
      }
    } catch {
      // panel stays in its empty state
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await (window as any).vyapara?.syncEnroll?.({
        apiBaseUrl: serverUrl,
        enrollmentSecret: secret,
        deviceName: deviceName || undefined,
      });
      if (res?.ok) {
        setSecret('');
        setEditing(false);
        setNotice('Perangkat tersambung. Sinkronisasi pertama berjalan otomatis.');
        await load();
        onConnected();
      } else {
        setError(res?.error?.message ?? 'Gagal menyambungkan ke server sync');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Gagal menyambungkan ke server sync');
    } finally {
      setSaving(false);
    }
  };

  const showForm = editing || (conn !== null && !conn.enrolled);
  const differentHost = !!conn?.apiBaseUrl && !!conn?.licenseServerUrl && conn.apiBaseUrl !== conn.licenseServerUrl;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-vyapara-border max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-vyapara-secondary">Server Sinkronisasi</div>
          <div className="text-lg font-semibold">
            {conn === null ? 'Memuat…' : conn.enrolled ? 'Tersambung' : 'Belum tersambung'}
          </div>
        </div>
        {conn?.enrolled && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-md border border-vyapara-border text-sm">
            Ganti Server
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm">
        <div><span className="text-vyapara-secondary">Lisensi dari:</span> {conn?.licenseServerUrl || '-'}{conn?.licenseOrganizationName ? ` · ${conn.licenseOrganizationName}` : ''}</div>
        {conn?.enrolled && (
          <>
            <div className="break-all"><span className="text-vyapara-secondary">Sync ke:</span> {conn.apiBaseUrl}{differentHost ? ' (server terpisah)' : ''}</div>
            <div><span className="text-vyapara-secondary">Token berlaku s/d:</span> {conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).toLocaleString() : '-'}</div>
          </>
        )}
      </div>

      {notice && <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded p-3">{notice}</div>}

      {showForm && (
        <form onSubmit={submit} className="space-y-3 border-t border-vyapara-border pt-4">
          <p className="text-xs text-vyapara-secondary">
            Server sync boleh berbeda dari server lisensi. Data tetap terikat ke organisasi pada lisensi yang aktif.
          </p>
          <label className="block text-sm">
            <span className="text-vyapara-secondary">URL server sync</span>
            <input id="sync-server-url" className={inputCls} value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://sync.contoh.com" required />
          </label>
          <label className="block text-sm">
            <span className="text-vyapara-secondary">Kode pendaftaran (SYNC_ENROLLMENT_SECRET di server sync)</span>
            <input id="sync-enrollment-secret" type="password" autoComplete="off" className={inputCls} value={secret} onChange={(e) => setSecret(e.target.value)} minLength={16} required />
          </label>
          <label className="block text-sm">
            <span className="text-vyapara-secondary">Nama perangkat (opsional)</span>
            <input id="sync-device-name" className={inputCls} value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="Kasir 1" maxLength={120} />
          </label>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-vyapara-blue text-white disabled:opacity-50">
              {saving ? 'Menyambungkan…' : 'Sambungkan'}
            </button>
            {conn?.enrolled && (
              <button type="button" onClick={() => { setEditing(false); setError(null); }} className="px-4 py-2 rounded-md border border-vyapara-border">
                Batal
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

const OfflineSync: React.FC = () => {
  const [status, setStatus] = useState<SyncStatusSnapshot>(initial);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await (window as any).vyapara?.syncGetStatus?.();
      if (res?.ok && res.data) setStatus(res.data);
      else setStatus((s) => ({ ...s, online: navigator.onLine }));
    } catch {
      setStatus((s) => ({ ...s, online: navigator.onLine }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    const on = () => void refresh();
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => { clearInterval(t); window.removeEventListener('online', on); window.removeEventListener('offline', on); };
  }, [refresh]);

  const trigger = async () => {
    setBusy(true);
    try {
      const res = await (window as any).vyapara?.syncTrigger?.();
      if (res?.ok && res.data) setStatus(res.data);
      else await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-vyapara-surface text-vyapara-text font-inter">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-vyapara-navy">Offline Sync</h1>
        <p className="text-vyapara-secondary">Status sinkronisasi perangkat (Phase 4.3)</p>
      </header>

      <div className="space-y-6">
      <SyncConnectionPanel onConnected={() => void refresh()} />

      <div className="bg-white rounded-xl p-6 shadow-sm border border-vyapara-border max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-vyapara-secondary">Status</div>
            <div className="text-lg font-semibold">{phaseLabel(status.phase)}</div>
          </div>
          <button
            onClick={trigger}
            disabled={busy || status.inProgress}
            className="px-4 py-2 rounded-md bg-vyapara-blue text-white disabled:opacity-50"
          >
            {busy || status.inProgress ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-vyapara-secondary">Konektivitas:</span> {status.online ? 'Online' : 'Offline'}</div>
          <div><span className="text-vyapara-secondary">Terakhir sukses:</span> {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : '-'}</div>
          <div><span className="text-vyapara-secondary">Event tertunda:</span> {status.pendingCount}</div>
          <div><span className="text-vyapara-secondary">Event gagal/konflik:</span> {status.failedCount}</div>
          <div><span className="text-vyapara-secondary">Coba ulang:</span> {status.retryAt ? new Date(status.retryAt).toLocaleString() : '-'}</div>
          <div><span className="text-vyapara-secondary">Berjalan:</span> {status.inProgress ? 'Ya' : 'Tidak'}</div>
        </div>

        {status.lastError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            <span className="font-medium">Ringkasan error:</span> {status.lastError}
          </div>
        )}

        <p className="text-xs text-vyapara-secondary">
          Token perangkat disimpan aman di main process; renderer hanya menerima status non-sensitif. Transaksi lokal tetap berjalan saat offline.
        </p>
      </div>
      </div>
    </div>
  );
};

export default OfflineSync;
