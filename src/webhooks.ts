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

  if (!locationId) {
    return res.status(200).json({ ok: true });
  }

  logEvent(locationId, eventType || 'unknown', payload);

  let updated = false;
  try {
    if (/ExternalAuthConnected/i.test(eventType)) {
      updateOnboardingStatus(locationId, { paymentIntegrated: true });
      await sendUserpilotEvent('locationId', locationId, 'payment_integrated');
      updated = true;
    }
    if (/Product(Create|Update)/i.test(eventType)) {
      updateOnboardingStatus(locationId, { courseCreated: true });
      await sendUserpilotEvent('locationId', locationId, 'course_created');
      updated = true;
    }
    if (/OrderCreate/i.test(eventType)) {
      updateOnboardingStatus(locationId, { productAttached: true });
      await sendUserpilotEvent('locationId', locationId, 'product_attached');
      updated = true;
    }
  } catch {}

  if (updated) sseBroker.broadcastStatus(locationId);
  res.status(200).json({ ok: true });
});

export default router;



