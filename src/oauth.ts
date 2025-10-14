import express from 'express';
import crypto from 'crypto';
import { upsertInstallation } from './db';

const router = express.Router();

const DEFAULT_AUTHORIZE_URL = process.env.GHL_AUTHORIZE_URL || 'https://marketplace.gohighlevel.com/oauth/authorize';
const DEFAULT_TOKEN_URL = process.env.GHL_TOKEN_URL || 'https://services.leadconnectorhq.com/oauth/token';
const REDIRECT_URI = process.env.GHL_REDIRECT_URI || 'http://localhost:4002/oauth/callback';

const OAUTH_SCOPES = (
  process.env.GHL_SCOPES || [
    'courses.readonly',
    'funnels.readonly',
    'products.readonly',
    'products/prices.readonly',
    'payments/orders.readonly',
    'payments/transactions.readonly',
    'payments/custom-provider.readonly'
  ].join(' ')
);

const stateStore = new Map<string, { locationId?: string }>();

router.get('/install', (req, res) => {
  const clientId = process.env.GHL_CLIENT_ID;
  if (!clientId) return res.status(500).send('Missing GHL_CLIENT_ID');
  const locationId = (req.query.locationId as string) || undefined;
  const state = crypto.randomBytes(16).toString('hex');
  stateStore.set(state, { locationId });
  const authorizeUrl = new URL(DEFAULT_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('scope', OAUTH_SCOPES);
  authorizeUrl.searchParams.set('state', state);
  res.redirect(authorizeUrl.toString());
});

router.get('/callback', async (req, res) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  if (!code || !state) return res.status(400).send('Missing code/state');
  const context = stateStore.get(state);
  if (!context) return res.status(400).send('Invalid state');
  stateStore.delete(state);

  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).send('Missing OAuth env');

  try {
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('redirect_uri', REDIRECT_URI);

    const tokenResp = await fetch(DEFAULT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const tokenJson = (await tokenResp.json()) as any;
    const locationId = context.locationId || tokenJson?.locationId || tokenJson?.location_id || 'unknown';

    upsertInstallation({
      locationId,
      accountId: tokenJson?.accountId ?? tokenJson?.account_id,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
      expiresAt: tokenJson.expires_in ? Date.now() + tokenJson.expires_in * 1000 : undefined,
      scope: tokenJson.scope
    });
    res.send('Authorization successful. You may close this window.');
  } catch (err) {
    res.status(500).send('OAuth exchange failed');
  }
});

export default router;



