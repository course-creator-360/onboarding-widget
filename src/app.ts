import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import oauthRouter from './oauth';
import webhookRouter from './webhooks';
import { getOnboardingStatus, setDismissed, updateOnboardingStatus, getInstallation, hasAgencyAuthorization, getAgencyInstallation, deleteInstallation, OnboardingStatus, toggleOnboardingField } from './db';
import { sseBroker } from './sse';
import { checkLocationDomain, checkLocationProducts, checkPaymentIntegration, validateToken, getAuthToken } from './ghl-api';
import { validateLocationId } from './ghl-sdk';
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

// Mount routers under /api for serverless compatibility
app.use('/api/oauth', oauthRouter);
app.use('/api/webhooks', webhookRouter);

// Marketplace installation endpoint (direct mount for GHL compatibility)
app.use('/oauth', oauthRouter);
app.use('/install', oauthRouter);

app.get('/api/healthz', (_req, res) => res.json({ ok: true }));

app.get('/api/config', (_req, res) => {
  return res.json({
    apiBase: getBaseUrl(),
    environment: getEnvironment(),
    ghlAppBaseUrl: getGhlAppBaseUrl()
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

app.get('/api/status', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  let status = await getOnboardingStatus(locationId);
  
  // Proactively check all onboarding steps via GHL API if authorized
  const isAuthorized = await hasAgencyAuthorization();
  console.log(`[Status] Checking status for ${locationId}, agency authorized: ${isAuthorized}`);
  
  if (isAuthorized) {
    try {
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
    console.log('[Status] Agency not authorized, skipping API checks');
  }
  
  // Log widget visibility decision
  console.log(`[Status] Widget visibility for ${locationId}: ${status.shouldShowWidget} (dismissed: ${status.dismissed}, allTasksCompleted: ${status.allTasksCompleted})`);
  
  return res.json(status);
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
    
    // Token is valid (either existing or refreshed)
    console.log('[Installation Check] Valid token obtained for location:', locationId);
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

app.get('/api/location/validate', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  try {
    console.log('[Location Validation] Validating locationId:', locationId);
    
    const validation = await validateLocationId(locationId);
    
    if (validation.valid) {
      console.log('[Location Validation] Location is valid:', locationId);
      return res.json({
        valid: true,
        locationId: locationId,
        companyId: validation.companyId,
        locationName: validation.location?.name || null
      });
    } else {
      console.log('[Location Validation] Location not found or unauthorized:', locationId);
      return res.status(404).json({
        valid: false,
        error: 'Location not found or not accessible with current authorization'
      });
    }
  } catch (error) {
    console.error('[Location Validation] Error validating location:', error);
    return res.status(500).json({
      valid: false,
      error: 'Failed to validate location'
    });
  }
});

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

app.delete('/api/installation', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  await deleteInstallation(locationId);
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

app.post('/api/mock/set', async (req, res) => {
  const { locationId, updates } = req.body as { locationId?: string; updates?: Partial<OnboardingStatus> };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  if (!updates) return res.status(400).json({ error: 'updates is required' });
  
  // Pass updates directly - db layer handles filtering
  const status = await updateOnboardingStatus(locationId, updates);
  await sseBroker.broadcastStatus(locationId);
  res.json(status);
});

// Toggle a specific field (for demo page) - atomic operation
app.post('/api/toggle', async (req, res) => {
  const { locationId, field } = req.body as { locationId?: string; field?: string };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  if (!field) return res.status(400).json({ error: 'field is required' });
  
  // Validate field name
  const validFields = ['domainConnected', 'courseCreated', 'paymentIntegrated', 'dismissed'];
  if (!validFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid field name' });
  }
  
  // Atomically toggle the field - always gets fresh data from DB
  const status = await toggleOnboardingField(
    locationId, 
    field as 'domainConnected' | 'courseCreated' | 'paymentIntegrated' | 'dismissed'
  );
  
  await sseBroker.broadcastStatus(locationId);
  res.json(status);
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


