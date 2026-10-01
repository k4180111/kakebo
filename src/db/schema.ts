// src/db/schema.ts


export interface Areas {
  id: string;
  enabled: number;
  key: string;
  name: string;
}

export interface Categories {
  id: string;
  enabled: number;
  key: string;
  name: string;
  is_income: number;
}

export interface Transactions {
  id: string;
  date: string;
  is_income: number;
  amount: number;
  area_id: string;
  category_id: string;
  description?: string | null;
}

export interface MonthlyBudget {
  id: string;
  month: string;
  income_plan: number;
  fixed_expenses: number;
  savings_goal: number;
  reflection_savings?: string | null;
  reflection_expenses?: string | null;
  reflection_improve?: string | null;
}

export interface MonthlyBudgetExpensesPlan {
  id: string;
  month_budget_id: string;
  expense_category_id: string;
  amount: number;
}

export interface Database {
  areas: Areas;
  categories: Categories;
  transactions: Transactions;
  monthly_budget: MonthlyBudget;
  monthly_budget__expenses_plan: MonthlyBudgetExpensesPlan;
}

// --- SQL DDL скрипт для SQLite ---

export const CREATE_TABLES_SQL = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_income INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    is_income INTEGER NOT NULL DEFAULT 0,
    amount NUMERIC NOT NULL,
    area_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (area_id) REFERENCES areas (id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS monthly_budget (
    id TEXT PRIMARY KEY,
    month TEXT NOT NULL UNIQUE,
    income_plan NUMERIC NOT NULL,
    fixed_expenses NUMERIC NOT NULL,
    savings_goal NUMERIC NOT NULL,
    reflection_savings TEXT,
    reflection_expenses TEXT,
    reflection_improve TEXT
  );

  CREATE TABLE IF NOT EXISTS monthly_budget__expenses_plan (
    id TEXT PRIMARY KEY,
    month_budget_id TEXT NOT NULL,
    expense_category_id TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    FOREIGN KEY (month_budget_id) REFERENCES monthly_budget (id) ON DELETE CASCADE,
    FOREIGN KEY (expense_category_id) REFERENCES categories (id) ON DELETE RESTRICT
  );
`;