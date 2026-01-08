import { Router } from 'express';
import { getBaseUrl, getEnvironment, getGhlAppBaseUrl } from '../config';

const router = Router();

router.get('/healthz', (_req, res) => res.json({ ok: true }));

router.get('/config', async (_req, res) => {
  const userpilotToken = process.env.NODE_ENV === 'production' 
    ? process.env.USERPILOT_TOKEN 
    : (process.env.USERPILOT_STAGE_TOKEN || process.env.USERPILOT_TOKEN);
  
  const segmentWriteKey = process.env.SEGMENT_WRITE_KEY || null;
  
  const filterLocationId = process.env.WIDGET_LOCATION_ID_FILTER || null;
  const customersApiKey = process.env.CC360_CUSTOMERS_API_KEY;
  
  const featureConnectPaymentsEnabled = process.env.FEATURE_CONNECT_PAYMENTS_ENABLED !== 'false';
  const featureConnectDomainEnabled = process.env.FEATURE_CONNECT_DOMAIN_ENABLED !== 'false';
  
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
  
  if (segmentWriteKey) {
    console.log('[Config] ✅ Segment analytics is configured');
  }
  
  return res.json({
    apiBase: getBaseUrl(),
    environment: getEnvironment(),
    ghlAppBaseUrl: getGhlAppBaseUrl(),
    userpilotToken: userpilotToken || null,
    segmentWriteKey: segmentWriteKey,
    widgetLocationFilter: filterLocationId,
    customersApiConfigured: customersApiConfigured,
    featureFlags: {
      connectPaymentsEnabled: featureConnectPaymentsEnabled,
      connectDomainEnabled: featureConnectDomainEnabled
    }
  });
});

router.post('/migrate', async (_req, res) => {
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

export default router;
