// src/db/queries.ts
import type { Areas, Categories, MonthlyBudget, Transactions } from './schema';

// --- 1. Константы ключей категорий Kakeibo ---
export const KAKEIBO_CATEGORY_KEYS = {
  NEEDS: 'needs',
  WANTS: 'wants',
  CULTURE: 'culture',
  UNEXPECTED: 'unexpected',
} as const;

// --- 2. Сидинг дефолтных категорий и сфер ---
export function seedInitialData(db: any) {
  const categoryCount = db.selectValue('SELECT COUNT(*) FROM category');
  if (categoryCount > 0) return;

  // Дефолтная сфера
  const defaultAreaId = crypto.randomUUID();
  db.exec({
    sql: 'INSERT INTO area (id, enabled, key, name) VALUES (?, 1, ?, ?)',
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
export function getCategories(db: any): Category[] {
  const stmt = db.prepare('SELECT * FROM categories WHERE enabled = 1');
  const categories: Category[] = [];
  while (stmt.step()) {
    categories.push(stmt.getAsObject() as Category);
  }
  stmt.free();
  return categories;
}

export function getAreas(db: any): Area[] {
  const stmt = db.prepare('SELECT * FROM areas WHERE enabled = 1');
  const areas: Area[] = [];
  while (stmt.step()) {
    areas.push(stmt.getAsObject() as Area);
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

// Расчет агрегированной аналитики Kakeibo за месяц
export function getKakeiboSummary(db: any, month: string) {
  const budget = getOrCreateMonthlyBudget(db, month);

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

  // Формула Kakeibo: Доступный лимит = Доход - Фиксированные расходы - Цель сбережений
  const availableBudget = budget.income_plan - budget.fixed_expenses - budget.savings_goal;
  const remainingBudget = availableBudget - totalSpent;

  return {
    budget,
    spentByCategory,
    totalSpent,
    availableBudget,
    remainingBudget,
  };
}