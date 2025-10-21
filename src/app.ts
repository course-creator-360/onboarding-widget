import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import oauthRouter from './oauth';
import webhookRouter from './webhooks';
import { getOnboardingStatus, setDismissed, updateOnboardingStatus, getInstallation, hasAgencyAuthorization, getAgencyInstallation, deleteInstallation } from './db';
import { sseBroker } from './sse';
import { checkLocationDomain, checkLocationProducts, checkPaymentIntegration, validateToken } from './ghl-api';
import { getBaseUrl, getEnvironment, getGhlAppBaseUrl } from './config';

const app = express();
app.use(cors());
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
        DIRECT_URL: process.env.DIRECT_URL
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
  console.log(`[Status] Widget visibility for ${locationId}: ${status.shouldShowWidget} (age: ${Math.floor((Date.now() - status.createdAt) / (24 * 60 * 60 * 1000))} days, completed: ${status.domainConnected && status.courseCreated && status.paymentIntegrated})`);
  
  return res.json(status);
});

app.get('/api/installation/check', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  // Check if agency is authorized (takes precedence)
  const hasAgency = await hasAgencyAuthorization();
  if (hasAgency) {
    // Agency authorization exists, but verify token is still valid
    const tokenValid = await validateToken(locationId);
    if (!tokenValid) {
      console.log('[Installation Check] Agency token expired or invalid for location:', locationId);
      return res.json({
        installed: false,
        hasToken: false,
        tokenType: 'agency',
        error: 'Your authorization has expired. Please contact your agency administrator to reauthorize this app.'
      });
    }
    
    // Agency is authorized and token is valid
    console.log('[Installation Check] Agency authorized for location:', locationId);
    return res.json({
      installed: true,
      hasToken: true,
      tokenType: 'agency'
    });
  }
  
  // Fall back to per-location check
  const installation = await getInstallation(locationId);
  if (installation) {
    // Check if location token is valid
    const tokenValid = await validateToken(locationId);
    if (!tokenValid) {
      console.log('[Installation Check] Location token expired or invalid for:', locationId);
      return res.json({
        installed: false,
        hasToken: false,
        tokenType: 'location',
        error: 'Your authorization has expired. Please reauthorize this app.'
      });
    }
  }
  
  return res.json({
    installed: !!installation,
    hasToken: !!installation?.accessToken,
    tokenType: installation?.tokenType || 'location',
    error: !installation ? 'Agency administrator needs to authorize this app. Please contact your agency admin.' : undefined
  });
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
  const { locationId, updates } = req.body as { locationId?: string; updates?: Record<string, unknown> };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  const status = await updateOnboardingStatus(locationId, {
    domainConnected: updates?.domainConnected as boolean | undefined,
    courseCreated: updates?.courseCreated as boolean | undefined,
    paymentIntegrated: updates?.paymentIntegrated as boolean | undefined,
    dismissed: updates?.dismissed as boolean | undefined
  });
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


