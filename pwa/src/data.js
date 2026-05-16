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
  };
}

export async function fetchSignals() {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/signals?status=eq.open&order=created_at.desc&limit=50`,
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
  return rows.map(normalizeSignal);
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

export const BACKTESTS = [
  { id: 'bt-1', name: 'EMA Pullback / SPY universe / 1y', winRate: 0.58, expectancy: 0.72, trades: 142, sharpe: 1.34 },
  { id: 'bt-2', name: 'BB Squeeze / Liquid US / 6mo', winRate: 0.49, expectancy: 0.91, trades: 88, sharpe: 1.61 },
  { id: 'bt-3', name: 'Momentum / Top 50 by ADV / 2y', winRate: 0.54, expectancy: 0.45, trades: 318, sharpe: 1.05 },
];

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

export async function fetchSentiment() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(
    `${url}/rest/v1/daily_briefs?select=date,sections,generated_at&order=date.desc&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows[0]) return null;
  const trading = rows[0].sections?.trading ?? {};
  const genAt = rows[0].generated_at ? new Date(rows[0].generated_at) : null;
  const minAgo = genAt ? Math.round((Date.now() - genAt.getTime()) / 60000) : null;
  const ts = minAgo !== null
    ? (minAgo < 60 ? `Updated ${minAgo} min ago` : `Updated ${Math.round(minAgo / 60)}h ago`)
    : '';
  return {
    headline: trading.regime ?? 'No market data',
    body: trading.note ?? '',
    ts,
  };
}
