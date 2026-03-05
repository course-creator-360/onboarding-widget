# Speed Insights Setup (This Project)

This project uses a Node.js/Express backend and a Vanilla JavaScript frontend.
Use the HTML snippet integration for Vercel Speed Insights.

For full product docs, see the official Vercel guide:
- https://vercel.com/docs/speed-insights/quickstart

## 1) Enable Speed Insights in Vercel

1. Open your project in the Vercel dashboard.
2. Go to the **Speed Insights** tab.
3. Click **Enable**.

## 2) Add the tracking snippet to served HTML

Add this snippet before the closing `</body>` tag in each HTML page you serve:

```html
<script>
  window.si =
    window.si ||
    function () {
      (window.siq = window.siq || []).push(arguments);
    };
</script>
<script defer src="/_vercel/speed-insights/script.js"></script>
```

For this repository, that typically means pages under `public/` (for example,
`public/index.html` and any other user-facing HTML pages).

> Note: You do not need to install `@vercel/speed-insights` when using this HTML snippet approach.

## 3) Deploy and verify

1. Deploy to Vercel.
2. Open a deployed page and confirm the script is present:
   - `/_vercel/speed-insights/script.js`
3. After traffic reaches the site, view metrics in:
   - Vercel dashboard -> your project -> **Speed Insights**

## Troubleshooting

- If no data appears, confirm Speed Insights is enabled in the dashboard.
- Verify the snippet is present in the final rendered HTML.
- Verify your deployment is on Vercel.
