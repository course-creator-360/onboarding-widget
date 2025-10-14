Onboarding Widget (GHL Marketplace)

Local development

1. Copy .env.example to .env and fill values
2. Install deps: `npm install`
3. Start dev server: `npm run dev`
4. Load the widget on any page via:

```html
<script
  src="http://localhost:4002/widget.js"
  data-location="YOUR_LOCATION_ID"
  data-api="http://localhost:4002"
></script>
```

   Replace `YOUR_LOCATION_ID` with the location you want to test against. For local QA we frequently use
   `kgREXsjAvhag6Qn8Yjqn`.

Endpoints

- `GET /api/status?locationId=...` - current checklist
- `GET /events?locationId=...` - SSE stream
- `POST /api/dismiss` - mark as dismissed
- `POST /api/mock/set` - update flags for testing
- `GET /oauth/install?locationId=...` and `/oauth/callback` - OAuth flow
- `POST /webhooks/ghl` - webhook receiver

Checklist link targets
----------------------

The widget builds dashboard URLs dynamically based on the supplied `data-location`. For example, with
`data-location="kgREXsjAvhag6Qn8Yjqn"` the CTA buttons redirect to:

- Connect a domain → `https://app.coursecreator360.com/v2/location/kgREXsjAvhag6Qn8Yjqn/settings/domain`
- Create a course → `https://app.coursecreator360.com/v2/location/kgREXsjAvhag6Qn8Yjqn/memberships/courses/products`
- Connect product to site/funnel → `https://app.coursecreator360.com/v2/location/kgREXsjAvhag6Qn8Yjqn/funnels-websites/funnels`
- Connect a payment processor → `https://app.coursecreator360.com/v2/location/kgREXsjAvhag6Qn8Yjqn/payments/integrations`



