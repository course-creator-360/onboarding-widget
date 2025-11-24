.PHONY: help setup start stop restart logs clean build test status agency-setup setup-staging

# Default target
help:
	@echo "CC360 Onboarding Widget - Available Commands:"
	@echo ""
	@echo "  make setup          - Initial setup (copy env template)"
	@echo "  make setup-staging  - Setup staging environment"
	@echo "  make start          - Start the development server"
	@echo "  make stop           - Stop the server"
	@echo "  make restart        - Restart the server"
	@echo "  make logs           - View server logs"
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

# Start server
start:
	@echo "Starting development server..."
	docker-compose up -d
	@echo ""
	@echo "✓ Server starting at http://localhost:4002"
	@echo ""
	@echo "Run 'make logs' to view server output"
	@echo "Run 'make open' to open demo page"

# Stop server
stop:
	@echo "Stopping server..."
	docker-compose down
	@echo "✓ Server stopped"

# Restart server
restart:
	@echo "Restarting server..."
	docker-compose restart
	@echo "✓ Server restarted"
	@echo ""
	@echo "Run 'make logs' to view output"

# View logs
logs:
	docker-compose logs -f

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
	@echo "Rebuilding containers..."
	docker-compose build --no-cache
	@echo "✓ Build complete"

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

# Setup staging environment
setup-staging:
	@echo "Setting up staging environment..."
	@if [ ! -f .env.staging ]; then \
		cp env.staging.template .env.staging; \
		echo "✓ Created .env.staging file from template"; \
		echo "⚠ Please edit .env.staging and add your staging credentials"; \
	fi
	@echo ""
	@echo "Next steps:"
	@echo "1. Edit .env.staging file with your staging GHL OAuth credentials"
	@echo "2. Configure staging database URL"
	@echo "3. Set up staging environment variables in Vercel"
	@echo "4. See STAGING.md for detailed setup instructions"

# Quick development workflow
dev: setup start
	@echo ""
	@echo "Development server is running!"
	@echo "Demo page: http://localhost:4002"
	@sleep 3
	@make open

