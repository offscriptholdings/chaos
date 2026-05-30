// Main App: bottom-nav shell + tab routing.
import React from 'react';
import {
  IconActivity, IconList, IconBookOpen, IconTrendingUp,
  IconBarChart3, IconSlidersHorizontal, IconFileSearch, IconArrowLeft, IconBell, IconTarget,
} from './icons.jsx';
import { AppBar } from './components.jsx';
import {
  DashboardView, SignalQueueView, SignalDetailView,
  JournalView, SentimentView, BacktestView, CriteriaView, PerformanceView,
} from './views.jsx';

const TABS = [
  { key: 'dashboard',     label: 'Dash',     Icon: IconActivity,          title: 'Chaos',   italic: 'Dashboard' },
  { key: 'queue',         label: 'Signals',  Icon: IconList,              title: 'Signal',  italic: 'Queue' },
  { key: 'journal',       label: 'Journal',  Icon: IconBookOpen,          title: 'Journal' },
  { key: 'sentiment',     label: 'Intel',    Icon: IconTrendingUp,        title: 'Market',  italic: 'Intel' },
  { key: 'backtest',      label: 'Backtest', Icon: IconBarChart3,         title: 'Backtest' },
  { key: 'criteria',      label: 'Criteria', Icon: IconSlidersHorizontal, title: 'Setup',   italic: 'Criteria' },
  { key: 'performance',  label: 'Perf',     Icon: IconTarget,            title: 'Performance' },
  { key: 'signal_detail', label: 'Detail',   Icon: IconFileSearch,        title: 'Signal',  italic: 'Detail', hidden: true },
];

const App = () => {
  const [active, setActive] = React.useState('dashboard');
  const [signalId, setSignalId] = React.useState(null);

  const openSignal = (id) => {
    setSignalId(id);
    setActive('signal_detail');
  };

  const navTabs = TABS.filter((t) => !t.hidden || t.key === active);
  const tab = TABS.find((t) => t.key === active);

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[600px] flex-col bg-[#FAFAF8]">
      <AppBar
        title={tab.title}
        italic={tab.italic}
        left={
          active === 'signal_detail' ? (
            <button onClick={() => setActive('queue')}>
              <IconArrowLeft size={20} stroke="#3D5A7A" />
            </button>
          ) : null
        }
        right={<IconBell size={18} stroke="#8A8A94" />}
      />

      <div className="flex-1 overflow-y-auto">
        {active === 'dashboard'     && <DashboardView openSignal={openSignal} goToQueue={() => setActive('queue')} />}
        {active === 'queue'         && <SignalQueueView openSignal={openSignal} />}
        {active === 'signal_detail' && <SignalDetailView signalId={signalId} back={() => setActive('queue')} />}
        {active === 'journal'       && <JournalView />}
        {active === 'sentiment'     && <SentimentView />}
        {active === 'backtest'      && <BacktestView />}
        {active === 'criteria'      && <CriteriaView />}
        {active === 'performance'  && <PerformanceView />}
      </div>

      <nav className="border-t border-[rgba(24,24,26,0.08)] bg-white">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${navTabs.length}, minmax(0, 1fr))` }}>
          {navTabs.map(({ key, label, Icon }) => {
            const isActive = active === key;
            const color = isActive ? '#3D5A7A' : '#8A8A94';
            return (
              <button
                key={key}
                onClick={() => { if (key === 'signal_detail') return; setActive(key); }}
                className="flex flex-col items-center gap-[3px] py-2.5 active:bg-[#F2F0EC]"
              >
                <Icon size={18} stroke={color} strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="font-[Carlito] text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="h-[max(env(safe-area-inset-bottom),6px)] bg-white" />
      </nav>
    </div>
  );
};

export default App;
