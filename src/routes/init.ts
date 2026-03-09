import { Router, Request, Response } from 'express';
import { getOnboardingStatus, updateOnboardingStatus, hasAgencyAuthorization, getInstallation, getAgencyInstallation, registerSubAccount, getSubAccount } from '../db';
import { sseBroker } from '../sse';
import { getAuthToken } from '../ghl-api';
import { getCC360AdminConfig } from '../cc360-admin';
import { getGhlAppBaseUrl } from '../config';

const router = Router();

function buildConfig() {
  const userpilotToken = process.env.NODE_ENV === 'production'
    ? process.env.USERPILOT_TOKEN
    : (process.env.USERPILOT_STAGE_TOKEN || process.env.USERPILOT_TOKEN);
  return {
    ghlAppBaseUrl: getGhlAppBaseUrl(),
    userpilotToken: userpilotToken || null,
    segmentWriteKey: process.env.SEGMENT_WRITE_KEY || null,
    profitWellAuthToken: process.env.PROFITWELL_AUTH_TOKEN || null,
    widgetLocationFilter: process.env.WIDGET_LOCATION_ID_FILTER || null,
    customersApiConfigured: !!process.env.CC360_CUSTOMERS_API_KEY,
    featureFlags: {
      connectPaymentsEnabled: process.env.FEATURE_CONNECT_PAYMENTS_ENABLED !== 'false',
      connectDomainEnabled: process.env.FEATURE_CONNECT_DOMAIN_ENABLED !== 'false',
    },
  };
}

async function fetchCustomerData(locationId: string) {
  const { apiKey, apiBaseUrl } = getCC360AdminConfig();
  if (!apiKey) return null;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${apiBaseUrl}/api/customers?locationId=${locationId}`, {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(tid);
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.locationId === locationId) return data;
    }
  } catch (e) {
    console.warn(`[Init] CC360 Admin API call failed for ${locationId}`);
  }
  return null;
}

router.get('/init', async (req: Request, res: Response) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });

  const startTime = Date.now();
  const config = buildConfig();

  if (config.widgetLocationFilter && locationId !== config.widgetLocationFilter) {
    return res.json({ config, show: false, reason: 'location_filter_mismatch' });
  }

  try {
    const [status, hasAgency, customer] = await Promise.all([
      getOnboardingStatus(locationId).catch(() => null),
      hasAgencyAuthorization().catch(() => false),
      fetchCustomerData(locationId),
    ]);

    let currentStatus = status;

    if (currentStatus && hasAgency && !currentStatus.locationVerified) {
      currentStatus = await updateOnboardingStatus(locationId, { locationVerified: true });
      sseBroker.broadcastStatus(locationId).catch(() => {});
    }

    if (currentStatus && !currentStatus.courseCreated && customer?.courseOutlineGenerated === true) {
      currentStatus = await updateOnboardingStatus(locationId, { courseCreated: true });
      sseBroker.broadcastStatus(locationId).catch(() => {});
    }

    let installed = false;
    let installError: string | null = null;

    if (hasAgency) {
      try {
        const token = await getAuthToken(locationId);
        installed = !!token;
      } catch (e) {
        installed = false;
      }
      if (!installed) {
        installError = 'Your authorization has expired. Please contact your agency administrator to reauthorize this app.';
      }
    } else {
      try {
        const installation = await getInstallation(locationId);
        if (installation) {
          const token = await getAuthToken(locationId);
          installed = !!token;
          if (!installed) installError = 'Your authorization has expired. Please reauthorize this app.';
        } else {
          installError = 'Agency administrator needs to authorize this app. Please contact your agency admin.';
        }
      } catch (e) {
        installError = 'Failed to check installation.';
      }
    }

    let show = true;
    let reason: string | null = null;

    if (customer) {
      const createdAt = customer.createdAt ? new Date(customer.createdAt) : null;
      const daysSinceCreation = createdAt ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
      if (customer.subscriptionStatus !== 'trialing' || daysSinceCreation > 30) {
        show = false;
        reason = 'not_trialing_or_too_old';
      }
    }

    console.log(`[Init] Completed in ${Date.now() - startTime}ms for ${locationId}`);

    return res.json({
      config,
      show,
      reason,
      installed,
      installError,
      status: currentStatus || { locationId, surveyCompleted: false, bookingCancelled: false, shouldShowWidget: true, allTasksCompleted: false },
      customer: customer ? {
        name: customer.name,
        email: customer.email,
        subscriptionStatus: customer.subscriptionStatus,
        createdAt: customer.createdAt,
        locationId: customer.locationId,
        stripeCustomerId: customer.stripeCustomerId || null,
      } : null,
    });
  } catch (error: any) {
    console.error(`[Init] Error after ${Date.now() - startTime}ms:`, error?.message || error);
    return res.json({
      config,
      show: true,
      installed: false,
      installError: 'Request failed. Please refresh the page.',
      status: { locationId, surveyCompleted: false, bookingCancelled: false, shouldShowWidget: true, allTasksCompleted: false },
      customer: null,
    });
  }
});

export default router;
