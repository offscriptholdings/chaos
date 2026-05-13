// Mock data for the Chaos trading PWA shell.

export const SETUP_LABELS = {
  momentum_continuation: 'Momentum Continuation',
  ema_pullback: 'EMA Pullback',
  bb_squeeze_breakout: 'BB Squeeze Breakout',
  bb_mean_reversion: 'BB Mean Reversion',
  macd_crossover: 'MACD Crossover',
  breakout_retest: 'Breakout Retest',
};

function normalizeSignal(row) {
  return {
    id: row.id,
    ticker: row.ticker,
    setup: row.setup_type,
    conviction: row.conviction,
    direction: 'long',
    entry: row.entry_low ?? row.price_at_signal,
    stop: row.stop,
    target: row.target,
    r_ratio: row.r_ratio ?? null,
    signal_date: row.signal_date,
    indicator_snapshot: row.indicator_snapshot ?? null,
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
