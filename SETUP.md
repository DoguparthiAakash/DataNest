# DataNest

## Project Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Copy your Project URL and anon/public key from Settings → API

### 2. Update Config
Open `js/config.js` and add your Supabase credentials:
```javascript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_KEY = 'your-anon-key';
```

### 3. Create Database Table
In Supabase SQL Editor, run:

```sql
-- Datasets table
CREATE TABLE datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  uploader_name TEXT NOT NULL,
  uploader_email TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('datasets', 'datasets', true);

-- Storage policy (public read)
CREATE POLICY "Public Read" ON storage.objects
  FOR SELECT USING (bucket_id = 'datasets');

-- Storage policy (public upload)
CREATE POLICY "Public Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'datasets');
```

### 4. Enable Row Level Security
In Supabase Dashboard → Authentication → Policies
- Enable RLS on `datasets` table
- Create policy: Allow all INSERT (for uploads)
- Create policy: Allow all SELECT (for viewing)

### 5. Email Notification Setup
For email notifications, you can use:
- **Resend** (free 100 emails/day) 
- **SendGrid** (free 100 emails/day)
- **Supabase Edge Functions** with SMTP

Or use the simple Formspree fallback in the code.

---

## Features

- **Upload** — Anyone can upload a dataset (no login)
- **Browse** — View all approved datasets
- **Admin** — Review/approve uploads via Supabase Dashboard
- **Email** — Notification on new upload (via external service)

## Files

```
docs/
├── index.html      # Home - Upload button front and center
├── browse.html    # Browse all approved datasets
├── js/
│   ├── config.js    # Supabase credentials (YOU MUST SET THIS)
│   ├── upload.js     # Upload logic
│   └── browse.js     # Browse logic
└── css/
    └── style.css     # Styles
```
