-- MTC-134: Add memo and refresh columns to chaos.signals
-- Supports Signal Analyst layer (MTC-135 memo generator, MTC-136 refresh tagger, MTC-137 will-take toggle)
-- No RLS changes needed — existing policies carry forward

ALTER TABLE chaos.signals
  ADD COLUMN IF NOT EXISTS memo text,
  ADD COLUMN IF NOT EXISTS memo_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS refresh_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS will_take boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS memo_addendum text,
  ADD COLUMN IF NOT EXISTS addendum_generated_at timestamptz;
