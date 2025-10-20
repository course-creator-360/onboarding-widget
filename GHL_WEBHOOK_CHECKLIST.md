# GHL Marketplace Webhook Configuration Checklist

## Your Current Setup
- ✅ Server is running
- ✅ Ngrok tunnel is active: `https://4d5c7af776ef.ngrok-free.app`
- ✅ Webhook endpoint is responding: `/api/webhooks/ghl`
- ✅ Logging is enabled and working
- ❌ GHL is not sending webhooks

## GHL Marketplace Configuration (Check These)

### 1. Webhook URL
```
https://4d5c7af776ef.ngrok-free.app/api/webhooks/ghl
```
- [ ] URL is correct (no typos)
- [ ] URL ends with `/api/webhooks/ghl` (not just `/webhooks/ghl`)
- [ ] Using HTTPS (not HTTP)
- [ ] URL is saved in GHL Marketplace

### 2. Webhook Events Subscribed

In GHL Marketplace → Your App → Webhooks tab:

Required events:
- [ ] ✅ **Product Create** (or "products.created")
- [ ] ✅ **Product Update** (or "products.updated")
- [ ] ✅ **Order Create** (or "orders.created")
- [ ] ✅ **External Auth Connected**

**IMPORTANT:** Click **Save** after checking these boxes!

### 3. App Status
- [ ] App is **Published** (not Draft)
- [ ] App has been approved by GHL (if required)

### 4. Webhook Scope
- [ ] Webhooks are enabled at **Agency Level** (preferred)
- [ ] OR enabled at **Location Level**

### 5. Test in GHL Marketplace
- [ ] Look for "Test Webhook" button
- [ ] Click it and check if webhook arrives in logs

## Testing Steps

### Step 1: Monitor Logs
In terminal, logs are already running. You should see webhook activity in real-time.

### Step 2: Create a Product in GHL
1. Go to your GHL sub-account
2. Navigate to Products/Courses section
3. Create a new product
4. Watch terminal for webhook log

### Step 3: Expected Output
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 WEBHOOK RECEIVED
Event Type: ProductCreate (or similar)
Location ID: [your-location-id]
Payload Keys: [...]
Full Payload: {
  "event": "ProductCreate",
  "locationId": "...",
  "data": { ... }
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Matched: Product Create/Update webhook → Setting courseCreated = true
📡 Broadcasting update via SSE to locationId: ...
✓ Webhook processed successfully
```

## If Still Not Working

### Check GHL Webhook Event Names

GHL might use different event names. Check your marketplace docs:
- `ProductCreate` vs `products.created` vs `product.create`
- `ProductUpdate` vs `products.updated` vs `product.update`

If GHL uses different names, we can update the regex pattern in `src/webhooks.ts`:

Current pattern (line 58):
```typescript
if (/Product(Create|Update)/i.test(eventType)) {
```

Can be changed to match different formats:
```typescript
if (/Product(Create|Update)|products\.(created|updated)|product\.(create|update)/i.test(eventType)) {
```

### Check GHL Webhook Documentation

1. Go to GHL Marketplace → Your App → Documentation
2. Look for "Webhook Events" section
3. Find the exact event name for product creation
4. Share it here so we can update the code

### Alternative: Use GHL's Test Webhook Feature

Many marketplace apps have a "Send Test Webhook" button:
1. Go to GHL Marketplace → Your App → Webhooks
2. Look for "Test" or "Send Test Webhook" button
3. Click it for "Product Create" event
4. Check if webhook arrives in logs

### Check GHL Webhook Delivery Logs

Some marketplace apps show webhook delivery attempts:
1. Go to GHL Marketplace → Your App → Webhooks
2. Look for "Delivery History" or "Webhook Logs"
3. Check if there are failed delivery attempts
4. Look for error messages

## Common Issues

### Issue: "Connection Refused"
- **Cause:** Ngrok tunnel is down
- **Fix:** Restart ngrok and update URL in GHL

### Issue: "404 Not Found"
- **Cause:** Wrong URL path
- **Fix:** Ensure URL ends with `/api/webhooks/ghl`

### Issue: "403 Forbidden"
- **Cause:** Ngrok requires authentication
- **Fix:** Remove ngrok auth requirement or upgrade ngrok plan

### Issue: "Webhooks not enabled"
- **Cause:** App in Draft mode
- **Fix:** Publish app in GHL Marketplace

### Issue: "No events subscribed"
- **Cause:** Webhook events not checked
- **Fix:** Check "Product Create" box and **Save**

## Manual Test (Verify Server is Working)

If GHL webhooks aren't working, verify your server is responding:

```bash
curl -X POST https://4d5c7af776ef.ngrok-free.app/api/webhooks/ghl \
  -H "Content-Type: application/json" \
  -d '{
    "event": "ProductCreate",
    "locationId": "YOUR_ACTUAL_LOCATION_ID",
    "data": {
      "id": "test_prod_123",
      "name": "Test Course"
    }
  }'
```

Then check the onboarding status:
```bash
sqlite3 data/app.db "SELECT * FROM onboarding WHERE location_id = 'YOUR_ACTUAL_LOCATION_ID';"
```

Should show `course_created = 1`

## Need Help?

Share the following:
1. GHL Marketplace webhook settings (screenshot)
2. App status (Published/Draft)
3. Event names available in GHL webhook configuration
4. Any error messages in GHL webhook delivery logs
5. Output when you create a product (from terminal logs)




