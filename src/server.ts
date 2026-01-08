import app from './app';
import 'dotenv/config';

// Ensure POSTGRES_URL is set for Prisma migrations (Replit provides DATABASE_URL)
if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://${host}:${port}`);
});



