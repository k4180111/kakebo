import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { CREATE_TABLES_SQL } from './schema';

let dbInstance: any = null;

export async function initSQLite() {
  if (dbInstance) return dbInstance;

  try {
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });

    if ('opfs' in sqlite3.oo1) {
      dbInstance = new sqlite3.oo1.OpfsDb('kakeibo.sqlite3', 'c');
      console.log('⚡ SQLite WASM с поддержкой OPFS запущен!');
    } else {
      dbInstance = new sqlite3.oo1.DB('kakeibo.sqlite3', 'c');
      console.warn('⚠️ OPFS недоступен, используется InMemory DB');
    }

    // Включаем поддержку внешних ключей и создаем таблицы
    dbInstance.exec(CREATE_TABLES_SQL);

    // Заполняем базовые сферы и категории, если таблица area пуста
    seedDefaultData(dbInstance);

    return dbInstance;
  } catch (err) {
    console.error('Ошибка инициализации SQLite WASM:', err);
    throw err;
  }
}


// Заполнение начальными данными Kakeibo
function seedDefaultData(db: any) {
  const areaCount = db.selectValue('SELECT COUNT(*) FROM area');
  if (areaCount > 0) return; // Уже заполнено

  // 1. Дефолтная сфера
  const defaultAreaId = crypto.randomUUID();
  db.exec({
    sql: 'INSERT INTO area (id, enabled, name) VALUES (?, 1, ?)',
    bind: [defaultAreaId, 'Личные финансы'],
  });

  // 2. Классические категории Kakeibo
  const defaultCategories = [
    { name: 'Нужды', key: 'needs', is_income: 0 },
    { name: 'Желания', key: 'wants', is_income: 0 },
    { name: 'Культура', key: 'culture', is_income: 0 },
    { name: 'Непредвиденное', key: 'unexpected', is_income: 0 },
    { name: 'Доход', key: 'income', is_income: 1 },
  ];

  for (const cat of defaultCategories) {
    db.exec({
      sql: 'INSERT INTO category (id, enabled, name, key, is_income) VALUES (?, 1, ?, ?, ?)',
      bind: [crypto.randomUUID(), cat.name, cat.key, cat.is_income],
    });
  }
}