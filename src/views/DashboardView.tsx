import { useKakeiboMonth } from '../hooks/useKakeiboMonth';
import { BudgetPlanForm } from '../components/BudgetPlanForm';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { SummaryCards } from '../components/SummaryCards';
import { TransactionForm } from '../components/TransactionForm';
import { TransactionList } from '../components/TransactionList';
import { Card, SectionTitle } from '../components/ui';
import { todayISO } from '../lib/format';

export function DashboardView({ month }: { month: string }) {
  const data = useKakeiboMonth(month);

  if (!data) return null;

  const nameByKey = Object.fromEntries(data.categories.map((c) => [c.key, c.name]));
  const recent = data.transactions.slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <SummaryCards summary={data.summary} />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-5">
          <CategoryBreakdown summary={data.summary} nameByKey={nameByKey} />
          <Card>
            <SectionTitle>Последние записи</SectionTitle>
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
