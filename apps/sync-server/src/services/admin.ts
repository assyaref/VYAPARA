import type { SyncServerDb } from '../db/open.js';

export type AdminOverview = {
  generatedAt: string;
  totals: {
    organizations: number;
    devices: number;
    activeDevices: number;
    revokedDevices: number;
    events: number;
    conflicts: number;
    duplicates: number;
  };
  organizations: {
    organizationId: string;
    name: string | null;
    devices: number;
    activeDevices: number;
    revokedDevices: number;
    revokedAll: boolean;
    events: number;
    conflicts: number;
    duplicates: number;
    lastEventAt: string | null;
  }[];
  topEventTypes: { event_type: string; count: number }[];
  devices: {
    deviceId: string;
    deviceName: string | null;
    organizationId: string;
    organizationName: string | null;
    status: string;
    tokenExpiresAt: string | null;
  }[];
};

export function adminOverview(db: SyncServerDb): AdminOverview {
  const orgRows = db.sqlite
    .prepare(
      `SELECT o.organization_id, o.name, o.created_at
       FROM sync_organizations o
       ORDER BY o.created_at ASC`,
    )
    .all() as { organization_id: string; name: string | null }[];

  const deviceRows = db.sqlite
    .prepare(
      `SELECT organization_id,
              COUNT(*) AS devices,
              COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active_devices,
              COALESCE(SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END), 0) AS revoked_devices
       FROM sync_devices GROUP BY organization_id`,
    )
    .all() as { organization_id: string; devices: number; active_devices: number; revoked_devices: number }[];

  const eventRows = db.sqlite
    .prepare(
      `SELECT organization_id,
              COUNT(*) AS events,
              MAX(received_at) AS last_event_at,
              COALESCE(SUM(CASE WHEN ingest_status = 'conflict' THEN 1 ELSE 0 END), 0) AS conflicts,
              COALESCE(SUM(CASE WHEN ingest_status = 'duplicate' THEN 1 ELSE 0 END), 0) AS duplicates
       FROM sync_events GROUP BY organization_id`,
    )
    .all() as { organization_id: string; events: number; last_event_at: string | null; conflicts: number; duplicates: number }[];

  const deviceByOrg = new Map(deviceRows.map((r) => [r.organization_id, r]));
  const eventsByOrg = new Map(eventRows.map((r) => [r.organization_id, r]));

  const organizations = orgRows.map((o) => {
    const d = deviceByOrg.get(o.organization_id);
    const ev = eventsByOrg.get(o.organization_id);
    const devices = d?.devices ?? 0;
    const activeDevices = d?.active_devices ?? 0;
    const revokedDevices = d?.revoked_devices ?? 0;
    return {
      organizationId: o.organization_id,
      name: o.name,
      devices,
      activeDevices,
      revokedDevices,
      revokedAll: devices > 0 && activeDevices === 0,
      events: ev?.events ?? 0,
      conflicts: ev?.conflicts ?? 0,
      duplicates: ev?.duplicates ?? 0,
      lastEventAt: ev?.last_event_at ?? null,
    };
  });

  const totals = organizations.reduce(
    (acc, o) => ({
      organizations: acc.organizations + 1,
      devices: acc.devices + o.devices,
      activeDevices: acc.activeDevices + o.activeDevices,
      revokedDevices: acc.revokedDevices + o.revokedDevices,
      events: acc.events + o.events,
      conflicts: acc.conflicts + o.conflicts,
      duplicates: acc.duplicates + o.duplicates,
    }),
    {
      organizations: 0,
      devices: 0,
      activeDevices: 0,
      revokedDevices: 0,
      events: 0,
      conflicts: 0,
      duplicates: 0,
    },
  );

  const topEventTypes = db.sqlite
    .prepare(
      `SELECT event_type, COUNT(*) AS count
       FROM sync_events
       GROUP BY event_type
       ORDER BY count DESC
       LIMIT 8`,
    )
    .all() as { event_type: string; count: number }[];

  const devices = db.sqlite
    .prepare(
      `SELECT d.device_id, d.device_name, d.organization_id, o.name AS organization_name,
              d.status, d.token_expires_at
       FROM sync_devices d
       LEFT JOIN sync_organizations o ON o.organization_id = d.organization_id
       ORDER BY d.created_at DESC
       LIMIT 25`,
    )
    .all() as { device_id: string; device_name: string | null; organization_id: string; organization_name: string | null; status: string; token_expires_at: string | null }[];

  return {
    generatedAt: new Date().toISOString(),
    totals,
    organizations,
    topEventTypes,
    devices: devices.map((d) => ({
      deviceId: d.device_id,
      deviceName: d.device_name,
      organizationId: d.organization_id,
      organizationName: d.organization_name,
      status: d.status,
      tokenExpiresAt: d.token_expires_at,
    })),
  };
}
