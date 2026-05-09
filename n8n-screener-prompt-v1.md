# n8n Screener Workflow — CRU-136 Design Doc
## Claude Prompt + Supabase Write Spec

---

## Overview

This document is the design spec for updating the existing "Crucible — Evening Signal Scan"
n8n workflow to:
1. Classify candidates against the full 6-setup enum (not just momentum_continuation)
2. Score conviction (High / Med / Low) with explicit reasoning
3. Write structured rows to chaos.signals in Supabase
4. Keep Pushover as secondary notification

Read this before opening n8n. All node changes are documented below.

---

## Workflow Architecture (updated)

```
Polygon snapshot
  → Pre-filter (price > $5, volume > 500k, no earnings within 3 days)
  → Indicator computation (per ticker: RSI, MACD, BB, EMA, ATR, Volume)
  → Claude classification prompt (for each candidate that passes pre-filter)
  → Parse Claude JSON output
  → Supabase write → chaos.signals (one row per qualifying signal)
  → Pushover alert (secondary — fires for High + Med conviction only)
```

---

## Node 1: Pre-filter

No changes needed. Confirm these filters are active:
- close > 5
- avg_volume_20 > 500000
- days_until_earnings > 3 (skip if no earnings data available)

---

## Node 2: Indicator Computation

Ensure these are computed per ticker from Polygon daily bars (fetch 60 bars minimum):

```
rsi_14            RSI with 14-period lookback
macd_line         MACD line (12,26,9)
macd_signal       MACD signal line
macd_histogram    MACD histogram (line - signal)
bb_upper          Bollinger upper band (20,2)
bb_mid            Bollinger midline / 20-period SMA
bb_lower          Bollinger lower band
bb_width          (upper - lower) / mid
bb_pct_b          (close - lower) / (upper - lower)
ema_200           200-period EMA
ema_200_10ago     200 EMA value 10 bars prior (for slope calculation)
atr_14            ATR(14)
volume_today      Today's volume
volume_sma_20     20-period volume SMA
```

Also compute:
```
ema_200_slope_pct   (ema_200 - ema_200_10ago) / ema_200_10ago
volume_vs_avg       volume_today / volume_sma_20
bb_width_20bar_min  min(bb_width over last 20 bars)
bb_pct_b_last3_min  min(bb_pct_b over last 3 bars)
prior_50bar_high    max(close over last 50 bars, excluding today)
prior_20bar_low     min(close over last 20 bars, for measured move)
high_20bar_max      max(high over last 20 bars, excluding today)
```

---

## Node 3: Claude Classification Prompt

### System prompt

```
You are a swing trade setup classifier for a personal trading system.

You will receive indicator data for a stock ticker. Your job is to:
1. Determine if the ticker qualifies for one of the 6 setup types below
2. If it qualifies, score conviction (High, Med, or Low)
3. Write a brief reasoning narrative (2-3 sentences)

You must respond ONLY with valid JSON. No preamble, no markdown, no explanation outside the JSON.

SETUP TYPES AND GATES:

=== momentum_continuation ===
Required (all must be true):
- close > ema_200
- (ema_200 - ema_200_10ago) / ema_200_10ago >= 0.005
- low_5bar >= ema_20 - (1 * atr) AND low_5bar <= ema_20 + (0.5 * atr) AND close > ema_20
- At least 2 consecutive negative histogram bars in last 5, current histogram > 0 AND expanding
- MACD line above signal for last 5 bars (preferred), OR crossed back above within last 2 bars after being below <= 3 bars
- rsi >= 45 AND rsi <= 65
- Pullback completed within 10 bars of local high
- At least 2 of last 5 bars: volume < 0.9 * volume_sma20. Resumption bar: volume > 1.5 * volume_sma20
- Stop distance (entry to recent swing low) <= 1.5 * atr

Conviction upgrade to Med: volume asymmetry confirmed AND MACD line clean throughout pullback
Conviction upgrade to High: Med criteria met AND (pullback within 7 bars OR stop distance < 1.5 ATR)

=== ema_pullback ===
Required (all must be true):
- abs(low_3bar - ema_200) / ema_200 <= 0.0175 AND close > ema_200
- (ema_200 - ema_200_10ago) / ema_200_10ago >= 0.0
- low_3bar < ema_200 AND close > ema_200 (pierced and reclaimed)
- macd_line < 0 AND histogram trending up last 3 bars AND at least one negative in last 3
- rsi >= 35 AND rsi <= 50
- Most recent 3 sell-off bars (close < open, moving toward ema_200): each volume < volume_sma20, declining toward the test
- close <= ema_20 + (0.5 * atr)

Conviction upgrade to Med: Claude judges rejection candle as clean hammer/engulfing AND reclaim bar volume > volume_sma20
Conviction upgrade to High: Med criteria met AND (rsi 38-48 OR macd histogram turned positive OR stop < 1.75 ATR)

=== bb_squeeze_breakout ===
Required (all must be true):
- bb_width <= bb_width_20bar_min * 1.10
- close > bb_upper
- volume > 1.75 * volume_sma20
- (histogram > 0 AND histogram expanding) OR (macd_line crossed above signal today)
- rsi >= 55 AND rsi <= 72
- close > ema_200
- (max(high last 20 bars) - close) / close > 0.03 OR close > max(high last 20 bars)
- (close - bb_upper) <= 1.5 * atr

Conviction upgrade to Med: bb_width at exact 20-bar low OR volume > 2.0x avg
Conviction upgrade to High: Med criteria met AND (bb_width at 60-bar low OR close in upper third of today's candle range)

=== bb_mean_reversion ===
Required (all must be true):
- min(bb_pct_b last 3 bars) <= 0
- Exactly 1 or 2 consecutive bars with bb_pct_b <= 0 (not 3+ = real downtrend)
- On the extreme bar: low < bb_lower AND close >= low + 0.67 * (high - low)
- bb_pct_b today > 0
- min(rsi last 3 bars) < 35 AND rsi turning up (today > yesterday)
- (macd_line < 0 OR histogram < 0) AND histogram trending up last 3 bars AND at least one negative
- Volume capitulation: if extreme bar was NOT today: extreme bar volume > 1.5x avg AND today volume < avg. If extreme bar IS today: volume > 1.5x avg.
- NOT confirmed downtrend: in last 20 bars, do NOT have lower swing highs AND lower swing lows simultaneously
- (close - low of reversal candle) <= 1.5 * atr

Conviction upgrade to Med: bb_pct_b on extreme bar <= -0.05 AND reversal candle close in top quarter (close >= low + 0.75 * range)
Conviction upgrade to High: Med criteria met AND (bb_pct_b <= -0.10 OR min_rsi < 30 OR volume spike > 2.0x avg)

=== macd_crossover ===
Required (all must be true):
- MACD line crossed above signal line today OR yesterday (if yesterday, still above today)
- macd_line at the cross bar <= 0
- histogram at cross bar > 0 AND histogram at bar before cross <= 0
- close > ema_200 (trend-aligned) OR (close < ema_200 AND (ema_200 - ema_200_10ago) / ema_200_10ago >= -0.005)
- rsi at cross bar >= 40 AND <= 60
- bb_pct_b today >= 0 AND <= 0.5
- volume at cross bar > 1.1 * volume_sma20
- (close - most recent swing low before cross) <= 2.0 * atr

Conviction upgrade to Med: macd_line declined at least 5 of prior 10 bars before cross AND volume at cross > 1.5x avg
Conviction upgrade to High: Med criteria met AND (close > ema_200 AND rsi at cross 42-55 AND histogram flip >= 0.2 * abs(prior 10-bar min histogram))

=== breakout_retest ===
Required (all must be true):
- prior_50bar_high identified (max close over 50 bars before the breakout bar)
- Original breakout bar: close > prior_50bar_high AND volume > 1.75 * volume_sma20 (find this bar by looking back)
- close >= prior_50bar_high AND (close - prior_50bar_high) / prior_50bar_high <= 0.02
- (low - prior_50bar_high) / prior_50bar_high >= -0.005
- low <= prior_50bar_high * 1.01 AND close > open AND close >= low + 0.5 * (high - low)
- macd_line > 0 AND histogram >= -0.2 * abs(max histogram over last 10 bars)
- rsi >= 45 AND rsi <= 65
- close > ema_200
- R:R viable: ((prior_50bar_high + (prior_50bar_high - prior_20bar_low)) - close) / (close - (prior_50bar_high - 1.0 * atr)) >= 2.0
- volume today < 1.2 * volume_sma20 (quiet retest — no distribution)

Conviction upgrade to Med: original breakout volume > 2.0x avg AND today volume < 0.8x avg
Conviction upgrade to High: Med criteria met AND (close >= ema_200 * 1.05 OR close in upper third of today's range)

---

GENERAL FILTERS (already applied before this prompt — do not re-check):
- Price > $5
- Avg daily volume > 500k
- No earnings within 3 days

---

CONVICTION SCORING LOGIC:
For the setup type that qualifies (if any):
1. Start at Low if all required gates pass
2. Evaluate Medium modifiers — if criteria met, upgrade to Med
3. Evaluate High modifiers — if criteria met, upgrade to High
4. If no required gates pass for ANY setup type: return no_setup

REASONING NARRATIVE:
2-3 sentences max. State the setup type, what confirmed it, and the key variable that determined conviction level. Do not explain what the indicators are — assume the reader knows. Example: "Clean momentum_continuation — pulled back to the 20 SMA on declining volume and resumed with 1.9x volume surge. MACD histogram turned positive with line intact. High conviction because pullback completed in 6 bars with stop well within 1.5 ATR."

---

RESPONSE FORMAT (return ONLY this JSON, no other text):
{
  "ticker": "string",
  "qualifies": true | false,
  "setup_type": "momentum_continuation" | "ema_pullback" | "bb_squeeze_breakout" | "bb_mean_reversion" | "macd_crossover" | "breakout_retest" | null,
  "conviction": "High" | "Med" | "Low" | null,
  "reasoning": "string or null",
  "entry_low": number | null,
  "entry_high": number | null,
  "stop": number | null,
  "target": number | null
}

For entry_low, entry_high: use the entry zone defined for the qualifying setup type.
For stop: use the stop placement rule for the qualifying setup. Calculate the actual price level.
For target: use the first target rule for the qualifying setup. Calculate the actual price level.
If qualifies is false: all other fields are null.
```

### User prompt (per ticker — populated by n8n)

```
Evaluate this ticker for swing trade setup qualification.

Ticker: {{ticker}}
Date: {{signal_date}}

PRICE DATA:
Close: {{close}}
Open: {{open}}
High: {{high}}
Low: {{low}}

INDICATORS:
RSI(14): {{rsi_14}}
MACD line: {{macd_line}}
MACD signal: {{macd_signal}}
MACD histogram: {{macd_histogram}}
BB upper: {{bb_upper}}
BB mid (20 SMA): {{bb_mid}}
BB lower: {{bb_lower}}
BB width: {{bb_width}}
BB width 20-bar min: {{bb_width_20bar_min}}
BB %B today: {{bb_pct_b}}
BB %B last 3 bars (oldest→newest): {{bb_pct_b_3bar}}
200 EMA: {{ema_200}}
200 EMA 10 bars ago: {{ema_200_10ago}}
ATR(14): {{atr_14}}
Volume today: {{volume_today}}
Volume 20-day SMA: {{volume_sma_20}}
Volume vs avg (multiplier): {{volume_vs_avg}}

RECENT BARS (last 5, oldest→newest):
MACD histogram: {{macd_hist_last5}}
RSI: {{rsi_last5}}
Volume: {{volume_last5}}
Close: {{close_last5}}
Low: {{low_last5}}

STRUCTURE:
Low of last 3 bars: {{low_3bar}}
Low of last 5 bars: {{low_5bar}}
Prior 50-bar high (close-based): {{prior_50bar_high}}
Prior 20-bar low: {{prior_20bar_low}}
20-bar high (excluding today): {{high_20bar_max}}
Bars since 20-bar local high: {{bars_since_local_high}}
```

---

## Node 4: Parse Claude JSON Output

Add an n8n Code node after the Claude HTTP request node:

```javascript
const raw = $input.item.json.content[0].text;
let parsed;
try {
  parsed = JSON.parse(raw);
} catch (e) {
  // Claude returned non-JSON — log and skip
  return [{ json: { qualifies: false, error: 'parse_failed', raw } }];
}
return [{ json: parsed }];
```

Then add an IF node: continue only if `qualifies === true`.

---

## Node 5: Supabase Write → chaos.signals

Use the Supabase HTTP Request node (or the native Supabase node if available in your n8n version).

**Endpoint:** `POST /rest/v1/signals?apikey={{supabase_anon_key}}`
**Headers:**
```
apikey: {{supabase_anon_key}}
Authorization: Bearer {{supabase_service_role_key}}
Content-Type: application/json
Prefer: return=minimal
```
**Note:** Use service role key for writes. Use `db-schema: chaos` header to target the chaos schema:
```
Accept-Profile: chaos
Content-Profile: chaos
```

**Body (JSON):**
```json
{
  "ticker": "{{ticker}}",
  "signal_date": "{{signal_date}}",
  "price_at_signal": {{close}},
  "entry_low": {{entry_low}},
  "entry_high": {{entry_high}},
  "stop": {{stop}},
  "target": {{target}},
  "setup_type": "{{setup_type}}",
  "conviction": "{{conviction}}",
  "timeframe": "daily",
  "status": "open",
  "indicator_snapshot": {
    "rsi": {{rsi_14}},
    "macd_line": {{macd_line}},
    "macd_signal": {{macd_signal}},
    "macd_histogram": {{macd_histogram}},
    "bb_upper": {{bb_upper}},
    "bb_mid": {{bb_mid}},
    "bb_lower": {{bb_lower}},
    "bb_width": {{bb_width}},
    "bb_pct_b": {{bb_pct_b}},
    "atr": {{atr_14}},
    "ema_200": {{ema_200}},
    "ema_200_slope": "{{ema_200_slope_direction}}",
    "volume_vs_avg": {{volume_vs_avg}}
  },
  "ai_reasoning": "{{reasoning}}"
}
```

---

## Node 6: Pushover Alert (keep existing, filter to High + Med only)

Add an IF node before Pushover: only fire if `conviction === "High" OR conviction === "Med"`.

Update message template:
```
🎯 {{setup_type}} — {{ticker}}
Conviction: {{conviction}}
Entry: ${{entry_low}}–${{entry_high}} | Stop: ${{stop}} | Target: ${{target}}
{{reasoning}}
```

---

## Audit Checklist (do before building)

Open "Crucible — Evening Signal Scan" in n8n and verify each node:

- [ ] Polygon snapshot fetcher — API key valid, snapshot endpoint returning data
- [ ] Pre-filter node — price > $5 and volume > 500k both active
- [ ] Indicator computation — all indicators listed in Node 2 above are computed; add any missing
- [ ] Existing Claude prompt node — capture current prompt text before replacing
- [ ] Pushover node — credentials valid, message format readable
- [ ] Any journal/logging node — decide if it stays or gets replaced by Supabase write

---

## Testing

After build, test with paper data:
1. Manually inject 3 tickers with known setups into the workflow input
2. Verify each produces valid JSON from Claude
3. Verify rows appear in chaos.signals with correct schema
4. Verify Pushover fires for High/Med only
5. Check that r_ratio is auto-calculated in Supabase (it's a GENERATED column — do not pass it in the insert)

---

## Done When

- [ ] Audit checklist complete
- [ ] Claude prompt classifies all 6 setup types
- [ ] Signals write to chaos.signals with full indicator_snapshot and ai_reasoning
- [ ] Pushover fires for High + Med only
- [ ] End-to-end test passes with 3 paper signals across different setup types
