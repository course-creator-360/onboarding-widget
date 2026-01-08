import { Router } from 'express';
import { updateSurveyCompletion } from '../db';
import { sseBroker } from '../sse';

const router = Router();

router.post('/survey/complete', async (req, res) => {
  const { locationId, surveyResponses } = req.body as { locationId?: string; surveyResponses?: any };
  
  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required' });
  }
  
  if (!surveyResponses) {
    return res.status(400).json({ error: 'surveyResponses is required' });
  }
  
  const apiKey = process.env.CC360_CUSTOMERS_ADMIN_API_KEY || process.env.CC360_CUSTOMERS_API_KEY;
  const apiBaseUrl = process.env.CC360_CUSTOMERS_ADMIN_API_BASE_URL || 'https://cc360-customers-admin.vercel.app';
  
  if (!apiKey) {
    console.error('[Survey Complete] ❌ CC360_CUSTOMERS_ADMIN_API_KEY or CC360_CUSTOMERS_API_KEY is not configured');
    return res.status(500).json({ 
      error: 'API key not configured',
      message: 'Survey API key is not set'
    });
  }
  
  try {
    console.log(`[Survey Complete] Sending survey data to external API for ${locationId}`);
    
    const surveyPayload = {
      locationId: locationId,
      surveyCompleted: true,
      surveyResponses: surveyResponses
    };
    
    const externalApiResponse = await fetch(`${apiBaseUrl}/api/customers/survey`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(surveyPayload)
    });
    
    if (!externalApiResponse.ok) {
      const errorText = await externalApiResponse.text();
      console.error(`[Survey Complete] ❌ External API error: ${externalApiResponse.status} - ${errorText}`);
      throw new Error(`External API error: ${externalApiResponse.status} - ${errorText}`);
    }
    
    const externalApiResult = await externalApiResponse.json();
    console.log(`[Survey Complete] ✅ Survey data sent to external API successfully`);
    
    console.log(`[Survey Complete] Marking survey complete flag in local database for ${locationId}`);
    const status = await updateSurveyCompletion(locationId);
    await sseBroker.broadcastStatus(locationId);
    console.log(`[Survey Complete] Survey completed successfully for ${locationId}`);
    
    res.json(status);
  } catch (error) {
    console.error('[Survey Complete] Error completing survey:', error);
    res.status(500).json({ 
      error: 'Failed to complete survey',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
