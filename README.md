# SAP S/4HANA Analytics Chatbot

Enterprise-grade AI chatbot that connects to SAP S/4HANA and lets business users query operational data in plain English — returning charts, KPIs, executive insights, and export-ready reports.

---

## Architecture

```
User (Browser)
    │
    ▼
React / Next.js Frontend  (TypeScript · Tailwind · Apache ECharts)
    │
    ▼  REST/JSON
FastAPI Backend
    │
    ├─ LangGraph Orchestration Pipeline
    │     ├─ Intent Parser        (Claude / GPT-4o)
    │     ├─ CDS View Selector    (Registry lookup)
    │     ├─ OData Query Planner  (Filters, $select, $apply)
    │     ├─ SAP Data Fetcher     (httpx + OAuth / Basic)
    │     ├─ Analytics Engine     (pandas: agg, trend, YoY, ABC)
    │     ├─ Chart Builder        (ECharts JSON options)
    │     └─ Insight Generator    (LLM narrative + recommendations)
    │
    └─ SAP S/4HANA OData Gateway
          (Standard CDS Views — read-only)
```

---

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 22+
- Docker + Docker Compose
- SAP S/4HANA system with OData Gateway enabled
- Anthropic API key **or** OpenAI API key

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — fill in SAP_BASE_URL, SAP_USERNAME, SAP_PASSWORD
# and ANTHROPIC_API_KEY (or OPENAI_API_KEY)

cp frontend/.env.example frontend/.env.local
```

### 2. Run with Docker Compose

```bash
docker compose up -d
```

- Frontend → http://localhost:3000
- Backend API → http://localhost:8000/api/docs

### 3. Run locally (development)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## SAP Prerequisites

1. **Create a dedicated RFC/dialog user** (`CHATBOT_USER`) with read-only authorizations.
2. **Activate OData services** in SAP Gateway (`/IWFND/MAINT_SERVICE`):
   - `API_BILLING_DOCUMENT_SRV`
   - `API_SALES_ORDER_SRV`
   - `API_JOURNALENTRYITEMBASIC_SRV`
   - `API_SUPPLIERINVOICE_PROCESS_SRV`
   - `API_PURCHASEORDER_PROCESS_SRV`
   - `API_MATERIAL_STOCK_SRV`
   - `API_PRODUCTION_ORDER_2_SRV`
   - `API_BUSINESS_PARTNER`
3. **SAP authorization objects** — assign `S_SERVICE` for each activated service.
4. **Network** — ensure the backend server can reach the SAP Gateway HTTPS port (443 or 8443).

---

## Project Structure

```
chatbot/
├── backend/
│   ├── app/
│   │   ├── api/routes/         # FastAPI route handlers
│   │   ├── core/               # Config, DB engine
│   │   ├── models/             # SQLAlchemy models
│   │   ├── middleware/         # Audit logging
│   │   └── services/
│   │       ├── ai/             # LangGraph orchestrator, intent engine, insight generator
│   │       ├── sap/            # OData client, CDS registry
│   │       ├── analytics/      # pandas analytics engine
│   │       ├── visualization/  # ECharts option builder
│   │       └── export/         # Excel, PDF, PowerPoint export
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/                # Next.js App Router pages
│       ├── components/
│       │   ├── chat/           # ChatMessage, ChatInput, Sidebar, Suggestions
│       │   ├── charts/         # ChartRenderer (ECharts)
│       │   └── dashboard/      # KPICards, DataTable
│       ├── services/           # Axios API client
│       ├── store/              # Zustand state (conversations, theme)
│       └── types/              # TypeScript interfaces
├── infrastructure/
│   ├── docker/                 # Dockerfiles
│   └── k8s/                    # Kubernetes manifests (add your own)
├── .github/workflows/          # CI/CD pipeline
└── docker-compose.yml
```

---

## Supported SAP Modules & Intents

| Module | Sample Questions |
|--------|-----------------|
| **Sales (SD)** | Top 10 customers by revenue, Monthly sales trend, YoY comparison, Sales by region |
| **Finance (FI)** | Open vendor invoices, AR ageing, Revenue by company code, Cost center spend |
| **Procurement (MM)** | POs pending approval, Spend by vendor, Purchase trend |
| **Inventory (MM-IM)** | Current stock, Slow-moving items, Stock valuation |
| **Manufacturing (PP)** | Production orders, Yield analysis, Cost variance |

---

## AI Pipeline Flow

```
User: "Show top 10 customers by revenue this year"
          │
          ▼
  Intent Parser (LLM)
  → intent_id: top_customers
  → module: SD
  → measure: Revenue
  → date_range: current_year
  → ranking: 10
          │
          ▼
  CDS Registry lookup
  → I_BillingDocument / API_BILLING_DOCUMENT_SRV
          │
          ▼
  OData Query Planner
  → $filter: BillingDocumentDate ge '2025-01-01'
  → $select: SoldToParty,NetAmount,BillingDocumentDate
  → $apply: groupby((SoldToParty),aggregate(NetAmount with sum))
          │
          ▼
  SAP OData fetch (paginated, read-only)
          │
          ▼
  Analytics Engine (pandas)
  → Aggregate by customer
  → Rank top 10
  → Calculate KPIs
          │
          ▼
  Chart Builder
  → Horizontal bar chart (ECharts JSON)
          │
          ▼
  Insight Generator (LLM)
  → Executive summary
  → Key insights with %s
  → Recommendations
  → Follow-up questions
          │
          ▼
  Response → Frontend
```

---

## Security

- All SAP access is **read-only** via released Standard CDS Views
- No direct SQL execution on SAP database
- JWT authentication on all API endpoints
- Role-based access control (RBAC) via token claims
- Credentials stored as environment variables (never in code)
- Audit log for every query (user, intent, CDS views accessed)
- TLS/HTTPS enforced in production

---

## Export Formats

Every analytics result can be exported to:
- **Excel** (`.xlsx`) — KPI sheet + data sheet with formatting
- **PDF** — Executive summary, KPIs, data table, recommendations
- **PowerPoint** (`.pptx`) — 4-slide deck: Title, Summary, KPIs, Recommendations

---

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `SAP_BASE_URL` | SAP Gateway hostname (e.g. `https://s4.corp.com`) |
| `SAP_CLIENT` | SAP client number (e.g. `100`) |
| `SAP_AUTH_TYPE` | `basic` \| `oauth2` \| `principal` |
| `SAP_USERNAME` / `SAP_PASSWORD` | Basic auth credentials |
| `LLM_PROVIDER` | `anthropic` \| `openai` \| `azure_openai` |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key (alternative) |
| `DATABASE_URL` | PostgreSQL async connection string |
| `REDIS_URL` | Redis connection string |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| State | Zustand (with persistence) |
| Charts | Apache ECharts 5 |
| Backend | FastAPI, Python 3.12 |
| AI Orchestration | LangGraph, LangChain |
| LLM | Claude (Anthropic) / GPT-4o (OpenAI) |
| SAP Integration | httpx, OData V2/V4 |
| Analytics | pandas, numpy, scipy |
| Export | python-pptx, reportlab, openpyxl |
| Database | PostgreSQL 16 + SQLAlchemy async |
| Cache | Redis 7 |
| Auth | JWT (python-jose) + OAuth 2.0 |
| CI/CD | GitHub Actions |
| Container | Docker + Docker Compose |
