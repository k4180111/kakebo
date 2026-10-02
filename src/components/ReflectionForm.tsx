import { useState } from 'react';
import { updateBudgetReflections } from '../db/queries';
import { useDatabase } from '../hooks/useDatabase';
import type { MonthData } from '../hooks/useKakeiboMonth';
import { formatMoney } from '../lib/format';
import { buttonPrimary, Card, Field, inputClass, SectionTitle } from './ui';

const QUESTIONS = [
  {
    key: 'reflection_savings' as const,
    label: 'Сколько удалось отложить?',
    hint: 'Что помогло уложиться в цель сбережений?',
  },
  {
    key: 'reflection_expenses' as const,
    label: 'Что было самым полезным расходом?',
    hint: 'Какая трата действительно оправдала себя?',
  },
  {
    key: 'reflection_improve' as const,
    label: 'Что изменить в следующем месяце?',
    hint: 'Одна конкретная договорённость с собой.',
  },
];

export function ReflectionForm({ month, data }: { month: string; data: MonthData }) {
  const { db, notifyDataChanged } = useDatabase();
  const budget = data.summary.budget;

  const [answers, setAnswers] = useState({
    reflection_savings: budget?.reflection_savings ?? '',
    reflection_expenses: budget?.reflection_expenses ?? '',
    reflection_improve: budget?.reflection_improve ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!budget) {
    return (
      <Card>
        <SectionTitle>Рефлексия месяца</SectionTitle>
        <p className="text-sm text-zen-muted">
          Сначала сохраните план на месяц — рефлексия привязана к нему.
        </p>
      </Card>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      updateBudgetReflections(db, month, {
        reflection_savings: answers.reflection_savings.trim() || null,
        reflection_expenses: answers.reflection_expenses.trim() || null,
        reflection_improve: answers.reflection_improve.trim() || null,
      });
      notifyDataChanged();
      setError(null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      setError('Не удалось сохранить рефлексию');
    }
  }

  const recap = [
    { label: 'Доход', value: formatMoney(data.summary.incomeActual) },
    { label: 'Расход', value: formatMoney(data.summary.totalSpent) },
    {
      label: 'Итог',
      value: formatMoney(data.summary.savedActual),
      danger: data.summary.savedActual < 0,
    },
  ];

  return (
    <Card>
      <SectionTitle>Рефлексия месяца</SectionTitle>

      <div className="mb-5 grid grid-cols-3 gap-3 rounded-xl bg-zen-bg px-4 py-3">
        {recap.map((r) => (
          <div key={r.label}>
            <p className="text-xs uppercase tracking-wide text-zen-muted">{r.label}</p>
            <p className={`tabular ${r.danger ? 'text-zen-danger' : ''}`}>{r.value}</p>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {QUESTIONS.map((q) => (
          <Field key={q.key} label={q.label}>
            <textarea
              value={answers[q.key]}
              onChange={(e) => {
                setSaved(false);
                setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }));
              }}
              placeholder={q.hint}
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </Field>
        ))}

        {error && <p className="text-sm text-zen-danger">{error}</p>}

        <button type="submit" className={buttonPrimary}>
          {saved ? 'Сохранено' : 'Сохранить рефлексию'}
        </button>
      </form>
    </Card>
  );
}
