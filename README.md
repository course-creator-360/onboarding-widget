# CourseCreator360 Onboarding Widget

A persistent onboarding checklist widget for CourseCreator360 sub-accounts. Tracks 4 onboarding steps with real-time updates via webhooks and automatic status polling.

## Features

- ✅ **4-Step Onboarding Checklist**: Domain, Course, Product, Payment
- ✅ **Real-time Updates**: Automatic status polling for live updates (serverless-optimized)
- ✅ **Agency-Level OAuth**: One authorization for all sub-accounts
- ✅ **Sub-Account Tracking**: Automatically tracks newly created sub-accounts under the agency
- ✅ **Prisma + PostgreSQL**: Cloud-ready database with type-safe ORM
- ✅ **Vercel Ready**: Auto-detects environment, deploys seamlessly
- ✅ **Draggable & Resizable**: User-friendly widget positioning
- ✅ **Automatic Token Refresh**: No re-authorization needed
- ✅ **Location Filtering**: Optional filter to show widget for specific locations only
- ✅ **Feature Flags**: Enable/disable specific checklist items (e.g., Connect Payments)
- ✅ **Userpilot Integration**: Server-side and client-side analytics tracking

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
- [Sub-Account Tracking](#sub-account-tracking)
- [Widget Features](#widget-features)
- [Location Filtering](#location-filtering)
- [Feature Flags](#feature-flags)
- [Webhooks](#webhooks)
- [Architecture & Performance](#architecture--performance)
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

#### OAuth Callback Redirect

The OAuth callback automatically redirects back to the original page after authorization:

- **Return URL Preservation**: The system stores where you came from and redirects back
- **Security Validation**: Prevents open redirect attacks by validating return URLs
- **Query Parameters**: Preserves URL parameters (like `locationId`) during redirect
- **Console Logs**: Clear logging for debugging redirect issues

**Flow:**
```
User clicks "Setup Agency OAuth"
  ↓
index.html → /api/oauth/agency/install?returnUrl=https://...
  ↓
Store returnUrl in state cookie
  ↓
Redirects to GHL OAuth
  ↓
GHL redirects to /api/oauth/callback?code=...&state=...
  ↓
Retrieve returnUrl from state cookie
  ↓
✅ Redirect to: returnUrl?oauth_success=true&oauth_type=agency
```

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
- `DATABASE_URL` or `POSTGRES_PRISMA_URL` → pooled connection for queries
- `POSTGRES_URL` → direct connection for migrations

**Option B: External Database (Neon, Supabase, etc.)**

Set in Vercel → Settings → Environment Variables:
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public&connection_limit=5&pool_timeout=10&connect_timeout=10
POSTGRES_URL=postgresql://user:password@host:5432/dbname?schema=public
```

**Connection Pooling for Serverless:**

For external databases, add connection pooling parameters to prevent timeouts:
- `connection_limit=5` - Max connections per serverless function
- `pool_timeout=10` - Timeout for acquiring connection (seconds)
- `connect_timeout=10` - TCP connection timeout (seconds)

The app uses a Prisma Client singleton pattern to reuse connections across serverless invocations and prevent connection pool exhaustion.

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
3. **Runs database migrations automatically** (`prisma migrate deploy`)
4. Builds TypeScript → JavaScript (`npm run build`)

**Note:** Migrations now run automatically during deployment. If they fail, check Vercel build logs and you can run them manually via the `/api/migrate` endpoint.

#### Step 4: Update GHL Marketplace

After deployment, update your GHL app settings:

1. **OAuth Redirect URI**: `https://your-app.vercel.app/oauth/callback`
2. **Webhook URL**: `https://your-app.vercel.app/api/webhooks/ghl`
3. Re-authorize agency with production URL
4. Update Custom Values script with production URLs

#### Step 5: Verify Deployment

1. Visit `https://your-app.vercel.app` - should load demo page
2. Check Vercel build logs to confirm migrations ran successfully
3. Test OAuth flow with your GHL account
4. Monitor Vercel runtime logs for any errors

### Environment Variables

Set these in Vercel Dashboard (Settings → Environment Variables):

```bash
# Required - Database (if using external DB, not needed for Vercel Postgres)
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public&connection_limit=5&pool_timeout=10&connect_timeout=10
POSTGRES_URL=postgresql://user:password@host:5432/dbname?schema=public

# Required - GoHighLevel OAuth
GHL_CLIENT_ID=your_ghl_client_id
GHL_CLIENT_SECRET=your_ghl_client_secret

# Optional - Migration security (for manual /api/migrate endpoint if needed)
VERCEL_MIGRATE_SECRET=your_secure_random_secret

# Optional (auto-detected from VERCEL_URL)
# APP_BASE_URL=https://your-custom-domain.com
# GHL_REDIRECT_URI=https://your-app.vercel.app/oauth/callback

# Optional - Widget Location Filter (show widget for specific location only)
WIDGET_LOCATION_ID_FILTER=loc_abc123xyz

# Feature Flags - Enable/disable specific checklist items
FEATURE_CONNECT_PAYMENTS_ENABLED=true    # Show/hide "Connect Payments" checklist item

# Testing
GHL_SUBACCOUNT_TEST_LOCATION_ID=your_test_location

# Analytics (optional)
# Userpilot - Server-side tracking (webhook events)
USERPILOT_API_KEY=your_production_api_key
USERPILOT_STAGE_API_KEY=your_staging_api_key

# Userpilot - Client-side tracking (widget SDK)
# Get from: Userpilot Dashboard → Settings → Installation (App Token)
USERPILOT_TOKEN=your_userpilot_app_token              # Production app token
USERPILOT_STAGE_TOKEN=your_staging_app_token          # Staging app token
```

### Userpilot Integration

Userpilot is fully integrated for both server-side and client-side tracking:

**Server-Side (Backend):**
- Tracks webhook events: `domain_connected`, `course_created`, `payment_integrated`
- Requires: `USERPILOT_API_KEY` in environment variables

**Client-Side (Widget):**
- Identifies users with GHL location context (name, email, company, etc.)
- Tracks widget interactions: `widget_dismissed`, `survey_completed`
- Requires: `USERPILOT_TOKEN` in environment variables

The widget automatically fetches the token from your backend configuration - no need to expose it in the custom JavaScript

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

model SubAccount {
  id              String   @id @default(cuid())
  locationId      String   @unique @map("location_id")
  accountId       String   @map("account_id")      // Links to agency
  locationName    String?  @map("location_name")
  companyId       String?  @map("company_id")
  firstAccessedAt DateTime @default(now()) @map("first_accessed_at")
  lastAccessedAt  DateTime @updatedAt @map("last_accessed_at")
  isActive        Boolean  @default(true) @map("is_active")
  metadata        Json?

  @@index([accountId])
  @@index([companyId])
  @@index([firstAccessedAt])
  @@index([isActive])
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

- `GET /api/status?locationId=...&skipApiChecks=true` - Get checklist status for a location (skipApiChecks prevents real API overwrites)
- `POST /api/dismiss` - Mark widget as dismissed
- `POST /api/onboarding/update` - Update onboarding status fields (for testing)
- `POST /api/onboarding/toggle` - Toggle a specific onboarding field (for testing)

### Authorization Endpoints

- `GET /api/agency/status` - Check if agency is authorized
- `GET /api/location/validate?locationId=...` - Validate if locationId exists in agency
- `GET /api/installation/check?locationId=...` - Check auth status
- `GET /api/oauth/agency/install` - Agency-level OAuth setup
- `GET /api/oauth/callback` - OAuth callback handler
- `DELETE /api/installation?locationId=...` - Clear auth (testing only)

### Webhook Endpoints

- `POST /api/webhooks/ghl` - GHL webhook receiver

### Migration Endpoints

- `POST /api/migrate` - Run database migrations (requires `x-vercel-migrate-secret` header)

### Sub-Account Tracking Endpoints

- `GET /api/sub-accounts?accountId=...` - Get all sub-accounts for an agency
- `GET /api/sub-accounts/:locationId` - Get specific sub-account details
- `GET /api/sub-accounts/verify/:locationId` - Verify if location belongs to agency
- `GET /api/sub-accounts/stats/:accountId` - Get agency sub-account statistics
- `POST /api/sub-accounts/:locationId/deactivate` - Deactivate a sub-account

### Utility Endpoints

- `GET /api/healthz` - Health check
- `GET /api/config` - Configuration info (includes widget location filter, Userpilot token, etc.)

---

## Sub-Account Tracking

The widget automatically tracks newly created sub-accounts under the agency. When a sub-account first accesses the widget, the system:

1. ✅ Detects the location ID from the GHL context
2. ✅ Validates it belongs to the authorized agency
3. ✅ Registers it in the database with full details
4. ✅ Tracks first access and last access timestamps
5. ✅ Maintains the agency relationship

**Key Benefits:**
- 🎯 **Automatic Discovery**: No manual registration needed
- 📊 **Analytics Ready**: Track widget adoption across sub-accounts
- 🔍 **Full Visibility**: See all sub-accounts using the widget
- ⏰ **Activity Monitoring**: Track when sub-accounts last accessed the widget

**Console Logs:**
```
[Installation Check] ✨ NEW SUB-ACCOUNT DETECTED ✨
[Installation Check] Location: Client Business (loc_abc123)
[Installation Check] Agency: agency_xyz789
[Installation Check] This sub-account is now tracked under the agency
```

**Example Usage:**
```javascript
// Get all sub-accounts for an agency
const response = await fetch('/api/sub-accounts?accountId=agency_xyz789');
const { subAccounts, count } = await response.json();
console.log(`Total sub-accounts: ${count}`);

// Get statistics
const stats = await fetch('/api/sub-accounts/stats/agency_xyz789');
const data = await stats.json();
console.log(`New sub-accounts this week: ${data.stats.lastWeek}`);
```

### How It Works

**Flow Diagram:**
```
┌─────────────────────────────────────────┐
│ 1. Sub-Account User Logs Into GHL      │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 2. Widget Loads via Custom JavaScript  │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 3. Widget Calls Installation Check     │
│    GET /api/installation/check          │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 4. Server Checks Agency Authorization  │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 5. Server Validates LocationId         │
│    (via GHL SDK)                        │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 6. Check if Sub-Account Exists         │
│    (New or Existing?)                   │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 7. Register/Update Sub-Account         │
│    - Store location details             │
│    - Link to agency via accountId       │
│    - Track timestamps                   │
│    - Store metadata                     │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 8. Widget Loads Successfully            │
│    Sub-Account is Now Tracked!          │
└─────────────────────────────────────────┘
```

**Data Captured for Each Sub-Account:**
```typescript
{
  id: "cuid_abc123",                    // Unique identifier
  locationId: "loc_abc123",             // GHL location ID
  accountId: "agency_xyz789",           // Parent agency ID
  locationName: "Client Business",      // Business name
  companyId: "comp_456",               // GHL company ID
  firstAccessedAt: 1706400000000,      // First widget access
  lastAccessedAt: 1706500000000,       // Most recent access
  isActive: true,                      // Active status
  metadata: {                          // Additional details
    email: "client@business.com",
    phone: "+1234567890",
    website: "https://clientbusiness.com",
    timezone: "America/New_York"
  }
}
```

### API Endpoints

#### Get All Sub-Accounts for an Agency

```bash
GET /api/sub-accounts?accountId=agency_xyz789
```

**Response:**
```json
{
  "success": true,
  "count": 15,
  "subAccounts": [
    {
      "id": "cuid_abc123",
      "locationId": "loc_abc123",
      "accountId": "agency_xyz789",
      "locationName": "Client Business",
      "companyId": "comp_456",
      "firstAccessedAt": 1706400000000,
      "lastAccessedAt": 1706500000000,
      "isActive": true,
      "metadata": { ... }
    }
  ]
}
```

#### Get Specific Sub-Account Details

```bash
GET /api/sub-accounts/:locationId
```

#### Verify Sub-Account Agency Relationship

```bash
GET /api/sub-accounts/verify/:locationId
```

**Response:**
```json
{
  "success": true,
  "isUnderAgency": true,
  "locationId": "loc_abc123",
  "agencyAccountId": "agency_xyz789",
  "isActive": true,
  "locationName": "Client Business",
  "firstAccessedAt": 1706400000000,
  "lastAccessedAt": 1706500000000,
  "agencyAuthorized": true
}
```

#### Get Agency Statistics

```bash
GET /api/sub-accounts/stats/:accountId
```

**Response:**
```json
{
  "success": true,
  "accountId": "agency_xyz789",
  "stats": {
    "total": 15,
    "active": 14,
    "inactive": 1,
    "lastWeek": 3,
    "lastMonth": 8
  }
}
```

#### Deactivate a Sub-Account

```bash
POST /api/sub-accounts/:locationId/deactivate
```

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

## Location Filtering

The widget can be configured to only display for a specific location ID using the `WIDGET_LOCATION_ID_FILTER` environment variable.

### Use Cases

- Test the widget with a single location before rolling out to all locations
- Restrict the widget to specific sub-accounts
- Create a pilot program with select locations
- Limit widget visibility for compliance or business reasons

### Configuration

#### Step 1: Find Your Location ID

You can find the location ID in several ways:

1. **From the GHL Dashboard URL:**
   ```
   https://app.gohighlevel.com/v2/location/loc_abc123xyz/dashboard
                                          └─────┬──────┘
                                           Location ID
   ```

2. **From Browser Console:**
   Open the GHL dashboard and check the console logs:
   ```
   [CC360 Widget] Using auto-detected location ID: loc_abc123xyz
   ```

#### Step 2: Set the Environment Variable

**Local Development (.env):**
```bash
WIDGET_LOCATION_ID_FILTER=loc_abc123xyz
```

**Vercel (Production/Staging):**
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `WIDGET_LOCATION_ID_FILTER`
   - **Value:** `loc_abc123xyz` (your specific location ID)
   - **Environment:** Choose `Production`, `Preview`, or `Development` as needed
4. Click **Save**
5. **Redeploy** your application for the changes to take effect

#### Step 3: Verify Configuration

After deploying with the filter enabled, the widget will:

1. **Show only for the specified location:**
   - When a user from the matching location opens the app, they'll see the widget
   - Console logs will show: `✅ Location filter check passed`

2. **Hide for all other locations:**
   - When a user from a different location opens the app, the widget won't appear
   - Console logs will show: `🚫 Location filter active - widget will not show`

### Disabling the Filter

To show the widget for **all authorized locations** again:

1. **Remove or comment out** the environment variable:
   ```bash
   # WIDGET_LOCATION_ID_FILTER=loc_abc123xyz
   ```

2. Or **set it to an empty value**:
   ```bash
   WIDGET_LOCATION_ID_FILTER=
   ```

3. Redeploy your application

### Console Logging

**When Filter is Active and Location Matches:**
```
[CC360 Widget] 🔧 Fetching config from: https://your-app.com/api/config
[CC360 Widget] ✅ Config received: { widgetLocationFilter: "loc_abc123xyz", ... }
[CC360 Widget] 🎯 Widget location filter enabled: loc_abc123xyz
[CC360 Widget] Using auto-detected location ID: loc_abc123xyz
[CC360 Widget] ✅ Location filter check passed - proceeding with initialization
```

**When Filter is Active but Location Doesn't Match:**
```
[CC360 Widget] 🔧 Fetching config from: https://your-app.com/api/config
[CC360 Widget] ✅ Config received: { widgetLocationFilter: "loc_abc123xyz", ... }
[CC360 Widget] 🎯 Widget location filter enabled: loc_abc123xyz
[CC360 Widget] Using auto-detected location ID: loc_def456uvw
[CC360 Widget] 🚫 Location filter active - widget will not show
[CC360 Widget] Current location: loc_def456uvw
[CC360 Widget] Allowed location: loc_abc123xyz
[CC360 Widget] Widget initialization stopped (location mismatch)
```

**When No Filter is Set (Default Behavior):**
```
[CC360 Widget] 🔧 Fetching config from: https://your-app.com/api/config
[CC360 Widget] ✅ Config received: { widgetLocationFilter: null, ... }
[CC360 Widget] 🌍 No location filter - widget will show for all authorized locations
```

### Security Notes

- The filter is enforced **client-side** during widget initialization
- If someone bypasses the client-side check, the backend API still requires proper authorization
- The location ID is **public information** visible in GHL URLs and is not considered sensitive
- The filter is meant for **business logic**, not security - backend API authorization is your security layer

---

## Feature Flags

The widget supports feature flags to enable or disable specific checklist items. This allows you to customize the onboarding experience based on your business needs without code changes.

### Available Feature Flags

#### Connect Payments Checklist

Control whether the "Connect Payments" step appears in the onboarding widget.

**Environment Variable:** `FEATURE_CONNECT_PAYMENTS_ENABLED`

**Default:** `true` (enabled)

**Options:**
- `true` - Show the "Connect Payments" checklist item
- `false` - Hide the "Connect Payments" checklist item

### Configuration

**Local Development (.env):**

```bash
# Enable Connect Payments checklist (default)
FEATURE_CONNECT_PAYMENTS_ENABLED=true

# Disable Connect Payments checklist
FEATURE_CONNECT_PAYMENTS_ENABLED=false
```

**Vercel (Production/Staging):**

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `FEATURE_CONNECT_PAYMENTS_ENABLED`
   - **Value:** `true` or `false`
   - **Environment:** Choose `Production`, `Preview`, or `Development` as needed
4. Click **Save**
5. **Redeploy** your application for the changes to take effect

### How Feature Flags Work

#### Flow

1. **Application Start:**
   - Environment variable `FEATURE_CONNECT_PAYMENTS_ENABLED` is read
   - Default is `true` if not set or set to any value other than `"false"`

2. **Widget Initialization:**
   - Widget calls `/api/config` endpoint
   - Receives `featureFlags` object in response
   - Stores flags in widget state

3. **Checklist Rendering:**
   - All checklist items are defined with optional `featureFlag` property
   - Items are filtered based on feature flag values
   - Only enabled items are rendered in the UI

4. **Progress Calculation:**
   - Progress is calculated based on enabled items only
   - Example: If Connect Payments is disabled, progress shows "2/3" instead of "2/4"

5. **Completion Detection:**
   - Completion logic checks only enabled tasks
   - Widget shows completion dialog when all enabled tasks are done

#### When a Feature Flag is Disabled

1. **The checklist item is hidden** - Users won't see the disabled step in the widget
2. **Progress calculation adjusts** - The progress bar only counts enabled items (e.g., "2/3" instead of "2/4")
3. **Completion logic updates** - The widget considers all tasks complete when only enabled items are done
4. **Real-time updates** - The widget fetches feature flags on initialization

### Example Scenarios

#### Scenario 1: All Items Enabled (Default)

```bash
FEATURE_CONNECT_PAYMENTS_ENABLED=true
```

**Result:**
- Checklist shows: ✓ Sign in, Connect Payments, Create Course, Connect Domain
- Progress: "0/4" → "4/4"
- Completion: All 4 tasks must be done

#### Scenario 2: Connect Payments Disabled

```bash
FEATURE_CONNECT_PAYMENTS_ENABLED=false
```

**Result:**
- Checklist shows: ✓ Sign in, Create Course, Connect Domain (no Connect Payments)
- Progress: "0/3" → "3/3"
- Completion: Only 3 tasks must be done
- Console log: `[CC360 Widget] 🚩 Feature flags received: { connectPaymentsEnabled: false }`

### Use Cases

**Disable Connect Payments when:**
- You want to simplify onboarding for users who don't need payment integration
- Running a pilot program without payment features
- Certain sub-accounts don't require payment setup
- You want to focus on other onboarding steps first
- A/B testing different onboarding flows
- Customer-specific customization needs

### Console Logging

**When Feature Flags are Loaded:**

```
[CC360 Widget] 🔧 Fetching config from: https://your-app.com/api/config
[CC360 Widget] ✅ Config received: { featureFlags: { connectPaymentsEnabled: false }, ... }
[CC360 Widget] 🚩 Feature flags received: { connectPaymentsEnabled: false }
```

### Testing Feature Flags

#### Local Testing

1. Edit `.env` file:
   ```bash
   FEATURE_CONNECT_PAYMENTS_ENABLED=false
   ```

2. Restart the development server:
   ```bash
   make restart
   ```

3. Open the widget in a browser:
   ```bash
   make open
   ```

4. Verify:
   - "Connect Payments" item is not shown
   - Progress bar shows "X/3" instead of "X/4"
   - Console shows: `🚩 Feature flags received: { connectPaymentsEnabled: false }`

#### Production Testing (Vercel)

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add: `FEATURE_CONNECT_PAYMENTS_ENABLED` = `false`
3. Redeploy the application
4. Verify widget behavior in production

### Implementation Details

#### Backend (`src/app.ts`)

The `/api/config` endpoint returns feature flags:

```typescript
const featureConnectPaymentsEnabled = process.env.FEATURE_CONNECT_PAYMENTS_ENABLED !== 'false';

return res.json({
  apiBase: getBaseUrl(),
  environment: getEnvironment(),
  ghlAppBaseUrl: getGhlAppBaseUrl(),
  userpilotToken: userpilotToken || null,
  widgetLocationFilter: filterLocationId,
  widgetLocationFilterValid: filterValid,
  featureFlags: {
    connectPaymentsEnabled: featureConnectPaymentsEnabled
  }
});
```

#### Frontend (`public/widget.js`)

Checklist items are filtered based on feature flags:

```javascript
const allItems = [
  {
    key: 'accountCreated',
    title: 'Sign in to your Account',
    url: '#',
    completed: status.locationVerified,
    isStatic: true
  },
  {
    key: 'paymentIntegrated',
    title: 'Connect Payments',
    url: 'payments/integrations/',
    completed: status.paymentIntegrated,
    featureFlag: 'connectPaymentsEnabled'  // Feature flag property
  },
  // ... other items
];

// Filter items based on feature flags
const items = allItems.filter(item => {
  if (!item.featureFlag) return true; // No feature flag = always shown
  return featureFlags[item.featureFlag] !== false;
});
```

### Adding New Feature Flags

To add a new feature flag for other checklist items:

#### Step 1: Add Environment Variable

**File:** `env.template`

```bash
FEATURE_YOUR_ITEM_ENABLED=true
```

#### Step 2: Update Backend

**File:** `src/app.ts`

```typescript
// Parse the feature flag
const featureYourItemEnabled = process.env.FEATURE_YOUR_ITEM_ENABLED !== 'false';

// Add to response
return res.json({
  // ... other properties
  featureFlags: {
    connectPaymentsEnabled: featureConnectPaymentsEnabled,
    yourItemEnabled: featureYourItemEnabled  // Add this
  }
});
```

#### Step 3: Update Frontend

**File:** `public/widget.js`

```javascript
// Add featureFlag property to the checklist item
{
  key: 'yourItem',
  title: 'Your Item Title',
  url: 'your/url',
  completed: status.yourItem,
  featureFlag: 'yourItemEnabled'  // Add this
}
```

#### Step 4: Update Completion Logic (if needed)

**File:** `public/widget.js`

```javascript
const allCompleted = status.domainConnected && status.courseCreated && 
  (!featureFlags.connectPaymentsEnabled || status.paymentIntegrated) &&
  (!featureFlags.yourItemEnabled || status.yourItem);  // Add this
```

#### Step 5: Update Documentation

Add documentation for the new feature flag in this README section.

### Benefits

1. **Flexibility:** Enable/disable features without code changes
2. **A/B Testing:** Test different onboarding flows with different audiences
3. **Gradual Rollout:** Enable features for specific environments (dev/staging/prod)
4. **Customer Customization:** Tailor widget for different client needs
5. **Simplified Onboarding:** Focus on most important steps for specific use cases

### Notes

- Feature flags default to `true` (enabled) if not set
- Setting to any value other than the string `"false"` enables the feature
- Feature flags are fetched once during widget initialization
- Changes require page reload or widget reload to take effect
- Feature flags are client-side configuration; backend still tracks all fields in database
- No database schema changes needed - flags only control UI display

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

## Architecture & Performance

### Location Validation Architecture

**MYTH**: "The widget fetches all 100+ locations every time to check if a location is valid."

**REALITY**: The widget uses **direct location ID lookups** via GHL's API. It NEVER fetches all locations for validation.

#### How It Actually Works

**Widget Initialization (Efficient ✅):**

When a location loads the widget:
```
User opens GHL dashboard → Widget detects locationId → Direct API lookup
```

**Code Flow:**
```typescript
// 1. Widget detects location from URL/context
const locationId = detectLocationFromContext();

// 2. Makes a SINGLE API call to check this specific location
GET /api/installation/check?locationId=loc_abc123

// 3. Backend validates with direct lookup (NOT fetching all locations)
const validation = await validateLocationId(locationId);
  → calls searchLocationById(locationId)  // Direct GHL API call
  → GHL returns: 200 OK (valid) or 404 Not Found (invalid)
```

**API Calls Made**: **1 call** to GHL API for that specific location ID

**Location Validation (Efficient ✅):**

The `validateLocationId()` function uses direct lookup:
- Makes a GET request to GHL API: `GET /locations/{locationId}`
- GHL instantly returns whether the location exists and belongs to your agency
- No iteration, no fetching lists, just a single lookup

**Sub-Account Registration (Efficient ✅):**

When a new sub-account is detected:
- After validation succeeds, register in our database
- Database Writes: 1 upsert to `sub_accounts` table
- API Calls: 0 (already validated above)

#### Performance Comparison

| Operation | Old (Bad) Approach | New (Good) Approach |
|-----------|-------------------|---------------------|
| Validate 1 location | Fetch 1000 locations → Find match | Direct lookup: 1 API call |
| Widget init | Fetch all → Check if location in list | Direct lookup: 1 API call |
| Check 100 different locations | Fetch 1000 × 100 times | 100 direct lookups |
| API calls for validation | 1000+ locations/request | 1 location/request |

#### Best Practices

**✅ DO Use These Functions:**

For individual location validation:
- `validateLocationId(locationId)` - Checks if location belongs to agency
- `searchLocationById(locationId)` - Gets location details
- `getLocation(locationId)` - Gets location with SDK client

**❌ DON'T Use This Function:**

For location validation:
- `getAgencyLocations()` - Fetches ALL locations (expensive!)

**📝 When to Use `getAgencyLocations()`:**

ONLY use when you actually need ALL locations:
- Admin dashboard showing all sub-accounts
- Bulk operations on all locations
- Analytics/reporting across all locations
- Syncing all locations to a cache

**Bottom line**: The widget is efficient and scales well even for agencies with 1000+ locations.

### Serverless Database Connection

The app uses a Prisma Client singleton pattern to optimize for serverless environments:

**Connection Pooling:**
- Reuses Prisma Client instances across serverless invocations
- Prevents connection pool exhaustion
- Handles cold starts efficiently

**For Vercel Postgres:**
- Use `POSTGRES_PRISMA_URL` (already pooled)
- Vercel automatically handles connection pooling

**For External Databases:**
Add connection pool parameters to `DATABASE_URL`:
```
?connection_limit=5&pool_timeout=10&connect_timeout=10
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

#### OAuth Callback Not Redirecting

**Cause**: Return URL not preserved or invalid

**Solution**:
1. Check browser console for redirect logs
2. Verify state cookie contains returnUrl
3. Check Vercel logs for redirect attempts
4. Ensure `APP_BASE_URL` is set correctly in production

### Widget Issues

#### Widget Doesn't Appear

**Check**:
1. Custom Values applied to locations
2. URLs in widget code are correct
3. JavaScript console for errors (F12)
4. Location filter is not blocking this location

#### Checklist Not Updating

**Check**:
1. Webhooks configured in GHL Marketplace
2. Status polling active (check browser console for polling logs)
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
3. Rebuild and redeploy
4. After deployment, run migrations via endpoint:
   ```bash
   curl -X POST https://your-app.vercel.app/api/migrate \
     -H "x-vercel-migrate-secret: your-secret"
   ```

**Error 2**: `Can't reach database server at db.prisma.io:5432`

**Cause**: `DATABASE_URL` environment variable is not set or using placeholder value

**Solution**:
1. Check Vercel → Settings → Environment Variables
2. If using Vercel Postgres: Ensure database is linked to project (auto-injects `DATABASE_URL` and `POSTGRES_URL`)
3. If using external database: Set `DATABASE_URL` and `POSTGRES_URL` manually
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

**Error 4**: Database connection timeout in serverless

**Cause**: Connection pool exhaustion or cold start timeout

**Solution**:
1. Ensure using pooled connection (`POSTGRES_PRISMA_URL` for Vercel Postgres)
2. Add connection pooling params for external databases
3. Check Prisma Client singleton pattern is working
4. Reduce `connection_limit` if needed

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
│   ├── sse.ts        # SSE broker (legacy, kept for compatibility)
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
  ☐ DATABASE_URL (auto-set by Vercel Postgres, or set manually for external DB)
  ☐ POSTGRES_URL (auto-set by Vercel Postgres, or set manually for external DB)
  ☐ GHL_CLIENT_ID
  ☐ GHL_CLIENT_SECRET
  ☐ VERCEL_MIGRATE_SECRET
  ☐ SKIP_BUILD_MIGRATIONS=true
☐ App deployed to Vercel
☐ Migrations ran successfully (check Vercel build logs or run via /api/migrate)
☐ GHL Marketplace OAuth URI updated to production URL
☐ GHL Marketplace webhook URL updated to production URL
☐ Agency authorized with production URL
☐ Custom Values script updated with production URLs
☐ Tested with real sub-account
☐ Webhooks delivering successfully
☐ Status polling working (check browser console)
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
│ 4. Widget Polls for Updates             │
├─────────────────────────────────────────┤
│ GET /api/status (every 10 seconds)      │
│ → Checks onboarding progress            │
│ → Serverless-friendly polling           │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 5. User Completes Actions               │
├─────────────────────────────────────────┤
│ Create course in GHL                    │
│ → GHL sends webhook                     │
│ → Server updates database               │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ 6. Widget Detects Update on Next Poll  │
├─────────────────────────────────────────┤
│ Status API returns updated data         │
│ → Widget updates UI with checkmark      │
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
- **Real-time**: Status polling (serverless-optimized)
- **OAuth**: GoHighLevel OAuth 2.0
- **Deployment**: Vercel (serverless)
- **Frontend**: Vanilla JavaScript (no framework)
- **Containerization**: Docker + Docker Compose
- **Analytics**: Userpilot (server-side and client-side)

---

## Security

- ✅ OAuth tokens stored server-side only
- ✅ Automatic token refresh (no re-auth needed)
- ✅ Environment variables for secrets
- ✅ HTTPS enforced in production
- ✅ Minimum OAuth scopes requested
- ✅ Client secrets never exposed to client
- ✅ Open redirect prevention in OAuth callback
- ✅ Return URL validation and sanitization

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
