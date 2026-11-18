CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  key_hash TEXT NOT NULL UNIQUE,
  key_masked TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  organization_name TEXT,
  status TEXT NOT NULL CHECK(status IN ('active', 'revoked', 'expired')) DEFAULT 'active',
  max_activations INTEGER NOT NULL DEFAULT 1,
  activated_count INTEGER NOT NULL DEFAULT 0,
  device_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  activated_at TEXT,
  revoked_at TEXT,
  expires_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES sync_organizations(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_licenses_org ON licenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
