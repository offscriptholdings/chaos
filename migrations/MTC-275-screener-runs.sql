-- MTC-275: Add chaos.screener_runs table with anon SELECT policy
-- Tracks each n8n screener execution: start row (status=running), updated on completion.
-- Idempotent: CREATE TABLE IF NOT EXISTS + DO $$ guards on policy creation.

CREATE TABLE IF NOT EXISTS chaos.screener_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  status          text NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running', 'success', 'error')),
  signals_written int,
  error_message   text
);

ALTER TABLE chaos.screener_runs ENABLE ROW LEVEL SECURITY;

-- Standard chaos owner-all policy (matches every other chaos table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'chaos'
      AND tablename = 'screener_runs'
      AND policyname = 'owner_all'
  ) THEN
    CREATE POLICY "owner_all" ON chaos.screener_runs
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Anon SELECT policy — required for FD Health Pipelines panel (SYNC_HEALTH_SOURCES)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'chaos'
      AND tablename = 'screener_runs'
      AND policyname = 'anon_select'
  ) THEN
    CREATE POLICY "anon_select" ON chaos.screener_runs
      FOR SELECT TO anon USING (true);
  END IF;
END $$;
