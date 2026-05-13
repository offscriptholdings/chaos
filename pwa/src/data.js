// Mock data for the Chaos trading PWA shell.

export const SETUP_LABELS = {
  momentum_continuation: 'Momentum Continuation',
  ema_pullback: 'EMA Pullback',
  bb_squeeze_breakout: 'BB Squeeze Breakout',
  bb_mean_reversion: 'BB Mean Reversion',
  macd_crossover: 'MACD Crossover',
  breakout_retest: 'Breakout Retest',
};

export const SIGNALS = [
  {
    id: 'sig-nvda-1',
    ticker: 'NVDA',
    setup: 'momentum_continuation',
    conviction: 'High',
    direction: 'long',
    entry: 482.40,
    stop: 471.10,
    target: 512.80,
    rr: 2.69,
    age: '4m ago',
    note: 'Tagged on 5m close above prior consolidation; volume confirmed at the breakout bar.',
    indicators: [
      { label: 'RSI (14)', value: '63.2', state: 'ok' },
      { label: 'MACD hist', value: '+0.84', state: 'ok' },
      { label: 'EMA 20 / 50', value: 'Stacked', state: 'ok' },
      { label: 'ATR (14)', value: '11.4', state: 'neutral' },
      { label: 'Rel. Vol', value: '1.84x', state: 'ok' },
      { label: 'Spread', value: '2bp', state: 'ok' },
    ],
  },
  {
    id: 'sig-msft-1',
    ticker: 'MSFT',
    setup: 'ema_pullback',
    conviction: 'Med',
    direction: 'long',
    entry: 412.05,
    stop: 406.20,
    target: 425.60,
    rr: 2.31,
    age: '11m ago',
    note: 'Pullback into rising 20EMA on lower volume; trigger on reclaim of 5m VWAP.',
    indicators: [
      { label: 'RSI (14)', value: '54.8', state: 'neutral' },
      { label: 'MACD hist', value: '+0.12', state: 'neutral' },
      { label: 'EMA 20 / 50', value: 'Stacked', state: 'ok' },
      { label: 'ATR (14)', value: '4.9', state: 'neutral' },
      { label: 'Rel. Vol', value: '0.92x', state: 'warn' },
      { label: 'Spread', value: '1bp', state: 'ok' },
    ],
  },
  {
    id: 'sig-amd-1',
    ticker: 'AMD',
    setup: 'bb_squeeze_breakout',
    conviction: 'High',
    direction: 'long',
    entry: 168.85,
    stop: 164.40,
    target: 180.10,
    rr: 2.53,
    age: '23m ago',
    note: 'Bands at 18-day low width; breakout candle expanded range 1.4x ATR.',
    indicators: [
      { label: 'BB Width', value: '0.038', state: 'ok' },
      { label: 'RSI (14)', value: '61.0', state: 'ok' },
      { label: 'MACD hist', value: '+0.31', state: 'ok' },
      { label: 'ATR (14)', value: '5.1', state: 'neutral' },
      { label: 'Rel. Vol', value: '2.10x', state: 'ok' },
      { label: 'Spread', value: '1bp', state: 'ok' },
    ],
  },
  {
    id: 'sig-aapl-1',
    ticker: 'AAPL',
    setup: 'bb_mean_reversion',
    conviction: 'Low',
    direction: 'long',
    entry: 188.40,
    stop: 185.90,
    target: 193.20,
    rr: 1.92,
    age: '38m ago',
    note: 'Tag of lower band on RSI div; counter-trend, half-size only per playbook.',
    indicators: [
      { label: 'RSI (14)', value: '32.4', state: 'ok' },
      { label: 'MACD hist', value: '-0.18', state: 'warn' },
      { label: 'EMA 20 / 50', value: 'Inverted', state: 'warn' },
      { label: 'ATR (14)', value: '2.8', state: 'neutral' },
      { label: 'Rel. Vol', value: '1.05x', state: 'neutral' },
      { label: 'Spread', value: '1bp', state: 'ok' },
    ],
  },
];

export const POSITIONS = [
  {
    id: 'pos-1',
    ticker: 'NVDA',
    type: 'live',
    setup: 'momentum_continuation',
    entry: 478.20,
    current: 489.65,
    stop: 471.10,
    target: 512.80,
    r: 1.32,
    daysHeld: 2,
    pnlPct: 2.39,
  },
  {
    id: 'pos-2',
    ticker: 'AMD',
    type: 'paper',
    setup: 'bb_squeeze_breakout',
    entry: 168.10,
    current: 170.05,
    stop: 164.40,
    target: 180.10,
    r: 0.46,
    daysHeld: 1,
    pnlPct: 1.16,
  },
];

export const SHADOW_TRADES = [
  {
    id: 'sh-1',
    ticker: 'TSLA',
    setup: 'breakout_retest',
    passedAt: 'Yesterday',
    entry: 184.50,
    target: 192.40,
    hit: 'target',
    wouldR: 2.20,
    note: 'Passed — sentiment was risk-off; would have hit target intraday.',
  },
  {
    id: 'sh-2',
    ticker: 'META',
    setup: 'macd_crossover',
    passedAt: '2d ago',
    entry: 488.20,
    target: 502.10,
    hit: 'target',
    wouldR: 1.85,
    note: 'Passed — already had 2 open longs in tech. Setup played out clean.',
  },
];

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

export const SETUPS = [
  {
    key: 'momentum_continuation',
    blurb: 'Trend-day continuations off shallow consolidation.',
    thresholds: ['EMA 20 / 50 stacked', 'Rel-vol >= 1.5x', 'RSI 55-70', 'No earnings within 2 days'],
  },
  {
    key: 'ema_pullback',
    blurb: 'Buy-the-dip to rising 20EMA on a healthy uptrend.',
    thresholds: ['20EMA above 50EMA', 'Pullback <= 1x ATR', 'Reclaim of 5m VWAP', 'Rel-vol < 1.0x into pullback'],
  },
  {
    key: 'bb_squeeze_breakout',
    blurb: 'Volatility expansion out of 14-day low BB width.',
    thresholds: ['BB width 14-day percentile <= 10%', 'Range bar >= 1.3x ATR', 'Rel-vol >= 1.8x', 'No major news pending'],
  },
  {
    key: 'bb_mean_reversion',
    blurb: 'Counter-trend tags of outer bands at exhaustion.',
    thresholds: ['Tag of 2-sigma band', 'RSI < 30 or > 70', 'Half-size only', 'No active trend regime'],
  },
  {
    key: 'macd_crossover',
    blurb: 'Daily MACD signal cross with confirming volume.',
    thresholds: ['Daily MACD signal cross', 'Hist > 0 and rising', 'Above 200 EMA', 'Rel-vol >= 1.2x'],
  },
  {
    key: 'breakout_retest',
    blurb: 'Re-entry into prior breakout level with hold.',
    thresholds: ['Prior breakout <= 5 days old', 'Retest holds with reversal bar', 'Rel-vol >= 1.4x', 'Stop < 0.8x ATR'],
  },
];

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
