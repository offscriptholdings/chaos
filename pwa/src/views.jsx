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
  SETUP_LABELS, SIGNALS, POSITIONS, SHADOW_TRADES, JOURNAL, SETUPS, BACKTESTS, SENTIMENT, REGIME,
} from './data.js';

export const DashboardView = () => {
  const livePnl = POSITIONS.filter(p => p.type === 'live').reduce((s, p) => s + p.pnlPct, 0);
  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      <RegimeBanner state={REGIME.state} detail={REGIME.detail} />
      <StatStrip items={[
        { label: 'Open', value: '2' },
        { label: 'Today P/L', value: `+${livePnl.toFixed(2)}%`, valueClass: 'text-[#2E7D5A]' },
        { label: 'Week R', value: '+2.4', valueClass: 'text-[#2E7D5A]' },
        { label: 'Win %', value: '57' },
      ]} />
      <SectionHeader title="Open Positions" />
      <div className="flex flex-col gap-2.5">
        {POSITIONS.map((p) => <PositionCard key={p.id} p={p} />)}
      </div>
      <SectionHeader title="Today" right={<span className="font-['DM_Mono'] text-[10px] text-[#8A8A94]">3 setups · 1 taken</span>} />
      <Card>
        <div className="px-3.5 py-3">
          <div className="flex items-center justify-between">
            <div className="font-[Carlito] text-[12px] text-[#3C3C42]">Closed: <span className="text-[#2E7D5A]">MSFT +1.74R</span></div>
            <span className="font-['DM_Mono'] text-[11px] text-[#8A8A94]">2:14p</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="font-[Carlito] text-[12px] text-[#3C3C42]">Passed: <span className="text-[#8A8A94]">TSLA breakout-retest</span></div>
            <span className="font-['DM_Mono'] text-[11px] text-[#8A8A94]">11:47a</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export const SignalQueueView = ({ openSignal }) => (
  <div className="flex flex-col gap-3 p-4 pb-24">
    <SectionHeader
      title={`Open Signals · ${SIGNALS.length}`}
      right={<button className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A]">Filter</button>}
    />
    <div className="flex flex-col gap-2.5">
      {SIGNALS.map((s) => (
        <SignalCard key={s.id} signal={s} onOpen={openSignal}
          onTake={(id) => console.log('Take', id)}
          onPass={(id) => console.log('Pass', id)}
        />
      ))}
    </div>
  </div>
);

export const SignalDetailView = ({ signalId, back }) => {
  const s = SIGNALS.find((x) => x.id === signalId) || SIGNALS[0];
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
          <p className="mt-3 font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">{s.note}</p>
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
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button className="rounded-[10px] bg-[#3D5A7A] py-3 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-white active:bg-[#2c4361]">Take It</button>
        <button className="rounded-[10px] border border-[#3D5A7A] bg-white py-3 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A] active:bg-[#EBF0F5]">Pass It</button>
      </div>
    </div>
  );
};

export const ShadowTradesView = () => (
  <div className="flex flex-col gap-3 p-4 pb-24">
    <SectionHeader title="Passed Signals · Would-have outcomes" />
    {SHADOW_TRADES.map((t) => (
      <Card key={t.id}>
        <div className="px-3.5 pb-3 pt-3.5">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="font-['Playfair_Display'] text-[20px] font-bold leading-none text-[#18181A]">{t.ticker}</span>
                <span className="inline-flex items-center rounded-full bg-[#F2F0EC] px-2 py-[2px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A94]">Passed</span>
              </div>
              <div className="mt-[5px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A7A9E]">{SETUP_LABELS[t.setup]}</div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-['DM_Mono'] text-[14px] text-[#2E7D5A]">+{t.wouldR.toFixed(2)}R</span>
              <span className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">{t.passedAt}</span>
            </div>
          </div>
          <div className="mt-3 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Entry" value={`$${t.entry.toFixed(2)}`} />
              <Stat label="Target" value={`$${t.target.toFixed(2)}`} valueClass="text-[#2E7D5A]" />
              <Stat label="Outcome" value={t.hit === 'target' ? 'Target' : 'Stop'} valueClass={t.hit === 'target' ? 'text-[#2E7D5A]' : 'text-[#C0392B]'} />
            </div>
          </div>
          <p className="mt-2.5 font-[Carlito] text-[11px] italic leading-snug text-[#8A8A94]">{t.note}</p>
        </div>
      </Card>
    ))}
  </div>
);

export const JournalView = () => (
  <div className="flex flex-col gap-3 p-4 pb-24">
    <StatStrip items={[
      { label: 'Closed', value: `${JOURNAL.length}` },
      { label: 'Wins', value: `${JOURNAL.filter(j => j.result === 'win').length}` },
      { label: 'Sigma R', value: `+${JOURNAL.reduce((s, j) => s + j.r, 0).toFixed(2)}`, valueClass: 'text-[#2E7D5A]' },
      { label: 'Avg', value: `${(JOURNAL.reduce((s, j) => s + j.r, 0) / JOURNAL.length).toFixed(2)}R` },
    ]} />
    <SectionHeader title="Closed Trades" />
    {JOURNAL.map((j) => {
      const win = j.result === 'win';
      return (
        <Card key={j.id} stripe={win ? 'bg-[#2E7D5A]' : 'bg-[#C0392B]'}>
          <div className="px-3.5 pb-3 pt-3.5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="font-['Playfair_Display'] text-[20px] font-bold leading-none text-[#18181A]">{j.ticker}</span>
                  <span className={cls('inline-flex items-center rounded-full px-2 py-[2px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em]', win ? 'bg-[#E8F4EE] text-[#2E7D5A]' : 'bg-[#FDECEA] text-[#C0392B]')}>
                    {win ? 'Win' : 'Loss'}
                  </span>
                </div>
                <div className="mt-[5px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A7A9E]">{SETUP_LABELS[j.setup]}</div>
              </div>
              <div className="flex flex-col items-end">
                <span className={cls("font-['DM_Mono'] text-[14px]", win ? 'text-[#2E7D5A]' : 'text-[#C0392B]')}>{win ? '+' : ''}{j.r.toFixed(2)}R</span>
                <span className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">{j.closed}</span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <div className="font-[Carlito] text-[10px] uppercase tracking-[0.1em] text-[#8A8A94]">Entry rationale</div>
                <div className="font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">{j.entryNote}</div>
              </div>
              <div>
                <div className="font-[Carlito] text-[10px] uppercase tracking-[0.1em] text-[#8A8A94]">Exit rationale</div>
                <div className="font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">{j.exitNote}</div>
              </div>
            </div>
          </div>
        </Card>
      );
    })}
  </div>
);

export const SentimentView = () => (
  <div className="flex flex-col gap-3 p-4 pb-24">
    <Card>
      <div className="px-3.5 pb-3.5 pt-3.5">
        <div className="flex items-center gap-1.5">
          <IconSparkle size={14} stroke="#3D5A7A" />
          <span className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.14em] text-[#3D5A7A]">AI Market Intel</span>
          <span className="ml-auto font-['DM_Mono'] text-[10px] text-[#8A8A94]">{SENTIMENT.ts}</span>
        </div>
        <h2 className="mt-2 font-['Playfair_Display'] text-[22px] font-bold leading-tight text-[#18181A]">{SENTIMENT.headline}</h2>
        <p className="mt-2 font-[Carlito] text-[13px] leading-snug text-[#3C3C42]">{SENTIMENT.body}</p>
      </div>
    </Card>
    <SectionHeader title="Today's Read" />
    <Card>
      <ul className="divide-y divide-[rgba(24,24,26,0.08)]">
        {SENTIMENT.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 px-3.5 py-2.5">
            <span className="mt-[7px] h-[5px] w-[5px] flex-shrink-0 rounded-full bg-[#3D5A7A]" />
            <span className="font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">{b}</span>
          </li>
        ))}
      </ul>
    </Card>
    <button className="mt-1 flex items-center justify-center gap-1.5 rounded-[10px] border border-[#3D5A7A] bg-white py-3 font-[Carlito] text-[11px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A] active:bg-[#EBF0F5]">
      <IconRefresh size={13} /> Refresh Intel
    </button>
  </div>
);

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
  const [open, setOpen] = React.useState('momentum_continuation');
  return (
    <div className="flex flex-col gap-2.5 p-4 pb-24">
      <SectionHeader title="Setup Criteria" />
      {SETUPS.map((s) => {
        const isOpen = open === s.key;
        return (
          <Card key={s.key} onClick={() => setOpen(isOpen ? null : s.key)}>
            <div className="px-3.5 py-3">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <div className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A7A9E]">{SETUP_LABELS[s.key]}</div>
                  <div className="mt-1 font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">{s.blurb}</div>
                </div>
                <div className={cls('mt-0.5 transition-transform', isOpen && 'rotate-90')}>
                  <IconChevronRight size={16} stroke="#8A8A94" />
                </div>
              </div>
              {isOpen && (
                <ul className="mt-3 flex flex-col gap-1.5 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5">
                  {s.thresholds.map((t, i) => (
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
