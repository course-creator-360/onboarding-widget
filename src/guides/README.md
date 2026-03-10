# Guides System

This directory contains structured guide content that can be served via the API endpoints.

## Structure

Each guide is stored as a JSON file with the following structure:

```json
{
  "id": "guide-id",
  "title": "Guide Title",
  "description": "Guide description",
  "framework": "multiple|specific-framework",
  "sections": [
    {
      "id": "section-id",
      "title": "Section Title",
      "frameworks": ["nextjs", "remix"], // Optional: filter by framework
      "content": [
        {
          "type": "text",
          "text": "Markdown text content"
        },
        {
          "type": "codeblock",
          "tabs": [
            {
              "tab": "TypeScript",
              "language": "tsx",
              "code": "import { Analytics } from '@vercel/analytics'",
              "filename": "app.tsx",
              "framework": "nextjs",
              "highlights": "1, 5"
            }
          ]
        },
        {
          "type": "list",
          "items": ["Item 1", "Item 2"]
        },
        {
          "type": "note",
          "text": "💡 Note: Important information"
        }
      ]
    }
  ]
}
```

## Content Types

### Text Content
Simple text content that supports Markdown formatting.

```json
{
  "type": "text",
  "text": "Your markdown text here with **bold** and *italic*"
}
```

### Code Blocks
Code blocks with support for multiple tabs (languages), syntax highlighting, and line highlighting.

```json
{
  "type": "codeblock",
  "title": "Optional title",
  "tabs": [
    {
      "tab": "TypeScript",
      "language": "tsx",
      "code": "const example = 'code';",
      "filename": "example.tsx",
      "framework": "nextjs",
      "highlights": "1, 3-5"
    }
  ]
}
```

### Lists
Ordered or unordered lists.

```json
{
  "type": "list",
  "items": [
    "First item",
    "Second item with [link](https://example.com)"
  ]
}
```

### Notes
Highlighted notes or warnings.

```json
{
  "type": "note",
  "text": "💡 Note: Important information here"
}
```

## API Endpoints

### List All Guides
```
GET /api/guides
```

Returns a list of all available guides with their ID, title, and description.

### Get Guide by ID
```
GET /api/guides/:id
```

Returns the complete guide content for the specified ID.

### Get Guide Section
```
GET /api/guides/:id/sections/:sectionId
```

Returns a specific section from a guide.

### Get Framework-Filtered Guide
```
GET /api/guides/:id/framework/:framework
```

Returns the guide content filtered to only include sections relevant to the specified framework.

Supported frameworks:
- `nextjs` - Next.js (pages directory)
- `nextjs-app` - Next.js (app directory)
- `remix` - Remix
- `sveltekit` - SvelteKit
- `nuxt` - Nuxt
- `vue` - Vue
- `astro` - Astro
- `create-react-app` - React
- `html` - Plain HTML
- `other` - Other frameworks

## Adding New Guides

1. Create a new JSON file in `src/guides/` following the structure above
2. The file name should match the guide ID (e.g., `my-guide.json` for ID `my-guide`)
3. The guide will automatically be available via the API endpoints
4. No code changes needed - the system auto-discovers guides

## Example Usage

### JavaScript/Fetch
```javascript
// List all guides
const response = await fetch('/api/guides');
const { guides } = await response.json();

// Get specific guide
const guideResponse = await fetch('/api/guides/vercel-web-analytics');
const { guide } = await guideResponse.json();

// Get Next.js-specific content
const nextjsGuide = await fetch('/api/guides/vercel-web-analytics/framework/nextjs');
const { guide: filteredGuide } = await nextjsGuide.json();
```

### cURL
```bash
# List guides
curl http://localhost:3000/api/guides

# Get guide
curl http://localhost:3000/api/guides/vercel-web-analytics

# Get framework-filtered guide
curl http://localhost:3000/api/guides/vercel-web-analytics/framework/nextjs
```

## TypeScript Types

The TypeScript types for guides are defined in `src/guides/types.ts`:

```typescript
import type { Guide, GuideSection, Content } from '../guides/types';
```

## Caching

Guides are automatically cached in memory after first load for optimal performance. The cache is per-process, so it will be cleared on server restart.
