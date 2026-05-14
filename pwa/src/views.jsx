// The 8 tab views.
import React from 'react';
import {
  cls, convictionStripe, Stat, StatStrip, RegimeBanner, RRPill, ConvictionTag,
  Card, SignalCard, PositionCard, SectionHeader,
} from './components.jsx';
import {
  IconArrowLeft, IconRefresh, IconPlay, IconCheck, IconChevronRight, IconSparkle,
} from './icons.jsx';
import {
  SETUP_LABELS, JOURNAL, SETUPS, BACKTESTS, SENTIMENT, REGIME,
  fetchSignals, fetchSignalById, fetchCriteria, parseThresholds,
  fetchOpenPositions, fetchRegime, fetchSentiment,
} from './data.js';
import { takeTrade, passTrade, fetchJournal, closeTrade, fetchShadowTrades } from './api/trades.js';

export const DashboardView = () => {
  const [positions, setPositions] = React.useState(null);
  const [regime, setRegime] = React.useState(REGIME);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    fetchOpenPositions()
      .then(setPositions)
      .catch(e => setErr(e.message));
    fetchRegime().then(r => { if (r) setRegime(r); }).catch(() => {});
  }, []);

  if (err) {
    return (
      <div className="p-4 font-[Carlito] text-[12px] text-[#C0392B]">
        Failed to load positions: {err}
      </div>
    );
  }

  if (positions === null) {
    return (
      <div className="p-4 pb-24 font-[Carlito] text-[13px] text-[#8A8A94] text-center">Loading…</div>
    );
  }

  const adapted = positions.map(p => ({
    id: p.id,
    ticker: p.signals?.ticker ?? '???',
    type: p.trade_mode,
    setup: p.signals?.setup_type ?? '',
    entry: p.actual_entry,
    stop: p.stop,
    current: null, // TODO: needs live price feed (future ticket)
    r: null,       // TODO: needs live price feed (future ticket)
    daysHeld: Math.floor((Date.now() - new Date(p.date_opened).getTime()) / 86400000),
    pnlPct: null,  // TODO: needs live price feed (future ticket)
  }));

  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      <RegimeBanner state={regime.state} detail={regime.detail} />
      <StatStrip items={[
        { label: 'Open', value: String(positions.length) },
        { label: 'Today P/L', value: '—' }, // TODO: needs live price feed (future ticket)
        { label: 'Week R', value: '—' },    // TODO: needs period math over closed trades (future ticket)
        { label: 'Win %', value: '—' },     // TODO: needs closed-trade aggregates (future ticket)
      ]} />
      <SectionHeader title="Open Positions" />
      <div className="flex flex-col gap-2.5">
        {adapted.length === 0 ? (
          <div className="py-6 text-center font-[Carlito] text-[12px] text-[#8A8A94]">No open positions</div>
        ) : (
          adapted.map(p => <PositionCard key={p.id} p={p} />)
        )}
      </div>
      <SectionHeader title="Today" right={<span className="font-['DM_Mono'] text-[10px] text-[#8A8A94]">— activity</span>} />
      <Card>
        <div className="px-3.5 py-3 font-[Carlito] text-[12px] text-[#8A8A94] italic">
          Activity wiring coming soon.
        </div>
      </Card>
    </div>
  );
};

function TradeModeModal({ signal, onConfirm, onCancel }) {
  const [mode, setMode] = React.useState('paper');
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-[480px] rounded-[16px] bg-white p-5 shadow-xl">
        <div className="mb-4 font-['Playfair_Display'] text-[20px] font-bold text-[#18181A]">
          Take {signal.ticker}?
        </div>
        <div className="mb-4 font-[Carlito] text-[12px] text-[#8A8A94]">
          Entry ${signal.entry?.toFixed(2)} · Stop ${signal.stop?.toFixed(2)}
        </div>
        <div className="mb-5 grid grid-cols-2 gap-2">
          {['live', 'paper'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-[10px] border py-3 font-[Carlito] text-[13px] font-bold uppercase tracking-[0.1em] transition-colors ${
                mode === m
                  ? 'border-[#3D5A7A] bg-[#3D5A7A] text-white'
                  : 'border-[#3D5A7A] bg-white text-[#3D5A7A]'
              }`}
            >
              {m === 'live' ? 'Live' : 'Paper'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="rounded-[10px] border border-[rgba(24,24,26,0.12)] bg-white py-3 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(mode)}
            className="rounded-[10px] bg-[#3D5A7A] py-3 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-white active:bg-[#2c4361]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseTradeSheet({ trade, onClose, onClosed }) {
  const [actualExit, setActualExit] = React.useState('');
  const [exitRationale, setExitRationale] = React.useState('');
  const [entryRationale, setEntryRationale] = React.useState(trade.entry_rationale ?? '');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState(null);

  async function handleConfirm() {
    if (!actualExit || isNaN(parseFloat(actualExit))) {
      setErr('Enter a valid exit price.');
      return;
    }
    setSaving(true);
    try {
      const result = await closeTrade({
        tradeId: trade.id,
        actualExit: parseFloat(actualExit),
        exitRationale,
        entryRationale,
      });
      onClosed(result[0] ?? { ...trade, date_closed: new Date().toISOString().slice(0, 10), actual_exit: parseFloat(actualExit) });
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[480px] rounded-t-[20px] bg-white p-5 shadow-xl">
        <div className="mb-1 font-['Playfair_Display'] text-[20px] font-bold text-[#18181A]">
          Close trade
        </div>
        <div className="mb-4 font-[Carlito] text-[12px] text-[#8A8A94]">
          Opened {trade.date_opened} · Entry ${(trade.actual_entry ?? 0).toFixed(2)}
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]">
              Exit price *
            </label>
            <input
              type="number"
              step="0.01"
              value={actualExit}
              onChange={e => setActualExit(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-[8px] border border-[rgba(24,24,26,0.12)] px-3 py-2 font-['DM_Mono'] text-[14px] text-[#18181A] outline-none focus:border-[#3D5A7A]"
            />
          </div>
          <div>
            <label className="mb-1 block font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]">
              Exit rationale
            </label>
            <textarea
              value={exitRationale}
              onChange={e => setExitRationale(e.target.value)}
              placeholder="Why did you exit here?"
              rows={2}
              className="w-full rounded-[8px] border border-[rgba(24,24,26,0.12)] px-3 py-2 font-[Carlito] text-[12px] text-[#3C3C42] outline-none focus:border-[#3D5A7A]"
            />
          </div>
          <div>
            <label className="mb-1 block font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]">
              Entry rationale (optional edit)
            </label>
            <textarea
              value={entryRationale}
              onChange={e => setEntryRationale(e.target.value)}
              placeholder="Why did you take this trade?"
              rows={2}
              className="w-full rounded-[8px] border border-[rgba(24,24,26,0.12)] px-3 py-2 font-[Carlito] text-[12px] text-[#3C3C42] outline-none focus:border-[#3D5A7A]"
            />
          </div>
          {err && <div className="font-[Carlito] text-[12px] text-[#C0392B]">{err}</div>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="rounded-[10px] border border-[rgba(24,24,26,0.12)] bg-white py-3 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="rounded-[10px] bg-[#3D5A7A] py-3 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-white active:bg-[#2c4361] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Close trade'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const SignalQueueView = ({ openSignal }) => {
  const [signals, setSignals] = React.useState(null);
  const [takingSignal, setTakingSignal] = React.useState(null);
  const [passError, setPassError] = React.useState(null);
  const [showFilter, setShowFilter] = React.useState(false);
  const [convictionFilter, setConvictionFilter] = React.useState('All');

  React.useEffect(() => {
    fetchSignals()
      .then(setSignals)
      .catch((err) => { console.error(err); setSignals([]); });
  }, []);

  if (signals === null) {
    return (
      <div className="flex flex-col gap-3 p-4 pb-24">
        <SectionHeader title="Open Signals" />
        <div className="font-[Carlito] text-[13px] text-[#8A8A94] p-4 text-center">Loading…</div>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-4 pb-24">
        <SectionHeader title="Open Signals · 0" />
        <div className="font-[Carlito] text-[13px] text-[#8A8A94] p-4 text-center">No open signals.</div>
      </div>
    );
  }

  const displayed = convictionFilter === 'All'
    ? signals
    : signals.filter(s => s.conviction === convictionFilter);

  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      <SectionHeader
        title={`Open Signals · ${displayed.length}`}
        right={
          <button
            onClick={() => setShowFilter(f => !f)}
            className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A]"
          >
            Filter
          </button>
        }
      />
      {showFilter && (
        <div className="flex gap-1.5 flex-wrap">
          {['All', 'High', 'Med', 'Low'].map(v => (
            <button
              key={v}
              onClick={() => setConvictionFilter(v)}
              className={cls(
                'rounded-full border px-3 py-1 font-[Carlito] text-[10px] font-bold uppercase tracking-[0.08em]',
                convictionFilter === v
                  ? 'border-[#3D5A7A] bg-[#3D5A7A] text-white'
                  : 'border-[rgba(24,24,26,0.14)] bg-white text-[#3C3C42] active:bg-[#F2F0EC]'
              )}
            >{v}</button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {displayed.length === 0 ? (
          <div className="font-[Carlito] text-[13px] text-[#8A8A94] p-4 text-center">No signals match filter.</div>
        ) : displayed.map((s) => (
          <SignalCard key={s.id} signal={s} onOpen={openSignal}
            onTake={(id) => {
              const sig = signals.find(x => x.id === id);
              if (sig) setTakingSignal(sig);
            }}
            onPass={async (id) => {
              const sig = signals.find(x => x.id === id);
              if (!sig) return;
              try {
                await passTrade({ signalId: sig.id, reasonPassed: '' });
                setSignals(prev => prev.filter(x => x.id !== id));
              } catch (err) {
                setPassError(err.message);
              }
            }}
          />
        ))}
      </div>
      {takingSignal && (
        <TradeModeModal
          signal={takingSignal}
          onConfirm={async (mode) => {
            try {
              await takeTrade({
                signalId: takingSignal.id,
                tradeMode: mode,
                entry: takingSignal.entry,
                stop: takingSignal.stop,
              });
              setSignals(prev => prev.filter(x => x.id !== takingSignal.id));
              setTakingSignal(null);
            } catch (err) {
              setPassError(err.message);
              setTakingSignal(null);
            }
          }}
          onCancel={() => setTakingSignal(null)}
        />
      )}
      {passError && (
        <div className="px-4 font-[Carlito] text-[12px] text-[#C0392B]">{passError}</div>
      )}
    </div>
  );
};

export const SignalDetailView = ({ signalId, back }) => {
  const [signal, setSignal] = React.useState(null);
  const [notFound, setNotFound] = React.useState(false);
  const [takingMode, setTakingMode] = React.useState(false);
  const [actionError, setActionError] = React.useState(null);
  const [actioned, setActioned] = React.useState(false);

  React.useEffect(() => {
    if (!signalId) return;
    fetchSignalById(signalId)
      .then((s) => { if (s) setSignal(s); else setNotFound(true); })
      .catch((err) => { console.error(err); setNotFound(true); });
  }, [signalId]);

  if (notFound) {
    return (
      <div className="flex flex-col gap-3 p-4 pb-24">
        <button onClick={back} className="flex items-center gap-1 self-start font-[Carlito] text-[11px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A]">
          <IconArrowLeft size={14} /> Back to Queue
        </button>
        <div className="font-[Carlito] text-[13px] text-[#8A8A94] p-4 text-center">Signal not found.</div>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="flex flex-col gap-3 p-4 pb-24">
        <button onClick={back} className="flex items-center gap-1 self-start font-[Carlito] text-[11px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A]">
          <IconArrowLeft size={14} /> Back to Queue
        </button>
        <div className="font-[Carlito] text-[13px] text-[#8A8A94] p-4 text-center">Loading…</div>
      </div>
    );
  }

  const s = signal;
  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      <button onClick={back} className="flex items-center gap-1 self-start font-[Carlito] text-[11px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A]">
        <IconArrowLeft size={14} /> Back to Queue
      </button>
      <Card stripe={convictionStripe(s.conviction)}>
        <div className="px-3.5 pb-3 pt-3.5">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="font-['Playfair_Display'] text-[28px] font-bold leading-none text-[#18181A]">{s.ticker}</span>
                <ConvictionTag c={s.conviction} />
              </div>
              <div className="mt-1 font-[Carlito] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A7A9E]">
                {SETUP_LABELS[s.setup]} · {s.direction}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-['DM_Mono'] text-[20px] text-[#18181A]">${s.entry.toFixed(2)}</span>
              <span className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">{s.age}</span>
            </div>
          </div>
          <div className="mt-3 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Stop" value={`$${s.stop.toFixed(2)}`} valueClass="text-[#C0392B]" />
              <Stat label="Target" value={`$${s.target.toFixed(2)}`} valueClass="text-[#2E7D5A]" />
              <div className="flex flex-col items-start justify-center"><RRPill rr={s.rr} /></div>
            </div>
          </div>
          <p className="mt-3 font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">{s.notes}</p>
        </div>
      </Card>
      <SectionHeader title="Diligence" />
      <Card>
        <div className="grid grid-cols-2 divide-x divide-y divide-[rgba(24,24,26,0.08)] [&>*:nth-child(-n+2)]:border-t-0 [&>*:nth-child(2n+1)]:border-l-0">
          {s.indicators.map((i) => {
            const dot = i.state === 'ok' ? 'bg-[#2E7D5A]' : i.state === 'warn' ? 'bg-[#C0392B]' : 'bg-[#8A8A94]';
            return (
              <div key={i.label} className="px-3.5 py-3">
                <div className="flex items-center gap-1.5 font-[Carlito] text-[10px] uppercase tracking-[0.1em] text-[#8A8A94]">
                  <span className={cls('h-[6px] w-[6px] rounded-full', dot)} />
                  {i.label}
                </div>
                <div className="mt-[3px] font-['DM_Mono'] text-[14px] text-[#18181A]">{i.value}</div>
              </div>
            );
          })}
        </div>
      </Card>
      {actioned ? (
        <div className="rounded-[10px] bg-[#F2F0EC] py-3 text-center font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]">
          Action recorded
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setTakingMode(true)}
            className="rounded-[10px] bg-[#3D5A7A] py-3 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-white active:bg-[#2c4361]"
          >
            Take It
          </button>
          <button
            onClick={async () => {
              try {
                await passTrade({ signalId: s.id, reasonPassed: '' });
                setActioned(true);
              } catch (err) {
                setActionError(err.message);
              }
            }}
            className="rounded-[10px] border border-[#3D5A7A] bg-white py-3 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A] active:bg-[#EBF0F5]"
          >
            Pass It
          </button>
        </div>
      )}
      {actionError && (
        <div className="font-[Carlito] text-[12px] text-[#C0392B]">{actionError}</div>
      )}
      {takingMode && (
        <TradeModeModal
          signal={s}
          onConfirm={async (mode) => {
            try {
              await takeTrade({ signalId: s.id, tradeMode: mode, entry: s.entry, stop: s.stop });
              setActioned(true);
              setTakingMode(false);
            } catch (err) {
              setActionError(err.message);
              setTakingMode(false);
            }
          }}
          onCancel={() => setTakingMode(false)}
        />
      )}
    </div>
  );
};

export const ShadowTradesView = () => {
  const [trades, setTrades] = React.useState(null);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    fetchShadowTrades()
      .then(setTrades)
      .catch(e => setErr(e.message));
  }, []);

  if (err) {
    return (
      <div className="p-4 font-[Carlito] text-[12px] text-[#C0392B]">Failed to load: {err}</div>
    );
  }

  if (trades === null) {
    return (
      <div className="p-4 pb-24 font-[Carlito] text-[13px] text-[#8A8A94] text-center">Loading…</div>
    );
  }

  const resolved = trades.filter(t => t.outcome_if_taken != null);
  const won = resolved.filter(t => t.would_have_won);
  const winPct = resolved.length > 0 ? Math.round((won.length / resolved.length) * 100) : null;
  const avgR = won.length > 0
    ? (won.reduce((s, t) => s + t.outcome_if_taken, 0) / won.length).toFixed(2)
    : null;
  const pending = trades.filter(t => t.outcome_if_taken == null).length;

  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      <StatStrip items={[
        { label: 'Passed', value: String(trades.length) },
        { label: 'Would Win', value: winPct != null ? `${winPct}%` : '—' },
        { label: 'Avg R', value: avgR != null ? `+${avgR}` : '—', valueClass: avgR != null ? 'text-[#2E7D5A]' : undefined },
        { label: 'Pending', value: String(pending) },
      ]} />
      {trades.length === 0 ? (
        <div className="py-6 text-center font-[Carlito] text-[12px] text-[#8A8A94]">No passed signals yet</div>
      ) : (
        trades.map(t => {
          const ticker = t.signals?.ticker ?? '???';
          const setup = t.signals?.setup_type ?? '';
          const passedAt = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const isResolved = t.outcome_if_taken != null;

          return (
            <Card key={t.id}>
              <div className="px-3.5 pb-3 pt-3.5">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <span className="font-['Playfair_Display'] text-[20px] font-bold leading-none text-[#18181A]">{ticker}</span>
                      <span className="inline-flex items-center rounded-full bg-[#F2F0EC] px-2 py-[2px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]">Passed</span>
                    </div>
                    <div className="mt-[5px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A7A9E]">{SETUP_LABELS[setup] ?? setup}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    {isResolved ? (
                      <span className={cls("font-['DM_Mono'] text-[14px]", t.would_have_won ? 'text-[#2E7D5A]' : 'text-[#C0392B]')}>
                        {t.would_have_won ? '+' : ''}{t.outcome_if_taken.toFixed(2)}R
                      </span>
                    ) : (
                      <span className="font-[Carlito] text-[11px] italic text-[#8A8A94]">Resolving…</span>
                    )}
                    <span className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">{passedAt}</span>
                  </div>
                </div>
                {isResolved && (
                  <div className="mt-3 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <Stat
                        label="Would-have-R"
                        value={`${t.would_have_won ? '+' : ''}${t.outcome_if_taken.toFixed(2)}`}
                        valueClass={t.would_have_won ? 'text-[#2E7D5A]' : 'text-[#C0392B]'}
                      />
                      <Stat
                        label="Outcome"
                        value={t.would_have_won ? 'Target' : 'Stop'}
                        valueClass={t.would_have_won ? 'text-[#2E7D5A]' : 'text-[#C0392B]'}
                      />
                    </div>
                  </div>
                )}
                {t.reason_passed && (
                  <p className="mt-2.5 font-[Carlito] text-[11px] italic leading-snug text-[#8A8A94]">{t.reason_passed}</p>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
};

export const JournalView = () => {
  const [trades, setTrades] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [closingTrade, setClosingTrade] = React.useState(null);

  React.useEffect(() => {
    fetchJournal()
      .then(setTrades)
      .catch(e => setErr(e.message));
  }, []);

  if (err) {
    return (
      <div className="p-4 font-[Carlito] text-[12px] text-[#C0392B]">
        Failed to load journal: {err}
      </div>
    );
  }

  if (trades === null) {
    return (
      <div className="p-4 pb-24 font-[Carlito] text-[13px] text-[#8A8A94] text-center">
        Loading…
      </div>
    );
  }

  const open = trades.filter(t => !t.date_closed);
  const closed = trades.filter(t => !!t.date_closed);

  const wins = closed.filter(t => t.outcome === 'win').length;
  const sigmaR = closed.reduce((s, t) => s + (t.actual_r ?? 0), 0);
  const avgR = closed.length > 0 ? sigmaR / closed.length : 0;

  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      <StatStrip items={[
        { label: 'Closed', value: `${closed.length}` },
        { label: 'Wins', value: `${wins}` },
        { label: 'Sigma R', value: sigmaR >= 0 ? `+${sigmaR.toFixed(2)}` : sigmaR.toFixed(2), valueClass: sigmaR >= 0 ? 'text-[#2E7D5A]' : 'text-[#C0392B]' },
        { label: 'Avg', value: `${avgR.toFixed(2)}R` },
      ]} />

      {open.length > 0 && (
        <>
          <SectionHeader title={`Open · ${open.length}`} />
          {open.map(t => (
            <button
              key={t.id}
              onClick={() => setClosingTrade(t)}
              className="w-full text-left"
            >
              <Card>
                <div className="px-3.5 pb-3 pt-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="font-['Playfair_Display'] text-[20px] font-bold leading-none text-[#18181A]">
                          {t.ticker ?? t.signal_id?.slice(0, 6) ?? '—'}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-[#EBF0F5] px-2 py-[2px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A]">
                          {t.trade_mode}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-['DM_Mono'] text-[13px] text-[#18181A]">
                        ${(t.actual_entry ?? 0).toFixed(2)}
                      </span>
                      <span className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">
                        {t.date_opened}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 font-[Carlito] text-[11px] text-[#3D5A7A]">
                    Tap to close →
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </>
      )}

      <SectionHeader title={closed.length > 0 ? `Closed · ${closed.length}` : 'Closed Trades'} />
      {closed.length === 0 ? (
        <div className="font-[Carlito] text-[13px] text-[#8A8A94] p-4 text-center">No closed trades yet.</div>
      ) : (
        closed.map(t => {
          const win = t.outcome === 'win';
          return (
            <Card key={t.id} stripe={win ? 'bg-[#2E7D5A]' : 'bg-[#C0392B]'}>
              <div className="px-3.5 pb-3 pt-3.5">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <span className="font-['Playfair_Display'] text-[20px] font-bold leading-none text-[#18181A]">
                        {t.ticker ?? t.signal_id?.slice(0, 6) ?? '—'}
                      </span>
                      <span className={cls('inline-flex items-center rounded-full px-2 py-[2px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em]', win ? 'bg-[#E8F4EE] text-[#2E7D5A]' : 'bg-[#FDECEA] text-[#C0392B]')}>
                        {win ? 'Win' : 'Loss'}
                      </span>
                    </div>
                    <div className="mt-[5px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A7A9E]">
                      {SETUP_LABELS[t.setup_type] ?? t.setup_type ?? '—'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={cls("font-['DM_Mono'] text-[14px]", win ? 'text-[#2E7D5A]' : 'text-[#C0392B]')}>
                      {(t.actual_r ?? 0) >= 0 ? '+' : ''}{(t.actual_r ?? 0).toFixed(2)}R
                    </span>
                    <span className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">
                      {t.date_closed}
                    </span>
                  </div>
                </div>
                {(t.entry_rationale || t.exit_rationale) && (
                  <div className="mt-3 space-y-2">
                    {t.entry_rationale && (
                      <div>
                        <div className="font-[Carlito] text-[10px] uppercase tracking-[0.1em] text-[#8A8A94]">Entry rationale</div>
                        <div className="font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">{t.entry_rationale}</div>
                      </div>
                    )}
                    {t.exit_rationale && (
                      <div>
                        <div className="font-[Carlito] text-[10px] uppercase tracking-[0.1em] text-[#8A8A94]">Exit rationale</div>
                        <div className="font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">{t.exit_rationale}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })
      )}

      {closingTrade && (
        <CloseTradeSheet
          trade={closingTrade}
          onClose={() => setClosingTrade(null)}
          onClosed={(updated) => {
            setTrades(prev => prev.map(t => t.id === updated.id ? updated : t));
            setClosingTrade(null);
          }}
        />
      )}
    </div>
  );
};

export const SentimentView = () => {
  const [intel, setIntel] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const load = () => {
    setLoading(true);
    fetchSentiment()
      .then(data => { setIntel(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => { load(); }, []);

  const headline = intel?.headline ?? '—';
  const body = intel?.body ?? '';
  const ts = intel?.ts ?? '';

  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      <Card>
        <div className="px-3.5 pb-3.5 pt-3.5">
          <div className="flex items-center gap-1.5">
            <IconSparkle size={14} stroke="#3D5A7A" />
            <span className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.14em] text-[#3D5A7A]">AI Market Intel</span>
            <span className="ml-auto font-['DM_Mono'] text-[10px] text-[#8A8A94]">{ts}</span>
          </div>
          {loading && !intel ? (
            <p className="mt-2 font-[Carlito] text-[13px] text-[#8A8A94]">Loading…</p>
          ) : (
            <>
              <h2 className="mt-2 font-['Playfair_Display'] text-[22px] font-bold leading-tight text-[#18181A]">{headline}</h2>
              <p className="mt-2 font-[Carlito] text-[13px] leading-snug text-[#3C3C42]">{body}</p>
            </>
          )}
        </div>
      </Card>
      <button
        onClick={load}
        className="mt-1 flex items-center justify-center gap-1.5 rounded-[10px] border border-[#3D5A7A] bg-white py-3 font-[Carlito] text-[11px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A] active:bg-[#EBF0F5]"
      >
        <IconRefresh size={13} /> {loading ? 'Refreshing…' : 'Refresh Intel'}
      </button>
    </div>
  );
};

export const BacktestView = () => {
  const [setup, setSetup] = React.useState('ema_pullback');
  const [universe, setUniverse] = React.useState('SPY');
  const [period, setPeriod] = React.useState('1y');
  const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1">
      <div className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]">{label}</div>
      {children}
    </div>
  );
  const Pill = ({ active, children, onClick }) => (
    <button onClick={onClick} className={cls('rounded-full border px-3 py-1.5 font-[Carlito] text-[11px] font-bold uppercase tracking-[0.08em]', active ? 'border-[#3D5A7A] bg-[#3D5A7A] text-white' : 'border-[rgba(24,24,26,0.14)] bg-white text-[#3C3C42] active:bg-[#F2F0EC]')}>
      {children}
    </button>
  );
  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      <Card>
        <div className="flex flex-col gap-3 px-3.5 pb-3.5 pt-3.5">
          <Field label="Setup">
            <select value={setup} onChange={(e) => setSetup(e.target.value)} className="w-full rounded-[8px] border border-[rgba(24,24,26,0.14)] bg-white px-3 py-2 font-[Carlito] text-[13px] text-[#18181A]">
              {Object.entries(SETUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Universe">
            <div className="flex flex-wrap gap-1.5">
              {['SPY', 'QQQ', 'Top 50 ADV', 'Custom'].map((u) => <Pill key={u} active={universe === u} onClick={() => setUniverse(u)}>{u}</Pill>)}
            </div>
          </Field>
          <Field label="Period">
            <div className="flex flex-wrap gap-1.5">
              {['3mo', '6mo', '1y', '2y'].map((p) => <Pill key={p} active={period === p} onClick={() => setPeriod(p)}>{p}</Pill>)}
            </div>
          </Field>
          <button className="mt-1 flex items-center justify-center gap-1.5 rounded-[10px] bg-[#3D5A7A] py-3 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-white active:bg-[#2c4361]">
            <IconPlay size={13} /> Run Backtest
          </button>
        </div>
      </Card>
      <SectionHeader title="Recent Runs" />
      {BACKTESTS.map((b) => (
        <Card key={b.id}>
          <div className="px-3.5 pb-3 pt-3.5">
            <div className="flex items-start justify-between">
              <span className="font-[Carlito] text-[12px] font-bold text-[#18181A]">{b.name}</span>
              <IconChevronRight size={16} stroke="#8A8A94" />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5">
              <Stat label="Win %" value={`${(b.winRate * 100).toFixed(0)}`} />
              <Stat label="Exp R" value={`${b.expectancy.toFixed(2)}`} valueClass="text-[#2E7D5A]" />
              <Stat label="Trades" value={`${b.trades}`} />
              <Stat label="Sharpe" value={`${b.sharpe.toFixed(2)}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export const CriteriaView = () => {
  const [criteria, setCriteria] = React.useState(null);
  const [open, setOpen] = React.useState('momentum_continuation');

  React.useEffect(() => {
    fetchCriteria()
      .then((rows) => setCriteria(rows))
      .catch((err) => { console.error(err); setCriteria([]); });
  }, []);

  if (criteria === null) {
    return (
      <div className="flex flex-col gap-2.5 p-4 pb-24">
        <SectionHeader title="Setup Criteria" />
        <div className="font-[Carlito] text-[13px] text-[#8A8A94] p-4 text-center">Loading…</div>
      </div>
    );
  }

  if (criteria.length === 0) {
    return (
      <div className="flex flex-col gap-2.5 p-4 pb-24">
        <SectionHeader title="Setup Criteria" />
        <div className="font-[Carlito] text-[13px] text-[#8A8A94] p-4 text-center">No active criteria found.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 p-4 pb-24">
      <SectionHeader title="Setup Criteria" />
      {criteria.map((row) => {
        const isOpen = open === row.setup_type;
        const thresholds = parseThresholds(row);
        const blurb = row.thresholds?.regime_note ?? row.label ?? '';
        return (
          <Card key={row.setup_type} onClick={() => setOpen(isOpen ? null : row.setup_type)}>
            <div className="px-3.5 py-3">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <div className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A7A9E]">
                    {SETUP_LABELS[row.setup_type] ?? row.setup_type}
                  </div>
                  <div className="mt-1 font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">{blurb}</div>
                </div>
                <div className={cls('mt-0.5 transition-transform', isOpen && 'rotate-90')}>
                  <IconChevronRight size={16} stroke="#8A8A94" />
                </div>
              </div>
              {isOpen && (
                <ul className="mt-3 flex flex-col gap-1.5 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5">
                  {thresholds.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">
                      <IconCheck size={13} stroke="#2E7D5A" className="mt-[3px] flex-shrink-0" />
                      <span className="flex-1 min-w-0">{t}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
