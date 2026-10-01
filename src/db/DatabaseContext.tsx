import React, { createContext, useContext, useEffect, useState } from 'react';
import { setupDatabase } from './index'; // Подключаем функцию с инициализацией и сидингом

interface DatabaseContextType {
  db: any;
  isLoading: boolean;
  error: string | null;
  // Функция для принудительного перезапуска/обновления состояния UI при записи
  refreshKey: number;
  notifyDataChanged: () => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Триггер для уведомления компонентов о том, что данные в БД изменились
  const notifyDataChanged = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;

    setupDatabase()
      .then((dbInstance) => {
        if (isMounted) {
          setDb(dbInstance);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('DatabaseContext Init Error:', err);
        if (isMounted) {
          setError('Не удалось инициализировать локальную базу данных SQLite WASM.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isLoading, error, refreshKey, notifyDataChanged }}>
      {children}
    </DatabaseContext.Provider>
  );
};

// Пользовательский хук для использования БД в компонентах
export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase должен использоваться внутри <DatabaseProvider>');
  }
  return context;
};