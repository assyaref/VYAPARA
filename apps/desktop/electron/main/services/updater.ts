/**
 * VYAPARA auto-update service — thin wrapper around electron-updater.
 *
 * Strategy:
 *  - Checks GitHub Releases for a newer version on startup (packaged builds only).
 *  - Downloads only when the user confirms (autoDownload = false).
 *  - Renderer receives status pushes via `update:status` events and can trigger
 *    check/download/install through IPC handlers wired in main.ts.
 *  - When latest.yml or the release assets are missing (e.g. repo has no
 *    release yet), the update check fails gracefully with a readable message.
 */
import { app } from 'electron';

type UpdateStatus = {
  phase: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error';
  currentVersion: string;
  latestVersion?: string;
  downloadPercent?: number;
  message?: string;
};

let status: UpdateStatus = { phase: 'idle', currentVersion: app.getVersion() };
let notifyRenderer: ((s: UpdateStatus) => void) | null = null;

function setStatus(next: UpdateStatus) {
  status = next;
  notifyRenderer?.(status);
}

export function getUpdateStatus(): UpdateStatus {
  return { ...status };
}

export function onUpdateStatus(listener: (s: UpdateStatus) => void) {
  notifyRenderer = listener;
}

async function loadAutoUpdater() {
  // electron-updater is only usable in packaged apps with a publish target.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { autoUpdater } = await import('electron-updater');
  return autoUpdater;
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    setStatus({ phase: 'not-available', currentVersion: app.getVersion(), message: 'Update hanya tersedia di aplikasi terinstal (bukan dev mode)' });
    return { ...status };
  }
  setStatus({ phase: 'checking', currentVersion: app.getVersion() });
  try {
    const autoUpdater = await loadAutoUpdater();
    autoUpdater.autoDownload = false;
    autoUpdater.logger = null;
    autoUpdater.on('update-available', (info) => {
      setStatus({ phase: 'available', currentVersion: app.getVersion(), latestVersion: info.version });
    });
    autoUpdater.on('update-not-available', () => {
      setStatus({ phase: 'not-available', currentVersion: app.getVersion() });
    });
    autoUpdater.on('download-progress', (progress) => {
      setStatus({ phase: 'downloading', currentVersion: app.getVersion(), latestVersion: status.latestVersion, downloadPercent: Math.round(progress.percent) });
    });
    autoUpdater.on('update-downloaded', (info) => {
      setStatus({ phase: 'downloaded', currentVersion: app.getVersion(), latestVersion: info.version });
    });
    autoUpdater.on('error', (error) => {
      setStatus({ phase: 'error', currentVersion: app.getVersion(), message: error?.message || 'Gagal memeriksa pembaruan' });
    });
    const result = await autoUpdater.checkForUpdates();
    if (status.phase !== 'available' && result?.updateInfo?.version && result.updateInfo.version !== app.getVersion()) {
      // Fallback: electron-updater may resolve without emitting the event in some versions
      setStatus({ phase: 'available', currentVersion: app.getVersion(), latestVersion: result.updateInfo.version });
    }
    return { ...status };
  } catch (error: any) {
    const message = error?.message || 'Update check gagal (release belum tersedia atau repo private)';
    setStatus({ phase: 'error', currentVersion: app.getVersion(), message });
    return { ...status };
  }
}

export async function downloadUpdate(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    setStatus({ phase: 'not-available', currentVersion: app.getVersion(), message: 'Update hanya tersedia di aplikasi terinstal' });
    return { ...status };
  }
  try {
    const autoUpdater = await loadAutoUpdater();
    await autoUpdater.downloadUpdate();
    return { ...status };
  } catch (error: any) {
    setStatus({ phase: 'error', currentVersion: app.getVersion(), latestVersion: status.latestVersion, message: error?.message || 'Gagal mengunduh pembaruan' });
    return { ...status };
  }
}

export async function installUpdate(): Promise<void> {
  if (!app.isPackaged) return;
  try {
    const { autoUpdater } = await import('electron-updater');
    autoUpdater.quitAndInstall(false, true);
  } catch {
    app.exit(0);
  }
}
