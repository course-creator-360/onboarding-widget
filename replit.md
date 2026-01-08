# CC360 Onboarding Widget

## Overview
A persistent onboarding checklist widget for CourseCreator360 sub-accounts. Tracks onboarding steps with real-time updates via webhooks and automatic status polling.

## Project Structure
- `src/` - TypeScript source code
  - `server.ts` - Express server entry point (port 5000)
  - `app.ts` - Express application setup (route mounting)
  - `config.ts` - Environment configuration helpers
  - `db.ts` - Prisma database operations
  - `oauth.ts` - OAuth flow handling for GoHighLevel
  - `webhooks.ts` - Webhook handlers for GHL events
  - `routes/` - Modular API route handlers
    - `index.ts` - Route aggregator
    - `config.ts` - Widget configuration endpoint
    - `status.ts` - Location status endpoint
    - `location.ts` - Location data endpoint
    - `installation.ts` - Installation status check
    - `agency.ts` - Agency authorization
    - `booking.ts` - Booking management
    - `survey.ts` - Survey handling
    - `subaccounts.ts` - Sub-account management
- `public/` - Static files (HTML, JS, CSS)
  - `widget.js` - Entry point, module loader with state initialization
  - `widget-styles.js` - CSS injection module
  - `widget-analytics.js` - Segment and Userpilot analytics
  - `widget-ui.js` - UI components (modals, checklist, dialogs)
  - `widget-core.js` - Core functionality (init, state, API calls)
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
- `SEGMENT_WRITE_KEY` - Segment analytics write key for event tracking

## Analytics Integration

### Segment Analytics
The widget integrates with Segment following best practices from the Twilio Segment documentation:
- **User Identification** (`identify`): Identifies users with GHL location context using reserved trait names (name, email, phone, company, address, website)
- **Group Association** (`group`): Associates users with their company/agency using companyId
- **Event Tracking** (`track`): Tracks key events using "noun + past-tense verb" naming convention:
  - `Survey Completed` - When user completes the onboarding survey
  - `Widget Dismissed` - When user dismisses the widget permanently
  - `Widget Minimized` - When user minimizes the widget
  - `Widget Expanded` - When user expands the minimized widget
  - `Onboarding Step Clicked` - When user clicks on a checklist step
  - `Onboarding Completed` - When all onboarding tasks are completed
  - `Booking Modal Dismissed` - When user temporarily dismisses booking modal
  - `Booking Cancelled` - When user permanently removes booking
- **Page Tracking** (`page`): Tracks page views with onboarding context
- **Configuration**: Set `SEGMENT_WRITE_KEY` in environment variables

### Userpilot Integration
Also supports Userpilot for in-app guidance (optional, set `USERPILOT_TOKEN`).

## Recent Changes
- Configured for Replit environment (port 5000, host 0.0.0.0)
- Database migrations applied successfully
- Deployment configured for autoscale
- Added Segment analytics integration for user tracking and event capture
