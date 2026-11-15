import type { AppDatabase } from '../db/open';
import { createSyncCoordinator, type SyncCoordinator } from './coordinator';

let coordinator: SyncCoordinator | null = null;

export function initSyncCoordinator(db: AppDatabase): SyncCoordinator {
  if (!coordinator) {
    coordinator = createSyncCoordinator({ db });
  }
  return coordinator;
}

export function getSyncCoordinator(): SyncCoordinator | null {
  return coordinator;
}
