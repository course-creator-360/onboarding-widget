# CC360 Onboarding Widget - Setup Guide

This guide explains how to set up and deploy the onboarding widget for CourseCreator360.

## Table of Contents

- [Prerequisites](#prerequisites)
- [GHL Marketplace Setup](#ghl-marketplace-setup)
- [Local Development Setup](#local-development-setup)
- [Agency Authorization](#agency-authorization)
- [Widget Deployment](#widget-deployment)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- GoHighLevel Agency Account
- Access to GHL Marketplace Developer Portal
- Node.js 20+ installed (for local development)
- Docker installed (optional, for local development)

---

## GHL Marketplace Setup

### Step 1: Create App in GHL Marketplace

1. Log into **GHL Marketplace Developer Portal**
   - URL: https://marketplace.gohighlevel.com/
   - Navigate to "My Apps" or "Developer" section

2. Click **"Create New App"**

3. Fill in **Basic Information:**
   ```
   App Name: CourseCreator360 Onboarding Widget
   Description: Onboarding checklist for new CC360 users
   Category: Tools & Utilities
   ```

### Step 2: Configure OAuth Settings

In the OAuth Configuration section:

**Redirect URI (Critical!):**
```
# For local development:
http://localhost:4002/api/oauth/callback

# For production (update with your domain):
https://your-widget-domain.com/api/oauth/callback
```

**Required Scopes:** (Check all boxes)
- ✅ `courses.readonly` - View courses
- ✅ `funnels.readonly` - View funnels/websites
- ✅ `products.readonly` - View products
- ✅ `products/prices.readonly` - View product pricing
- ✅ `payments/orders.readonly` - View orders
- ✅ `payments/transactions.readonly` - View transactions
- ✅ `payments/custom-provider.readonly` - View payment providers

### Step 3: Get OAuth Credentials

After saving, GHL will display:

```
Client ID: abc123def456...
Client Secret: xyz789secret...
```

**⚠️ Important:** 
- Copy both values immediately
- Keep Client Secret secure (never commit to git)
- Client Secret cannot be retrieved later (only regenerated)

---

## Local Development Setup

### Option A: Using Docker (Recommended)

1. **Clone the repository:**
   ```bash
   cd /path/to/onboarding-widget
   ```

2. **Create `.env` file:**
   ```bash
   cp env.template .env
   ```

3. **Edit `.env` with your credentials:**
   ```env
   PORT=4002
   NODE_ENV=development
   
   # Add your GHL credentials here:
   GHL_CLIENT_ID=your_client_id_from_step_3
   GHL_CLIENT_SECRET=your_client_secret_from_step_3
   GHL_REDIRECT_URI=http://localhost:4002/api/oauth/callback
   ```

4. **Start the server:**
   ```bash
   docker-compose up --build
   ```

5. **Verify it's running:**
   ```bash
   curl http://localhost:4002/api/healthz
   # Should return: {"ok":true}
   ```

### Option B: Without Docker

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file** (same as above)

3. **Start dev server:**
   ```bash
   npm run dev
   ```

4. **Open demo page:**
   ```
   http://localhost:4002
   ```

---

## Agency Authorization

This is a **ONE-TIME setup** that allows the widget to work for ALL sub-accounts.

### Why Agency-Level Authorization?

- ✅ Authorize once for entire agency
- ✅ Works automatically for all sub-accounts
- ✅ No per-user OAuth popups
- ✅ Simpler user experience

### Setup Steps

1. **Open the demo page:**
   ```
   http://localhost:4002
   ```

2. **Click "🔑 Setup Agency OAuth"**
   - A popup window will open

3. **Authorize in GoHighLevel:**
   - Log in with your agency admin account
   - Review the requested permissions
   - Click "Allow" or "Authorize"

4. **Popup closes automatically:**
   - Success message appears
   - Widget is now ready for all sub-accounts!

5. **Verify agency status:**
   - Click "Check Agency Status" button
   - Should show: "✓ Authorized"

---

## Widget Deployment

### Deploying to Sub-Account Dashboards

The widget needs to be injected into the GHL dashboard so it loads automatically for all sub-accounts.

### Method 1: Custom Values (Recommended)

1. **Go to Agency Settings:**
   ```
   GHL Agency Dashboard → Settings → Custom Values
   ```

2. **Add Custom JavaScript:**

   Click "Add Custom Value" → Select "JavaScript"

3. **Paste this code:**

   ```html
   <script>
   (function() {
     // Auto-detect locationId from URL
     const match = window.location.pathname.match(/\/location\/([^\/]+)/);
     if (!match) return;
     
     const locationId = match[1];
     
     // Load widget
     const script = document.createElement('script');
     script.src = 'https://your-production-domain.com/widget.js';
     script.setAttribute('data-location', locationId);
     script.setAttribute('data-api', 'https://your-production-domain.com');
     document.body.appendChild(script);
   })();
   </script>
   ```

4. **Save and Apply:**
   - Choose which locations to apply (all recommended)
   - Save changes

5. **Test:**
   - Log into any sub-account
   - Widget should appear in bottom-right corner

### Method 2: SaaS Mode Integration

If CourseCreator360 is in SaaS mode, integrate the widget code into the custom dashboard loader.

### Method 3: Browser Extension

For testing or selective deployment, create a Chrome extension that injects the widget.

---

## Production Deployment

### Recommended: Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Set environment variables in Vercel:**
   ```
   GHL_CLIENT_ID=your_client_id
   GHL_CLIENT_SECRET=your_client_secret
   GHL_REDIRECT_URI=https://your-vercel-app.vercel.app/api/oauth/callback
   ```

4. **Update GHL Marketplace:**
   - Go back to your app in GHL Marketplace
   - Update Redirect URI to production URL
   - Save changes

5. **Re-authorize agency:**
   - Visit: `https://your-vercel-app.vercel.app`
   - Click "Setup Agency OAuth"
   - Authorize with production credentials

### Alternative: Other Platforms

The app works on:
- ✅ Vercel (recommended)
- ✅ Railway
- ✅ Render
- ✅ Heroku
- ✅ Any Node.js hosting

**Requirements:**
- Node.js 20+
- Persistent storage for SQLite (or use PostgreSQL)
- Environment variables support

---

## Webhook Configuration

To receive real-time updates when users complete onboarding steps:

1. **Go to GHL Marketplace:**
   - Your App → Webhooks section

2. **Add Webhook URL:**
   ```
   https://your-production-domain.com/api/webhooks/ghl
   ```

3. **Subscribe to events:**
   - ✅ Product Create
   - ✅ Product Update
   - ✅ Order Create
   - ✅ External Auth Connected

4. **Save configuration**

The widget will now update automatically when:
- User creates a course → ✓ Course created
- User makes a sale → ✓ Product attached
- User connects payment → ✓ Payment integrated

---

## Troubleshooting

### OAuth Popup Shows White Screen

**Cause:** Redirect URI mismatch

**Solution:**
1. Check GHL Marketplace settings
2. Ensure redirect URI matches exactly:
   ```
   http://localhost:4002/api/oauth/callback
   ```
3. No trailing slashes
4. Use `http` for localhost, `https` for production

### Widget Shows "Setup Required"

**Cause:** Agency not authorized

**Solution:**
1. Visit demo page: `http://localhost:4002`
2. Click "Setup Agency OAuth"
3. Complete authorization
4. Reload widget

### Widget Doesn't Appear

**Possible causes:**
1. **Custom Values not applied**
   - Check Agency Settings → Custom Values
   - Ensure applied to locations

2. **Wrong URL in widget code**
   - Verify `script.src` points to your server
   - Check `data-api` attribute matches

3. **JavaScript errors**
   - Open browser console (F12)
   - Look for errors in red

### Checklist Not Updating

**Cause:** Webhooks not configured or SSE connection failed

**Solution:**
1. Verify webhooks configured in GHL Marketplace
2. Test webhook endpoint:
   ```bash
   curl -X POST http://localhost:4002/api/webhooks/ghl \
     -H "Content-Type: application/json" \
     -d '{"event":"ProductCreate","locationId":"test"}'
   ```
3. Check browser console for SSE errors

### Database Errors

**Cause:** SQLite file permissions or missing directory

**Solution:**
```bash
# Ensure data directory exists
mkdir -p data

# Check permissions
chmod 755 data

# Restart server
docker-compose restart
```

---

## Testing Checklist

Before going live, verify:

- [ ] Agency OAuth completes successfully
- [ ] Widget appears in sub-account dashboards
- [ ] Checklist shows correct progress
- [ ] Real-time updates work (test with mock buttons)
- [ ] Dismiss button works
- [ ] Links go to correct GHL pages
- [ ] Webhooks update checklist automatically
- [ ] Widget works across different sub-accounts

---

## Support

For issues or questions:
1. Check this guide first
2. Review README.md
3. Check browser console for errors
4. Review server logs: `docker-compose logs -f`

---

## Security Notes

- ✅ Never commit `.env` file to git
- ✅ Keep Client Secret secure
- ✅ Use HTTPS in production
- ✅ Rotate credentials if leaked
- ✅ Review OAuth scopes (request minimum needed)

---

**Ready to deploy?** Follow the steps above and your onboarding widget will be live for all CourseCreator360 sub-accounts! 🚀

