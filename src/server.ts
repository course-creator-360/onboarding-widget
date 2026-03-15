import { config } from 'dotenv';
import { existsSync } from 'fs';
config({ path: existsSync('.env.local') ? '.env.local' : '.env' });

if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

(async () => {
  const app = (await import('./app')).default;
  const port = Number(process.env.PORT || 5000);
  const host = process.env.HOST || '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`Server listening on http://${host}:${port}`);
  });
})();


