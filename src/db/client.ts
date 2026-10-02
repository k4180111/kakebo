import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { CREATE_TABLES_SQL } from './schema';

export type StorageMode = 'opfs' | 'memory';

let dbInstance: any = null;
let initPromise: Promise<any> | null = null;

export async function initSQLite(): Promise<any> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const sqlite3 = await sqlite3InitModule();
    let db: any;
    let mode: StorageMode = 'memory';

    const canOpfs = !!sqlite3.oo1.OpfsDb;
    if (canOpfs) {
      try {
        db = new sqlite3.oo1.OpfsDb('/kakeibo.sqlite3', 'c');
        mode = 'opfs';
        console.log('⚡ SQLite WASM с поддержкой OPFS запущен!');
      } catch (e) {
        console.warn('OPFS недоступен, используется InMemory DB', e);
      }
    }

    if (!db) {
      db = new sqlite3.oo1.DB(':memory:', 'c');
      mode = 'memory';
      console.warn('⚠️ OPFS недоступен, используется InMemory DB (данные не сохраняются)');
    }

    db.exec(CREATE_TABLES_SQL);
    (db as any).__storageMode = mode;
    return db;
  })();

  return initPromise;
}