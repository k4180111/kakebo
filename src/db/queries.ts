// src/db/queries.ts
import type { Categories, MonthlyBudget, Areas } from './schema';

// --- 1. Константы ключей категорий Kakeibo ---
export const KAKEIBO_CATEGORY_KEYS = {
  NEEDS: 'needs',
  WANTS: 'wants',
  CULTURE: 'culture',
  UNEXPECTED: 'unexpected',
} as const;

// --- 2. Сидинг дефолтных категорий и сфер ---
export function seedInitialData(db: any) {
  const areaCount = db.selectValue('SELECT COUNT(*) FROM areas');
  if (areaCount > 0) return; // Уже заполнено

  // Дефолтная сфера
  const defaultAreaId = crypto.randomUUID();
  db.exec({
    sql: 'INSERT INTO areas (id, enabled, key, name) VALUES (?, 1, ?, ?)',
    bind: [defaultAreaId, 'default', 'Личные финансы'],
  });

  // Категории Kakeibo
  const initialCategories = [
    { key: KAKEIBO_CATEGORY_KEYS.NEEDS, name: 'Потребности', is_income: 0 },
    { key: KAKEIBO_CATEGORY_KEYS.WANTS, name: 'Желания', is_income: 0 },
    { key: KAKEIBO_CATEGORY_KEYS.CULTURE, name: 'Развитие', is_income: 0 },
    { key: KAKEIBO_CATEGORY_KEYS.UNEXPECTED, name: 'Непредвиденное', is_income: 0 },
    { key: 'salary', name: 'Зарплата / Доход', is_income: 1 },
  ];

  for (const cat of initialCategories) {
    db.exec({
      sql: 'INSERT INTO categories (id, enabled, key, name, is_income) VALUES (?, 1, ?, ?, ?)',
      bind: [crypto.randomUUID(), cat.key, cat.name, cat.is_income],
    });
  }
}

// --- 3. Получение справочников ---
export function getCategories(db: any): Categories[] {
  const stmt = db.prepare('SELECT * FROM categories WHERE enabled = 1');
  const categories: Categories[] = [];
  while (stmt.step()) {
    categories.push(stmt.getAsObject() as Categories);
  }
  stmt.free();
  return categories;
}

export function getAreas(db: any): Areas[] {
  const stmt = db.prepare('SELECT * FROM areas WHERE enabled = 1');
  const areas: Areas[] = [];
  while (stmt.step()) {
    areas.push(stmt.getAsObject() as Areas);
  }
  stmt.free();
  return areas;
}

// --- 4. Транзакции (Расходы и Доходы) ---
export interface CreateTransactionDto {
  amount: number;
  is_income: number;
  area_id: string;
  category_id: string;
  description?: string;
  date?: string; // YYYY-MM-DD HH:mm:ss
}

export function addTransaction(db: any, dto: CreateTransactionDto): string {
  const id = crypto.randomUUID();
  const date = dto.date || new Date().toISOString().replace('T', ' ').substring(0, 19);

  db.exec({
    sql: `INSERT INTO transactions (id, date, is_income, amount, area_id, category_id, description) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    bind: [id, date, dto.is_income, dto.amount, dto.area_id, dto.category_id, dto.description || null],
  });

  return id;
}

export function getMonthlyTransactions(db: any, month: string) {
  // month = '2026-10'
  const stmt = db.prepare(`
    SELECT 
      t.id, t.date, t.is_income, t.amount, t.description,
      c.name as category_name, c.key as category_key,
      a.name as area_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    JOIN areas a ON t.area_id = a.id
    WHERE strftime('%Y-%m', t.date) = ?
    ORDER BY t.date DESC
  `);

  stmt.bind([month]);
  const transactions: any[] = [];
  while (stmt.step()) {
    transactions.push(stmt.getAsObject());
  }
  stmt.free();
  return transactions;
}

// --- 5. Бюджет на месяц и Расчет Kakeibo ---
export function getOrCreateMonthlyBudget(
  db: any, 
  month: string, 
  defaults = { income: 0, fixed: 0, savings: 0 }
): MonthlyBudget {
  const stmt = db.prepare('SELECT * FROM monthly_budget WHERE month = ?');
  stmt.bind([month]);
  
  if (stmt.step()) {
    const budget = stmt.getAsObject() as MonthlyBudget;
    stmt.free();
    return budget;
  }
  stmt.free();

  // Если бюджета нет, создаем
  const id = crypto.randomUUID();
  db.exec({
    sql: `INSERT INTO monthly_budget (id, month, income_plan, fixed_expenses, savings_goal) 
          VALUES (?, ?, ?, ?, ?)`,
    bind: [id, month, defaults.income, defaults.fixed, defaults.savings],
  });

  return {
    id,
    month,
    income_plan: defaults.income,
    fixed_expenses: defaults.fixed,
    savings_goal: defaults.savings,
  };
}

// --- 5b. Только чтение бюджета (без побочных записей) ---
export function getMonthlyBudget(db: any, month: string): MonthlyBudget | null {
  const stmt = db.prepare('SELECT * FROM monthly_budget WHERE month = ?');
  stmt.bind([month]);
  const budget = stmt.step() ? (stmt.getAsObject() as MonthlyBudget) : null;
  stmt.free();
  return budget;
}

// План месяца создаётся/обновляется только по действию пользователя
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

// --- 5c. План расходов по корзинам ---
export interface CategoryPlanItem {
  id: string;
  month_budget_id: string;
  category_id: string;
  category_name: string;
  category_key: string;
  amount: number;
}

export function getCategoryPlan(db: any, month: string): CategoryPlanItem[] {
  const stmt = db.prepare(`
    SELECT ep.id, ep.month_budget_id, ep.expense_category_id AS category_id,
           ep.amount, c.name AS category_name, c.key AS category_key
    FROM monthly_budget__expenses_plan ep
    JOIN categories c ON c.id = ep.expense_category_id
    JOIN monthly_budget mb ON mb.id = ep.month_budget_id
    WHERE mb.month = ?
  `);
  stmt.bind([month]);
  const items: CategoryPlanItem[] = [];
  while (stmt.step()) {
    items.push(stmt.getAsObject() as CategoryPlanItem);
  }
  stmt.free();
  return items;
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

export function deleteTransaction(db: any, id: string) {
  db.exec({ sql: 'DELETE FROM transactions WHERE id = ?', bind: [id] });
}

// Расчет агрегированной аналитики Kakeibo за месяц
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
  // Только чтение — бюджет создаёт явное действие пользователя
  const budget = getMonthlyBudget(db, month);

  const incomeStmt = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE strftime('%Y-%m', date) = ? AND is_income = 1",
  );
  incomeStmt.bind([month]);
  const incomeActual = incomeStmt.step() ? Number(incomeStmt.get(0)) || 0 : 0;
  incomeStmt.free();

  // Считаем сумму фактических расходов по категориям Kakeibo
  const stmt = db.prepare(`
    SELECT c.key, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE strftime('%Y-%m', t.date) = ? AND t.is_income = 0
    GROUP BY c.key
  `);
  stmt.bind([month]);

  const spentByCategory: Record<string, number> = {
    needs: 0,
    wants: 0,
    culture: 0,
    unexpected: 0,
  };

  let totalSpent = 0;
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const key = row.key as string;
    const amount = Number(row.total) || 0;
    spentByCategory[key] = amount;
    totalSpent += amount;
  }
  stmt.free();

  const planByCategory: Record<string, number> = {};
  for (const item of getCategoryPlan(db, month)) {
    planByCategory[item.category_key] = Number(item.amount) || 0;
  }

  // Формула Kakeibo: Доступный лимит = Доход - Фиксированные расходы - Цель сбережений
  const incomePlan = budget?.income_plan ?? 0;
  const fixedExpenses = budget?.fixed_expenses ?? 0;
  const savingsGoal = budget?.savings_goal ?? 0;
  const availableBudget = incomePlan - fixedExpenses - savingsGoal;
  const remainingBudget = availableBudget - totalSpent;

  return {
    budget,
    incomeActual,
    totalSpent,
    spentByCategory,
    planByCategory,
    availableBudget,
    remainingBudget,
    savedActual: incomeActual - totalSpent,
  };
}

// --- 6. История по месяцам ---
export interface MonthlyHistoryRow {
  month: string;
  income: number;
  expense: number;
  income_plan: number;
  savings_goal: number;
}

export function getMonthlyHistory(db: any, limit = 12): MonthlyHistoryRow[] {
  const stmt = db.prepare(`
    SELECT strftime('%Y-%m', t.date) AS month,
      COALESCE(SUM(CASE WHEN t.is_income = 1 THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.is_income = 0 THEN t.amount ELSE 0 END), 0) AS expense,
      COALESCE(mb.income_plan, 0)  AS income_plan,
      COALESCE(mb.savings_goal, 0) AS savings_goal
    FROM transactions t
    LEFT JOIN monthly_budget mb ON mb.month = strftime('%Y-%m', t.date)
    GROUP BY month
    ORDER BY month DESC
    LIMIT ?
  `);
  stmt.bind([limit]);
  const rows: MonthlyHistoryRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as MonthlyHistoryRow);
  }
  stmt.free();
  return rows;
}