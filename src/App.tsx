import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Coins,
  Download,
  Layers,
  Leaf,
  LockKeyhole,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import {
  defaultAppSettings,
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
  type MonthlyPlan,
  type TransactionKind,
} from './lib/db';
import { decryptBackup, encryptBackup } from './lib/crypto';

type Tab = 'overview' | 'history' | 'plan' | 'reflection' | 'settings';

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

function rublesToKopecks(value: string, allowZero = false): number | null {
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0 || (!allowZero && parsed === 0) || parsed > Number.MAX_SAFE_INTEGER / 100) return null;
  return Math.round(parsed * 100);
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [month, setMonth] = useState(monthKey(new Date()));
  const [transactions, setTransactions] = useState<MoneyTransaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [plan, setPlan] = useState<MonthlyPlan>({ month: monthKey(new Date()), income: 0, fixedCosts: 0, savingsGoal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
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
  const spendingLimit = Math.max(0, plan.income - plan.fixedCosts - plan.savingsGoal);
  const remaining = spendingLimit - totalSpent;
  const progress = spendingLimit > 0 ? Math.min(100, (totalSpent / spendingLimit) * 100) : 0;

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getTransactions(), getPlan(month)])
      .then(([allTransactions, savedPlan]) => {
        if (!active) return;
        setTransactions(allTransactions);
        setPlan(savedPlan ?? { month, income: 0, fixedCosts: 0, savingsGoal: 0 });
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

  async function persistSettings(next: AppSettings) {
    await saveSettings(next);
    setSettings(next);
    setError('');
  }

  async function renameCategory(kind: 'expense' | 'income', oldName: string, newName: string) {
    const categoriesKey = kind === 'expense' ? 'expenseCategories' : 'incomeCategories';
    const next = {
      ...settings,
      [categoriesKey]: settings[categoriesKey].map((name) => name === oldName ? newName : name),
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
    await persistSettings({ ...settings, [key]: [...settings[key], name] });
  }

  async function removeCategory(kind: 'expense' | 'income', name: string) {
    const key = kind === 'expense' ? 'expenseCategories' : 'incomeCategories';
    await persistSettings({ ...settings, [key]: settings[key].filter((item) => item !== name) });
  }

  async function renameSphere(id: string, name: string) {
    await persistSettings({
      ...settings,
      spheres: settings.spheres.map((sphere) => sphere.id === id ? { ...sphere, name } : sphere),
    });
  }

  async function addSphere(name: string) {
    await persistSettings({ ...settings, spheres: [...settings.spheres, { id: crypto.randomUUID(), name }] });
  }

  async function removeSphere(id: string) {
    await persistSettings({ ...settings, spheres: settings.spheres.filter((sphere) => sphere.id !== id) });
  }

  async function handleSaveTransaction(transaction: MoneyTransaction) {
    await saveTransaction(transaction);
    setTransactions((current) => [transaction, ...current.filter((item) => item.id !== transaction.id)]);
    setTransactionOpen(false);
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
        setPlan(savedPlan ?? { month, income: 0, fixedCosts: 0, savingsGoal: 0 });
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
            <div className="month-switcher">
              <button aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)}><ArrowLeft size={16} /></button>
              <span>{formatMonth(month)}</span>
              <button aria-label="Следующий месяц" onClick={() => shiftMonth(1)}><ArrowRight size={16} /></button>
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
                    <button className="hero-link" onClick={() => setPlanOpen(true)}>Настроить бюджет <ArrowRight size={15} /></button>
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
                    <TransactionRows items={monthTransactions.slice(0, 5)} spheres={settings.spheres} onDelete={handleDeleteTransaction} />
                  </article>
                  <article className="panel category-panel">
                    <div className="panel-heading"><div><h3>Куда уходят деньги</h3><p>Два независимых взгляда на расходы</p></div><span className="panel-icon"><ChevronDown size={16} /></span></div>
                    <div className="breakdown-section">
                      <h4>По категориям</h4>
                      {topCategories.length === 0 ? <EmptyState text="Добавьте расход, чтобы увидеть категории." /> : (
                        <div className="category-list">
                          {topCategories.map(([category, amount], index) => (
                            <div className="category-row" key={category}>
                              <span className={`category-dot color-${index}`} />
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
                          {settings.spheres.map((sphere, index) => {
                            const amount = sphereTotals[sphere.id] ?? 0;
                            return (
                              <div className="category-row" key={sphere.id}>
                                <span className={`category-dot color-${index % 4}`} />
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
                <div className="section-title-row"><div><p className="eyebrow">ВАША ИСТОРИЯ</p><h1>Операции</h1><p className="welcome-copy">Каждая запись помогает лучше понять свои привычки.</p></div><button className="primary-button" onClick={() => setTransactionOpen(true)}><Plus size={18} /> Добавить запись</button></div>
                <div className="panel history-panel"><TransactionRows items={monthTransactions} spheres={settings.spheres} onDelete={handleDeleteTransaction} /></div>
              </section>
            )}
            {activeTab === 'plan' && (
              <section className="content-section">
                <div className="section-title-row"><div><p className="eyebrow">НАМЕРЕНИЕ НА МЕСЯЦ</p><h1>План бюджета</h1><p className="welcome-copy">Сначала отложите на важное — остальное станет яснее.</p></div><button className="primary-button" onClick={() => setPlanOpen(true)}>Изменить план</button></div>
                <div className="plan-layout">
                  <article className="panel plan-main"><div className="panel-heading"><div><h3>{formatMonth(month)}</h3><p>Ваш план распределения дохода</p></div><BookOpen size={21} className="green-icon" /></div>
                    <PlanLine title="Доход за месяц" amount={plan.income} />
                    <PlanLine title="Обязательные расходы" amount={plan.fixedCosts} negative />
                    <PlanLine title="Цель накоплений" amount={plan.savingsGoal} negative />
                    <div className="plan-total"><span>Бюджет на переменные расходы</span><strong>{formatMoney(spendingLimit)} ₽</strong></div>
                    <p className="plan-hint">Это сумма, которой можно распоряжаться после обязательных платежей и накоплений.</p>
                  </article>
                  <article className="panel plan-note"><div className="summary-icon mint"><Sparkles size={18} /></div><h3>Маленькая подсказка</h3><p>Попробуйте записывать расходы сразу после покупки. Так легче замечать закономерности, не осуждая себя.</p><span>ОДИН ШАГ ЗА РАЗ</span></article>
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
                    <div className="catalog-heading"><span className="settings-icon"><Layers size={20} /></span><div><h3>Сферы какебо</h3><p>Сфера описывает смысл расхода, а категория — его вид. Эти списки независимы.</p></div></div>
                    <CatalogEditor
                      entries={settings.spheres.map((sphere) => ({
                        id: sphere.id,
                        name: sphere.name,
                        usageCount: transactions.filter((item) => item.kind === 'expense' && item.sphere === sphere.id).length,
                      }))}
                      itemLabel="сферу"
                      onAdd={addSphere}
                      onRename={renameSphere}
                      onRemove={removeSphere}
                    />
                  </article>
                  <article className="panel catalog-panel">
                    <div className="catalog-heading"><span className="settings-icon"><Coins size={20} /></span><div><h3>Категории расходов</h3><p>Переименование обновит категорию в существующих расходах.</p></div></div>
                    <CatalogEditor
                      entries={settings.expenseCategories.map((name) => ({
                        id: name,
                        name,
                        usageCount: transactions.filter((item) => item.kind === 'expense' && item.category === name).length,
                      }))}
                      itemLabel="категорию"
                      onAdd={(name) => addCategory('expense', name)}
                      onRename={(oldName, name) => renameCategory('expense', oldName, name)}
                      onRemove={(name) => removeCategory('expense', name)}
                    />
                  </article>
                  <article className="panel catalog-panel">
                    <div className="catalog-heading"><span className="settings-icon"><ArrowDownLeft size={20} /></span><div><h3>Категории доходов</h3><p>Категории доходов управляются отдельно от расходов и сфер.</p></div></div>
                    <CatalogEditor
                      entries={settings.incomeCategories.map((name) => ({
                        id: name,
                        name,
                        usageCount: transactions.filter((item) => item.kind === 'income' && item.category === name).length,
                      }))}
                      itemLabel="категорию"
                      onAdd={(name) => addCategory('income', name)}
                      onRename={(oldName, name) => renameCategory('income', oldName, name)}
                      onRemove={(name) => removeCategory('income', name)}
                    />
                  </article>
                  <article className="panel settings-card"><div className="settings-icon"><LockKeyhole size={20} /></div><div><h3>Локальное хранение</h3><p>Данные сохраняются в IndexedDB этого браузера и не отправляются на сервер.</p></div><span className="secure-tag"><Check size={14} /> На устройстве</span></article>
                  <article className="panel settings-card"><div className="settings-icon"><ShieldCheck size={20} /></div><div><h3>Зашифрованная копия</h3><p>Резервная копия шифруется в браузере алгоритмом AES-256-GCM. Пароль не передаётся и не сохраняется.</p></div><button className="outline-button" onClick={() => { setBackupOpen(true); setBackupError(''); setBackupMessage(''); }}>Управлять копией <ArrowRight size={15} /></button></article>
                  <article className="panel drive-roadmap"><div className="roadmap-icon"><CircleHelp size={18} /></div><div><h3>Google Drive</h3><p>Синхронизацию подключим следующим этапом: файл будет шифроваться до отправки в Google Drive. Для этого понадобятся OAuth client ID и настройка приложения в Google Cloud.</p><span>СЕЙЧАС: РУЧНОЕ РЕЗЕРВНОЕ КОПИРОВАНИЕ</span></div></article>
                </div>
              </section>
            )}
          </div>
        )}
        <footer className="page-footer"><span>kakeibo<span className="footer-dot">.</span> Финансовая осознанность в вашем ритме</span><span>Сделано с заботой о вас <Leaf size={13} /></span></footer>
      </main>

      {transactionOpen && <TransactionDialog month={month} settings={settings} onClose={() => setTransactionOpen(false)} onSave={handleSaveTransaction} />}
      {planOpen && <PlanDialog month={month} initial={plan} onClose={() => setPlanOpen(false)} onSave={handleSavePlan} />}
      {backupOpen && <BackupDialog error={backupError} message={backupMessage} onClose={() => setBackupOpen(false)} onSubmit={handleBackup} />}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function TransactionRows({ items, spheres, onDelete }: { items: MoneyTransaction[]; spheres: AppSettings['spheres']; onDelete: (id: string) => void }) {
  if (!items.length) return <EmptyState text="Пока нет записей за этот месяц. Добавьте первую — это займёт минуту." />;
  return <div className="transaction-list">{items.map((item) => {
    const income = item.kind === 'income';
    return (
      <div className="transaction-row" key={item.id}>
        <span className={`transaction-symbol ${income ? 'income-symbol' : 'expense-symbol'}`}>{income ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span>
        <span className="transaction-description"><strong>{item.note || item.category}</strong><small>{item.category}{!income && item.sphere ? ` · ${spheres.find((sphere) => sphere.id === item.sphere)?.name ?? item.sphere}` : ''} · {formatDate(item.date)}</small></span>
        <span className={`transaction-value ${income ? 'positive' : ''}`}>{income ? '+' : '−'}{formatMoney(item.amount)} ₽</span>
        <button className="icon-button delete-button" aria-label={`Удалить запись «${item.note || item.category}»`} onClick={() => onDelete(item.id)}><Trash2 size={15} /></button>
      </div>
    );
  })}</div>;
}

function PlanLine({ title, amount, negative = false }: { title: string; amount: number; negative?: boolean }) {
  return <div className="plan-line"><span>{title}</span><span className={negative ? 'muted-amount' : ''}>{negative && amount ? '−' : ''}{formatMoney(amount)} ₽</span></div>;
}

function DialogFrame({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="dialog" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dialog-heading"><div><p className="eyebrow">KAKEIBO</p><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button close-button" aria-label="Закрыть" onClick={onClose}><X size={19} /></button></div>
      {children}
    </section>
  </div>;
}

function TransactionDialog({ month, settings, onClose, onSave }: { month: string; settings: AppSettings; onClose: () => void; onSave: (transaction: MoneyTransaction) => Promise<void> }) {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(settings.expenseCategories[0] ?? '');
  const [sphere, setSphere] = useState(settings.spheres[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(month === monthKey(new Date()) ? localDateString(new Date()) : `${month}-01`);
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
      await onSave({ id: crypto.randomUUID(), kind, amount: amountInKopecks, category, ...(kind === 'expense' ? { sphere } : {}), note: note.trim(), date, createdAt: new Date().toISOString() });
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Не удалось сохранить запись.');
    } finally { setSaving(false); }
  }

  return <DialogFrame title="Новая запись" subtitle={`Запись попадёт в бюджет «${formatMonth(month)}».`} onClose={onClose}>
    <form className="dialog-form" onSubmit={submit}>
      <div className="segmented-control"><button type="button" className={kind === 'expense' ? 'selected' : ''} onClick={() => { setKind('expense'); setCategory(settings.expenseCategories[0] ?? ''); }}>Расход</button><button type="button" className={kind === 'income' ? 'selected' : ''} onClick={() => { setKind('income'); setCategory(settings.incomeCategories[0] ?? ''); }}>Доход</button></div>
      <label className="field-label">Сумма, ₽<input autoFocus inputMode="decimal" placeholder="0" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
      <div className="form-row">
        <label className="field-label">Категория<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field-label">Дата<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
      </div>
      {kind === 'expense' && <>
        <label className="field-label">Сфера какебо<select value={sphere} onChange={(event) => setSphere(event.target.value)}>{settings.spheres.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <p className="field-hint">Сфера и категория не зависят друг от друга — выбирайте каждую отдельно.</p>
      </>}
      <label className="field-label">Заметка <span className="optional-label">необязательно</span><input maxLength={80} placeholder="Например, обед с друзьями" value={note} onChange={(event) => setNote(event.target.value)} /></label>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <button className="primary-button full-button" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить запись'} <ArrowRight size={16} /></button>
    </form>
  </DialogFrame>;
}

interface CatalogEntry {
  id: string;
  name: string;
  usageCount: number;
}

function CatalogEditor({
  entries,
  itemLabel,
  onAdd,
  onRename,
  onRemove,
}: {
  entries: CatalogEntry[];
  itemLabel: string;
  onAdd: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [editorError, setEditorError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
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
            <div className="catalog-row" key={entry.id}>
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

function PlanDialog({ month, initial, onClose, onSave }: { month: string; initial: MonthlyPlan; onClose: () => void; onSave: (plan: MonthlyPlan) => Promise<void> }) {
  const [income, setIncome] = useState(initial.income ? String(initial.income / 100) : '');
  const [fixedCosts, setFixedCosts] = useState(initial.fixedCosts ? String(initial.fixedCosts / 100) : '');
  const [savingsGoal, setSavingsGoal] = useState(initial.savingsGoal ? String(initial.savingsGoal / 100) : '');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = [income, fixedCosts, savingsGoal].map((value) => value.trim() ? rublesToKopecks(value, true) : 0);
    if (values.some((value) => value === null)) { setFormError('Проверьте введённые суммы.'); return; }
    if (values[1]! + values[2]! > values[0]!) { setFormError('Обязательные расходы и накопления не могут быть больше дохода.'); return; }
    setSaving(true);
    try { await onSave({ month, income: values[0]!, fixedCosts: values[1]!, savingsGoal: values[2]! }); }
    catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Не удалось сохранить план.'); }
    finally { setSaving(false); }
  }

  return <DialogFrame title="План на месяц" subtitle={`Распределите доходы на ${formatMonth(month)}.`} onClose={onClose}>
    <form className="dialog-form" onSubmit={submit}>
      <label className="field-label">Доходы за месяц, ₽<input inputMode="decimal" placeholder="Например, 85 000" value={income} onChange={(event) => setIncome(event.target.value)} required /></label>
      <label className="field-label">Обязательные расходы, ₽<input inputMode="decimal" placeholder="Аренда, счета, кредиты" value={fixedCosts} onChange={(event) => setFixedCosts(event.target.value)} /></label>
      <label className="field-label">Цель накоплений, ₽<input inputMode="decimal" placeholder="Сколько хотите отложить" value={savingsGoal} onChange={(event) => setSavingsGoal(event.target.value)} /></label>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <button className="primary-button full-button" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить план'} <Check size={16} /></button>
    </form>
  </DialogFrame>;
}

function BackupDialog({ error, message, onClose, onSubmit }: { error: string; message: string; onClose: () => void; onSubmit: (form: FormData) => Promise<void> }) {
  const [mode, setMode] = useState<'export' | 'import'>('export');
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
