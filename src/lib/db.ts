export type TransactionKind = 'expense' | 'income';
export interface KakeiboSphere {
  id: string;
  name: string;
}

export interface AppSettings {
  expenseCategories: string[];
  incomeCategories: string[];
  spheres: KakeiboSphere[];
}

export const defaultAppSettings: AppSettings = {
  expenseCategories: ['Продукты', 'Дом', 'Транспорт', 'Здоровье', 'Образование', 'Отдых', 'Покупки', 'Другое'],
  incomeCategories: ['Зарплата', 'Подработка', 'Подарок', 'Другое'],
  spheres: [
    { id: 'needs', name: 'Нужды' },
    { id: 'wants', name: 'Желания' },
    { id: 'culture', name: 'Культура' },
    { id: 'unexpected', name: 'Непредвиденное' },
  ],
};

export interface MoneyTransaction {
  id: string;
  kind: TransactionKind;
  amount: number;
  category: string;
  sphere?: string;
  note: string;
  date: string;
  createdAt: string;
}

export interface MonthlyPlan {
  month: string;
  income: number;
  fixedCosts: number;
  savingsGoal: number;
}

export interface KakeiboBackup {
  version: 1;
  transactions: MoneyTransaction[];
  plans: MonthlyPlan[];
  settings?: AppSettings;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

const DATABASE_NAME = 'kakeibo';
const DATABASE_VERSION = 2;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('transactions')) database.createObjectStore('transactions', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('plans')) database.createObjectStore('plans', { keyPath: 'month' });
      if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть локальную базу данных.'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Не удалось выполнить запрос к базе данных.'));
  });
}

export async function getTransactions(): Promise<MoneyTransaction[]> {
  const database = await openDatabase();
  try {
    const records = await requestResult(database.transaction('transactions').objectStore('transactions').getAll());
    return records.map(normalizeTransaction);
  } finally {
    database.close();
  }
}

function normalizeTransaction(record: MoneyTransaction & { pillar?: string }): MoneyTransaction {
  const { pillar, ...transaction } = record;
  const sphere = record.sphere ?? pillar;
  return { ...transaction, ...(sphere ? { sphere } : {}) };
}

export async function saveTransaction(transaction: MoneyTransaction): Promise<void> {
  const database = await openDatabase();
  try {
    await requestResult(database.transaction('transactions', 'readwrite')
      .objectStore('transactions').put(transaction));
  } finally {
    database.close();
  }
}

export async function removeTransaction(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await requestResult(database.transaction('transactions', 'readwrite')
      .objectStore('transactions').delete(id));
  } finally {
    database.close();
  }
}

export async function renameTransactionCategory(
  kind: TransactionKind,
  oldName: string,
  newName: string,
  settings: AppSettings,
): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(['transactions', 'settings'], 'readwrite');
    const store = transaction.objectStore('transactions');
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        transaction.objectStore('settings').put({ ...settings, id: 'app' });
        return;
      }
      const item = normalizeTransaction(cursor.value);
      if (item.kind === kind && item.category === oldName) {
        cursor.update({ ...item, category: newName });
      }
      cursor.continue();
    };
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Не удалось обновить категорию в операциях.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Обновление категории отменено.'));
    });
  } finally {
    database.close();
  }
}

export async function getPlan(month: string): Promise<MonthlyPlan | undefined> {
  const database = await openDatabase();
  try {
    return await requestResult(database.transaction('plans').objectStore('plans').get(month));
  } finally {
    database.close();
  }
}

export async function savePlan(plan: MonthlyPlan): Promise<void> {
  const database = await openDatabase();
  try {
    await requestResult(database.transaction('plans', 'readwrite').objectStore('plans').put(plan));
  } finally {
    database.close();
  }
}

export async function getSettings(): Promise<AppSettings> {
  const database = await openDatabase();
  try {
    const settings = await requestResult(database.transaction('settings').objectStore('settings').get('app')) as AppSettings | undefined;
    return settings ?? structuredClone(defaultAppSettings);
  } finally {
    database.close();
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const database = await openDatabase();
  try {
    await requestResult(database.transaction('settings', 'readwrite')
      .objectStore('settings').put({ ...settings, id: 'app' }));
  } finally {
    database.close();
  }
}

export async function makeBackup(): Promise<KakeiboBackup> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(['transactions', 'plans', 'settings']);
    const [records, plans, settingsRecord] = await Promise.all([
      requestResult(transaction.objectStore('transactions').getAll()),
      requestResult(transaction.objectStore('plans').getAll()),
      requestResult(transaction.objectStore('settings').get('app')),
    ]);
    return {
      version: 1,
      transactions: records.map(normalizeTransaction),
      plans,
      settings: settingsRecord ?? structuredClone(defaultAppSettings),
    };
  } finally {
    database.close();
  }
}

export async function restoreBackup(backup: KakeiboBackup): Promise<void> {
  const database = await openDatabase();
  try {
    const stores = backup.settings
      ? ['transactions', 'plans', 'settings']
      : ['transactions', 'plans'];
    const transaction = database.transaction(stores, 'readwrite');
    const transactionStore = transaction.objectStore('transactions');
    const planStore = transaction.objectStore('plans');
    transactionStore.clear();
    planStore.clear();
    backup.transactions.forEach((item) => transactionStore.put(normalizeTransaction(item)));
    backup.plans.forEach((item) => planStore.put(item));
    if (backup.settings) transaction.objectStore('settings').put({ ...backup.settings, id: 'app' });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Не удалось восстановить резервную копию.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Восстановление резервной копии отменено.'));
    });
  } finally {
    database.close();
  }
}

export function isKakeiboBackup(value: unknown): value is KakeiboBackup {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<KakeiboBackup>;
  return candidate.version === 1
    && Array.isArray(candidate.transactions)
    && Array.isArray(candidate.plans)
    && candidate.transactions.every((item) => (
      !!item
      && typeof item.id === 'string'
      && (item.kind === 'expense' || item.kind === 'income')
      && Number.isSafeInteger(item.amount)
      && item.amount > 0
      && typeof item.category === 'string'
      && (item.sphere === undefined || (typeof item.sphere === 'string' && item.sphere.length > 0))
      && ((item as MoneyTransaction & { pillar?: unknown }).pillar === undefined
        || (typeof (item as MoneyTransaction & { pillar?: unknown }).pillar === 'string'
          && (item as MoneyTransaction & { pillar?: string }).pillar!.length > 0))
      && typeof item.note === 'string'
      && isCalendarDate(item.date)
      && typeof item.createdAt === 'string'
    ))
    && candidate.plans.every((item) => (
      !!item
      && /^\d{4}-\d{2}$/.test(item.month)
      && Number.isSafeInteger(item.income)
      && Number.isSafeInteger(item.fixedCosts)
      && Number.isSafeInteger(item.savingsGoal)
      && item.income >= 0
      && item.fixedCosts >= 0
      && item.savingsGoal >= 0
    ))
    && (candidate.settings === undefined || isAppSettings(candidate.settings));
}

export function isAppSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Partial<AppSettings>;
  const validNames = (names: unknown): names is string[] => (
    Array.isArray(names)
    && names.length > 0
    && names.every((name) => typeof name === 'string' && name.trim().length > 0 && name.length <= 40)
    && new Set(names.map((name) => typeof name === 'string' ? name.trim().toLocaleLowerCase() : '')).size === names.length
  );
  return validNames(settings.expenseCategories)
    && validNames(settings.incomeCategories)
    && Array.isArray(settings.spheres)
    && settings.spheres.length > 0
    && settings.spheres.every((sphere) => (
      !!sphere
      && typeof sphere.id === 'string'
      && sphere.id.length > 0
      && typeof sphere.name === 'string'
      && sphere.name.trim().length > 0
      && sphere.name.length <= 40
    ))
    && new Set(settings.spheres.map((sphere) => sphere.id)).size === settings.spheres.length
    && new Set(settings.spheres.map((sphere) => sphere.name.trim().toLocaleLowerCase())).size === settings.spheres.length;
}
