#!/bin/bash

# Build script for Vercel deployment
# This script runs database migrations before building the application

set -e

echo "🚀 Starting build process..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations (only if DATABASE_URL is available)
if [ -n "$DATABASE_URL" ] && [ "$NODE_ENV" = "production" ]; then
  echo "🗄️ Running database migrations..."
  npx prisma migrate deploy || {
    echo "⚠️ Migration failed - continuing with build"
    echo "⚠️ Run migrations manually via /api/migrate endpoint after deployment"
  }
else
  echo "🗄️ Skipping migrations (DATABASE_URL not available or not in production)"
  echo "ℹ️ Run migrations manually via /api/migrate endpoint after deployment"
fi

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Build completed successfully!"