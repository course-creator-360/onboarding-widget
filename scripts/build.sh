#!/bin/bash

# Build script for Vercel deployment
# This script runs database migrations before building the application

set -e

echo "🚀 Starting build process..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations during deployment
if [ -n "$DATABASE_URL" ] || [ -n "$POSTGRES_PRISMA_URL" ]; then
  echo "🗄️ Running database migrations..."
  
  # Use locally installed prisma binary to avoid npm home directory issues
  ./node_modules/.bin/prisma migrate deploy 2>&1 || {
    echo "⚠️ Migration failed - continuing with build"
    echo "⚠️ You can run migrations manually via /api/migrate endpoint"
    # Don't fail the build on migration errors
  }
  
  echo "✅ Migrations completed"
else
  echo "⚠️ No DATABASE_URL found, skipping migrations"
  echo "ℹ️ Run migrations via /api/migrate endpoint after deployment"
fi

# Bundle widget modules
echo "📦 Bundling widget modules..."
npm run bundle-widget

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Build completed successfully!"