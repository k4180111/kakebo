import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getMonthlyHistory } from '../db/queries';
import { useDatabase } from '../hooks/useDatabase';
import { formatMonthShort, formatMoney } from '../lib/format';
import { Card, EmptyState, SectionTitle } from './ui';

export function HistoryView() {
  const { db, refreshKey } = useDatabase();

  // Инкремент после записи должен перечитать историю
  const revision = refreshKey;

  const history = useMemo(() => {
    if (!db) return [];
    void revision; // явный сигнал: перечитать историю после изменения данных
    try {
      return getMonthlyHistory(db, 12);
    } catch (err) {
      console.error('history failed', err);
      return [];
    }
  }, [db, revision]);

  const chartData = useMemo(
    () =>
      [...history]
        .reverse()
        .map((r) => ({ month: formatMonthShort(r.month), доход: r.income, расход: r.expense })),
    [history],
  );

  if (history.length === 0) {
    return (
      <Card>
        <SectionTitle>История</SectionTitle>
        <EmptyState>Пока нет ни одной записи — история появится после первого расхода.</EmptyState>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <SectionTitle>Доход против расхода</SectionTitle>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e1d7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#737a75' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#737a75' }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}к` : String(v))}
              />
              <Tooltip formatter={(v) => formatMoney(Number(v ?? 0))} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="доход" fill="#6b8f9e" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="расход" fill="#e07a5f" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <SectionTitle>По месяцам</SectionTitle>
        <div className="overflow-x-auto thin-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zen-border text-left text-xs uppercase tracking-wide text-zen-muted">
                <th className="py-2 pr-3 font-medium">Месяц</th>
                <th className="py-2 pr-3 text-right font-medium">Доход</th>
                <th className="py-2 pr-3 text-right font-medium">Расход</th>
                <th className="py-2 pr-3 text-right font-medium">Итог</th>
                <th className="py-2 text-right font-medium">Цель</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => {
                const diff = r.income - r.expense;
                return (
                  <tr key={r.month} className="border-b border-zen-border/60 last:border-0">
                    <td className="py-2 pr-3 capitalize">{formatMonthShort(r.month)}</td>
                    <td className="tabular py-2 pr-3 text-right">{formatMoney(r.income)}</td>
                    <td className="tabular py-2 pr-3 text-right">{formatMoney(r.expense)}</td>
                    <td
                      className={`tabular py-2 pr-3 text-right ${
                        diff < 0 ? 'text-zen-danger' : 'text-zen-income'
                      }`}
                    >
                      {diff < 0 ? '−' : '+'}
                      {formatMoney(Math.abs(diff))}
                    </td>
                    <td className="tabular py-2 text-right text-zen-muted">
                      {r.savings_goal > 0 ? formatMoney(r.savings_goal) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
