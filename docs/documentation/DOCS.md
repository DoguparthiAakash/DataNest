# DataNest Documentation

## Overview

DataNest is a lightweight dataset directory built for speed and simplicity. It's designed to work fast on low-end devices and can be hosted for free on GitHub Pages.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub Pages                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐   │
│  │  Home   │  │ Browse  │  │ Request │  │    About     │   │
│  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬──────┘   │
│       │            │            │               │          │
│  ┌────┴────────────┴────────────┴───────────────┴────┐     │
│  │                    app.js                          │     │
│  │  • Fetches datasets from datas/index.json          │     │
│  │  • Renders cards, handles search/filter           │     │
│  │  • Opens modals with full details                 │     │
│  └────────────────────┬──────────────────────────────┘     │
│                       │                                     │
│  ┌────────────────────┴──────────────────────────────┐     │
│  │                   datas/                           │     │
│  │  • index.json — List of all dataset files         │     │
│  │  • *.json — Individual dataset metadata            │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

**No backend. No database. No build step.**

---

## File Descriptions

### Pages

| File | Purpose |
|------|---------|
| `index.html` | Main page — Browse all datasets |
| `home.html` | Landing page with hero + animated stats |
| `request.html` | Form to request new datasets |
| `about.html` | About the project |

### Styles

| File | Purpose |
|------|---------|
| `css/style.css` | All styles (responsive, buttons, cards, modal) |

### Scripts

| File | Purpose |
|------|---------|
| `js/app.js` | Main app — loads datasets, renders cards, modal logic |
| `js/count.js` | Animated counter for homepage stats |
| `js/home.js` | Redirects `/home.html` to `/` |

### Data

| File | Purpose |
|------|---------|
| `datas/index.json` | Array of dataset filenames |
| `datas/*.json` | Individual dataset metadata |

---

## Dataset Schema

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `title` | string | Dataset name |
| `topic` | string | Category (see Topics) |
| `overview` | string | Short description |
| `access_type` | string | `download` or `api` |
| `added` | string | Date added (YYYY-MM-DD) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `format` | string | CSV, JSON, Parquet, etc. |
| `size` | string | File size (e.g., "10 MB") |
| `rows` | string | Number of rows (e.g., "50000") |
| `source` | string | Source organization |
| `tags` | array | Searchable tags |
| `download_url` | string | Direct download link |
| `visit_url` | string | Project/source URL |
| `usage_code` | string | Code snippet for API datasets |

### Topics

- Healthcare
- Climate
- Finance
- NLP
- Agriculture
- Computer Vision
- Education
- Social Science
- Economics
- Sports
- Other

### Access Types

#### `download`
For datasets with direct download links.

```json
{
  "access_type": "download",
  "download_url": "https://example.com/dataset.zip"
}
```

#### `api`
For datasets that require code/API access (HuggingFace, Kaggle, etc.)

```json
{
  "access_type": "api",
  "visit_url": "https://huggingface.co/datasets/...",
  "usage_code": "from datasets import load_dataset\nds = load_dataset('...')"
}
```

---

## Request System

Users submit requests via `/request.html`. Currently sends to Formspree (or can configure email).

### Configuration

Edit `js/app.js` to change the form endpoint:
```javascript
// Find the form submission handler and update the action URL
```

---

## Customization

### Colors

Edit CSS variables in `style.css`:
```css
:root {
  --primary: #6366f1;      /* Main brand color */
  --primary-dark: #4f46e5;  /* Hover state */
  --bg: #fafbfc;            /* Background */
  --text: #0f172a;          /* Text color */
  /* ... more variables */
}
```

### Fonts

Google Fonts are loaded in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
```

### Logo

The logo is an inline SVG in the header. Edit `index.html` to change it.

---

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

---

## Performance

- No JavaScript frameworks
- Single CSS file (~8KB)
- Minimal JS (~4KB)
- No images (SVG icons only)
- Fonts loaded from Google CDN

---

## CI/CD

GitHub Actions automatically deploys to GitHub Pages on every push to `main`.

Workflow: `.github/workflows/deploy.yml`

---

## Contributing

1. Fork the repo
2. Add/edit datasets in `docs/datas/`
3. Update `docs/datas/index.json`
4. Push and create PR

---

## License

MIT
