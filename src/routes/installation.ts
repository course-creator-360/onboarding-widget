import { Router } from 'express';
import { getInstallation, hasAgencyAuthorization, getAgencyInstallation, deleteInstallation, upsertInstallation, registerSubAccount, getSubAccount, updateOnboardingStatus } from '../db';
import { sseBroker } from '../sse';
import { getAuthToken } from '../ghl-api';
import { getCC360AdminConfig } from '../cc360-admin';

const router = Router();

router.post('/store-token', async (req, res) => {
  const secret = req.headers['x-store-token-secret'] as string;
  if (!secret || secret !== process.env.STORE_TOKEN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { 
      locationId, 
      companyId, 
      accessToken, 
      refreshToken, 
      expiresIn, 
      scope 
    } = req.body;

    if (!locationId || !accessToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const installation = await upsertInstallation({
      locationId,
      accountId: companyId,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + (expiresIn * 1000),
      scope,
      tokenType: 'location'
    });

    return res.json({ 
      success: true,
      installation: {
        locationId: installation.locationId,
        accountId: installation.accountId,
        tokenType: installation.tokenType
      }
    });
  } catch (error) {
    console.error('Error storing token:', error);
    return res.status(500).json({ 
      error: 'Failed to store token',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/installation/check', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  const startTime = Date.now();
  console.log(`[Installation Check] Checking for location: ${locationId}`);
  
  try {
    const checkPromise = (async () => {
      const hasAgency = await hasAgencyAuthorization();
      console.log(`[Installation Check] Has agency: ${hasAgency} (${Date.now() - startTime}ms)`);
      
      if (hasAgency) {
        const token = await getAuthToken(locationId);
        console.log(`[Installation Check] Token obtained: ${!!token} (${Date.now() - startTime}ms)`);
        
        if (!token) {
          return {
            installed: false,
            hasToken: false,
            tokenType: 'agency' as const,
            error: 'Your authorization has expired. Please contact your agency administrator to reauthorize this app.'
          };
        }
        
        console.log('[Installation Check] Token valid, returning immediately');
        getAgencyInstallation()
          .then(async (agencyInstallation) => {
            if (!agencyInstallation?.accountId) return;
            
            const { apiKey, apiBaseUrl } = getCC360AdminConfig();
            
            if (!apiKey) {
              console.warn('[Installation Check] No API key configured, skipping background sync');
              return;
            }
            
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              
              const response = await fetch(`${apiBaseUrl}/api/customers?locationId=${locationId}`, {
                method: 'GET',
                headers: {
                  'x-api-key': apiKey,
                  'Content-Type': 'application/json'
                },
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              if (response.ok && response.status === 200) {
                const customer = await response.json();
                if (customer && customer.locationId === locationId) {
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
                      timezone: customer.timezone || '' 
                    }
                  });
                  console.log(`[Installation Check] ${isNew ? '✨ NEW' : 'Updated'} sub-account: ${customer.name}`);
                }
              }
            } catch (err) {
              console.error('[Installation Check] Background sync error:', err);
            }
          })
          .catch(err => console.error('[Installation Check] Background sync error:', err));
        
        return {
          installed: true,
          hasToken: true,
          tokenType: 'agency' as const
        };
      }
      
      const installation = await getInstallation(locationId);
      if (installation) {
        const token = await getAuthToken(locationId);
        
        if (!token) {
          return {
            installed: false,
            hasToken: false,
            tokenType: 'location' as const,
            error: 'Your authorization has expired. Please reauthorize this app.'
          };
        }
        
        return {
          installed: true,
          hasToken: true,
          tokenType: (installation?.tokenType || 'location') as 'agency' | 'location'
        };
      }
      
      return {
        installed: false,
        hasToken: false,
        tokenType: 'location' as const,
        error: 'Agency administrator needs to authorize this app. Please contact your agency admin.'
      };
    })();
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Installation check timeout')), 2000)
    );
    
    const result = await Promise.race([checkPromise, timeoutPromise]);
    console.log(`[Installation Check] Completed in ${Date.now() - startTime}ms`);
    return res.json(result);
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Installation Check] ❌ Timeout after ${elapsed}ms:`, error);
    
    return res.json({
      installed: false,
      hasToken: false,
      tokenType: 'agency' as const,
      error: 'Request timeout. Please refresh the page.'
    });
  }
});

router.delete('/installation', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  if (locationId === 'agency') {
    const agencyInstallation = await getAgencyInstallation();
    if (agencyInstallation) {
      console.log('[Delete Installation] Deleting agency installation:', agencyInstallation.locationId);
      await deleteInstallation(agencyInstallation.locationId);
    } else {
      console.log('[Delete Installation] No agency installation found to delete');
    }
  } else {
    await deleteInstallation(locationId);
  }
  
  return res.json({ success: true, message: 'Installation deleted' });
});

router.post('/test/clear-location', async (req, res) => {
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_TEST_ENDPOINTS) {
    return res.status(403).json({ error: 'Test endpoints are disabled in production' });
  }

  const { locationId } = req.body as { locationId?: string };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  console.log(`[Test] Clearing all data for location: ${locationId}`);
  
  try {
    await updateOnboardingStatus(locationId, {
      domainConnected: false,
      courseCreated: false,
      paymentIntegrated: false,
      dismissed: false,
      surveyCompleted: false,
      surveyResponses: null,
      bookingCancelled: false
    });
    
    await deleteInstallation(locationId);
    
    await sseBroker.broadcastStatus(locationId);
    
    console.log(`[Test] Successfully cleared data for location: ${locationId}`);
    
    return res.json({ 
      success: true, 
      message: `All data cleared for location ${locationId}. Agency authorization preserved.`,
      locationId 
    });
  } catch (error) {
    console.error('[Test] Error clearing location data:', error);
    return res.status(500).json({ 
      error: 'Failed to clear location data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
