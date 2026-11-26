# VYAPARA sync server — production container image
# Multi-stage build: stage 1 bundles the source (esbuild, no npm workspaces required),
# stage 2 is a small non-root runtime.
#
# Build from the REPOSITORY ROOT (Docker context = repo root):
#   docker build -f deploy/Dockerfile -t vyapara-sync:latest .
# Run:
#   docker run -d --name vyapara-sync --restart unless-stopped \
#     -p 127.0.0.1:8787:8787 -v vyapara-sync-data:/data --env-file deploy/.env vyapara-sync:latest
#
# The sync server stores only sync metadata + replicated outbox events; the
# SQLite database lives at /data/sync-server.db — back it up (sqlite3 .backup).

# ---------- build stage ----------
FROM node:20-bookworm-slim AS build
WORKDIR /build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Source needed for the bundle: sync server + shared package (consumed as TS source)
COPY apps/sync-server ./apps/sync-server
COPY packages/shared ./packages/shared

# zod for the bundle; better-sqlite3 built here for the runtime copy
RUN npm install --no-save zod@4.6.7 better-sqlite3@12.8.0

# Self-contained bundle: zod + shared code inline; only better-sqlite3 is external.
RUN npx --yes esbuild@0.27.0 apps/sync-server/src/cli.ts \
      --bundle --format=esm --platform=node --target=node20 \
      --external:better-sqlite3 \
      --alias:vyapara-shared=/build/packages/shared/src/index.ts \
      --outfile=apps/sync-server/dist/server.mjs

# ---------- runtime stage ----------
FROM node:20-bookworm-slim
ENV NODE_ENV=production \
    PORT=8787 \
    SYNC_DB_PATH=/data/sync-server.db

WORKDIR /opt/vyapara

RUN groupadd -r vyapara \
  && useradd -r -g vyapara -d /opt/vyapara vyapara \
  && mkdir -p /data \
  && chown -R vyapara:vyapara /data /opt/vyapara

# Native dependency: built in the build stage's package manager
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && npm install --no-save better-sqlite3@12.8.0 \
  && npm cache clean --force \
  && apt-get purge -y python3 make g++ \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/* /root/.npm

COPY --from=build --chown=vyapara:vyapara /build/apps/sync-server/dist/server.mjs /opt/vyapara/server.mjs
COPY --chown=vyapara:vyapara apps/sync-server/migrations /opt/vyapara/migrations

# /data is a mount point: docker-compose declares a named volume; on Railway attach a volume at /data.
# (No VOLUME instruction: Railway rejects it in Dockerfiles.)
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/v1/sync/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

USER vyapara
CMD ["node", "server.mjs"]
