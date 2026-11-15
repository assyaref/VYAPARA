import React, { useCallback, useEffect, useState } from 'react';
import type { SyncStatusSnapshot } from './vyapara';

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
  );
};

export default OfflineSync;
