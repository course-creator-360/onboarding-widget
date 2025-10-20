# OAuth Token Refresh Mechanism

## Overview

Your app now has **automatic token refresh** built-in! When the OAuth access token expires, it will automatically refresh using the refresh token without requiring re-authorization.

## How It Works

### 1. Token Storage

Tokens are stored in the database with:
- **access_token**: Used for API calls (expires in ~24 hours)
- **refresh_token**: Used to get a new access token (long-lived)
- **expires_at**: Timestamp when access token expires

```bash
# Check your current token status
sqlite3 data/app.db "SELECT token_type, datetime(expires_at/1000, 'unixepoch') as expires_at FROM installations;"
```

### 2. Automatic Refresh

The `getAuthToken()` function now:

1. **Checks expiration** - If token expires within 5 minutes
2. **Calls refresh** - Uses `refresh_token` to get new `access_token`
3. **Updates database** - Stores new tokens automatically
4. **Returns new token** - API calls use fresh token

### 3. Refresh Process

```
API Call Triggered
    ↓
getAuthToken() called
    ↓
Check: Is token expired? (or expires < 5 min)
    ↓
YES → Call GHL OAuth:
      POST /oauth/token
      {
        grant_type: "refresh_token",
        refresh_token: "...",
        client_id: "...",
        client_secret: "..."
      }
    ↓
Get new access_token + refresh_token
    ↓
Update database
    ↓
Return new token
    ↓
API call proceeds with fresh token
```

## Code Location

**File:** `src/ghl-api.ts`

### Key Functions:

1. **`getAuthToken(locationId)`** (Line 87)
   - Gets token for API calls
   - Automatically refreshes if expired

2. **`refreshAccessToken(installation)`** (Line 9)
   - Exchanges refresh_token for new access_token
   - Called automatically by getAuthToken

3. **`isTokenExpired(installation)`** (Line 70)
   - Checks if token is expired or expiring soon
   - 5-minute buffer for safety

## Token Expiration Timeline

```
Token Created: 2025-10-20 05:00:29
Expires At:    2025-10-21 05:00:29  (24 hours later)
Refresh At:    2025-10-21 04:55:29  (5 min buffer)
```

**5-Minute Buffer:** Token refreshes 5 minutes before expiration to prevent API calls with expired tokens.

## When Refresh Happens

The refresh is triggered automatically when:

✅ **Widget loads** and token is expired/expiring  
✅ **API status check** runs (domain, products, payments)  
✅ **Any API call** that needs authentication  

## Logs

When a refresh happens, you'll see:

```
[GHL API] Agency token expired, refreshing...
[GHL API] Refreshing access token for agency...
[GHL API] Token refreshed successfully for agency, expires at: 2025-10-22 05:00:29
```

## Check Token Status

### Current Token Expiration
```bash
sqlite3 data/app.db "SELECT 
  token_type,
  datetime(expires_at/1000, 'unixepoch') as expires_at,
  datetime('now') as current_time,
  CASE 
    WHEN expires_at/1000 - strftime('%s', 'now') < 300 THEN 'Expiring Soon (< 5 min)'
    WHEN expires_at/1000 - strftime('%s', 'now') < 3600 THEN 'Valid (< 1 hour)'
    ELSE 'Valid'
  END as status
FROM installations;"
```

### View Refresh Token
```bash
sqlite3 data/app.db "SELECT location_id, refresh_token IS NOT NULL as has_refresh FROM installations;"
```

## Testing Refresh Manually

To test the refresh mechanism without waiting for expiration:

### Option 1: Manually Expire Token in Database

```bash
# Set token to expire in 1 minute
sqlite3 data/app.db "UPDATE installations SET expires_at = strftime('%s', 'now') * 1000 + 60000 WHERE token_type = 'agency';"

# Trigger API call
curl "http://localhost:4002/api/status?locationId=L851uHvru1ipOe8DIwNS"

# Check logs for refresh
docker-compose logs --tail=20 | grep -i refresh
```

### Option 2: Check Logs During Normal Use

```bash
# Monitor logs in real-time
docker-compose logs -f | grep -E "token|Token|refresh|Refresh"
```

## Error Handling

If refresh fails, the system:

1. **Logs error** - Shows why refresh failed
2. **Falls back** - Tries location token if agency token fails
3. **Returns null** - API calls fail gracefully
4. **User sees** - Widget shows "Setup Required" if all tokens invalid

### Common Refresh Errors:

**"Missing client credentials"**
- Missing `GHL_CLIENT_ID` or `GHL_CLIENT_SECRET` in .env
- Fix: Add credentials to `.env` file

**"No refresh token available"**
- Refresh token was not stored during OAuth
- Fix: Re-authorize via `/api/oauth/agency/install`

**"Token refresh failed: 400"**
- Refresh token is invalid or revoked
- Fix: Re-authorize to get new tokens

**"Token refresh failed: 401"**
- Client credentials are incorrect
- Fix: Verify `GHL_CLIENT_ID` and `GHL_CLIENT_SECRET`

## Benefits

✅ **No re-authorization needed** - Users don't need to re-authorize when token expires  
✅ **Seamless experience** - Widget continues working without interruption  
✅ **Automatic** - No manual intervention required  
✅ **Safe** - 5-minute buffer prevents expired token usage  
✅ **Fallback** - If refresh fails, app logs error and tries alternatives  

## Environment Variables Required

Make sure these are set in your `.env`:

```bash
GHL_CLIENT_ID=your_client_id
GHL_CLIENT_SECRET=your_client_secret
```

**Without these, token refresh will fail!**

## Production Considerations

### 1. Concurrent Refresh Handling

If multiple API calls happen simultaneously with an expired token, they might all try to refresh. Consider:
- Adding a refresh lock/mutex
- Caching the refresh promise
- Currently: Last refresh wins (GHL returns same token anyway)

### 2. Refresh Token Rotation

Some OAuth providers rotate refresh tokens. The code handles this:
```typescript
refreshToken: tokenJson.refresh_token || installation.refreshToken
```
Keeps old refresh token if new one isn't provided.

### 3. Monitoring

Monitor token refresh success/failure:
- Check logs for refresh errors
- Alert if refresh consistently fails
- Track token expiration in monitoring

### 4. Security

✅ Refresh tokens are stored in database (not exposed to client)  
✅ Refresh happens server-side only  
✅ Client credentials required (not in client code)  

## Troubleshooting

### Widget stops working after 24 hours

**Cause:** Token expired and refresh failed  
**Check:**
```bash
# View recent errors
docker-compose logs --tail=50 | grep -i "refresh\|token"

# Check if refresh token exists
sqlite3 data/app.db "SELECT refresh_token IS NOT NULL FROM installations;"
```

**Fix:**
1. Check `.env` has `GHL_CLIENT_ID` and `GHL_CLIENT_SECRET`
2. Verify credentials are correct
3. Re-authorize if refresh token is missing

### "Cannot refresh token: No refresh token available"

**Cause:** OAuth flow didn't provide refresh token  
**Fix:** Re-authorize via `/api/oauth/agency/install`

### Token refreshes but API calls still fail

**Cause:** New token might not have same scopes  
**Check:**
```bash
sqlite3 data/app.db "SELECT scope FROM installations WHERE token_type = 'agency';"
```

**Fix:** Re-authorize with all required scopes

## Next Steps

✅ Token refresh is now **fully implemented and automatic**  
✅ Works for both **agency-level** and **location-level** tokens  
✅ **5-minute buffer** prevents expiration during API calls  
✅ **Comprehensive error handling** with fallbacks  

Your widget will now continue working indefinitely without requiring re-authorization! 🎉




