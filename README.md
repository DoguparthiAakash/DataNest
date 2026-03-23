# DataNest

**Open Dataset Directory** — A lightweight, fast dataset navigator for researchers.

[![Deploy to GitHub Pages](https://github.com/anomalyco/datanest/actions/workflows/deploy.yml/badge.svg)](https://github.com/anomalyco/datanest/actions/workflows/deploy.yml)

---

## Features

- Browse 20+ curated datasets
- Search & filter by topic, format
- Download or view via API (HuggingFace, Kaggle)
- Mobile-first responsive design
- No build step — pure static HTML/CSS/JS
- Free hosting on GitHub Pages

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/datanest.git
cd datanest

# 2. Test locally
cd docs && python3 -m http.server 8000

# 3. Open http://localhost:8000
```

---

## Deployment

1. Push to GitHub
2. Settings → Pages → Source: **GitHub Actions**
3. Site goes live automatically

---

## Adding Datasets

```bash
# 1. Create dataset file
docs/datas/my-dataset.json

# 2. Add to index
docs/datas/index.json
```

---

## Dataset Format

```json
{
  "id": "unique-id",
  "title": "Dataset Name",
  "topic": "Healthcare",
  "format": "CSV",
  "size": "10 MB",
  "rows": "50000",
  "overview": "What this dataset contains...",
  "source": "Source Organization",
  "access_type": "download",
  "download_url": "https://...",
  "visit_url": "https://...",
  "added": "2026-03-22",
  "tags": ["tag1", "tag2"]
}
```

For API-only datasets:
```json
{
  "access_type": "api",
  "usage_code": "from datasets import load_dataset\nds = load_dataset('path')",
  ...
}
```

---

## Tech Stack

- HTML5 + CSS3 + Vanilla JS
- Google Fonts (Outfit, JetBrains Mono)
- GitHub Pages (hosting)
- GitHub Actions (deployment)

---

## License

MIT — Free for personal and commercial use.
