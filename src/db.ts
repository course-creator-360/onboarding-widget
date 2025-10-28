import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

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

// Export Prisma client for direct usage if needed
export default prisma;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
