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
