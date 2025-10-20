import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import oauthRouter from './oauth';
import webhookRouter from './webhooks';
import { getOnboardingStatus, setDismissed, updateOnboardingStatus, getInstallation, hasAgencyAuthorization, getAgencyInstallation } from './db';
import { sseBroker } from './sse';
import { checkLocationDomain, checkLocationProducts, checkPaymentIntegration, validateToken } from './ghl-api';

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
    testLocationId: process.env.GHL_SUBACCOUNT_TEST_LOCATION_ID || 'kgREXsjAvhag6Qn8Yjqn',
    apiBase: process.env.API_BASE || 'http://localhost:4002',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/status', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  let status = getOnboardingStatus(locationId);
  
  // Proactively check all onboarding steps via GHL API if authorized
  const isAuthorized = hasAgencyAuthorization();
  console.log(`[Status] Checking status for ${locationId}, agency authorized: ${isAuthorized}`);
  
  if (isAuthorized) {
    try {
      // Check domain and payment statuses via API (products use fetch interception)
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
      
      // Note: Product/course status is now checked via fetch interception only
      // This prevents false positives and only updates when products are actually created
      
      // Update database if any status changed
      if (statusChanged) {
        status = updateOnboardingStatus(locationId, updates);
        
        // Broadcast update to other connected clients
        sseBroker.broadcastStatus(locationId);
      }
    } catch (error) {
      console.error('[Status] Error checking API statuses:', error);
      // Continue with cached status if API check fails
    }
  } else {
    console.log('[Status] Agency not authorized, skipping API checks');
  }
  
  return res.json(status);
});

app.get('/api/installation/check', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  // Check if agency is authorized (takes precedence)
  const hasAgency = hasAgencyAuthorization();
  if (hasAgency) {
    // Optionally validate token (don't block if validation fails due to missing scope)
    try {
      const tokenValid = await validateToken(locationId);
      
      if (!tokenValid) {
        console.log('[Installation Check] Token validation failed, but allowing widget to work');
        // Return as installed but with warning
        return res.json({
          installed: true,
          hasToken: true,
          tokenType: 'agency',
          tokenValid: false,
          warning: 'Token may be missing required scopes. Add locations.readonly scope for full functionality.'
        });
      }
    } catch (error) {
      console.log('[Installation Check] Token validation error, proceeding anyway:', error);
    }
    
    return res.json({
      installed: true,
      hasToken: true,
      tokenType: 'agency',
      tokenValid: true
    });
  }
  
  // Fall back to per-location check
  const installation = getInstallation(locationId);
  return res.json({
    installed: !!installation,
    hasToken: !!installation?.accessToken,
    tokenType: installation?.tokenType || 'location'
  });
});

app.get('/api/agency/status', (req, res) => {
  const hasAgency = hasAgencyAuthorization();
  const agencyInstallation = getAgencyInstallation();
  
  return res.json({
    authorized: hasAgency,
    installation: agencyInstallation ? {
      accountId: agencyInstallation.accountId,
      expiresAt: agencyInstallation.expiresAt,
      createdAt: agencyInstallation.createdAt
    } : null
  });
});

app.delete('/api/installation', (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  const { deleteInstallation } = require('./db');
  deleteInstallation(locationId);
  return res.json({ success: true, message: 'Installation deleted' });
});

app.post('/api/test/clear-location', (req, res) => {
  const { locationId } = req.body as { locationId?: string };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  console.log(`[Test] Clearing all data for location: ${locationId}`);
  
  try {
    // Clear onboarding status for this location
    updateOnboardingStatus(locationId, {
      domainConnected: false,
      courseCreated: false,
      productAttached: false,
      paymentIntegrated: false,
      dismissed: false
    });
    
    // Clear location-specific installation (but keep agency)
    const { deleteInstallation } = require('./db');
    deleteInstallation(locationId);
    
    // Broadcast the reset to any connected clients
    sseBroker.broadcastStatus(locationId);
    
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
    let status = getOnboardingStatus(locationId);
    
    // Update if status changed
    if (hasProducts !== status.courseCreated) {
      console.log(`[Check Products] Status changed for ${locationId}: ${status.courseCreated} -> ${hasProducts}`);
      status = updateOnboardingStatus(locationId, { courseCreated: hasProducts });
      
      // Broadcast update to connected clients
      sseBroker.broadcastStatus(locationId);
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

app.post('/api/dismiss', (req, res) => {
  const { locationId } = req.body as { locationId?: string };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  const status = setDismissed(locationId, true);
  sseBroker.broadcastStatus(locationId);
  res.json(status);
});

app.post('/api/mock/set', (req, res) => {
  const { locationId, updates } = req.body as { locationId?: string; updates?: Record<string, unknown> };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  const status = updateOnboardingStatus(locationId, {
    domainConnected: updates?.domainConnected as boolean | undefined,
    courseCreated: updates?.courseCreated as boolean | undefined,
    productAttached: updates?.productAttached as boolean | undefined,
    paymentIntegrated: updates?.paymentIntegrated as boolean | undefined,
    dismissed: updates?.dismissed as boolean | undefined
  });
  sseBroker.broadcastStatus(locationId);
  res.json(status);
});

app.get('/api/events', (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).end();
  sseBroker.addClient(locationId, res);
  sseBroker.broadcastStatus(locationId);
});

app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.get('/widget.js', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'widget.js'));
});

// Serve demo page at root
app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Serve test account page
app.get('/test', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'test-account.html'));
});

export default app;


