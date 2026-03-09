import { Router } from 'express';
import { updateSurveyCompletion } from '../db';
import { sseBroker } from '../sse';
import { getCC360AdminConfig } from '../cc360-admin';

const router = Router();

router.post('/survey/complete', async (req, res) => {
  const { locationId, surveyResponses } = req.body as { locationId?: string; surveyResponses?: any };
  
  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required' });
  }
  
  if (!surveyResponses) {
    return res.status(400).json({ error: 'surveyResponses is required' });
  }
  
  const { apiKey, apiBaseUrl } = getCC360AdminConfig();
  
  if (!apiKey) {
    console.error('[Survey Complete] ❌ CC360_CUSTOMERS_ADMIN_API_KEY or CC360_CUSTOMERS_API_KEY is not configured');
    return res.status(500).json({ 
      error: 'API key not configured',
      message: 'Survey API key is not set'
    });
  }
  
  try {
    console.log(`[Survey Complete] Saving survey to local DB for ${locationId}`);
    const status = await updateSurveyCompletion(locationId);
    await sseBroker.broadcastStatus(locationId);
    console.log(`[Survey Complete] ✅ Survey saved locally for ${locationId}`);

    res.json(status);

    // Sync to CC360 admin API in background (non-blocking)
    if (apiKey) {
      fetch(`${apiBaseUrl}/api/customers/survey`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, surveyCompleted: true, surveyResponses }),
      }).then(() => {
        console.log(`[Survey Complete] ✅ Synced to external API for ${locationId}`);
      }).catch((err) => {
        console.warn(`[Survey Complete] External API sync failed (non-critical):`, err.message);
      });
    }
  } catch (error) {
    console.error('[Survey Complete] Error saving survey:', error);
    res.status(500).json({ 
      error: 'Failed to complete survey',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
