// Mock data for the Chaos trading PWA shell.

export const SETUP_LABELS = {
  momentum_continuation: 'Momentum Continuation',
  ema_pullback: 'EMA Pullback',
  bb_squeeze_breakout: 'BB Squeeze Breakout',
  bb_mean_reversion: 'BB Mean Reversion',
  macd_crossover: 'MACD Crossover',
  breakout_retest: 'Breakout Retest',
};

const INDICATOR_LABELS = {
  rsi_14: 'RSI 14',
  rel_vol: 'Rel Vol',
  macd_hist: 'MACD Hist',
  macd_line: 'MACD',
  macd_signal: 'MACD Sig',
  ema_200: 'EMA 200',
  ema_50: 'EMA 50',
  ema_20: 'EMA 20',
  atr_14: 'ATR 14',
  bb_width: 'BB Width',
  bb_width_pctile_14d: 'BB %ile',
  bb_pct_b: 'BB %B',
  prior_breakout_bars_ago: 'Brk Bars',
};

function indicatorState(key, value) {
  if (key.startsWith('rsi')) return value >= 30 && value <= 70 ? 'ok' : 'warn';
  if (key === 'rel_vol') return value >= 1 ? 'ok' : value < 0.5 ? 'warn' : 'neutral';
  if (key === 'macd_hist') return value > 0 ? 'ok' : value < -0.1 ? 'warn' : 'neutral';
  return 'neutral';
}

function normalizeSignal(row) {
  const snap = row.indicator_snapshot ?? {};
  const indicators = Object.entries(snap).map(([k, v]) => ({
    label: INDICATOR_LABELS[k] ?? k.replace(/_/g, ' ').toUpperCase(),
    value: typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v),
    state: indicatorState(k, v),
  }));
  const signalDate = row.signal_date ? new Date(row.signal_date) : null;
  const age = signalDate ? Math.floor((Date.now() - signalDate.getTime()) / 86400000) + 'd' : null;
  return {
    id: row.id,
    ticker: row.ticker,
    setup: row.setup_type,
    conviction: row.conviction,
    direction: 'long',
    entry: row.entry_low ?? row.price_at_signal,
    stop: row.stop,
    target: row.target,
    rr: row.r_ratio ?? null,
    signal_date: row.signal_date,
    age,
    notes: row.notes ?? null,
    indicators,
    memo: row.memo ?? null,
    memo_generated_at: row.memo_generated_at ?? null,
    memo_addendum: row.memo_addendum ?? null,
    addendum_generated_at: row.addendum_generated_at ?? null,
  };
}

export async function fetchSignals() {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/paper_trades?status=eq.pending_entry&select=*,signals!signal_id(*)&order=created_at.desc&limit=50`,
    {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Accept-Profile': 'chaos',
      },
    }
  );
  if (!res.ok) throw new Error(`fetchSignals failed: ${res.status}`);
  const rows = await res.json();
  return rows
    .filter(pt => pt.signals && pt.signals.status !== 'triggered')
    .map(pt => normalizeSignal(pt.signals));
}

export async function fetchSignalById(id) {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/signals?id=eq.${id}&limit=1`,
    {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Accept-Profile': 'chaos',
      },
    }
  );
  if (!res.ok) throw new Error(`fetchSignalById failed: ${res.status}`);
  const rows = await res.json();
  return rows[0] ? normalizeSignal(rows[0]) : null;
}

export const JOURNAL = [
  {
    id: 'j-1',
    ticker: 'MSFT',
    setup: 'ema_pullback',
    closed: 'Tue',
    result: 'win',
    r: 1.74,
    pnlPct: 2.05,
    entryNote: 'Pullback to 20EMA, reclaim of VWAP, rel-vol confirmed.',
    exitNote: 'Hit T1 mid-session, trailed remainder to even and stopped.',
  },
  {
    id: 'j-2',
    ticker: 'COIN',
    setup: 'bb_squeeze_breakout',
    closed: 'Mon',
    result: 'win',
    r: 2.42,
    pnlPct: 4.10,
    entryNote: 'Squeeze break with 2.3x rel-vol, sector confirmation from MSTR.',
    exitNote: 'Trail-stop on 5m EMA; clean target tag end of day.',
  },
  {
    id: 'j-3',
    ticker: 'GOOGL',
    setup: 'momentum_continuation',
    closed: 'Last Fri',
    result: 'loss',
    r: -1.00,
    pnlPct: -0.92,
    entryNote: 'Continuation tag, but market regime flipped at lunch.',
    exitNote: 'Stopped clean. Followed plan — no chase.',
  },
];

export async function fetchCriteria() {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/trading_criteria?is_active=eq.true&order=setup_type.asc`,
    {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Accept-Profile': 'chaos',
      },
    }
  );
  if (!res.ok) throw new Error(`fetchCriteria failed: ${res.status}`);
  return res.json();
}

/** All versions for one setup_type, newest first */
export async function fetchAllVersionsForSetup(setupType) {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/trading_criteria?setup_type=eq.${encodeURIComponent(setupType)}&order=version.desc`,
    {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Accept-Profile': 'chaos',
      },
    }
  );
  if (!res.ok) throw new Error(`fetchAllVersionsForSetup failed: ${res.status}`);
  return res.json();
}

/** Insert a new trading_criteria row with is_active=false. Version = MAX(version)+1 for setup_type. */
export async function saveDraftCriteria({ setupType, label, thresholds }) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const maxRes = await fetch(
    `${url}/rest/v1/trading_criteria?setup_type=eq.${encodeURIComponent(setupType)}&select=version&order=version.desc&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Accept-Profile': 'chaos',
      },
    }
  );
  if (!maxRes.ok) throw new Error(`saveDraftCriteria max-version lookup failed: ${maxRes.status}`);
  const maxRows = await maxRes.json();
  const nextVersion = (maxRows[0]?.version ?? 0) + 1;

  const insertRes = await fetch(`${url}/rest/v1/trading_criteria`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Accept-Profile': 'chaos',
      'Content-Profile': 'chaos',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      setup_type: setupType,
      version: nextVersion,
      label,
      thresholds,
      is_active: false,
    }),
  });
  if (!insertRes.ok) throw new Error(`saveDraftCriteria insert failed: ${insertRes.status}`);
  const rows = await insertRes.json();
  return rows[0];
}

/** Deactivate the current active version, then activate the target version (two PATCH calls — not atomic). */
export async function activateCriteriaVersion({ setupType, versionId }) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const writeHeaders = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Accept-Profile': 'chaos',
    'Content-Profile': 'chaos',
    'Content-Type': 'application/json',
  };

  const deactivateRes = await fetch(
    `${url}/rest/v1/trading_criteria?setup_type=eq.${encodeURIComponent(setupType)}&is_active=eq.true`,
    {
      method: 'PATCH',
      headers: writeHeaders,
      body: JSON.stringify({ is_active: false }),
    }
  );
  if (!deactivateRes.ok) throw new Error(`activateCriteriaVersion deactivate failed: ${deactivateRes.status}`);

  const activateRes = await fetch(
    `${url}/rest/v1/trading_criteria?id=eq.${encodeURIComponent(versionId)}`,
    {
      method: 'PATCH',
      headers: writeHeaders,
      body: JSON.stringify({ is_active: true }),
    }
  );
  if (!activateRes.ok) throw new Error(`activateCriteriaVersion activate failed: ${activateRes.status}`);
}

/** Parses JSON text; returns { ok, value, error }. */
export function parseThresholdJson(text) {
  try {
    const value = JSON.parse(text);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, value: null, error: 'Thresholds must be a JSON object' };
    }
    return { ok: true, value, error: null };
  } catch (e) {
    return { ok: false, value: null, error: e.message };
  }
}

const titleCase = (snake) =>
  snake.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export function parseThresholds(row) {
  const t = row?.thresholds ?? {};
  const out = [];

  const gates = t.gates ?? {};
  for (const [name, cfg] of Object.entries(gates)) {
    let label = titleCase(name);
    if (cfg && typeof cfg === 'object') {
      if (typeof cfg.min === 'number' && typeof cfg.max === 'number') {
        label += ` ${cfg.min}–${cfg.max}`;
      } else if (typeof cfg.max_atr_multiplier === 'number') {
        label += ` ≤ ${cfg.max_atr_multiplier}× ATR`;
      } else if (typeof cfg.min_multiplier === 'number') {
        label += ` ≥ ${cfg.min_multiplier}× avg`;
      }
    }
    out.push(label);
  }

  if (t.targets && typeof t.targets.min_rr === 'number') {
    out.push(`Min R/R ≥ ${t.targets.min_rr}`);
  }

  return out;
}

/** Fetch open trade_journal rows joined to signals, date_closed IS NULL */
export async function fetchOpenPositions() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(
    `${url}/rest/v1/trade_journal?select=*,signals(ticker,setup_type)&date_closed=is.null&order=date_opened.desc`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Accept-Profile': 'chaos',
      },
    }
  );
  if (!res.ok) throw new Error(`fetchOpenPositions failed: ${res.status}`);
  return res.json();
}

/** Fetch paper_trades where status='open' (auto-filled entry window), joined to signals */
export async function fetchPaperOpenPositions() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(
    `${url}/rest/v1/paper_trades?status=eq.open&select=*,signals!signal_id(ticker,setup_type)&order=created_at.desc`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Accept-Profile': 'chaos',
      },
    }
  );
  if (!res.ok) throw new Error(`fetchPaperOpenPositions failed: ${res.status}`);
  return res.json();
}

export async function fetchBacktestRuns() {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/backtest_runs` +
    `?select=id,setup_type,ticker_universe,status,progress_pct,tickers_processed,tickers_total,` +
    `current_step,error_message,created_at,date_range_start,date_range_end,` +
    `backtest_results!run_id(win_rate,avg_r,best_r,worst_r,max_drawdown,total_signals,total_trades)` +
    `&order=created_at.desc&limit=20`;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Accept-Profile': 'chaos',
    },
  });
  if (!res.ok) throw new Error(`fetchBacktestRuns failed: ${res.status}`);
  return res.json();
}

export async function insertBacktestRun({ setup_type, ticker_universe, date_range_start, date_range_end }) {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const base = import.meta.env.VITE_SUPABASE_URL;
  const criteriaRes = await fetch(
    `${base}/rest/v1/trading_criteria?setup_type=eq.${encodeURIComponent(setup_type)}&is_active=eq.true&select=id`,
    { headers: { apikey: key, Authorization: `Bearer ${key}`, 'Accept-Profile': 'chaos' } },
  );
  let criteria_version_id = null;
  if (criteriaRes.ok) {
    const rows = await criteriaRes.json();
    if (rows.length > 0) criteria_version_id = rows[0].id;
  }
  const insertRes = await fetch(`${base}/rest/v1/backtest_runs`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Profile': 'chaos',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ setup_type, ticker_universe, date_range_start, date_range_end, criteria_version_id, triggered_by: 'pwa' }),
  });
  if (!insertRes.ok) throw new Error(`insertBacktestRun failed: ${insertRes.status}`);
  const rows = await insertRes.json();
  return rows[0];
}

export async function triggerBacktestWebhook(runId) {
  try {
    const res = await fetch('https://n8n.meridiantechco.com/webhook/chaos-backtest-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: runId }),
    });
    if (!res.ok) console.warn(`triggerBacktestWebhook non-2xx: ${res.status}`);
  } catch (e) {
    console.warn('triggerBacktestWebhook error:', e);
  }
}

export const SENTIMENT = {
  headline: 'Risk-on, narrow leadership',
  body: 'Broad indices are extending above the 200 EMA but breadth is thinning into the close. Mega-cap tech is carrying the tape; small-caps and energy lagged again today. Watch for a regime check if 200 EMA breaks on a daily close.',
  bullets: [
    'SPY +0.4% above 200 EMA, ADX rising',
    'VIX 13.2 — compressed; squeeze-style setups favored',
    'Sector breadth: Tech +1.1%, Energy -0.8%, Financials flat',
    'Earnings drag: 4 names in watchlist within 2 sessions',
  ],
  ts: 'Updated 6 min ago',
};

export const REGIME = {
  state: 'Trending',
  detail: 'SPY +0.4% above 200 EMA · Breadth thinning',
};

export async function fetchRegime() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(
    `${url}/rest/v1/market_regime?order=date.desc&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows[0]) return null;
  return {
    state: rows[0].regime_tag ?? 'Unknown',
    detail: rows[0].spy_price ? `SPY ${rows[0].spy_price}` : '',
  };
}

export async function fetchClosedPaperTrades() {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/paper_trades?select=conviction_score,setup_type,outcome,r_multiple&status=eq.closed`,
    { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Accept-Profile': 'chaos' } }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSetupDetail(setupType) {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/paper_trades?setup_type=eq.${encodeURIComponent(setupType)}&status=in.(open,closed)&select=id,ticker,setup_type,conviction_score,status,outcome,r_multiple,entry_zone,stop,target,bars_to_exit,mfe_r,mae_r,post_exit_run_r,entry_confirmed_at,resolved_at,signals!signal_id(signal_date)&order=resolved_at.desc.nullslast`,
      {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Accept-Profile': 'chaos',
        },
      }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchIntelBrief() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(
    `${url}/rest/v1/intel_briefs?select=brief_date,narrative,sections,generated_at&order=brief_date.desc&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Accept-Profile': 'chaos',
      },
    }
  );
  if (!res.ok) throw new Error(`intel_briefs fetch failed: ${res.status}`);
  const rows = await res.json();
  return rows[0] ?? null;
}
