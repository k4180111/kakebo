import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Apple,
  Baby,
  Banknote,
  BookOpen,
  Bike,
  Bus,
  CarFront,
  CalendarDays,
  Check,
  Church,
  ChevronDown,
  Clapperboard,
  Coins,
  Coffee,
  CreditCard,
  Download,
  Upload,
  Cloud,
  ExternalLink,
  Dumbbell,
  Ellipsis,
  Flower2,
  Fuel,
  Gamepad2,
  GraduationCap,
  Hammer,
  Landmark,
  Laptop,
  Lightbulb,
  Layers,
  Leaf,
  LockKeyhole,
  Music2,
  PawPrint,
  Phone,
  Pill,
  PiggyBank,
  Plane,
  Pencil,
  Plus,
  Receipt,
  Save,
  Scissors,
  Settings2,
  Shirt,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  ShoppingBasket,
  Sprout,
  Stethoscope,
  Tag,
  Ticket,
  TrainFront,
  Trash2,
  TreeDeciduous,
  Utensils,
  Wallet,
  X,
  Home,
  Heart,
  BriefcaseBusiness,
  Gift,
  Wifi,
  Wrench,
  Pizza,
  type LucideIcon,
} from 'lucide-react';
import {
  defaultAppSettings,
  CATEGORY_ICON_IDS,
  getPlan,
  getSettings,
  getTransactions,
  makeBackup,
  removeTransaction,
  restoreBackup,
  savePlan,
  saveSettings,
  saveTransaction,
  renameTransactionCategory,
  type AppSettings,
  type MoneyTransaction,
  type PlannedBudgetItem,
  type SphereAllocation,
  type MonthlyPlan,
  type TransactionKind,
} from './lib/db';
import { decryptBackup, encryptBackup } from './lib/crypto';

type Tab = 'overview' | 'history' | 'plan' | 'reflection' | 'settings';

const categoryIconOptions: { id: typeof CATEGORY_ICON_IDS[number]; label: string; icon: LucideIcon }[] = [
  { id: 'basket', label: 'Корзина', icon: ShoppingBasket },
  { id: 'home', label: 'Дом', icon: Home },
  { id: 'bus', label: 'Автобус', icon: Bus },
  { id: 'heart', label: 'Сердце', icon: Heart },
  { id: 'book', label: 'Книга', icon: BookOpen },
  { id: 'sparkles', label: 'Искры', icon: Sparkles },
  { id: 'bag', label: 'Сумка', icon: ShoppingBag },
  { id: 'wallet', label: 'Кошелёк', icon: Wallet },
  { id: 'briefcase', label: 'Портфель', icon: BriefcaseBusiness },
  { id: 'gift', label: 'Подарок', icon: Gift },
  { id: 'tag', label: 'Тег', icon: Tag },
  { id: 'apple', label: 'Яблоко', icon: Apple },
  { id: 'car', label: 'Автомобиль', icon: CarFront },
  { id: 'train', label: 'Поезд', icon: TrainFront },
  { id: 'plane', label: 'Самолёт', icon: Plane },
  { id: 'bike', label: 'Велосипед', icon: Bike },
  { id: 'fuel', label: 'Топливо', icon: Fuel },
  { id: 'coffee', label: 'Кофе', icon: Coffee },
  { id: 'utensils', label: 'Столовые приборы', icon: Utensils },
  { id: 'pizza', label: 'Пицца', icon: Pizza },
  { id: 'shirt', label: 'Одежда', icon: Shirt },
  { id: 'paw', label: 'Питомцы', icon: PawPrint },
  { id: 'baby', label: 'Ребёнок', icon: Baby },
  { id: 'pill', label: 'Лекарства', icon: Pill },
  { id: 'stethoscope', label: 'Медицина', icon: Stethoscope },
  { id: 'dumbbell', label: 'Спорт', icon: Dumbbell },
  { id: 'music', label: 'Музыка', icon: Music2 },
  { id: 'ticket', label: 'Билет', icon: Ticket },
  { id: 'gamepad', label: 'Игры', icon: Gamepad2 },
  { id: 'film', label: 'Кино', icon: Clapperboard },
  { id: 'wifi', label: 'Интернет', icon: Wifi },
  { id: 'phone', label: 'Телефон', icon: Phone },
  { id: 'laptop', label: 'Компьютер', icon: Laptop },
  { id: 'lightbulb', label: 'Идея', icon: Lightbulb },
  { id: 'wrench', label: 'Ремонт', icon: Wrench },
  { id: 'hammer', label: 'Инструменты', icon: Hammer },
  { id: 'scissors', label: 'Уход', icon: Scissors },
  { id: 'flower', label: 'Цветок', icon: Flower2 },
  { id: 'tree', label: 'Природа', icon: TreeDeciduous },
  { id: 'church', label: 'Пожертвования', icon: Church },
  { id: 'graduation', label: 'Обучение', icon: GraduationCap },
  { id: 'landmark', label: 'Организация', icon: Landmark },
  { id: 'receipt', label: 'Чек', icon: Receipt },
  { id: 'banknote', label: 'Банкнота', icon: Banknote },
  { id: 'credit-card', label: 'Банковская карта', icon: CreditCard },
  { id: 'piggy-bank', label: 'Копилка', icon: PiggyBank },
  { id: 'sprout', label: 'Росток', icon: Sprout },
  { id: 'ellipsis', label: 'Другое', icon: Ellipsis },
];

const categoryIcons = Object.fromEntries(categoryIconOptions.map((item) => [item.id, item.icon])) as Record<string, LucideIcon>;
const defaultSphereColors = ['#88a77f', '#d7a27d', '#a39bbd', '#d1bd70'];

const navItems: { id: Tab; title: string; icon: typeof Wallet }[] = [
  { id: 'overview', title: 'Обзор', icon: Wallet },
  { id: 'history', title: 'Операции', icon: Coins },
  { id: 'plan', title: 'Бюджет', icon: BookOpen },
  { id: 'reflection', title: 'Рефлексия', icon: Sparkles },
];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(amount / 100);
}

function formatMonth(value: string): string {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00`));
}

function formatPlanDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function parsePlanDate(value: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${yearText}-${monthText}-${dayText}`;
}

function defaultPlannedDate(month: string): string {
  return `${month}-01`;
}

function rublesToKopecks(value: string, allowZero = false): number | null {
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0 || (!allowZero && parsed === 0) || parsed > Number.MAX_SAFE_INTEGER / 100) return null;
  return Math.round(parsed * 100);
}

function formatEditableNumber(value: string): string {
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(parsed)) return value;
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(parsed);
}

function normalizeMoneyInput(value: string): string {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  if (!/^\d*(\.\d{0,2})?$/.test(normalized)) return value;
  const [integer = '', fraction] = normalized.split('.');
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  return fraction === undefined ? groupedInteger : `${groupedInteger},${fraction}`;
}

function handleMoneyInput(event: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) {
  const input = event.currentTarget;
  const cursor = input.selectionStart ?? input.value.length;
  const prefix = input.value.slice(0, cursor);
  const formatted = normalizeMoneyInput(input.value);
  const digitsBeforeCursor = (prefix.match(/\d/g) ?? []).length;
  const hasDecimalBeforeCursor = /[.,]/.test(prefix);
  onChange(formatted);
  requestAnimationFrame(() => {
    let position = 0;
    let digits = 0;
    let decimalSeen = false;
    while (position < formatted.length && digits < digitsBeforeCursor) {
      if (/\d/.test(formatted[position])) digits += 1;
      position += 1;
    }
    if (hasDecimalBeforeCursor && formatted.slice(position).includes(',')) {
      position = formatted.indexOf(',', position) + 1;
      decimalSeen = true;
    }
    if (!decimalSeen) position = Math.max(position, digitsBeforeCursor + Math.floor(Math.max(digitsBeforeCursor - 1, 0) / 3));
    input.setSelectionRange(Math.min(position, formatted.length), Math.min(position, formatted.length));
  });
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [month, setMonth] = useState(monthKey(new Date()));
  const [transactions, setTransactions] = useState<MoneyTransaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [plan, setPlan] = useState<MonthlyPlan>({
    month: monthKey(new Date()),
    incomeItems: [],
    expenseItems: [],
    savingsGoal: 0,
    sphereAllocations: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<MoneyTransaction | null>(null);
  const [sphereRemaindersOpen, setSphereRemaindersOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => Number(month.split('-')[0]));
  const monthSwitcherRef = useRef<HTMLDivElement>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupMode, setBackupMode] = useState<'export' | 'import'>('export');
  const [backupError, setBackupError] = useState('');
  const [backupMessage, setBackupMessage] = useState('');

  const monthTransactions = useMemo(
    () => transactions.filter((item) => item.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)
      || b.createdAt.localeCompare(a.createdAt)),
    [month, transactions],
  );
  const expenses = monthTransactions.filter((item) => item.kind === 'expense');
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = monthTransactions.filter((item) => item.kind === 'income')
    .reduce((sum, item) => sum + item.amount, 0);
  const plannedIncome = plan.incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const plannedExpenses = plan.expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const isBudgetConfigured = plan.incomeItems.length > 0 || plan.expenseItems.length > 0 || plan.savingsGoal > 0;
  const spendingLimit = Math.max(0, plannedIncome - plannedExpenses - plan.savingsGoal);
  const remaining = spendingLimit - totalSpent;
  const progress = spendingLimit > 0 ? Math.min(100, (totalSpent / spendingLimit) * 100) : 0;

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getTransactions(), getPlan(month)])
      .then(([allTransactions, savedPlan]) => {
        if (!active) return;
        setTransactions(allTransactions);
        setPlan(savedPlan ?? { month, incomeItems: [], expenseItems: [], savingsGoal: 0, sphereAllocations: [] });
        setError('');
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить данные.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month]);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Не удалось загрузить настройки.');
      });
  }, []);

  useEffect(() => {
    if (!monthPickerOpen) return undefined;
    function dismissPicker(event: PointerEvent) {
      if (event.target instanceof Node && !monthSwitcherRef.current?.contains(event.target)) {
        setMonthPickerOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMonthPickerOpen(false);
    }
    document.addEventListener('pointerdown', dismissPicker);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissPicker);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [monthPickerOpen]);

  async function persistSettings(next: AppSettings) {
    await saveSettings(next);
    setSettings(next);
    setError('');
  }

  async function renameCategory(kind: 'expense' | 'income', oldName: string, newName: string) {
    const categoriesKey = kind === 'expense' ? 'expenseCategories' : 'incomeCategories';
    const iconsKey = kind === 'expense' ? 'expenseCategoryIcons' : 'incomeCategoryIcons';
    const categoryIcons = { ...settings[iconsKey] };
    if (categoryIcons[oldName]) {
      categoryIcons[newName] = categoryIcons[oldName];
      delete categoryIcons[oldName];
    }
    const next = {
      ...settings,
      [categoriesKey]: settings[categoriesKey].map((name) => name === oldName ? newName : name),
      [iconsKey]: categoryIcons,
    };
    await renameTransactionCategory(kind, oldName, newName, next);
    setSettings(next);
    setTransactions((current) => current.map((item) => (
      item.kind === kind && item.category === oldName ? { ...item, category: newName } : item
    )));
    setError('');
  }

  async function addCategory(kind: 'expense' | 'income', name: string) {
    const key = kind === 'expense' ? 'expenseCategories' : 'incomeCategories';
    const iconsKey = kind === 'expense' ? 'expenseCategoryIcons' : 'incomeCategoryIcons';
    await persistSettings({
      ...settings,
      [key]: [...settings[key], name],
      [iconsKey]: { ...settings[iconsKey], [name]: 'tag' },
    });
  }

  async function removeCategory(kind: 'expense' | 'income', name: string) {
    const key = kind === 'expense' ? 'expenseCategories' : 'incomeCategories';
    const iconsKey = kind === 'expense' ? 'expenseCategoryIcons' : 'incomeCategoryIcons';
    const icons = { ...settings[iconsKey] };
    delete icons[name];
    await persistSettings({
      ...settings,
      [key]: settings[key].filter((item) => item !== name),
      [iconsKey]: icons,
    });
  }

  async function setCategoryIcon(kind: 'expense' | 'income', name: string, icon: string) {
    const key = kind === 'expense' ? 'expenseCategoryIcons' : 'incomeCategoryIcons';
    await persistSettings({ ...settings, [key]: { ...settings[key], [name]: icon } });
  }

  async function renameSphere(id: string, name: string) {
    await persistSettings({
      ...settings,
      spheres: settings.spheres.map((sphere) => sphere.id === id ? { ...sphere, name } : sphere),
    });
  }

  async function addSphere(name: string) {
    const color = defaultSphereColors[settings.spheres.length % defaultSphereColors.length];
    await persistSettings({ ...settings, spheres: [...settings.spheres, { id: crypto.randomUUID(), name, color }] });
  }

  async function setSphereColor(id: string, color: string) {
    await persistSettings({
      ...settings,
      spheres: settings.spheres.map((sphere) => sphere.id === id ? { ...sphere, color } : sphere),
    });
  }

  async function removeSphere(id: string) {
    await persistSettings({ ...settings, spheres: settings.spheres.filter((sphere) => sphere.id !== id) });
  }

  async function handleSaveTransaction(transaction: MoneyTransaction) {
    await saveTransaction(transaction);
    setTransactions((current) => [transaction, ...current.filter((item) => item.id !== transaction.id)]);
    setTransactionOpen(false);
    setEditingTransaction(null);
  }

  async function handleDeleteTransaction(id: string) {
    try {
      await removeTransaction(id);
      setTransactions((current) => current.filter((item) => item.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось удалить запись.');
    }
  }

  async function handleSavePlan(next: MonthlyPlan) {
    await savePlan(next);
    setPlan(next);
    setPlanOpen(false);
  }

  async function handleSaveSphereAllocations(sphereAllocations: SphereAllocation[]) {
    const next = { ...plan, sphereAllocations };
    await savePlan(next);
    setPlan(next);
  }

  function shiftMonth(offset: number) {
    const [year, monthNumber] = month.split('-').map(Number);
    const next = new Date(year, monthNumber - 1 + offset, 1);
    setMonth(monthKey(next));
  }

  async function handleBackup(form: FormData) {
    setBackupError('');
    setBackupMessage('');
    const passphrase = String(form.get('passphrase') ?? '');
    const mode = String(form.get('mode') ?? '');
    if (passphrase.length < 12) {
      setBackupError('Пароль должен содержать не менее 12 символов.');
      return;
    }

    try {
      if (mode === 'export') {
        const blob = await encryptBackup(await makeBackup(), passphrase);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `kakeibo-${localDateString(new Date())}.enc`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setBackupMessage('Зашифрованная копия сохранена. Пароль понадобится для восстановления.');
      } else {
        const file = form.get('backupFile');
        if (!(file instanceof File) || file.size === 0) {
          setBackupError('Выберите файл резервной копии.');
          return;
        }
        const backup = await decryptBackup(file, passphrase);
        await restoreBackup(backup);
        const [allTransactions, savedPlan, savedSettings] = await Promise.all([getTransactions(), getPlan(month), getSettings()]);
        setTransactions(allTransactions);
        setPlan(savedPlan ?? { month, incomeItems: [], expenseItems: [], savingsGoal: 0, sphereAllocations: [] });
        setSettings(savedSettings);
        setBackupMessage('Данные восстановлены из резервной копии.');
      }
    } catch (reason) {
      setBackupError(reason instanceof Error ? reason.message : 'Не удалось обработать резервную копию.');
    }
  }

  const selectedTab = navItems.find((item) => item.id === activeTab)?.title ?? 'Настройки';
  const categoryTotals = expenses.reduce<Record<string, number>>((result, item) => {
    result[item.category] = (result[item.category] ?? 0) + item.amount;
    return result;
  }, {});
  const topCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sphereTotals = expenses.reduce<Record<string, number>>((result, item) => {
    const sphere = item.sphere ?? 'unassigned';
    result[sphere] = (result[sphere] ?? 0) + item.amount;
    return result;
  }, {});
  const sphereRemainders = settings.spheres.map((sphere) => {
    const allocation = plan.sphereAllocations.find((item) => item.sphereId === sphere.id);
    const allocated = allocation?.percentage === undefined
      ? allocation?.amount ?? 0
      : Math.round(spendingLimit * allocation.percentage / 100);
    const spent = sphereTotals[sphere.id] ?? 0;
    return { id: sphere.id, name: sphere.name, color: sphere.color ?? defaultSphereColors[0], allocated, spent, remaining: allocated - spent };
  });
  if ((sphereTotals.unassigned ?? 0) > 0) {
    const spent = sphereTotals.unassigned;
    sphereRemainders.push({
      id: 'unassigned',
      name: 'Сфера не указана',
      color: '#c7c5bb',
      allocated: 0,
      spent,
      remaining: -spent,
    });
  }
  const hasSphereAllocations = plan.sphereAllocations.some((allocation) => (
    settings.spheres.some((sphere) => sphere.id === allocation.sphereId)
  ));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setActiveTab('overview')} aria-label="Kakeibo, на главную">
          <span className="brand-mark"><Leaf size={21} strokeWidth={2.2} /></span>
          <span className="brand-word">kakeibo<span>.</span></span>
        </a>
        <div className="side-label">МЕНЮ</div>
        <nav className="side-nav" aria-label="Основная навигация">
          {navItems.map(({ id, title, icon: Icon }) => (
            <button key={id} aria-label={title} className={`nav-link ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{title}</span>
              {activeTab === id && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="quote-card">
            <span className="quote-spark"><Sparkles size={16} /></span>
            <p>«Маленькие шаги каждый день создают большие перемены»</p>
            <span className="quote-caption">ВАШЕ НАПОМИНАНИЕ</span>
          </div>
          <button aria-label="Настройки" className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings2 size={18} strokeWidth={1.8} /><span>Настройки</span>
          </button>
          <div className="local-status"><span className="status-dot" /> Данные хранятся на устройстве</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">ЛИЧНЫЕ ФИНАНСЫ <span>/</span> {selectedTab.toUpperCase()}</div>
          <div className="topbar-actions">
            <div className="month-switcher" ref={monthSwitcherRef}>
              <button aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)}><ArrowLeft size={16} /></button>
              <button
                className="month-picker-trigger"
                type="button"
                aria-label={`Выбрать месяц, сейчас ${formatMonth(month)}`}
                aria-haspopup="dialog"
                aria-expanded={monthPickerOpen}
                onClick={() => {
                  setMonthPickerYear(Number(month.split('-')[0]));
                  setMonthPickerOpen((open) => !open);
                }}
              >
                {formatMonth(month)}
              </button>
              <button aria-label="Следующий месяц" onClick={() => shiftMonth(1)}><ArrowRight size={16} /></button>
              {monthPickerOpen && (
                <div className="month-picker" role="dialog" aria-label="Выбор месяца">
                  <div className="month-picker-heading">
                    <button type="button" aria-label="Предыдущий год" onClick={() => setMonthPickerYear((year) => year - 1)}><ArrowLeft size={14} /></button>
                    <strong>{monthPickerYear}</strong>
                    <button type="button" aria-label="Следующий год" onClick={() => setMonthPickerYear((year) => year + 1)}><ArrowRight size={14} /></button>
                  </div>
                  <div className="month-picker-grid">
                    {Array.from({ length: 12 }, (_, index) => {
                      const value = `${monthPickerYear}-${String(index + 1).padStart(2, '0')}`;
                      const label = new Intl.DateTimeFormat('ru-RU', { month: 'short' })
                        .format(new Date(monthPickerYear, index, 1)).replace('.', '');
                      return (
                        <button
                          type="button"
                          className={value === month ? 'selected' : ''}
                          aria-pressed={value === month}
                          key={value}
                          onClick={() => {
                            setMonth(value);
                            setMonthPickerOpen(false);
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="month-picker-current"
                    type="button"
                    onClick={() => {
                      const currentMonth = monthKey(new Date());
                      setMonth(currentMonth);
                      setMonthPickerYear(Number(currentMonth.split('-')[0]));
                      setMonthPickerOpen(false);
                    }}
                  >
                    Текущий месяц
                  </button>
                </div>
              )}
            </div>
            <button className="avatar" aria-label="Открыть настройки" onClick={() => setActiveTab('settings')}>K</button>
          </div>
        </header>

        {error && <div className="error-banner" role="alert">{error}</div>}
        {loading ? <div className="loading">Загружаем ваши финансы…</div> : (
          <div className="page-content">
            {activeTab === 'overview' && (
              <>
                <section className="welcome-row">
                  <div>
                    <p className="eyebrow">ВАШИ ДЕНЬГИ. ВАШИ РЕШЕНИЯ.</p>
                    <h1>Деньги с <span>намерением.</span></h1>
                    <p className="welcome-copy">Спокойный взгляд на финансы начинается с одного маленького шага.</p>
                  </div>
                  <button className="primary-button" onClick={() => setTransactionOpen(true)}><Plus size={18} /> Добавить запись</button>
                </section>

                <section className="hero-card">
                  <div className="hero-text">
                    <div className="hero-label"><span className="tiny-leaf"><Leaf size={13} /></span> ВАШ БЮДЖЕТ НА МЕСЯЦ</div>
                    <h2>{formatMoney(remaining)} <span>₽</span></h2>
                    <p>{remaining >= 0 ? 'осталось на переменные расходы' : 'превышение плана расходов'}</p>
                    <div className="progress-label"><span>Потрачено {formatMoney(totalSpent)} ₽</span><span>Лимит {formatMoney(spendingLimit)} ₽</span></div>
                    <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
                    <button
                      className="hero-sphere-toggle"
                      type="button"
                      aria-expanded={sphereRemaindersOpen}
                      aria-controls="hero-sphere-remainders"
                      onClick={() => setSphereRemaindersOpen((open) => !open)}
                    >
                      Остатки по сферам
                      <ChevronDown size={14} className={sphereRemaindersOpen ? 'expanded' : ''} />
                    </button>
                    {sphereRemaindersOpen && (
                      <div className={`hero-sphere-remainders ${!isBudgetConfigured || !hasSphereAllocations ? 'hero-sphere-remainders-notice' : ''}`} id="hero-sphere-remainders">
                        {!isBudgetConfigured ? (
                          <button className="hero-budget-notice hero-sphere-notice" type="button" onClick={() => setActiveTab('plan')}>
                            <span>Заполните план бюджета на этот месяц</span>
                            <ArrowRight size={15} />
                          </button>
                        ) : !hasSphereAllocations ? (
                          <button className="hero-budget-notice hero-sphere-notice" type="button" onClick={() => setActiveTab('plan')}>
                            <span>Настройте распределение бюджета по сферам</span>
                            <ArrowRight size={15} />
                          </button>
                        ) : sphereRemainders.map((sphere) => {
                          const spentProgress = sphere.allocated > 0
                            ? Math.min(100, sphere.spent / sphere.allocated * 100)
                            : sphere.spent > 0 ? 100 : 0;
                          const progressMaximum = Math.max(sphere.allocated, sphere.spent, 1);
                          return (
                            <div className="hero-sphere-remainder" key={sphere.id}>
                              <div className="hero-sphere-remainder-heading">
                                <span className="hero-sphere-name"><span className="hero-sphere-dot" style={{ backgroundColor: sphere.color }} />{sphere.name}</span>
                                <strong className={sphere.remaining < 0 ? 'over-budget' : ''}>{formatMoney(sphere.remaining)} ₽</strong>
                              </div>
                              <div className="progress-label">
                                <span>Потрачено {formatMoney(sphere.spent)} ₽</span>
                                <span>Лимит {formatMoney(sphere.allocated)} ₽</span>
                              </div>
                              <div className="progress-track" role="progressbar" aria-label={`Потрачено в сфере «${sphere.name}»`} aria-valuemin={0} aria-valuemax={progressMaximum} aria-valuenow={Math.min(sphere.spent, progressMaximum)}>
                                <span className={sphere.remaining < 0 ? 'over-budget' : ''} style={{ width: `${spentProgress}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!isBudgetConfigured && !sphereRemaindersOpen && (
                      <button className="hero-budget-notice" type="button" onClick={() => setActiveTab('plan')}>
                        <span>Заполните план бюджета на этот месяц</span>
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                  <div className="hero-art" aria-hidden="true">
                    <div className="sun" />
                    <div className="hill hill-back" />
                    <div className="hill hill-front" />
                    <div className="art-leaf art-leaf-one"><Leaf size={76} /></div>
                    <div className="art-leaf art-leaf-two"><Leaf size={51} /></div>
                    <div className="art-caption">осознанность<br />в каждом выборе</div>
                  </div>
                </section>

                <section className="summary-grid">
                  <article className="summary-card">
                    <div className="summary-icon mint"><ArrowDownLeft size={19} /></div>
                    <span className="summary-label">ДОХОДЫ</span>
                    <strong>{formatMoney(totalIncome)} <small>₽</small></strong>
                    <span className="summary-foot">за {formatMonth(month)}</span>
                  </article>
                  <article className="summary-card">
                    <div className="summary-icon peach"><ArrowUpRight size={19} /></div>
                    <span className="summary-label">РАСХОДЫ</span>
                    <strong>{formatMoney(totalSpent)} <small>₽</small></strong>
                    <span className="summary-foot">за {formatMonth(month)}</span>
                  </article>
                  <article className="summary-card savings-card">
                    <div className="summary-icon lavender"><ShieldCheck size={19} /></div>
                    <span className="summary-label">ЦЕЛЬ НАКОПЛЕНИЙ</span>
                    <strong>{formatMoney(plan.savingsGoal)} <small>₽</small></strong>
                    <button className="text-action" onClick={() => setPlanOpen(true)}>Настроить цель <ArrowRight size={13} /></button>
                  </article>
                </section>

                <section className="lower-grid">
                  <article className="panel recent-panel">
                    <div className="panel-heading"><div><h3>Последние операции</h3><p>Ваши финансовые решения за месяц</p></div><button className="subtle-button" onClick={() => setActiveTab('history')}>Все операции <ArrowRight size={15} /></button></div>
                    <TransactionRows items={monthTransactions.slice(0, 5)} spheres={settings.spheres} expenseCategoryIcons={settings.expenseCategoryIcons} incomeCategoryIcons={settings.incomeCategoryIcons} onEdit={setEditingTransaction} onDelete={handleDeleteTransaction} />
                  </article>
                  <article className="panel category-panel">
                    <div className="panel-heading"><div><h3>Куда уходят деньги</h3><p>Два независимых взгляда на расходы</p></div><span className="panel-icon"><ChevronDown size={16} /></span></div>
                    <div className="breakdown-section">
                      <h4>По категориям</h4>
                      {topCategories.length === 0 ? <EmptyState text="Добавьте расход, чтобы увидеть категории." /> : (
                        <div className="category-list">
                          {topCategories.map(([category, amount]) => (
                            <div className="category-row" key={category}>
                              <CategoryIcon
                                icon={settings.expenseCategoryIcons?.[category] ?? 'tag'}
                                className="category-glyph"
                              />
                              <span className="category-name">{category}</span>
                              <span className="category-amount">{formatMoney(amount)} ₽</span>
                              <span className="category-percent">{totalSpent ? Math.round(amount / totalSpent * 100) : 0}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="breakdown-section sphere-breakdown">
                      <h4>По сферам какебо</h4>
                      {expenses.length === 0 ? <EmptyState text="Добавьте расход, чтобы увидеть распределение по сферам." /> : (
                        <div className="category-list">
                          {settings.spheres.map((sphere) => {
                            const amount = sphereTotals[sphere.id] ?? 0;
                            return (
                              <div className="category-row" key={sphere.id}>
                                <span className="category-dot" style={{ backgroundColor: sphere.color ?? defaultSphereColors[0] }} />
                                <span className="category-name">{sphere.name}</span>
                                <span className="category-amount">{formatMoney(amount)} ₽</span>
                                <span className="category-percent">{totalSpent ? Math.round(amount / totalSpent * 100) : 0}%</span>
                              </div>
                            );
                          })}
                          {(sphereTotals.unassigned ?? 0) > 0 && (
                            <div className="category-row">
                              <span className="category-dot color-3" />
                              <span className="category-name">Сфера не указана</span>
                              <span className="category-amount">{formatMoney(sphereTotals.unassigned)} ₽</span>
                              <span className="category-percent">{Math.round(sphereTotals.unassigned / totalSpent * 100)}%</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button className="category-footer" onClick={() => setActiveTab('history')}>Посмотреть аналитику <ArrowRight size={15} /></button>
                  </article>
                </section>
              </>
            )}
            {activeTab === 'history' && (
              <section className="content-section">
                <div className="section-title-row"><div><p className="eyebrow">ВАША ИСТОРИЯ</p><h1>Операции</h1><p className="welcome-copy">Каждая запись помогает лучше понять свои привычки.</p></div><button className="primary-button" onClick={() => { setEditingTransaction(null); setTransactionOpen(true); }}><Plus size={18} /> Добавить запись</button></div>
                <div className="panel history-panel"><TransactionRows items={monthTransactions} spheres={settings.spheres} expenseCategoryIcons={settings.expenseCategoryIcons} incomeCategoryIcons={settings.incomeCategoryIcons} groupByDay onEdit={setEditingTransaction} onDelete={handleDeleteTransaction} /></div>
              </section>
            )}
            {activeTab === 'plan' && (
              <section className="content-section">
                <div className="section-title-row"><div><p className="eyebrow">НАМЕРЕНИЕ НА МЕСЯЦ</p><h1>План бюджета</h1><p className="welcome-copy">Сначала отложите на важное — остальное станет яснее.</p></div></div>
                <div className="plan-layout">
                  <article className="panel plan-main"><div className="panel-heading"><div><h3>{formatMonth(month)}</h3><p>Ваш план распределения дохода</p></div></div>
                    <BudgetItemsSummary title="Плановые доходы" items={plan.incomeItems} categoryIcons={settings.incomeCategoryIcons} categorySecondary />
                    <BudgetItemsSummary title="Обязательные расходы" items={plan.expenseItems} categoryIcons={settings.expenseCategoryIcons} categorySecondary />
                    <section className="budget-summary-section savings-goal-section">
                      <div className="budget-summary-heading">
                        <h4>Цель накоплений</h4>
                        <strong>{formatMoney(plan.savingsGoal)} ₽</strong>
                      </div>
                    </section>
                    <div className="budget-card-footer plan-card-footer">
                      <div className="budget-card-totals" title="Плановые доходы минус обязательные расходы и цель накоплений.">
                        <span>Бюджет на переменные расходы</span>
                        <strong>{formatMoney(spendingLimit)} ₽</strong>
                      </div>
                      <button className="primary-button" onClick={() => setPlanOpen(true)}>Изменить план</button>
                    </div>
                  </article>
                  <SphereAllocationEditor
                    key={month}
                    spheres={settings.spheres}
                    allocations={plan.sphereAllocations}
                    availableAmount={spendingLimit}
                    onSave={handleSaveSphereAllocations}
                  />
                </div>
              </section>
            )}
            {activeTab === 'reflection' && (
              <section className="content-section">
                <div className="section-title-row"><div><p className="eyebrow">ПРАКТИКА КАКЕБО</p><h1>Время подумать</h1><p className="welcome-copy">Без оценок и чувства вины — только наблюдения.</p></div><span className="reflection-date">{formatMonth(month)}</span></div>
                <div className="reflection-grid">
                  {[
                    ['01', 'Сколько денег у меня есть?', 'Посмотрите на доходы, расходы и остаток за месяц.'],
                    ['02', 'Сколько я хочу накопить?', 'Ваша цель — ориентир, а не повод для беспокойства.'],
                    ['03', 'Сколько я трачу?', 'Какие категории оказались важнее, чем вы ожидали?'],
                    ['04', 'Как я могу улучшить ситуацию?', 'Выберите одно небольшое изменение на следующий месяц.'],
                  ].map(([number, title, copy]) => <article className="reflection-card" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}
                </div>
                <div className="reflection-summary"><Sparkles size={18} /><p>В этом месяце вы записали <strong>{monthTransactions.length}</strong> операций на общую сумму расходов <strong>{formatMoney(totalSpent)} ₽</strong>. Уже хороший повод поблагодарить себя за внимание.</p></div>
              </section>
            )}
            {activeTab === 'settings' && (
              <section className="content-section">
                <div className="section-title-row"><div><p className="eyebrow">ВАШИ ДАННЫЕ</p><h1>Настройки</h1><p className="welcome-copy">Настройте сферы и категории независимо друг от друга.</p></div></div>
                <div className="settings-layout">
                  <article className="panel catalog-panel">
                    <div className="catalog-heading"><span className="settings-icon"><Layers size={20} /></span><div><h3>Сферы какебо</h3><p>Выберите свой цвет для каждой сферы. Категории остаются отдельным списком.</p></div></div>
                    <CatalogEditor
                      entries={settings.spheres.map((sphere) => ({
                        id: sphere.id,
                        name: sphere.name,
                        color: sphere.color ?? defaultSphereColors[0],
                        usageCount: transactions.filter((item) => item.kind === 'expense' && item.sphere === sphere.id).length,
                      }))}
                      itemLabel="сферу"
                      onAdd={addSphere}
                      onRename={renameSphere}
                      onRemove={removeSphere}
                      onColorChange={setSphereColor}
                    />
                  </article>
                  <article className="panel catalog-panel">
                    <div className="catalog-heading"><span className="settings-icon"><Coins size={20} /></span><div><h3>Категории расходов</h3><p>Выберите иконку; переименование обновит существующие расходы.</p></div></div>
                    <CatalogEditor
                      entries={settings.expenseCategories.map((name) => ({
                        id: name,
                        name,
                        icon: settings.expenseCategoryIcons?.[name] ?? 'tag',
                        usageCount: transactions.filter((item) => item.kind === 'expense' && item.category === name).length,
                      }))}
                      itemLabel="категорию"
                      onAdd={(name) => addCategory('expense', name)}
                      onRename={(oldName, name) => renameCategory('expense', oldName, name)}
                      onRemove={(name) => removeCategory('expense', name)}
                      onIconChange={(name, icon) => setCategoryIcon('expense', name, icon)}
                    />
                  </article>
                  <article className="panel catalog-panel">
                    <div className="catalog-heading"><span className="settings-icon"><ArrowDownLeft size={20} /></span><div><h3>Категории доходов</h3><p>Иконки доходов и расходов настраиваются отдельно.</p></div></div>
                    <CatalogEditor
                      entries={settings.incomeCategories.map((name) => ({
                        id: name,
                        name,
                        icon: settings.incomeCategoryIcons?.[name] ?? 'tag',
                        usageCount: transactions.filter((item) => item.kind === 'income' && item.category === name).length,
                      }))}
                      itemLabel="категорию"
                      onAdd={(name) => addCategory('income', name)}
                      onRename={(oldName, name) => renameCategory('income', oldName, name)}
                      onRemove={(name) => removeCategory('income', name)}
                      onIconChange={(name, icon) => setCategoryIcon('income', name, icon)}
                    />
                  </article>
                  <article className="panel settings-card"><div className="settings-icon"><LockKeyhole size={20} /></div><div><h3>Локальное хранение</h3><p>Данные сохраняются в IndexedDB этого браузера и не отправляются на сервер.</p></div><span className="secure-tag"><Check size={14} /> На устройстве</span></article>
                  <article className="panel drive-backup">
                    <div className="drive-backup-heading">
                      <span className="settings-icon"><Cloud size={20} /></span>
                      <div><h3>Зашифрованная копия в Google Drive</h3><p>Скачайте файл, затем загрузите его в Google Drive. Для восстановления скачайте файл из Drive и импортируйте сюда.</p></div>
                    </div>
                    <div className="drive-backup-actions">
                      <button className="outline-button" onClick={() => { setBackupMode('export'); setBackupOpen(true); setBackupError(''); setBackupMessage(''); }}><Download size={15} /> Скачать зашифрованный файл</button>
                      <button className="outline-button" onClick={() => { setBackupMode('import'); setBackupOpen(true); setBackupError(''); setBackupMessage(''); }}><Upload size={15} /> Импортировать файл</button>
                      <a className="outline-button" href="https://drive.google.com/drive/my-drive" target="_blank" rel="noreferrer">Открыть Google Drive <ExternalLink size={14} /></a>
                    </div>
                    <p className="drive-backup-note">Файл шифруется в браузере (AES-256-GCM). Пароль не сохраняется — используйте один и тот же при создании и восстановлении.</p>
                  </article>
                </div>
              </section>
            )}
          </div>
        )}
        <footer className="page-footer"><span>kakeibo<span className="footer-dot">.</span> Финансовая осознанность в вашем ритме</span><span>Сделано с заботой о вас <Leaf size={13} /></span></footer>
      </main>

      {(transactionOpen || editingTransaction) && <TransactionDialog key={editingTransaction?.id ?? 'new'} month={month} settings={settings} initial={editingTransaction ?? undefined} onClose={() => { setTransactionOpen(false); setEditingTransaction(null); }} onSave={handleSaveTransaction} />}
      {planOpen && <PlanDialog month={month} initial={plan} incomeCategories={settings.incomeCategories} expenseCategories={settings.expenseCategories} onClose={() => setPlanOpen(false)} onSave={handleSavePlan} />}
      {backupOpen && <BackupDialog initialMode={backupMode} error={backupError} message={backupMessage} onClose={() => setBackupOpen(false)} onSubmit={handleBackup} />}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function CategoryIcon({ icon, className = '' }: { icon: string; className?: string }) {
  const Icon = categoryIcons[icon] ?? Tag;
  return <Icon className={className} size={15} strokeWidth={1.8} aria-hidden="true" />;
}

function TransactionRows({ items, spheres, expenseCategoryIcons, incomeCategoryIcons, groupByDay = false, onEdit, onDelete }: {
  items: MoneyTransaction[];
  spheres: AppSettings['spheres'];
  expenseCategoryIcons?: Record<string, string>;
  incomeCategoryIcons?: Record<string, string>;
  groupByDay?: boolean;
  onEdit: (transaction: MoneyTransaction) => void;
  onDelete: (id: string) => void;
}) {
  if (!items.length) return <EmptyState text="Пока нет записей за этот месяц. Добавьте первую — это займёт минуту." />;
  const groups: [string, MoneyTransaction[]][] = groupByDay
    ? [...items.reduce((result, item) => {
      const dayItems = result.get(item.date) ?? [];
      dayItems.push(item);
      result.set(item.date, dayItems);
      return result;
    }, new Map<string, MoneyTransaction[]>()).entries()]
    : [['', items]];

  return <div className={`transaction-list ${groupByDay ? 'transaction-list-grouped' : ''}`}>{groups.map(([date, dayItems]) => (
    <section className="transaction-day" key={date || 'all'}>
      {groupByDay && <h2 className="transaction-day-heading">{new Intl.DateTimeFormat('ru-RU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }).format(new Date(`${date}T00:00:00`))}</h2>}
      {dayItems.map((item) => {
        const income = item.kind === 'income';
        return (
          <div className="transaction-row" key={item.id}>
            <span className={`transaction-symbol ${income ? 'income-symbol' : 'expense-symbol'}`}>{income ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span>
            <span className="transaction-description"><strong>{item.note || item.category}</strong><small><span className="transaction-category"><CategoryIcon icon={(income ? incomeCategoryIcons : expenseCategoryIcons)?.[item.category] ?? 'tag'} />{item.category}</span>{!income && item.sphere ? ` · ${spheres.find((sphere) => sphere.id === item.sphere)?.name ?? item.sphere}` : ''}{!groupByDay ? ` · ${formatDate(item.date)}` : ''}</small></span>
            <span className={`transaction-value ${income ? 'positive' : ''}`}>{income ? '+' : '−'}{formatMoney(item.amount)} ₽</span>
            <button className="icon-button edit-button" aria-label={`Редактировать запись «${item.note || item.category}»`} onClick={() => onEdit(item)}><Pencil size={14} /></button>
            <button className="icon-button delete-button" aria-label={`Удалить запись «${item.note || item.category}»`} onClick={() => onDelete(item.id)}><Trash2 size={15} /></button>
          </div>
        );
      })}
    </section>
  ))}</div>;
}

function PlanLine({ title, amount }: { title: string; amount: number }) {
  return <div className="plan-line"><span>{title}</span><span>{formatMoney(amount)} ₽</span></div>;
}

function BudgetItemsSummary({ title, items, categoryIcons, categorySecondary = false }: {
  title: string;
  items: PlannedBudgetItem[];
  categoryIcons?: Record<string, string>;
  categorySecondary?: boolean;
}) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return (
    <section className="budget-summary-section">
      <div className="budget-summary-heading">
        <h4>{title}</h4>
        <strong>{formatMoney(total)} ₽</strong>
      </div>
      {items.length ? (
        <div className="budget-summary-list">
          {[...items].sort((a, b) => a.date.localeCompare(b.date)).map((item) => (
            <div className="budget-summary-item" key={item.id}>
              <span className="budget-summary-date">{formatPlanDate(item.date)}</span>
              <span className="budget-summary-name">
                {categorySecondary ? (
                  <>
                    {item.note || (item.category && item.name !== item.category ? item.name : item.category ?? item.name)}
                    {item.category && <small className="budget-summary-category"><CategoryIcon icon={categoryIcons?.[item.category] ?? 'tag'} />{item.category}</small>}
                  </>
                ) : (
                  <>
                    {item.category ? <><CategoryIcon icon={categoryIcons?.[item.category] ?? 'tag'} />{item.category}</> : item.name}
                    {item.note ? <small>{item.note}</small> : item.category && item.name !== item.category ? <small>{item.name}</small> : null}
                  </>
                )}
              </span>
              <span>{formatMoney(item.amount)} ₽</span>
            </div>
          ))}
        </div>
      ) : <p className="budget-empty">Пока нет записей.</p>}
    </section>
  );
}

function SphereAllocationEditor({
  spheres,
  allocations,
  availableAmount,
  onSave,
}: {
  spheres: AppSettings['spheres'];
  allocations: SphereAllocation[];
  availableAmount: number;
  onSave: (allocations: SphereAllocation[]) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [modes, setModes] = useState<Record<string, 'amount' | 'percentage'>>({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const allocationKey = JSON.stringify(allocations);
  const activeSphereIds = new Set(spheres.map((sphere) => sphere.id));
  const allocationSpheres = [
    ...spheres.map((sphere) => ({ ...sphere, archived: false })),
    ...allocations
      .filter((allocation) => !activeSphereIds.has(allocation.sphereId))
      .map((allocation) => ({
        id: allocation.sphereId,
        name: `Удалённая сфера (${allocation.sphereId.slice(0, 8)})`,
        color: '#c7c5bb',
        archived: true,
      })),
  ];

  useEffect(() => {
    const savedAllocations = JSON.parse(allocationKey) as SphereAllocation[];
    setValues(Object.fromEntries(savedAllocations.map((item) => [
      item.sphereId,
      item.percentage === undefined
        ? normalizeMoneyInput(String(item.amount / 100))
        : String(item.percentage).replace('.', ','),
    ])));
    setModes(Object.fromEntries(savedAllocations.map((item) => [
      item.sphereId,
      item.percentage === undefined ? 'amount' : 'percentage',
    ])));
  }, [allocationKey]);

  useEffect(() => {
    if (!saved) return undefined;
    const timeoutId = window.setTimeout(() => setSaved(false), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [saved]);

  const parsedAllocations = allocationSpheres.map((sphere) => {
    const mode = modes[sphere.id] ?? 'amount';
    const value = values[sphere.id]?.trim() ?? '';
    if (mode === 'percentage') {
      const percentage = value ? Number(value.replace(/\s/g, '').replace(',', '.')) : 0;
      const amount = Number.isFinite(percentage) && percentage >= 0 && percentage <= 100
        && Number.isInteger(percentage * 100)
        ? Math.round(availableAmount * percentage / 100)
        : null;
      return {
        sphereId: sphere.id,
        amount,
        percentage: Number.isFinite(percentage) && percentage >= 0 && percentage <= 100
          && Number.isInteger(percentage * 100)
          ? percentage
          : null,
      };
    }
    const amount = value ? rublesToKopecks(value, true) : 0;
    return {
      sphereId: sphere.id,
      amount: amount !== null && amount <= 9_999_999_999 ? amount : null,
      percentage: undefined,
    };
  });
  const hasInvalidAmount = parsedAllocations.some((item) => item.amount === null || item.percentage === null);
  const allocatedAmount = parsedAllocations.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const remainingAmount = availableAmount - allocatedAmount;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isEditing) return;
    setError('');
    setSaved(false);
    if (hasInvalidAmount || !Number.isSafeInteger(allocatedAmount)) {
      setError('Проверьте суммы распределения.');
      return;
    }
    if (allocatedAmount > availableAmount) {
      setError('Распределённая сумма не может превышать бюджет на переменные расходы.');
      return;
    }

    setSaving(true);
    try {
      await onSave(parsedAllocations.flatMap((item) => (
        item.amount !== null && item.percentage !== null && (item.amount > 0 || item.percentage !== undefined)
          ? [{ sphereId: item.sphereId, amount: item.amount, ...(item.percentage === undefined ? {} : { percentage: item.percentage }) }]
          : []
      )));
      setIsEditing(false);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить распределение.');
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    setError('');
    setSaved(false);
    setValues(Object.fromEntries(allocations.map((item) => [
      item.sphereId,
      item.percentage === undefined
        ? normalizeMoneyInput(String(item.amount / 100))
        : String(item.percentage).replace('.', ','),
    ])));
    setModes(Object.fromEntries(allocations.map((item) => [
      item.sphereId,
      item.percentage === undefined ? 'amount' : 'percentage',
    ])));
    setIsEditing(true);
  }

  return (
    <article className="panel sphere-allocation-panel">
      <div className="panel-heading">
        <div>
          <h3>Распределение по сферам</h3>
          <p>Распределите бюджет на переменные расходы между сферами какебо.</p>
        </div>
        <span className="allocation-available">Доступно: {formatMoney(availableAmount)} ₽</span>
      </div>
      {spheres.length === 0 ? <EmptyState text="Добавьте хотя бы одну сферу в настройках." /> : (
        <form className="sphere-allocation-form" onSubmit={submit}>
          <div className="sphere-allocation-list">
            <div className="sphere-allocation-head" aria-hidden="true">
              <span />
              <span>Сумма, ₽</span>
              <span>Процент, %</span>
            </div>
            {allocationSpheres.map((sphere) => (
              <div className={`sphere-allocation-row ${sphere.archived ? 'archived-allocation' : ''}`} key={sphere.id}>
                <span className="allocation-sphere-name">
                  <span className="allocation-sphere-dot" style={{ backgroundColor: sphere.color ?? defaultSphereColors[0] }} />
                  {sphere.name}
                </span>
                {(['amount', 'percentage'] as const).map((fieldMode) => {
                  const isEditable = isEditing && (modes[sphere.id] ?? 'amount') === fieldMode;
                  const allocation = parsedAllocations.find((item) => item.sphereId === sphere.id);
                  const isValidAmount = allocation?.amount !== null;
                  const displayedPercentage = fieldMode === 'percentage'
                    ? (allocation?.percentage ?? (availableAmount > 0 && allocation?.amount !== null
                      ? Number((((allocation?.amount ?? 0) / availableAmount) * 100).toFixed(2))
                      : 0))
                    : 0;
                  return (
                    <label className={`allocation-metric allocation-metric-${fieldMode} ${isEditable ? 'allocation-metric-active' : ''}`} key={fieldMode}>
                      <input
                        aria-label={`${fieldMode === 'amount' ? 'Сумма' : 'Процент'} для сферы «${sphere.name}»`}
                        inputMode="decimal"
                        placeholder="0"
                        min="0"
                        maxLength={fieldMode === 'percentage' ? 6 : 13}
                        max={fieldMode === 'percentage' ? '100' : undefined}
                        readOnly={!isEditable}
                        value={isEditable
                          ? values[sphere.id] ?? ''
                          : fieldMode === 'amount'
                            ? formatEditableNumber(String((allocation?.amount ?? 0) / 100))
                            : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(displayedPercentage)}
                        onFocus={() => {
                          if (!isEditing || isEditable) return;
                          const amount = allocation?.amount ?? 0;
                          setModes((current) => ({ ...current, [sphere.id]: fieldMode }));
                          setValues((current) => ({
                            ...current,
                            [sphere.id]: fieldMode === 'amount'
                              ? normalizeMoneyInput(String(amount / 100))
                              : String(availableAmount > 0 ? Number((amount / availableAmount * 100).toFixed(2)) : 0),
                          }));
                          setSaved(false);
                          setError('');
                        }}
                        onChange={(event) => {
                          const updateValue = (value: string) => setValues((current) => ({
                            ...current,
                            [sphere.id]: value,
                          }));
                          if (fieldMode === 'amount') handleMoneyInput(event, updateValue);
                          else updateValue(event.target.value);
                          setSaved(false);
                          setError('');
                        }}
                        onBlur={() => {
                          if (isEditable && fieldMode === 'percentage') setValues((current) => ({
                            ...current,
                            [sphere.id]: formatEditableNumber(current[sphere.id] ?? ''),
                          }));
                        }}
                        aria-invalid={isEditable && (fieldMode === 'percentage'
                          ? allocation?.percentage === null
                          : !isValidAmount)}
                      />
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
          {allocationSpheres.some((sphere) => sphere.archived) && (
            <p className="field-hint archived-allocation-hint">Удалённые сферы сохранены в этом плане. Обнулите их сумму, чтобы убрать распределение.</p>
          )}
          <div className="budget-card-footer sphere-allocation-footer">
            <div className="budget-card-totals allocation-totals">
              <span>Распределено <strong>{formatMoney(allocatedAmount)} ₽</strong></span>
              <span className={remainingAmount < 0 ? 'allocation-over' : ''}>
                Не распределено <strong>{formatMoney(remainingAmount)} ₽</strong>
              </span>
            </div>
            {isEditing ? (
              <button className="primary-button" type="submit" disabled={saving || hasInvalidAmount || remainingAmount < 0}>
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>
            ) : (
              <button className="primary-button" type="button" onClick={(event) => {
                event.preventDefault();
                startEditing();
              }}>
                Редактировать
              </button>
            )}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      )}
      {saved && <div className="allocation-toast" role="status" aria-live="polite">Распределение сохранено.</div>}
    </article>
  );
}

function DialogFrame({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`dialog ${wide ? 'dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="dialog-heading"><div><p className="eyebrow">KAKEIBO</p><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button close-button" aria-label="Закрыть" onClick={onClose}><X size={19} /></button></div>
      {children}
    </section>
  </div>;
}

function TransactionDialog({ month, settings, initial, onClose, onSave }: {
  month: string;
  settings: AppSettings;
  initial?: MoneyTransaction;
  onClose: () => void;
  onSave: (transaction: MoneyTransaction) => Promise<void>;
}) {
  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? 'expense');
  const [amount, setAmount] = useState(initial ? normalizeMoneyInput(String(initial.amount / 100)) : '');
  const [category, setCategory] = useState(initial?.category ?? settings.expenseCategories[0] ?? '');
  const [sphere, setSphere] = useState(initial?.sphere ?? settings.spheres[0]?.id ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial?.date ?? (month === monthKey(new Date()) ? localDateString(new Date()) : `${month}-01`));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const categories = kind === 'expense' ? settings.expenseCategories : settings.incomeCategories;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountInKopecks = rublesToKopecks(amount);
    if (!amountInKopecks) { setFormError('Введите сумму больше нуля.'); return; }
    if (!category || (kind === 'expense' && !sphere)) {
      setFormError('Сначала добавьте категорию и сферу в настройках.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: initial?.id ?? crypto.randomUUID(),
        kind,
        amount: amountInKopecks,
        category,
        ...(kind === 'expense' ? { sphere } : {}),
        note: note.trim(),
        date,
        createdAt: initial?.createdAt ?? new Date().toISOString(),
      });
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Не удалось сохранить запись.');
    } finally { setSaving(false); }
  }

  const currentCategories = initial && !categories.includes(category) ? [category, ...categories] : categories;
  const currentSpheres = initial?.sphere && !settings.spheres.some((item) => item.id === initial.sphere)
    ? [{ id: initial.sphere, name: `Удалённая сфера (${initial.sphere.slice(0, 8)})` }, ...settings.spheres]
    : settings.spheres;

  return <DialogFrame title={initial ? 'Редактировать запись' : 'Новая запись'} subtitle={`Запись попадёт в бюджет «${formatMonth(month)}».`} onClose={onClose}>
    <form className="dialog-form" onSubmit={submit}>
      <div className="segmented-control"><button type="button" className={kind === 'expense' ? 'selected' : ''} onClick={() => { setKind('expense'); setCategory(settings.expenseCategories[0] ?? ''); }}>Расход</button><button type="button" className={kind === 'income' ? 'selected' : ''} onClick={() => { setKind('income'); setCategory(settings.incomeCategories[0] ?? ''); }}>Доход</button></div>
      <label className="field-label">Сумма, ₽<input autoFocus inputMode="decimal" placeholder="0,00" value={amount} onChange={(event) => handleMoneyInput(event, setAmount)} required /></label>
      <div className="form-row">
        <label className="field-label">Категория<select value={category} onChange={(event) => setCategory(event.target.value)}>{currentCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className="field-label">Дата
          <span className="plan-date-field">
            <span className="plan-date-display" aria-hidden="true">
              <span>{formatPlanDate(date)}</span>
              <CalendarDays size={14} />
            </span>
            <input
              aria-label="Дата"
              lang="ru-RU"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </span>
        </div>
      </div>
      {kind === 'expense' && <>
        <label className="field-label">Сфера какебо<select value={sphere} onChange={(event) => setSphere(event.target.value)}>{currentSpheres.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <p className="field-hint">Сфера и категория не зависят друг от друга — выбирайте каждую отдельно.</p>
      </>}
      <label className="field-label">Заметка <span className="optional-label">необязательно</span><input maxLength={80} placeholder="Например, обед с друзьями" value={note} onChange={(event) => setNote(event.target.value)} /></label>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <button className="primary-button full-button" disabled={saving}>{saving ? 'Сохраняем…' : initial ? 'Сохранить изменения' : 'Сохранить запись'} <ArrowRight size={16} /></button>
    </form>
  </DialogFrame>;
}

interface CatalogEntry {
  id: string;
  name: string;
  usageCount: number;
  color?: string;
  icon?: string;
}

function CatalogEditor({
  entries,
  itemLabel,
  onAdd,
  onRename,
  onRemove,
  onColorChange,
  onIconChange,
}: {
  entries: CatalogEntry[];
  itemLabel: string;
  onAdd: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onColorChange?: (id: string, color: string) => Promise<void>;
  onIconChange?: (id: string, icon: string) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [editorError, setEditorError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openIconPickerId, setOpenIconPickerId] = useState<string | null>(null);
  const [iconPickerOpensAbove, setIconPickerOpensAbove] = useState(false);
  const serializedEntries = JSON.stringify(entries.map(({ id, name }) => [id, name]));
  const itemGenitive = itemLabel === 'сферу' ? 'сферы' : 'категории';
  const itemNominative = itemLabel === 'сферу' ? 'сфера' : 'категория';

  useEffect(() => {
    setDrafts(Object.fromEntries(JSON.parse(serializedEntries) as [string, string][]));
  }, [serializedEntries]);

  function validateName(name: string, excludeId?: string): string {
    const trimmed = name.trim();
    if (!trimmed) return `Введите название ${itemGenitive}.`;
    if (trimmed.length > 40) return 'Название не должно превышать 40 символов.';
    if (entries.some((entry) => entry.id !== excludeId && entry.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
      return 'Такое название уже есть в списке.';
    }
    return '';
  }

  async function runAction(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setEditorError('');
    try {
      await action();
    } catch (reason) {
      setEditorError(reason instanceof Error ? reason.message : 'Не удалось сохранить изменения.');
    } finally {
      setBusyId(null);
    }
  }

  async function addEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateName(newName);
    if (validation) {
      setEditorError(validation);
      return;
    }
    await runAction('new', async () => {
      await onAdd(newName.trim());
      setNewName('');
    });
  }

  return (
    <div className="catalog-editor">
      <div className="catalog-list">
        {entries.map((entry) => {
          const draft = drafts[entry.id] ?? entry.name;
          const validation = draft === entry.name ? '' : validateName(draft, entry.id);
          return (
            <div className={`catalog-row ${onColorChange ? 'catalog-row-color' : ''} ${onIconChange ? 'catalog-row-icon' : ''}`} key={entry.id}>
              {onColorChange && (
                <label className="catalog-color-control" title={`Цвет сферы «${entry.name}»`}>
                  <input
                    type="color"
                    aria-label={`Цвет сферы «${entry.name}»`}
                    value={entry.color ?? defaultSphereColors[0]}
                    disabled={busyId !== null}
                    onChange={(event) => runAction(entry.id, () => onColorChange(entry.id, event.target.value))}
                  />
                </label>
              )}
              {onIconChange && (
                <div className="catalog-icon-picker-wrap">
                  <button
                    className="catalog-icon-picker-trigger"
                    type="button"
                    aria-label={`Выбрать иконку для категории «${entry.name}»`}
                    aria-expanded={openIconPickerId === entry.id}
                    title="Выбрать иконку"
                    disabled={busyId !== null}
                    onClick={(event) => {
                      if (openIconPickerId === entry.id) {
                        setOpenIconPickerId(null);
                        return;
                      }
                      const triggerBounds = event.currentTarget.getBoundingClientRect();
                      const pickerHeight = window.innerWidth <= 600 ? 324 : 245;
                      setIconPickerOpensAbove(
                        triggerBounds.bottom + pickerHeight + 8 > window.innerHeight
                          && triggerBounds.top > pickerHeight,
                      );
                      setOpenIconPickerId(entry.id);
                    }}
                  >
                    <CategoryIcon icon={entry.icon ?? 'tag'} className="catalog-category-icon" />
                  </button>
                  {openIconPickerId === entry.id && (
                    <div
                      className={`catalog-icon-picker ${iconPickerOpensAbove ? 'opens-above' : ''}`}
                      role="group"
                      aria-label={`Иконки для категории «${entry.name}»`}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') setOpenIconPickerId(null);
                      }}
                    >
                      {categoryIconOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            className={`catalog-icon-option ${entry.icon === option.id ? 'selected' : ''}`}
                            type="button"
                            key={option.id}
                            aria-label={option.label}
                            aria-pressed={entry.icon === option.id}
                            title={option.label}
                            disabled={busyId !== null}
                            onClick={() => {
                              void runAction(entry.id, async () => {
                                await onIconChange(entry.id, option.id);
                                setOpenIconPickerId(null);
                                setIconPickerOpensAbove(false);
                              });
                            }}
                          >
                            <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <input
                aria-label={`Название ${itemGenitive}: ${entry.name}`}
                maxLength={40}
                value={draft}
                onChange={(event) => setDrafts((current) => ({ ...current, [entry.id]: event.target.value }))}
              />
              <button
                className="icon-button catalog-action"
                aria-label={`Сохранить ${itemLabel} «${entry.name}»`}
                title={validation || `Сохранить ${itemLabel}`}
                disabled={busyId !== null || !draft.trim() || !!validation || draft === entry.name}
                onClick={() => runAction(entry.id, () => onRename(entry.id, draft.trim()))}
              ><Save size={15} /></button>
              <button
                className="icon-button catalog-delete"
                aria-label={`Удалить ${itemLabel} «${entry.name}»`}
                title={entry.usageCount ? `Используется в ${entry.usageCount} операциях` : entries.length === 1 ? 'Нужен хотя бы один вариант' : `Удалить ${itemLabel}`}
                disabled={busyId !== null || entry.usageCount > 0 || entries.length === 1}
                onClick={() => runAction(entry.id, () => onRemove(entry.id))}
              ><Trash2 size={15} /></button>
              <span className="catalog-usage">{entry.usageCount ? `В операциях: ${entry.usageCount}` : 'Не используется'}</span>
            </div>
          );
        })}
      </div>
      <form className="catalog-add" onSubmit={addEntry}>
        <input aria-label={`Добавить ${itemNominative}`} maxLength={40} placeholder={`Новая ${itemNominative}`} value={newName} onChange={(event) => setNewName(event.target.value)} />
        <button className="outline-button" type="submit" disabled={busyId !== null}><Plus size={15} /> Добавить</button>
      </form>
      {editorError && <p className="form-error" role="alert">{editorError}</p>}
    </div>
  );
}

function PlanDialog({ month, initial, incomeCategories, expenseCategories, onClose, onSave }: {
  month: string;
  initial: MonthlyPlan;
  incomeCategories: string[];
  expenseCategories: string[];
  onClose: () => void;
  onSave: (plan: MonthlyPlan) => Promise<void>;
}) {
  const [incomeItems, setIncomeItems] = useState(() => initial.incomeItems.map((item) => ({
    ...item,
    category: item.category ?? (incomeCategories.includes(item.name) ? item.name : incomeCategories[0] ?? ''),
    note: item.note ?? (incomeCategories.includes(item.name) ? '' : item.name),
    amount: normalizeMoneyInput(String(item.amount / 100)),
    date: formatPlanDate(item.date),
  })));
  const [expenseItems, setExpenseItems] = useState(() => initial.expenseItems.map((item) => ({
    ...item,
    category: item.category ?? '',
    note: item.note ?? (item.category && item.name !== item.category ? item.name : ''),
    amount: normalizeMoneyInput(String(item.amount / 100)),
    date: formatPlanDate(item.date),
  })));
  const [savingsGoal, setSavingsGoal] = useState(initial.savingsGoal ? normalizeMoneyInput(String(initial.savingsGoal / 100)) : '');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function addItem(kind: 'income' | 'expense') {
    const item = {
      id: crypto.randomUUID(),
      name: '',
      amount: '',
      date: formatPlanDate(defaultPlannedDate(month)),
      category: (kind === 'income' ? incomeCategories : expenseCategories)[0] ?? '',
      note: '',
    };
    if (kind === 'income') setIncomeItems((current) => [...current, item]);
    else setExpenseItems((current) => [...current, item]);
  }

  function updateItem(kind: 'income' | 'expense', id: string, field: 'amount' | 'date' | 'category' | 'note', value: string) {
    const update = (items: typeof incomeItems) => items.map((item) => item.id === id ? { ...item, [field]: value } : item);
    if (kind === 'income') setIncomeItems(update);
    else setExpenseItems(update);
  }

  function removeItem(kind: 'income' | 'expense', id: string) {
    if (kind === 'income') setIncomeItems((current) => current.filter((item) => item.id !== id));
    else setExpenseItems((current) => current.filter((item) => item.id !== id));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const convertItems = (items: typeof incomeItems, categories: string[], existingItems: PlannedBudgetItem[]): PlannedBudgetItem[] | null => {
      const converted = items.map((item) => ({
        id: item.id,
        name: item.category,
        amount: rublesToKopecks(item.amount),
        date: parsePlanDate(item.date),
        category: item.category,
        note: item.note.trim(),
      }));
      if (converted.some((item) => !item.category || item.category.length > 80 || item.amount === null
        || item.date === null || !item.date.startsWith(`${month}-`) || item.note.length > 80
        || (!categories.includes(item.category)
          && !existingItems.some((existing) => existing.category === item.category)))) return null;
      return converted.map((item) => ({
        ...item,
        amount: item.amount!,
        date: item.date!,
        ...(item.note ? {} : { note: undefined }),
      }));
    };
    const savedIncomeItems = convertItems(incomeItems, incomeCategories, initial.incomeItems);
    const savedExpenseItems = convertItems(expenseItems, expenseCategories, initial.expenseItems);
    const savingsInKopecks = savingsGoal.trim() ? rublesToKopecks(savingsGoal, true) : 0;
    if (!savedIncomeItems || !savedExpenseItems || savingsInKopecks === null) {
      setFormError('Проверьте категории, суммы и даты в формате дд.мм.гггг. Дата каждой записи должна быть в выбранном месяце.');
      return;
    }
    const incomeTotal = savedIncomeItems.reduce((sum, item) => sum + item.amount, 0);
    const expenseTotal = savedExpenseItems.reduce((sum, item) => sum + item.amount, 0);
    if (!Number.isSafeInteger(incomeTotal) || !Number.isSafeInteger(expenseTotal)
      || !Number.isSafeInteger(expenseTotal + savingsInKopecks)) {
      setFormError('Общая сумма превышает допустимое значение.');
      return;
    }
    if (expenseTotal + savingsInKopecks > incomeTotal) {
      setFormError('Обязательные расходы и накопления не могут быть больше плановых доходов.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        month,
        incomeItems: savedIncomeItems,
        expenseItems: savedExpenseItems,
        savingsGoal: savingsInKopecks,
        sphereAllocations: initial.sphereAllocations,
      });
    }
    catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Не удалось сохранить план.'); }
    finally { setSaving(false); }
  }

  function itemEditor(title: string, kind: 'income' | 'expense', items: typeof incomeItems) {
    const categories = kind === 'income' ? incomeCategories : expenseCategories;
    return (
      <section className="plan-editor-section">
        <div className="plan-editor-heading">
          <h3>{title}</h3>
          <button className="outline-button" type="button" onClick={() => addItem(kind)}><Plus size={14} /> Добавить</button>
        </div>
        {items.length === 0 && <p className="plan-editor-empty">Добавьте плановую запись с категорией, суммой и датой.</p>}
        {items.length > 0 && (
          <div className="plan-items-table">
            <div className="plan-item-headings" aria-hidden="true">
              <span>Категория</span>
              <span>Сумма, ₽</span>
              <span>Дата</span>
              <span>Примечание</span>
              <span />
            </div>
            {items.map((item, index) => (
              <div className="plan-item-fields" key={item.id}>
                <select aria-label={`${title}: категория ${index + 1}`} value={item.category} onChange={(event) => updateItem(kind, item.id, 'category', event.target.value)} required>
                  {!item.category && <option value="" disabled>Выберите</option>}
                  {item.category && !categories.includes(item.category) && <option value={item.category}>{item.category} (архивная)</option>}
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <input aria-label={`${title}: сумма ${index + 1}`} inputMode="decimal" placeholder="0,00" value={item.amount} onChange={(event) => handleMoneyInput(event, (value) => updateItem(kind, item.id, 'amount', value))} />
                <label className="plan-date-field">
                  <span className="plan-date-display" aria-hidden="true">
                    <span>{item.date || 'дд.мм.гггг'}</span>
                    <CalendarDays size={14} />
                  </span>
                  <input
                    aria-label={`${title}: дата ${index + 1}`}
                    lang="ru-RU"
                    type="date"
                    min={`${month}-01`}
                    max={`${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, '0')}`}
                    value={parsePlanDate(item.date) ?? ''}
                    onChange={(event) => updateItem(kind, item.id, 'date', event.target.value ? formatPlanDate(event.target.value) : '')}
                    required
                  />
                </label>
                <input aria-label={`${title}: примечание ${index + 1}`} maxLength={80} placeholder={kind === 'income' ? 'Например, аванс' : 'Например, аренда квартиры'} value={item.note} onChange={(event) => updateItem(kind, item.id, 'note', event.target.value)} />
                <button className="icon-button plan-item-delete" type="button" aria-label={`Удалить запись ${index + 1} в разделе «${title}»`} onClick={() => removeItem(kind, item.id)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
        <PlanLine title={`Итого: ${title.toLocaleLowerCase()}`} amount={items.reduce((sum, item) => sum + (rublesToKopecks(item.amount) ?? 0), 0)} />
      </section>
    );
  }

  return (
    <DialogFrame title="План на месяц" subtitle={`Распределите доходы и расходы на ${formatMonth(month)}.`} onClose={onClose} wide>
      <form className="dialog-form plan-dialog-form" onSubmit={submit}>
        {itemEditor('Доходы', 'income', incomeItems)}
        {itemEditor('Обязательные расходы', 'expense', expenseItems)}
        <label className="field-label">Цель накоплений, ₽<input inputMode="decimal" placeholder="Сколько хотите отложить" value={savingsGoal} onChange={(event) => handleMoneyInput(event, setSavingsGoal)} /></label>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <button className="primary-button full-button" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить план'} <Check size={16} /></button>
      </form>
    </DialogFrame>
  );
}

function BackupDialog({ initialMode, error, message, onClose, onSubmit }: { initialMode: 'export' | 'import'; error: string; message: string; onClose: () => void; onSubmit: (form: FormData) => Promise<void> }) {
  const [mode, setMode] = useState<'export' | 'import'>(initialMode);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try { await onSubmit(new FormData(event.currentTarget)); }
    finally { setBusy(false); }
  }
  return <DialogFrame title="Резервная копия" subtitle="Файл шифруется прямо в этом браузере перед сохранением." onClose={onClose}>
    <form className="dialog-form backup-form" onSubmit={submit}>
      <div className="segmented-control"><button type="button" className={mode === 'export' ? 'selected' : ''} onClick={() => setMode('export')}>Создать копию</button><button type="button" className={mode === 'import' ? 'selected' : ''} onClick={() => setMode('import')}>Восстановить</button></div>
      {mode === 'import' && <>
        <label className="field-label">Файл копии<input name="backupFile" type="file" accept=".enc,application/octet-stream" required /></label>
        <label className="replace-warning"><input name="confirmReplace" type="checkbox" required /> Текущие данные будут заменены данными из копии.</label>
      </>}
      <label className="field-label">Пароль шифрования<input name="passphrase" type="password" autoComplete="new-password" minLength={12} placeholder="Не менее 12 символов" required /></label>
      <input type="hidden" name="mode" value={mode} />
      <div className="encryption-note"><LockKeyhole size={17} /><span>Шифрование AES-256-GCM. Мы не храним и не можем восстановить ваш пароль. Сохраните его отдельно.</span></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}
      <button className="primary-button full-button" disabled={busy}>{busy ? 'Обрабатываем…' : mode === 'export' ? 'Зашифровать и скачать' : 'Расшифровать и восстановить'} {mode === 'export' ? <Download size={16} /> : <ShieldCheck size={16} />}</button>
    </form>
  </DialogFrame>;
}

export default App;
