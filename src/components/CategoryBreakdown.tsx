import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { KakeiboSummary } from '../db/queries';
import { getCatColor } from '../lib/categories';
import { formatMoney } from '../lib/format';
import { Card, EmptyState, SectionTitle } from './ui';

interface Props {
  summary: KakeiboSummary;
  nameByKey: Record<string, string>;
}

export function CategoryBreakdown({ summary, nameByKey }: Props) {
  const rows = Object.entries(summary.spentByCategory)
    .map(([key, spent]) => ({
      key,
      name: nameByKey[key] ?? key,
      spent,
      plan: summary.planByCategory[key] ?? 0,
    }))
    .filter((r) => r.spent > 0 || r.plan > 0);

  const chartData = rows.filter((r) => r.spent > 0);

  if (rows.length === 0) {
    return (
      <Card>
        <SectionTitle>Четыре корзины</SectionTitle>
        <EmptyState>Добавьте первый расход, чтобы увидеть распределение.</EmptyState>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>Четыре корзины</SectionTitle>

      <div className="grid gap-5 md:grid-cols-[200px_1fr] md:items-center">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="spent"
                nameKey="name"
                innerRadius="60%"
                outerRadius="90%"
                paddingAngle={2}
                stroke="none"
              >
                {chartData.map((d) => (
                  <Cell key={d.key} fill={getCatColor(d.key)} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatMoney(Number(v ?? 0))} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const pct = r.plan > 0 ? Math.min(100, (r.spent / r.plan) * 100) : null;
            const over = pct !== null && pct >= 100;
            return (
              <div key={r.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: getCatColor(r.key) }}
                    />
                    {r.name}
                  </span>
                  <span className="tabular text-zen-muted">
                    {formatMoney(r.spent)}
                    {r.plan > 0 && ` / ${formatMoney(r.plan)}`}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zen-border/60">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct ?? (r.spent > 0 ? 100 : 0)}%`,
                      backgroundColor: over ? '#c1666b' : getCatColor(r.key),
                    }}
                  />
                </div>
                {over && (
                  <p className="tabular mt-1 text-xs text-zen-danger">
                    перерасход {formatMoney(r.spent - r.plan)}
                  </p>
                )}
                {pct === null && (
                  <p className="mt-1 text-xs text-zen-muted">на эту корзину нет плана</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
