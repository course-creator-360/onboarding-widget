Onboarding Widget (GHL Marketplace)

## Overview

A persistent onboarding checklist widget for CourseCreator360 sub-accounts. Tracks 4 onboarding steps:
- ✓ Connect a domain
- ✓ Create a course
- ✓ Connect product to site/funnel  
- ✓ Connect payment processor

## Documentation

- **[WORKFLOW.md](WORKFLOW.md)** - Complete installation workflow and step-by-step guide
- **[SETUP.md](SETUP.md)** - Detailed setup instructions and troubleshooting
- **README.md** (this file) - Quick reference and API documentation

## Local Development

### Quick Start (Using Makefile)

```bash
# Initial setup
make setup

# Edit .env with your GHL credentials
nano .env

# Start the server
make start

# Open demo page
make open
```

### Common Commands

```bash
make start          # Start development server
make stop           # Stop the server
make restart        # Restart after changes
make logs           # View server logs
make status         # Check if server is running
make test           # Test API endpoints
make clean          # Clean database and containers
make agency-setup   # Open agency OAuth setup
make help           # Show all available commands
```

### Manual Setup (Without Makefile)

1. Copy `env.template` to `.env`
2. Add your GHL OAuth credentials (see SETUP.md)
3. Start with Docker Compose: `docker-compose up --build`
4. Open demo page: `http://localhost:4002`

## Quick Setup

### Agency-Level Authorization (Recommended)

1. Open `http://localhost:4002`
2. Click "🔑 Setup Agency OAuth"
3. Authorize the app once for all sub-accounts
4. Widget automatically works for all locations

### Widget Integration

The widget auto-loads in GHL dashboards via Custom Values or embedded script:

```html
<script>
  (function() {
    const match = window.location.pathname.match(/\/location\/([^\/]+)/);
    if (!match) return;
    
    const script = document.createElement('script');
    script.src = 'https://your-widget.com/widget.js';
    script.setAttribute('data-location', match[1]);
    script.setAttribute('data-api', 'https://your-api.com');
    document.body.appendChild(script);
  })();
</script>
```

For testing with a specific location:
```html
<script
  src="http://localhost:4002/widget.js"
  data-location="kgREXsjAvhag6Qn8Yjqn"
  data-api="http://localhost:4002"
></script>
```

## API Endpoints

**Onboarding:**
- `GET /api/status?locationId=...` - Get checklist status for a location
- `POST /api/dismiss` - Mark widget as dismissed
- `POST /api/mock/set` - Update flags for testing

**Authorization:**
- `GET /api/agency/status` - Check if agency is authorized
- `GET /api/installation/check?locationId=...` - Check auth status (agency or location)
- `GET /api/oauth/agency/install` - Agency-level OAuth setup
- `GET /api/oauth/callback` - OAuth callback handler
- `DELETE /api/installation?locationId=...` - Clear auth (testing only)

**Real-time:**
- `GET /api/events?locationId=...` - SSE stream for live updates

**Webhooks:**
- `POST /api/webhooks/ghl` - GHL webhook receiver (auto-updates checklist)

## How It Works

### Agency Authorization (One-Time Setup)
1. Agency admin authorizes app once
2. All sub-accounts automatically have access
3. Widget works immediately for all locations

### Widget Behavior
1. Widget loads in sub-account dashboard
2. Auto-detects locationId from URL
3. Checks if agency is authorized
4. Shows checklist with current progress
5. Updates in real-time via SSE when steps complete

### Webhook Integration
When users complete actions in GHL:
- `ProductCreate` → ✓ Course created
- `OrderCreate` → ✓ Product attached  
- `ExternalAuthConnected` → ✓ Payment integrated
- Domain connection → Manual tracking (coming soon)

Checklist link targets
----------------------

The widget builds dashboard URLs dynamically based on the supplied `data-location`. For example, with
`data-location="kgREXsjAvhag6Qn8Yjqn"` the CTA buttons redirect to:

- Connect a domain → `https://app.coursecreator360.com/v2/location/kgREXsjAvhag6Qn8Yjqn/settings/domain`
- Create a course → `https://app.coursecreator360.com/v2/location/kgREXsjAvhag6Qn8Yjqn/memberships/courses/products`
- Connect product to site/funnel → `https://app.coursecreator360.com/v2/location/kgREXsjAvhag6Qn8Yjqn/funnels-websites/funnels`
- Connect a payment processor → `https://app.coursecreator360.com/v2/location/kgREXsjAvhag6Qn8Yjqn/payments/integrations`



