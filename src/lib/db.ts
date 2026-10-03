export type TransactionKind = 'expense' | 'income';
export const CATEGORY_ICON_IDS = [
  'basket', 'home', 'bus', 'heart', 'book', 'sparkles', 'bag', 'wallet',
  'briefcase', 'gift', 'tag', 'apple', 'car', 'train', 'plane', 'bike',
  'fuel', 'coffee', 'utensils', 'pizza', 'shirt', 'paw', 'baby', 'pill',
  'stethoscope', 'dumbbell', 'music', 'ticket', 'gamepad', 'film', 'wifi',
  'phone', 'laptop', 'lightbulb', 'wrench', 'hammer', 'scissors', 'flower',
  'tree', 'church', 'graduation', 'landmark', 'receipt', 'banknote',
  'credit-card', 'piggy-bank', 'sprout', 'ellipsis',
] as const;

export interface KakeiboSphere {
  id: string;
  name: string;
  color?: string;
}

export interface AppSettings {
  expenseCategories: string[];
  incomeCategories: string[];
  spheres: KakeiboSphere[];
  expenseCategoryIcons?: Record<string, string>;
  incomeCategoryIcons?: Record<string, string>;
}

export const defaultAppSettings: AppSettings = {
  expenseCategories: ['Продукты', 'Дом', 'Транспорт', 'Здоровье', 'Образование', 'Отдых', 'Покупки', 'Другое'],
  incomeCategories: ['Зарплата', 'Подработка', 'Подарок', 'Другое'],
  spheres: [
    { id: 'needs', name: 'Нужды', color: '#88a77f' },
    { id: 'wants', name: 'Желания', color: '#d7a27d' },
    { id: 'culture', name: 'Культура', color: '#a39bbd' },
    { id: 'unexpected', name: 'Непредвиденное', color: '#d1bd70' },
  ],
  expenseCategoryIcons: {
    Продукты: 'basket',
    Дом: 'home',
    Транспорт: 'bus',
    Здоровье: 'heart',
    Образование: 'book',
    Отдых: 'sparkles',
    Покупки: 'bag',
    Другое: 'tag',
  },
  incomeCategoryIcons: {
    Зарплата: 'wallet',
    Подработка: 'briefcase',
    Подарок: 'gift',
    Другое: 'tag',
  },
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
  incomeItems: PlannedBudgetItem[];
  expenseItems: PlannedBudgetItem[];
  savingsGoal: number;
  sphereAllocations: SphereAllocation[];
}

export interface SphereAllocation {
  sphereId: string;
  amount: number;
  percentage?: number;
}

export interface MonthlyReflection {
  month: string;
  answers: string[];
}

export interface PlannedBudgetItem {
  id: string;
  name: string;
  amount: number;
  date: string;
  category?: string;
  note?: string;
}

interface LegacyMonthlyPlan {
  month: string;
  income?: number;
  fixedCosts?: number;
  savingsGoal: number;
  incomeItems?: PlannedBudgetItem[];
  expenseItems?: PlannedBudgetItem[];
  sphereAllocations?: SphereAllocation[];
}

export interface KakeiboBackup {
  version: 1;
  transactions: MoneyTransaction[];
  plans: LegacyMonthlyPlan[];
  settings?: AppSettings;
  reflections?: MonthlyReflection[];
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

const DATABASE_NAME = 'kakeibo';
const DATABASE_VERSION = 3;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('transactions')) database.createObjectStore('transactions', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('plans')) database.createObjectStore('plans', { keyPath: 'month' });
      if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('reflections')) database.createObjectStore('reflections', { keyPath: 'month' });
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
    const record = await requestResult(database.transaction('plans').objectStore('plans').get(month)) as LegacyMonthlyPlan | undefined;
    return record ? normalizePlan(record) : undefined;
  } finally {
    database.close();
  }
}

function normalizePlan(plan: LegacyMonthlyPlan): MonthlyPlan {
  const legacyDate = `${plan.month}-01`;
  const incomeItems = plan.incomeItems ?? (plan.income
    ? [{ id: `legacy-income-${plan.month}`, name: 'Плановый доход', amount: plan.income, date: legacyDate }]
    : []);
  const expenseItems = plan.expenseItems ?? (plan.fixedCosts
    ? [{ id: `legacy-expense-${plan.month}`, name: 'Обязательные расходы', amount: plan.fixedCosts, date: legacyDate }]
    : []);
  return {
    month: plan.month,
    incomeItems,
    expenseItems,
    savingsGoal: plan.savingsGoal,
    sphereAllocations: plan.sphereAllocations ?? [],
  };
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
    return settings
      ? {
        ...structuredClone(defaultAppSettings),
        ...settings,
        expenseCategoryIcons: { ...defaultAppSettings.expenseCategoryIcons, ...settings.expenseCategoryIcons },
        incomeCategoryIcons: { ...defaultAppSettings.incomeCategoryIcons, ...settings.incomeCategoryIcons },
        spheres: settings.spheres.map((sphere, index) => ({
          ...sphere,
          color: sphere.color ?? defaultAppSettings.spheres[index % defaultAppSettings.spheres.length].color,
        })),
      }
      : structuredClone(defaultAppSettings);
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

export async function getReflection(month: string): Promise<MonthlyReflection> {
  const database = await openDatabase();
  try {
    const reflection = await requestResult(database.transaction('reflections')
      .objectStore('reflections').get(month)) as MonthlyReflection | undefined;
    return reflection ?? { month, answers: ['', '', '', ''] };
  } finally {
    database.close();
  }
}

export async function saveReflection(reflection: MonthlyReflection): Promise<void> {
  if (!isValidReflection(reflection)) throw new Error('Не удалось сохранить ответы: проверьте данные рефлексии.');
  const database = await openDatabase();
  try {
    await requestResult(database.transaction('reflections', 'readwrite')
      .objectStore('reflections').put(reflection));
  } finally {
    database.close();
  }
}

export async function makeBackup(): Promise<KakeiboBackup> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(['transactions', 'plans', 'settings', 'reflections']);
    const [records, plans, settingsRecord, reflections] = await Promise.all([
      requestResult(transaction.objectStore('transactions').getAll()),
      requestResult(transaction.objectStore('plans').getAll()),
      requestResult(transaction.objectStore('settings').get('app')),
      requestResult(transaction.objectStore('reflections').getAll()),
    ]);
    return {
      version: 1,
      transactions: records.map(normalizeTransaction),
      plans: plans.map((plan) => normalizePlan(plan as LegacyMonthlyPlan)),
      settings: settingsRecord ?? structuredClone(defaultAppSettings),
      reflections,
    };
  } finally {
    database.close();
  }
}

export async function restoreBackup(backup: KakeiboBackup): Promise<void> {
  const database = await openDatabase();
  try {
    const stores = backup.settings
      ? ['transactions', 'plans', 'settings', 'reflections']
      : ['transactions', 'plans', 'reflections'];
    const transaction = database.transaction(stores, 'readwrite');
    const transactionStore = transaction.objectStore('transactions');
    const planStore = transaction.objectStore('plans');
    const reflectionStore = transaction.objectStore('reflections');
    transactionStore.clear();
    planStore.clear();
    reflectionStore.clear();
    backup.transactions.forEach((item) => transactionStore.put(normalizeTransaction(item)));
    backup.plans.forEach((item) => planStore.put(normalizePlan(item)));
    backup.reflections?.forEach((reflection) => reflectionStore.put(reflection));
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
    && candidate.plans.every(isValidPlan)
    && (candidate.reflections === undefined
      || (Array.isArray(candidate.reflections) && candidate.reflections.every(isValidReflection)))
    && (candidate.settings === undefined || isAppSettings(candidate.settings));
}

function isValidReflection(value: unknown): value is MonthlyReflection {
  if (!value || typeof value !== 'object') return false;
  const reflection = value as Partial<MonthlyReflection>;
  return typeof reflection.month === 'string'
    && isMonth(reflection.month)
    && Array.isArray(reflection.answers)
    && reflection.answers.length === 4
    && reflection.answers.every((answer) => typeof answer === 'string' && answer.length <= 5000);
}

function isValidPlannedItem(value: unknown, planMonth: string): value is PlannedBudgetItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PlannedBudgetItem>;
  return typeof item.id === 'string'
    && item.id.length > 0
    && typeof item.name === 'string'
    && item.name.trim().length > 0
    && item.name.length <= 80
    && Number.isSafeInteger(item.amount)
    && item.amount! > 0
    && typeof item.date === 'string'
    && isCalendarDate(item.date)
    && item.date.startsWith(`${planMonth}-`)
    && (item.category === undefined || (typeof item.category === 'string' && item.category.trim().length > 0))
    && (item.note === undefined || (typeof item.note === 'string' && item.note.length <= 80));
}

function isValidPlan(value: unknown): value is LegacyMonthlyPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Partial<LegacyMonthlyPlan>;
  if (typeof plan.month !== 'string' || !isMonth(plan.month)
    || !Number.isSafeInteger(plan.savingsGoal) || plan.savingsGoal! < 0) return false;

  if (plan.incomeItems !== undefined || plan.expenseItems !== undefined) {
    if (!Array.isArray(plan.incomeItems)
      || !plan.incomeItems.every((item) => isValidPlannedItem(item, plan.month!))
      || !Array.isArray(plan.expenseItems)
      || !plan.expenseItems.every((item) => isValidPlannedItem(item, plan.month!))) return false;
    const items = [...plan.incomeItems, ...plan.expenseItems];
    const ids = items.map((item) => item.id);
    const incomeTotal = plan.incomeItems.reduce((sum, item) => sum + item.amount, 0);
    const expenseTotal = plan.expenseItems.reduce((sum, item) => sum + item.amount, 0);
    const allocations = plan.sphereAllocations ?? [];
    if (!Array.isArray(allocations)
      || allocations.some((item) => !item || typeof item.sphereId !== 'string' || !item.sphereId
        || !Number.isSafeInteger(item.amount) || item.amount < 0
        || (item.percentage === undefined ? item.amount === 0
          : typeof item.percentage !== 'number' || !Number.isFinite(item.percentage) || item.percentage < 0 || item.percentage > 100))
      || new Set(allocations.map((item) => item.sphereId)).size !== allocations.length) return false;
    const allocationTotal = allocations.reduce((sum, item) => sum + item.amount, 0);
    return new Set(ids).size === ids.length
      && Number.isSafeInteger(incomeTotal)
      && Number.isSafeInteger(expenseTotal)
      && Number.isSafeInteger(expenseTotal + plan.savingsGoal!)
      && Number.isSafeInteger(allocationTotal);
  }

  return Number.isSafeInteger(plan.income)
    && plan.income! >= 0
    && Number.isSafeInteger(plan.fixedCosts)
    && plan.fixedCosts! >= 0;
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
      && (sphere.color === undefined || (typeof sphere.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(sphere.color)))
    ))
    && new Set(settings.spheres.map((sphere) => sphere.id)).size === settings.spheres.length
    && new Set(settings.spheres.map((sphere) => sphere.name.trim().toLocaleLowerCase())).size === settings.spheres.length
    && (settings.expenseCategoryIcons === undefined || validIconMap(settings.expenseCategoryIcons))
    && (settings.incomeCategoryIcons === undefined || validIconMap(settings.incomeCategoryIcons));
}

function validIconMap(value: unknown): value is Record<string, string> {
  const icons = new Set<string>(CATEGORY_ICON_IDS);
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.entries(value).every(([name, icon]) => name.length > 0 && typeof icon === 'string' && icons.has(icon));
}
