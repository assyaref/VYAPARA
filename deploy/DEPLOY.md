# VYAPARA — Staging / Production Deployment Runbook (sync server)

Target: a Linux VPS (or Docker host) running the VYAPARA sync server.
This runbook is executed **by the owner**. Nothing here is applied automatically.

## Architecture

```
[VYAPARA POS (per outlet)] ── HTTPS ──> [nginx/TLS] ──> [vyapara-sync container :8787] ──> SQLite (/data/sync-server.db)
                                                  │
                                                  └── serves /admin (owner dashboard)
```

## Prerequisites

- A Linux VPS (Ubuntu 22.04+ or Debian 12+) with Docker Engine + Compose plugin
- A domain (e.g. `sync.vyapara.example.com`) A-record → VPS IP
- TLS certificate via certbot (`sudo apt install certbot python3-certbot-nginx`)
- Firewall: allow 80/443 only; 8787 stays internal (nginx proxies to it)

## 1. Build the image

The image contains **no application secrets**. `better-sqlite3` is compiled from source
inside the build stage; the runtime stage carries only the bundle + native module.

```bash
# from the repository root
docker build -f deploy/Dockerfile -t vyapara-sync:latest .
```

## 2. Configure

```bash
cd deploy
cp .env.example .env
$EDITOR .env   # set SYNC_ENROLLMENT_SECRET (>=16 chars, random) and SYNC_ADMIN_TOKEN (long & random)
chmod 600 .env
```

Generate strong secrets:

```bash
openssl rand -hex 32   # use one for SYNC_ENROLLMENT_SECRET, another for SYNC_ADMIN_TOKEN
```

## 3. Run

```bash
docker compose up -d --build
docker compose logs -f sync
curl http://127.0.0.1:8787/v1/sync/health
# {"ok":true,"data":{"status":"ok","time":"..."}}
```

## 4. TLS termination (nginx)

Example `/etc/nginx/sites-available/vyapara-sync.conf` (then `ln -s` into sites-enabled):

```nginx
server {
    listen 80;
    server_name sync.vyapara.example.com;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    server_name sync.vyapara.example.com;

    ssl_certificate     /etc/letsencrypt/live/sync.vyapara.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sync.vyapara.example.com/privkey.pem;

    add_header X-Content-Type-Options nosniff always;
    client_max_body_size 2m;          # sync server enforces 1MB per body anyway

    # Rate limit the admin dashboard — adjust to your needs
    limit_req_zone $binary_remote_addr zone=admin:10m rate=10r/s;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }
}
```

Then:

```bash
sudo certbot --nginx -d sync.vyapara.example.com
sudo nginx -t && sudo systemctl reload nginx
curl https://sync.vyapara.example.com/v1/sync/health
```

## 5. Operate

| Action | Command |
|---|---|
| Health | `curl https://<host>/v1/sync/health` |
| Logs | `docker compose logs -f sync` |
| Restart | `docker compose restart sync` |
| Upgrade | build new image → `docker compose up -d --build` |
| Backup DB | `docker compose exec sync node -e "const db=require('better-sqlite3')('/data/sync-server.db',{readonly:true});db.backup('/data/backup-'+Date.now()+'.db')"` then copy `/data/backup-*.db` off-host |
| Dashboard | `https://<host>/admin` — paste `SYNC_ADMIN_TOKEN` |

## 6. Staging acceptance checklist (after deploy)

1. `curl https://<host>/v1/sync/health` → `"status":"ok"`
2. Register a test device from the POS desktop app (Offline Sync → register) → token issued
3. Create a sale offline → sync → query `https://<host>/admin/api/overview` with admin token → `events ≥ 1`
4. Revoke the test device via `POST /v1/sync/devices/revoke` with admin token → POS shows device unauthorized
5. Reload the POS with network unplugged → app still opens and logs in (offline-first)
6. Re-enable network → POS re-syncs (retry counter increments)

Only then declare staging acceptance. Record results in `PHASE_12_STAGING_ACCEPTANCE.md`.

## Notes & limits

- The sync server stores metadata + outbox payloads; it is **not** a general app
  database backup. Keep daily SQLite backups off-host (section 5).
- `SYNC_ADMIN_TOKEN` must be ≥ 32 random chars; rotate it by editing `.env` +
  `docker compose up -d --force-recreate`.
- Do **not** expose port 8787 publicly; nginx/TLS is the only intended entrypoint.
- Auto-updates for the desktop POS are configured via GitHub releases (see RUNBOOK below) —
  the sync server does not deploy itself.

## Automatic off-site backups (S3-compatible bucket)

The sync server backs up its own SQLite database when these variables are set
(on Railway, reference the Storage Bucket's variables):

```
BACKUP_S3_ENDPOINT=...            # e.g. https://t3.storageapi.dev
BACKUP_S3_BUCKET=...
BACKUP_S3_ACCESS_KEY_ID=...
BACKUP_S3_SECRET_ACCESS_KEY=...
BACKUP_S3_REGION=auto             # optional
BACKUP_S3_URL_STYLE=virtual       # optional: virtual (default) or path
BACKUP_INTERVAL_HOURS=24          # optional
BACKUP_RETENTION_DAYS=14          # optional; the newest 3 are always kept
BACKUP_PREFIX=vyapara-sync/       # optional
```

Each backup is an online SQLite snapshot, checked with `PRAGMA integrity_check`,
gzipped and uploaded as `<prefix>sync-server-<timestamp>.db.gz`. The server checks
every hour (and one minute after start) and backs up only when the newest object is
older than the interval, so a host that sleeps still catches up on wake.

Admin API (Bearer `SYNC_ADMIN_TOKEN`):

- `GET  /admin/backups` — list backups, last success, last error
- `POST /admin/backups/run` — run a backup now

### Restore

1. Download the chosen `.db.gz` from the bucket and unzip it: `gunzip sync-server-<ts>.db.gz`.
2. Stop the sync server (or scale it to 0).
3. Replace `/data/sync-server.db` with the restored file and delete any `sync-server.db-wal` / `-shm` next to it.
4. Start the server and check `/v1/sync/health` and the `/admin` dashboard.

Note: events that devices uploaded *after* the backup was taken are not on the
restored server. Devices mark events as synced once acknowledged and do not re-send
them, so those events stay only in each outlet's local SQLite. Keep the interval
short enough for the data you can afford to re-enter or re-import.
