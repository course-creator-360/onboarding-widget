import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export type OnboardingStatus = {
  locationId: string;
  domainConnected: boolean;
  courseCreated: boolean;
  productAttached: boolean;
  paymentIntegrated: boolean;
  dismissed: boolean;
  updatedAt: number;
  createdAt: number;
};

export type Installation = {
  locationId: string;
  accountId?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: 'agency' | 'location'; // Track if it's agency-level or location-specific
  updatedAt: number;
  createdAt: number;
};

const dataRoot = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp/onboarding-data' : path.join(process.cwd(), 'data'));
const dataDir = dataRoot;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS installations (
  location_id TEXT PRIMARY KEY,
  account_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER,
  scope TEXT,
  token_type TEXT DEFAULT 'location',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS onboarding (
  location_id TEXT PRIMARY KEY,
  domain_connected INTEGER NOT NULL DEFAULT 0,
  course_created INTEGER NOT NULL DEFAULT 0,
  product_attached INTEGER NOT NULL DEFAULT 0,
  payment_integrated INTEGER NOT NULL DEFAULT 0,
  dismissed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id TEXT,
  event_type TEXT,
  payload TEXT,
  created_at INTEGER NOT NULL
);
`);

export function ensureOnboardingRow(locationId: string): void {
  const now = Date.now();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO onboarding (
      location_id, domain_connected, course_created, product_attached,
      payment_integrated, dismissed, created_at, updated_at
    ) VALUES (@location_id, 0, 0, 0, 0, 0, @created_at, @updated_at)
  `);
  insert.run({ location_id: locationId, created_at: now, updated_at: now });
}

export function getOnboardingStatus(locationId: string): OnboardingStatus {
  ensureOnboardingRow(locationId);
  const row = db.prepare(`
    SELECT location_id, domain_connected, course_created, product_attached,
           payment_integrated, dismissed, created_at, updated_at
    FROM onboarding WHERE location_id = ?
  `).get(locationId) as any;

  return {
    locationId: row.location_id,
    domainConnected: !!row.domain_connected,
    courseCreated: !!row.course_created,
    productAttached: !!row.product_attached,
    paymentIntegrated: !!row.payment_integrated,
    dismissed: !!row.dismissed,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function updateOnboardingStatus(
  locationId: string,
  updates: Partial<Omit<OnboardingStatus, 'locationId' | 'createdAt' | 'updatedAt'>>
): OnboardingStatus {
  ensureOnboardingRow(locationId);
  const current = getOnboardingStatus(locationId);
  const merged = {
    domainConnected: updates.domainConnected ?? current.domainConnected,
    courseCreated: updates.courseCreated ?? current.courseCreated,
    productAttached: updates.productAttached ?? current.productAttached,
    paymentIntegrated: updates.paymentIntegrated ?? current.paymentIntegrated,
    dismissed: updates.dismissed ?? current.dismissed
  };
  const now = Date.now();
  db.prepare(`
    UPDATE onboarding SET
      domain_connected = @domain_connected,
      course_created = @course_created,
      product_attached = @product_attached,
      payment_integrated = @payment_integrated,
      dismissed = @dismissed,
      updated_at = @updated_at
    WHERE location_id = @location_id
  `).run({
    domain_connected: merged.domainConnected ? 1 : 0,
    course_created: merged.courseCreated ? 1 : 0,
    product_attached: merged.productAttached ? 1 : 0,
    payment_integrated: merged.paymentIntegrated ? 1 : 0,
    dismissed: merged.dismissed ? 1 : 0,
    updated_at: now,
    location_id: locationId
  });
  return getOnboardingStatus(locationId);
}

export function setDismissed(locationId: string, dismissed: boolean): OnboardingStatus {
  return updateOnboardingStatus(locationId, { dismissed });
}

export function logEvent(locationId: string, eventType: string, payload: unknown): void {
  db.prepare(`INSERT INTO event_log (location_id, event_type, payload, created_at)
              VALUES (?, ?, ?, ?)`)
    .run(locationId, eventType, JSON.stringify(payload ?? {}), Date.now());
}

export function upsertInstallation(data: Omit<Installation, 'createdAt' | 'updatedAt'>): Installation {
  const now = Date.now();
  db.prepare(`
    INSERT INTO installations (
      location_id, account_id, access_token, refresh_token, expires_at, scope, token_type, created_at, updated_at
    ) VALUES (@location_id, @account_id, @access_token, @refresh_token, @expires_at, @scope, @token_type, @created_at, @updated_at)
    ON CONFLICT(location_id) DO UPDATE SET
      account_id = excluded.account_id,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      scope = excluded.scope,
      token_type = excluded.token_type,
      updated_at = excluded.updated_at
  `).run({
    location_id: data.locationId,
    account_id: data.accountId ?? null,
    access_token: data.accessToken,
    refresh_token: data.refreshToken ?? null,
    expires_at: data.expiresAt ?? null,
    scope: data.scope ?? null,
    token_type: data.tokenType ?? 'location',
    created_at: now,
    updated_at: now
  });
  return getInstallation(data.locationId)!;
}

export function getInstallation(locationId: string): Installation | undefined {
  const row = db.prepare(`
    SELECT location_id, account_id, access_token, refresh_token, expires_at, scope, token_type, created_at, updated_at
    FROM installations WHERE location_id = ?
  `).get(locationId) as any;
  if (!row) return undefined;
  return {
    locationId: row.location_id,
    accountId: row.account_id ?? undefined,
    accessToken: row.access_token,
    refreshToken: row.refresh_token ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    scope: row.scope ?? undefined,
    tokenType: row.token_type as 'agency' | 'location' | undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function findInstallationByAccountId(accountId: string): Installation | undefined {
  const row = db.prepare(`
    SELECT location_id, account_id, access_token, refresh_token, expires_at, scope, token_type, created_at, updated_at
    FROM installations WHERE account_id = ?
  `).get(accountId) as any;
  if (!row) return undefined;
  return {
    locationId: row.location_id,
    accountId: row.account_id ?? undefined,
    accessToken: row.access_token,
    refreshToken: row.refresh_token ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    scope: row.scope ?? undefined,
    tokenType: row.token_type as 'agency' | 'location' | undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getAgencyInstallation(): Installation | undefined {
  const row = db.prepare(`
    SELECT location_id, account_id, access_token, refresh_token, expires_at, scope, token_type, created_at, updated_at
    FROM installations WHERE token_type = 'agency' LIMIT 1
  `).get() as any;
  if (!row) return undefined;
  return {
    locationId: row.location_id,
    accountId: row.account_id ?? undefined,
    accessToken: row.access_token,
    refreshToken: row.refresh_token ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    scope: row.scope ?? undefined,
    tokenType: row.token_type as 'agency' | 'location' | undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function hasAgencyAuthorization(): boolean {
  const installation = getAgencyInstallation();
  return !!installation && !!installation.accessToken;
}

export function deleteInstallation(locationId: string): void {
  db.prepare('DELETE FROM installations WHERE location_id = ?').run(locationId);
}

export default db;



