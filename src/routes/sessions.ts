import { Router } from 'express';

const router = Router();

const getAdminConfig = () => ({
  apiKey: process.env.CC360_CUSTOMERS_ADMIN_API_KEY || process.env.CC360_CUSTOMERS_API_KEY || '',
  baseUrl: process.env.CC360_CUSTOMERS_ADMIN_API_BASE_URL || 'https://cc360-customers-admin.vercel.app',
});

router.post('/sessions/login', async (req, res) => {
  const { locationId, metadata } = req.body as { locationId?: string; metadata?: Record<string, unknown> };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });

  const { apiKey, baseUrl } = getAdminConfig();
  if (!apiKey) return res.status(500).json({ error: 'CC360 admin API key not configured' });

  try {
    const resp = await fetch(`${baseUrl}/api/customers/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ locationId, event: 'login', metadata }),
    });
    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (error) {
    console.error('[Sessions] Login proxy error:', error);
    return res.status(502).json({ error: 'Failed to reach CC360 admin' });
  }
});

router.post('/sessions/heartbeat', async (req, res) => {
  const { locationId } = req.body as { locationId?: string };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });

  const { apiKey, baseUrl } = getAdminConfig();
  if (!apiKey) return res.status(500).json({ error: 'CC360 admin API key not configured' });

  try {
    const resp = await fetch(`${baseUrl}/api/customers/sessions/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ locationId }),
    });
    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (error) {
    console.error('[Sessions] Heartbeat proxy error:', error);
    return res.status(502).json({ error: 'Failed to reach CC360 admin' });
  }
});

router.post('/sessions/logout', async (req, res) => {
  const { locationId } = req.body as { locationId?: string };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });

  const { apiKey, baseUrl } = getAdminConfig();
  if (!apiKey) return res.status(500).json({ error: 'CC360 admin API key not configured' });

  try {
    const resp = await fetch(`${baseUrl}/api/customers/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ locationId, event: 'logout' }),
    });
    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (error) {
    console.error('[Sessions] Logout proxy error:', error);
    return res.status(502).json({ error: 'Failed to reach CC360 admin' });
  }
});

router.post('/sessions/pageview', async (req, res) => {
  const { locationId, path, url, title, source, sessionId, previousPageDuration } = req.body as {
    locationId?: string;
    path?: string;
    url?: string;
    title?: string;
    source?: string;
    sessionId?: string;
    previousPageDuration?: number;
  };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  if (!path) return res.status(400).json({ error: 'path is required' });

  const { apiKey, baseUrl } = getAdminConfig();
  if (!apiKey) return res.status(500).json({ error: 'CC360 admin API key not configured' });

  try {
    const resp = await fetch(`${baseUrl}/api/customers/sessions/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ locationId, path, url, title, source, sessionId, previousPageDuration }),
    });
    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (error) {
    console.error('[Sessions] Pageview proxy error:', error);
    return res.status(502).json({ error: 'Failed to reach CC360 admin' });
  }
});

export default router;
