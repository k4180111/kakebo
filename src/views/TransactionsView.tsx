import { useKakeiboMonth } from '../hooks/useKakeiboMonth';
import { TransactionForm } from '../components/TransactionForm';
import { TransactionList } from '../components/TransactionList';
import { Card, SectionTitle } from '../components/ui';
import { todayISO } from '../lib/format';

export function TransactionsView({ month }: { month: string }) {
  const data = useKakeiboMonth(month);
  if (!data) return null;

  const income = data.transactions
    .filter((t) => t.is_income === 1)
    .reduce((acc, t) => acc + t.amount, 0);
  const expense = data.transactions
    .filter((t) => t.is_income === 0)
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
      <Card>
        <SectionTitle
          action={
            <span className="tabular text-sm text-zen-muted">
              <span className="text-zen-income">+{income.toLocaleString('ru-RU')}</span>
              {' / '}
              <span className="text-zen-wants">−{expense.toLocaleString('ru-RU')}</span>
            </span>
          }
        >
          Все записи месяца
        </SectionTitle>
        <TransactionList items={data.transactions} />
      </Card>

      <Card>
        <SectionTitle>Добавить</SectionTitle>
        <TransactionForm
          areas={data.areas}
          expenseCategories={data.expenseCategories}
          incomeCategories={data.incomeCategories}
          defaultDate={month === todayISO().slice(0, 7) ? todayISO() : `${month}-01`}
        />
      </Card>
    </div>
  );
}
