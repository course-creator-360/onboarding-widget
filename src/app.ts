import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import oauthRouter from './oauth';
import webhookRouter from './webhooks';
import { getOnboardingStatus, setDismissed, updateOnboardingStatus, getInstallation, hasAgencyAuthorization, getAgencyInstallation, deleteInstallation, OnboardingStatus, toggleOnboardingField, upsertInstallation, registerSubAccount, getSubAccount, getSubAccountsByAgency, getAllSubAccounts, getSubAccountStats, deactivateSubAccount, getAgencyForLocation, isSubAccountUnderAgency } from './db';
import { sseBroker } from './sse';
import { checkLocationDomain, checkLocationProducts, checkPaymentIntegration, validateToken, getAuthToken } from './ghl-api';
import { validateLocationId, getSDKClient, getAgencyLocations } from './ghl-sdk';
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

app.get('/api/config', (_req, res) => {
  // Get Userpilot token based on environment
  const userpilotToken = process.env.NODE_ENV === 'production' 
    ? process.env.USERPILOT_TOKEN 
    : (process.env.USERPILOT_STAGE_TOKEN || process.env.USERPILOT_TOKEN);
  
  return res.json({
    apiBase: getBaseUrl(),
    environment: getEnvironment(),
    ghlAppBaseUrl: getGhlAppBaseUrl(),
    userpilotToken: userpilotToken || null  // Expose for client-side SDK
  });
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
  
  // Check if API checks should be skipped (for testing)
  const skipApiChecks = req.query.skipApiChecks === 'true';
  
  let status = await getOnboardingStatus(locationId);
  
  // Proactively check all onboarding steps via GHL API if authorized (unless skipped)
  const isAuthorized = await hasAgencyAuthorization();
  console.log(`[Status] Checking status for ${locationId}, agency authorized: ${isAuthorized}, skipApiChecks: ${skipApiChecks}`);
  
  if (isAuthorized && !skipApiChecks) {
    try {
      // Verify locationId via GHL SDK if not yet verified
      if (!status.locationVerified) {
        console.log(`[Status] Location not yet verified, validating ${locationId} via GHL SDK...`);
        const validation = await validateLocationId(locationId);
        if (validation.valid) {
          console.log(`[Status] Location ${locationId} verified successfully`);
          status = await updateOnboardingStatus(locationId, { locationVerified: true });
          await sseBroker.broadcastStatus(locationId);
        } else {
          console.log(`[Status] Location ${locationId} validation failed`);
        }
      }
      
      // Check domain and payment statuses via API (products use webhooks)
      const [hasDomain, hasPayment] = await Promise.all([
        checkLocationDomain(locationId),
        checkPaymentIntegration(locationId)
      ]);
      
      // Track if any status changed
      let statusChanged = false;
      const updates: any = {};
      
      // Check domain status
      if (hasDomain !== status.domainConnected) {
        console.log(`[Status] Domain status changed for ${locationId}: ${status.domainConnected} -> ${hasDomain}`);
        updates.domainConnected = hasDomain;
        statusChanged = true;
      }
      
      // Check payment integration status
      if (hasPayment !== status.paymentIntegrated) {
        console.log(`[Status] Payment integration status changed for ${locationId}: ${status.paymentIntegrated} -> ${hasPayment}`);
        updates.paymentIntegrated = hasPayment;
        statusChanged = true;
      }
      
      // Note: Product/course status is now checked via webhooks only
      // This prevents false positives and only updates when products are actually created
      
      // Update database if any status changed
      if (statusChanged) {
        status = await updateOnboardingStatus(locationId, updates);
        
        // Broadcast update to other connected clients
        await sseBroker.broadcastStatus(locationId);
      }
    } catch (error) {
      console.error('[Status] Error checking API statuses:', error);
      // Continue with cached status if API check fails
    }
  } else {
    if (skipApiChecks) {
      console.log('[Status] Skipping API checks (testing mode enabled)');
    } else {
      console.log('[Status] Agency not authorized, skipping API checks');
    }
  }
  
  // Log widget visibility decision
  console.log(`[Status] Widget visibility for ${locationId}: ${status.shouldShowWidget} (dismissed: ${status.dismissed}, allTasksCompleted: ${status.allTasksCompleted})`);
  
  return res.json(status);
});

app.get('/api/location-context', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  try {
    console.log(`[Location Context] Fetching context for location: ${locationId}`);
    
    // First validate the location ID
    const validation = await validateLocationId(locationId);
    if (!validation.valid) {
      console.error(`[Location Context] Location validation failed for ${locationId}`);
      throw new Error('Invalid or inaccessible location ID');
    }
    
    const location = validation.location;
    
    if (!location) {
      throw new Error('Location not found in validation response');
    }
    
    console.log(`[Location Context] Successfully fetched context for: ${location.name}`);
    console.log(`[Location Context] Company ID: ${location.companyId}`);
    
    // Return sanitized user context (widget will handle Userpilot identify client-side)
    return res.json({
      locationId: location.id,
      name: location.name || 'Unknown',
      email: location.email || '',
      phone: location.phone || '',
      companyId: location.companyId || '',
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      country: location.country || '',
      website: location.website || '',
      timezone: location.timezone || '',
    });
  } catch (error) {
    console.error('[Location Context] Error fetching location data:', error);
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
  
  // Check if agency is authorized (takes precedence)
  const hasAgency = await hasAgencyAuthorization();
  if (hasAgency) {
    // Agency authorization exists - attempt to get a valid token (will auto-refresh if needed)
    const token = await getAuthToken(locationId);
    
    if (!token) {
      console.log('[Installation Check] Failed to get valid token for location:', locationId);
      return res.json({
        installed: false,
        hasToken: false,
        tokenType: 'agency',
        error: 'Your authorization has expired. Please contact your agency administrator to reauthorize this app.'
      });
    }
    
    // Token is valid - register/update sub-account tracking
    console.log('[Installation Check] Valid token obtained for location:', locationId);
    
    // Get agency installation to extract accountId
    const agencyInstallation = await getAgencyInstallation();
    
    // Try to fetch location details for better tracking
    try {
      const validation = await validateLocationId(locationId);
      if (validation.valid && validation.location && agencyInstallation?.accountId) {
        // Check if this is a new sub-account or existing one
        const existingSubAccount = await getSubAccount(locationId);
        const isNewSubAccount = !existingSubAccount;
        
        // Register or update the sub-account
        const subAccount = await registerSubAccount({
          locationId: locationId,
          accountId: agencyInstallation.accountId,
          locationName: validation.location.name,
          companyId: validation.location.companyId,
          metadata: {
            email: validation.location.email,
            phone: validation.location.phone,
            website: validation.location.website,
            timezone: validation.location.timezone,
          }
        });
        
        if (isNewSubAccount) {
          console.log(`[Installation Check] ✨ NEW SUB-ACCOUNT DETECTED ✨`);
          console.log(`[Installation Check] Location: ${validation.location.name} (${locationId})`);
          console.log(`[Installation Check] Agency: ${agencyInstallation.accountId}`);
          console.log(`[Installation Check] Company: ${validation.location.companyId}`);
          console.log(`[Installation Check] This sub-account is now tracked under the agency`);
        } else {
          console.log(`[Installation Check] Existing sub-account updated: ${locationId}`);
          console.log(`[Installation Check] Last accessed updated for: ${validation.location.name}`);
        }
      } else if (!agencyInstallation?.accountId) {
        console.warn('[Installation Check] Agency installation exists but accountId is missing');
      }
    } catch (error) {
      console.error('[Installation Check] Failed to register sub-account:', error);
      // Don't fail the installation check if sub-account registration fails
    }
    
    return res.json({
      installed: true,
      hasToken: true,
      tokenType: 'agency'
    });
  }
  
  // Fall back to per-location check
  const installation = await getInstallation(locationId);
  if (installation) {
    // Attempt to get a valid token (will auto-refresh if needed)
    const token = await getAuthToken(locationId);
    
    if (!token) {
      console.log('[Installation Check] Failed to get valid token for location:', locationId);
      return res.json({
        installed: false,
        hasToken: false,
        tokenType: 'location',
        error: 'Your authorization has expired. Please reauthorize this app.'
      });
    }
    
    // Token is valid (either existing or refreshed)
    console.log('[Installation Check] Valid token obtained for location:', locationId);
    return res.json({
      installed: true,
      hasToken: true,
      tokenType: installation?.tokenType || 'location'
    });
  }
  
  return res.json({
    installed: false,
    hasToken: false,
    tokenType: 'location',
    error: 'Agency administrator needs to authorize this app. Please contact your agency admin.'
  });
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

// Get all locations from the agency (for demo page)
app.get('/api/agency/locations', async (req, res) => {
  try {
    const hasAgency = await hasAgencyAuthorization();
    if (!hasAgency) {
      return res.status(401).json({ 
        error: 'Agency not authorized',
        message: 'Please setup agency OAuth first'
      });
    }
    
    const locations = await getAgencyLocations();
    
    // Format locations for demo page
    const formattedLocations = locations.map((loc: any) => ({
      id: loc.id,
      name: loc.name,
      companyId: loc.companyId,
      address: loc.address || null,
      website: loc.website || null
    }));
    
    return res.json({
      locations: formattedLocations,
      count: formattedLocations.length
    });
  } catch (error) {
    console.error('[API] Error fetching agency locations:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch locations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validate a specific locationId
app.get('/api/location/validate', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required' });
  }
  
  try {
    console.log('[Location Validation] Validating locationId:', locationId);
    const result = await validateLocationId(locationId);
    
    if (result.valid) {
      console.log('[Location Validation] Location is valid:', locationId);
      return res.json({
        valid: true,
        location: {
          id: result.location?.id || locationId,
          name: result.location?.name || locationId,
          companyId: result.companyId
        },
        locationName: result.location?.name || locationId // For backward compatibility
      });
    } else {
      console.log('[Location Validation] Location not found or unauthorized:', locationId);
      return res.json({
        valid: false,
        location: null,
        error: 'Location not found or not accessible with current authorization'
      });
    }
  } catch (error) {
    console.error('[Location Validation] Error validating locationId:', error);
    return res.status(500).json({ 
      valid: false,
      location: null,
      error: 'Failed to validate location',
      message: error instanceof Error ? error.message : 'Unknown error'
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

app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.get('/widget.js', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'widget.js'));
});

// Serve demo page at root
app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

export default app;


