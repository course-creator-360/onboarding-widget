# Sub-Account Tracking

This document explains how the onboarding widget automatically tracks newly created sub-accounts under an agency.

## Overview

When an agency authorizes the app, all sub-accounts under that agency can use the widget without individual authorization. The system automatically tracks which sub-accounts are accessing the widget and maintains a record of their relationship to the agency.

## How It Works

### 1. Agency Authorization

When an agency completes OAuth authorization:
- The system stores the agency's access token with `tokenType: 'agency'`
- The `accountId` (companyId from GHL) is stored to identify the agency
- This token is used for all sub-accounts under the agency

### 2. Sub-Account Detection

When a sub-account first accesses the widget:

1. **Widget loads** in the sub-account's GHL dashboard
2. **Installation check** (`/api/installation/check?locationId=XXX`) is called
3. **Agency verification**: System checks if an agency authorization exists
4. **Location validation**: System validates the locationId via GHL SDK
5. **Automatic registration**: If valid, the sub-account is registered in the database

```typescript
// Example of what happens behind the scenes
{
  locationId: "loc_abc123",           // The sub-account location ID
  accountId: "agency_xyz789",         // The parent agency ID
  locationName: "Client Business",    // Sub-account name
  companyId: "comp_456",             // GHL company ID
  firstAccessedAt: 1706400000000,    // When first detected
  lastAccessedAt: 1706400000000,     // Last access time
  isActive: true,                    // Active status
  metadata: {                        // Additional details
    email: "client@business.com",
    phone: "+1234567890",
    website: "https://clientbusiness.com"
  }
}
```

### 3. Relationship Tracking

The system maintains a clear relationship between agencies and sub-accounts:

- Each sub-account is linked to its parent agency via `accountId`
- The system tracks when the sub-account was first accessed
- The system updates the last access time on each widget load
- Metadata stores additional context about the sub-account

## API Endpoints

### Get All Sub-Accounts for an Agency

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
    // ... more sub-accounts
  ]
}
```

### Get Specific Sub-Account Details

```bash
GET /api/sub-accounts/:locationId
```

**Response:**
```json
{
  "success": true,
  "subAccount": {
    "id": "cuid_abc123",
    "locationId": "loc_abc123",
    "accountId": "agency_xyz789",
    "locationName": "Client Business",
    "companyId": "comp_456",
    "firstAccessedAt": 1706400000000,
    "lastAccessedAt": 1706500000000,
    "isActive": true
  }
}
```

### Verify Sub-Account Agency Relationship

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

### Get Agency Statistics

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

### Deactivate a Sub-Account

```bash
POST /api/sub-accounts/:locationId/deactivate
```

**Response:**
```json
{
  "success": true,
  "message": "Sub-account deactivated successfully",
  "subAccount": { ... }
}
```

## Database Schema

### SubAccount Model

```prisma
model SubAccount {
  id              String   @id @default(cuid())
  locationId      String   @unique
  accountId       String   // Links to agency
  locationName    String?
  companyId       String?
  firstAccessedAt DateTime @default(now())
  lastAccessedAt  DateTime @updatedAt
  isActive        Boolean  @default(true)
  metadata        Json?

  @@index([accountId])
  @@index([companyId])
  @@index([firstAccessedAt])
  @@index([isActive])
}
```

## Use Cases

### 1. Agency Dashboard

Display all sub-accounts that have accessed the widget:

```javascript
// Fetch all sub-accounts for the agency
const response = await fetch(`/api/sub-accounts?accountId=${agencyId}`);
const { subAccounts, count } = await response.json();

// Display in UI
subAccounts.forEach(sub => {
  console.log(`${sub.locationName}: Last accessed ${new Date(sub.lastAccessedAt)}`);
});
```

### 2. New Sub-Account Detection

Monitor for newly created sub-accounts:

```javascript
// Get statistics
const response = await fetch(`/api/sub-accounts/stats/${agencyId}`);
const { stats } = await response.json();

console.log(`New sub-accounts this week: ${stats.lastWeek}`);
console.log(`New sub-accounts this month: ${stats.lastMonth}`);
```

### 3. Verify Sub-Account Belongs to Agency

Check if a location is properly tracked:

```javascript
const response = await fetch(`/api/sub-accounts/verify/${locationId}`);
const data = await response.json();

if (data.isUnderAgency) {
  console.log(`This location belongs to agency: ${data.agencyAccountId}`);
} else {
  console.log('This location is not tracked under any agency');
}
```

## Benefits

1. **Automatic Discovery**: No manual setup needed for sub-accounts
2. **Historical Tracking**: Know when each sub-account first accessed the widget
3. **Activity Monitoring**: Track last access time for each sub-account
4. **Analytics Ready**: Get insights into widget adoption across sub-accounts
5. **Relationship Clarity**: Always know which agency a sub-account belongs to

## Console Logging

When a new sub-account is detected, you'll see clear console logs:

```
[Installation Check] ✨ NEW SUB-ACCOUNT DETECTED ✨
[Installation Check] Location: Client Business (loc_abc123)
[Installation Check] Agency: agency_xyz789
[Installation Check] Company: comp_456
[Installation Check] This sub-account is now tracked under the agency
```

For existing sub-accounts:

```
[Installation Check] Existing sub-account updated: loc_abc123
[Installation Check] Last accessed updated for: Client Business
```

## Migration

To apply the sub-account tracking to your database:

```bash
# Run the migration
npm run db:migrate

# Or manually via Prisma
npx prisma migrate deploy
```

## Notes

- Sub-accounts are tracked automatically on their first widget access
- No manual intervention required from agency or sub-account users
- The system uses soft deletes (isActive flag) to preserve historical data
- All tracking happens server-side with no client-side configuration needed




