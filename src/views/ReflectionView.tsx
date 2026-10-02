import { useKakeiboMonth } from '../hooks/useKakeiboMonth';
import { ReflectionForm } from '../components/ReflectionForm';
import { SummaryCards } from '../components/SummaryCards';
import { CategoryBreakdown } from '../components/CategoryBreakdown';

export function ReflectionView({ month }: { month: string }) {
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
    <div className="space-y-5">
      <SummaryCards summary={data.summary} month={month} />
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <CategoryBreakdown summary={data.summary} nameByKey={nameByKey} />
        <ReflectionForm month={month} data={data} />
      </div>
    </div>
  );
}
