// Supabase write/read helpers for trade actions (take, pass, journal, close).

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const READ_H = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Accept-Profile': 'chaos',
};

const WRITE_H = {
  ...READ_H,
  'Content-Profile': 'chaos',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

/** INSERT trade_journal + PATCH signal to triggered */
export async function takeTrade({ signalId, tradeMode, entry, stop }) {
  const today = new Date().toISOString().slice(0, 10);

  const journalRes = await fetch(`${SUPABASE_URL}/rest/v1/trade_journal`, {
    method: 'POST',
    headers: WRITE_H,
    body: JSON.stringify({
      signal_id: signalId,
      trade_mode: tradeMode,
      actual_entry: entry,
      stop,
      date_opened: today,
    }),
  });
  if (!journalRes.ok) throw new Error(`takeTrade journal insert failed: ${journalRes.status}`);

  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/signals?id=eq.${signalId}`, {
    method: 'PATCH',
    headers: WRITE_H,
    body: JSON.stringify({ status: 'triggered' }),
  });
  if (!patchRes.ok) throw new Error(`takeTrade signal patch failed: ${patchRes.status}`);
}

/** INSERT shadow_trades + PATCH signal to expired */
export async function passTrade({ signalId, reasonPassed }) {
  const shadowRes = await fetch(`${SUPABASE_URL}/rest/v1/shadow_trades`, {
    method: 'POST',
    headers: WRITE_H,
    body: JSON.stringify({
      signal_id: signalId,
      reason_passed: reasonPassed || null,
    }),
  });
  if (!shadowRes.ok) throw new Error(`passTrade shadow insert failed: ${shadowRes.status}`);

  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/signals?id=eq.${signalId}`, {
    method: 'PATCH',
    headers: WRITE_H,
    body: JSON.stringify({ status: 'expired' }),
  });
  if (!patchRes.ok) throw new Error(`passTrade signal patch failed: ${patchRes.status}`);
}

/** Fetch all trade_journal rows, newest first */
export async function fetchJournal() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/trade_journal?order=date_opened.desc&limit=100`,
    { headers: READ_H }
  );
  if (!res.ok) throw new Error(`fetchJournal failed: ${res.status}`);
  return res.json();
}

/** PATCH trade_journal row with close fields */
export async function closeTrade({ tradeId, actualExit, exitRationale, entryRationale }) {
  const today = new Date().toISOString().slice(0, 10);
  const body = {
    actual_exit: actualExit,
    date_closed: today,
    exit_rationale: exitRationale || null,
    entry_rationale: entryRationale || null,
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/trade_journal?id=eq.${tradeId}`, {
    method: 'PATCH',
    headers: WRITE_H,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`closeTrade failed: ${res.status}`);
  return res.json();
}

/** Fetch shadow_trades joined to signals, newest first */
export async function fetchShadowTrades() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/shadow_trades?select=*,signals(ticker,setup_type)&order=created_at.desc&limit=50`,
    { headers: READ_H }
  );
  if (!res.ok) throw new Error(`fetchShadowTrades failed: ${res.status}`);
  return res.json();
}
