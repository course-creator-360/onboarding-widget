import type { VercelRequest, VercelResponse } from '@vercel/node';
import { execSync } from 'child_process';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for a secret token to prevent unauthorized access
  const secret = req.headers['x-vercel-migrate-secret'];
  if (secret !== process.env.VERCEL_MIGRATE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Running database migrations...');
    
    // Run Prisma migrations
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
        DIRECT_URL: process.env.DIRECT_URL
      }
    });

    console.log('Database migrations completed successfully');
    
    return res.status(200).json({ 
      success: true, 
      message: 'Database migrations completed successfully' 
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}