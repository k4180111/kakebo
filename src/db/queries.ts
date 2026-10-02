// src/db/queries.ts
//
// Слой запросов поверх sqlite-wasm (oo1).
//
// ВАЖНО про API: установленная сборка @sqlite.org/sqlite-wasm НЕ предоставляет
// sql.js-совместимый интерфейс (prepare -> step -> getAsObject -> free) — этих
// методов у statement просто нет. Единственный переносимый способ прочитать
// данные — db.exec с опциями:
//   db.exec({ sql, bind, rowMode: 'object', returnRows: true })  // строки
//   db.exec({ sql, bind, rowMode: 'array',  callback })          // скаляры
// Вызов db.exec('SELECT ...') строкой возвращает только метаданные базы,
// поэтому нигде ниже не используется.
import type { Categories, MonthlyBudget, Areas } from './schema';

// --- 1. Константы ключей категорий Kakeibo ---
export const KAKEIBO_CATEGORY_KEYS = {
  NEEDS: 'needs',
  WANTS: 'wants',
  CULTURE: 'culture',
  UNEXPECTED: 'unexpected',
} as const;

// --- 2. Примитивы доступа ---

/** Все строки запроса в виде объектов. */
function allRows<T>(db: any, sql: string, bind: ReadonlyArray<unknown> = []): T[] {
  return db.exec({ sql, bind: bind as unknown[], rowMode: 'object', returnRows: true }) as T[];
}

/** Первая строка запроса либо null. */
function firstRow<T>(db: any, sql: string, bind: ReadonlyArray<unknown> = []): T | null {
  const rows = allRows<T>(db, sql, bind);
  return rows.length > 0 ? rows[0] : null;
}

/** Первая колонка первой строки либо null. */
function scalar(db: any, sql: string, bind: ReadonlyArray<unknown> = []): unknown {
  let value: unknown = null;
  db.exec({
    sql,
    bind: bind as unknown[],
    rowMode: 'array',
    callback: (row: unknown[]) => {
      value = row[0];
    },
  });
  return value;
}

function scalarNumber(db: any, sql: string, bind: ReadonlyArray<unknown> = []): number {
  const value = scalar(db, sql, bind);
  return value === null || value === undefined ? 0 : Number(value) || 0;
}

// --- 3. Сидинг дефолтных категорий и сфер ---
export function seedInitialData(db: any) {
  if (scalarNumber(db, 'SELECT COUNT(*) FROM areas') > 0) return; // Уже заполнено

  db.exec({
    sql: 'INSERT OR IGNORE INTO areas (id, enabled, key, name) VALUES (?, 1, ?, ?)',
    bind: [crypto.randomUUID(), 'default', 'Личные финансы'],
  });

  const initialCategories = [
    { key: KAKEIBO_CATEGORY_KEYS.NEEDS, name: 'Потребности', is_income: 0 },
    { key: KAKEIBO_CATEGORY_KEYS.WANTS, name: 'Желания', is_income: 0 },
    { key: KAKEIBO_CATEGORY_KEYS.CULTURE, name: 'Развитие', is_income: 0 },
    { key: KAKEIBO_CATEGORY_KEYS.UNEXPECTED, name: 'Непредвиденное', is_income: 0 },
    { key: 'salary', name: 'Зарплата / Доход', is_income: 1 },
  ];

  for (const cat of initialCategories) {
    db.exec({
      sql: 'INSERT OR IGNORE INTO categories (id, enabled, key, name, is_income) VALUES (?, 1, ?, ?, ?)',
      bind: [crypto.randomUUID(), cat.key, cat.name, cat.is_income],
    });
  }
}

// --- 4. Справочники ---
export function getCategories(db: any): Categories[] {
  return allRows<Categories>(
    db,
    'SELECT * FROM categories WHERE enabled = 1 ORDER BY is_income, name',
  );
}

export function getAreas(db: any): Areas[] {
  return allRows<Areas>(db, 'SELECT * FROM areas WHERE enabled = 1 ORDER BY name');
}

// --- 5. Транзакции (расходы и доходы) ---
export interface CreateTransactionDto {
  amount: number;
  is_income: number;
  area_id: string;
  category_id: string;
  description?: string;
  date?: string; // 'YYYY-MM-DD' либо 'YYYY-MM-DD HH:MM:SS'
}

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

export function addTransaction(db: any, dto: CreateTransactionDto): string {
  const id = crypto.randomUUID();
  const date = dto.date || new Date().toISOString().slice(0, 19).replace('T', ' ');

  db.exec({
    sql: `INSERT INTO transactions (id, date, is_income, amount, area_id, category_id, description)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    bind: [id, date, dto.is_income, dto.amount, dto.area_id, dto.category_id, dto.description ?? null],
  });

  return id;
}

export function deleteTransaction(db: any, id: string) {
  db.exec({ sql: 'DELETE FROM transactions WHERE id = ?', bind: [id] });
}

/** Все операции месяца, новые даты сверху. */
export function getMonthlyTransactions(db: any, month: string): TransactionRow[] {
  return allRows<TransactionRow>(
    db,
    `SELECT
       t.id, t.date, t.is_income, t.amount, t.description,
       c.name AS category_name, c.key AS category_key,
       a.name AS area_name
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     JOIN areas a ON a.id = t.area_id
     WHERE substr(t.date, 1, 7) = ?
     ORDER BY t.date DESC, t.rowid DESC`,
    [month],
  );
}

// --- 6. Бюджет месяца ---

/** Только чтение — не создаёт строк побочно. */
export function getMonthlyBudget(db: any, month: string): MonthlyBudget | null {
  return firstRow<MonthlyBudget>(db, 'SELECT * FROM monthly_budget WHERE month = ?', [month]);
}

/** План месяца создаётся/обновляется только действием пользователя. */
export function upsertMonthlyBudgetPlan(
  db: any,
  month: string,
  data: { income_plan: number; fixed_expenses: number; savings_goal: number },
): string {
  const id = crypto.randomUUID();
  db.exec({
    sql: `INSERT INTO monthly_budget (id, month, income_plan, fixed_expenses, savings_goal)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(month) DO UPDATE SET
            income_plan    = excluded.income_plan,
            fixed_expenses = excluded.fixed_expenses,
            savings_goal   = excluded.savings_goal`,
    bind: [id, month, data.income_plan, data.fixed_expenses, data.savings_goal],
  });
  return getMonthlyBudget(db, month)!.id;
}

/** Совместимость со старым кодом: вернуть план, создав пустой при отсутствии. */
export function getOrCreateMonthlyBudget(
  db: any,
  month: string,
  defaults = { income: 0, fixed: 0, savings: 0 },
): MonthlyBudget {
  const existing = getMonthlyBudget(db, month);
  if (existing) return existing;

  const id = upsertMonthlyBudgetPlan(db, month, {
    income_plan: defaults.income,
    fixed_expenses: defaults.fixed,
    savings_goal: defaults.savings,
  });

  return (
    getMonthlyBudget(db, month) ?? {
      id,
      month,
      income_plan: defaults.income,
      fixed_expenses: defaults.fixed,
      savings_goal: defaults.savings,
    }
  );
}

export function updateBudgetReflections(
  db: any,
  month: string,
  reflections: {
    reflection_savings: string | null;
    reflection_expenses: string | null;
    reflection_improve: string | null;
  },
) {
  db.exec({
    sql: `UPDATE monthly_budget SET
            reflection_savings  = ?,
            reflection_expenses = ?,
            reflection_improve  = ?
          WHERE month = ?`,
    bind: [
      reflections.reflection_savings,
      reflections.reflection_expenses,
      reflections.reflection_improve,
      month,
    ],
  });
}

// --- 7. План расходов по корзинам ---
export interface CategoryPlanItem {
  id: string;
  month_budget_id: string;
  category_id: string;
  category_name: string;
  category_key: string;
  amount: number;
}

export function getCategoryPlan(db: any, month: string): CategoryPlanItem[] {
  return allRows<CategoryPlanItem>(
    db,
    `SELECT ep.id, ep.month_budget_id, ep.expense_category_id AS category_id,
            ep.amount, c.name AS category_name, c.key AS category_key
     FROM monthly_budget__expenses_plan ep
     JOIN categories c ON c.id = ep.expense_category_id
     JOIN monthly_budget mb ON mb.id = ep.month_budget_id
     WHERE mb.month = ?`,
    [month],
  );
}

export function saveCategoryPlan(db: any, monthBudgetId: string, plan: Record<string, number>) {
  db.exec({
    sql: 'DELETE FROM monthly_budget__expenses_plan WHERE month_budget_id = ?',
    bind: [monthBudgetId],
  });
  for (const [categoryId, amount] of Object.entries(plan)) {
    if (amount > 0) {
      db.exec({
        sql: `INSERT INTO monthly_budget__expenses_plan (id, month_budget_id, expense_category_id, amount)
              VALUES (?, ?, ?, ?)`,
        bind: [crypto.randomUUID(), monthBudgetId, categoryId, amount],
      });
    }
  }
}

// --- 8. Агрегированная аналитика Kakeibo за месяц ---
export interface KakeiboSummary {
  budget: MonthlyBudget | null;
  incomeActual: number;
  totalSpent: number;
  spentByCategory: Record<string, number>;
  planByCategory: Record<string, number>;
  availableBudget: number;
  remainingBudget: number;
  savedActual: number;
}

export function getKakeiboSummary(db: any, month: string): KakeiboSummary {
  const budget = getMonthlyBudget(db, month);

  const incomeActual = scalarNumber(
    db,
    `SELECT COALESCE(SUM(amount), 0) FROM transactions
     WHERE substr(date, 1, 7) = ? AND is_income = 1`,
    [month],
  );

  const spentByCategory: Record<string, number> = {
    needs: 0,
    wants: 0,
    culture: 0,
    unexpected: 0,
  };

  const byKey = allRows<{ key: string; total: number | string }>(
    db,
    `SELECT c.key AS key, SUM(t.amount) AS total
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE substr(t.date, 1, 7) = ? AND t.is_income = 0
     GROUP BY c.key`,
    [month],
  );

  let totalSpent = 0;
  for (const row of byKey) {
    const amount = Number(row.total) || 0;
    spentByCategory[row.key] = (spentByCategory[row.key] ?? 0) + amount;
    totalSpent += amount;
  }

  const planByCategory: Record<string, number> = {};
  for (const item of getCategoryPlan(db, month)) {
    planByCategory[item.category_key] = Number(item.amount) || 0;
  }

  // Формула Какейбо: доступный лимит = доход − обязательные платежи − цель сбережений
  const incomePlan = Number(budget?.income_plan ?? 0);
  const fixedExpenses = Number(budget?.fixed_expenses ?? 0);
  const savingsGoal = Number(budget?.savings_goal ?? 0);
  const availableBudget = incomePlan - fixedExpenses - savingsGoal;

  return {
    budget,
    incomeActual,
    totalSpent,
    spentByCategory,
    planByCategory,
    availableBudget,
    remainingBudget: availableBudget - totalSpent,
    savedActual: incomeActual - totalSpent,
  };
}

// --- 9. История по месяцам ---
export interface MonthlyHistoryRow {
  month: string;
  income: number;
  expense: number;
  income_plan: number;
  savings_goal: number;
}

export function getMonthlyHistory(db: any, limit = 12): MonthlyHistoryRow[] {
  const rows = allRows<{
    month: string;
    income: number | string;
    expense: number | string;
    income_plan: number | string;
    savings_goal: number | string;
  }>(
    db,
    `SELECT substr(t.date, 1, 7) AS month,
       COALESCE(SUM(CASE WHEN t.is_income = 1 THEN t.amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN t.is_income = 0 THEN t.amount ELSE 0 END), 0) AS expense,
       COALESCE(mb.income_plan, 0)  AS income_plan,
       COALESCE(mb.savings_goal, 0) AS savings_goal
     FROM transactions t
     LEFT JOIN monthly_budget mb ON mb.month = substr(t.date, 1, 7)
     GROUP BY month
     ORDER BY month DESC
     LIMIT ?`,
    [limit],
  );

  return rows.map((r) => ({
    month: r.month,
    income: Number(r.income) || 0,
    expense: Number(r.expense) || 0,
    income_plan: Number(r.income_plan) || 0,
    savings_goal: Number(r.savings_goal) || 0,
  }));
}
