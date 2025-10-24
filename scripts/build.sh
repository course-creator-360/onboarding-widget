#!/bin/bash

# Build script for Vercel deployment
# This script runs database migrations before building the application

set -e

echo "🚀 Starting build process..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations (only if DATABASE_URL is available)
# Note: In serverless environments, we skip migrations during build
# and run them via the /api/migrate endpoint after deployment
if [ -n "$DATABASE_URL" ] && [ "$SKIP_BUILD_MIGRATIONS" != "true" ]; then
  echo "🗄️ Running database migrations..."
  # Use locally installed prisma binary to avoid npm home directory issues
  ./node_modules/.bin/prisma migrate deploy || {
    echo "⚠️ Migration failed - continuing with build"
    echo "⚠️ Run migrations manually via /api/migrate endpoint after deployment"
  }
else
  echo "🗄️ Skipping migrations during build"
  echo "ℹ️ Run migrations via /api/migrate endpoint after deployment"
fi

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Build completed successfully!"