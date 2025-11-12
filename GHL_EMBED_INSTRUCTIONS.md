# How to Embed the Widget in GoHighLevel

## ✅ Fixed: Auto-Detection of API URL

The widget now **automatically detects** the API base URL from where `widget.js` is loaded. This means:

- ✅ If you load from `https://your-app.vercel.app/widget.js`, it automatically uses that as the API
- ✅ No need to manually set `data-api` attribute (but you still can for override)
- ✅ Works seamlessly in production

## Prerequisites

Before embedding in GHL, you MUST:

1. ✅ **Set up Agency OAuth** (one-time)
   - Go to your dashboard: `https://your-app.vercel.app`
   - Click "🔑 Setup Agency OAuth"
   - Complete the OAuth flow
   - Verify it shows "✓ Agency OAuth Connected"

2. ✅ **Deploy to production** (Vercel, etc.)
   - Your widget must be accessible via HTTPS
   - Example: `https://your-app.vercel.app/widget.js`

## Embed Code for GHL

### Option 1: Simple Embed (Recommended) ✨ NEW

The widget now auto-detects everything! Just load it from your production URL:

```html
<script>
(function() {
  'use strict';
  
  // Load widget script from your production URL
  const script = document.createElement('script');
  script.src = 'https://your-app.vercel.app/widget.js';
  document.body.appendChild(script);
  
  console.log('[CC360] Widget loading...');
})();
</script>
```

**What it does:**
- ✅ Auto-detects locationId from GHL context
- ✅ Auto-detects API base from script URL
- ✅ No manual configuration needed!

### Option 2: With Manual Location ID

If you want to explicitly set the location:

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
  script.src = 'https://your-app.vercel.app/widget.js';
  script.setAttribute('data-location', locationId);
  
  document.body.appendChild(script);
})();
</script>
```

### Option 3: Override API URL (Advanced)

If you need to override the API URL (e.g., for testing):

```html
<script>
(function() {
  'use strict';
  
  const script = document.createElement('script');
  script.src = 'https://your-app.vercel.app/widget.js';
  script.setAttribute('data-api', 'https://custom-api-url.com');
  
  document.body.appendChild(script);
})();
</script>
```

## Where to Add in GHL

### Method 1: Custom Values (Recommended)

1. Go to **Agency Settings → Custom Values**
2. Click **"Add Custom Value"**
3. Select **"JavaScript"** type
4. Name it: `CC360 Onboarding Widget`
5. Paste the embed code (Option 1 above)
6. Set visibility to **"All Sub-Accounts"**
7. Save

### Method 2: Site Builder (Per-Location)

1. Go to **Location → Sites**
2. Edit your site
3. Add a **Custom Code** element
4. Paste the embed code
5. Publish

## Troubleshooting

### Widget shows "Setup Required"

**Check 1: Is Agency OAuth set up?**
```bash
# On your server, run:
node check-oauth.js
```

If it says "NO AGENCY OAUTH FOUND":
- Go to `https://your-app.vercel.app`
- Click "🔑 Setup Agency OAuth"
- Complete the flow

**Check 2: Is the API URL correct?**

Open browser console in GHL and look for:
```
[CC360 Widget] API Base URL: https://your-app.vercel.app
```

If it shows `http://localhost:4002` or wrong URL:
- The widget is not loading from your production URL
- Check the `script.src` in your embed code

**Check 3: Can the widget reach your API?**

Check browser console for errors:
- ❌ `Failed to fetch` = CORS or network issue
- ❌ `401` or `403` = Authentication issue (shouldn't happen with agency OAuth)
- ✅ `[Installation Check] Has agency: true` = Working correctly!

### CORS Errors

If you see CORS errors in the console:

1. **Check your CORS config** in `src/app.ts`
2. **Ensure credentials are allowed:**
   ```typescript
   credentials: true,
   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
   ```

3. **Verify your Vercel environment variables:**
   - `DATABASE_URL` is set
   - `GHL_CLIENT_ID` is set
   - `GHL_CLIENT_SECRET` is set

### Widget not loading at all

**Check the script URL:**
```javascript
// In browser console in GHL:
document.querySelector('script[src*="widget.js"]')?.src
```

Should show: `https://your-app.vercel.app/widget.js`

If null, the script isn't loading. Check your Custom Value code.

### Database connection issues

If you deployed to Vercel but forgot to set up the database:

1. **Set DATABASE_URL** in Vercel environment variables
2. **Run migrations:**
   ```bash
   curl -X POST https://your-app.vercel.app/api/migrate \
     -H "x-vercel-migrate-secret: your-secret"
   ```
3. **Set up OAuth again** if needed

## Testing Checklist

Before deploying to all locations, test with one location:

- [ ] Widget loads in GHL dashboard
- [ ] No console errors
- [ ] Console shows: `[CC360 Widget] API Base URL: https://your-app.vercel.app`
- [ ] Console shows: `[Installation Check] Has agency: true`
- [ ] Widget shows onboarding checklist (not "Setup Required")
- [ ] Checklist items are accurate
- [ ] Clicking items opens correct GHL pages
- [ ] Progress updates in real-time

## How It Works

```
User opens GHL dashboard
    ↓
Custom JS loads widget.js from your server
    ↓
Widget detects API base from script URL
    ↓
Widget auto-detects locationId from GHL context
    ↓
Widget calls: https://your-app.vercel.app/api/installation/check?locationId=xxx
    ↓
API checks: "Does agency have OAuth token?" (hasAgencyAuthorization)
    ↓
If YES: ✅ Widget shows with checklist
If NO: ❌ Widget shows "Setup Required"
```

## Key Changes (v2)

### What's New in This Version

1. **Auto-detection of API base URL** ✨
   - Widget reads the origin from its own script URL
   - No need to manually set `data-api` anymore
   - Simpler embed code

2. **Improved error messages**
   - Clear console logs for debugging
   - Shows API base URL on initialization
   - Better error descriptions

3. **Production-ready defaults**
   - No more `localhost:4002` in production
   - Works out of the box when deployed

### Migration from v1

If you're using the old embed code:

**Old (still works):**
```html
<script>
  const script = document.createElement('script');
  script.src = 'https://your-app.vercel.app/widget.js';
  script.setAttribute('data-api', 'https://your-app.vercel.app'); // ← Not needed anymore!
  document.body.appendChild(script);
</script>
```

**New (simpler):**
```html
<script>
  const script = document.createElement('script');
  script.src = 'https://your-app.vercel.app/widget.js';
  document.body.appendChild(script);
</script>
```

## Support

If you're still having issues:

1. Check browser console for error messages
2. Run `node check-oauth.js` on your server
3. Verify all Vercel environment variables are set
4. Check that your database is accessible from Vercel

The widget should work automatically once agency OAuth is set up! 🎉

