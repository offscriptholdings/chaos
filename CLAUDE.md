# CLAUDE.md — Chaos Trading OS

Last updated: 2026-05-09

---

## What this repo is

Chaos is a personal swing trading OS. It has two parts:

1. **n8n screener** — nightly workflow that scans the market, computes indicators, classifies setups via Claude API, and writes signals to Supabase
2. **PWA** (`/pwa`) — mobile-first web app for reviewing signals, managing trades, journaling, and running backtests

This is a personal system. No multi-user, no auth layer beyond Supabase RLS.

---

## Repo structure

```
chaos/
  Crucible — Evening Signal Scan — v2.json   ← n8n workflow (import to n8n.crucibleos.io)
  n8n-screener-prompt-v1.md                  ← design doc for the screener workflow
  CLAUDE.md                                  ← this file
  pwa/
    index.html        ← Vite entry point — only <head> + #root + main.jsx script
    package.json      ← Vite + React 18 deps, scripts (dev/build/preview)
    vite.config.js    ← Vite config — base /, output dist/, publicDir public/
    vercel.json       ← Vite framework, build command, SPA rewrites, SW headers
    .env.example      ← documents VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
    public/
      manifest.json   ← PWA manifest, theme #3D5A7A — served at /manifest.json
      sw.js           ← cache-first service worker — served at /sw.js
    src/
      main.jsx        ← Vite entry: ReactDOM.createRoot + service worker registration
      App.jsx         ← root App, tab routing, bottom nav (default export)
      views.jsx       ← 8 tab views
      components.jsx  ← shared UI: Card, SignalCard, AppBar, etc.
      icons.jsx       ← inline SVG icon components
      data.js         ← mock data (replace with Supabase calls per tab)
```

---

## PWA architecture

**Vite + React 18.** ES modules, `import.meta.env.VITE_*` for environment variables, Vercel-native build. All `src/` files use explicit `import` / `export` — no global `window` exposure.

```
main.jsx → App.jsx → views.jsx + components.jsx + icons.jsx + data.js
```

**Dev / build commands** (run from `pwa/`):
- `npm install` — install deps
- `npm run dev` — local dev server with HMR
- `npm run build` — production bundle to `dist/`
- `npm run preview` — serve the production build locally

**Environment variables** live in Vercel project settings (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and are never committed. `.env.example` documents the required vars without values. Local dev: copy `.env.example` to `.env.local` and fill in.

**Design system:**
- Fonts: Playfair Display (tickers/headers), Carlito (body/UI), DM Mono (numbers)
- Colors: `--white #FAFAF8`, `--slate #3D5A7A` (primary), `--gold #B8893A`, `--green #2E7D5A`, `--red #C0392B`, `--muted #8A8A94`
- Tailwind via CDN — use inline arbitrary values (`text-[#3D5A7A]`) not custom config
- Mobile frame: max-width 480px, full-height, rounded corners on desktop

**8 tabs:** Dashboard, Signal Queue, Signal Detail (hidden/drill-in), Shadow Trades, Journal, Market Intel, Backtest, Criteria

**Deployment:** Vercel static site, root directory = `pwa/`. Auto-deploys from GitHub `chaos` repo.

---

## Supabase

**Project ID:** `dbnkkournwhgnguugbnq` (CrucibleOS project, us-east-1)

**Schema:** `chaos` (separate from `public`)

All Chaos tables live in the `chaos` schema. When using the Supabase JS client, initialize with `db: { schema: 'chaos' }`. When using the REST API directly (e.g. from n8n), add headers:
- `Accept-Profile: chaos`
- `Content-Profile: chaos`

**Tables:**

| Table | Purpose |
|---|---|
| `chaos.trading_criteria` | Versioned setup criteria. One active row per setup_type. |
| `chaos.signals` | AI-classified signals from nightly screener. r_ratio is a GENERATED column. |
| `chaos.trade_journal` | Actual trades (live + paper). actual_r and outcome are GENERATED columns. trade_mode is immutable after insert. |
| `chaos.shadow_trades` | Signals that were passed — tracked to outcome. |
| `chaos.backtest_runs` | PWA↔n8n handshake for backtest execution. |
| `chaos.backtest_results` | Per-signal backtest outcome rows, FK to backtest_runs (CASCADE). |

**RLS:** Enabled on all tables. Policy: `owner_all USING (true) WITH CHECK (true)` on all tables.

**Supabase credential in n8n:** ID `IoaagakstuDyI61D` ("Supabase account")

---

## n8n screener workflow

**File:** `Crucible — Evening Signal Scan — v2.json`

**Instance:** `n8n.crucibleos.io` (self-hosted DigitalOcean, Cloudflare tunnel)

**Schedule:** 4:15pm ET weekdays (cron: `0 15 16 * * 1-5`)

**Pipeline:**

```
Market Close Trigger
→ Polygon Full Market Snapshot
→ Pre-Filter Candidates (price ≥ $5, vol ≥ 500k, cap 40 tickers)
→ Polygon Daily Bars (60 bars per ticker, desc order)
→ Compute Indicators (JS Code node — EMA, RSI, MACD, BB, ATR, volume SMA)
→ Sufficient Data? (IF node — checks sufficient_data: true)
→ Claude — Classify Setup (POST to Anthropic API, batch 2, interval 2000ms)
→ Parse Claude Response (extracts JSON, attaches indicator snapshot)
→ Qualifies? (IF node — checks qualifies: true)
→ Write to chaos.signals (Supabase REST, chaos schema headers)
→ High or Med Only? (IF node — filters Low conviction)
→ Pushover Alert
```

**n8n Variables required:**
- `ANTHROPIC_API_KEY`
- `PUSHOVER_APP_TOKEN`
- `PUSHOVER_USER_KEY`

**Polygon API key:** `L8wCDo8xEcU_Pw_Dc5c8JrpdeGzFBtS7`

**Claude model:** `claude-sonnet-4-6`

**Rate limit notes:**
- Anthropic limit: 30,000 TPM on this account
- Each prompt: ~1,500 input tokens
- Batch size 2, interval 2000ms keeps well under limit at 40 tickers (~$0.30/run)

**Indicator computation notes:**
- EMA 200 is warm-started from available bars (60 max) — approximate but sufficient for trend direction
- All `.toFixed()` calls use `fp(v, d)` helper that returns null instead of throwing on undefined
- Bars are filtered for complete OHLCV before indicator computation

---

## 6 setup types

All seeded into `chaos.trading_criteria` version 1.

| Setup type | Linear | Description |
|---|---|---|
| `momentum_continuation` | CRU-164 | Trend pullback resumption |
| `ema_pullback` | CRU-165 | Bounce off 200 EMA |
| `bb_squeeze_breakout` | CRU-166 | Volatility expansion from tight bands |
| `bb_mean_reversion` | CRU-167 | Fade to lower band at exhaustion |
| `macd_crossover` | CRU-168 | MACD line crosses signal |
| `breakout_retest` | CRU-169 | Re-entry after confirmed breakout |

Conviction levels: High, Med, Low. Gate-based (required numeric criteria) + AI conviction scoring.

---

## Linear project

**Project:** Chaos (`37f7b472-f473-4bed-82a0-3003efc23fda`)

**Active tickets:**

| Ticket | Title | Status |
|---|---|---|
| CRU-136 | n8n screener workflow | Backlog — in testing |
| CRU-31 | Chaos PWA shell | Backlog — shell built, wiring next |
| CRU-132 | Signal Queue tab | Backlog |
| CRU-133 | Journal tab | Backlog |
| CRU-134 | Sentiment tab | Backlog |
| CRU-135 | AI signal scoring | Backlog |
| CRU-170 | Signal Detail view | Backlog |
| CRU-171 | Shadow Trades tab | Backlog |
| CRU-172 | Criteria version comparison | Backlog |
| CRU-32 | Dashboard tab | Backlog |
| CRU-33 | Criteria editor | Backlog |
| CRU-30 | Wire criteria from Supabase at runtime | Backlog |

**Done:**
- CRU-110: Chaos schema built
- CRU-163: All 6 criteria locked
- CRU-29: trading_criteria seeded

---

## Next build priorities

1. **CRU-136** — Complete n8n test run end-to-end. Verify signal lands in `chaos.signals`, Pushover fires.
2. **CRU-31 / CRU-132** — Wire Signal Queue tab to real Supabase data (`chaos.signals` where `status = 'open'`). This is the first live data connection.
3. **Deploy PWA** — Push to GitHub, connect to Vercel with root dir `pwa/`.

---

## Working conventions

- Mock data lives in `data.js`. Replace per-tab with Supabase fetch calls — don't rip out mock data globally until the tab is wired.
- Each tab view is self-contained in `views.jsx`. Add new views there, register them in `app.jsx` TABS array.
- When adding Supabase calls to the PWA, use fetch() directly against the Supabase REST API — no JS client needed for a CDN-based setup. Pattern: `fetch('https://dbnkkournwhgnguugbnq.supabase.co/rest/v1/signals', { headers: { 'apikey': ANON_KEY, 'Accept-Profile': 'chaos' } })`
- Anon key: get from Supabase dashboard — don't hardcode in CLAUDE.md
- n8n workflow JSON lives in repo root. Always export and overwrite after changes.

---

## Foundry conventions

This repo is managed by Foundry — David's autonomous build pipeline. Builder agent writes all code. Reviewer agent reviews all PRs. David only touches: morning approval, Vercel preview test, merge.

**Branch naming:**
```
feature/[TICKET-ID]-short-description
fix/[TICKET-ID]-short-description
chore/[TICKET-ID]-short-description
```
- Lowercase only, hyphens not underscores
- Short description max 4 words
- Type prefix: feature (new functionality), fix (bug), chore (maintenance)

**Commit format:**
```
[TICKET-ID] type: short description

- what was built
- what was changed
- what was left out of scope
```
Types: feat, fix, chore, refactor, test

**PR conventions:**
- Title: `[TICKET-ID]: Short description of what was built`
- Always opened as draft
- Always labeled `foundry-build`
- Body uses template at `~/Developer/foundry/templates/pr-template.md`

**Builder reads before touching any code:**
1. `~/Developer/foundry/specs/[TICKET-ID]-spec.md`
2. This file (CLAUDE.md)
3. `git log --oneline -20`
