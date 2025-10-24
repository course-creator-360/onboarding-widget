# CourseCreator360 Onboarding Widget

A persistent onboarding checklist widget for CourseCreator360 sub-accounts. Tracks 4 onboarding steps with real-time updates via webhooks and SSE.

## Features

- ✅ **4-Step Onboarding Checklist**: Domain, Course, Product, Payment
- ✅ **Real-time Updates**: SSE streaming for instant UI updates
- ✅ **Agency-Level OAuth**: One authorization for all sub-accounts
- ✅ **Prisma + PostgreSQL**: Cloud-ready database with type-safe ORM
- ✅ **Vercel Ready**: Auto-detects environment, deploys seamlessly
- ✅ **Draggable & Resizable**: User-friendly widget positioning
- ✅ **Automatic Token Refresh**: No re-authorization needed

---

## Table of Contents

- [Quick Start](#quick-start)
- [Installation & Setup](#installation--setup)
  - [1. GHL Marketplace Setup](#1-ghl-marketplace-setup)
  - [2. Local Development](#2-local-development)
  - [3. Agency Authorization](#3-agency-authorization)
  - [4. Widget Deployment](#4-widget-deployment)
- [Deployment](#deployment)
  - [Vercel Deployment](#vercel-deployment)
  - [Environment Variables](#environment-variables)
- [Database](#database)
  - [Prisma + PostgreSQL](#prisma--postgresql)
  - [Schema](#schema)
  - [Commands](#commands)
- [API Documentation](#api-documentation)
- [Widget Features](#widget-features)
- [Webhooks](#webhooks)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

---

## Quick Start

### Using Makefile (Recommended)

```bash
# Initial setup
make setup

# Edit .env with your GHL credentials
nano .env

# Start the server
make start

# Open demo page
make open
```

### Common Commands

```bash
make start          # Start development server
make stop           # Stop the server
make restart        # Restart after changes
make logs           # View server logs
make status         # Check if server is running
make test           # Test API endpoints
make clean          # Clean database and containers
make agency-setup   # Open agency OAuth setup
make help           # Show all available commands
```

---

## Installation & Setup

### 1. GHL Marketplace Setup

#### Create App in GHL Marketplace

1. Go to **https://marketplace.gohighlevel.com/**
2. Navigate to **"My Apps"** → **"Create New App"**
3. Fill in basic information:
   - **App Name**: `CourseCreator360 Onboarding Widget`
   - **Description**: `Onboarding checklist for new CC360 users`
   - **Category**: `Tools & Utilities`

#### Configure OAuth Settings

1. Go to **Advanced Settings → Auth**
2. Set **Redirect URI**:
   ```
   http://localhost:4002/oauth/callback
   ```
   (For production: `https://your-domain.com/oauth/callback`)

3. Select **OAuth Scopes**:
   - ✅ `courses.readonly`
   - ✅ `funnels/funnel.readonly`
   - ✅ `funnels/page.readonly`
   - ✅ `products.readonly`
   - ✅ `products/prices.readonly`
   - ✅ `payments/orders.readonly`
   - ✅ `payments/transactions.readonly`
   - ✅ `payments/custom-provider.readonly`

4. **Save** and copy your credentials:
   - Client ID
   - Client Secret

### 2. Local Development

#### Option A: Using Docker (Recommended)

1. **Copy environment template:**
   ```bash
   cp env.template .env
   ```

2. **Edit `.env` with your credentials:**
   ```env
   PORT=4002
   NODE_ENV=development
   
   # GHL OAuth Credentials
   GHL_CLIENT_ID=your_client_id_here
   GHL_CLIENT_SECRET=your_client_secret_here
   GHL_REDIRECT_URI=http://localhost:4002/oauth/callback
   
   # Database (auto-configured by Docker)
   DATABASE_URL=postgresql://user:password@postgres:5432/onboarding?schema=public
   ```

3. **Start the server:**
   ```bash
   docker-compose up --build
   ```

4. **Verify it's running:**
   ```bash
   curl http://localhost:4002/api/healthz
   # Should return: {"ok":true}
   ```

#### Option B: Without Docker

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL** (locally or use cloud service)

3. **Update `.env`** with your database URL

4. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

5. **Start dev server:**
   ```bash
   npm run dev
   ```

### 3. Agency Authorization

This is a **ONE-TIME setup** that allows the widget to work for ALL sub-accounts.

#### Why Agency-Level Authorization?

- ✅ Authorize once for entire agency
- ✅ Works automatically for all sub-accounts
- ✅ No per-user OAuth popups
- ✅ Simpler user experience

#### Setup Steps

1. **Open the demo page:**
   ```
   http://localhost:4002
   ```

2. **Click "🔑 Setup Agency OAuth"**

3. **Authorize in GoHighLevel:**
   - Select a location or agency-wide option
   - Review permissions
   - Click "Allow"

4. **Verify authorization:**
   - Success message appears
   - Click "Check Agency Status" → Should show "✓ Authorized"

### 4. Widget Deployment

#### Add to GHL Custom Values

1. **Go to Agency Settings:**
   ```
   GHL Agency Dashboard → Settings → Custom Values
   ```

2. **Add Custom JavaScript:**
   - Click "Add Custom Value" → Select "JavaScript"

3. **Paste this code:**

   ```html
   <script>
   (function() {
     'use strict';
     
     // Extract locationId from GHL dashboard URL
     const match = window.location.pathname.match(/\/location\/([^\/]+)/);
     if (!match) return;
     
     const locationId = match[1];
     console.log('[CC360] Loading widget for location:', locationId);
     
     // Load widget script
     const script = document.createElement('script');
     script.src = 'http://localhost:4002/widget.js';  // Update for production
     script.setAttribute('data-location', locationId);
     script.setAttribute('data-api', 'http://localhost:4002');  // Update for production
     
     document.body.appendChild(script);
   })();
   </script>
   ```

4. **Apply to "All Locations"** and **Save**

---

## Deployment

### Vercel Deployment

The app automatically detects Vercel environment and configures URLs accordingly.

#### Step 1: Configure Database

**Option A: Vercel Postgres (Recommended)**

1. Go to Vercel Dashboard → Your Project → **Storage**
2. Click **Create Database** → **Postgres**
3. Select plan (free tier available) and create

Vercel automatically injects these environment variables:
- `POSTGRES_PRISMA_URL` → maps to `DATABASE_URL`
- `POSTGRES_URL_NON_POOLING` → maps to `DIRECT_URL`

**Option B: External Database (Neon, Supabase, etc.)**

Set in Vercel → Settings → Environment Variables:
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public
DIRECT_URL=postgresql://user:password@host:5432/dbname?schema=public
```

#### Step 2: Set Required Environment Variables

Go to Vercel → Settings → Environment Variables and add:

```bash
# Required - GoHighLevel OAuth
GHL_CLIENT_ID=your_client_id
GHL_CLIENT_SECRET=your_client_secret

# Required - Migration security (generate random string)
VERCEL_MIGRATE_SECRET=your-secure-random-secret

# Required - Skip migrations during build (set to "true")
SKIP_BUILD_MIGRATIONS=true

# Optional - Auto-detected if not set
# APP_BASE_URL=https://your-custom-domain.com
# GHL_REDIRECT_URI=https://your-app.vercel.app/oauth/callback
```

**Generate secure migration secret:**
```bash
openssl rand -base64 32
```

#### Step 3: Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or push to your connected Git repository (Vercel auto-deploys).

The deployment process:
1. Installs dependencies (`npm install`)
2. Generates Prisma Client (`npx prisma generate`)
3. Builds TypeScript → JavaScript (`npm run build`)
4. ⚠️ **Skips migrations** (handled separately in Step 4)

#### Step 4: Run Migrations (Required)

**After deployment succeeds**, run migrations via the API endpoint:

```bash
curl -X POST https://your-app.vercel.app/api/migrate \
  -H "x-vercel-migrate-secret: YOUR_SECRET_FROM_STEP_2"
```

**Expected success response:**
```json
{
  "success": true,
  "message": "Database migrations completed successfully"
}
```

**Why migrations are separate:**
- Serverless environments lack writable home directories for npm
- Running migrations during build can timeout or fail
- Dedicated endpoint provides better error handling and control

#### Step 5: Update GHL Marketplace

After deployment, update your GHL app settings:

1. **OAuth Redirect URI**: `https://your-app.vercel.app/oauth/callback`
2. **Webhook URL**: `https://your-app.vercel.app/api/webhooks/ghl`
3. Re-authorize agency with production URL
4. Update Custom Values script with production URLs

#### Step 6: Verify Deployment

1. Visit `https://your-app.vercel.app` - should load demo page
2. Check migration status - if you get database errors, run Step 4 again
3. Test OAuth flow with your GHL account
4. Monitor Vercel logs for any errors

### Environment Variables

Set these in Vercel Dashboard (Settings → Environment Variables):

```bash
# Required - Database (if using external, not needed for Vercel Postgres)
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public
DIRECT_URL=postgresql://user:password@host:5432/dbname?schema=public

# Required - GoHighLevel OAuth
GHL_CLIENT_ID=your_ghl_client_id
GHL_CLIENT_SECRET=your_ghl_client_secret

# Required - Migration security (for /api/migrate endpoint)
VERCEL_MIGRATE_SECRET=your_secure_random_secret

# Required - Skip migrations during build
SKIP_BUILD_MIGRATIONS=true

# Optional (auto-detected from VERCEL_URL)
# APP_BASE_URL=https://your-custom-domain.com
# GHL_REDIRECT_URI=https://your-app.vercel.app/oauth/callback

# Testing
GHL_SUBACCOUNT_TEST_LOCATION_ID=your_test_location

# Analytics (optional)
USERPILOT_API_KEY=your_production_key
USERPILOT_STAGE_API_KEY=your_staging_key
```

### Environment Auto-Detection

The app automatically detects its environment:
- **Local**: `http://localhost:4002`
- **Vercel**: `https://{VERCEL_URL}` (auto-detected)
- **Custom**: Set `APP_BASE_URL` to override

---

## Database

### Prisma + PostgreSQL

The app uses **Prisma ORM** with **PostgreSQL** for cloud-ready, type-safe database operations.

**Why Prisma?**
- Type-safe database access with auto-completion
- Migrations via dedicated endpoint
- Async operations for scalability
- PostgreSQL support for production-ready deployments

### Schema

Location: `prisma/schema.prisma`

```prisma
model Installation {
  id            String   @id @default(cuid())
  locationId    String   @unique
  accountId     String?
  accessToken   String
  refreshToken  String?
  expiresAt     BigInt?
  scope         String?
  tokenType     String   @default("location")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Onboarding {
  id                 String   @id @default(cuid())
  locationId         String   @unique
  domainConnected    Boolean  @default(false)
  courseCreated      Boolean  @default(false)
  paymentIntegrated  Boolean  @default(false)
  dismissed          Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model EventLog {
  id         String   @id @default(cuid())
  locationId String?
  eventType  String
  payload    Json
  createdAt  DateTime @default(now())
}
```

### Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Push schema to database (development)
npm run db:push

# Run migrations (local development)
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Making Schema Changes

#### Development

1. Edit `prisma/schema.prisma`
2. Create migration:
   ```bash
   npx prisma migrate dev --name your_change_name
   ```
3. Prisma will automatically:
   - Create migration file in `prisma/migrations/`
   - Apply it to local database
   - Regenerate Prisma Client

#### Production

1. After deploying code with new migrations:
   ```bash
   curl -X POST https://your-app.vercel.app/api/migrate \
     -H "x-vercel-migrate-secret: your-secure-random-secret"
   ```

2. The endpoint will:
   - Run all pending migrations
   - Update the database schema
   - Return success/error response

**Important:** Migrations are NOT run automatically in production. You must trigger them manually via the `/api/migrate` endpoint after each deployment that includes schema changes.

---

## API Documentation

### Onboarding Endpoints

- `GET /api/status?locationId=...` - Get checklist status for a location
- `POST /api/dismiss` - Mark widget as dismissed
- `POST /api/mock/set` - Update flags for testing (dev only)

### Authorization Endpoints

- `GET /api/agency/status` - Check if agency is authorized
- `GET /api/installation/check?locationId=...` - Check auth status
- `GET /api/oauth/agency/install` - Agency-level OAuth setup
- `GET /api/oauth/callback` - OAuth callback handler
- `DELETE /api/installation?locationId=...` - Clear auth (testing only)

### Real-time Endpoints

- `GET /api/events?locationId=...` - SSE stream for live updates

### Webhook Endpoints

- `POST /api/webhooks/ghl` - GHL webhook receiver

### Migration Endpoints

- `POST /api/migrate` - Run database migrations (requires `x-vercel-migrate-secret` header)

### Utility Endpoints

- `GET /api/healthz` - Health check
- `GET /api/config` - Configuration info

---

## Widget Features

### Draggable & Resizable

The widget supports advanced user interaction:

#### Dragging
- **Drag Handle**: Click and drag the header to move
- **Smart Snapping**: Auto-snaps to left or right side
- **Viewport Boundaries**: Constrained to stay visible
- **Click vs Drag Detection**: 8px threshold for accurate detection
- **Position Persistence**: Remembers position across page reloads

#### Resizing
- **Resize Handle**: Subtle handle at top (visible on hover)
- **Height Constraints**: 200px min, 90% viewport max
- **Height Persistence**: Remembers height across reloads

#### Touch Support
- Full support for mobile/tablet devices
- Touch gestures work same as mouse

#### API Methods

```javascript
// Reset widget position to default
window.cc360Widget.resetPosition();

// Force widget into viewport
window.cc360Widget.forceIntoView();

// Minimize the widget
window.cc360Widget.dismiss();

// Expand the widget
window.cc360Widget.expand();

// Reload the widget
window.cc360Widget.reload();
```

### Automatic Token Refresh

The app automatically refreshes OAuth tokens without requiring re-authorization.

**How it works:**
1. Checks if token expires within 5 minutes
2. Uses refresh_token to get new access_token
3. Updates database automatically
4. API calls use fresh token

**When refresh happens:**
- Widget loads and token is expiring
- API status check runs
- Any API call that needs authentication

**Logs to watch for:**
```
[GHL API] Agency token expired, refreshing...
[GHL API] Token refreshed successfully, expires at: [timestamp]
```

---

## Webhooks

### Required Webhook Configuration

In GHL Marketplace → Your App → Webhooks:

1. **Webhook URL**: `https://your-app.vercel.app/api/webhooks/ghl`

2. **Subscribe to events**:
   - ✅ `ProductCreate` - Course/product creation
   - ✅ `ProductUpdate` - Course/product updates
   - ✅ `ProductDelete` - Course/product deletion
   - ✅ `ExternalAuthConnected` - Payment integration

3. **Required OAuth Scope**: `products.readonly`

### Webhook Event Mapping

```
GHL Event               → Widget Update
─────────────────────────────────────────
ProductCreate/Update    → ✓ Course created
ExternalAuthConnected   → ✓ Payment integrated
```

### Testing Webhooks

```bash
# Manual webhook test
curl -X POST http://localhost:4002/api/webhooks/ghl \
  -H "Content-Type: application/json" \
  -d '{
    "event": "ProductCreate",
    "locationId": "test_location_123",
    "data": {"id": "prod_123", "name": "Test Course"}
  }'

# Check if it updated
curl "http://localhost:4002/api/status?locationId=test_location_123"
```

---

## Troubleshooting

### Docker Issues

#### Database Connection Issues

Ensure PostgreSQL container is running:
```bash
docker-compose ps
docker-compose logs postgres
```

#### Port Already in Use

```bash
# Find and kill process
lsof -ti:4002 | xargs kill -9

# Restart
make restart
```

#### Database Connection Issues

```bash
# Check if Postgres is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart everything
docker-compose down && docker-compose up --build
```

### OAuth Issues

#### White Screen on OAuth Popup

**Cause**: Redirect URI mismatch

**Solution**:
1. Check GHL Marketplace redirect URI matches `.env` exactly
2. No trailing slashes
3. Use `http` for localhost, `https` for production
4. Wait 5 minutes after saving changes in GHL

#### Widget Shows "Setup Required"

**Cause**: Agency not authorized

**Solution**:
```bash
make agency-setup  # Run OAuth flow
```

Or visit `http://localhost:4002` and click "Setup Agency OAuth"

### Widget Issues

#### Widget Doesn't Appear

**Check**:
1. Custom Values applied to locations
2. URLs in widget code are correct
3. JavaScript console for errors (F12)

#### Checklist Not Updating

**Check**:
1. Webhooks configured in GHL Marketplace
2. SSE connection active (browser console)
3. Server logs: `make logs`

### Vercel Deployment Issues

#### OAuth Redirects to Localhost

**Cause**: `VERCEL_URL` not detected or `APP_BASE_URL` not set

**Solution**:
- Ensure Vercel environment variables are set
- Set `APP_BASE_URL` manually if needed
- Clear browser cache

#### Environment Variables Not Working

**Solution**:
1. After changing env vars in Vercel, **redeploy**
2. Go to Deployments → Latest → Redeploy
3. Or push a new commit

#### Database Migration Errors

**Error 1**: `npm error code ENOENT` or `mkdir '/home/sbx_user1051'` permission errors

**Cause**: Serverless environment doesn't have writable home directory for npm/npx

**Solution**:
1. ✅ Code has been updated to use local Prisma binary instead of npx
2. Set `SKIP_BUILD_MIGRATIONS=true` in Vercel environment variables
3. Rebuild and redeploy:
   ```bash
   npm run build
   git add -A
   git commit -m "fix: update for serverless deployment"
   git push
   ```
4. After deployment, run migrations via endpoint:
   ```bash
   curl -X POST https://your-app.vercel.app/api/migrate \
     -H "x-vercel-migrate-secret: your-secret"
   ```

**Error 2**: `Can't reach database server at db.prisma.io:5432`

**Cause**: `DATABASE_URL` environment variable is not set or using placeholder value

**Solution**:
1. Check Vercel → Settings → Environment Variables
2. If using Vercel Postgres: Ensure database is linked to project
3. If using external database: Set `DATABASE_URL` and `DIRECT_URL` manually
4. Redeploy after adding environment variables (Vercel → Deployments → Redeploy)
5. Verify connection string format:
   ```
   postgresql://user:password@host:5432/dbname?schema=public
   ```

**Error 3**: Migration timeout or hanging

**Cause**: Database connection slow or migrations taking too long

**Solution**:
1. Check database is accessible from Vercel (firewall/IP restrictions)
2. Increase timeout in `vercel.json` (already set to 60s for migrate endpoint)
3. Or run migrations manually via database client:
   ```bash
   DATABASE_URL="your_url" npx prisma migrate deploy
   ```

**Note**: Migrations are never run automatically in production. Always use the `/api/migrate` endpoint.

---

## Development

### Project Structure

```
onboarding-widget/
├── api/              # Vercel serverless functions
├── prisma/           # Database schema and migrations
│   ├── schema.prisma
│   └── migrations/
├── public/           # Static files
│   ├── index.html    # Demo page
│   ├── widget.js     # Widget client
│   └── test-account.html
├── src/              # Server source code
│   ├── app.ts        # Express app & routes
│   ├── config.ts     # Environment detection
│   ├── db.ts         # Prisma database client
│   ├── ghl-api.ts    # GHL API client
│   ├── oauth.ts      # OAuth handlers
│   ├── server.ts     # Server entry point
│   ├── sse.ts        # Server-Sent Events
│   ├── userpilot.ts  # Analytics
│   └── webhooks.ts   # Webhook handlers
├── .env              # Local environment variables
├── docker-compose.yml
├── Dockerfile
├── Makefile          # Dev commands
├── package.json
├── tsconfig.json
└── vercel.json       # Vercel configuration
```

### Making Changes

```bash
# Edit code
nano src/app.ts

# Restart server
make restart

# View logs
make logs

# Test changes
make test
```

### Database Changes

#### Local Development

```bash
# Edit schema
nano prisma/schema.prisma

# Create migration
npx prisma migrate dev --name add_new_field

# View data
npm run db:studio
```

#### After Deploying to Production

```bash
# Run migrations via endpoint
curl -X POST https://your-app.vercel.app/api/migrate \
  -H "x-vercel-migrate-secret: your-secret"
```

### Testing Workflow

```bash
# 1. Check health
curl http://localhost:4002/api/healthz

# 2. Test agency status
curl http://localhost:4002/api/agency/status

# 3. Test onboarding status
curl "http://localhost:4002/api/status?locationId=test123"

# 4. Simulate webhook
curl -X POST http://localhost:4002/api/webhooks/ghl \
  -H "Content-Type: application/json" \
  -d '{"event":"ProductCreate","locationId":"test123"}'

# 5. Verify update
curl "http://localhost:4002/api/status?locationId=test123"
```

### Checklist Before Production

```
☐ GHL Marketplace app created
☐ OAuth scopes configured
☐ Vercel Postgres database created (or external database configured)
☐ Environment variables set in Vercel:
  ☐ DATABASE_URL (if external DB)
  ☐ DIRECT_URL (if external DB)
  ☐ GHL_CLIENT_ID
  ☐ GHL_CLIENT_SECRET
  ☐ VERCEL_MIGRATE_SECRET
  ☐ SKIP_BUILD_MIGRATIONS=true
☐ App deployed to Vercel
☐ Database migrations run via /api/migrate endpoint
☐ Migration successful (check response)
☐ GHL Marketplace OAuth URI updated to production URL
☐ GHL Marketplace webhook URL updated to production URL
☐ Agency authorized with production URL
☐ Custom Values script updated with production URLs
☐ Tested with real sub-account
☐ Webhooks delivering successfully
☐ SSE updates working
☐ Verified no errors in Vercel logs
```

---

## How It Works

### Complete Data Flow

```
┌─────────────────────────────────────────┐
│ 1. Agency Admin Setup (One-Time)       │
├─────────────────────────────────────────┤
│ Create GHL app → Deploy server          │
│ → Authorize agency → Deploy widget      │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 2. Widget Auto-Loads in Sub-Accounts    │
├─────────────────────────────────────────┤
│ User logs in → Custom Values runs       │
│ → Extracts locationId → Loads widget.js │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 3. Widget Checks Authorization          │
├─────────────────────────────────────────┤
│ GET /api/installation/check             │
│ → Server checks agency token            │
│ → Widget shows checklist                │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 4. Real-Time Connection                 │
├─────────────────────────────────────────┤
│ EventSource: GET /api/events            │
│ → SSE connection maintained             │
│ → Heartbeat every 25 seconds            │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 5. User Completes Actions               │
├─────────────────────────────────────────┤
│ Create course in GHL                    │
│ → GHL sends webhook                     │
│ → Server updates database               │
│ → Broadcasts via SSE                    │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 6. Widget Updates in Real-Time         │
├─────────────────────────────────────────┤
│ Widget receives SSE message             │
│ → Updates UI with checkmark             │
│ → Progress bar animates                 │
└─────────────────────────────────────────┘
```

### Checklist Link Targets

The widget builds dashboard URLs dynamically based on `data-location`:

- **Connect Payments** → `https://app.coursecreator360.com/v2/location/{locationId}/payments/integrations`
- **Create a Course** → `https://app.coursecreator360.com/v2/location/{locationId}/memberships/courses/products-v2`
- **Connect a Domain** → `https://app.coursecreator360.com/v2/location/{locationId}/settings/domain`

---

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: Prisma ORM + PostgreSQL
- **Real-time**: Server-Sent Events (SSE)
- **OAuth**: GoHighLevel OAuth 2.0
- **Deployment**: Vercel (serverless)
- **Frontend**: Vanilla JavaScript (no framework)
- **Containerization**: Docker + Docker Compose

---

## Security

- ✅ OAuth tokens stored server-side only
- ✅ Automatic token refresh (no re-auth needed)
- ✅ Environment variables for secrets
- ✅ HTTPS enforced in production
- ✅ Minimum OAuth scopes requested
- ✅ Client secrets never exposed to client

---

## Support

For issues or questions:
1. Check this README
2. Review server logs: `make logs`
3. Check browser console for errors (F12)
4. Test API endpoints manually

---

## License

Proprietary - CourseCreator360

---

**Made with ❤️ for CourseCreator360**
