# Launch Checklist

1. Create a separate Supabase project for RuleGPT and copy the Postgres connection string.
2. Run `deploy/pgvector_setup.sql` in Supabase.
3. Set backend env vars in Render, especially `DATABASE_URL`, `SECRET_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `CORS_ORIGINS`.
4. Deploy the backend from `render.yaml` and confirm `GET /health` returns `{"status":"ok","service":"rulegpt-api"}`.
5. Set frontend env vars in Vercel, especially `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.
6. Deploy the frontend and confirm it loads against the Render backend.
7. Run the initial embedding sync from `deploy/initial_embedding_sync.md`.
8. Smoke test a query, a history fetch, and the admin embedding-status route.
