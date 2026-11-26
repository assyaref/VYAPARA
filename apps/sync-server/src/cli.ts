import { createSyncServer } from './server.js';
import { backupConfigFromEnv, createBackupService } from './services/backup.js';

const dbPath = process.env.SYNC_DB_PATH ?? './data/sync-server.db';
const enrollmentSecret = process.env.SYNC_ENROLLMENT_SECRET;
if (!enrollmentSecret || enrollmentSecret.length < 16) {
  console.error('SYNC_ENROLLMENT_SECRET (>=16 chars) is required');
  process.exit(1);
}
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0'; // containers must bind all interfaces; set HOST=127.0.0.1 to restrict
const config: import('./app.js').SyncServerConfig = { enrollmentSecret, adminToken: process.env.SYNC_ADMIN_TOKEN || undefined };
const app = createSyncServer({ dbPath, config });
const backupCfg = backupConfigFromEnv(process.env);
if (backupCfg) {
  config.backup = createBackupService(app.db, backupCfg);
  config.backup.start();
  console.log(`backups enabled: every ${backupCfg.intervalHours}h to bucket ${backupCfg.s3.bucket}/${config.backup.prefix}, keep ${backupCfg.retentionDays} days`);
} else {
  console.log('backups disabled: set BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID, BACKUP_S3_SECRET_ACCESS_KEY');
}
const addr = await app.listen(port, host);
console.log(`sync server listening on http://${addr.address}:${addr.port}`);
