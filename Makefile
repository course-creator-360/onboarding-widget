.PHONY: help setup start stop restart logs clean build test status agency-setup migrate start-backend start-frontend

# Default target
help:
	@echo "CC360 Onboarding Widget - Available Commands:"
	@echo ""
	@echo "  make setup          - Initial setup (copy env template)"
	@echo "  make start          - Start backend & frontend servers"
	@echo "  make start-backend  - Start backend only (Docker)"
	@echo "  make start-frontend - Start frontend only"
	@echo "  make stop           - Stop all servers"
	@echo "  make restart        - Restart the server"
	@echo "  make logs           - View server logs"
	@echo "  make migrate        - Run database migrations"
	@echo "  make clean          - Clean database and containers"
	@echo "  make build          - Rebuild containers"
	@echo "  make test           - Test API endpoints"
	@echo "  make status         - Check server status"
	@echo "  make agency-setup   - Open agency OAuth setup page"
	@echo "  make open           - Open demo page in browser"
	@echo ""

# Initial setup
setup:
	@echo "Setting up environment..."
	@if [ ! -f .env ]; then \
		cp env.template .env; \
		echo "✓ Created .env file from template"; \
		echo "⚠ Please edit .env and add your GHL credentials"; \
	fi
	@mkdir -p data
	@echo "✓ Created data directory"
	@echo ""
	@echo "Next steps:"
	@echo "1. Edit .env file with your GHL OAuth credentials"
	@echo "2. Run 'make start' to start the server"

# Start server (backend + frontend)
start:
	@echo "Starting backend and frontend servers..."
	@if [ ! -f "frontend/.env.local" ]; then \
		echo "NEXT_PUBLIC_API_BASE=http://localhost:4002" > frontend/.env.local; \
		echo "✓ Created frontend/.env.local"; \
	fi
	docker-compose up -d
	@echo ""
	@echo "✓ Servers starting:"
	@echo "  - Backend:  http://localhost:4002"
	@echo "  - Frontend: http://localhost:3000"
	@echo ""
	@echo "Run 'make logs' to view logs"
	@echo "Open http://localhost:3000 to access the dashboard"

# Start backend only (Docker)
start-backend:
	@echo "Starting backend server..."
	docker-compose up -d
	@echo ""
	@echo "✓ Backend starting at http://localhost:4002"
	@echo ""
	@echo "Run 'make logs' to view server output"

# Start frontend only
start-frontend:
	@echo "Starting frontend server..."
	cd frontend && npm run dev

# Stop all servers
stop:
	@echo "Stopping all servers..."
	docker-compose down
	@-pkill -f "next dev" 2>/dev/null || true
	@echo "✓ All servers stopped"

# Restart server
restart:
	@echo "Restarting server..."
	docker-compose restart
	@echo "✓ Server restarted"
	@echo ""
	@echo "Run 'make logs' to view output"

# View logs
logs:
	@echo "Viewing logs (Ctrl+C to exit)..."
	@echo "Use 'docker-compose logs -f widget' for backend only"
	@echo "Use 'docker-compose logs -f frontend' for frontend only"
	@echo ""
	docker-compose logs -f

# Run database migrations
migrate:
	@echo "Running database migrations..."
	docker compose exec widget npx prisma migrate dev --name add_user_authentication
	@echo "✓ Migration complete"

# Reset database and run migrations
migrate-reset:
	@echo "⚠ Resetting database (all data will be lost)..."
	docker compose exec -T widget npx prisma migrate reset --force
	@echo "✓ Database reset and migrations complete"

# Clean everything (database + containers)
clean:
	@echo "⚠ This will delete the database and all containers"
	@read -p "Continue? [y/N]: " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker-compose down -v; \
		rm -rf data/*.db data/*.db-*; \
		echo "✓ Cleaned database and containers"; \
	else \
		echo "Cancelled"; \
	fi

# Rebuild containers
build:
	@echo "Rebuilding all containers..."
	docker-compose build --no-cache
	@echo "✓ Build complete"
	@echo ""
	@echo "Run 'make start' to start the servers"

# Test API endpoints
test:
	@echo "Testing API endpoints..."
	@echo ""
	@echo "Health Check:"
	@curl -s http://localhost:4002/api/healthz | jq . || echo "Server not running"
	@echo ""
	@echo "Agency Status:"
	@curl -s http://localhost:4002/api/agency/status | jq . || echo "Error checking status"
	@echo ""
	@echo "Installation Check:"
	@curl -s "http://localhost:4002/api/installation/check?locationId=kgREXsjAvhag6Qn8Yjqn" | jq . || echo "Error"
	@echo ""

# Check server status
status:
	@echo "Server Status:"
	@docker-compose ps
	@echo ""
	@echo "Health Check:"
	@curl -s http://localhost:4002/api/healthz 2>/dev/null && echo " ✓ Server is running" || echo " ✗ Server is not responding"

# Open agency setup page
agency-setup:
	@echo "Opening agency OAuth setup..."
	@open http://localhost:4002 2>/dev/null || xdg-open http://localhost:4002 2>/dev/null || echo "Please open http://localhost:4002 in your browser"

# Open demo page
open:
	@echo "Opening demo page..."
	@open http://localhost:4002 2>/dev/null || xdg-open http://localhost:4002 2>/dev/null || echo "Please open http://localhost:4002 in your browser"

# Quick development workflow
dev: setup start
	@echo ""
	@echo "Development server is running!"
	@echo "Demo page: http://localhost:4002"
	@sleep 3
	@make open

