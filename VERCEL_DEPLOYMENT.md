# Deploying to Vercel

This guide deploys the full stack to Vercel:
- **Frontend** → Next.js (Vercel's native runtime)
- **Backend** → FastAPI via Vercel Python Serverless Functions (`api/index.py`)
- **Database** → Supabase (hosted PostgreSQL — free tier)
- **Cache** → Upstash (serverless Redis — free tier)

---

## Step 1 — Set up external services (5 minutes)

### PostgreSQL — Supabase
1. Go to [https://supabase.com](https://supabase.com) → **Start your project** (free)
2. Create a new project — choose the region **closest to your Vercel deployment**
3. Wait ~2 minutes for the project to provision
4. Go to **Project Settings** → **Database** → scroll to **Connection string**
5. Select the **Transaction pooler** tab (port `6543`) — required for Vercel serverless
6. Copy the URI, then:
   - Replace `postgresql://` with `postgresql+asyncpg://`
   - The final URL looks like:
     ```
     postgresql+asyncpg://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
     ```
7. Save this as `DATABASE_URL` in Vercel env vars

> **Why Transaction Pooler?**  
> Vercel functions are stateless and short-lived. The Transaction Pooler (pgBouncer) lets hundreds of
> concurrent functions share a small pool of real Postgres connections. The app uses `NullPool`
> so SQLAlchemy never holds a connection between requests.

### Redis — Upstash
1. Go to [https://upstash.com](https://upstash.com) → **Create Database** → choose **Redis**
2. Select the same region as your Supabase project
3. Copy the **rediss://** connection URL from the **Details** tab

---

## Step 2 — Push the project to GitHub

```bash
cd E:\Pooja\chatbot
git init
git add .
git commit -m "Initial commit — SAP Analytics Chatbot"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/sap-analytics-chatbot.git
git push -u origin main
```

---

## Step 3 — Import into Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository** → select your GitHub repo
3. Vercel detects `vercel.json` automatically — leave **Framework Preset** as **Other**
4. Set **Root Directory** to `.` (the repo root)
5. Do **NOT** click Deploy yet — set environment variables first (Step 4)

---

## Step 4 — Add Environment Variables

In Vercel → Project → **Settings** → **Environment Variables**, add each variable from `.env.vercel.example`:

| Variable | Example value |
|----------|--------------|
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host.neon.tech/dbname?sslmode=require` |
| `REDIS_URL` | `rediss://:password@host.upstash.io:6380` |
| `SAP_BASE_URL` | `https://your-s4.yourcompany.com` |
| `SAP_USERNAME` | `CHATBOT_USER` |
| `SAP_PASSWORD` | `••••••••` |
| `LLM_PROVIDER` | `anthropic` |
| `ANTHROPIC_API_KEY` | `sk-ant-…` |
| `SECRET_KEY` | *(generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)* |
| `EXPORT_DIR` | `/tmp/sap_chatbot_exports` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` |

Set all variables for **Production**, **Preview**, and **Development** scopes.

---

## Step 5 — Deploy

Click **Deploy** in Vercel. The build process:

1. Vercel builds the Next.js frontend from `frontend/`
2. Vercel packages `api/index.py` as a Python 3.12 serverless function
3. Routes `/api/v1/*` → Python function, everything else → Next.js

Build takes ~3–5 minutes on first deploy.

---

## Step 6 — Initialise the database

Run Alembic migrations against your Supabase database. Two options:

### Option A — Vercel CLI (recommended)
```bash
npm i -g vercel
vercel env pull .env.local          # pulls all Vercel env vars into a local .env.local
cd backend
pip install -r requirements.txt
# Export the DATABASE_URL from .env.local, then run:
alembic upgrade head                # creates all tables in Supabase
```

### Option B — Supabase SQL Editor
1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Run this to create the schema:

```sql
-- Enable UUID extension (already enabled on Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE messagerole AS ENUM ('user', 'assistant', 'system');
CREATE TYPE exportformat AS ENUM ('pdf', 'pptx', 'excel', 'png');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  hashed_password VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  roles JSONB DEFAULT '[]',
  sap_user_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  context_summary TEXT
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role messagerole NOT NULL,
  content TEXT NOT NULL,
  intent VARCHAR(100),
  sap_module VARCHAR(50),
  cds_views_used JSONB DEFAULT '[]',
  odata_queries JSONB DEFAULT '[]',
  chart_data JSONB,
  insights JSONB DEFAULT '[]',
  suggested_followups JSONB DEFAULT '[]',
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE export_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id),
  format exportformat NOT NULL,
  file_path VARCHAR(500),
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(200),
  details JSONB,
  ip_address VARCHAR(50),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
```

---

## Step 7 — Verify

Visit your Vercel URL:

| URL | Expected |
|-----|---------|
| `https://your-app.vercel.app` | Chat UI |
| `https://your-app.vercel.app/api/v1/health` | `{"status":"healthy"}` |
| `https://your-app.vercel.app/api/docs` | FastAPI Swagger UI |
| `https://your-app.vercel.app/api/v1/chat/suggestions` | JSON list of prompts |

---

## SAP Network Connectivity

Vercel functions run in AWS us-east-1 (or your chosen region). Your SAP system must be reachable from the public internet or via:

| Option | How |
|--------|-----|
| **SAP BTP Cloud Connector** | Exposes on-premise SAP via BTP Destination Service → public URL |
| **SAP Private Link** | AWS PrivateLink between Vercel and SAP (Enterprise plan) |
| **Reverse proxy** | Nginx/HAProxy in DMZ forwarding to SAP Gateway |
| **SAP Public Cloud (RISE)** | Already has a public OData endpoint |

For on-premise SAP, the simplest path is **SAP Cloud Connector** → expose a virtual host → use that URL as `SAP_BASE_URL`.

---

## Custom Domain

1. Vercel → Project → **Domains** → Add domain (e.g. `sap-chat.yourcompany.com`)
2. Add CNAME record at your DNS provider: `sap-chat → cname.vercel-dns.com`
3. Update `ALLOWED_ORIGINS` env var: add `https://sap-chat.yourcompany.com`
4. Redeploy

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Function timeout (> 10s on Hobby) | Upgrade to Vercel Pro (300s limit) — LLM + SAP calls need it |
| `ModuleNotFoundError: app` | Check `sys.path` in `api/index.py` and that `backend/` is in the repo |
| CORS errors | Add your Vercel URL to `ALLOWED_ORIGINS` env var |
| SAP 401 errors | Verify `SAP_USERNAME`/`SAP_PASSWORD` in Vercel env vars |
| `prepared statement already exists` | You're using the Session Pooler — switch to the **Transaction Pooler** URL (port 6543) |
| `SSL connection required` | Supabase requires SSL — make sure your `DATABASE_URL` connects via the pooler (SSL is on by default) |
| `too many connections` | You're on Supabase free tier (max 60 connections) — Transaction Pooler multiplexes connections so this shouldn't happen with `NullPool`; if it does, check for connection leaks |
| DB connection refused | Confirm `DATABASE_URL` uses `postgresql+asyncpg://` and points to the **pooler** host (port 6543), not the direct host (5432) |
| Export download fails | Exports write to `/tmp` — works within a single function invocation |

---

## Vercel Plan Requirements

| Feature | Hobby (free) | Pro ($20/mo) |
|---------|-------------|-------------|
| Function timeout | 10s | 300s |
| Function memory | 1024 MB | 3008 MB |
| Concurrent executions | 1 | Unlimited |
| **Recommendation** | Demo only | Production use |

LLM + SAP OData calls typically take 5–30 seconds, so **Vercel Pro is required for production**.
