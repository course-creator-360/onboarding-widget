import express from 'express';
import { logEvent, updateOnboardingStatus, getOnboardingStatus } from './db';
import { sseBroker } from './sse';
import { sendUserpilotEvent } from './userpilot';
import { checkPaymentIntegration } from './ghl-api';

const router = express.Router();

router.post('/ghl', async (req, res) => {
  const eventType: string = (req.body?.event || req.body?.type || '').toString();
  const payload = req.body || {};
  
  // For LocationUpdate webhooks, the locationId is in the "id" property
  let locationId: string | undefined;
  if (/LocationUpdate/i.test(eventType)) {
    locationId = payload?.id;
  } else {
    locationId = payload?.locationId || payload?.location_id || payload?.id || payload?.account?.locationId || payload?.location || payload?.accountId;
  }

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
      await updateOnboardingStatus(locationId, { domainConnected: hasDomain });
      await sendUserpilotEvent('locationId', locationId, 
        hasDomain ? 'domain_connected' : 'domain_removed'
      );
      updated = true;
    }
    
    // Product/Course creation webhook
    if (/Product(Create|Update)/i.test(eventType)) {
      console.log('✅ Matched: Product Create/Update webhook');
      
      // Check current status before updating
      const currentStatus = await getOnboardingStatus(locationId);
      
      // Only update if courseCreated is currently false
      if (!currentStatus.courseCreated) {
        console.log('   courseCreated was false, updating to true');
        await updateOnboardingStatus(locationId, { courseCreated: true });
        await sendUserpilotEvent('locationId', locationId, 'course_created');
        updated = true;
      } else {
        console.log('   courseCreated already true, skipping update');
      }
    }
    
    if (/LocationUpdate/i.test(eventType)) {
      console.log('✅ Matched: LocationUpdate webhook');
      
      // LocationUpdate webhooks don't include payment provider info in payload
      // Query the API to check current payment integration status
      try {
        const hasPayment = await checkPaymentIntegration(locationId);
        console.log('   Payment integration detected via API:', hasPayment);
        
        // Get current status to see if it changed
        const currentStatus = await getOnboardingStatus(locationId);
        
        if (hasPayment !== currentStatus.paymentIntegrated) {
          console.log(`   Payment status changed: ${currentStatus.paymentIntegrated} -> ${hasPayment}`);
          await updateOnboardingStatus(locationId, { paymentIntegrated: hasPayment });
          await sendUserpilotEvent('locationId', locationId, 
            hasPayment ? 'payment_integrated' : 'payment_disconnected'
          );
          updated = true;
        } else {
          console.log('   Payment status unchanged, skipping update');
        }
      } catch (error) {
        console.error('   Error checking payment integration:', error);
      }
    }

    if (!updated) {
      console.log('⚠️  No webhook pattern matched for event type:', eventType);
    }
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
  }

  if (updated) {
    console.log('📡 Broadcasting update via SSE to locationId:', locationId);
    await sseBroker.broadcastStatus(locationId);
  }
  
  console.log('✓ Webhook processed successfully\n');
  res.status(200).json({ ok: true });
});

export default router;



