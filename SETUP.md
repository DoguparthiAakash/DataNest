# DataNest — No Build Required

**Static site. No build step. No server. Just push and it works.**

---

## Why No Build?

- **GitHub Pages compatible** — Push code, site is live
- **Zero dependencies** — Plain HTML, CSS, JS
- **Fast** — No bundler overhead
- **Simple** — Edit any file directly on GitHub

---

## Quick Start

```bash
# Clone
git clone https://github.com/yourusername/datanest.git
cd datanest

# Test locally (optional)
cd docs && python3 -m http.server 8000

# Edit files in docs/
# Push to GitHub
```

---

## Project Structure

```
datanest/
├── docs/                    # Everything for GitHub Pages
│   ├── index.html           # Main page (browse datasets)
│   ├── home.html            # Landing page
│   ├── request.html         # Request form
│   ├── about.html           # About page
│   ├── css/style.css        # Styles
│   ├── js/
│   │   ├── app.js           # Browse logic
│   │   ├── count.js         # Animated counter
│   │   └── home.js          # Redirects to index
│   └── datas/               # Dataset files
│       ├── index.json       # List of all datasets
│       └── *.json           # Individual dataset files
│
├── .github/workflows/deploy.yml   # Auto-deploys to GitHub Pages
├── README.md                # This file
└── SETUP.md                 # Setup guide
```

---

## Deploy to GitHub Pages

1. Push to GitHub
2. Go to **Settings → Pages**
3. Source: **GitHub Actions**
4. Done! Site will be live at `https://yourusername.github.io/datanest`

---

## Local Testing

```bash
cd docs
python3 -m http.server 8000
# Open http://localhost:8000
```

---

## Adding a Dataset

1. Create a JSON file in `docs/datas/` (e.g., `my-dataset.json`)
2. Add filename to `docs/datas/index.json`

```json
// docs/datas/my-dataset.json
{
  "id": "unique-id",
  "title": "Dataset Name",
  "topic": "Healthcare",
  "format": "CSV",
  "size": "10 MB",
  "rows": "50000",
  "overview": "Description of the dataset...",
  "source": "Organization",
  "access_type": "download",
  "download_url": "https://example.com/dataset.zip",
  "visit_url": "https://example.com",
  "added": "2026-03-22",
  "tags": ["tag1", "tag2"]
}
```

```json
// docs/datas/index.json
["existing.json", "my-dataset.json"]
```

---

## Topics

Healthcare · Climate · Finance · NLP · Agriculture · Computer Vision · Education · Social Science · Economics · Sports · Other

---

## Access Types

- `download` — Direct download button
- `api` — Shows code/HuggingFace/Kaggle buttons
