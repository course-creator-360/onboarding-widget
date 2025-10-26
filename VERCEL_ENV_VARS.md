# Vercel Environment Variables

Copy these exact values to **Vercel Dashboard → Your Project → Settings → Environment Variables**

## Required - Database

If using Vercel Postgres, these are auto-injected:
- ✅ `DATABASE_URL` - Auto-set by Vercel
- ✅ `POSTGRES_URL` - Auto-set by Vercel

If using external database:
```
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public
POSTGRES_URL=postgresql://user:password@host:5432/dbname?schema=public
```

## Required - GoHighLevel OAuth

```
GHL_CLIENT_ID=<your-ghl-client-id>
GHL_CLIENT_SECRET=<your-ghl-client-secret>
```

## Optional - Userpilot Analytics

### Server-Side Tracking (Webhook Events)
```
USERPILOT_API_KEY=f2172e9d092cc32d
USERPILOT_API_BASE=https://analytex.userpilot.io
```

### Client-Side Tracking (Widget SDK)
```
USERPILOT_TOKEN=NX-921ac7b7
```

## Testing Locally

For local development, these are already set in your `.env` file:
- ✅ USERPILOT_API_KEY=f2172e9d092cc32d
- ✅ USERPILOT_TOKEN=NX-921ac7b7
- ✅ USERPILOT_API_BASE=https://analytex.userpilot.io

## Test the Integration

1. **Local Test Page:**
   - Visit: http://localhost:4002/test-userpilot.html
   - Enter a test location ID
   - Click "Run All Tests"
   - All tests should pass ✅

2. **Check Config Endpoint:**
   ```bash
   curl http://localhost:4002/api/config | jq .userpilotToken
   # Should return: "NX-921ac7b7"
   ```

3. **After Vercel Deployment:**
   - Check browser console when widget loads
   - Look for: `[Userpilot] ✅ User identified successfully`

## Deployment Checklist

- [ ] Add USERPILOT_API_KEY to Vercel
- [ ] Add USERPILOT_TOKEN to Vercel
- [ ] Add USERPILOT_API_BASE to Vercel
- [ ] Deploy changes (git push)
- [ ] Test widget in GHL dashboard
- [ ] Check Userpilot dashboard for identified users

