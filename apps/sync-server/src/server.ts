import { createServer } from 'node:http';
import { openSyncServerDb } from './db/open.js';
import { handleRequest, type SyncServerConfig } from './app.js';

export function createSyncServer(options: { dbPath: string; config: SyncServerConfig }) {
  const db = openSyncServerDb(options.dbPath);
  const server = createServer((req, res) => {
    void handleRequest(req, res, db, options.config);
  });
  return {
    db,
    server,
    listen(port = 0, host = '127.0.0.1') {
      return new Promise<import('node:net').AddressInfo>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          const addr = server.address();
          if (!addr || typeof addr === 'string') return reject(new Error('Failed to bind server'));
          resolve(addr);
        });
      });
    },
    async close() {
      await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
      db.close();
    },
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('server.ts')) {
  const dbPath = process.env.SYNC_DB_PATH ?? './data/sync-server.db';
  const enrollmentSecret = process.env.SYNC_ENROLLMENT_SECRET;
  if (!enrollmentSecret || enrollmentSecret.length < 16) {
    console.error('SYNC_ENROLLMENT_SECRET (>=16 chars) is required');
    process.exit(1);
  }
  const port = Number(process.env.PORT ?? 8787);
  const app = createSyncServer({
    dbPath,
    config: { enrollmentSecret, adminToken: process.env.SYNC_ADMIN_TOKEN || undefined },
  });
  app.listen(port).then((addr) => {
    console.log(`sync server listening on http://${addr.address}:${addr.port}`);
  });
}
