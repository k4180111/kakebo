import { useKakeiboMonth } from '../hooks/useKakeiboMonth';
import { ReflectionForm } from '../components/ReflectionForm';
import { SummaryCards } from '../components/SummaryCards';

export function ReflectionView({ month }: { month: string }) {
  const data = useKakeiboMonth(month);
  if (!data) return null;

  return (
    <div className="flex flex-col gap-5">
      <SummaryCards summary={data.summary} />
      <ReflectionForm month={month} data={data} />
    </div>
  );
}
