import type { KakeiboSummary } from '../db/queries';
import { formatMoney, pluralDays, remainingDays } from '../lib/format';

interface Props {
  summary: KakeiboSummary;
  month: string;
  onPlanClick?: () => void;
}

export function SummaryCards({ summary, month, onPlanClick }: Props) {
  const { budget } = summary;

  if (!budget) {
    return (
      <div className="rounded-2xl border border-dashed border-zen-border bg-zen-card p-6 text-center">
        <p className="font-display text-lg">Месяц ещё не спланирован</p>
        <p className="mt-1 text-sm text-zen-muted">
          Укажите ожидаемый доход, обязательные платежи и цель сбережений —
          Какейбо покажет, сколько действительно можно потратить.
        </p>
        {onPlanClick && (
          <button
            type="button"
            onClick={onPlanClick}
            className="mt-4 text-sm text-zen-accent hover:underline"
          >
            Перейти к плану →
          </button>
        )}
      </div>
    );
  }

  const overBudget = summary.remainingBudget < 0;
  const rem = remainingDays(month);
  const dailyPace = rem > 0 ? Math.floor(summary.remainingBudget / rem) : null;

  const goalPct =
    budget.savings_goal > 0
      ? Math.max(0, Math.min(100, Math.round((summary.savedActual / budget.savings_goal) * 100)))
      : null;

  const incomePct = budget.income_plan > 0
    ? Math.min(100, Math.round((summary.incomeActual / budget.income_plan) * 100))
    : 0;

  const spentPct = summary.availableBudget > 0
    ? Math.min(100, Math.round((summary.totalSpent / summary.availableBudget) * 100))
    : (summary.totalSpent > 0 ? 100 : 0);

  const remainingPct = summary.availableBudget > 0
    ? Math.max(0, Math.min(100, Math.round((summary.remainingBudget / summary.availableBudget) * 100)))
    : 0;

  const cards = [
    {
      label: 'Доход',
      value: formatMoney(summary.incomeActual),
      hint: `план ${formatMoney(budget.income_plan)}`,
      progress: incomePct,
      color: 'bg-zen-income',
    },
    {
      label: 'Потрачено',
      value: formatMoney(summary.totalSpent),
      hint: `лимит ${formatMoney(summary.availableBudget)}`,
      progress: spentPct,
      color: 'bg-zen-wants',
      danger: overBudget,
    },
    {
      label: 'Остаток лимита',
      value: formatMoney(Math.abs(summary.remainingBudget)),
      hint: overBudget ? 'сверх лимита' : 'можно потратить',
      progress: remainingPct,
      color: 'bg-zen-accent',
      danger: overBudget,
    },
    {
      label: 'Отложено',
      value: formatMoney(summary.savedActual),
      hint: budget.savings_goal > 0
        ? `${goalPct}% от цели`
        : 'цель не задана',
      progress: goalPct ?? 0,
      color: 'bg-zen-culture',
      danger: summary.savedActual < 0,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-zen-border bg-zen-card p-4">
            <p className="text-xs uppercase tracking-wide text-zen-muted">{c.label}</p>
            <p
              className={`tabular mt-1.5 text-xl ${
                c.danger ? 'text-zen-danger' : 'text-zen-text'
              }`}
            >
              {c.value}
            </p>
            <p className="tabular mt-0.5 text-xs text-zen-muted">{c.hint}</p>
            {c.progress > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zen-border/60">
                <div
                  className={`h-full rounded-full transition-all ${
                    c.danger ? 'bg-zen-danger' : c.color
                  }`}
                  style={{ width: `${c.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {dailyPace !== null && (
        <div className="flex items-center justify-between rounded-xl bg-zen-accent/10 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zen-muted">
              {dailyPace >= 0 ? 'Доступно в день' : 'Превышение в день'}
            </p>
            <p className={`tabular text-lg ${dailyPace < 0 ? 'text-zen-danger' : 'text-zen-accent'}`}>
              {formatMoney(Math.abs(dailyPace))}
            </p>
          </div>
          <p className="text-sm text-zen-muted">
            {rem > 0 ? pluralDays(rem) : 'месяц завершён'}
          </p>
        </div>
      )}
    </div>
  );
}
