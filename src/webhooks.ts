import express from 'express';
import { logEvent, updateOnboardingStatus } from './db';
import { sseBroker } from './sse';
import { sendUserpilotEvent } from './userpilot';

const router = express.Router();

router.post('/ghl', async (req, res) => {
  const eventType: string = (req.body?.event || req.body?.type || '').toString();
  const payload = req.body || {};
  const locationId: string | undefined =
    payload?.locationId || payload?.location_id || payload?.account?.locationId || payload?.location || payload?.accountId;

  // Log incoming webhook
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 WEBHOOK RECEIVED');
  console.log('Event Type:', eventType || 'NONE');
  console.log('Location ID:', locationId || 'NONE');
  console.log('Payload Keys:', Object.keys(payload));
  console.log('Full Payload:', JSON.stringify(payload, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!locationId) {
    console.log('⚠️  No locationId found - ignoring webhook');
    return res.status(200).json({ ok: true });
  }

  logEvent(locationId, eventType || 'unknown', payload);

  let updated = false;
  try {
    // Domain connection webhook (supports add/remove)
    if (/Location.*Domain|Domain.*Update|CustomDomain/i.test(eventType)) {
      console.log('✅ Matched: Domain webhook');
      // Check if domain exists in payload (simple boolean condition)
      const domain = payload?.data?.domain || 
                     payload?.data?.customDomain ||
                     payload?.domain ||
                     payload?.customDomain;
      
      // True if domain exists and is not empty
      const hasDomain = !!domain && domain !== '' && domain !== null;
      
      console.log('   Domain value:', domain, '→ hasDomain:', hasDomain);
      updateOnboardingStatus(locationId, { domainConnected: hasDomain });
      await sendUserpilotEvent('locationId', locationId, 
        hasDomain ? 'domain_connected' : 'domain_removed'
      );
      updated = true;
    }
    
    if (/ExternalAuthConnected/i.test(eventType)) {
      console.log('✅ Matched: Payment Integration webhook');
      updateOnboardingStatus(locationId, { paymentIntegrated: true });
      await sendUserpilotEvent('locationId', locationId, 'payment_integrated');
      updated = true;
    }
    if (/OrderCreate/i.test(eventType)) {
      console.log('✅ Matched: Order Create webhook');
      updateOnboardingStatus(locationId, { productAttached: true });
      await sendUserpilotEvent('locationId', locationId, 'product_attached');
      updated = true;
    }

    if (!updated) {
      console.log('⚠️  No webhook pattern matched for event type:', eventType);
    }
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
  }

  if (updated) {
    console.log('📡 Broadcasting update via SSE to locationId:', locationId);
    sseBroker.broadcastStatus(locationId);
  }
  
  console.log('✓ Webhook processed successfully\n');
  res.status(200).json({ ok: true });
});

export default router;



