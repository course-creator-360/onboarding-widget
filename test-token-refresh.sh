#!/bin/bash

# Test Token Refresh Mechanism
# This script simulates an expired token and tests if it gets refreshed automatically

echo "🧪 Testing Token Refresh Mechanism"
echo "===================================="
echo ""

# Step 1: Show current token status
echo "📊 Step 1: Current Token Status"
echo "--------------------------------"
sqlite3 data/app.db "SELECT 
  token_type,
  datetime(expires_at/1000, 'unixepoch') as expires_at,
  datetime('now') as current_time,
  (expires_at/1000 - strftime('%s', 'now')) / 60 as minutes_until_expiry
FROM installations WHERE token_type = 'agency';"
echo ""

# Step 2: Backup current expiration
echo "💾 Step 2: Backing up current token expiration..."
ORIGINAL_EXPIRY=$(sqlite3 data/app.db "SELECT expires_at FROM installations WHERE token_type = 'agency';")
echo "Original expiry timestamp: $ORIGINAL_EXPIRY"
echo ""

# Step 3: Simulate expired token (set to expire in 1 minute)
echo "⏰ Step 3: Simulating expired token (expires in 1 minute)..."
sqlite3 data/app.db "UPDATE installations SET expires_at = strftime('%s', 'now') * 1000 + 60000 WHERE token_type = 'agency';"
echo "Token now expires at:"
sqlite3 data/app.db "SELECT datetime(expires_at/1000, 'unixepoch') FROM installations WHERE token_type = 'agency';"
echo ""

# Step 4: Trigger API call that will cause refresh
echo "🔄 Step 4: Triggering API call (should trigger refresh)..."
echo "Making API request..."
curl -s "http://localhost:4002/api/status?locationId=L851uHvru1ipOe8DIwNS" > /dev/null
echo "Request completed"
echo ""

# Step 5: Wait a moment for refresh to complete
echo "⏳ Waiting 2 seconds for refresh to complete..."
sleep 2
echo ""

# Step 6: Check if token was refreshed
echo "✅ Step 6: Checking if token was refreshed..."
echo "New token expiry:"
NEW_EXPIRY=$(sqlite3 data/app.db "SELECT expires_at FROM installations WHERE token_type = 'agency';")
sqlite3 data/app.db "SELECT 
  datetime(expires_at/1000, 'unixepoch') as new_expires_at,
  (expires_at/1000 - strftime('%s', 'now')) / 3600 as hours_until_expiry
FROM installations WHERE token_type = 'agency';"
echo ""

# Step 7: Check logs for refresh activity
echo "📋 Step 7: Recent logs (checking for refresh messages)..."
echo "--------------------------------"
docker-compose logs --tail=30 | grep -E "token|Token|refresh|Refresh" || echo "No refresh logs found (token might still be valid)"
echo ""

# Step 8: Results
echo "📊 Results"
echo "==========" 
if [ "$NEW_EXPIRY" != "$ORIGINAL_EXPIRY" ]; then
    echo "✅ SUCCESS: Token was refreshed!"
    echo "   Old expiry: $(date -r $(($ORIGINAL_EXPIRY / 1000)) 2>/dev/null || echo $ORIGINAL_EXPIRY)"
    echo "   New expiry: $(date -r $(($NEW_EXPIRY / 1000)) 2>/dev/null || echo $NEW_EXPIRY)"
else
    echo "⚠️  Token was NOT refreshed"
    echo "   This is normal if:"
    echo "   - Token is still valid (> 5 minutes until expiry)"
    echo "   - Refresh token is missing"
    echo "   - GHL_CLIENT_SECRET not configured"
    echo ""
    echo "   Current token status:"
    sqlite3 data/app.db "SELECT 
      CASE 
        WHEN expires_at/1000 - strftime('%s', 'now') > 300 THEN 'Valid (> 5 minutes remaining)'
        WHEN expires_at/1000 - strftime('%s', 'now') > 0 THEN 'Expiring soon (< 5 minutes)'
        ELSE 'Expired'
      END as status
    FROM installations WHERE token_type = 'agency';"
fi
echo ""

echo "🧪 Test Complete!"



