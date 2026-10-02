import { useContext } from 'react';
import { DatabaseContext, type DatabaseContextType } from '../db/context';

export function useDatabase(): DatabaseContextType {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase должен использоваться внутри <DatabaseProvider>');
  }
  return context;
}
