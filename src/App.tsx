// src/App.tsx
import { useState } from 'react';
import {
  AlertTriangle,
  History,
  LayoutDashboard,
  List,
  NotebookPen,
  Target,
} from 'lucide-react';
import { useDatabase } from './hooks/useDatabase';
import { MonthSwitcher } from './components/MonthSwitcher';
import { currentMonth } from './lib/format';
import { DashboardView } from './views/DashboardView';
import { TransactionsView } from './views/TransactionsView';
import { PlanView } from './views/PlanView';
import { ReflectionView } from './views/ReflectionView';
import { HistoryView } from './components/HistoryView';

const TABS = [
  { id: 'dashboard', label: 'Обзор', icon: LayoutDashboard },
  { id: 'transactions', label: 'Операции', icon: List },
  { id: 'plan', label: 'План', icon: Target },
  { id: 'reflection', label: 'Рефлексия', icon: NotebookPen },
  { id: 'history', label: 'История', icon: History },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function App() {
  const { isLoading, error, storageMode } = useDatabase();
  const [tab, setTab] = useState<TabId>('dashboard');
  const [month, setMonth] = useState<string>(currentMonth());

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zen-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zen-border border-t-zen-accent" />
          <p className="text-sm">Открываем локальную базу…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-zen-border bg-zen-card p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-zen-danger" />
          <p className="font-display text-lg">База недоступна</p>
          <p className="mt-1 text-sm text-zen-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zen-border bg-zen-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h1 className="font-display text-2xl tracking-tight">家計簿 Какейбо</h1>
              <span className="hidden text-xs text-zen-muted sm:inline">
                {storageMode === 'opfs'
                  ? 'OPFS · данные сохраняются'
                  : 'память · данные не сохранятся'}
              </span>
            </div>
            <MonthSwitcher month={month} onChange={setMonth} />
          </div>

          <nav className="thin-scroll flex gap-1 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                  tab === id
                    ? 'bg-zen-accent text-white'
                    : 'text-zen-muted hover:bg-zen-card hover:text-zen-text'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {tab === 'dashboard' && <DashboardView month={month} />}
        {tab === 'transactions' && <TransactionsView month={month} />}
        {tab === 'plan' && <PlanView month={month} />}
        {tab === 'reflection' && <ReflectionView month={month} />}
        {tab === 'history' && <HistoryView />}
      </main>
    </div>
  );
}

export default App;
