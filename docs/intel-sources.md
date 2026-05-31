# Chaos Intel — RSS Source List

Vetted headline sources for the daily market brief.
Bootstrap: **MTC-258**. Consumed by **MTC-259** (daily fetch → LLM compose → `chaos.intel_briefs`).

**Rules:** headlines only (title + link + pubDate) — do **not** ingest article bodies (keeps the LLM prompt small). v1 is free-tier only.

## Sources (4 approved)

| Source | Feed URL | Type | Notes |
|---|---|---|---|
| **WSJ Markets** | `https://feeds.a.dj.com/rss/RSSMarketsMain.xml` | native RSS | High-signal markets headlines. |
| **MarketWatch — Top Stories** | `http://feeds.marketwatch.com/marketwatch/topstories/` | native RSS | Broad markets coverage (primary MW feed). |
| **MarketWatch — Market Pulse** | `http://feeds.marketwatch.com/marketwatch/marketpulse/` | native RSS | Faster market-move blurbs (secondary MW feed; optional). |
| **Reuters Markets** | `https://news.google.com/rss/search?q=site:reuters.com%20markets&hl=en-US&gl=US&ceid=US:en` | Google News proxy | Reuters retired its public RSS; this proxy returns ~100 recent items. |
| **Sherwood** | `https://news.google.com/rss/search?q=site:sherwood.news&hl=en-US&gl=US&ceid=US:en` | Google News proxy | Sherwood News has no native RSS. Proxy works — but do **not** add a strict `when:24h` operator (returns 0); filter by item `pubDate` instead. |

## Fetch guidance for MTC-259
- Pull `title` + `link` + `pubDate` only; ignore bodies.
- Filter to the last 24h **by item `pubDate` in the workflow**, not via the Google News `when:` operator — it's strict/inconsistent (Sherwood returned 0 items with `when:24h` but 100 without).
- De-dup by title across sources before sending to the LLM.
- Best-effort per feed: if one is empty/unreachable on a given day, proceed with the rest — no hard failure.
- Send a `User-Agent` header (e.g. `Mozilla/5.0`) — some feeds 403 the default agent.

## Verification (2026-05-31, from build host)
All feed URLs returned HTTP 200 + valid XML. WSJ & MarketWatch are native RSS; Reuters & Sherwood are via Google News proxy (their native feeds are retired / 404). Item counts at test time: WSJ ✓, MarketWatch ✓, Reuters ~100, Sherwood ~100 (unfiltered).
