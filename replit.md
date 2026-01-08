# CC360 Onboarding Widget

## Overview
A persistent onboarding checklist widget for CourseCreator360 sub-accounts. Tracks onboarding steps with real-time updates via webhooks and automatic status polling.

## Project Structure
- `src/` - TypeScript source code
  - `server.ts` - Express server entry point (port 5000)
  - `app.ts` - Express application setup with routes
  - `config.ts` - Environment configuration helpers
  - `db.ts` - Prisma database operations
  - `oauth.ts` - OAuth flow handling for GoHighLevel
  - `webhooks.ts` - Webhook handlers for GHL events
- `public/` - Static files (HTML, JS, CSS)
- `prisma/` - Database schema and migrations
- `api/` - Vercel serverless functions

## Running Locally
The app runs on port 5000 with `npm run dev` (tsx watch for hot reloading).

## Database
PostgreSQL with Prisma ORM. Migrations are in `prisma/migrations/`.

Commands:
- `npm run db:migrate` - Apply migrations
- `npm run db:generate` - Regenerate Prisma client
- `npm run db:studio` - Open Prisma Studio GUI

## Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string (provided by Replit)
- `POSTGRES_URL` - Same as DATABASE_URL (for Prisma directUrl)
- `GHL_CLIENT_ID` - GoHighLevel OAuth client ID
- `GHL_CLIENT_SECRET` - GoHighLevel OAuth client secret
- `CC360_CUSTOMERS_API_KEY` - CC360 Customers Admin API key

## Recent Changes
- Configured for Replit environment (port 5000, host 0.0.0.0)
- Database migrations applied successfully
- Deployment configured for autoscale
