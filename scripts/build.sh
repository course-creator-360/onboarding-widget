#!/bin/bash

# Build script for Vercel deployment
# This script runs database migrations before building the application

set -e

echo "🚀 Starting build process..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations (only in production)
if [ "$NODE_ENV" = "production" ]; then
  echo "🗄️ Running database migrations..."
  npx prisma migrate deploy
else
  echo "🗄️ Skipping migrations (not in production)"
fi

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Build completed successfully!"