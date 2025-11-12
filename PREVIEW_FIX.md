# Preview Widget Fix

## The Problem

The preview widget was showing "Setup Required" because:

1. **Missing `data-location` reading** - The `preview.html` was setting `data-location` attribute on the script tag, but `widget.js` wasn't reading it
2. **Agency OAuth required** - The widget checks for agency OAuth authorization in the database before showing the onboarding checklist

## The Solution

### 1. Fixed `data-location` Attribute Reading ✅

Updated `widget.js` to read the `data-location` attribute from the script tag:

```javascript
// Before: Location ID was only auto-detected
let locationId = null;

// After: Location ID can be provided via attribute OR auto-detected
let locationId = currentScript?.getAttribute('data-location') || null;
```

This allows the preview to explicitly pass a location ID instead of relying on auto-detection.

### 2. Priority Logic ✅

The widget now follows this priority:

1. **First:** Check for `data-location` attribute (for preview/testing)
2. **Second:** Try to auto-detect from GHL UserContext (for production)
3. **Fallback:** Show error if no location ID found

## How to Use the Preview

### Step 1: Set Up Agency OAuth (One-Time)

The preview widget needs agency OAuth to be configured. This is a one-time setup:

1. **Check if OAuth is already set up:**
   ```bash
   node check-oauth.js
   ```

2. **If not set up, configure it:**
   - Start your server: `npm run dev`
   - Open http://localhost:4002
   - Click "🔑 Setup Agency OAuth"
   - Complete the OAuth flow in GoHighLevel
   - Wait for confirmation: "✓ Agency OAuth Connected"

### Step 2: Test the Preview

Once agency OAuth is configured, the preview should work automatically.

**From WidgetPreview Component (in your frontend):**

The `WidgetPreview.tsx` component already passes the locationId correctly:

```typescript
<iframe
  src={`${apiBase}/preview?locationId=${locationId}`}
  className="w-full border-0"
  style={{ height: 'calc(100% - 60px)' }}
  title="Widget Preview"
/>
```

**From preview.html directly:**

You can also test by opening the preview URL directly:
```
http://localhost:4002/preview?locationId=YOUR_LOCATION_ID
```

### Step 3: Verify It Works

Check the browser console. You should see:
```
[CC360 Widget] Location ID provided via data-location: YOUR_LOCATION_ID
[CC360 Widget] Initializing...
[CC360 Widget] Using location ID from data-location attribute: YOUR_LOCATION_ID
[Installation Check] Has agency: true
[CC360 Widget] ✅ Checklist initialized successfully
```

## Troubleshooting

### Still showing "Setup Required"?

1. **Check OAuth status:**
   ```bash
   node check-oauth.js
   ```
   
2. **Look for these console logs:**
   - ❌ `[Installation Check] Has agency: false` = OAuth not set up
   - ✅ `[Installation Check] Has agency: true` = OAuth is configured

3. **Check browser console errors:**
   - Look for API errors (401, 403, etc.)
   - Check if locationId is being passed correctly

### Database Issues?

If the database isn't accessible:
```bash
# Make sure database is running
docker-compose up -d postgres

# Run migrations
npm run db:push

# Try checking OAuth again
node check-oauth.js
```

## Testing in Different Environments

### Local Development (with agency OAuth)
```
http://localhost:4002/preview?locationId=YOUR_LOCATION_ID
```

### Production (Vercel)
```
https://your-app.vercel.app/preview?locationId=YOUR_LOCATION_ID
```

### Embedded in React Component
```tsx
<WidgetPreview 
  locationId={selectedLocationId}
  enabled={isPreviewEnabled}
/>
```

## Technical Details

### Changes Made to widget.js

1. **Read data-location attribute on initialization** (line 10)
2. **Log when data-location is provided** (lines 12-14)
3. **Skip auto-detection if locationId already set** (lines 2398-2408)

### How Authorization Works

```
Widget loads with locationId
    ↓
Check /api/installation/check?locationId=XXX
    ↓
hasAgencyAuthorization() checks database
    ↓
If agency OAuth exists: ✅ Show widget
If no OAuth: ❌ Show "Setup Required"
```

### Database Schema

Agency OAuth is stored in the `installation` table:
```sql
SELECT * FROM installation WHERE "tokenType" = 'agency';
```

This shows:
- `accessToken` - The OAuth access token
- `refreshToken` - For token refresh
- `accountId` - The agency/company ID
- `expiresAt` - Token expiration

## Quick Reference

| Scenario | Location ID Source | Requires OAuth |
|----------|-------------------|----------------|
| Preview iframe | `data-location` attribute | ✅ Yes |
| Demo page | Auto-detect from URL | ✅ Yes |
| Production (GHL) | Auto-detect from context | ✅ Yes |
| Testing | URL param or attribute | ✅ Yes |

## Summary

The preview widget now works correctly by:
1. ✅ Reading the `data-location` attribute from the script tag
2. ✅ Using that location ID instead of trying to auto-detect
3. ✅ Checking for agency OAuth authorization in the database
4. ✅ Showing the onboarding checklist if authorized

**You just need to make sure agency OAuth is set up once, then all previews will work!**

