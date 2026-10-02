import { useMemo } from 'react';
import { useDatabase } from './useDatabase';
import {
  getAreas,
  getCategories,
  getCategoryPlan,
  getKakeiboSummary,
  getMonthlyTransactions,
  type CategoryPlanItem,
  type KakeiboSummary,
} from '../db/queries';
import type { Areas, Categories } from '../db/schema';

export interface TransactionRow {
  id: string;
  date: string;
  is_income: number;
  amount: number;
  description: string | null;
  category_name: string;
  category_key: string;
  area_name: string;
}

export interface MonthData {
  summary: KakeiboSummary;
  transactions: TransactionRow[];
  categories: Categories[];
  expenseCategories: Categories[];
  incomeCategories: Categories[];
  areas: Areas[];
  plan: CategoryPlanItem[];
}

export function useKakeiboMonth(month: string): MonthData | null {
  const { db, refreshKey } = useDatabase();

  // Любая запись в БД инкрементирует refreshKey. Он обязан влиять и на тело
  // мемоизации, иначе правило deps не поймёт, зачем он в списке зависимостей.
  const revision = refreshKey;

  return useMemo(() => {
    if (!db) return null;
    void revision; // явный сигнал: перечитать агрегаты после изменения данных
    try {
      const categories = getCategories(db);
      return {
        summary: getKakeiboSummary(db, month),
        transactions: getMonthlyTransactions(db, month) as unknown as TransactionRow[],
        categories,
        expenseCategories: categories.filter((c) => c.is_income === 0),
        incomeCategories: categories.filter((c) => c.is_income === 1),
        areas: getAreas(db),
        plan: getCategoryPlan(db, month),
      };
    } catch (err) {
      console.error('useKakeiboMonth error:', err);
      return null;
    }
  }, [db, month, revision]);
}
