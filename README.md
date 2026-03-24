# RuleGPT Deployment

RuleGPT is split into two deployable parts:

- `rulegpt-api`: FastAPI backend for query handling, storage, embeddings, and admin routes.
- `rulegpt-ui`: Vite + React frontend for the user experience.

The target deployment model is:

- Frontend on Vercel.
- Backend on Render.
- PostgreSQL on Supabase with `pgvector` enabled.

## Local Setup

### Backend

```powershell
cd rulegpt-api
copy .env.example .env
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```powershell
cd rulegpt-ui
copy .env.example .env.local
npm install
npm run dev
```

The UI defaults to `http://localhost:8000` for the API if `VITE_API_BASE_URL` is not set.

## Environment Files

- Backend env template: `rulegpt-api/.env.example`
- Frontend env template: `rulegpt-ui/.env.example`

Keep production secrets out of git. Use the templates to capture names only.

## Deployment

### Supabase

Create a separate Supabase project for RuleGPT data. Use the project Postgres connection string for `DATABASE_URL` and enable the `vector` extension before the first migration.

Run the SQL in `deploy/pgvector_setup.sql` once in the Supabase SQL editor, then run Alembic migrations from the backend.

### Render backend

Use `render.yaml` as the blueprint for the API service. Set the secret environment variables in Render:

- `DATABASE_URL`
- `SECRET_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RULHUB_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_ANNUAL_PRICE_ID`

Set `CORS_ORIGINS` to include the Vercel URL for the frontend.

### Vercel frontend

Set the Vercel project root directory to `rulegpt-ui` and use `rulegpt-ui/vercel.json` for the SPA fallback. Set these build-time env vars in Vercel:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_GOOGLE_OAUTH_ENABLED`
- `VITE_SUPABASE_LINKEDIN_OAUTH_ENABLED`

Point `VITE_API_BASE_URL` at the Render backend URL.

## Initial Embedding Sync

After the backend is deployed and the database is migrated, run the first embedding sync from a one-off shell session against the backend environment.

See `deploy/initial_embedding_sync.md` for the exact bootstrap command and options for API-only vs local rule files.

## Launch Checklist

See `deploy/launch_checklist.md` for the short go-live sequence.
