# DataNest — Open Dataset Directory

A curated directory of open research datasets. Hosted on GitHub Pages with an admin portal for managing datasets.

**Live Site:** `https://yourusername.github.io/datanest`

---

## Quick Start

```bash
# 1. Push this repo to GitHub
# 2. Settings → Pages → Source: GitHub Actions
# 3. Go to /admin to manage datasets
# Done!
```

---

## Project Structure

```
datanest/
├── docs/
│   ├── index.html           # Main page
│   ├── request.html         # Request form
│   ├── about.html           # About page
│   ├── admin/               # Decap CMS admin
│   │   ├── index.html
│   │   └── config.yml
│   ├── css/style.css        # Styles
│   ├── js/app.js            # Application
│   ├── datas/                # Dataset files
│   │   ├── index.json        # List of datasets
│   │   ├── covid-india.json
│   │   ├── tn-rainfall.json
│   │   └── ...
│   └── data/
│       └── requests/        # User requests
│
├── .github/workflows/deploy.yml
└── README.md
```

---

## Adding/Removing Datasets

### Method 1: Admin Portal (Recommended)

1. Go to `/admin` → Login with GitHub
2. Click **Datasets** → **New Datasets**
3. Fill the form and click **Publish**
4. The dataset is automatically added to `datas/` folder

To remove: Open a dataset in admin → **Delete**

### Method 2: Manual

**Add a new dataset:**
1. Create a new JSON file in `docs/datas/` (e.g., `my-dataset.json`)
2. Add the filename to `docs/datas/index.json`

```json
// docs/datas/my-dataset.json
{
  "id": "11",
  "title": "My Dataset",
  "topic": "Healthcare",
  "format": "CSV",
  "size": "10 MB",
  "rows": "50000",
  "overview": "Description here...",
  "source": "Organization",
  "download_url": "https://...",
  "added": "2026-03-22",
  "tags": ["tag1", "tag2"]
}
```

```json
// docs/datas/index.json
[
  "covid-india.json",
  "tn-rainfall.json",
  "my-dataset.json"
]
```

**Remove a dataset:**
1. Delete the file from `docs/datas/`
2. Remove it from `docs/datas/index.json`

---

## Dataset Format

```json
{
  "id": "11",
  "title": "Dataset Name",
  "topic": "Healthcare",
  "format": "CSV",
  "size": "10 MB",
  "rows": "50000",
  "overview": "Describe what this dataset contains...",
  "source": "Organization Name",
  "visit_url": "https://...",
  "download_url": "https://...",
  "added": "2026-03-22",
  "tags": ["tag1", "tag2", "tag3"],
  "preview": {
    "cols": ["col1", "col2", "col3"],
    "rows": [
      ["val1", "val2", "val3"],
      ["val1", "val2", "val3"],
      ["val1", "val2", "val3"],
      ["val1", "val2", "val3"],
      ["val1", "val2", "val3"]
    ]
  }
}
```

### Available Topics

Healthcare · Climate · Finance · NLP · Agriculture · Computer Vision · Education · Social Science · Economics · Sports · Other

---

## Admin Portal

Access at `/admin` — requires GitHub login with repo access.

### Setup (One-time)

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth App:
   - Homepage URL: `https://yourusername.github.io/datanest`
   - Callback URL: `https://yourusername.github.io/datanest/admin/index.html`
3. In `docs/admin/config.yml`, update:
   ```yaml
   backend:
     repo: yourusername/datanest  # Change this
   ```

---

## How Requests Work

Users submit requests via `/request.html`. View/manage them in `/admin` → **Dataset Requests**.

---

## Security

- Admin access requires GitHub login
- Only repo collaborators can access `/admin`
- All changes tracked in Git history
- Remove repo access to revoke admin rights

---

## License

MIT — Use freely.
