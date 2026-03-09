import { Router } from 'express';
import { getCC360AdminConfig } from '../cc360-admin';

const router = Router();

router.get('/location/verify', async (req, res) => {
  const locationId = (req.query.locationId as string);
  
  if (!locationId) {
    return res.status(400).json({ 
      authorized: false, 
      error: 'locationId is required' 
    });
  }
  
  const { apiKey, apiBaseUrl } = getCC360AdminConfig();
  
  if (!apiKey) {
    console.error('[Location Verify] ❌ CC360_CUSTOMERS_API_KEY is not configured');
    return res.json({ 
      authorized: false, 
      error: 'API key not configured' 
    });
  }
  
  try {
    console.log(`[Location Verify] Checking authorization for location: ${locationId}`);
    console.log(`[Location Verify] Calling: ${apiBaseUrl}/api/customers?locationId=${locationId}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${apiBaseUrl}/api/customers?locationId=${locationId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok && response.status === 200) {
      const customer = await response.json();
      
      if (customer && customer.locationId === locationId) {
        console.log(`[Location Verify] ✅ Location authorized: ${customer.name || locationId}`);
        return res.json({ 
          authorized: true,
          valid: true,
          locationName: customer.name || locationId,
          customer: {
            id: customer.id,
            locationId: customer.locationId,
            name: customer.name,
            email: customer.email,
            companyId: customer.companyId || '',
            subscriptionStatus: customer.subscriptionStatus || null,
            createdAt: customer.createdAt || null,
            surveyCompleted: customer.surveyCompleted ?? null,
          }
        });
      } else {
        console.warn(`[Location Verify] ⚠️ API returned 200 but no matching customer data`);
        return res.json({ 
          authorized: false, 
          error: 'No customer data found' 
        });
      }
    } else {
      console.log(`[Location Verify] ❌ Location not authorized (HTTP ${response.status})`);
      return res.json({ 
        authorized: false, 
        error: `Location not found (HTTP ${response.status})` 
      });
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[Location Verify] ❌ API call timeout (>5s)');
      return res.json({ 
        authorized: false, 
        error: 'API timeout' 
      });
    }
    
    console.error('[Location Verify] ❌ API call failed:', error.message);
    return res.json({ 
      authorized: false, 
      error: 'API call failed' 
    });
  }
});

router.get('/location/validate', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required' });
  }
  
  const { apiKey, apiBaseUrl } = getCC360AdminConfig();
  
  if (!apiKey) {
    console.error('[Location Validation] ❌ CC360_CUSTOMERS_API_KEY is not configured');
    return res.json({ 
      valid: false,
      location: null,
      error: 'API key not configured' 
    });
  }
  
  const startTime = Date.now();
  console.log('[Location Validation] Checking locationId:', locationId);
  console.log(`[Location Validation] Calling: ${apiBaseUrl}/api/customers?locationId=${locationId}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(`${apiBaseUrl}/api/customers?locationId=${locationId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    
    if (response.ok && response.status === 200) {
      const customer = await response.json();
      
      if (customer && customer.locationId === locationId) {
        console.log(`[Location Validation] ✅ Valid location: ${customer.name || locationId} (${elapsed}ms)`);
        return res.json({
          valid: true,
          location: {
            id: customer.locationId,
            name: customer.name,
            companyId: customer.companyId
          },
          locationName: customer.name
        });
      } else {
        console.warn(`[Location Validation] ⚠️ API returned 200 but no matching customer data (${elapsed}ms)`);
        return res.json({
          valid: false,
          location: null,
          error: 'No customer data found'
        });
      }
    } else {
      console.log(`[Location Validation] ❌ Location not valid (HTTP ${response.status}, ${elapsed}ms)`);
      return res.json({
        valid: false,
        location: null,
        error: `Location not found (HTTP ${response.status})`
      });
    }
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      console.error(`[Location Validation] ❌ API call timeout (${elapsed}ms)`);
      return res.json({
        valid: false,
        location: null,
        error: 'Validation timeout'
      });
    }
    
    console.error(`[Location Validation] ❌ API call failed (${elapsed}ms):`, error.message);
    return res.json({
      valid: false,
      location: null,
      error: 'API call failed'
    });
  }
});

router.get('/location-context', async (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  
  const { apiKey, apiBaseUrl } = getCC360AdminConfig();
  
  if (!apiKey) {
    console.error('[Location Context] ❌ CC360_CUSTOMERS_API_KEY is not configured');
    return res.status(500).json({ 
      error: 'API key not configured' 
    });
  }
  
  try {
    console.log(`[Location Context] Fetching context for location: ${locationId}`);
    console.log(`[Location Context] Calling: ${apiBaseUrl}/api/customers?locationId=${locationId}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${apiBaseUrl}/api/customers?locationId=${locationId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok && response.status === 200) {
      const customer = await response.json();
      
      if (customer && customer.locationId === locationId) {
        console.log(`[Location Context] ✅ Successfully fetched context for: ${customer.name || locationId}`);
        
        return res.json({
          locationId: customer.locationId,
          name: customer.name || 'Unknown',
          email: customer.email || '',
          phone: customer.phone || '',
          companyId: customer.companyId || '',
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          country: customer.country || '',
          website: customer.website || '',
          timezone: customer.timezone || '',
        });
      } else {
        console.error(`[Location Context] ⚠️ API returned 200 but no matching customer data`);
        return res.status(404).json({ 
          error: 'Location not found' 
        });
      }
    } else {
      console.error(`[Location Context] ❌ Location not found (HTTP ${response.status})`);
      return res.status(404).json({ 
        error: `Location not found (HTTP ${response.status})` 
      });
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[Location Context] ❌ API call timeout (>5s)');
      return res.status(504).json({ 
        error: 'API timeout' 
      });
    }
    
    console.error('[Location Context] ❌ Error fetching location data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch location context';
    return res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV !== 'production' ? error : undefined
    });
  }
});

export default router;
