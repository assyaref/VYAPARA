import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AppDatabase } from '../db/open';
import { AppError } from '../errors';

function assertIntegrity(filePath: string): void {
  const probe = new Database(filePath, { readonly: true, fileMustExist: true });
  try {
    const result = probe.pragma('integrity_check', { simple: true });
    if (result !== 'ok') {
      throw new AppError('BACKUP_INVALID', 'Berkas basis data tidak lolos pemeriksaan integritas');
    }
  } finally {
    probe.close();
  }
}

export async function backupDatabase(db: AppDatabase, destination: string): Promise<string> {
  const directory = path.dirname(destination);
  fs.mkdirSync(directory, { recursive: true });
  await db.sqlite.backup(destination);
  assertIntegrity(destination);
  return destination;
}

export async function restoreDatabase(db: AppDatabase, backupPath: string): Promise<void> {
  const source = path.resolve(backupPath);
  const live = path.resolve(db.path);
  if (source === live) {
    throw new AppError('VALIDATION', 'Berkas cadangan tidak boleh sama dengan basis data yang sedang dipakai');
  }
  if (!fs.existsSync(source)) {
    throw new AppError('NOT_FOUND', 'Berkas cadangan tidak ditemukan');
  }
  assertIntegrity(source);

  const safety = `${live}.pre-restore`;
  await db.sqlite.backup(safety);
  db.sqlite.close();
  try {
    fs.copyFileSync(source, live);
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = `${live}${suffix}`;
      if (fs.existsSync(sidecar)) {
        fs.rmSync(sidecar);
      }
    }
    db.reopen();
    assertIntegrity(live);
  } catch (error) {
    if (fs.existsSync(safety)) {
      fs.copyFileSync(safety, live);
      for (const suffix of ['-wal', '-shm']) {
        const sidecar = `${live}${suffix}`;
        if (fs.existsSync(sidecar)) {
          fs.rmSync(sidecar);
        }
      }
    }
    if (!db.sqlite.open) {
      db.reopen();
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('RESTORE_FAILED', 'Pemulihan dibatalkan. Basis data sebelumnya dikembalikan.');
  }
}
