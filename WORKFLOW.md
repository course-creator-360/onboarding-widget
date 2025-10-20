# CC360 Onboarding Widget - Installation Workflow

## Complete Step-by-Step Installation Guide

---

## 📋 PHASE 1: GHL Marketplace App Setup (One-Time)

### Step 1: Create Marketplace App

1. Go to **https://marketplace.gohighlevel.com/**
2. Login with agency admin credentials
3. Navigate to **"My Apps"** or **"Developer"**
4. Click **"Create New App"**
5. Fill in basic information:
   - App Name: `CourseCreator360 Onboarding Widget`
   - Description: `Onboarding checklist for new CC360 users`
   - Category: `Tools & Utilities`
6. Click **Save**

### Step 2: Configure OAuth (Auth Section)

1. In your app, go to **Advanced Settings → Auth**
2. Set **Redirect URI:**
   ```
   http://localhost:4002/oauth/callback
   ```
   (For production: `https://your-domain.com/oauth/callback`)

3. Select **OAuth Scopes** (check all):
   - ✅ courses.readonly
   - ✅ funnels/funnel.readonly
   - ✅ funnels/page.readonly
   - ✅ products.readonly
   - ✅ products/prices.readonly
   - ✅ payments/orders.readonly
   - ✅ payments/transactions.readonly
   - ✅ payments/custom-provider.readonly

4. Click **Save**

### Step 3: Get OAuth Credentials

1. In the Auth section, copy:
   - **Client ID:** `68ee770ab82aceb67bfaae60-mgs8i5g2`
   - **Client Secret:** `5a9d6158-bbcd-4566-8c2f-c4c97221d1d7`
2. Keep these secure (needed for next phase)

---

## 🖥️ PHASE 2: Local Server Setup (One-Time)

### Step 1: Initial Setup

```bash
# Navigate to project
cd onboarding-widget

# Run setup
make setup

# This creates .env file from template
```

### Step 2: Configure Environment

Edit `.env` file with your OAuth credentials:

```env
PORT=4002
NODE_ENV=development
DATA_DIR=./data

# Add your GHL credentials from Phase 1
GHL_CLIENT_ID=68ee770ab82aceb67bfaae60-mgs8i5g2
GHL_CLIENT_SECRET=5a9d6158-bbcd-4566-8c2f-c4c97221d1d7
GHL_REDIRECT_URI=http://localhost:4002/oauth/callback
```

### Step 3: Start Server

```bash
make start
```

Server will start at **http://localhost:4002**

### Step 4: Verify Server

```bash
make status
```

Should show: `✓ Server is running`

---

## 🔐 PHASE 3: Agency Authorization (One-Time)

### Step 1: Open Setup Page

```bash
make agency-setup
```

Or manually open: **http://localhost:4002**

### Step 2: Initiate OAuth

1. On the demo page, click **"🔑 Setup Agency OAuth"** button
2. Browser redirects to GHL marketplace OAuth page

### Step 3: Authorize in GoHighLevel

**GHL shows location selection:**
```
┌──────────────────────────────────────┐
│ Choose Location                      │
├──────────────────────────────────────┤
│ Select where to install:             │
│ ○ Location 1 (Joe's Coaching)        │
│ ○ Location 2 (Mary's Courses)        │
│ ○ Install for entire agency          │
│                                      │
│           [Continue]                 │
└──────────────────────────────────────┘
```

1. Select a location (or agency-wide option if available)
2. Click **Continue**

**GHL shows authorization consent:**
```
┌──────────────────────────────────────┐
│ CC360 Onboarding Widget wants to:    │
├──────────────────────────────────────┤
│ ✓ View your courses                  │
│ ✓ View your funnels                  │
│ ✓ View your products                 │
│ ✓ View payment information           │
│                                      │
│      [Allow]        [Deny]           │
└──────────────────────────────────────┘
```

3. Click **"Allow"**

### Step 4: OAuth Completes

```
GHL redirects back to: http://localhost:4002/oauth/callback?code=...
  ↓
Server exchanges code for tokens
  ↓
Stores in database:
  - location_id: 'agency'
  - access_token: 'eyJhbGci...'
  - token_type: 'agency'
  ↓
Shows success page OR redirects back with oauth_success=true
  ↓
Page reloads
  ↓
✓ Agency is now authorized!
```

### Step 5: Verify Authorization

```bash
make test
```

Or click **"Check Agency Status"** on demo page

Should show: `✓ Authorized`

---

## 📲 PHASE 4: Widget Deployment to Sub-Accounts (One-Time)

### Step 1: Access Agency Settings

1. Login to **GHL as agency admin**
2. Go to **Settings → Custom Values**

### Step 2: Create Widget Custom Value

1. Click **"Add Custom Value"**
2. Fill in:
   - **Name:** `CC360 Onboarding Widget`
   - **Type:** `JavaScript`
   - **Value:** Paste this code:

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
  script.src = 'http://localhost:4002/widget.js';
  script.setAttribute('data-location', locationId);
  script.setAttribute('data-api', 'http://localhost:4002');
  
  document.body.appendChild(script);
})();
</script>
```

3. **Apply to:** Select "All Locations"
4. Click **"Save"**

---

## 👤 PHASE 5: Sub-Account User Experience (Automatic)

### Every Time a Sub-Account User Logs In:

**Step 1: User Login**
```
Sub-account user (e.g., Joe) logs into GHL dashboard
URL: https://app.gohighlevel.com/v2/location/joe_loc_123/dashboard
```

**Step 2: Custom Values Script Executes**
```
GHL loads page
  ↓
Custom Values JavaScript runs automatically
  ↓
Extracts locationId from URL: "joe_loc_123"
  ↓
Loads widget.js with locationId
```

**Step 3: Widget Initializes**
```javascript
widget.js executes:
  ↓
1. Gets locationId: "joe_loc_123"
  ↓
2. Checks authorization:
   GET /api/installation/check?locationId=joe_loc_123
  ↓
3. Server checks: hasAgencyAuthorization()
   - Finds agency token in database ✓
  ↓
4. Returns: { installed: true, tokenType: 'agency' }
  ↓
5. Widget shows checklist (NOT "Setup Required")
```

**Step 4: Widget Displays**
```
┌────────────────────────────────┐
│ 🚀 Welcome to CC360!           │
│ Complete these steps           │
│                                │
│ Progress: 0/4  [▯▯▯▯] 0%      │
│                                │
│ ○ Connect a domain             │
│ ○ Create your first course     │
│ ○ Connect product to site      │
│ ○ Connect payment processor    │
│                                │
│ Powered by CC360          [×]  │
└────────────────────────────────┘
  ↑ Appears in bottom-right corner
```

**Step 5: Real-Time Connection**
```
Widget connects to SSE:
GET /api/events?locationId=joe_loc_123
  ↓
Server keeps connection open
  ↓
Sends heartbeat every 25 seconds
  ↓
Broadcasts updates when onboarding changes
```

---

## 🔄 PHASE 6: Onboarding Progress Updates (Automatic)

### When User Completes an Action:

**Example: Joe Creates a Course**

```
Step 1: Joe creates course in GHL dashboard
  ↓
Step 2: GHL sends webhook
  POST /api/webhooks/ghl
  {
    "event": "ProductCreate",
    "locationId": "joe_loc_123",
    "data": {...}
  }
  ↓
Step 3: Server processes webhook
  - Matches event: ProductCreate → courseCreated = true
  - Updates database for locationId "joe_loc_123"
  - Broadcasts via SSE to all connected clients
  ↓
Step 4: Widget receives SSE update
  - Updates UI: "Create your first course" ✓
  - Progress bar animates: 0% → 25%
  - Checkmark appears with animation
  ↓
Step 5: All tabs update simultaneously
  - Joe has 2 browser tabs open
  - Both tabs show updated progress
  - Real-time sync!
```

### Webhook Event Mapping:

```
GHL Event                    → Widget Update
─────────────────────────────────────────────
ProductCreate/ProductUpdate  → ✓ Course created
OrderCreate                  → ✓ Product attached
ExternalAuthConnected        → ✓ Payment integrated
Domain connection            → (Manual update via API)
```

---

## 👥 PHASE 7: Multiple Sub-Accounts (Automatic)

### Each Sub-Account Has Independent Progress:

**Joe's Location (joe_loc_123):**
```
Progress: 2/4 (50%)
✓ Domain connected
✓ Course created
○ Product attached
○ Payment integrated
```

**Mary's Location (mary_loc_456):**
```
Progress: 1/4 (25%)
✓ Domain connected
○ Course created
○ Product attached
○ Payment integrated
```

**Bob's Location (bob_loc_789):**
```
Progress: 4/4 (100%)
✓ All steps complete
Widget can be dismissed
```

### Database Structure:

```sql
-- Single agency token (shared)
installations:
location_id | token_type | access_token
──────────────────────────────────────
agency      | agency     | eyJhbGci...

-- Separate progress per location
onboarding:
location_id  | domain | course | product | payment | dismissed
─────────────────────────────────────────────────────────────
joe_loc_123  | 1      | 1      | 0       | 0       | 0
mary_loc_456 | 1      | 0      | 0       | 0       | 0
bob_loc_789  | 1      | 1      | 1       | 1       | 1
```

---

## 🔧 PHASE 8: Testing & Development

### Using Makefile Commands:

```bash
# Check server status
make status

# View live logs
make logs

# Restart after code changes
make restart

# Test API endpoints
make test

# Clean and reset database
make clean
```

### Using Demo Page (http://localhost:4002):

**Agency Setup:**
- 🔑 Setup Agency OAuth → Authorize agency
- Check Agency Status → Verify authorization
- Clear Agency Auth → Reset for testing

**Widget Testing:**
- Check Installation → See auth status
- Reload Widget → Refresh widget state

**Progress Simulation:**
- Toggle Domain → Simulate domain connection
- Toggle Course → Simulate course creation
- Toggle Product → Simulate product attachment
- Toggle Payment → Simulate payment integration
- Reset All → Clear all progress
- Check Status → View current state

---

## 📊 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  1. Agency Admin Setup (One-Time)                       │
├─────────────────────────────────────────────────────────┤
│  Create GHL app → Configure OAuth → Deploy server       │
│  → Authorize agency → Deploy widget script              │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  2. Widget Auto-Loads in Sub-Accounts                   │
├─────────────────────────────────────────────────────────┤
│  User logs in → Custom Values runs → Extracts locationId│
│  → Loads widget.js → Widget appears                     │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  3. Widget Checks Authorization                         │
├─────────────────────────────────────────────────────────┤
│  GET /api/installation/check?locationId=xyz             │
│  → Server: hasAgencyAuthorization() → TRUE              │
│  → Widget shows checklist                               │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  4. Widget Connects to Real-Time Updates                │
├─────────────────────────────────────────────────────────┤
│  EventSource: GET /api/events?locationId=xyz            │
│  → Server maintains SSE connection                      │
│  → Sends heartbeat every 25s                            │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  5. User Completes Onboarding Actions                   │
├─────────────────────────────────────────────────────────┤
│  Create course / Add payment / etc in GHL               │
│  → GHL sends webhook to /api/webhooks/ghl               │
│  → Server updates database for that locationId          │
│  → Server broadcasts SSE to connected clients           │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  6. Widget Updates in Real-Time                         │
├─────────────────────────────────────────────────────────┤
│  Widget receives SSE message                            │
│  → Updates UI: checkmark appears ✓                      │
│  → Progress bar animates                                │
│  → All open tabs update simultaneously                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Start Checklist

### For Agency Admin:

```
☐ 1. Create GHL Marketplace app
☐ 2. Configure OAuth in Auth section
☐ 3. Get Client ID and Secret
☐ 4. Run: make setup
☐ 5. Edit .env with credentials
☐ 6. Run: make start
☐ 7. Open: http://localhost:4002
☐ 8. Click "Setup Agency OAuth"
☐ 9. Authorize in GHL popup
☐ 10. Verify: "Check Agency Status" shows ✓
☐ 11. Add widget script to Custom Values
☐ 12. Apply to all locations
☐ 13. Test with one sub-account
☐ 14. Deploy to all sub-accounts
```

### For Sub-Account Users:

```
✓ Nothing! Widget appears automatically
✓ No setup required
✓ Just use it
```

---

## 🔄 Daily Development Workflow

### Starting Development:

```bash
make start      # Start server
make open       # Open demo page
make logs       # Watch logs
```

### Making Changes:

```bash
# Edit code in src/ or public/
make restart    # Apply changes
# Test in browser
```

### Testing:

```bash
make test       # Test API endpoints
make status     # Check server health
```

### Stopping:

```bash
make stop       # Stop server
```

### Resetting:

```bash
make clean      # Clean database (for fresh start)
make start      # Restart fresh
```

---

## 📦 Production Deployment Workflow

### Step 1: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Note the deployment URL (e.g., https://your-app.vercel.app)
```

### Step 2: Configure Vercel Environment

In Vercel Dashboard → Your Project → Settings → Environment Variables:

```
GHL_CLIENT_ID=68ee770ab82aceb67bfaae60-mgs8i5g2
GHL_CLIENT_SECRET=5a9d6158-bbcd...
GHL_REDIRECT_URI=https://your-app.vercel.app/oauth/callback
NODE_ENV=production
```

### Step 3: Update GHL Marketplace

1. Go to GHL Marketplace → Your App → Auth
2. **Add production redirect URI:**
   ```
   https://your-app.vercel.app/oauth/callback
   ```
3. Keep localhost URI for testing
4. Save

### Step 4: Re-Authorize for Production

1. Visit: `https://your-app.vercel.app`
2. Click "Setup Agency OAuth"
3. Authorize again (production environment)

### Step 5: Update Custom Values

Change widget URLs in Custom Values script:

```javascript
script.src = 'https://your-app.vercel.app/widget.js';
script.setAttribute('data-api', 'https://your-app.vercel.app');
```

### Step 6: Configure Webhooks

In GHL Marketplace → Your App → Webhooks:

1. **Webhook URL:**
   ```
   https://your-app.vercel.app/api/webhooks/ghl
   ```

2. **Subscribe to events:**
   - ✅ Product Create
   - ✅ Product Update
   - ✅ Order Create
   - ✅ External Auth Connected

3. Save

### Step 7: Test Production

1. Login to a sub-account
2. Verify widget appears
3. Test onboarding steps
4. Verify real-time updates work

---

## 🐛 Troubleshooting Workflow

### Issue: Widget Shows "Setup Required"

```bash
make test  # Check if agency is authorized
```

**If not authorized:**
```bash
make agency-setup  # Run OAuth flow again
```

### Issue: OAuth Popup Shows White Screen

**Check:**
1. GHL Marketplace redirect URI matches `.env`
2. App is NOT in "Draft" status
3. All scopes are selected and saved
4. Wait 5 minutes after saving changes

### Issue: Checklist Not Updating

**Check:**
1. Webhooks configured in GHL
2. SSE connection active (check browser console)
3. Server logs: `make logs`

### Issue: Database Errors

```bash
make clean   # Reset database
make start   # Start fresh
```

---

## 📝 Summary: The Three Key Flows

### 1. Installation Flow (Admin - Once)
```
GHL App Setup → Server Deployment → Agency OAuth → Widget Deployment
```

### 2. Widget Load Flow (User - Every Login)
```
User Login → Custom Values Runs → Widget Loads → Check Auth → Show Checklist
```

### 3. Update Flow (Automatic - Real-Time)
```
User Action → GHL Webhook → Database Update → SSE Broadcast → Widget Update
```

---

## ⚡ Quick Reference

### Start Fresh:
```bash
make clean && make start && make agency-setup
```

### Daily Development:
```bash
make start && make logs
```

### Deploy to Production:
```bash
vercel
# Then update GHL app settings with production URL
```

---

**That's the complete workflow!** Every step from initial setup to production deployment. 🚀

