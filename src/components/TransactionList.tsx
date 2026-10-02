import { Trash2 } from 'lucide-react';
import { deleteTransaction } from '../db/queries';
import { useDatabase } from '../hooks/useDatabase';
import type { TransactionRow } from '../hooks/useKakeiboMonth';
import { getCatColor } from '../lib/categories';
import { formatDateLong, formatMoney } from '../lib/format';
import { EmptyState } from './ui';

export function TransactionList({ items }: { items: TransactionRow[] }) {
  const { db, notifyDataChanged } = useDatabase();

  if (items.length === 0) {
    return <EmptyState>В этом месяце пока нет записей.</EmptyState>;
  }

  const groups = new Map<string, TransactionRow[]>();
  for (const t of items) {
    const day = String(t.date).slice(0, 10);
    const bucket = groups.get(day);
    if (bucket) bucket.push(t);
    else groups.set(day, [t]);
  }

  function remove(id: string) {
    try {
      deleteTransaction(db, id);
      notifyDataChanged();
    } catch (err) {
      console.error('delete transaction failed', err);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {[...groups.entries()].map(([day, rows]) => {
        const dayTotal = rows.reduce(
          (acc, r) => acc + (r.is_income ? r.amount : -r.amount),
          0,
        );
        return (
          <div key={day}>
            <div className="mb-1.5 flex items-baseline justify-between border-b border-zen-border pb-1">
              <span className="text-sm text-zen-muted">{formatDateLong(day)}</span>
              <span
                className={`tabular text-sm ${dayTotal >= 0 ? 'text-zen-income' : 'text-zen-muted'}`}
              >
                {dayTotal >= 0 ? '+' : '−'}
                {formatMoney(Math.abs(dayTotal))}
              </span>
            </div>
            <ul>
              {rows.map((r) => (
                <li key={r.id} className="group flex items-center gap-3 py-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: getCatColor(r.category_key) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.description || r.category_name}</p>
                    <p className="truncate text-xs text-zen-muted">
                      {r.category_name} · {r.area_name}
                    </p>
                  </div>
                  <span
                    className={`tabular shrink-0 text-sm ${
                      r.is_income ? 'text-zen-income' : 'text-zen-text'
                    }`}
                  >
                    {r.is_income ? '+' : '−'}
                    {formatMoney(r.amount)}
                  </span>
                  <button
                    type="button"
                    aria-label="Удалить запись"
                    onClick={() => remove(r.id)}
                    className="shrink-0 rounded-lg p-1.5 text-zen-border transition-colors hover:bg-zen-danger/10 hover:text-zen-danger group-hover:text-zen-muted"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
