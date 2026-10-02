import type { KakeiboSummary } from '../db/queries';
import { formatMoney } from '../lib/format';

export function SummaryCards({ summary }: { summary: KakeiboSummary }) {
  const { budget } = summary;

  if (!budget) {
    return (
      <div className="rounded-2xl border border-dashed border-zen-border bg-zen-card p-6 text-center">
        <p className="font-display text-lg">Месяц ещё не спланирован</p>
        <p className="mt-1 text-sm text-zen-muted">
          Укажите ожидаемый доход, обязательные платежи и цель сбережений —
          Какейбо покажет, сколько действительно можно потратить.
        </p>
      </div>
    );
  }

  const overBudget = summary.remainingBudget < 0;
  const goalPct =
    summary.budget!.savings_goal > 0
      ? Math.min(100, Math.round((summary.savedActual / summary.budget!.savings_goal) * 100))
      : null;

  const cards = [
    {
      label: 'Доход за месяц',
      value: formatMoney(summary.incomeActual),
      hint: `в плане ${formatMoney(budget.income_plan)}`,
    },
    {
      label: 'Потрачено',
      value: formatMoney(summary.totalSpent),
      hint: `лимит ${formatMoney(summary.availableBudget)}`,
    },
    {
      label: 'Остаток лимита',
      value: formatMoney(Math.abs(summary.remainingBudget)),
      hint: overBudget ? 'сверх лимита' : 'можно потратить',
      danger: overBudget,
    },
    {
      label: 'Отложено',
      value: formatMoney(summary.savedActual),
      hint: goalPct !== null ? `${goalPct}% от цели` : `цель ${formatMoney(budget.savings_goal)}`,
      danger: summary.savedActual < 0,
    },
  ];

  return (
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
        </div>
      ))}
    </div>
  );
}
