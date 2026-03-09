import { Router } from 'express';
import { getOnboardingStatus, updateOnboardingStatus, hasAgencyAuthorization, getInstallation, getAgencyInstallation, registerSubAccount, getSubAccount } from '../db';
import { sseBroker } from '../sse';
import { getAuthToken } from '../ghl-api';
import { getCC360AdminConfig } from '../cc360-admin';
import { getBaseUrl, getEnvironment, getGhlAppBaseUrl } from '../config';

const router = Router();

router.get('/init', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });

  const startTime = Date.now();
  console.log(`[Init] Starting unified init for ${locationId}`);

  const userpilotToken = process.env.NODE_ENV === 'production'
    ? process.env.USERPILOT_TOKEN
    : (process.env.USERPILOT_STAGE_TOKEN || process.env.USERPILOT_TOKEN);
  const segmentWriteKey = process.env.SEGMENT_WRITE_KEY || null;
  const filterLocationId = process.env.WIDGET_LOCATION_ID_FILTER || null;
  const customersApiKey = process.env.CC360_CUSTOMERS_API_KEY;
  const customersApiConfigured = !!customersApiKey;

  const config = {
    ghlAppBaseUrl: getGhlAppBaseUrl(),
    userpilotToken: userpilotToken || null,
    segmentWriteKey,
    widgetLocationFilter: filterLocationId,
    customersApiConfigured,
    featureFlags: {
      connectPaymentsEnabled: process.env.FEATURE_CONNECT_PAYMENTS_ENABLED !== 'false',
      connectDomainEnabled: process.env.FEATURE_CONNECT_DOMAIN_ENABLED !== 'false',
    },
  };

  if (filterLocationId && locationId !== filterLocationId) {
    console.log(`[Init] Location pre-filter mismatch: ${locationId} !== ${filterLocationId}`);
    return res.json({ config, show: false, reason: 'location_filter_mismatch' });
  }

  try {
    const initPromise = (async () => {
      const [status, hasAgency, customer] = await Promise.all([
        getOnboardingStatus(locationId),
        hasAgencyAuthorization(),
        fetchCustomerData(locationId),
      ]);

      console.log(`[Init] Parallel DB+API calls completed in ${Date.now() - startTime}ms`);

      if (hasAgency && !status.locationVerified) {
        await updateOnboardingStatus(locationId, { locationVerified: true });
        await sseBroker.broadcastStatus(locationId);
        status.locationVerified = true;
      }

      if (!status.courseCreated && customer?.courseOutlineGenerated === true) {
        await updateOnboardingStatus(locationId, { courseCreated: true });
        await sseBroker.broadcastStatus(locationId);
        status.courseCreated = true;
      }

      let installed = false;
      let installError: string | null = null;

      if (hasAgency) {
        const token = await getAuthToken(locationId);
        installed = !!token;
        if (!installed) {
          installError = 'Your authorization has expired. Please contact your agency administrator to reauthorize this app.';
        }

        syncSubAccountInBackground(locationId, customer);
      } else {
        const installation = await getInstallation(locationId);
        if (installation) {
          const token = await getAuthToken(locationId);
          installed = !!token;
          if (!installed) {
            installError = 'Your authorization has expired. Please reauthorize this app.';
          }
        } else {
          installError = 'Agency administrator needs to authorize this app. Please contact your agency admin.';
        }
      }

      let show = true;
      let reason: string | null = null;

      if (customer) {
        const subscriptionStatus = customer.subscriptionStatus;
        const createdAt = customer.createdAt ? new Date(customer.createdAt) : null;
        const daysSinceCreation = createdAt ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
        const isTrialing = subscriptionStatus === 'trialing';

        if (!isTrialing || daysSinceCreation > 30) {
          show = false;
          reason = 'not_trialing_or_too_old';
        }
      }

      console.log(`[Init] Completed in ${Date.now() - startTime}ms`);

      return {
        config,
        show,
        reason,
        installed,
        installError,
        status,
        customer: customer ? {
          name: customer.name,
          subscriptionStatus: customer.subscriptionStatus,
          createdAt: customer.createdAt,
        } : null,
      };
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Init timeout')), 5000)
    );

    const result = await Promise.race([initPromise, timeoutPromise]);
    return res.json(result);

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Init] Error/timeout after ${elapsed}ms:`, error);

    return res.json({
      config,
      show: true,
      reason: null,
      installed: false,
      installError: 'Request timeout. Please refresh the page.',
      status: {
        locationId,
        locationVerified: false,
        domainConnected: false,
        courseCreated: false,
        paymentIntegrated: false,
        dismissed: false,
        surveyCompleted: false,
        bookingCancelled: false,
        shouldShowWidget: true,
        allTasksCompleted: false,
      },
      customer: null,
    });
  }
});

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
  } catch {
    console.warn(`[Init] CC360 Admin API call failed for ${locationId}`);
  }
  return null;
}

function syncSubAccountInBackground(locationId: string, customer: any) {
  if (!customer) return;
  getAgencyInstallation()
    .then(async (agencyInstallation) => {
      if (!agencyInstallation?.accountId) return;
      const isNew = !(await getSubAccount(locationId));
      await registerSubAccount({
        locationId,
        accountId: agencyInstallation.accountId,
        locationName: customer.name,
        companyId: customer.companyId || '',
        metadata: {
          email: customer.email || '',
          phone: customer.phone || '',
          website: customer.website || '',
          timezone: customer.timezone || '',
        },
      });
      console.log(`[Init] ${isNew ? 'NEW' : 'Updated'} sub-account: ${customer.name}`);
    })
    .catch((err: any) => console.error('[Init] Background sync error:', err));
}

export default router;
