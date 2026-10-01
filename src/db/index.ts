import { initSQLite } from './client';
import { seedInitialData } from './queries';

export async function setupDatabase() {
  const db = await initSQLite();
  seedInitialData(db);
  return db;
}