import { useKakeiboMonth } from '../hooks/useKakeiboMonth';
import { BudgetPlanForm } from '../components/BudgetPlanForm';
import { CategoryBreakdown } from '../components/CategoryBreakdown';

export function PlanView({ month }: { month: string }) {
  const data = useKakeiboMonth(month);
  if (!data) return null;

  if (data.error) {
    return (
      <div className="rounded-2xl border border-zen-danger/30 bg-zen-danger/5 p-6 text-center">
        <p className="font-display text-lg text-zen-danger">Ошибка загрузки данных</p>
        <p className="mt-1 text-sm text-zen-muted">{data.error}</p>
      </div>
    );
  }

  const nameByKey = Object.fromEntries(data.categories.map((c) => [c.key, c.name]));

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <BudgetPlanForm month={month} data={data} />
      <CategoryBreakdown summary={data.summary} nameByKey={nameByKey} />
    </div>
  );
}
