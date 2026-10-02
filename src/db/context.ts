import { createContext } from 'react';
import type { StorageMode } from './client';

export interface DatabaseContextType {
  db: any;
  isLoading: boolean;
  error: string | null;
  // Чем реально работает хранилище: OPFS (переживает перезагрузку) или память
  storageMode: StorageMode;
  // Инкрементируется после каждой записи — сигнал компонентам перечитать данные
  refreshKey: number;
  notifyDataChanged: () => void;
}

export const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);
