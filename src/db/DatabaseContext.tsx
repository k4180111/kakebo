import React, { useEffect, useState } from 'react';
import { setupDatabase } from './index';
import { DatabaseContext } from './context';
import type { StorageMode } from './client';

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>('memory');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const notifyDataChanged = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;

    setupDatabase()
      .then((dbInstance) => {
        if (isMounted) {
          setDb(dbInstance);
          setStorageMode(dbInstance.__storageMode ?? 'memory');
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
    <DatabaseContext.Provider
      value={{ db, isLoading, error, storageMode, refreshKey, notifyDataChanged }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};