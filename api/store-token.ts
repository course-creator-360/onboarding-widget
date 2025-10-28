import type { VercelRequest, VercelResponse } from '@vercel/node';
import { upsertInstallation } from '../src/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple security check - require a secret
  const secret = req.headers['x-store-token-secret'] as string;
  if (secret !== process.env.STORE_TOKEN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { 
      locationId, 
      companyId, 
      accessToken, 
      refreshToken, 
      expiresIn, 
      scope 
    } = req.body;

    if (!locationId || !accessToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const installation = await upsertInstallation({
      locationId,
      accountId: companyId,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + (expiresIn * 1000),
      scope,
      tokenType: 'location'
    });

    return res.json({ 
      success: true,
      installation: {
        locationId: installation.locationId,
        accountId: installation.accountId,
        tokenType: installation.tokenType
      }
    });
  } catch (error) {
    console.error('Error storing token:', error);
    return res.status(500).json({ 
      error: 'Failed to store token',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

