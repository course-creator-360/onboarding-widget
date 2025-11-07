# Multi-User Authentication Setup Guide

This guide covers the setup for the new multi-user authentication system with Next.js dashboard.

## Architecture Overview

- **Backend**: Express server (handles OAuth, webhooks, SSE, GHL API)
- **Frontend**: Next.js App Router (handles UI and authentication)
- **Auth**: JWT tokens (stored in HTTP-only cookies)
- **Database**: PostgreSQL with Prisma ORM

## Initial Setup

### 1. Environment Configuration

#### Backend (.env)

Copy the template and fill in your values:

```bash
cp env.template .env
```

**Required variables:**
```env
# JWT Secret - Generate with:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-secure-random-string-here

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/onboarding?schema=public"

# GoHighLevel OAuth
GHL_CLIENT_ID=your_ghl_client_id
GHL_CLIENT_SECRET=your_ghl_client_secret
```

#### Frontend (.env.local)

Create frontend environment file:

```bash
cd frontend
cp .env.local.template .env.local
```

For local development:
```env
NEXT_PUBLIC_API_BASE=http://localhost:4002
```

For production (single deployment), leave empty to use relative paths.

### 2. Install Dependencies

#### Backend
```bash
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 3. Database Setup

#### Using Docker (Recommended)
```bash
make start  # Starts PostgreSQL and applies migrations
```

#### Manual Setup
```bash
# Start PostgreSQL
# Then run migrations
npx prisma migrate deploy
```

## Development

### Run Both Backend and Frontend

```bash
npm run dev
```

This starts:
- Express backend on http://localhost:4002
- Next.js frontend on http://localhost:3000

### Run Individually

Backend only:
```bash
npm run dev:backend
```

Frontend only:
```bash
npm run dev:frontend
```

## User Flow

### New User Registration

1. User visits app → Redirected to `/login`
2. Clicks "Register"
3. Fills in: username, email, password (min 8 chars)
4. Auto-logged in with JWT cookie
5. Redirected to `/dashboard`
6. Dashboard shows "Connect Your Agency" button
7. Clicks button → GHL OAuth flow
8. Returns to dashboard → Shows agency info and locations

### Returning User

1. User visits app → Redirected to `/login`
2. Enters credentials → Logs in
3. Redirected to `/dashboard`
4. If OAuth connected: Shows agency + locations
5. If not connected: Shows "Connect Agency" button

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Agency (Protected)
- `GET /api/agency/status` - Check OAuth status
- `GET /api/agency/locations` - Get agency locations

### OAuth
- `GET /api/oauth/agency/install` - Start OAuth flow
- `GET /api/oauth/callback` - OAuth callback

## Database Models

### User
- `id` - Unique user ID
- `username` - Unique username
- `email` - Unique email
- `passwordHash` - Bcrypt hashed password
- `createdAt` - Registration date
- `updatedAt` - Last updated

### Installation (Updated)
- `locationId` - GHL location ID
- `userId` - Link to User (required)
- `accountId` - GHL agency account ID
- `accessToken` - OAuth access token
- `refreshToken` - OAuth refresh token
- `expiresAt` - Token expiration
- `tokenType` - 'agency' or 'location'

## Security Features

### JWT Authentication
- HTTP-only cookies (XSS protection)
- Secure flag in production (HTTPS only)
- SameSite: 'lax' (CSRF protection)
- 30-day expiration
- 64+ character secret

### Password Security
- bcrypt hashing (10 rounds)
- Minimum 8 characters
- Server-side validation

### Authorization
- Protected routes require valid JWT
- Database queries filtered by userId
- No cross-user data access

## Deployment

### Vercel (Single Deployment)

1. Connect your repository to Vercel
2. Set environment variables:
   - `JWT_SECRET`
   - `DATABASE_URL`
   - `GHL_CLIENT_ID`
   - `GHL_CLIENT_SECRET`

3. Deploy:
```bash
vercel --prod
```

The `vercel.json` configuration routes:
- `/api/*` → Express backend
- Everything else → Next.js frontend

## Testing

### Manual Testing Checklist

**New User Flow:**
- [ ] Register with username, email, password
- [ ] Auto-login after registration
- [ ] Redirect to dashboard
- [ ] See "Connect Your Agency" button
- [ ] Click button → OAuth flow
- [ ] Return to dashboard
- [ ] See agency info and locations

**Returning User Flow:**
- [ ] Login with credentials
- [ ] Redirect to dashboard
- [ ] If OAuth exists: See locations
- [ ] If no OAuth: See Connect button

**Multi-User Isolation:**
- [ ] User A registers and connects Agency A
- [ ] User B registers and connects Agency B
- [ ] User A only sees Agency A data
- [ ] User B only sees Agency B data

**Security:**
- [ ] Access /dashboard without JWT → Redirect to login
- [ ] JWT expires → Redirect to login
- [ ] Logout → Clear JWT → Redirect to login
- [ ] OAuth without login → Error page

## Troubleshooting

### "User not found" on OAuth callback
- Ensure user is logged in before starting OAuth
- Check JWT cookie is being sent
- Verify JWT_SECRET matches in .env

### CORS errors
- Check NEXT_PUBLIC_API_BASE is set correctly
- Verify both servers are running
- Check Express CORS configuration

### Database connection failed
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Run migrations: `npx prisma migrate deploy`

### Widget not showing OAuth status
- Check user is logged in
- Verify /api/agency/status is protected
- Check JWT cookie is valid

## Development Tips

1. **Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

2. **Reset Database:**
```bash
make migrate-reset
```

3. **View Database:**
```bash
npm run db:studio
```

4. **Check Logs:**
```bash
make logs
```

5. **Restart Services:**
```bash
make restart
```

## Migration from Old System

The migration deleted all existing installations. Users must:
1. Register a new account
2. Re-authorize their GHL agency via OAuth

This ensures all installations are properly linked to user accounts.


