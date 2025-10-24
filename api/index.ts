import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Delegate to Express
  // Note: Migrations are handled at build time via vercel-build script
  // or manually via the /api/migrate endpoint
  return (app as any)(req, res);
}


