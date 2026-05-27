-- chaos/seeds/test_signals.sql
-- Test seed for Chaos PWA wiring tickets (CRU-256, 257, 258, 265-269).
-- Created during Chaos audit 2026-05-12 (CRU-271).
--
-- All rows are tagged with notes = 'TEST_SEED_2026-05-12' on chaos.signals.
-- Re-running this script is safe: the cleanup block at the top removes
-- any prior TEST_SEED rows (FK-safe order) before re-inserting.
--
-- Usage: paste into Supabase SQL editor and run, or via psql:
--   psql ... -f seeds/test_signals.sql
--
-- Buckets created:
--   6 open signals    → Signal Queue tab renders these
--   2 triggered signals + 2 trade_journal rows (1 closed win, 1 open) → Journal/Dashboard
--   2 expired signals + 2 shadow_trades rows (1 with outcome, 1 pending) → Shadow Trades

BEGIN;

------------------------------------------------------------------------------
-- 1. CLEANUP (FK-safe order: paper_trades → shadow_trades → trade_journal → signals)
------------------------------------------------------------------------------

DELETE FROM chaos.paper_trades WHERE correlation_note = 'TEST_SEED_2026-05-27';

DELETE FROM chaos.paper_trades WHERE signal_id IN (
  SELECT id FROM chaos.signals WHERE notes = 'TEST_SEED_2026-05-12'
);

DELETE FROM chaos.shadow_trades
WHERE signal_id IN (
  SELECT id FROM chaos.signals WHERE notes = 'TEST_SEED_2026-05-12'
);

DELETE FROM chaos.trade_journal
WHERE signal_id IN (
  SELECT id FROM chaos.signals WHERE notes = 'TEST_SEED_2026-05-12'
);

DELETE FROM chaos.signals WHERE notes = 'TEST_SEED_2026-05-12';

------------------------------------------------------------------------------
-- 2. INSERT 6 OPEN SIGNALS (Signal Queue tab)
------------------------------------------------------------------------------

INSERT INTO chaos.signals (ticker, signal_date, price_at_signal, entry_low, entry_high, stop, target, setup_type, conviction, status, indicator_snapshot, ai_reasoning, notes) VALUES
('NVDA', '2026-05-12', 482.40, 481.50, 483.30, 471.10, 512.80, 'momentum_continuation', 'High', 'open',
  '{"rsi_14": 63.2, "macd_hist": 0.84, "macd_line": 1.21, "macd_signal": 0.37, "bb_width": 0.054, "atr_14": 11.4, "ema_200": 442.10, "rel_vol": 1.84}'::jsonb,
  'Tagged on 5m close above prior consolidation; volume confirmed at the breakout bar. EMA 20/50 stacked, MACD histogram expanding.',
  'TEST_SEED_2026-05-12'),
('AMD', '2026-05-12', 168.85, 168.20, 169.50, 164.40, 180.10, 'bb_squeeze_breakout', 'High', 'open',
  '{"rsi_14": 61.0, "macd_hist": 0.31, "bb_width": 0.038, "bb_width_pctile_14d": 0.08, "atr_14": 5.1, "rel_vol": 2.10}'::jsonb,
  'Bands at 18-day low width; breakout candle expanded range 1.4x ATR with 2.1x rel-vol confirmation.',
  'TEST_SEED_2026-05-12'),
('MSFT', '2026-05-12', 412.05, 411.40, 412.70, 406.20, 425.60, 'ema_pullback', 'Med', 'open',
  '{"rsi_14": 54.8, "macd_hist": 0.12, "ema_20": 411.30, "ema_50": 405.80, "atr_14": 4.9, "rel_vol": 0.92}'::jsonb,
  'Pullback into rising 20EMA on lower volume; trigger on reclaim of 5m VWAP.',
  'TEST_SEED_2026-05-12'),
('AAPL', '2026-05-11', 188.40, 188.00, 188.80, 185.90, 193.20, 'bb_mean_reversion', 'Low', 'open',
  '{"rsi_14": 32.4, "macd_hist": -0.18, "bb_pct_b": 0.05, "atr_14": 2.8, "rel_vol": 1.05}'::jsonb,
  'Tag of lower band on RSI divergence; counter-trend, half-size only per playbook.',
  'TEST_SEED_2026-05-12'),
('AVGO', '2026-05-11', 1342.10, 1339.50, 1344.70, 1318.40, 1395.80, 'macd_crossover', 'Med', 'open',
  '{"rsi_14": 58.1, "macd_hist": 0.45, "macd_line": 5.2, "macd_signal": 4.75, "ema_200": 1255.40, "rel_vol": 1.34}'::jsonb,
  'Daily MACD signal cross with rising histogram; price above 200 EMA, rel-vol confirms.',
  'TEST_SEED_2026-05-12'),
('CRM', '2026-05-11', 271.30, 270.80, 271.80, 267.10, 280.50, 'breakout_retest', 'High', 'open',
  '{"rsi_14": 59.7, "macd_hist": 0.22, "atr_14": 3.6, "rel_vol": 1.62, "prior_breakout_bars_ago": 3}'::jsonb,
  'Re-entry into prior breakout level (3 days old) with reversal bar holding above; rel-vol 1.6x.',
  'TEST_SEED_2026-05-12');

------------------------------------------------------------------------------
-- 3. INSERT 2 TRIGGERED SIGNALS (referenced by trade_journal rows below)
------------------------------------------------------------------------------

INSERT INTO chaos.signals (ticker, signal_date, price_at_signal, entry_low, entry_high, stop, target, setup_type, conviction, status, indicator_snapshot, ai_reasoning, notes) VALUES
('GOOGL', '2026-05-08', 168.40, 167.80, 169.00, 164.20, 178.60, 'momentum_continuation', 'High', 'triggered',
  '{"rsi_14": 65.4, "macd_hist": 0.91, "ema_200": 152.30, "rel_vol": 1.94}'::jsonb,
  'Strong continuation off shallow consolidation; broad market trending.',
  'TEST_SEED_2026-05-12'),
('COIN', '2026-05-09', 218.50, 217.80, 219.20, 211.30, 234.80, 'bb_squeeze_breakout', 'High', 'triggered',
  '{"rsi_14": 62.8, "macd_hist": 0.67, "bb_width": 0.041, "rel_vol": 2.30}'::jsonb,
  'Squeeze break with 2.3x rel-vol; sector confirmation from MSTR earlier in session.',
  'TEST_SEED_2026-05-12');

------------------------------------------------------------------------------
-- 4. INSERT 2 EXPIRED SIGNALS (referenced by shadow_trades rows below)
------------------------------------------------------------------------------

INSERT INTO chaos.signals (ticker, signal_date, price_at_signal, entry_low, entry_high, stop, target, setup_type, conviction, status, indicator_snapshot, ai_reasoning, notes) VALUES
('META', '2026-05-07', 488.20, 487.40, 489.00, 480.60, 502.10, 'macd_crossover', 'Med', 'expired',
  '{"rsi_14": 56.2, "macd_hist": 0.28, "macd_line": 2.1, "macd_signal": 1.82, "rel_vol": 1.41}'::jsonb,
  'Daily MACD cross with confirming volume above 200 EMA.',
  'TEST_SEED_2026-05-12'),
('TSLA', '2026-05-08', 184.50, 183.80, 185.20, 180.10, 192.40, 'breakout_retest', 'Med', 'expired',
  '{"rsi_14": 54.0, "macd_hist": 0.15, "atr_14": 4.2, "rel_vol": 1.48}'::jsonb,
  'Re-entry into prior breakout, reversal bar holds. Sentiment was risk-off.',
  'TEST_SEED_2026-05-12');

------------------------------------------------------------------------------
-- 5. INSERT trade_journal rows (1 closed win, 1 still open)
------------------------------------------------------------------------------

INSERT INTO chaos.trade_journal (signal_id, trade_mode, actual_entry, actual_exit, stop, date_opened, date_closed, entry_rationale, exit_rationale)
SELECT id, 'paper', 168.20, 175.40, 164.20, '2026-05-08', '2026-05-11',
  'Continuation tag clean; broad market trending, took half size given recent losing streak.',
  'Hit T1 mid-session 2026-05-11, trailed remainder to even and stopped on 5m EMA break.'
FROM chaos.signals WHERE ticker = 'GOOGL' AND signal_date = '2026-05-08' AND notes = 'TEST_SEED_2026-05-12';

INSERT INTO chaos.trade_journal (signal_id, trade_mode, actual_entry, stop, date_opened, entry_rationale)
SELECT id, 'live', 218.10, 211.30, '2026-05-09',
  'Squeeze break with sector confirmation; full size given clean entry.'
FROM chaos.signals WHERE ticker = 'COIN' AND signal_date = '2026-05-09' AND notes = 'TEST_SEED_2026-05-12';

------------------------------------------------------------------------------
-- 6. INSERT shadow_trades rows (1 with outcome, 1 pending)
------------------------------------------------------------------------------

INSERT INTO chaos.shadow_trades (signal_id, reason_passed, outcome_if_taken, would_have_won)
SELECT id, 'Already had 2 open longs in tech, didn''t want concentration risk.', 1.85, true
FROM chaos.signals WHERE ticker = 'META' AND signal_date = '2026-05-07' AND notes = 'TEST_SEED_2026-05-12';

INSERT INTO chaos.shadow_trades (signal_id, reason_passed)
SELECT id, 'Sentiment was risk-off intraday; passed despite clean setup.'
FROM chaos.signals WHERE ticker = 'TSLA' AND signal_date = '2026-05-08' AND notes = 'TEST_SEED_2026-05-12';

------------------------------------------------------------------------------
-- 7. INSERT closed paper_trades for PerformanceView (MTC-198)
-- Tagged correlation_note = 'TEST_SEED_2026-05-27'. Wipe before trusting live calibration.
-- High: 3W 1L → 75% win rate, expectancy +1.14R
-- Med:  1W 2L → 33% win rate, expectancy −0.17R
-- Low:  1W 1L → 50% win rate, expectancy +0.10R
------------------------------------------------------------------------------

INSERT INTO chaos.paper_trades
  (ticker, setup_type, conviction_score, status, outcome, r_multiple, entry_zone, stop, target, correlation_note)
VALUES
  ('NVDA', 'momentum_continuation', 3, 'closed', 'target_hit',  2.10, 481.50, 471.10, 512.80, 'TEST_SEED_2026-05-27'),
  ('AMD',  'bb_squeeze_breakout',   3, 'closed', 'target_hit',  1.85, 168.20, 164.40, 180.10, 'TEST_SEED_2026-05-27'),
  ('MSFT', 'ema_pullback',          3, 'closed', 'target_hit',  1.60, 411.40, 406.20, 425.60, 'TEST_SEED_2026-05-27'),
  ('AAPL', 'momentum_continuation', 3, 'closed', 'stop_hit',   -1.00, 188.00, 185.90, 193.20, 'TEST_SEED_2026-05-27'),
  ('GOOGL','macd_crossover',        2, 'closed', 'target_hit',  1.50, 167.80, 164.20, 178.60, 'TEST_SEED_2026-05-27'),
  ('META', 'ema_pullback',          2, 'closed', 'stop_hit',   -1.00, 487.40, 480.60, 502.10, 'TEST_SEED_2026-05-27'),
  ('TSLA', 'breakout_retest',       2, 'closed', 'stop_hit',   -1.00, 183.80, 180.10, 192.40, 'TEST_SEED_2026-05-27'),
  ('AVGO', 'bb_squeeze_breakout',   1, 'closed', 'target_hit',  1.20, 1339.50,1318.40,1395.80,'TEST_SEED_2026-05-27'),
  ('CRM',  'bb_mean_reversion',     1, 'closed', 'stop_hit',   -1.00, 270.80, 267.10, 280.50, 'TEST_SEED_2026-05-27');

------------------------------------------------------------------------------
-- 8. INSERT paper_trades linked to signals (MTC-200 queue lifecycle seeds)
--
-- pending_entry: NVDA, AMD, MSFT, AVGO, CRM → appear in Signals queue
-- open:          AAPL → appears on Dashboard open positions, NOT in queue
-- entry_missed:  TSLA (expired signal) → appears in neither queue nor Dashboard
------------------------------------------------------------------------------

INSERT INTO chaos.paper_trades (signal_id, ticker, setup_type, conviction_score, entry_zone, stop, target, status, correlation_note)
SELECT s.id, s.ticker, s.setup_type,
  CASE s.conviction WHEN 'High' THEN 3 WHEN 'Med' THEN 2 WHEN 'Low' THEN 1 END,
  (s.entry_low + s.entry_high) / 2.0,
  s.stop, s.target,
  'pending_entry', 'TEST_SEED_2026-05-27'
FROM chaos.signals s
WHERE s.ticker IN ('NVDA', 'AMD', 'MSFT', 'AVGO', 'CRM')
  AND s.notes = 'TEST_SEED_2026-05-12';

INSERT INTO chaos.paper_trades (signal_id, ticker, setup_type, conviction_score, entry_zone, stop, target, status, correlation_note)
SELECT s.id, s.ticker, s.setup_type,
  CASE s.conviction WHEN 'High' THEN 3 WHEN 'Med' THEN 2 WHEN 'Low' THEN 1 END,
  (s.entry_low + s.entry_high) / 2.0,
  s.stop, s.target,
  'open', 'TEST_SEED_2026-05-27'
FROM chaos.signals s
WHERE s.ticker = 'AAPL' AND s.notes = 'TEST_SEED_2026-05-12';

INSERT INTO chaos.paper_trades (signal_id, ticker, setup_type, conviction_score, entry_zone, stop, target, status, correlation_note)
SELECT s.id, s.ticker, s.setup_type,
  CASE s.conviction WHEN 'High' THEN 3 WHEN 'Med' THEN 2 WHEN 'Low' THEN 1 END,
  (s.entry_low + s.entry_high) / 2.0,
  s.stop, s.target,
  'entry_missed', 'TEST_SEED_2026-05-27'
FROM chaos.signals s
WHERE s.ticker = 'TSLA' AND s.notes = 'TEST_SEED_2026-05-12';

COMMIT;

------------------------------------------------------------------------------
-- 9. VERIFICATION
------------------------------------------------------------------------------
-- Expected: signals_open=6, signals_triggered=2, signals_expired=2,
--           trade_journal=2, shadow_trades=2, r_ratios=10, outcomes=1
--           paper_trades_queue=5 (pending_entry, linked), paper_trades_open=1, paper_trades_missed=1

SELECT 'signals_open'        AS bucket, count(*) FROM chaos.signals       WHERE status = 'open'      AND notes = 'TEST_SEED_2026-05-12'
UNION ALL
SELECT 'signals_triggered',           count(*) FROM chaos.signals       WHERE status = 'triggered' AND notes = 'TEST_SEED_2026-05-12'
UNION ALL
SELECT 'signals_expired',             count(*) FROM chaos.signals       WHERE status = 'expired'   AND notes = 'TEST_SEED_2026-05-12'
UNION ALL
SELECT 'trade_journal',               count(*) FROM chaos.trade_journal WHERE signal_id IN (SELECT id FROM chaos.signals WHERE notes = 'TEST_SEED_2026-05-12')
UNION ALL
SELECT 'shadow_trades',               count(*) FROM chaos.shadow_trades WHERE signal_id IN (SELECT id FROM chaos.signals WHERE notes = 'TEST_SEED_2026-05-12')
UNION ALL
SELECT 'r_ratios_computed',           count(*) FROM chaos.signals       WHERE r_ratio IS NOT NULL AND notes = 'TEST_SEED_2026-05-12'
UNION ALL
SELECT 'outcomes_computed',           count(*) FROM chaos.trade_journal WHERE outcome IS NOT NULL  AND signal_id IN (SELECT id FROM chaos.signals WHERE notes = 'TEST_SEED_2026-05-12')
UNION ALL
SELECT 'paper_trades_closed_seed',    count(*) FROM chaos.paper_trades  WHERE correlation_note = 'TEST_SEED_2026-05-27' AND signal_id IS NULL
UNION ALL
SELECT 'paper_trades_pending_entry',  count(*) FROM chaos.paper_trades  WHERE status = 'pending_entry' AND signal_id IN (SELECT id FROM chaos.signals WHERE notes = 'TEST_SEED_2026-05-12')
UNION ALL
SELECT 'paper_trades_open',           count(*) FROM chaos.paper_trades  WHERE status = 'open'          AND signal_id IN (SELECT id FROM chaos.signals WHERE notes = 'TEST_SEED_2026-05-12')
UNION ALL
SELECT 'paper_trades_entry_missed',   count(*) FROM chaos.paper_trades  WHERE status = 'entry_missed'  AND signal_id IN (SELECT id FROM chaos.signals WHERE notes = 'TEST_SEED_2026-05-12');
