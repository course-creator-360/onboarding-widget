import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';
import { execSync } from 'child_process';

// Flag to ensure migrations only run once per deployment
let migrationsRun = false;

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Run migrations on first request (only once per deployment)
  if (!migrationsRun && process.env.NODE_ENV === 'production') {
    try {
      console.log('Running database migrations on first request...');
      execSync('npx prisma migrate deploy', { 
        stdio: 'pipe',
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
          DIRECT_URL: process.env.DIRECT_URL
        }
      });
      console.log('Database migrations completed successfully');
      migrationsRun = true;
    } catch (error) {
      console.error('Migration failed:', error);
      // Don't fail the request, just log the error
    }
  }

  // Delegate to Express
  return (app as any)(req, res);
}


