import { PrismaClient } from '@prisma/client';

// Prisma Client singleton for serverless environments
// Prevents connection pool exhaustion in Vercel/serverless
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Initialize Prisma Client with serverless-optimized settings
const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Optimize for serverless - shorter timeouts and fewer connections
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL,
    },
  },
});

// Reuse Prisma Client in development (hot reload)
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Export types
export type OnboardingStatus = {
  locationId: string;
  locationVerified: boolean;
  domainConnected: boolean;
  courseCreated: boolean;
  paymentIntegrated: boolean;
  dismissed: boolean;
  updatedAt: number;
  createdAt: number;
  shouldShowWidget: boolean;
  allTasksCompleted: boolean; // Helper for widget to know when to show completion dialog
};

export type Installation = {
  locationId: string;
  accountId?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: 'agency' | 'location';
  updatedAt: number;
  createdAt: number;
};

export type SubAccount = {
  id: string;
  locationId: string;
  accountId: string;
  locationName?: string;
  companyId?: string;
  firstAccessedAt: number;
  lastAccessedAt: number;
  isActive: boolean;
  metadata?: any;
};

// Helper to convert Date to timestamp
function dateToTimestamp(date: Date): number {
  return date.getTime();
}

// Helper to convert BigInt to number (for expiresAt)
function bigIntToNumber(value: bigint | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  return Number(value);
}

/**
 * Calculate if widget should be shown
 * Widget shows unless explicitly dismissed by user action
 * When all tasks are complete, widget will show a completion dialog
 * and only hide when user clicks "OK" (sets dismissed=true)
 */
function calculateShouldShowWidget(
  createdAt: number,
  domainConnected: boolean,
  courseCreated: boolean,
  paymentIntegrated: boolean,
  dismissed: boolean
): boolean {
  // Hide ONLY if manually dismissed by user (after clicking "OK" on completion dialog)
  if (dismissed) {
    return false;
  }
  
  // Otherwise always show the widget
  // The widget itself will handle showing completion dialog when all tasks are done
  return true;
}

/**
 * Ensure onboarding row exists for a location
 */
export async function ensureOnboardingRow(locationId: string): Promise<void> {
  await prisma.onboarding.upsert({
    where: { locationId },
    update: {},
    create: {
      locationId,
      locationVerified: false,
      domainConnected: false,
      courseCreated: false,
      paymentIntegrated: false,
      dismissed: false,
    },
  });
}

/**
 * Get onboarding status for a location
 */
export async function getOnboardingStatus(locationId: string): Promise<OnboardingStatus> {
  await ensureOnboardingRow(locationId);
  
  const row = await prisma.onboarding.findUnique({
    where: { locationId },
  });

  if (!row) {
    throw new Error(`Onboarding status not found for location: ${locationId}`);
  }

  const createdAt = dateToTimestamp(row.createdAt);
  const allTasksCompleted = row.domainConnected && row.courseCreated && row.paymentIntegrated;
  const shouldShowWidget = calculateShouldShowWidget(
    createdAt,
    row.domainConnected,
    row.courseCreated,
    row.paymentIntegrated,
    row.dismissed
  );

  return {
    locationId: row.locationId,
    locationVerified: row.locationVerified,
    domainConnected: row.domainConnected,
    courseCreated: row.courseCreated,
    paymentIntegrated: row.paymentIntegrated,
    dismissed: row.dismissed,
    createdAt,
    updatedAt: dateToTimestamp(row.updatedAt),
    shouldShowWidget,
    allTasksCompleted,
  };
}

/**
 * Update onboarding status for a location
 */
export async function updateOnboardingStatus(
  locationId: string,
  updates: Partial<Omit<OnboardingStatus, 'locationId' | 'createdAt' | 'updatedAt' | 'shouldShowWidget' | 'allTasksCompleted'>>
): Promise<OnboardingStatus> {
  console.log(`[DB] updateOnboardingStatus called for ${locationId}`, updates);
  
  await ensureOnboardingRow(locationId);

  // Filter out undefined values to only update fields that are explicitly provided
  const data: Record<string, any> = {};
  if (updates.locationVerified !== undefined) data.locationVerified = updates.locationVerified;
  if (updates.domainConnected !== undefined) data.domainConnected = updates.domainConnected;
  if (updates.courseCreated !== undefined) data.courseCreated = updates.courseCreated;
  if (updates.paymentIntegrated !== undefined) data.paymentIntegrated = updates.paymentIntegrated;
  if (updates.dismissed !== undefined) data.dismissed = updates.dismissed;

  console.log(`[DB] Updating database with data:`, data);
  
  const result = await prisma.onboarding.update({
    where: { locationId },
    data,
  });
  
  console.log(`[DB] Database update result:`, result);

  return getOnboardingStatus(locationId);
}

/**
 * Set dismissed status for a location
 */
export async function setDismissed(locationId: string, dismissed: boolean): Promise<OnboardingStatus> {
  return updateOnboardingStatus(locationId, { dismissed });
}

/**
 * Toggle a specific onboarding field atomically
 */
export async function toggleOnboardingField(
  locationId: string,
  field: 'locationVerified' | 'domainConnected' | 'courseCreated' | 'paymentIntegrated' | 'dismissed'
): Promise<OnboardingStatus> {
  await ensureOnboardingRow(locationId);

  // Get current value directly from database
  const current = await prisma.onboarding.findUnique({
    where: { locationId },
    select: { [field]: true }
  });

  if (!current) {
    throw new Error(`No onboarding record found for location ${locationId}`);
  }

  // Toggle the field value
  const newValue = !current[field];

  // Update only this specific field
  await prisma.onboarding.update({
    where: { locationId },
    data: { [field]: newValue }
  });

  // Return the updated status
  return getOnboardingStatus(locationId);
}

/**
 * Log a webhook event
 */
export async function logEvent(locationId: string, eventType: string, payload: unknown): Promise<void> {
  await prisma.eventLog.create({
    data: {
      locationId,
      eventType,
      payload: payload as any, // Prisma Json type
    },
  });
}

/**
 * Upsert (create or update) an installation
 */
export async function upsertInstallation(
  data: Omit<Installation, 'createdAt' | 'updatedAt'>
): Promise<Installation> {
  const expiresAtBigInt = data.expiresAt ? BigInt(data.expiresAt) : null;

  const result = await prisma.installation.upsert({
    where: { locationId: data.locationId },
    update: {
      accountId: data.accountId ?? null,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      expiresAt: expiresAtBigInt,
      scope: data.scope ?? null,
      tokenType: data.tokenType ?? 'location',
    },
    create: {
      locationId: data.locationId,
      accountId: data.accountId ?? null,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      expiresAt: expiresAtBigInt,
      scope: data.scope ?? null,
      tokenType: data.tokenType ?? 'location',
    },
  });

  return {
    locationId: result.locationId,
    accountId: result.accountId ?? undefined,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? undefined,
    expiresAt: bigIntToNumber(result.expiresAt),
    scope: result.scope ?? undefined,
    tokenType: (result.tokenType as 'agency' | 'location') ?? 'location',
    createdAt: dateToTimestamp(result.createdAt),
    updatedAt: dateToTimestamp(result.updatedAt),
  };
}

/**
 * Get installation by location ID
 */
export async function getInstallation(locationId: string): Promise<Installation | undefined> {
  const result = await prisma.installation.findUnique({
    where: { locationId },
  });

  if (!result) return undefined;

  return {
    locationId: result.locationId,
    accountId: result.accountId ?? undefined,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? undefined,
    expiresAt: bigIntToNumber(result.expiresAt),
    scope: result.scope ?? undefined,
    tokenType: (result.tokenType as 'agency' | 'location') ?? 'location',
    createdAt: dateToTimestamp(result.createdAt),
    updatedAt: dateToTimestamp(result.updatedAt),
  };
}

/**
 * Find installation by account ID
 */
export async function findInstallationByAccountId(accountId: string): Promise<Installation | undefined> {
  const result = await prisma.installation.findFirst({
    where: { accountId },
  });

  if (!result) return undefined;

  return {
    locationId: result.locationId,
    accountId: result.accountId ?? undefined,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? undefined,
    expiresAt: bigIntToNumber(result.expiresAt),
    scope: result.scope ?? undefined,
    tokenType: (result.tokenType as 'agency' | 'location') ?? 'location',
    createdAt: dateToTimestamp(result.createdAt),
    updatedAt: dateToTimestamp(result.updatedAt),
  };
}

/**
 * Parse agency locationId pattern (agency:{companyId}) to extract companyId
 * Returns companyId if valid agency pattern, null otherwise
 */
export function parseAgencyLocationId(locationId: string): string | null {
  if (locationId.startsWith('agency:')) {
    return locationId.substring(7); // Remove 'agency:' prefix
  }
  return null;
}

/**
 * Get agency-level installation (first one found - for backward compatibility)
 * Note: Use getAgencyInstallationByAccountId() for multi-agency support
 */
export async function getAgencyInstallation(): Promise<Installation | undefined> {
  const result = await prisma.installation.findFirst({
    where: { tokenType: 'agency' },
  });

  if (!result) return undefined;

  return {
    locationId: result.locationId,
    accountId: result.accountId ?? undefined,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? undefined,
    expiresAt: bigIntToNumber(result.expiresAt),
    scope: result.scope ?? undefined,
    tokenType: (result.tokenType as 'agency' | 'location') ?? 'location',
    createdAt: dateToTimestamp(result.createdAt),
    updatedAt: dateToTimestamp(result.updatedAt),
  };
}

/**
 * Get agency-level installation by account ID
 * Use this for proper multi-agency support
 */
export async function getAgencyInstallationByAccountId(accountId: string): Promise<Installation | undefined> {
  const result = await prisma.installation.findFirst({
    where: { 
      tokenType: 'agency',
      accountId: accountId
    },
  });

  if (!result) return undefined;

  return {
    locationId: result.locationId,
    accountId: result.accountId ?? undefined,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? undefined,
    expiresAt: bigIntToNumber(result.expiresAt),
    scope: result.scope ?? undefined,
    tokenType: (result.tokenType as 'agency' | 'location') ?? 'location',
    createdAt: dateToTimestamp(result.createdAt),
    updatedAt: dateToTimestamp(result.updatedAt),
  };
}

/**
 * Get all agency installations (for multi-agency deployments)
 */
export async function getAllAgencyInstallations(): Promise<Installation[]> {
  const results = await prisma.installation.findMany({
    where: { tokenType: 'agency' },
  });

  return results.map(result => ({
    locationId: result.locationId,
    accountId: result.accountId ?? undefined,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? undefined,
    expiresAt: bigIntToNumber(result.expiresAt),
    scope: result.scope ?? undefined,
    tokenType: (result.tokenType as 'agency' | 'location') ?? 'location',
    createdAt: dateToTimestamp(result.createdAt),
    updatedAt: dateToTimestamp(result.updatedAt),
  }));
}

/**
 * Check if agency authorization exists
 */
export async function hasAgencyAuthorization(): Promise<boolean> {
  const installation = await getAgencyInstallation();
  return !!installation && !!installation.accessToken;
}

/**
 * Delete installation by location ID
 */
export async function deleteInstallation(locationId: string): Promise<void> {
  await prisma.installation.delete({
    where: { locationId },
  }).catch(() => {
    // Ignore if doesn't exist
  });
}

/**
 * Register or update a sub-account when it first accesses the widget
 * This helps track which sub-accounts are using the app under an agency
 */
export async function registerSubAccount(data: {
  locationId: string;
  accountId: string;
  locationName?: string;
  companyId?: string;
  metadata?: any;
}): Promise<SubAccount> {
  const result = await prisma.subAccount.upsert({
    where: { locationId: data.locationId },
    update: {
      lastAccessedAt: new Date(),
      locationName: data.locationName ?? undefined,
      companyId: data.companyId ?? undefined,
      metadata: data.metadata ?? undefined,
    },
    create: {
      locationId: data.locationId,
      accountId: data.accountId,
      locationName: data.locationName ?? undefined,
      companyId: data.companyId ?? undefined,
      isActive: true,
      metadata: data.metadata ?? undefined,
    },
  });

  return {
    id: result.id,
    locationId: result.locationId,
    accountId: result.accountId,
    locationName: result.locationName ?? undefined,
    companyId: result.companyId ?? undefined,
    firstAccessedAt: dateToTimestamp(result.firstAccessedAt),
    lastAccessedAt: dateToTimestamp(result.lastAccessedAt),
    isActive: result.isActive,
    metadata: result.metadata ?? undefined,
  };
}

/**
 * Get a specific sub-account by location ID
 */
export async function getSubAccount(locationId: string): Promise<SubAccount | undefined> {
  const result = await prisma.subAccount.findUnique({
    where: { locationId },
  });

  if (!result) return undefined;

  return {
    id: result.id,
    locationId: result.locationId,
    accountId: result.accountId,
    locationName: result.locationName ?? undefined,
    companyId: result.companyId ?? undefined,
    firstAccessedAt: dateToTimestamp(result.firstAccessedAt),
    lastAccessedAt: dateToTimestamp(result.lastAccessedAt),
    isActive: result.isActive,
    metadata: result.metadata ?? undefined,
  };
}

/**
 * Get all sub-accounts for a specific agency (by accountId)
 */
export async function getSubAccountsByAgency(accountId: string): Promise<SubAccount[]> {
  const results = await prisma.subAccount.findMany({
    where: { accountId },
    orderBy: { firstAccessedAt: 'desc' },
  });

  return results.map(result => ({
    id: result.id,
    locationId: result.locationId,
    accountId: result.accountId,
    locationName: result.locationName ?? undefined,
    companyId: result.companyId ?? undefined,
    firstAccessedAt: dateToTimestamp(result.firstAccessedAt),
    lastAccessedAt: dateToTimestamp(result.lastAccessedAt),
    isActive: result.isActive,
    metadata: result.metadata ?? undefined,
  }));
}

/**
 * Get all sub-accounts (for admin purposes)
 */
export async function getAllSubAccounts(): Promise<SubAccount[]> {
  const results = await prisma.subAccount.findMany({
    orderBy: { firstAccessedAt: 'desc' },
  });

  return results.map(result => ({
    id: result.id,
    locationId: result.locationId,
    accountId: result.accountId,
    locationName: result.locationName ?? undefined,
    companyId: result.companyId ?? undefined,
    firstAccessedAt: dateToTimestamp(result.firstAccessedAt),
    lastAccessedAt: dateToTimestamp(result.lastAccessedAt),
    isActive: result.isActive,
    metadata: result.metadata ?? undefined,
  }));
}

/**
 * Deactivate a sub-account (soft delete)
 */
export async function deactivateSubAccount(locationId: string): Promise<SubAccount | undefined> {
  const result = await prisma.subAccount.update({
    where: { locationId },
    data: { isActive: false },
  }).catch(() => undefined);

  if (!result) return undefined;

  return {
    id: result.id,
    locationId: result.locationId,
    accountId: result.accountId,
    locationName: result.locationName ?? undefined,
    companyId: result.companyId ?? undefined,
    firstAccessedAt: dateToTimestamp(result.firstAccessedAt),
    lastAccessedAt: dateToTimestamp(result.lastAccessedAt),
    isActive: result.isActive,
    metadata: result.metadata ?? undefined,
  };
}

/**
 * Check if a location belongs to a tracked agency
 * Returns the agency accountId if found, null otherwise
 */
export async function getAgencyForLocation(locationId: string): Promise<string | null> {
  const subAccount = await prisma.subAccount.findUnique({
    where: { locationId },
    select: { accountId: true }
  });

  return subAccount?.accountId || null;
}

/**
 * Check if a location is a tracked sub-account under an agency
 */
export async function isSubAccountUnderAgency(locationId: string, accountId: string): Promise<boolean> {
  const subAccount = await prisma.subAccount.findFirst({
    where: {
      locationId,
      accountId,
      isActive: true
    }
  });

  return !!subAccount;
}

/**
 * Get sub-account statistics for an agency
 */
export async function getSubAccountStats(accountId: string): Promise<{
  total: number;
  active: number;
  inactive: number;
  lastWeek: number;
  lastMonth: number;
}> {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [total, active, inactive, lastWeek, lastMonth] = await Promise.all([
    prisma.subAccount.count({ where: { accountId } }),
    prisma.subAccount.count({ where: { accountId, isActive: true } }),
    prisma.subAccount.count({ where: { accountId, isActive: false } }),
    prisma.subAccount.count({ 
      where: { 
        accountId, 
        firstAccessedAt: { gte: weekAgo } 
      } 
    }),
    prisma.subAccount.count({ 
      where: { 
        accountId, 
        firstAccessedAt: { gte: monthAgo } 
      } 
    }),
  ]);

  return { total, active, inactive, lastWeek, lastMonth };
}

// Export Prisma client for direct usage if needed
export default prisma;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
