#!/bin/bash

echo "🚀 Starting CC360 Onboarding Widget..."
echo ""

# Check if frontend/.env.local exists
if [ ! -f "frontend/.env.local" ]; then
    echo "⚠️  Creating frontend/.env.local..."
    echo "NEXT_PUBLIC_API_BASE=http://localhost:4002" > frontend/.env.local
    echo "✓ Created frontend/.env.local"
    echo ""
fi

# Check if JWT_SECRET exists in .env
if ! grep -q "JWT_SECRET" .env 2>/dev/null; then
    echo "⚠️  JWT_SECRET not found in .env"
    echo "   Generating JWT secret..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    echo "" >> .env
    echo "JWT_SECRET=$JWT_SECRET" >> .env
    echo "✓ Added JWT_SECRET to .env"
    echo ""
fi

# Start backend with Docker
echo "🔧 Starting backend (Docker)..."
docker-compose up -d
echo ""

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 3

# Start frontend in background
echo "🎨 Starting frontend (Next.js)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

sleep 2
echo ""
echo "✅ Servers running:"
echo "   Backend:  http://localhost:4002"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📝 Open http://localhost:3000 to get started"
echo ""
echo "To stop:"
echo "   make stop"
echo ""


