import { createSyncServer } from './server.js';

const dbPath = process.env.SYNC_DB_PATH ?? './data/sync-server.db';
const enrollmentSecret = process.env.SYNC_ENROLLMENT_SECRET;
if (!enrollmentSecret || enrollmentSecret.length < 16) {
  console.error('SYNC_ENROLLMENT_SECRET (>=16 chars) is required');
  process.exit(1);
}
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0'; // containers must bind all interfaces; set HOST=127.0.0.1 to restrict
const app = createSyncServer({
  dbPath,
  config: { enrollmentSecret, adminToken: process.env.SYNC_ADMIN_TOKEN || undefined },
});
const addr = await app.listen(port, host);
console.log(`sync server listening on http://${addr.address}:${addr.port}`);
