import { useKakeiboMonth } from '../hooks/useKakeiboMonth';
import { BudgetPlanForm } from '../components/BudgetPlanForm';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { SummaryCards } from '../components/SummaryCards';
import { TransactionForm } from '../components/TransactionForm';
import { TransactionList } from '../components/TransactionList';
import { Card, SectionTitle } from '../components/ui';
import { todayISO } from '../lib/format';

export function DashboardView({
  month,
  onNavigate,
}: {
  month: string;
  onNavigate: (tab: string) => void;
}) {
  const data = useKakeiboMonth(month);

  if (!data) return null;

  if (data.error) {
    return (
      <div className="rounded-2xl border border-zen-danger/30 bg-zen-danger/5 p-6 text-center">
        <p className="font-display text-lg text-zen-danger">Ошибка загрузки данных</p>
        <p className="mt-1 text-sm text-zen-muted">{data.error}</p>
        <p className="mt-2 text-xs text-zen-muted">
          Проверьте консоль браузера для деталей
        </p>
      </div>
    );
  }

  const nameByKey = Object.fromEntries(data.categories.map((c) => [c.key, c.name]));
  const recent = data.transactions.slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <SummaryCards
        summary={data.summary}
        month={month}
        onPlanClick={() => onNavigate('plan')}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-5">
          <CategoryBreakdown summary={data.summary} nameByKey={nameByKey} />
          <Card>
            <SectionTitle
              action={
                data.transactions.length > 5 ? (
                  <button
                    type="button"
                    onClick={() => onNavigate('transactions')}
                    className="text-sm text-zen-accent hover:underline"
                  >
                    все {data.transactions.length}
                  </button>
                ) : undefined
              }
            >
              Последние записи
            </SectionTitle>
            <TransactionList items={recent} />
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <SectionTitle>Новая запись</SectionTitle>
            <TransactionForm
              areas={data.areas}
              expenseCategories={data.expenseCategories}
              incomeCategories={data.incomeCategories}
              defaultDate={month === todayISO().slice(0, 7) ? todayISO() : `${month}-01`}
            />
          </Card>
          <BudgetPlanForm month={month} data={data} />
        </div>
      </div>
    </div>
  );
}
