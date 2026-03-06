import { Router } from 'express';
import { getOnboardingStatus, updateOnboardingStatus, hasAgencyAuthorization, setDismissed, toggleOnboardingField, OnboardingStatus } from '../db';
import { sseBroker } from '../sse';
import { checkLocationProducts } from '../ghl-api';
import { getCC360AdminConfig } from '../cc360-admin';

const router = Router();

router.get('/status', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  const skipApiChecks = req.query.skipApiChecks === 'true';
  const startTime = Date.now();
  console.log(`[Status] Starting status check for ${locationId}`);
  
  try {
    const statusPromise = (async () => {
      let status = await getOnboardingStatus(locationId);
      console.log(`[Status] Got status from DB in ${Date.now() - startTime}ms`);
      console.log(`[Status] Current locationVerified value: ${status.locationVerified}`);
      
      const isAuthorized = await hasAgencyAuthorization();
      console.log(`[Status] Agency authorized: ${isAuthorized}`);
      
      if (isAuthorized && !status.locationVerified) {
        console.log(`[Status] Agency authorized - auto-verifying location: ${locationId}`);
        status = await updateOnboardingStatus(locationId, { locationVerified: true });
        await sseBroker.broadcastStatus(locationId);
        console.log(`[Status] Location verified and updated in database`);
      } else if (isAuthorized) {
        console.log(`[Status] Location already verified (no update needed)`);
      }
      
      // If courseCreated is false, check admin API for courseOutlineGenerated
      if (!status.courseCreated) {
        const { apiKey, apiBaseUrl } = getCC360AdminConfig();
        if (apiKey) {
          try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 2000);
            const custResp = await fetch(`${apiBaseUrl}/api/customers?locationId=${locationId}`, {
              headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
              signal: controller.signal,
            });
            clearTimeout(tid);
            if (custResp.ok) {
              const cust = await custResp.json();
              if (cust?.courseOutlineGenerated === true) {
                console.log(`[Status] Admin reports courseOutlineGenerated=true, syncing courseCreated for ${locationId}`);
                status = await updateOnboardingStatus(locationId, { courseCreated: true });
                await sseBroker.broadcastStatus(locationId);
              }
            }
          } catch { /* ignore timeout / errors */ }
        }
      }
      
      console.log(`[Status] Returning in ${Date.now() - startTime}ms`);
      return status;
    })();
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Status endpoint timeout')), 3000)
    );
    
    const status = await Promise.race([statusPromise, timeoutPromise]);
    return res.json(status);
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Status] ❌ Timeout or error after ${elapsed}ms:`, error);
    
    let locationVerified = false;
    try {
      const isAuthorized = await hasAgencyAuthorization();
      locationVerified = isAuthorized;
      console.log(`[Status] Fallback: Agency authorized=${isAuthorized}, setting locationVerified=${locationVerified}`);
    } catch (authError) {
      console.error(`[Status] Failed to check agency authorization in fallback:`, authError);
    }
    
    return res.json({
      locationId,
      locationVerified,
      domainConnected: false,
      courseCreated: false,
      paymentIntegrated: false,
      dismissed: false,
      surveyCompleted: false,
      surveyResponses: undefined,
      bookingCancelled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      shouldShowWidget: true,
      allTasksCompleted: false,
    });
  }
});

router.get('/onboarding/:locationId/check-products', async (req, res) => {
  const locationId = req.params.locationId;
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  console.log(`[Check Products] Triggered for location: ${locationId}`);
  
  try {
    const hasProducts = await checkLocationProducts(locationId);
    
    let status = await getOnboardingStatus(locationId);
    
    if (hasProducts !== status.courseCreated) {
      console.log(`[Check Products] Status changed for ${locationId}: ${status.courseCreated} -> ${hasProducts}`);
      status = await updateOnboardingStatus(locationId, { courseCreated: hasProducts });
      
      await sseBroker.broadcastStatus(locationId);
    } else {
      console.log(`[Check Products] No change for ${locationId}: courseCreated = ${hasProducts}`);
    }
    
    return res.json({ 
      success: true, 
      courseCreated: hasProducts,
      status 
    });
  } catch (error) {
    console.error('[Check Products] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to check products',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/dismiss', async (req, res) => {
  const { locationId } = req.body as { locationId?: string };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  const status = await setDismissed(locationId, true);
  await sseBroker.broadcastStatus(locationId);
  res.json(status);
});

router.post('/onboarding/update', async (req, res) => {
  const { locationId, updates } = req.body as { locationId?: string; updates?: Partial<OnboardingStatus> };
  
  console.log('[Onboarding Update] Request received:', { locationId, updates });
  
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  if (!updates) return res.status(400).json({ error: 'updates is required' });
  
  try {
    const beforeUpdate = await getOnboardingStatus(locationId);
    console.log('[Onboarding Update] Before update:', beforeUpdate);
    
    const status = await updateOnboardingStatus(locationId, updates);
    console.log('[Onboarding Update] After update:', status);
    console.log('[Onboarding Update] Database update successful!');
    
    await sseBroker.broadcastStatus(locationId);
    res.json(status);
  } catch (error) {
    console.error('[Onboarding Update] Error updating status:', error);
    res.status(500).json({ 
      error: 'Failed to update onboarding status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/onboarding/toggle', async (req, res) => {
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_TEST_ENDPOINTS) {
    return res.status(403).json({ error: 'Test endpoints are disabled in production' });
  }

  const { locationId, field } = req.body as { locationId?: string; field?: string };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  if (!field) return res.status(400).json({ error: 'field is required' });
  
  const validFields = ['locationVerified', 'domainConnected', 'courseCreated', 'paymentIntegrated', 'dismissed'];
  if (!validFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid field name' });
  }
  
  const status = await toggleOnboardingField(
    locationId, 
    field as 'locationVerified' | 'domainConnected' | 'courseCreated' | 'paymentIntegrated' | 'dismissed'
  );
  
  await sseBroker.broadcastStatus(locationId);
  res.json(status);
});

router.get('/events', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).end();
  sseBroker.addClient(locationId, res);
  await sseBroker.broadcastStatus(locationId);
});

export default router;
