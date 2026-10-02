import { ChevronLeft, ChevronRight } from 'lucide-react';
import { currentMonth, formatMonthLabel, shiftMonth } from '../lib/format';

export function MonthSwitcher({
  month,
  onChange,
}: {
  month: string;
  onChange: (m: string) => void;
}) {
  const isCurrent = month === currentMonth();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Предыдущий месяц"
        onClick={() => onChange(shiftMonth(month, -1))}
        className="rounded-full p-2 text-zen-muted transition-colors hover:bg-zen-bg hover:text-zen-text"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="min-w-[9.5rem] text-center font-display text-lg font-medium tracking-tight">
        {formatMonthLabel(month)}
      </span>

      <button
        type="button"
        aria-label="Следующий месяц"
        onClick={() => onChange(shiftMonth(month, 1))}
        className="rounded-full p-2 text-zen-muted transition-colors hover:bg-zen-bg hover:text-zen-text"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {!isCurrent && (
        <button
          type="button"
          onClick={() => onChange(currentMonth())}
          className="ml-1 rounded-full border border-zen-border px-3 py-1 text-xs text-zen-muted transition-colors hover:text-zen-text"
        >
          сегодня
        </button>
      )}
    </div>
  );
}
