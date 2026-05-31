// The 8 tab views.
import React from 'react';
import {
  cls, convictionStripe, Stat, StatStrip, RegimeBanner, RRPill, ConvictionTag,
  Card, SignalCard, PositionCard, SectionHeader,
} from './components.jsx';
import {
  IconArrowLeft, IconRefresh, IconPlay, IconCheck, IconChevronRight, IconSparkle, IconX,
} from './icons.jsx';
import {
  SETUP_LABELS, JOURNAL, SETUPS, SENTIMENT, REGIME,
  fetchSignals, fetchSignalById, fetchCriteria, parseThresholds,
  fetchOpenPositions, fetchPaperOpenPositions, fetchRegime, fetchIntelBrief,
  fetchAllVersionsForSetup, saveDraftCriteria, activateCriteriaVersion, parseThresholdJson,
  fetchClosedPaperTrades, fetchBacktestRuns, insertBacktestRun, triggerBacktestWebhook, fetchSetupDetail,
} from './data.js';
import { takeTrade, fetchJournal, closeTrade } from './api/trades.js';

export const DashboardView = ({ openSignal, goToQueue }) => {
  const [positions, setPositions] = React.useState(null);
  const [paperPositions, setPaperPositions] = React.useState([]);
  const [regime, setRegime] = React.useState(REGIME);
  const [signals, setSignals] = React.useState(null);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    fetchOpenPositions()
      .then(setPositions)
      .catch(e => setErr(e.message));
    fetchPaperOpenPositions()
      .then(setPaperPositions)
      .catch(() => setPaperPositions([]));
    fetchRegime().then(r => { if (r) setRegime(r); }).catch(() => {});
    fetchSignals()
      .then(rows => setSignals(rows.slice(0, 3)))
      .catch(() => setSignals([]));
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
    current: null,
    r: null,
    daysHeld: Math.floor((Date.now() - new Date(p.date_opened).getTime()) / 86400000),
    pnlPct: null,
  }));

  const adaptedPaper = paperPositions.map(pt => ({
    id: `paper-${pt.id}`,
    ticker: pt.signals?.ticker ?? pt.ticker ?? '???',
    type: 'paper',
    setup: pt.signals?.setup_type ?? pt.setup_type ?? '',
    entry: pt.entry_zone,
    stop: pt.stop,
    current: null,
    r: null,
    daysHeld: Math.floor((Date.now() - new Date(pt.created_at).getTime()) / 86400000),
    pnlPct: null,
  }));

  const allPositions = [...adapted, ...adaptedPaper];

  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      <RegimeBanner state={regime.state} detail={regime.detail} />
      <StatStrip items={[
        { label: 'Open', value: String(allPositions.length) },
        { label: 'Today P/L', value: '—' },
        { label: 'Week R', value: '—' },
        { label: 'Win %', value: '—' },
      ]} />
      <SectionHeader title="Open Positions" />
      <div className="flex flex-col gap-2.5">
        {allPositions.length === 0 ? (
          <div className="py-6 text-center font-[Carlito] text-[12px] text-[#8A8A94]">No open positions</div>
        ) : (
          allPositions.map(p => <PositionCard key={p.id} p={p} />)
        )}
      </div>
      <SectionHeader title="Today" right={<span className="font-['DM_Mono'] text-[10px] text-[#8A8A94]">— activity</span>} />
      <Card>
        <div className="px-3.5 py-3 font-[Carlito] text-[12px] text-[#8A8A94] italic">
          Activity wiring coming soon.
        </div>
      </Card>
      <SectionHeader
        title={`Signal Queue · ${signals ? signals.length : '—'}`}
        right={
          <button
            onClick={goToQueue}
            className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A]"
          >
            View all →
          </button>
        }
      />
      {signals === null ? (
        <div className="py-3 text-center font-[Carlito] text-[12px] text-[#8A8A94]">Loading…</div>
      ) : signals.length === 0 ? (
        <div className="py-3 text-center font-[Carlito] text-[12px] text-[#8A8A94]">No open signals.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {signals.map(s => (
            <button
              key={s.id}
              onClick={() => openSignal && openSignal(s.id)}
              className="w-full text-left"
            >
              <Card>
                <div className="px-3.5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ConvictionTag c={s.conviction} />
                      <span className="font-['DM_Mono'] text-[15px] font-bold text-[#18181A]">{s.ticker}</span>
                    </div>
                    <span className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.08em] text-[#5A7A9E]">
                      {SETUP_LABELS[s.setup] ?? s.setup}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2">
                    <Stat label="Entry" value={`$${s.entry?.toFixed(2) ?? '—'}`} />
                    <Stat label="Stop" value={`$${s.stop?.toFixed(2) ?? '—'}`} valueClass="text-[#C0392B]" />
                    <div className="flex flex-col items-start justify-center"><RRPill rr={s.rr} /></div>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
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
  const [takeError, setTakeError] = React.useState(null);
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
      <div className="grid gap-2.5 min-[744px]:grid-cols-2 min-[1024px]:grid-cols-3">
        {displayed.length === 0 ? (
          <div className="min-[744px]:col-span-2 min-[1024px]:col-span-3 font-[Carlito] text-[13px] text-[#8A8A94] p-4 text-center">No signals match filter.</div>
        ) : displayed.map((s) => (
          <SignalCard key={s.id} signal={s} onOpen={openSignal}
            onTake={(id) => {
              const sig = signals.find(x => x.id === id);
              if (sig) setTakingSignal(sig);
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
              setTakeError(err.message);
              setTakingSignal(null);
            }
          }}
          onCancel={() => setTakingSignal(null)}
        />
      )}
      {takeError && (
        <div className="px-4 font-[Carlito] text-[12px] text-[#C0392B]">{takeError}</div>
      )}
    </div>
  );
};

export const SignalDetailView = ({ signalId, back }) => {
  const [signal, setSignal] = React.useState(null);
  const [notFound, setNotFound] = React.useState(false);
  const [takingMode, setTakingMode] = React.useState(false);
  const [actionError, setActionError] = React.useState(null);
  const [taken, setTaken] = React.useState(false);

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
      {taken ? (
        <div className="rounded-[10px] bg-[#F2F0EC] py-3 text-center font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]">
          Trade recorded
        </div>
      ) : (
        <div className="pt-1">
          <button
            onClick={() => setTakingMode(true)}
            className="w-full rounded-[10px] bg-[#3D5A7A] py-3 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-white active:bg-[#2c4361]"
          >
            Take It
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
              setTaken(true);
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
                          {t.signals?.ticker ?? t.signal_id?.slice(0, 6) ?? '—'}
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
                        {t.signals?.ticker ?? t.signal_id?.slice(0, 6) ?? '—'}
                      </span>
                      <span className={cls('inline-flex items-center rounded-full px-2 py-[2px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em]', win ? 'bg-[#E8F4EE] text-[#2E7D5A]' : 'bg-[#FDECEA] text-[#C0392B]')}>
                        {win ? 'Win' : 'Loss'}
                      </span>
                    </div>
                    <div className="mt-[5px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A7A9E]">
                      {SETUP_LABELS[t.signals?.setup_type] ?? t.signals?.setup_type ?? '—'}
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
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchIntelBrief()
      .then(row => { setData(row); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  React.useEffect(() => { load(); }, []);

  const isStale = data?.generated_at
    ? Date.now() - new Date(data.generated_at).getTime() > 24 * 60 * 60 * 1000
    : false;

  const dateLabel = data?.brief_date
    ? new Date(data.brief_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      <Card>
        <div className="px-3.5 pb-3.5 pt-3.5">
          {/* loading */}
          {loading && data === null && (
            <p className="font-[Carlito] text-[13px] text-[#8A8A94]">Loading…</p>
          )}

          {/* error */}
          {!loading && error !== null && (
            <div className="flex flex-col gap-2">
              <p className="font-[Carlito] text-[13px] text-[#C0392B]">{error}</p>
              <button
                onClick={load}
                className="self-start font-[Carlito] text-[12px] font-bold text-[#3D5A7A] underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* empty */}
          {!loading && error === null && data === null && (
            <p className="text-center font-[Carlito] text-[13px] text-[#8A8A94]">Intel brief generates at 5am ET</p>
          )}

          {/* loaded */}
          {data !== null && (
            <>
              <p
                className="font-['Playfair_Display'] text-[13px] uppercase tracking-[0.08em] text-[#3D5A7A]"
              >
                INTEL — {dateLabel}
              </p>

              {isStale && (
                <span className="mt-2 inline-block rounded border border-[#B8893A] px-1.5 py-0.5 font-[Carlito] text-[10px] text-[#B8893A]">
                  Brief is stale
                </span>
              )}

              <p className="mt-2 font-['Playfair_Display'] text-[20px] italic leading-tight text-[#18181A]">
                {data.narrative}
              </p>

              {Array.isArray(data.sections) && data.sections.map((section, si) => (
                <div key={si}>
                  <p className="mt-[14px] mb-1 font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#B8893A]">
                    {section.header}
                  </p>
                  {Array.isArray(section.items) && section.items.map((item, ii) => (
                    <div key={ii} className="flex items-baseline gap-2">
                      <span className="flex-1 font-[Carlito] text-[13px] text-[#3C3C42]">{item.label}</span>
                      {item.tag && (
                        <span className="font-['DM_Mono'] text-[11px] text-[#8A8A94]">{item.tag}</span>
                      )}
                    </div>
                  ))}
                  {section.commentary && (
                    <p className="mt-1 pl-2 font-[Carlito] text-[13px] italic text-[#8A8A94]">
                      {section.commentary}
                    </p>
                  )}
                </div>
              ))}
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

function periodToDateRange(period) {
  const end = new Date();
  const start = new Date(end);
  const map = { '3mo': [0, 3], '6mo': [0, 6], '1y': [1, 0], '2y': [2, 0] };
  const [years, months] = map[period] ?? [1, 0];
  start.setFullYear(start.getFullYear() - years);
  start.setMonth(start.getMonth() - months);
  const fmt = (d) => d.toISOString().split('T')[0];
  return { date_range_start: fmt(start), date_range_end: fmt(end) };
}

export const BacktestView = () => {
  const [setup, setSetup] = React.useState('ema_pullback');
  const [universe, setUniverse] = React.useState('SPY');
  const [period, setPeriod] = React.useState('1y');
  const [runs, setRuns] = React.useState([]);
  const [loadingRuns, setLoadingRuns] = React.useState(true);
  const [runError, setRunError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const pollRef = React.useRef(null);

  React.useEffect(() => {
    fetchBacktestRuns()
      .then((data) => { setRuns(data); setLoadingRuns(false); })
      .catch(() => { setRunError('Failed to load runs'); setLoadingRuns(false); });
  }, []);

  React.useEffect(() => {
    const hasRunning = runs.some((r) => r.status === 'running');
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const fresh = await fetchBacktestRuns();
        setRuns(fresh);
      }, 5000);
    }
    if (!hasRunning && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [runs]);

  async function handleRun() {
    setSubmitting(true);
    try {
      const { date_range_start, date_range_end } = periodToDateRange(period);
      const row = await insertBacktestRun({ setup_type: setup, ticker_universe: universe, date_range_start, date_range_end });
      await triggerBacktestWebhook(row.id);
      const fresh = await fetchBacktestRuns();
      setRuns(fresh);
    } catch (e) {
      setRunError('Failed to start backtest — ' + e.message);
    } finally {
      setSubmitting(false);
    }
  }

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
          <button
            onClick={handleRun}
            disabled={submitting}
            className="mt-1 flex items-center justify-center gap-1.5 rounded-[10px] bg-[#3D5A7A] py-3 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-white active:bg-[#2c4361] disabled:opacity-50"
          >
            <IconPlay size={13} /> {submitting ? 'Starting…' : 'Run Backtest'}
          </button>
        </div>
      </Card>
      <SectionHeader title="Recent Runs" />
      {runError && (
        <p className="font-[Carlito] text-[13px] text-[#C0392B]">{runError}</p>
      )}
      {loadingRuns ? (
        <p className="font-[Carlito] text-[13px] text-[#8A8A94]">Loading…</p>
      ) : runs.length === 0 ? (
        <Card>
          <p className="px-3.5 py-4 font-[Carlito] text-[13px] text-[#8A8A94]">
            No backtest runs yet. Configure above and click Run Backtest.
          </p>
        </Card>
      ) : runs.map((run) => {
        const rangeLabel = run.date_range_start && run.date_range_end
          ? `${run.date_range_start.slice(0, 7)} → ${run.date_range_end.slice(0, 7)}`
          : '';
        const runLabel = `${SETUP_LABELS[run.setup_type] ?? run.setup_type} / ${run.ticker_universe} / ${rangeLabel}`;
        return (
          <Card key={run.id}>
            <div className="px-3.5 pb-3 pt-3.5">
              <div className="flex items-start justify-between">
                <span className="font-[Carlito] text-[12px] font-bold text-[#18181A]">{runLabel}</span>
                <IconChevronRight size={16} stroke="#8A8A94" />
              </div>
              {run.status === 'queued' && (
                <span className="mt-2 inline-block rounded-full bg-[#F2F0EC] px-2.5 py-1 font-[Carlito] text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A8A94]">Queued</span>
              )}
              {run.status === 'running' && (
                <div className="mt-2">
                  {run.current_step && (
                    <p className="mb-1 font-[Carlito] text-[11px] text-[#8A8A94]">{run.current_step}</p>
                  )}
                  <div className="h-1.5 w-full rounded-full bg-[#F2F0EC]">
                    <div
                      className="h-1.5 rounded-full bg-[#3D5A7A]"
                      style={{ width: `${run.tickers_total ? Math.round((run.tickers_processed / run.tickers_total) * 100) : (run.progress_pct ?? 0)}%` }}
                    />
                  </div>
                  <p className="mt-1 font-[Carlito] text-[11px] text-[#8A8A94]">
                    {run.tickers_total ? `${run.tickers_processed ?? 0} / ${run.tickers_total} tickers` : `${run.progress_pct ?? 0}%`}
                  </p>
                </div>
              )}
              {run.status === 'complete' && (() => {
                const r = run.backtest_results?.[0];
                return (
                  <div className="mt-2 grid grid-cols-4 gap-2 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5">
                    <Stat label="Win %" value={r ? `${(r.win_rate * 100).toFixed(0)}%` : '—'} />
                    <Stat label="Avg R" value={r ? r.avg_r?.toFixed(2) ?? '—' : '—'} valueClass="text-[#2E7D5A]" />
                    <Stat label="Trades" value={r ? String(r.total_trades) : '—'} />
                    <Stat label="MaxDD" value={r ? `${(r.max_drawdown * 100).toFixed(1)}%` : '—'} />
                  </div>
                );
              })()}
              {run.status === 'error' && (
                <p className="mt-2 font-[Carlito] text-[11px] text-[#C0392B]">{run.error_message}</p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return 'just now';
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

const CriteriaEditor = ({ mode, source, setupType, onCancel, onSaved, onActivated }) => {
  const initialLabel = mode === 'fork' ? '' : (source?.label ?? '');
  const initialJson = React.useMemo(
    () => JSON.stringify(source?.thresholds ?? {}, null, 2),
    [source]
  );
  const [label, setLabel] = React.useState(initialLabel);
  const [jsonText, setJsonText] = React.useState(initialJson);
  const [busy, setBusy] = React.useState(null);
  const [banner, setBanner] = React.useState(null);
  const [errorMsg, setErrorMsg] = React.useState(null);

  const parsed = parseThresholdJson(jsonText);
  const canSave = parsed.ok && label.trim().length > 0 && !busy;
  const canActivate = mode === 'edit' && source && !source.is_active && !busy;

  React.useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(t);
  }, [banner]);

  async function handleSave() {
    if (!canSave) return;
    setBusy('save');
    setErrorMsg(null);
    try {
      const row = await saveDraftCriteria({
        setupType,
        label: label.trim(),
        thresholds: parsed.value,
      });
      setBanner(`Saved v${row.version}`);
      onSaved?.(row);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleActivate() {
    if (!canActivate) return;
    setBusy('activate');
    setErrorMsg(null);
    try {
      await activateCriteriaVersion({ setupType, versionId: source.id });
      setBanner(`v${source.version} is now active for ${setupType}. Screener and AI scorer will use these thresholds on next run.`);
      onActivated?.();
    } catch (e) {
      setErrorMsg(`Activation failed — ${e.message}. Retry.`);
    } finally {
      setBusy(null);
    }
  }

  const previewRow = parsed.ok ? { thresholds: parsed.value } : null;
  const previewBullets = previewRow ? parseThresholds(previewRow) : [];

  const title = mode === 'fork'
    ? `Fork from v${source?.version}`
    : `Edit v${source?.version}`;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30">
      <div className="flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-[16px] border border-[rgba(24,24,26,0.14)] bg-[#FAFAF8]">
        <div className="flex items-center justify-between border-b border-[rgba(24,24,26,0.08)] px-4 py-3">
          <div className="flex flex-col">
            <div className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A7A9E]">
              {SETUP_LABELS[setupType] ?? setupType}
            </div>
            <div className="font-['Playfair_Display'] text-[16px] font-bold text-[#18181A]">{title}</div>
          </div>
          <button onClick={onCancel} className="rounded-full p-1.5 active:bg-[#F2F0EC]">
            <IconX size={18} stroke="#3C3C42" />
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto px-4 py-3">
          {banner && (
            <div className="rounded-[8px] border border-[#2E7D5A]/30 bg-[#E8F4EE] px-3 py-2 font-[Carlito] text-[12px] leading-snug text-[#1F5A41]">
              {banner}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-[8px] border border-[#C0392B]/30 bg-[#FBEAE7] px-3 py-2 font-[Carlito] text-[12px] leading-snug text-[#8B2A1E]">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <div className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]">Label</div>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. v2 — tightened RSI band"
              className="w-full rounded-[8px] border border-[rgba(24,24,26,0.14)] bg-white px-3 py-2 font-[Carlito] text-[13px] text-[#18181A]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]">Thresholds (JSON)</div>
              <div className="flex items-center gap-1.5">
                <span className={cls('inline-block h-[7px] w-[7px] rounded-full', parsed.ok ? 'bg-[#2E7D5A]' : 'bg-[#C0392B]')} />
                <span className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">
                  {parsed.ok ? 'Valid' : 'Invalid'}
                </span>
              </div>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
              rows={16}
              wrap="off"
              style={{ whiteSpace: 'pre', overflowX: 'auto' }}
              className="w-full rounded-[8px] border border-[rgba(24,24,26,0.14)] bg-white px-3 py-2 font-['DM_Mono'] text-[12px] leading-snug text-[#18181A]"
            />
            {!parsed.ok && (
              <div className="font-[Carlito] text-[11px] leading-snug text-[#C0392B]">{parsed.error}</div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]">Preview</div>
            {previewBullets.length === 0 ? (
              <div className="rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5 font-[Carlito] text-[12px] text-[#8A8A94]">
                {parsed.ok ? 'No gates or min R/R found in this JSON.' : 'Fix JSON to see preview.'}
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5">
                {previewBullets.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">
                    <IconCheck size={13} stroke="#2E7D5A" className="mt-[3px] flex-shrink-0" />
                    <span className="flex-1 min-w-0">{t}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[rgba(24,24,26,0.08)] px-4 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onCancel}
              className="rounded-[8px] border border-[rgba(24,24,26,0.14)] bg-white py-2.5 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-[#3C3C42] active:bg-[#F2F0EC]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={cls(
                'rounded-[8px] py-2.5 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-white',
                canSave ? 'bg-[#3D5A7A] active:bg-[#2c4361]' : 'bg-[#3D5A7A]/40'
              )}
            >
              {busy === 'save' ? 'Saving…' : 'Save as new version'}
            </button>
          </div>
          {canActivate && (
            <button
              onClick={handleActivate}
              disabled={busy === 'activate'}
              className={cls(
                'rounded-[8px] py-2.5 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-white',
                busy === 'activate' ? 'bg-[#2E7D5A]/60' : 'bg-[#2E7D5A] active:bg-[#236046]'
              )}
            >
              {busy === 'activate' ? 'Activating…' : `Activate v${source.version}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const CriteriaView = () => {
  const [setupType, setSetupType] = React.useState('ema_pullback');
  const [versions, setVersions] = React.useState(null);
  const [loadErr, setLoadErr] = React.useState(null);
  const [editor, setEditor] = React.useState(null);

  async function loadVersions(type) {
    setVersions(null);
    setLoadErr(null);
    try {
      const rows = await fetchAllVersionsForSetup(type);
      setVersions(rows);
    } catch (e) {
      setLoadErr(e.message);
      setVersions([]);
    }
  }

  React.useEffect(() => { loadVersions(setupType); }, [setupType]);

  return (
    <div className="flex flex-col gap-2.5 p-4 pb-24">
      <Card>
        <div className="flex flex-col gap-1 px-3.5 pb-3.5 pt-3.5">
          <div className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]">Setup</div>
          <select
            value={setupType}
            onChange={(e) => setSetupType(e.target.value)}
            className="w-full rounded-[8px] border border-[rgba(24,24,26,0.14)] bg-white px-3 py-2 font-[Carlito] text-[13px] text-[#18181A]"
          >
            {Object.entries(SETUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </Card>

      <SectionHeader title="Versions" />

      {loadErr && (
        <div className="rounded-[8px] border border-[#C0392B]/30 bg-[#FBEAE7] px-3 py-2 font-[Carlito] text-[12px] leading-snug text-[#8B2A1E]">
          Failed to load versions: {loadErr}
        </div>
      )}

      {versions === null && !loadErr && (
        <div className="p-4 text-center font-[Carlito] text-[13px] text-[#8A8A94]">Loading…</div>
      )}

      {versions !== null && versions.length === 0 && !loadErr && (
        <div className="p-4 text-center font-[Carlito] text-[13px] text-[#8A8A94]">
          No versions yet for {SETUP_LABELS[setupType] ?? setupType}
        </div>
      )}

      {versions !== null && versions.length > 0 && !versions.some((v) => v.is_active) && (
        <div className="rounded-[8px] border border-[#B8893A]/30 bg-[#F5EDD8] px-3 py-2 font-[Carlito] text-[12px] leading-snug text-[#7A5A1F]">
          No active version. Activate one below to resume screening for this setup.
        </div>
      )}

      {versions !== null && versions.map((row) => (
        <Card key={row.id} className={row.is_active ? 'border-l-[3px] border-l-[#2E7D5A]' : undefined}>
          <div className="flex flex-col gap-2 px-3.5 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-['DM_Mono'] text-[14px] text-[#18181A]">v{row.version}</span>
                  {row.is_active && (
                    <span className="inline-flex items-center rounded-full bg-[#E8F4EE] px-2 py-[2px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#2E7D5A]">
                      Active
                    </span>
                  )}
                </div>
                <div className="mt-1 truncate font-[Carlito] text-[12px] text-[#3C3C42]">{row.label || '—'}</div>
                <div className="mt-0.5 font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">
                  {relativeTime(row.created_at)}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setEditor({ mode: 'edit', source: row })}
                  className="rounded-[8px] border border-[#3D5A7A] bg-white px-3 py-1.5 font-[Carlito] text-[11px] font-bold uppercase tracking-[0.08em] text-[#3D5A7A] active:bg-[#EBF0F5]"
                >
                  Edit
                </button>
                <button
                  onClick={() => setEditor({ mode: 'fork', source: row })}
                  className="rounded-[8px] border border-[rgba(24,24,26,0.14)] bg-white px-3 py-1.5 font-[Carlito] text-[11px] font-bold uppercase tracking-[0.08em] text-[#3C3C42] active:bg-[#F2F0EC]"
                >
                  Fork
                </button>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {editor && (
        <CriteriaEditor
          mode={editor.mode}
          source={editor.source}
          setupType={setupType}
          onCancel={() => setEditor(null)}
          onSaved={() => { setEditor(null); loadVersions(setupType); }}
          onActivated={() => { setEditor(null); loadVersions(setupType); }}
        />
      )}
    </div>
  );
};

const CONVICTION_LABELS = { 3: 'High', 2: 'Med', 1: 'Low' };
const CONVICTION_SCORE_ORDER = [3, 2, 1];

function calcGroupStats(trades) {
  const n = trades.length;
  const wins = trades.filter(t => t.outcome === 'target_hit').length;
  const winRate = n > 0 ? Math.round((wins / n) * 100) : null;
  const rVals = trades.map(t => t.r_multiple).filter(v => v != null).map(Number);
  const expectancy = rVals.length > 0 ? rVals.reduce((s, v) => s + v, 0) / rVals.length : null;
  const winRVals = trades.filter(t => t.outcome === 'target_hit').map(t => t.r_multiple).filter(v => v != null).map(Number);
  const avgWinR = winRVals.length > 0 ? winRVals.reduce((s, v) => s + v, 0) / winRVals.length : null;
  return { n, wins, winRate, expectancy, avgWinR };
}

const fmtPct = (v) => v == null ? '—' : `${v}%`;
const fmtR = (v) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;

const convColor = (label) =>
  label === 'High' ? { fg: '#2E7D5A', bg: '#E8F4EE' }
  : label === 'Med' ? { fg: '#B8893A', bg: '#F5EDD8' }
  : { fg: '#8A8A94', bg: '#F2F0EC' };

export const PerformanceView = ({ onOpenDetail }) => {
  const [trades, setTrades] = React.useState(null);

  React.useEffect(() => {
    fetchClosedPaperTrades()
      .then(setTrades)
      .catch(() => setTrades([]));
  }, []);

  if (trades === null) {
    return <div className="p-4 pb-24 font-[Carlito] text-[13px] text-[#8A8A94] text-center">Loading…</div>;
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-4 pb-24">
        <div className="mt-16 py-8 text-center font-[Carlito] text-[13px] leading-relaxed text-[#8A8A94]">
          No resolved trades yet — calibration fills in as paper trades close.
        </div>
      </div>
    );
  }

  const unscoredTrades = trades.filter(t => t.conviction_score == null);
  const convictionRows = CONVICTION_SCORE_ORDER.map(score => ({
    label: CONVICTION_LABELS[score],
    score,
    ...calcGroupStats(trades.filter(t => t.conviction_score === score)),
  }));
  if (unscoredTrades.length > 0) {
    convictionRows.push({ label: 'Unscored', score: null, ...calcGroupStats(unscoredTrades) });
  }

  const setupMap = new Map();
  for (const t of trades) {
    const key = t.setup_type ?? 'unknown';
    if (!setupMap.has(key)) setupMap.set(key, []);
    setupMap.get(key).push(t);
  }
  const setupRows = Array.from(setupMap.entries())
    .map(([key, rows]) => ({ key, label: SETUP_LABELS[key] ?? key, ...calcGroupStats(rows) }))
    .sort((a, b) => (b.expectancy ?? -Infinity) - (a.expectancy ?? -Infinity));

  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      <SectionHeader title="Conviction Calibration" />
      <Card>
        <div className="divide-y divide-[rgba(24,24,26,0.07)]">
          {convictionRows.map(({ label, score, winRate, expectancy, avgWinR, n }) => {
            const cc = convColor(label);
            const expPos = expectancy != null && expectancy > 0;
            const expNeg = expectancy != null && expectancy <= 0;
            return (
              <div key={score ?? 'unscored'} className="flex items-center gap-3 px-3.5 py-3">
                <div style={{ minWidth: 64 }}>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-[2px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: cc.fg, background: cc.bg }}
                  >
                    {label}
                  </span>
                </div>
                <div className="flex flex-1 items-start gap-4">
                  <div className="flex flex-col gap-[2px]">
                    <div className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">Win %</div>
                    <div className={cls("font-['DM_Mono'] text-[13px]", winRate != null && winRate > 50 ? 'text-[#2E7D5A]' : winRate != null ? 'text-[#C0392B]' : 'text-[#8A8A94]')}>
                      {fmtPct(winRate)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    <div className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">Expectancy</div>
                    <div className={cls("font-['DM_Mono'] text-[13px]", expPos ? 'text-[#2E7D5A]' : expNeg ? 'text-[#C0392B]' : 'text-[#8A8A94]')}>
                      {fmtR(expectancy)}
                    </div>
                  </div>
                  <div className="hidden min-[744px]:flex flex-col gap-[2px]">
                    <div className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">Avg Win R</div>
                    <div className={cls("font-['DM_Mono'] text-[13px]", avgWinR != null ? 'text-[#2E7D5A]' : 'text-[#8A8A94]')}>
                      {avgWinR != null ? `+${avgWinR.toFixed(2)}R` : '—'}
                    </div>
                  </div>
                  <div className="ml-auto flex flex-col gap-[2px] text-right">
                    <div className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">N</div>
                    <div className="font-['DM_Mono'] text-[13px] text-[#8A8A94]">{n}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <SectionHeader title={`By Setup · ${setupRows.length}`} />
      {setupRows.map(({ key, label, winRate, expectancy, avgWinR, n }) => {
        const expPos = expectancy != null && expectancy > 0;
        const expNeg = expectancy != null && expectancy <= 0;
        return (
          <div
            key={key}
            onClick={() => onOpenDetail(key)}
            className="cursor-pointer rounded-[14px] active:opacity-75"
          >
            <Card>
              <div className="px-3.5 pb-3 pt-3.5">
                <div className="mb-2 font-[Carlito] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A7A9E]">{label}</div>
                <div className="grid grid-cols-4 gap-2 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5">
                  <Stat label="Win %" value={fmtPct(winRate)} valueClass={winRate != null && winRate > 50 ? 'text-[#2E7D5A]' : winRate != null ? 'text-[#C0392B]' : undefined} />
                  <Stat label="Expectancy" value={fmtR(expectancy)} valueClass={expPos ? 'text-[#2E7D5A]' : expNeg ? 'text-[#C0392B]' : undefined} />
                  <Stat label="Avg Win R" value={avgWinR != null ? `+${avgWinR.toFixed(2)}R` : '—'} valueClass={avgWinR != null ? 'text-[#2E7D5A]' : undefined} />
                  <Stat label="N" value={String(n)} />
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

const OUTCOME_GLYPH = { target_hit: '✓', stop_hit: '✗', entry_missed: '—' };
const CONVICTION_CHIP = { 3: 'H', 2: 'M', 1: 'L' };

const TradeCard = ({ trade }) => {
  const {
    ticker, status, outcome, r_multiple, bars_to_exit,
    conviction_score, entry_zone, stop: stopPrice, target,
    mfe_r, mae_r, post_exit_run_r, entry_confirmed_at, resolved_at,
  } = trade;
  const signalDate = trade.signals?.signal_date ?? null;
  const isClosed = status === 'closed';

  const glyph = isClosed ? (OUTCOME_GLYPH[outcome] ?? '·') : '·';

  const daysLabel = isClosed
    ? (bars_to_exit != null ? `${bars_to_exit}d` : null)
    : entry_confirmed_at != null
      ? `${Math.floor((new Date() - new Date(entry_confirmed_at).getTime()) / 86400000)}d open`
      : null;

  const fmtMD = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    return `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`;
  };
  const dateRange = isClosed
    ? (signalDate || resolved_at
      ? `${fmtMD(signalDate) ?? '?'} → ${fmtMD(resolved_at) ?? '?'}`
      : null)
    : (signalDate ? `signal ${fmtMD(signalDate)} · open` : null);

  const hasExcursion = mfe_r != null || mae_r != null;
  const showPostRun = post_exit_run_r != null && Math.abs(post_exit_run_r) >= 0.5;
  const rPos = r_multiple != null && r_multiple > 0;
  const convLabel = CONVICTION_CHIP[conviction_score];

  return (
    <Card>
      <div className="px-3.5 pb-3 pt-3">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="font-['Playfair_Display'] text-[15px] font-semibold text-[#18181A]">{ticker}</span>
          {r_multiple != null && (
            <span className={cls("ml-auto font-['DM_Mono'] text-[15px] font-semibold",
              rPos ? 'text-[#2E7D5A]' : 'text-[#C0392B]')}>
              {r_multiple > 0 ? '+' : ''}{r_multiple.toFixed(2)}R
            </span>
          )}
          {daysLabel && (
            <span className="font-['DM_Mono'] text-[11px] text-[#8A8A94]">{daysLabel}</span>
          )}
          <span className={cls('font-[Carlito] text-[12px] font-bold',
            outcome === 'target_hit' ? 'text-[#2E7D5A]'
            : outcome === 'stop_hit' ? 'text-[#C0392B]'
            : 'text-[#8A8A94]')}>
            {glyph}
          </span>
        </div>

        <div className="mb-1.5 flex items-center gap-2">
          {convLabel && (
            <span className="rounded-full bg-[#F2F0EC] px-1.5 py-[1px] font-[Carlito] text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A8A94]">
              {convLabel}
            </span>
          )}
          {dateRange && (
            <span className="font-[Carlito] text-[10px] text-[#8A8A94]">{dateRange}</span>
          )}
        </div>

        {(entry_zone != null || stopPrice != null || target != null) && (
          <div className="mb-1.5 font-['DM_Mono'] text-[10px] text-[#8A8A94]">
            {[
              entry_zone != null && `Entry ${Number(entry_zone).toLocaleString()}`,
              stopPrice  != null && `Stop ${Number(stopPrice).toLocaleString()}`,
              target     != null && `Target ${Number(target).toLocaleString()}`,
            ].filter(Boolean).join('  ')}
          </div>
        )}

        {hasExcursion && (
          <div className="font-['DM_Mono'] text-[10px] text-[#8A8A94]">
            {mfe_r != null && (
              <span className="mr-3">MFE <span className="text-[#2E7D5A]">+{Number(mfe_r).toFixed(1)}R</span></span>
            )}
            {mae_r != null && (
              <span>MAE <span className="text-[#C0392B]">{Number(mae_r).toFixed(1)}R</span></span>
            )}
          </div>
        )}

        {showPostRun && (
          <div className="mt-0.5 font-[Carlito] text-[10px] text-[#8A8A94]">
            Post-exit run{' '}
            <span className={cls("font-['DM_Mono']",
              post_exit_run_r > 0 ? 'text-[#2E7D5A]' : 'text-[#C0392B]')}>
              {post_exit_run_r > 0 ? '+' : ''}{Number(post_exit_run_r).toFixed(1)}R
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

export const SetupDetailView = ({ setupType }) => {
  const [trades, setTrades] = React.useState(null);

  React.useEffect(() => {
    fetchSetupDetail(setupType)
      .then(setTrades)
      .catch(() => setTrades([]));
  }, [setupType]);

  if (trades === null) {
    return <div className="p-4 pb-24 font-[Carlito] text-[13px] text-[#8A8A94] text-center">Loading…</div>;
  }

  const closed = trades.filter(t => t.status === 'closed');
  const open = trades.filter(t => t.status === 'open');

  const n = closed.length;
  const wins = closed.filter(t => t.r_multiple != null && t.r_multiple > 0);
  const winRate = n > 0 ? Math.round((wins.length / n) * 100) : null;
  const expectancy = n > 0
    ? parseFloat((closed.reduce((s, t) => s + (t.r_multiple ?? 0), 0) / n).toFixed(2))
    : null;
  const rVals = closed.map(t => t.r_multiple).filter(v => v != null).map(Number);
  const bestR = rVals.length > 0 ? Math.max(...rVals) : null;
  const worstR = rVals.length > 0 ? Math.min(...rVals) : null;
  const ditVals = closed.map(t => t.bars_to_exit).filter(v => v != null);
  const avgDIT = ditVals.length > 0
    ? (ditVals.reduce((s, v) => s + v, 0) / ditVals.length).toFixed(1)
    : null;

  return (
    <div className="flex flex-col gap-3 p-4 pb-24">

      <Card>
        <div className="px-3.5 pb-3 pt-3.5">
          <div className="grid grid-cols-3 gap-2 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5">
            <Stat
              label="Win %"
              value={fmtPct(winRate)}
              valueClass={winRate != null && winRate > 50 ? 'text-[#2E7D5A]' : winRate != null ? 'text-[#C0392B]' : undefined}
            />
            <Stat
              label="Expectancy"
              value={fmtR(expectancy)}
              valueClass={expectancy != null && expectancy > 0 ? 'text-[#2E7D5A]' : expectancy != null ? 'text-[#C0392B]' : undefined}
            />
            <Stat label="N" value={n > 0 ? String(n) : '—'} />
          </div>
          {(bestR != null || worstR != null || avgDIT != null) && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-[Carlito] text-[11px] text-[#8A8A94]">
              {bestR != null && (
                <span>Best <span className="font-['DM_Mono'] text-[#2E7D5A]">+{bestR.toFixed(2)}R</span></span>
              )}
              {worstR != null && (
                <span>Worst <span className="font-['DM_Mono'] text-[#C0392B]">{worstR.toFixed(2)}R</span></span>
              )}
              {avgDIT != null && (
                <span>Avg {avgDIT} days in trade</span>
              )}
            </div>
          )}
        </div>
      </Card>

      {closed.length > 0 && (
        <>
          <SectionHeader title={`TRADES (${closed.length})`} />
          <div className="grid gap-2.5 min-[744px]:grid-cols-2 min-[1024px]:grid-cols-3">
            {closed.map(t => <TradeCard key={t.id} trade={t} />)}
          </div>
        </>
      )}

      {open.length > 0 && (
        <>
          <SectionHeader title={`OPEN POSITIONS (${open.length})`} />
          <div className="grid gap-2.5 min-[744px]:grid-cols-2 min-[1024px]:grid-cols-3">
            {open.map(t => <TradeCard key={t.id} trade={t} />)}
          </div>
        </>
      )}

      {closed.length === 0 && open.length === 0 && (
        <div className="mt-8 text-center font-[Carlito] text-[13px] text-[#8A8A94]">
          No trades yet for this setup.
        </div>
      )}
    </div>
  );
};
