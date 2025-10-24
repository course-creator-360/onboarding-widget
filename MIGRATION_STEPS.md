# Fix Migration Issue - Step by Step

## Current Error:
```
The table `public.installations` does not exist in the current database.
```

## Root Cause:
Database is connected but tables haven't been created yet.

## Solution:

### Step 1: Check Environment Variables in Vercel

Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

**Make sure these are set:**
- ✅ `DATABASE_URL` or `POSTGRES_PRISMA_URL` (auto-set by Vercel Postgres)
- ✅ `POSTGRES_URL` (auto-set by Vercel Postgres)
- ✅ `GHL_CLIENT_ID`
- ✅ `GHL_CLIENT_SECRET`
- ✅ `SKIP_BUILD_MIGRATIONS` = `true`
- ✅ `VERCEL_MIGRATE_SECRET` = (a random secret string)

**If VERCEL_MIGRATE_SECRET is not set:**

1. Generate a secret (run this locally):
   ```bash
   openssl rand -base64 32
   ```

2. Add it to Vercel:
   - Go to Settings → Environment Variables
   - Name: `VERCEL_MIGRATE_SECRET`
   - Value: `<paste the generated string>`
   - Apply to: All environments
   - Click Save

3. **Important:** After adding env vars, redeploy:
   - Go to Deployments → Latest → Click "..." → Redeploy

### Step 2: Push Code Changes

```bash
git add -A
git commit -m "fix: OAuth state management + cookie-parser"
git push
```

Wait for Vercel deployment to complete (~1-2 minutes).

### Step 3: Run Migrations

Run this command (replace YOUR_SECRET with the actual value):

```bash
curl -X POST https://onboarding-widget-beryl.vercel.app/api/migrate \
  -H "x-vercel-migrate-secret: YOUR_SECRET"
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Database migrations completed successfully"
}
```

**If you get an error:**
- Check that `VERCEL_MIGRATE_SECRET` matches exactly
- Check Vercel function logs for detailed error messages
- Ensure `POSTGRES_URL` is set (not just DATABASE_URL)

### Step 4: Verify Tables Were Created

Test the app:
1. Visit: https://onboarding-widget-beryl.vercel.app
2. Try the OAuth flow
3. Should work without the "table does not exist" error

### Step 5: Check Vercel Logs

If still having issues:
1. Go to Vercel Dashboard → Your Project
2. Click "Deployments" → Latest deployment
3. Click "Functions" tab
4. Click on `api/index.ts` or `api/migrate.ts`
5. View runtime logs to see detailed errors

## Summary

The migration endpoint (`/api/migrate`) will:
1. Connect to your Postgres database
2. Run all migration files in `prisma/migrations/`
3. Create tables: `installations`, `onboarding`, `event_log`
4. Return success or error message

This is a **one-time operation** after initial deployment. Future deployments with schema changes will need migrations run again.

