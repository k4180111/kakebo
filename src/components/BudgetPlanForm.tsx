import { useState } from 'react';
import { saveCategoryPlan, upsertMonthlyBudgetPlan } from '../db/queries';
import { useDatabase } from '../hooks/useDatabase';
import type { MonthData } from '../hooks/useKakeiboMonth';
import { formatMoney } from '../lib/format';
import { getCatColor } from '../lib/categories';
import { buttonPrimary, Card, Field, inputClass, SectionTitle } from './ui';

export function BudgetPlanForm({ month, data }: { month: string; data: MonthData }) {
  const { db, notifyDataChanged } = useDatabase();
  const budget = data.summary.budget;

  const [incomePlan, setIncomePlan] = useState(String(budget?.income_plan ?? ''));
  const [fixedExpenses, setFixedExpenses] = useState(String(budget?.fixed_expenses ?? ''));
  const [savingsGoal, setSavingsGoal] = useState(String(budget?.savings_goal ?? ''));
  const [plan, setPlan] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const item of data.plan) initial[item.category_id] = Number(item.amount) || 0;
    return initial;
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (v: string) => {
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const income = num(incomePlan);
  const fixed = num(fixedExpenses);
  const savings = num(savingsGoal);
  const available = income - fixed - savings;
  const plannedTotal = data.expenseCategories.reduce(
    (acc, c) => acc + (plan[c.id] ?? 0),
    0,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (income <= 0) {
      setError('Укажите ожидаемый доход за месяц');
      return;
    }
    if (available < 0) {
      setError('Фиксированные расходы и цель сбережений больше дохода');
      return;
    }

    try {
      const budgetId = upsertMonthlyBudgetPlan(db, month, {
        income_plan: income,
        fixed_expenses: fixed,
        savings_goal: savings,
      });
      saveCategoryPlan(db, budgetId, plan);
      notifyDataChanged();
      setError(null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      setError('Не удалось сохранить план');
    }
  }

  return (
    <Card>
      <SectionTitle>План на {month}</SectionTitle>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Ожидаемый доход">
            <input
              value={incomePlan}
              onChange={(e) => setIncomePlan(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className={inputClass}
            />
          </Field>
          <Field label="Обязательные платежи">
            <input
              value={fixedExpenses}
              onChange={(e) => setFixedExpenses(e.target.value)}
              inputMode="decimal"
              placeholder="аренда, связь..."
              className={inputClass}
            />
          </Field>
          <Field label="Отложить">
            <input
              value={savingsGoal}
              onChange={(e) => setSavingsGoal(e.target.value)}
              inputMode="decimal"
              placeholder="цель сбережений"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="rounded-xl bg-zen-bg px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zen-muted">Доступно на жизнь</p>
          <p className="tabular text-2xl">{formatMoney(Math.max(0, available))}</p>
          {available < 0 && (
            <p className="tabular text-xs text-zen-danger">
              дефицит {formatMoney(Math.abs(available))}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zen-muted">
            Лимиты по корзинам
          </p>
          {data.expenseCategories.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: getCatColor(c.key) }}
              />
              <span className="flex-1 truncate text-sm">{c.name}</span>
              <input
                value={plan[c.id] ? String(plan[c.id]) : ''}
                onChange={(e) => {
                  setSaved(false);
                  setPlan((prev) => ({ ...prev, [c.id]: num(e.target.value) }));
                }}
                inputMode="decimal"
                placeholder="0"
                className={`${inputClass} tabular w-32 text-right`}
              />
            </div>
          ))}
          <div className="flex items-baseline justify-between border-t border-zen-border pt-2 text-sm">
            <span className="text-zen-muted">Запланировано всего</span>
            <span
              className={`tabular ${
                plannedTotal > available && available > 0 ? 'text-zen-danger' : ''
              }`}
            >
              {formatMoney(plannedTotal)}
            </span>
          </div>
        </div>

        {error && <p className="text-sm text-zen-danger">{error}</p>}

        <button type="submit" className={buttonPrimary}>
          {saved ? 'Сохранено' : 'Сохранить план'}
        </button>
      </form>
    </Card>
  );
}
