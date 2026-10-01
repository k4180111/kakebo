// src/App.tsx
import { useDatabase } from './db/DatabaseContext';

export function App() {
  const { db, isLoading, error } = useDatabase();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zen-bg text-zen-text">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zen-needs border-t-transparent mx-auto mb-4"></div>
          <p className="text-zen-muted">Загрузка базы данных SQLite WASM (OPFS)...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 m-6 bg-red-50 text-red-700 rounded-lg max-w-lg mx-auto text-center">
        <h2 className="font-bold mb-2">Ошибка подключения</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zen-bg p-6 text-zen-text">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Kakeibo (Какейбо)</h1>
        <p className="text-sm text-zen-muted">Локальный бюджет на SQLite WASM</p>
      </header>

      {/* Сюда подключаются TransactionForm, BudgetOverview и другие компоненты */}
    </div>
  );
}

export default App;