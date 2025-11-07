import express from 'express';
import crypto from 'crypto';
import { upsertInstallation } from './db';
import { getRedirectUri, getBaseUrl, getFrontendUrl } from './config';
import { verifyToken } from './auth';

const router = express.Router();

// Cookie options for secure state storage (works in serverless)
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 600000 // 10 minutes
};

const DEFAULT_AUTHORIZE_URL = process.env.GHL_AUTHORIZE_URL || 'https://marketplace.gohighlevel.com/oauth/authorize';
const MARKETPLACE_INSTALL_URL = process.env.GHL_MARKETPLACE_INSTALL_URL || 'https://marketplace.gohighlevel.com/oauth/chooselocation';
const DEFAULT_TOKEN_URL = process.env.GHL_TOKEN_URL || 'https://services.leadconnectorhq.com/oauth/token';
const REDIRECT_URI = getRedirectUri();

const OAUTH_SCOPES = (
  process.env.GHL_SCOPES || [
    'courses.write',
    'courses.readonly',
    'products/prices.readonly',
    'products.readonly',
    'products.write',
    'products/prices.write',
    'products/collection.readonly',
    'products/collection.write',
    'payments/integration.readonly',
    'payments/subscriptions.readonly',
    'payments/custom-provider.readonly',
    'businesses.readonly',
    'locations.readonly',
    'locations/customValues.readonly',
    'funnels/page.readonly',
    'funnels/funnel.readonly',
    'funnels/pagecount.readonly',
    'funnels/redirect.readonly',
    'payments/orders.readonly',
    'payments/transactions.readonly'
  ].join(' ')
);

// Agency OAuth endpoints
router.get('/agency/install', (req, res) => {
  const clientId = process.env.GHL_CLIENT_ID;
  if (!clientId || clientId === 'your_ghl_client_id_here') {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Agency Setup</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              padding: 20px;
            }
            .container {
              max-width: 600px;
            }
            h1 {
              margin: 0 0 16px 0;
              font-size: 24px;
            }
            p {
              margin: 0 0 24px 0;
              opacity: 0.9;
              line-height: 1.5;
            }
            .info {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 8px;
              padding: 16px;
              margin-top: 24px;
              font-size: 14px;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚙️ Agency Setup Required</h1>
            <p>
              OAuth credentials are not configured. Please set GHL_CLIENT_ID and 
              GHL_CLIENT_SECRET in your environment variables.
            </p>
            <div class="info">
              <strong>Setup Steps:</strong><br>
              1. Create app in GHL Marketplace<br>
              2. Get Client ID and Secret<br>
              3. Add to .env file<br>
              4. Restart the server<br>
              5. Return to this page
            </div>
          </div>
        </body>
      </html>
    `);
  }

  const companyId = req.query.companyId as string | undefined;
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state in cookie (works in serverless, unlike in-memory Map)
  const stateData = { locationId: companyId || 'agency', tokenType: 'agency' };
  res.cookie(`oauth_state_${state}`, JSON.stringify(stateData), COOKIE_OPTIONS);
  
  // Extract version_id from client_id (part before the hyphen)
  const versionId = clientId.split('-')[0];
  
  // Use marketplace installation URL for location selection
  const authorizeUrl = new URL(MARKETPLACE_INSTALL_URL);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);  // Full ID with suffix
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('scope', OAUTH_SCOPES);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('version_id', versionId);  // ID without suffix
  
  res.redirect(authorizeUrl.toString());
});

// Debug endpoint to check OAuth configuration
router.get('/debug', (req, res) => {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>OAuth Debug Info</title>
        <style>
          body {
            font-family: monospace;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 { color: #333; }
          .section {
            background: #f5f5f5;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
          }
          .good { color: green; }
          .bad { color: red; }
          .warning { color: orange; }
          pre {
            background: white;
            padding: 10px;
            border: 1px solid #ddd;
            overflow-x: auto;
          }
          button {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
          }
        </style>
      </head>
      <body>
        <h1>🔍 OAuth Configuration Debug</h1>
        
        <div class="section">
          <h2>Environment Variables</h2>
          <p><strong>GHL_CLIENT_ID:</strong> ${clientId ? '<span class="good">✓ Set</span>' : '<span class="bad">✗ Not set</span>'}</p>
          <p><strong>Value:</strong> <code>${clientId || 'Not configured'}</code></p>
          <p><strong>GHL_CLIENT_SECRET:</strong> ${clientSecret ? '<span class="good">✓ Set</span>' : '<span class="bad">✗ Not set</span>'}</p>
          <p><strong>Value:</strong> <code>${clientSecret ? clientSecret.substring(0, 10) + '...' : 'Not configured'}</code></p>
          <p><strong>Redirect URI:</strong> <code>${REDIRECT_URI}</code></p>
        </div>
        
        <div class="section">
          <h2>OAuth Authorization URL</h2>
          <p>This is the URL users will be redirected to:</p>
          <pre>${DEFAULT_AUTHORIZE_URL}?
response_type=code&
client_id=${clientId || 'NOT_SET'}&
redirect_uri=${encodeURIComponent(REDIRECT_URI)}&
scope=${encodeURIComponent(OAUTH_SCOPES)}&
state=RANDOM_STATE</pre>
        </div>
        
        <div class="section">
          <h2>⚠️ Checklist</h2>
          <p>Verify in your GHL Marketplace App Settings:</p>
          <ol>
            <li>Redirect URI matches exactly: <code>${REDIRECT_URI}</code></li>
            <li>All required scopes are enabled</li>
            <li>App is in development/testing mode or published</li>
            <li>Client ID matches: <code>${clientId}</code></li>
          </ol>
        </div>
        
        <div class="section">
          <h2>Test OAuth Flow</h2>
          <button onclick="testOAuth()">Test OAuth in New Window</button>
          <button onclick="testOAuthPopup()">Test OAuth in Popup</button>
          <p id="result"></p>
        </div>
        
        <script>
          function testOAuth() {
            const url = '/api/oauth/install?locationId=test-debug';
            window.open(url, '_blank');
          }
          
          function testOAuthPopup() {
            const url = '/api/oauth/install?locationId=test-debug';
            const popup = window.open(url, 'OAuth', 'width=600,height=700');
            
            if (!popup) {
              document.getElementById('result').innerHTML = '<span class="bad">Popup blocked! Allow popups for this site.</span>';
            } else {
              document.getElementById('result').innerHTML = '<span class="good">Popup opened. Check if OAuth page loads.</span>';
            }
          }
        </script>
      </body>
    </html>
  `);
});

router.get('/install', (req, res) => {
  const clientId = process.env.GHL_CLIENT_ID;
  const locationId = (req.query.locationId as string) || undefined;
  
  // Require OAuth configuration
  if (!clientId || clientId === 'your_ghl_client_id_here') {
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>OAuth Configuration Required</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              padding: 20px;
            }
            .container {
              max-width: 500px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              margin: 0 0 16px 0;
              font-size: 24px;
            }
            p {
              margin: 0 0 24px 0;
              opacity: 0.9;
              line-height: 1.5;
            }
            .info {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 8px;
              padding: 16px;
              margin-top: 24px;
              font-size: 14px;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">⚙️</div>
            <h1>OAuth Configuration Required</h1>
            <p>
              GoHighLevel OAuth credentials are not configured. Please set GHL_CLIENT_ID and 
              GHL_CLIENT_SECRET in your environment variables.
            </p>
            <div class="info">
              <strong>Setup Steps:</strong><br>
              1. Create app in GHL Marketplace<br>
              2. Get Client ID and Secret<br>
              3. Add to .env file<br>
              4. Restart the server<br>
              5. Return to this page
            </div>
          </div>
        </body>
      </html>
    `);
  }
  
  // Real OAuth flow
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state in cookie (works in serverless, unlike in-memory Map)
  const stateData = { locationId };
  res.cookie(`oauth_state_${state}`, JSON.stringify(stateData), COOKIE_OPTIONS);
  
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
  
  // Retrieve state from cookie (serverless-compatible)
  const cookieName = `oauth_state_${state}`;
  const stateCookie = req.cookies?.[cookieName];
  
  console.log('[OAuth Callback] State:', state);
  console.log('[OAuth Callback] Cookie name:', cookieName);
  console.log('[OAuth Callback] All cookies:', Object.keys(req.cookies || {}));
  console.log('[OAuth Callback] State cookie value:', stateCookie);
  
  if (!stateCookie) {
    console.error('[OAuth Callback] State cookie not found');
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invalid State</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f8f9fa;
              text-align: center;
            }
            .container { padding: 40px; }
            .error { font-size: 64px; margin-bottom: 20px; color: #dc3545; }
            h1 { margin: 0 0 10px 0; color: #333; }
            p { color: #666; margin: 10px 0; }
            button {
              background: #667eea;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 5px;
              cursor: pointer;
              margin-top: 20px;
              font-size: 14px;
            }
            button:hover { background: #5568d3; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">⚠️</div>
            <h1>Invalid OAuth State</h1>
            <p>The OAuth session has expired or is invalid.</p>
            <p>This can happen if you waited too long to complete the authorization.</p>
            <button onclick="window.location.href='${getFrontendUrl()}/dashboard'">Go to Dashboard</button>
          </div>
        </body>
      </html>
    `);
  }
  
  let context;
  try {
    context = JSON.parse(stateCookie);
    console.log('[OAuth Callback] Parsed context:', context);
  } catch (err) {
    console.error('[OAuth Callback] Failed to parse state cookie:', err);
    return res.status(400).send('Invalid state cookie format');
  }
  
  // Clear the cookie after use
  res.clearCookie(cookieName);

  // Verify JWT authentication (required for agency OAuth)
  const token = req.cookies?.auth_token;
  if (!token && context.tokenType === 'agency') {
    console.error('[OAuth Callback] No JWT token found for agency OAuth');
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Authentication Required</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              padding: 20px;
            }
            .container {
              max-width: 500px;
            }
            h1 {
              margin: 0 0 16px 0;
              font-size: 24px;
            }
            p {
              margin: 0 0 24px 0;
              opacity: 0.9;
              line-height: 1.5;
            }
            a {
              display: inline-block;
              background: white;
              color: #667eea;
              padding: 12px 24px;
              border-radius: 5px;
              text-decoration: none;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Authentication Required</h1>
            <p>
              Please login to your account first, then setup OAuth.
            </p>
            <a href="${getFrontendUrl()}/login">Go to Login</a>
          </div>
        </body>
      </html>
    `);
  }

  let userId: string | null = null;
  if (token) {
    const payload = verifyToken(token);
    if (!payload) {
      console.error('[OAuth Callback] Invalid JWT token');
      return res.status(401).send('Invalid session. Please login again.');
    }
    userId = payload.userId;
    console.log('[OAuth Callback] Authenticated user:', userId);
  }

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

    console.log('[OAuth Callback] Exchanging code for token...');
    console.log('[OAuth Callback] Token URL:', DEFAULT_TOKEN_URL);
    console.log('[OAuth Callback] Client ID:', clientId);
    console.log('[OAuth Callback] Redirect URI:', REDIRECT_URI);

    const tokenResp = await fetch(DEFAULT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    
    console.log('[OAuth Callback] Token response status:', tokenResp.status);
    
    const tokenJson = (await tokenResp.json()) as any;
    
    // Log token response with sensitive fields redacted
    const redactedToken = {
      ...tokenJson,
      access_token: tokenJson.access_token ? `${tokenJson.access_token.substring(0, 10)}...` : undefined,
      refresh_token: tokenJson.refresh_token ? `${tokenJson.refresh_token.substring(0, 10)}...` : undefined
    };
    console.log('[OAuth Callback] Token response (redacted):', JSON.stringify(redactedToken, null, 2));
    
    // Check if token exchange failed
    if (!tokenResp.ok || tokenJson.error) {
      console.error('[OAuth Callback] Token exchange failed:', tokenJson);
      throw new Error(tokenJson.error_description || tokenJson.error || 'Token exchange failed');
    }
    
    if (!tokenJson.access_token) {
      console.error('[OAuth Callback] No access token in response');
      throw new Error('No access token received');
    }
    
    // Determine token type and extract IDs properly
    const tokenType = context.tokenType || 'location';
    
    // Extract companyId from OAuth response (multiple field names possible)
    const companyId = tokenJson?.companyId ?? tokenJson?.company_id ?? tokenJson?.userId ?? tokenJson?.user_id;
    
    // For agency tokens, use agency:{companyId} pattern for unique storage
    // For location tokens, use the actual locationId
    let locationId: string;
    let accountId: string | undefined;
    
    if (tokenType === 'agency') {
      // Agency token: store with agency:{companyId} pattern
      if (!companyId) {
        console.error('[OAuth Callback] No companyId found in agency OAuth response');
        throw new Error('Agency OAuth response missing companyId');
      }
      locationId = `agency:${companyId}`;
      accountId = companyId;
      console.log('[OAuth Callback] Agency token - using locationId pattern:', locationId);
    } else {
      // Location token: use locationId from context or response
      locationId = context.locationId || tokenJson?.locationId || tokenJson?.location_id || 'unknown';
      accountId = companyId; // Still store companyId if available
      console.log('[OAuth Callback] Location token - locationId:', locationId);
    }

    console.log('[OAuth Callback] Storing installation...');
    console.log('[OAuth Callback] - User ID:', userId);
    console.log('[OAuth Callback] - Location ID:', locationId);
    console.log('[OAuth Callback] - Account ID (companyId):', accountId);
    console.log('[OAuth Callback] - Token Type:', tokenType);
    console.log('[OAuth Callback] - Scope:', tokenJson.scope);

    // Require userId for agency tokens
    if (tokenType === 'agency' && !userId) {
      throw new Error('userId required for agency OAuth');
    }

    await upsertInstallation({
      userId: userId!,
      locationId,
      accountId,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
      expiresAt: tokenJson.expires_in ? Date.now() + tokenJson.expires_in * 1000 : undefined,
      scope: tokenJson.scope,
      tokenType
    });
    
    console.log('[OAuth Callback] Installation stored successfully');
    
    // Determine redirect based on environment
    const frontendUrl = getFrontendUrl();
    // Redirect to dashboard for Next.js frontend
    const returnUrl = process.env.OAUTH_SUCCESS_REDIRECT || `${frontendUrl}/dashboard`;
    
    // For same-window flow, redirect back with success parameter
    if (!req.headers.referer?.includes('popup')) {
      // Same window redirect
      const redirectUrl = `${returnUrl}?oauth_success=true&oauth_type=${tokenType}`;
      return res.redirect(redirectUrl);
    }
    
    // For popup flow, show success page
    const successMessage = tokenType === 'agency' 
      ? 'Agency Authorization Successful!' 
      : 'Authorization Successful!';
    
    const redirectMessage = tokenType === 'agency'
      ? 'You can now close this window. All sub-accounts will have access to the widget.'
      : 'Closing window...';

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Authorization Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
            }
            .container {
              padding: 40px;
            }
            .checkmark {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            p {
              margin: 0;
              opacity: 0.9;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="checkmark">✓</div>
            <h1>${successMessage}</h1>
            <p>${redirectMessage}</p>
          </div>
          <script>
            // Notify parent window of successful OAuth
            if (window.opener) {
              window.opener.postMessage({
                type: 'oauth_complete',
                locationId: '${locationId}',
                tokenType: '${tokenType}'
              }, '*');
            }
            
            // Close window after delay (longer for agency setup)
            setTimeout(() => {
              window.close();
            }, ${tokenType === 'agency' ? 3000 : 1500});
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('[OAuth Callback] Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Authorization Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f8f9fa;
              text-align: center;
              padding: 20px;
            }
            .container {
              padding: 40px;
              max-width: 600px;
            }
            .error {
              font-size: 64px;
              margin-bottom: 20px;
              color: #dc3545;
            }
            h1 {
              margin: 0 0 10px 0;
              color: #333;
            }
            .error-details {
              background: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
              text-align: left;
              font-size: 14px;
              color: #856404;
            }
            button {
              background: #667eea;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 5px;
              cursor: pointer;
              margin-top: 20px;
              font-size: 14px;
            }
            button:hover { background: #5568d3; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">✗</div>
            <h1>Authorization Failed</h1>
            <p>There was an error during the OAuth process.</p>
            <div class="error-details">
              <strong>Error:</strong> ${errorMessage}
            </div>
            <button onclick="window.location.href='${getFrontendUrl()}/dashboard'">Go to Dashboard</button>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
              Check Vercel logs for detailed error information.
            </p>
          </div>
        </body>
      </html>
    `);
  }
});

export default router;



