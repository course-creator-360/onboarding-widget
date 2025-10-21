import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Export types
export type OnboardingStatus = {
  locationId: string;
  domainConnected: boolean;
  courseCreated: boolean;
  paymentIntegrated: boolean;
  dismissed: boolean;
  updatedAt: number;
  createdAt: number;
  shouldShowWidget: boolean;
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
 * Calculate if widget should be shown based on age and completion status
 * Widget shows if:
 * - Location was created within last 30 days (from onboarding.createdAt)
 * - AND not all 3 tasks are completed
 */
function calculateShouldShowWidget(
  createdAt: number,
  domainConnected: boolean,
  courseCreated: boolean,
  paymentIntegrated: boolean
): boolean {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const age = now - createdAt;
  
  // Hide if older than 30 days
  if (age > THIRTY_DAYS_MS) {
    return false;
  }
  
  // Hide if all tasks completed
  const allCompleted = domainConnected && courseCreated && paymentIntegrated;
  if (allCompleted) {
    return false;
  }
  
  // Show widget if within 30 days and not all completed
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
  const shouldShowWidget = calculateShouldShowWidget(
    createdAt,
    row.domainConnected,
    row.courseCreated,
    row.paymentIntegrated
  );

  return {
    locationId: row.locationId,
    domainConnected: row.domainConnected,
    courseCreated: row.courseCreated,
    paymentIntegrated: row.paymentIntegrated,
    dismissed: row.dismissed,
    createdAt,
    updatedAt: dateToTimestamp(row.updatedAt),
    shouldShowWidget,
  };
}

/**
 * Update onboarding status for a location
 */
export async function updateOnboardingStatus(
  locationId: string,
  updates: Partial<Omit<OnboardingStatus, 'locationId' | 'createdAt' | 'updatedAt'>>
): Promise<OnboardingStatus> {
  await ensureOnboardingRow(locationId);

  await prisma.onboarding.update({
    where: { locationId },
    data: {
      domainConnected: updates.domainConnected,
      courseCreated: updates.courseCreated,
      paymentIntegrated: updates.paymentIntegrated,
      dismissed: updates.dismissed,
    },
  });

  return getOnboardingStatus(locationId);
}

/**
 * Set dismissed status for a location
 */
export async function setDismissed(locationId: string, dismissed: boolean): Promise<OnboardingStatus> {
  return updateOnboardingStatus(locationId, { dismissed });
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
 * Get agency-level installation
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
