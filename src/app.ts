import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import oauthRouter from './oauth';
import webhookRouter from './webhooks';
import { getOnboardingStatus, setDismissed, updateOnboardingStatus, getInstallation, hasAgencyAuthorization, getAgencyInstallation, deleteInstallation, OnboardingStatus, toggleOnboardingField, upsertInstallation, registerSubAccount, getSubAccount, getSubAccountsByAgency, getAllSubAccounts, getSubAccountStats, deactivateSubAccount, getAgencyForLocation, isSubAccountUnderAgency } from './db';
import { sseBroker } from './sse';
import { checkLocationProducts, getAuthToken } from './ghl-api';
import { getBaseUrl, getEnvironment, getGhlAppBaseUrl } from './config';

const app = express();

// CORS configuration - allow all origins in development, restrict in production if needed
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Allow all origins for now (can restrict later)
    // Vercel preview URLs are unpredictable, so we allow all
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser()); // Required for OAuth state management in serverless

// Mount routers under /api for serverless compatibility
app.use('/api/oauth', oauthRouter);
app.use('/api/webhooks', webhookRouter);

// Marketplace installation endpoint (direct mount for GHL compatibility)
app.use('/oauth', oauthRouter);
app.use('/install', oauthRouter);

app.get('/api/healthz', (_req, res) => res.json({ ok: true }));

app.get('/api/config', async (_req, res) => {
  // Get Userpilot token based on environment
  const userpilotToken = process.env.NODE_ENV === 'production' 
    ? process.env.USERPILOT_TOKEN 
    : (process.env.USERPILOT_STAGE_TOKEN || process.env.USERPILOT_TOKEN);
  
  const filterLocationId = process.env.WIDGET_LOCATION_ID_FILTER || null;
  const customersApiKey = process.env.CC360_CUSTOMERS_API_KEY;
  
  // Feature flags
  const featureConnectPaymentsEnabled = process.env.FEATURE_CONNECT_PAYMENTS_ENABLED !== 'false'; // Default to true
  
  // Check if API verification is properly configured
  const customersApiConfigured = !!customersApiKey;
  
  if (!customersApiConfigured) {
    console.error('[Config] ❌ CC360_CUSTOMERS_API_KEY is NOT SET');
    console.error('[Config] ❌ Widget will NOT show anywhere until this is configured');
    console.error('[Config] 💡 Add CC360_CUSTOMERS_API_KEY to your .env file or Vercel environment variables');
  } else {
    console.log('[Config] ✅ CC360 Customers API is configured');
    if (filterLocationId) {
      console.log(`[Config] 🎯 Location filter active: ${filterLocationId} (will pre-filter before API call)`);
    } else {
      console.log('[Config] 🌍 No location filter - will verify all locations via API');
    }
  }
  
  return res.json({
    apiBase: getBaseUrl(),
    environment: getEnvironment(),
    ghlAppBaseUrl: getGhlAppBaseUrl(),
    userpilotToken: userpilotToken || null,  // Expose for client-side SDK
    widgetLocationFilter: filterLocationId,  // Optional pre-filter
    customersApiConfigured: customersApiConfigured,  // Whether API verification is available
    featureFlags: {
      connectPaymentsEnabled: featureConnectPaymentsEnabled
    }
  });
});

// Verify location authorization via CC360 Customers Admin API
app.get('/api/location/verify', async (req, res) => {
  const locationId = (req.query.locationId as string);
  
  if (!locationId) {
    return res.status(400).json({ 
      authorized: false, 
      error: 'locationId is required' 
    });
  }
  
  const apiKey = process.env.CC360_CUSTOMERS_API_KEY;
  const apiBaseUrl = process.env.CC360_CUSTOMERS_API_BASE_URL || 'https://cc360-customers-admin/api';
  
  // If API key is not configured, deny access
  if (!apiKey) {
    console.error('[Location Verify] ❌ CC360_CUSTOMERS_API_KEY is not configured');
    return res.json({ 
      authorized: false, 
      error: 'API key not configured' 
    });
  }
  
  try {
    console.log(`[Location Verify] Checking authorization for location: ${locationId}`);
    console.log(`[Location Verify] Calling: ${apiBaseUrl}/customers?locationId=${locationId}`);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${apiBaseUrl}/customers?locationId=${locationId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Only 200 responses with customer data mean authorized
    if (response.ok && response.status === 200) {
      const customer = await response.json();
      
      // Verify we got customer data with matching locationId
      if (customer && customer.locationId === locationId) {
        console.log(`[Location Verify] ✅ Location authorized: ${customer.name || locationId}`);
        return res.json({ 
          authorized: true, 
          customer: {
            id: customer.id,
            locationId: customer.locationId,
            name: customer.name,
            email: customer.email
          }
        });
      } else {
        console.warn(`[Location Verify] ⚠️ API returned 200 but no matching customer data`);
        return res.json({ 
          authorized: false, 
          error: 'No customer data found' 
        });
      }
    } else {
      // Any non-200 response means not authorized
      console.log(`[Location Verify] ❌ Location not authorized (HTTP ${response.status})`);
      return res.json({ 
        authorized: false, 
        error: `Location not found (HTTP ${response.status})` 
      });
    }
  } catch (error: any) {
    // Handle timeout errors
    if (error.name === 'AbortError') {
      console.error('[Location Verify] ❌ API call timeout (>5s)');
      return res.json({ 
        authorized: false, 
        error: 'API timeout' 
      });
    }
    
    // Handle network and other errors
    console.error('[Location Verify] ❌ API call failed:', error.message);
    return res.json({ 
      authorized: false, 
      error: 'API call failed' 
    });
  }
});

// Migration endpoint for manual migration runs
app.post('/api/migrate', async (_req, res) => {
  try {
    const { execSync } = require('child_process');
    console.log('Running database migrations...');
    
    execSync('npx prisma migrate deploy', { 
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
        POSTGRES_URL: process.env.POSTGRES_URL
      }
    });
    
    console.log('Database migrations completed successfully');
    return res.json({ success: true, message: 'Migrations completed successfully' });
  } catch (error) {
    console.error('Migration failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Manual token storage endpoint (for emergency token recovery only)
app.post('/api/store-token', async (req, res) => {
  // Require secret for security
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

app.get('/api/status', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  const skipApiChecks = req.query.skipApiChecks === 'true';
  const startTime = Date.now();
  console.log(`[Status] Starting status check for ${locationId}`);
  
  // CRITICAL: Wrap entire endpoint in 3-second timeout to prevent Vercel 504
  // If DB is slow (cold start), return minimal response immediately
  try {
    const statusPromise = (async () => {
      // Get status from database
      let status = await getOnboardingStatus(locationId);
      console.log(`[Status] Got status from DB in ${Date.now() - startTime}ms`);
      console.log(`[Status] Current locationVerified value: ${status.locationVerified}`);
      
      // Auto-verify location if agency is authorized
      const isAuthorized = await hasAgencyAuthorization();
      console.log(`[Status] Agency authorized: ${isAuthorized}`);
      
      // ALWAYS mark location as verified if agency is authorized
      // This ensures the "Sign in to your Account" checkbox is checked
      // even if database state somehow gets out of sync
      if (isAuthorized && !status.locationVerified) {
        console.log(`[Status] Agency authorized - auto-verifying location: ${locationId}`);
        status = await updateOnboardingStatus(locationId, { locationVerified: true });
        await sseBroker.broadcastStatus(locationId);
        console.log(`[Status] Location verified and updated in database`);
      } else if (isAuthorized) {
        console.log(`[Status] Location already verified (no update needed)`);
      }
      
      console.log(`[Status] Returning in ${Date.now() - startTime}ms`);
      return status;
    })();
    
    // Race against 3-second timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Status endpoint timeout')), 3000)
    );
    
    const status = await Promise.race([statusPromise, timeoutPromise]);
    return res.json(status);
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Status] ❌ Timeout or error after ${elapsed}ms:`, error);
    
    // Check if agency is authorized even in error case
    // This ensures locationVerified is true for authorized agencies even on timeout
    let locationVerified = false;
    try {
      const isAuthorized = await hasAgencyAuthorization();
      locationVerified = isAuthorized;
      console.log(`[Status] Fallback: Agency authorized=${isAuthorized}, setting locationVerified=${locationVerified}`);
    } catch (authError) {
      console.error(`[Status] Failed to check agency authorization in fallback:`, authError);
    }
    
    // Return minimal default status to unblock widget
    return res.json({
      locationId,
      locationVerified,
      domainConnected: false,
      courseCreated: false,
      paymentIntegrated: false,
      dismissed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      shouldShowWidget: true,
      allTasksCompleted: false,
    });
  }
});

app.get('/api/location-context', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  const apiKey = process.env.CC360_CUSTOMERS_API_KEY;
  const apiBaseUrl = process.env.CC360_CUSTOMERS_API_BASE_URL || 'https://cc360-customers-admin/api';
  
  // If API key is not configured, deny access
  if (!apiKey) {
    console.error('[Location Context] ❌ CC360_CUSTOMERS_API_KEY is not configured');
    return res.status(500).json({ 
      error: 'API key not configured' 
    });
  }
  
  try {
    console.log(`[Location Context] Fetching context for location: ${locationId}`);
    console.log(`[Location Context] Calling: ${apiBaseUrl}/customers?locationId=${locationId}`);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${apiBaseUrl}/customers?locationId=${locationId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Only 200 responses with customer data are valid
    if (response.ok && response.status === 200) {
      const customer = await response.json();
      
      // Verify we got customer data with matching locationId
      if (customer && customer.locationId === locationId) {
        console.log(`[Location Context] ✅ Successfully fetched context for: ${customer.name || locationId}`);
        
        // Return sanitized user context (widget will handle Userpilot identify client-side)
        return res.json({
          locationId: customer.locationId,
          name: customer.name || 'Unknown',
          email: customer.email || '',
          phone: customer.phone || '',
          companyId: customer.companyId || '',
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          country: customer.country || '',
          website: customer.website || '',
          timezone: customer.timezone || '',
        });
      } else {
        console.error(`[Location Context] ⚠️ API returned 200 but no matching customer data`);
        return res.status(404).json({ 
          error: 'Location not found' 
        });
      }
    } else {
      // Any non-200 response means not found
      console.error(`[Location Context] ❌ Location not found (HTTP ${response.status})`);
      return res.status(404).json({ 
        error: `Location not found (HTTP ${response.status})` 
      });
    }
  } catch (error: any) {
    // Handle timeout errors
    if (error.name === 'AbortError') {
      console.error('[Location Context] ❌ API call timeout (>5s)');
      return res.status(504).json({ 
        error: 'API timeout' 
      });
    }
    
    // Handle network and other errors
    console.error('[Location Context] ❌ Error fetching location data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch location context';
    return res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV !== 'production' ? error : undefined
    });
  }
});

app.get('/api/installation/check', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  const startTime = Date.now();
  console.log(`[Installation Check] Checking for location: ${locationId}`);
  
  try {
    // Wrap in 2-second timeout to prevent widget hanging
    const checkPromise = (async () => {
      // Check if agency is authorized (takes precedence)
      const hasAgency = await hasAgencyAuthorization();
      console.log(`[Installation Check] Has agency: ${hasAgency} (${Date.now() - startTime}ms)`);
      
      if (hasAgency) {
        // Agency authorization exists - get token
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
        
        // Token is valid - sync sub-account in background (non-blocking)
        console.log('[Installation Check] Token valid, returning immediately');
        getAgencyInstallation()
          .then(async (agencyInstallation) => {
            if (!agencyInstallation?.accountId) return;
            
            // Fetch location data from cc360-customers-admin API
            const apiKey = process.env.CC360_CUSTOMERS_API_KEY;
            const apiBaseUrl = process.env.CC360_CUSTOMERS_API_BASE_URL || 'https://cc360-customers-admin/api';
            
            if (!apiKey) {
              console.warn('[Installation Check] No API key configured, skipping background sync');
              return;
            }
            
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              
              const response = await fetch(`${apiBaseUrl}/customers?locationId=${locationId}`, {
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
      
      // Fall back to per-location check
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
    
    // Race against 2-second timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Installation check timeout')), 2000)
    );
    
    const result = await Promise.race([checkPromise, timeoutPromise]);
    console.log(`[Installation Check] Completed in ${Date.now() - startTime}ms`);
    return res.json(result);
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Installation Check] ❌ Timeout after ${elapsed}ms:`, error);
    
    // Return "not authorized" on timeout to avoid breaking widget
    return res.json({
      installed: false,
      hasToken: false,
      tokenType: 'agency' as const,
      error: 'Request timeout. Please refresh the page.'
    });
  }
});

// Removed duplicate - see line 450 for the active /api/location/validate endpoint

app.get('/api/agency/status', async (req, res) => {
  const hasAgency = await hasAgencyAuthorization();
  const agencyInstallation = await getAgencyInstallation();
  
  return res.json({
    authorized: hasAgency,
    installation: agencyInstallation ? {
      accountId: agencyInstallation.accountId,
      expiresAt: agencyInstallation.expiresAt,
      createdAt: agencyInstallation.createdAt
    } : null
  });
});

// Validate a specific locationId via cc360-customers-admin API
app.get('/api/location/validate', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required' });
  }
  
  const apiKey = process.env.CC360_CUSTOMERS_API_KEY;
  const apiBaseUrl = process.env.CC360_CUSTOMERS_API_BASE_URL || 'https://cc360-customers-admin/api';
  
  // If API key is not configured, return invalid
  if (!apiKey) {
    console.error('[Location Validation] ❌ CC360_CUSTOMERS_API_KEY is not configured');
    return res.json({ 
      valid: false,
      location: null,
      error: 'API key not configured' 
    });
  }
  
  const startTime = Date.now();
  console.log('[Location Validation] Checking locationId:', locationId);
  console.log(`[Location Validation] Calling: ${apiBaseUrl}/customers?locationId=${locationId}`);
  
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch(`${apiBaseUrl}/customers?locationId=${locationId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    
    // Only 200 responses with customer data mean valid
    if (response.ok && response.status === 200) {
      const customer = await response.json();
      
      // Verify we got customer data with matching locationId
      if (customer && customer.locationId === locationId) {
        console.log(`[Location Validation] ✅ Valid location: ${customer.name || locationId} (${elapsed}ms)`);
        return res.json({
          valid: true,
          location: {
            id: customer.locationId,
            name: customer.name,
            companyId: customer.companyId
          },
          locationName: customer.name
        });
      } else {
        console.warn(`[Location Validation] ⚠️ API returned 200 but no matching customer data (${elapsed}ms)`);
        return res.json({
          valid: false,
          location: null,
          error: 'No customer data found'
        });
      }
    } else {
      // Any non-200 response means not valid
      console.log(`[Location Validation] ❌ Location not valid (HTTP ${response.status}, ${elapsed}ms)`);
      return res.json({
        valid: false,
        location: null,
        error: `Location not found (HTTP ${response.status})`
      });
    }
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    
    // Handle timeout errors
    if (error.name === 'AbortError') {
      console.error(`[Location Validation] ❌ API call timeout (${elapsed}ms)`);
      return res.json({
        valid: false,
        location: null,
        error: 'Validation timeout'
      });
    }
    
    // Handle network and other errors
    console.error(`[Location Validation] ❌ API call failed (${elapsed}ms):`, error.message);
    return res.json({
      valid: false,
      location: null,
      error: 'API call failed'
    });
  }
});

app.delete('/api/installation', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  // Special handling for agency deletion
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

app.post('/api/test/clear-location', async (req, res) => {
  const { locationId } = req.body as { locationId?: string };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  console.log(`[Test] Clearing all data for location: ${locationId}`);
  
  try {
    // Clear onboarding status for this location
    await updateOnboardingStatus(locationId, {
      domainConnected: false,
      courseCreated: false,
      paymentIntegrated: false,
      dismissed: false
    });
    
    // Clear location-specific installation (but keep agency)
    await deleteInstallation(locationId);
    
    // Broadcast the reset to any connected clients
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

app.get('/api/onboarding/:locationId/check-products', async (req, res) => {
  const locationId = req.params.locationId;
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  console.log(`[Check Products] Triggered for location: ${locationId}`);
  
  try {
    // Check if products exist via GHL API
    const hasProducts = await checkLocationProducts(locationId);
    
    // Get current status
    let status = await getOnboardingStatus(locationId);
    
    // Update if status changed
    if (hasProducts !== status.courseCreated) {
      console.log(`[Check Products] Status changed for ${locationId}: ${status.courseCreated} -> ${hasProducts}`);
      status = await updateOnboardingStatus(locationId, { courseCreated: hasProducts });
      
      // Broadcast update to connected clients
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

app.post('/api/dismiss', async (req, res) => {
  const { locationId } = req.body as { locationId?: string };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  const status = await setDismissed(locationId, true);
  await sseBroker.broadcastStatus(locationId);
  res.json(status);
});

// Update onboarding status fields (for testing/demo)
app.post('/api/onboarding/update', async (req, res) => {
  const { locationId, updates } = req.body as { locationId?: string; updates?: Partial<OnboardingStatus> };
  
  console.log('[Onboarding Update] Request received:', { locationId, updates });
  
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  if (!updates) return res.status(400).json({ error: 'updates is required' });
  
  try {
    // Get status before update
    const beforeUpdate = await getOnboardingStatus(locationId);
    console.log('[Onboarding Update] Before update:', beforeUpdate);
    
    // Pass updates directly - db layer handles filtering
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

// Toggle a specific onboarding field (for testing/demo) - atomic operation
app.post('/api/onboarding/toggle', async (req, res) => {
  const { locationId, field } = req.body as { locationId?: string; field?: string };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  if (!field) return res.status(400).json({ error: 'field is required' });
  
  // Validate field name
  const validFields = ['locationVerified', 'domainConnected', 'courseCreated', 'paymentIntegrated', 'dismissed'];
  if (!validFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid field name' });
  }
  
  // Atomically toggle the field - always gets fresh data from DB
  const status = await toggleOnboardingField(
    locationId, 
    field as 'locationVerified' | 'domainConnected' | 'courseCreated' | 'paymentIntegrated' | 'dismissed'
  );
  
  await sseBroker.broadcastStatus(locationId);
  res.json(status);
});

// Sub-account management endpoints
app.get('/api/sub-accounts', async (req, res) => {
  try {
    const accountId = req.query.accountId as string | undefined;
    
    if (accountId) {
      // Get sub-accounts for a specific agency
      const subAccounts = await getSubAccountsByAgency(accountId);
      return res.json({
        success: true,
        count: subAccounts.length,
        subAccounts
      });
    } else {
      // Get all sub-accounts (admin view)
      const subAccounts = await getAllSubAccounts();
      return res.json({
        success: true,
        count: subAccounts.length,
        subAccounts
      });
    }
  } catch (error) {
    console.error('[API] Error fetching sub-accounts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sub-accounts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/sub-accounts/verify/:locationId', async (req, res) => {
  try {
    const locationId = req.params.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }
    
    // Check which agency this location belongs to
    const agencyAccountId = await getAgencyForLocation(locationId);
    
    if (!agencyAccountId) {
      return res.json({
        success: true,
        isUnderAgency: false,
        locationId,
        message: 'Location is not registered under any agency'
      });
    }
    
    // Get the sub-account details
    const subAccount = await getSubAccount(locationId);
    
    // Get agency installation info
    const agencyInstallation = await getAgencyInstallation();
    
    return res.json({
      success: true,
      isUnderAgency: true,
      locationId,
      agencyAccountId,
      isActive: subAccount?.isActive,
      locationName: subAccount?.locationName,
      firstAccessedAt: subAccount?.firstAccessedAt,
      lastAccessedAt: subAccount?.lastAccessedAt,
      agencyAuthorized: agencyInstallation?.accountId === agencyAccountId
    });
  } catch (error) {
    console.error('[API] Error verifying sub-account:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify sub-account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/sub-accounts/:locationId', async (req, res) => {
  try {
    const locationId = req.params.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }
    
    const subAccount = await getSubAccount(locationId);
    
    if (!subAccount) {
      return res.status(404).json({
        success: false,
        error: 'Sub-account not found'
      });
    }
    
    return res.json({
      success: true,
      subAccount
    });
  } catch (error) {
    console.error('[API] Error fetching sub-account:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sub-account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/sub-accounts/stats/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }
    
    const stats = await getSubAccountStats(accountId);
    
    return res.json({
      success: true,
      accountId,
      stats
    });
  } catch (error) {
    console.error('[API] Error fetching sub-account stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sub-account stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/sub-accounts/:locationId/deactivate', async (req, res) => {
  try {
    const locationId = req.params.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }
    
    const subAccount = await deactivateSubAccount(locationId);
    
    if (!subAccount) {
      return res.status(404).json({
        success: false,
        error: 'Sub-account not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Sub-account deactivated successfully',
      subAccount
    });
  } catch (error) {
    console.error('[API] Error deactivating sub-account:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to deactivate sub-account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/events', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).end();
  sseBroker.addClient(locationId, res);
  await sseBroker.broadcastStatus(locationId);
});

// Redirect middleware - redirect from auto-generated Vercel URLs to custom domain
app.use((req, res, next) => {
  const host = req.get('host') || '';
  const preferredDomain = process.env.PREFERRED_DOMAIN; // e.g., 'onboarding.yourdomain.com'
  
  // If PREFERRED_DOMAIN is set and current host doesn't match, redirect
  if (preferredDomain && !host.includes(preferredDomain)) {
    const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const redirectUrl = `${protocol}://${preferredDomain}${req.originalUrl}`;
    console.log(`[Redirect] ${host} → ${preferredDomain}`);
    return res.redirect(301, redirectUrl);
  }
  
  next();
});

app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.get('/widget.js', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'widget.js'));
});

// Serve demo page at root
app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

export default app;


