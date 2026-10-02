import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { addTransaction } from '../db/queries';
import type { Categories } from '../db/schema';
import { buttonPrimary, Field, inputClass } from './ui';
import { todayISO } from '../lib/format';

interface Props {
  areas: { id: string; name: string }[];
  expenseCategories: Categories[];
  incomeCategories: Categories[];
  defaultDate?: string;
  onSaved?: () => void;
}

export function TransactionForm({
  areas,
  expenseCategories,
  incomeCategories,
  defaultDate,
  onSaved,
}: Props) {
  const { db, notifyDataChanged } = useDatabase();
  const [isIncome, setIsIncome] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? '');
  const [areaId, setAreaId] = useState(areas[0]?.id ?? '');
  const [date, setDate] = useState(defaultDate ?? todayISO());
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const categories = isIncome ? incomeCategories : expenseCategories;
  const activeCategoryId = categories.some((c) => c.id === categoryId)
    ? categoryId
    : (categories[0]?.id ?? '');

  function switchType(income: boolean) {
    setIsIncome(income);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!value || value <= 0) {
      setError('Введите сумму больше нуля');
      return;
    }
    if (!activeCategoryId || !areaId) {
      setError('Не выбраны категория или сфера');
      return;
    }

    try {
      addTransaction(db, {
        amount: value,
        is_income: isIncome ? 1 : 0,
        category_id: activeCategoryId,
        area_id: areaId,
        date: `${date} 12:00:00`,
        description: description.trim() || undefined,
      });
      notifyDataChanged();
      setAmount('');
      setDescription('');
      setError(null);
      onSaved?.();
    } catch (err) {
      console.error(err);
      setError('Не удалось сохранить запись');
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => switchType(false)}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
            !isIncome
              ? 'border-zen-wants bg-zen-wants/10 text-zen-wants'
              : 'border-zen-border text-zen-muted hover:text-zen-text'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          Расход
        </button>
        <button
          type="button"
          onClick={() => switchType(true)}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
            isIncome
              ? 'border-zen-income bg-zen-income/10 text-zen-income'
              : 'border-zen-border text-zen-muted hover:text-zen-text'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          Доход
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Сумма">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className={inputClass}
          />
        </Field>
        <Field label="Дата">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={isIncome ? 'Источник дохода' : 'Корзина'}>
        <select
          value={activeCategoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputClass}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Сфера">
        <select
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          className={inputClass}
        >
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Комментарий">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="напр. продукты на неделю"
          className={inputClass}
        />
      </Field>

      {error && <p className="text-sm text-zen-danger">{error}</p>}

      <button type="submit" className={buttonPrimary}>
        Сохранить
      </button>
    </form>
  );
}
