-- MTC-316: Add action column to chaos.signals + RESTRICTIVE anon RLS policies
-- Additive-only: no DROPs, no existing column changes, no other tables touched.
-- Idempotent: ADD COLUMN IF NOT EXISTS + DO $$ guards on policy creation.

-- Step 1: Add action column
ALTER TABLE chaos.signals
  ADD COLUMN IF NOT EXISTS action text DEFAULT 'pending'
    CHECK (action IN ('pending', 'take', 'pass'));

-- Step 2: Backfill existing rows (defensive no-op — ADD COLUMN DEFAULT pre-populates, but self-documents intent)
UPDATE chaos.signals
  SET action = CASE WHEN will_take = true THEN 'take' ELSE 'pending' END
  WHERE action IS NULL;

-- Step 3: RESTRICTIVE anon SELECT policy — anon sees only pending/taken open signals
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'chaos' AND tablename = 'signals' AND policyname = 'anon_select'
  ) THEN
    CREATE POLICY "anon_select" ON chaos.signals
      AS RESTRICTIVE FOR SELECT TO anon
      USING (action IN ('pending', 'take') AND status = 'open');
  END IF;
END $$;

-- Step 4: Column-level GRANT — restrict anon UPDATE to action column only
REVOKE UPDATE ON chaos.signals FROM anon;
GRANT UPDATE (action) ON chaos.signals TO anon;

-- Step 5: RESTRICTIVE anon UPDATE policy — row-level gate (open pending/taken rows only, valid transitions)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'chaos' AND tablename = 'signals' AND policyname = 'anon_update'
  ) THEN
    CREATE POLICY "anon_update" ON chaos.signals
      AS RESTRICTIVE FOR UPDATE TO anon
      USING (action IN ('pending', 'take') AND status = 'open')
      WITH CHECK (action IN ('take', 'pass'));
  END IF;
END $$;
