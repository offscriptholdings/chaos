// Shared components: Cards, badges, panels.
import React from 'react';
import { SETUP_LABELS } from './data.js';

export const cls = (...xs) => xs.filter(Boolean).join(' ');

export const convictionStripe = (c) =>
  c === 'High' ? 'bg-[#2E7D5A]' : c === 'Med' ? 'bg-[#B8893A]' : 'bg-[#8A8A94]';

export const Stat = ({ label, value, valueClass = 'text-[#18181A]' }) => (
  <div className="flex flex-col gap-[3px]">
    <div className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">{label}</div>
    <div className={cls("font-['DM_Mono'] text-[14px]", valueClass)}>{value}</div>
  </div>
);

export const StatStrip = ({ items }) => (
  <div className="rounded-[10px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-3">
    <div className="grid grid-cols-4 gap-2">
      {items.map((it) => (
        <Stat key={it.label} label={it.label} value={it.value} valueClass={it.valueClass} />
      ))}
    </div>
  </div>
);

export const RegimeBanner = ({ state, detail }) => (
  <div className="flex items-center gap-2 rounded-[10px] border border-[#3D5A7A]/30 bg-[#EBF0F5] px-3 py-2.5">
    <span className="relative inline-flex h-[7px] w-[7px]">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2E7D5A] opacity-50" />
      <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-[#2E7D5A]" />
    </span>
    <span className="font-[Carlito] text-[11px] text-[#3C3C42]">
      <span className="font-bold text-[#3D5A7A]">{state}</span>
      <span className="text-[#8A8A94]"> — </span>
      {detail}
    </span>
  </div>
);

export const RRPill = ({ rr }) => (
  <span className="inline-flex items-center rounded-full bg-[#EBF0F8] px-2 py-[2px] font-['DM_Mono'] text-[10px] font-medium tracking-tight text-[#3D6B9E]">
    R:R {rr.toFixed(2)}
  </span>
);

export const ConvictionTag = ({ c }) => {
  const cfg =
    c === 'High' ? { fg: '#2E7D5A', bg: '#E8F4EE' }
    : c === 'Med' ? { fg: '#B8893A', bg: '#F5EDD8' }
    : { fg: '#8A8A94', bg: '#F2F0EC' };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-[2px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em]"
      style={{ color: cfg.fg, background: cfg.bg }}
    >
      {c}
    </span>
  );
};

export const PositionBadge = ({ type }) =>
  type === 'live' ? (
    <span className="inline-flex items-center rounded-full bg-[#F5EDD8] px-2 py-[2px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#B8893A]">● Live</span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-[#EBF0F5] px-2 py-[2px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A]">○ Paper</span>
  );

export const Card = ({ children, className = '', stripe, onClick }) => (
  <div
    onClick={onClick}
    className={cls(
      'relative overflow-hidden rounded-[12px] border border-[rgba(24,24,26,0.14)] bg-white',
      onClick && 'cursor-pointer active:bg-[#F2F0EC]',
      className,
    )}
  >
    {stripe && <div className={cls('absolute left-0 right-0 top-0 h-[2px]', stripe)} />}
    {children}
  </div>
);

function formatTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatSignalDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SignalCard({ signal, onOpen, onTake }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Card stripe={convictionStripe(signal.conviction)}>
      <div className="px-3.5 pb-3 pt-3.5">
        <div
          className="flex cursor-pointer items-start justify-between"
          data-testid="signal-card-expand"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-['Playfair_Display'] text-[22px] font-bold leading-none text-[#18181A]">{signal.ticker}</span>
              <ConvictionTag c={signal.conviction} />
            </div>
            <div className="mt-[5px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A7A9E]">
              {SETUP_LABELS[signal.setup]}
            </div>
          </div>
          <div className="flex flex-col items-end gap-[2px]">
            <span className="font-['DM_Mono'] text-[16px] text-[#18181A]">${signal.entry.toFixed(2)}</span>
            <span className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">
              {signal.signal_date ? `${formatSignalDate(signal.signal_date)} · ${signal.age}` : signal.age}
            </span>
          </div>
        </div>
        <div className="mt-3 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">Stop</div>
              <div className="font-['DM_Mono'] text-[13px] text-[#C0392B]">${signal.stop.toFixed(2)}</div>
            </div>
            <div>
              <div className="font-[Carlito] text-[10px] uppercase tracking-[0.08em] text-[#8A8A94]">Target</div>
              <div className="font-['DM_Mono'] text-[13px] text-[#2E7D5A]">${signal.target.toFixed(2)}</div>
            </div>
            <div className="flex flex-col items-start justify-center">
              <RRPill rr={signal.rr} />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <button onClick={(e) => { e.stopPropagation(); onTake?.(signal.id); }} className="w-full rounded-[8px] bg-[#3D5A7A] py-2.5 font-[Carlito] text-[12px] font-bold uppercase tracking-[0.1em] text-white active:bg-[#2c4361]">Take It</button>
        </div>
        {expanded && (
          <div className="mt-3 border-t border-[rgba(24,24,26,0.08)] pt-3">
            {signal.memo_addendum && (
              <div className="mb-3 rounded-[4px] border-l-2 border-l-[#B8893A] bg-[#F5EDD8] pl-3 pr-2 py-2.5">
                <div className="mb-1.5 font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#B8893A]">
                  ADDENDUM
                  {signal.addendum_generated_at && (
                    <span className="ml-2 font-normal text-[#8A8A94] normal-case tracking-normal">
                      · {formatTimestamp(signal.addendum_generated_at)}
                    </span>
                  )}
                </div>
                <p className="font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">{signal.memo_addendum}</p>
              </div>
            )}

            {signal.memo && (
              <p className="mb-3 font-[Carlito] text-[12px] leading-snug text-[#3C3C42]">{signal.memo}</p>
            )}

            {onOpen && (
              <div className="flex justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); onOpen(signal.id); }}
                  className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.1em] text-[#3D5A7A]"
                >
                  View Detail →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export const PositionCard = ({ p }) => {
  const up = p.pnlPct != null && p.pnlPct >= 0;
  return (
    <Card>
      <div className="px-3.5 pb-3 pt-3.5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-['Playfair_Display'] text-[22px] font-bold leading-none text-[#18181A]">{p.ticker}</span>
              <PositionBadge type={p.type} />
            </div>
            <div className="mt-[5px] font-[Carlito] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5A7A9E]">{SETUP_LABELS[p.setup] ?? p.setup}</div>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-['DM_Mono'] text-[16px] text-[#18181A]">
              {p.current != null ? `$${p.current.toFixed(2)}` : '—'}
            </span>
            <span className={cls("font-['DM_Mono'] text-[11px]", p.pnlPct != null && p.pnlPct >= 0 ? 'text-[#2E7D5A]' : 'text-[#C0392B]')}>
              {p.pnlPct != null ? `${p.pnlPct >= 0 ? '+' : ''}${p.pnlPct.toFixed(2)}%` : '—'}
            </span>
          </div>
        </div>
        <div className="mt-3 rounded-[8px] border border-[rgba(24,24,26,0.08)] bg-[#F2F0EC] px-3 py-2.5">
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Entry" value={p.entry != null ? `$${p.entry.toFixed(2)}` : '—'} />
            <Stat label="Stop" value={p.stop != null ? `$${p.stop.toFixed(2)}` : '—'} valueClass="text-[#C0392B]" />
            <Stat
              label="R"
              value={p.r != null ? `${p.r >= 0 ? '+' : ''}${p.r.toFixed(2)}` : '—'}
              valueClass={p.r != null && p.r >= 0 ? 'text-[#2E7D5A]' : 'text-[#C0392B]'}
            />
            <Stat label="Days" value={`${p.daysHeld}d`} />
          </div>
        </div>
      </div>
    </Card>
  );
};

export const HintRow = ({ children }) => (
  <div className="rounded-[10px] border border-dashed border-[rgba(24,24,26,0.14)] bg-[#FAFAF8] px-3 py-3 font-[Carlito] text-[12px] text-[#8A8A94]">
    {children}
  </div>
);

export const SectionHeader = ({ title, right }) => (
  <div className="mb-2 mt-1 flex items-center justify-between">
    <div className="font-[Carlito] text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A8A94]">{title}</div>
    {right}
  </div>
);

export const AppBar = ({ title, italic, left, right }) => (
  <div className="flex items-center justify-between border-b border-[rgba(24,24,26,0.08)] bg-[#FAFAF8] px-4 pb-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
    <div className="flex w-8 justify-start">{left}</div>
    <div className="flex flex-col items-center">
      <div className="font-['Playfair_Display'] text-[18px] font-bold leading-none text-[#18181A]">
        {title}
        {italic && <span className="ml-1 font-['Playfair_Display'] italic text-[#3D5A7A]">{italic}</span>}
      </div>
    </div>
    <div className="flex w-8 justify-end">{right}</div>
  </div>
);
