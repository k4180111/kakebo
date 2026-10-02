import { useKakeiboMonth } from '../hooks/useKakeiboMonth';
import { BudgetPlanForm } from '../components/BudgetPlanForm';
import { CategoryBreakdown } from '../components/CategoryBreakdown';

export function PlanView({ month }: { month: string }) {
  const data = useKakeiboMonth(month);
  if (!data) return null;

  const nameByKey = Object.fromEntries(data.categories.map((c) => [c.key, c.name]));

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <BudgetPlanForm month={month} data={data} />
      <CategoryBreakdown summary={data.summary} nameByKey={nameByKey} />
    </div>
  );
}
