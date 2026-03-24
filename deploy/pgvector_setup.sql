-- Run once in the Supabase SQL editor, or on any privileged Postgres session.
CREATE EXTENSION IF NOT EXISTS vector;

-- Optional verification:
SELECT extname
FROM pg_extension
WHERE extname = 'vector';
