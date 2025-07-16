
import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart } from 'recharts';
import { Transaction, TransactionType, Allocation, AllocationCategory, Settings, Language, Theme, View, DateFilter, FilterType, RecurringTransaction, Receivable, ReceivableStatus, Reminder } from './types';
import { translations, allocationCategoryLabels, sampleTransactions, sampleAllocations } from './constants';
import { getFinancialInsights } from './services/geminiService';

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number, lang: Language) => {
  return new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { style: 'currency', currency: lang === 'pt' ? 'BRL' : 'USD' }).format(value);
};

const formatDate = (dateString: string, lang: Language) => {
  const date = new Date(dateString + 'T00:00:00'); // Ensure date is parsed as local
  return new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const formatMonthYear = (dateString: string, lang: Language) => {
    const [year, month] = dateString.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' }).format(date);
};

const exportToCSV = (data: Transaction[], t: (key: any) => string) => {
    const headers = [t('date'), t('description'), t('type'), t('amount')];
    const rows = data.map(tx => [tx.date, `"${tx.description}"`, tx.type, tx.amount].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- ICONS ---
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
const TransactionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>;
const AllocationsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0115 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 5.625l-1.096-1.096M6.343 18.657l-1.096-1.096m12.728 0l1.096-1.096M6.343 5.343l-1.096 1.096m12.728 0l1.096 1.096M12 4.5v-1.5m0 15v-1.5" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>;
const RecurringIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-11.664 0l4.992-4.993m-4.993 0l3.181-3.183a8.25 8.25 0 0111.664 0l3.181 3.183" /></svg>;
const ReceivablesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414-.336.75-.75.75h-.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V15.75m0 0v-1.125a.75.75 0 00-.75-.75H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h.75m9-9.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5a.75.75 0 01.75-.75M4.5 15.75v-.75a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v.75a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75" /></svg>;
const RemindersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;


// --- CONTEXT ---
interface AppContextType {
    t: (key: keyof typeof translations.en) => string;
    lang: Language;
    setLang: (lang: Language) => void;
    theme: Theme;
    toggleTheme: () => void;
    transactions: Transaction[];
    allocations: Allocation[];
    recurringTransactions: RecurringTransaction[];
    receivables: Receivable[];
    reminders: Reminder[];
    filteredTransactions: Transaction[];
    filteredAllocations: Allocation[];
    settings: Settings;
    filter: DateFilter;
    setFilter: (filter: DateFilter) => void;
    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    updateTransaction: (transaction: Transaction) => void;
    deleteTransaction: (id: string) => void;
    addAllocation: (allocation: Omit<Allocation, 'id'>) => void;
    updateAllocation: (allocation: Allocation) => void;
    deleteAllocation: (id: string) => void;
    addRecurringTransaction: (transaction: Omit<RecurringTransaction, 'id' | 'lastProcessedDate'>) => void;
    updateRecurringTransaction: (transaction: RecurringTransaction) => void;
    deleteRecurringTransaction: (id: string) => void;
    addReceivable: (receivable: Omit<Receivable, 'id'>) => void;
    updateReceivable: (receivable: Receivable) => void;
    deleteReceivable: (id: string) => void;
    markReceivableAsPaid: (receivable: Receivable) => void;
    addReminder: (reminder: Omit<Reminder, 'id' | 'paidMonths'>) => void;
    updateReminder: (reminder: Reminder) => void;
    deleteReminder: (id: string) => void;
    markReminderAsPaid: (id: string, paymentDate: Date) => void;
    updateSettings: (newSettings: Partial<Settings>) => void;
    loadSampleData: () => void;
    financials: {
        totalIncome: number;
        totalExpenses: number;
        totalBalance: number;
        totalAllocated: number;
        unallocated: number;
        savingsRate: number;
        allocationsByType: Record<AllocationCategory, number>;
    };
    investmentFinancials: {
        totalContributions: number;
        currentValue: number;
        growth: number;
        portfolioBreakdown: { name: string, value: number }[];
    };
    projectionData: any[];
}

const AppContext = createContext<AppContextType | null>(null);
const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within an AppProvider");
    return context;
};

// --- HOOK for LocalStorage ---
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
};

// --- AppProvider Component ---
const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [allocations, setAllocations] = useLocalStorage<Allocation[]>('allocations', []);
    const [recurringTransactions, setRecurringTransactions] = useLocalStorage<RecurringTransaction[]>('recurringTransactions', []);
    const [receivables, setReceivables] = useLocalStorage<Receivable[]>('receivables', []);
    const [reminders, setReminders] = useLocalStorage<Reminder[]>('reminders', []);
    const [settings, setSettings] = useLocalStorage<Settings>('settings', {
        language: 'pt',
        theme: 'dark',
        emergencyFundGoal: 10000,
    });
    const [filter, setFilter] = useLocalStorage<DateFilter>('finanzen-filter', { type: 'all', value: null });

    const t = useCallback((key: keyof typeof translations.en) => {
        return translations[settings.language][key] || translations.en[key];
    }, [settings.language]);

    const sortDateFn = (a: {date: string}, b: {date: string}) => new Date(b.date).getTime() - new Date(a.date).getTime();

    useEffect(() => {
        const processRecurringTransactions = () => {
            const today = new Date();
            today.setHours(0,0,0,0);
            const newTransactions: Transaction[] = [];
            const updatedRecurringTxs = JSON.parse(JSON.stringify(recurringTransactions));

            updatedRecurringTxs.forEach((recTx: RecurringTransaction) => {
                const startDate = new Date(recTx.startDate + 'T00:00:00');
                if (startDate > today) return;

                const endDate = recTx.endDate ? new Date(recTx.endDate + 'T00:00:00') : null;
                const lastProcessed = recTx.lastProcessedDate ? new Date(recTx.lastProcessedDate + 'T00:00:00') : null;

                let nextProcessingDate = new Date(startDate);
                if (lastProcessed) {
                    nextProcessingDate = new Date(lastProcessed);
                    nextProcessingDate.setMonth(nextProcessingDate.getMonth() + 1);
                    nextProcessingDate.setDate(startDate.getDate());
                }

                while (nextProcessingDate <= today) {
                    if (endDate && nextProcessingDate > endDate) break;

                    const transactionDateStr = nextProcessingDate.toISOString().split('T')[0];
                    newTransactions.push({
                        id: `rec-${recTx.id}-${transactionDateStr}`,
                        date: transactionDateStr,
                        description: recTx.description,
                        amount: recTx.amount,
                        type: recTx.type,
                    });
                    recTx.lastProcessedDate = transactionDateStr;

                    nextProcessingDate.setMonth(nextProcessingDate.getMonth() + 1);
                }
            });

            if (newTransactions.length > 0) {
                const existingTxIds = new Set(transactions.map(tx => tx.id));
                const uniqueNewTxs = newTransactions.filter(tx => !existingTxIds.has(tx.id));

                if(uniqueNewTxs.length > 0) {
                    setTransactions(prev => [...prev, ...uniqueNewTxs].sort(sortDateFn));
                    setRecurringTransactions(updatedRecurringTxs);
                }
            }
        };

        processRecurringTransactions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    useEffect(() => {
        document.documentElement.lang = settings.language;
        if (settings.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [settings.theme, settings.language]);

    const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
        const newTransaction = { ...transaction, id: new Date().toISOString() + Math.random() };
        setTransactions(prev => [...prev, newTransaction].sort(sortDateFn));
    };
    const updateTransaction = (updatedTx: Transaction) => setTransactions(prev => prev.map(tx => tx.id === updatedTx.id ? updatedTx : tx).sort(sortDateFn));
    const deleteTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));
    
    const addAllocation = (allocation: Omit<Allocation, 'id'>) => {
        const newAllocation = { ...allocation, id: new Date().toISOString() + Math.random() };
        setAllocations(prev => [...prev, newAllocation].sort(sortDateFn));
    };
    const updateAllocation = (updatedAlloc: Allocation) => setAllocations(prev => prev.map(alloc => alloc.id === updatedAlloc.id ? updatedAlloc : alloc).sort(sortDateFn));
    const deleteAllocation = (id: string) => setAllocations(prev => prev.filter(a => a.id !== id));
    
    const addRecurringTransaction = (recTx: Omit<RecurringTransaction, 'id' | 'lastProcessedDate'>) => setRecurringTransactions(prev => [...prev, { ...recTx, id: new Date().toISOString() + Math.random() }]);
    const updateRecurringTransaction = (updatedRecTx: RecurringTransaction) => setRecurringTransactions(prev => prev.map(recTx => recTx.id === updatedRecTx.id ? updatedRecTx : recTx));
    const deleteRecurringTransaction = (id: string) => setRecurringTransactions(prev => prev.filter(recTx => recTx.id !== id));

    const sortDueDateFn = (a: {dueDate: string}, b: {dueDate: string}) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();

    const addReceivable = (rec: Omit<Receivable, 'id'>) => setReceivables(prev => [...prev, { ...rec, id: new Date().toISOString() + Math.random() }].sort(sortDueDateFn));
    const updateReceivable = (updatedRec: Receivable) => setReceivables(prev => prev.map(rec => rec.id === updatedRec.id ? updatedRec : rec).sort(sortDueDateFn));
    const deleteReceivable = (id: string) => setReceivables(prev => prev.filter(rec => rec.id !== id));
    const markReceivableAsPaid = (receivable: Receivable) => {
        updateReceivable({ ...receivable, status: ReceivableStatus.PAID });
        addTransaction({
            date: new Date().toISOString().split('T')[0],
            description: `${t('paid')}: ${receivable.clientName} - ${receivable.description}`,
            amount: receivable.amount,
            type: TransactionType.INCOME
        });
    };

    const addReminder = (rem: Omit<Reminder, 'id' | 'paidMonths'>) => setReminders(prev => [...prev, {...rem, id: new Date().toISOString() + Math.random(), paidMonths: []}].sort((a,b) => a.dueDay - b.dueDay));
    const updateReminder = (updatedRem: Reminder) => setReminders(prev => prev.map(r => r.id === updatedRem.id ? updatedRem : r).sort((a,b) => a.dueDay - b.dueDay));
    const deleteReminder = (id: string) => setReminders(prev => prev.filter(r => r.id !== id));
    
    const markReminderAsPaid = (id: string, paymentDate: Date) => {
        const reminder = reminders.find(r => r.id === id);
        if (!reminder) return;
        
        const monthStr = paymentDate.toISOString().slice(0, 7);
        
        if (!reminder.paidMonths.includes(monthStr)) {
            const updatedReminder = { ...reminder, paidMonths: [...reminder.paidMonths, monthStr] };
            updateReminder(updatedReminder);
            
            const transactionDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), reminder.dueDay);

            addTransaction({
                date: transactionDate.toISOString().split('T')[0],
                description: `${t('reminders')}: ${reminder.description}`,
                amount: reminder.amount,
                type: TransactionType.EXPENSE,
            });
        }
    };


    const updateSettings = (newSettings: Partial<Settings>) => setSettings(prev => ({ ...prev, ...newSettings }));
    const setLang = (lang: Language) => updateSettings({ language: lang });
    const toggleTheme = () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });

    const loadSampleData = () => {
        setTransactions(sampleTransactions);
        setAllocations(sampleAllocations);
        setRecurringTransactions([]);
        setReceivables([]);
        setReminders([]);
        setFilter({ type: 'all', value: null });
    };
    
    const filteredTransactions = useMemo(() => {
        if (filter.type === 'all' || !filter.value) return transactions;
        return transactions.filter(tx => tx.date.startsWith(filter.value!));
    }, [transactions, filter]);

    const filteredAllocations = useMemo(() => {
        if (filter.type === 'all' || !filter.value) return allocations;
        return allocations.filter(a => a.date.startsWith(filter.value!));
    }, [allocations, filter]);

    const financials = useMemo(() => {
        const sourceTxs = filter.type === 'all' ? transactions : filteredTransactions;
        const sourceAllocs = filter.type === 'all' ? allocations : filteredAllocations;
        
        const totalIncome = sourceTxs.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = sourceTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
        const totalBalance = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (totalBalance / totalIncome) * 100 : 0;

        const allocationsByType = sourceAllocs.reduce((acc, alloc) => {
            acc[alloc.category] = (acc[alloc.category] || 0) + alloc.amount;
            return acc;
        }, {} as Record<AllocationCategory, number>);

        const totalAllocated = Object.values(allocationsByType).reduce((sum, amount) => sum + amount, 0);
        const unallocated = totalBalance > 0 ? totalBalance - totalAllocated : 0;

        return { totalIncome, totalExpenses, totalBalance, totalAllocated, unallocated, savingsRate, allocationsByType };
    }, [filteredTransactions, filteredAllocations, transactions, allocations, filter.type]);

    const investmentFinancials = useMemo(() => {
        const investmentAllocations = allocations.filter(a => a.category === AllocationCategory.INVESTMENTS);

        let totalContributions = 0;
        let currentValue = 0;
        const breakdown: Record<string, number> = {};

        investmentAllocations.forEach(alloc => {
            totalContributions += alloc.amount;
            const rate = alloc.interestRate || 0;
            const monthlyRate = Math.pow(1 + rate / 100, 1 / 12) - 1;
            const startDate = new Date(alloc.date + 'T00:00:00');
            const today = new Date();
            let months = (today.getFullYear() - startDate.getFullYear()) * 12 - startDate.getMonth() + today.getMonth();
            months = Math.max(0, months);
            
            const finalValue = alloc.amount * Math.pow(1 + monthlyRate, months);
            currentValue += finalValue;
            
            const typeKey = alloc.investmentType || t('unclassified');
            breakdown[typeKey] = (breakdown[typeKey] || 0) + finalValue;
        });
        
        const growth = currentValue - totalContributions;
        const portfolioBreakdown = Object.entries(breakdown).map(([name, value]) => ({ name, value }));

        return {
            totalContributions,
            currentValue: Math.max(totalContributions, currentValue),
            growth: Math.max(0, growth),
            portfolioBreakdown
        };
    }, [allocations, t]);

    const projectionData = useMemo(() => {
        const { currentValue: currentInvestmentValue, totalContributions } = investmentFinancials;
    
        let totalRate = 0;
        let totalAmountForRate = 0;
        allocations.filter(a => a.category === AllocationCategory.INVESTMENTS && a.interestRate).forEach(a => {
            totalRate += a.amount * a.interestRate!;
            totalAmountForRate += a.amount;
        });
        const averageAnnualRate = totalAmountForRate > 0 ? totalRate / totalAmountForRate : 0;
        const monthlyRate = Math.pow(1 + averageAnnualRate / 100, 1 / 12) - 1;

        const data = [];
        let runningInvestments = currentInvestmentValue;
        let runningContributions = totalContributions;
        const now = new Date();

        for (let i = 1; i <= 60; i++) {
            const futureDate = new Date(now);
            futureDate.setMonth(now.getMonth() + i);
            futureDate.setDate(1);

            runningInvestments *= (1 + monthlyRate);

            const monthlyRecurringNet = recurringTransactions.reduce((acc, recTx) => {
                const recStartDate = new Date(recTx.startDate + "T00:00:00");
                const recEndDate = recTx.endDate ? new Date(recTx.endDate + "T00:00:00") : null;
                
                const startOfMonth = new Date(futureDate.getFullYear(), futureDate.getMonth(), 1);
                const endOfMonth = new Date(futureDate.getFullYear(), futureDate.getMonth() + 1, 0);

                if (recStartDate.getDate() >= startOfMonth.getDate() && recStartDate.getMonth() === startOfMonth.getMonth() && recStartDate.getFullYear() === startOfMonth.getFullYear()
                    && recStartDate <= endOfMonth && (!recEndDate || recEndDate >= startOfMonth)) {
                     return acc + (recTx.type === TransactionType.INCOME ? recTx.amount : -recTx.amount);
                }
                return acc;
            }, 0);
            
            runningInvestments += monthlyRecurringNet;
            if (monthlyRecurringNet > 0) {
                runningContributions += monthlyRecurringNet;
            }

            data.push({
                date: futureDate.toISOString().substring(0, 7),
                value: Math.max(0, runningInvestments),
                contributions: Math.max(0, runningContributions),
            });
        }
        return data;
    }, [recurringTransactions, investmentFinancials, allocations]);

    const value = { t, lang: settings.language, setLang, theme: settings.theme, toggleTheme, transactions, allocations, recurringTransactions, receivables, reminders, filteredTransactions, filteredAllocations, settings, filter, setFilter, addTransaction, updateTransaction, deleteTransaction, addAllocation, updateAllocation, deleteAllocation, addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction, addReceivable, updateReceivable, deleteReceivable, markReceivableAsPaid, addReminder, updateReminder, deleteReminder, markReminderAsPaid, updateSettings, loadSampleData, financials, investmentFinancials, projectionData };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// --- UI Components ---

const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-surface dark:bg-surface rounded-xl shadow-md p-4 sm:p-6 ${className}`}>
        {children}
    </div>
);

const Button: React.FC<{ onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode; className?: string, type?: 'button' | 'submit' | 'reset', disabled?: boolean}> = ({ onClick, children, className = '', type='button', disabled = false }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background dark:focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
        {children}
    </button>
);

const Modal: React.FC<{isOpen: boolean; onClose: ()=>void; title: string; children: React.ReactNode}> = ({isOpen, onClose, title, children}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="bg-surface dark:bg-surface rounded-xl shadow-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-on-surface/10">
                    <h2 id="modal-title" className="text-xl font-bold text-on-surface">{title}</h2>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Sidebar: React.FC<{ view: View, setView: (view: View) => void }> = ({ view, setView }) => {
    const { t } = useAppContext();
    const NavItem: React.FC<{
        targetView: View;
        icon: React.ReactNode;
        label: string;
    }> = ({ targetView, icon, label }) => (
        <button
            onClick={() => setView(targetView)}
            className={`w-full flex items-center p-3 rounded-lg transition-colors ${view === targetView ? 'bg-primary/20 text-primary-light' : 'hover:bg-primary/10 text-on-surface'}`}
        >
            {icon}
            <span className="ml-4 font-semibold">{label}</span>
        </button>
    );

    return (
        <aside className="w-64 bg-surface dark:bg-surface flex-shrink-0 p-4 flex flex-col">
            <h1 className="text-2xl font-bold text-on-surface dark:text-on-surface text-center mb-8">{t('appName')}</h1>
            <nav className="flex flex-col space-y-2">
                <NavItem targetView="dashboard" icon={<DashboardIcon />} label={t('dashboard')} />
                <NavItem targetView="transactions" icon={<TransactionsIcon />} label={t('transactions')} />
                <NavItem targetView="allocations" icon={<AllocationsIcon />} label={t('allocations')} />
                <NavItem targetView="recurring" icon={<RecurringIcon />} label={t('recurring')} />
                <NavItem targetView="receivables" icon={<ReceivablesIcon />} label={t('receivables')} />
                <NavItem targetView="reminders" icon={<RemindersIcon />} label={t('reminders')} />
                <NavItem targetView="settings" icon={<SettingsIcon />} label={t('settings')} />
            </nav>
        </aside>
    );
};

const Header: React.FC<{ view: View, setView: (view: View) => void }> = ({ view, setView }) => {
    const { t, theme, toggleTheme, lang, setLang } = useAppContext();
    const viewTitles: Record<View, string> = {
        dashboard: t('dashboard'),
        transactions: t('transactions'),
        allocations: t('allocations'),
        recurring: t('recurring'),
        receivables: t('receivables'),
        reminders: t('reminders'),
        settings: t('settings'),
    }
    
    return (
        <header className="flex justify-between items-center p-4">
             <h2 className="text-2xl font-bold text-on-surface">{viewTitles[view]}</h2>
             <div className="flex items-center space-x-4">
                <button onClick={toggleTheme} className="text-on-surface/80 hover:text-on-surface">
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
                <select value={lang} onChange={(e) => setLang(e.target.value as Language)} className="bg-surface dark:bg-surface text-on-surface rounded-md p-1 border-none focus:ring-2 focus:ring-primary">
                    <option value="pt">🇧🇷 PT</option>
                    <option value="en">🇺🇸 EN</option>
                </select>
            </div>
        </header>
    );
}

const MetricCard: React.FC<{ title: string; value: string; subtext?: string, colorClass?: string }> = ({ title, value, subtext, colorClass = 'text-primary-light' }) => (
    <Card>
        <h3 className="text-sm font-medium text-on-surface/70">{title}</h3>
        <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
        {subtext && <p className="text-xs text-on-surface/60 mt-1">{subtext}</p>}
    </Card>
);

const BalanceHistoryChart: React.FC<{transactions: Transaction[]}> = ({transactions}) => {
    const { t, lang } = useAppContext();

    const data = useMemo(() => {
        if (transactions.length === 0) return [];
        const sorted = [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let cumulativeBalance = 0;
        const dailyBalances: {[key: string]: number} = {};
        
        for(const tx of sorted) {
            cumulativeBalance += tx.type === TransactionType.INCOME ? tx.amount : -tx.amount;
            dailyBalances[tx.date] = cumulativeBalance;
        }

        if (sorted.length < 2) return Object.entries(dailyBalances).map(([date, balance]) => ({ date, balance }));

        const startDate = new Date(sorted[0].date + 'T00:00:00');
        const endDate = new Date(sorted[sorted.length-1].date + 'T00:00:00');
        let lastBalance = 0;
        const filledBalances : {[key: string]: number} = {};

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0];
            if (dailyBalances[dateKey] !== undefined) {
                lastBalance = dailyBalances[dateKey];
            }
            filledBalances[dateKey] = lastBalance;
        }
        
        return Object.entries(filledBalances)
            .map(([date, balance]) => ({ date, balance }))
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    }, [transactions]);

    if (data.length < 2) return null;

    return (
        <Card>
             <h3 className="text-lg font-semibold text-on-surface mb-4">{t('totalBalance')}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="date" tickFormatter={(str) => formatDate(str, lang)} stroke="hsl(220, 10%, 85%)"/>
                    <YAxis tickFormatter={(val) => formatCurrency(val, lang)} stroke="hsl(220, 10%, 85%)" width={80} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 15%, 20%)', border: 'none' }} labelStyle={{color: 'white'}} formatter={(value: number) => [formatCurrency(value, lang), t('totalBalance')]} />
                    <Legend />
                    <Line type="monotone" dataKey="balance" name={t('totalBalance')} stroke="hsl(210, 40%, 50%)" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </Card>
    );
};

const SavingsAllocationChart: React.FC<{}> = () => {
    const { t, lang, financials } = useAppContext();
    const COLORS = {
        [AllocationCategory.INVESTMENTS]: '#3498db',
        [AllocationCategory.EMERGENCY_FUND]: '#2ecc71',
        [AllocationCategory.GOALS]: '#9b59b6',
        'unallocated': '#f1c40f'
    };
    
    const data = useMemo(() => {
        const chartData = Object.entries(financials.allocationsByType).map(([key, value]) => ({
            name: allocationCategoryLabels[lang][key as AllocationCategory],
            value: value,
            color: COLORS[key as AllocationCategory]
        }));

        if(financials.unallocated > 0) {
            chartData.push({name: t('unallocated'), value: financials.unallocated, color: COLORS.unallocated });
        }
        return chartData.filter(d => d.value > 0);
    }, [financials, lang, t]);

    if(data.length === 0) return null;

    return (
        <Card>
            <h3 className="text-lg font-semibold text-on-surface mb-4">{t('savingsAllocation')}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name"
                         label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                            const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                            return (percent > 0.05) ? <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
                                {`${(percent * 100).toFixed(0)}%`}
                            </text> : null;
                        }}>
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 15%, 20%)', border: 'none' }} formatter={(value: number, name) => [formatCurrency(value, lang), name]}/>
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </Card>
    )
}

const ProjectionChart: React.FC = () => {
    const { t, lang, projectionData } = useAppContext();

    if (!projectionData || projectionData.length === 0) {
        return <Card><p className="text-on-surface/70 text-center">{t('noRecurringTransactions')}</p></Card>
    }

    const chartData = projectionData.map(d => ({
        ...d,
        growth: d.value - d.contributions
    }));

    return (
        <Card>
            <h3 className="text-lg font-semibold text-on-surface mb-2">{t('projectedNetWorth')}</h3>
            <p className="text-on-surface/80 mb-4">{t('next5Years')}</p>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="date" tickFormatter={(str) => formatMonthYear(str, lang)} />
                    <YAxis tickFormatter={(val) => formatCurrency(val, lang)} width={80} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(220, 15%, 20%)', border: 'none' }} 
                        formatter={(value: number, name: string) => [formatCurrency(value, lang), t(name as any)]}
                        labelFormatter={(label) => formatMonthYear(label, lang)}
                    />
                    <Legend formatter={(value) => t(value as any)} />
                    <Area type="monotone" dataKey="contributions" name="contributions" stackId="1" stroke="#3498db" fill="#3498db" />
                    <Area type="monotone" dataKey="growth" name="growth" stackId="1" stroke="#2ecc71" fill="#2ecc71" />
                </AreaChart>
            </ResponsiveContainer>
        </Card>
    )
}


const AIInsights: React.FC = () => {
    const { t, financials, lang, filteredTransactions } = useAppContext();
    const [insights, setInsights] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGetInsights = async () => {
        setIsLoading(true);
        setError("");
        setInsights("");
        try {
            const summary = {
                totalIncome: financials.totalIncome,
                totalExpenses: financials.totalExpenses,
                savingsRate: financials.savingsRate,
                language: lang,
            };
            const result = await getFinancialInsights(summary);
            setInsights(result);
        } catch (e) {
            setError(t('insightsError'));
        } finally {
            setIsLoading(false);
        }
    };
    
    if (filteredTransactions.length === 0) return null;
    if (process.env.API_KEY === undefined) return null;

    return (
        <Card className="flex flex-col">
            <h3 className="text-lg font-semibold text-on-surface mb-4">{t('yourFinancialInsights')}</h3>
            <div className="flex-grow min-h-[50px]">
            {isLoading && <p className="text-on-surface/70 animate-pulse">{t('generatingInsights')}</p>}
            {error && <p className="text-danger">{error}</p>}
            {insights && <div className="prose prose-invert text-on-surface/90" dangerouslySetInnerHTML={{__html: insights.replace(/\n/g, '<br />')}}></div>}
            </div>
            <Button onClick={handleGetInsights} disabled={isLoading} className="mt-4 bg-primary text-white hover:bg-primary-dark self-start">
                {isLoading ? t('generatingInsights') : t('getFinancialInsights')}
            </Button>
        </Card>
    )
}

const EmptyState: React.FC = () => {
    const { t, loadSampleData } = useAppContext();
    const [showForm, setShowForm] = useState(false);

    return (
        <>
            {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
            <div className="flex items-center justify-center h-full">
                 <Card className="text-center flex flex-col items-center justify-center">
                    <h2 className="text-2xl font-bold text-on-surface">{t('welcomeToFinanZen')}</h2>
                    <p className="mt-2 text-on-surface/70 max-w-md">{t('startYourJourney')}</p>
                    <div className="mt-6 flex space-x-4">
                        <Button onClick={() => setShowForm(true)} className="bg-primary text-white hover:bg-primary-dark">{t('addTransaction')}</Button>
                        <Button onClick={loadSampleData} className="bg-on-surface/20 text-on-surface hover:bg-on-surface/30">{t('loadSampleData')}</Button>
                    </div>
                </Card>
            </div>
        </>
    );
};

const DashboardFilter: React.FC = () => {
    const { t, filter, setFilter, transactions } = useAppContext();

    const availableYears = useMemo(() => {
        const years = new Set(transactions.map(tx => tx.date.substring(0, 4)));
        return Array.from(years).sort((a,b) => b.localeCompare(a));
    }, [transactions]);
    
    const handleTypeChange = (type: FilterType) => {
        let value: string | null = null;
        if (type === 'year') value = new Date().getFullYear().toString();
        if (type === 'month') value = new Date().toISOString().substring(0, 7);
        if (type === 'day') value = new Date().toISOString().substring(0, 10);
        setFilter({ type, value });
    };

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilter({ ...filter, value: e.target.value });
    };

    const FilterButton: React.FC<{type: FilterType, label: string}> = ({ type, label }) => (
        <Button
            onClick={() => handleTypeChange(type)}
            className={filter.type === type ? 'bg-primary text-white' : 'bg-on-surface/20 text-on-surface hover:bg-on-surface/30'}
        >{label}</Button>
    );

    return (
        <Card className="mb-6">
            <div className="flex flex-wrap items-center gap-4">
                <span className="font-semibold text-on-surface/80">{t('filterBy')}:</span>
                <div className="flex items-center gap-2">
                    <FilterButton type="all" label={t('allTime')} />
                    <FilterButton type="year" label={t('year')} />
                    <FilterButton type="month" label={t('month')} />
                    <FilterButton type="day" label={t('day')} />
                </div>
                <div className="flex-grow">
                    {filter.type === 'year' && (
                         <select value={filter.value || ''} onChange={handleValueChange} className="bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary">
                             {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                         </select>
                    )}
                    {filter.type === 'month' && <input type="month" value={filter.value || ''} onChange={handleValueChange} className="bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />}
                    {filter.type === 'day' && <input type="date" value={filter.value || ''} onChange={handleValueChange} className="bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />}
                </div>
                {filter.type !== 'all' && <Button onClick={() => setFilter({type: 'all', value: null})} className="text-primary hover:bg-primary/10">{t('clearFilter')}</Button>}
            </div>
        </Card>
    );
};


const DashboardView: React.FC = () => {
    const { t, lang, financials, transactions, filteredTransactions } = useAppContext();

    if (transactions.length === 0) {
        return <EmptyState />;
    }

    return (
        <div>
            <DashboardFilter />
            {filteredTransactions.length === 0 && (
                <Card><p className="text-center text-on-surface/70">{t('noDataForPeriod')}</p></Card>
            )}
            {filteredTransactions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard title={t('totalBalance')} value={formatCurrency(financials.totalBalance, lang)} colorClass="text-sky-400" />
                    <MetricCard title={t('totalIncome')} value={formatCurrency(financials.totalIncome, lang)} colorClass="text-success" />
                    <MetricCard title={t('totalExpenses')} value={formatCurrency(financials.totalExpenses, lang)} colorClass="text-danger" />
                    <MetricCard title={t('savingsRate')} value={`${financials.savingsRate.toFixed(1)}%`} colorClass="text-teal-400" />
                    
                    <div className="md:col-span-2 lg:col-span-4">
                        <ProjectionChart />
                    </div>

                    <div className="md:col-span-2 lg:col-span-2">
                        <SavingsAllocationChart />
                    </div>
                    <div className="md:col-span-2 lg:col-span-2">
                         <AIInsights />
                    </div>
                </div>
            )}
        </div>
    );
};

const TransactionForm: React.FC<{onClose: ()=>void, transactionToEdit?: Transaction | null}> = ({onClose, transactionToEdit}) => {
    const { t, addTransaction, updateTransaction } = useAppContext();
    const [type, setType] = useState<TransactionType>(TransactionType.INCOME);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if(transactionToEdit) {
            setType(transactionToEdit.type);
            setDescription(transactionToEdit.description);
            setAmount(String(transactionToEdit.amount));
            setDate(transactionToEdit.date);
        }
    }, [transactionToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!description || !amount || !date) return;
        
        const transactionData = {
            type,
            description,
            amount: parseFloat(amount),
            date
        };

        if(transactionToEdit) {
            updateTransaction({ ...transactionData, id: transactionToEdit.id });
        } else {
            addTransaction(transactionData);
        }
        onClose();
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={transactionToEdit ? t('editTransaction') : t('addTransaction')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('type')}</label>
                    <select value={type} onChange={e => setType(e.target.value as TransactionType)} className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary">
                        <option value={TransactionType.INCOME}>{t('income')}</option>
                        <option value={TransactionType.EXPENSE}>{t('expense')}</option>
                    </select>
                </div>
                    <div>
                    <label htmlFor="description" className="block text-sm font-medium text-on-surface/80">{t('description')}</label>
                    <input id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-on-surface/80">{t('amount')}</label>
                    <input id="amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                    <div>
                    <label htmlFor="date" className="block text-sm font-medium text-on-surface/80">{t('date')}</label>
                    <input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                    <Button onClick={onClose} className="bg-on-surface/20 text-on-surface hover:bg-on-surface/30">{t('cancel')}</Button>
                    <Button type="submit" className="bg-primary text-white hover:bg-primary-dark">{t('save')}</Button>
                </div>
            </form>
        </Modal>
    )
}

const TransactionsView: React.FC = () => {
    const { t, lang, transactions, deleteTransaction } = useAppContext();
    const [showForm, setShowForm] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
    
    const handleEdit = (tx: Transaction) => {
        setTransactionToEdit(tx);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setTransactionToEdit(null);
    };

    const confirmDelete = () => {
        if (transactionToDelete) {
            deleteTransaction(transactionToDelete.id);
            setTransactionToDelete(null);
        }
    };

    return (
        <div>
            {showForm && <TransactionForm onClose={handleCloseForm} transactionToEdit={transactionToEdit} />}
            <Modal isOpen={!!transactionToDelete} onClose={() => setTransactionToDelete(null)} title={t('deleteConfirmation')}>
                <p className="text-on-surface/80">{t('areYouSureDelete')}</p>
                <div className="flex justify-end space-x-4 pt-6">
                    <Button onClick={() => setTransactionToDelete(null)} className="bg-on-surface/20 text-on-surface hover:bg-on-surface/30">{t('cancel')}</Button>
                    <Button onClick={confirmDelete} className="bg-danger text-white hover:bg-danger-dark">{t('delete')}</Button>
                </div>
            </Modal>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-on-surface">{t('allTransactions')}</h2>
                <div className="flex space-x-2">
                    <Button onClick={() => exportToCSV(transactions, t)} className="bg-on-surface/20 text-on-surface hover:bg-on-surface/30">{t('exportToCSV')}</Button>
                    <Button onClick={() => setShowForm(true)} className="bg-primary text-white hover:bg-primary-dark">{t('addTransaction')}</Button>
                </div>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-on-surface/20">
                            <tr>
                                <th className="p-4 text-on-surface/80">{t('date')}</th>
                                <th className="p-4 text-on-surface/80">{t('description')}</th>
                                <th className="p-4 text-on-surface/80">{t('type')}</th>
                                <th className="p-4 text-on-surface/80 text-right">{t('amount')}</th>
                                <th className="p-4 text-on-surface/80 text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(tx => (
                                <tr key={tx.id} className="border-b border-on-surface/10 hover:bg-on-surface/5">
                                    <td className="p-4 text-on-surface">{formatDate(tx.date, lang)}</td>
                                    <td className="p-4 text-on-surface">{tx.description}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${tx.type === 'income' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                            {tx.type === 'income' ? t('income') : t('expense')}
                                        </span>
                                    </td>
                                    <td className={`p-4 font-mono text-right ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>{formatCurrency(tx.amount, lang)}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center items-center space-x-2">
                                            <button onClick={() => handleEdit(tx)} className="text-on-surface/60 hover:text-primary transition-colors"><EditIcon /></button>
                                            <button onClick={() => setTransactionToDelete(tx)} className="text-on-surface/60 hover:text-danger transition-colors"><DeleteIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {transactions.length === 0 && <p className="text-center p-8 text-on-surface/70">{t('noTransactions')}</p>}
                </div>
            </Card>
        </div>
    );
};

const AllocationForm: React.FC<{onClose: ()=>void, allocationToEdit?: Allocation | null}> = ({onClose, allocationToEdit}) => {
    const { t, lang, addAllocation, updateAllocation, financials } = useAppContext();
    const [category, setCategory] = useState<AllocationCategory>(AllocationCategory.INVESTMENTS);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [interestRate, setInterestRate] = useState('');
    const [investmentType, setInvestmentType] = useState('');

    const availableToAllocate = financials.unallocated + (allocationToEdit ? allocationToEdit.amount : 0);

    useEffect(() => {
        if (allocationToEdit) {
            setCategory(allocationToEdit.category);
            setDescription(allocationToEdit.description || '');
            setAmount(String(allocationToEdit.amount));
            setDate(allocationToEdit.date);
            setInterestRate(String(allocationToEdit.interestRate || ''));
            setInvestmentType(allocationToEdit.investmentType || '');
        }
    }, [allocationToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if(!category || !numAmount || numAmount <= 0 || !date || numAmount > availableToAllocate) return;
        
        const allocationData = {
            category,
            description,
            amount: numAmount,
            date,
            interestRate: category === AllocationCategory.INVESTMENTS ? parseFloat(interestRate) || 0 : undefined,
            investmentType: category === AllocationCategory.INVESTMENTS ? investmentType : undefined,
        };

        if (allocationToEdit) {
            updateAllocation({ ...allocationData, id: allocationToEdit.id });
        } else {
            addAllocation(allocationData);
        }
        onClose();
    }
    
    return (
        <Modal isOpen={true} onClose={onClose} title={allocationToEdit ? t('editAllocation') : t('addAllocation')}>
            <p className="mb-4 text-on-surface/70">{t('availableToAllocate')}: <span className="font-bold text-sky-400">{formatCurrency(availableToAllocate, lang)}</span></p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('category')}</label>
                    <select value={category} onChange={e => setCategory(e.target.value as AllocationCategory)} className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary">
                        {Object.values(AllocationCategory).map(cat => (
                            <option key={cat} value={cat}>{allocationCategoryLabels[lang][cat]}</option>
                        ))}
                    </select>
                </div>
                {category === AllocationCategory.INVESTMENTS && (
                    <>
                        <div>
                            <label htmlFor="investmentType" className="block text-sm font-medium text-on-surface/80">{t('investmentType')}</label>
                            <input id="investmentType" type="text" value={investmentType} onChange={e => setInvestmentType(e.target.value)} placeholder="Ex: Ações, Renda Fixa" className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                        </div>
                         <div>
                            <label htmlFor="interestRate" className="block text-sm font-medium text-on-surface/80">{t('annualRate')}</label>
                            <input id="interestRate" type="number" step="0.1" value={interestRate} onChange={e => setInterestRate(e.target.value)} className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                        </div>
                    </>
                )}
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-on-surface/80">{t('description')}</label>
                    <input id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-on-surface/80">{t('amount')}</label>
                    <input id="amount" type="number" step="0.01" max={availableToAllocate} value={amount} onChange={e => setAmount(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-on-surface/80">{t('date')}</label>
                    <input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                    <Button onClick={onClose} className="bg-on-surface/20 text-on-surface hover:bg-on-surface/30">{t('cancel')}</Button>
                    <Button type="submit" className="bg-primary text-white hover:bg-primary-dark">{t('save')}</Button>
                </div>
            </form>
        </Modal>
    )
}

const PortfolioBreakdownChart: React.FC = () => {
    const { lang, investmentFinancials } = useAppContext();
    const { portfolioBreakdown } = investmentFinancials;

    const COLORS = ['#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c'];

    if (!portfolioBreakdown || portfolioBreakdown.length === 0) {
        return null;
    }

    return (
        <Card>
            <h3 className="text-lg font-semibold text-on-surface mb-4">{translations[lang].portfolioBreakdown}</h3>
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie
                        data={portfolioBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                    >
                        {portfolioBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 15%, 20%)', border: 'none' }} formatter={(value: number) => formatCurrency(value, lang)} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </Card>
    );
};

const AllocationsView: React.FC = () => {
    const { t, lang, allocations, deleteAllocation, financials, settings, investmentFinancials } = useAppContext();
    const [showForm, setShowForm] = useState(false);
    const [allocationToEdit, setAllocationToEdit] = useState<Allocation | null>(null);
    const [allocationToDelete, setAllocationToDelete] = useState<Allocation | null>(null);

    const emergencyFundTotal = financials.allocationsByType[AllocationCategory.EMERGENCY_FUND] || 0;
    const emergencyFundProgress = settings.emergencyFundGoal > 0 ? (emergencyFundTotal / settings.emergencyFundGoal) * 100 : 0;

    const handleEdit = (alloc: Allocation) => {
        setAllocationToEdit(alloc);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setAllocationToEdit(null);
    };

    const confirmDelete = () => {
        if(allocationToDelete) {
            deleteAllocation(allocationToDelete.id);
            setAllocationToDelete(null);
        }
    };

    return (
        <div>
            {showForm && <AllocationForm onClose={handleCloseForm} allocationToEdit={allocationToEdit} />}
             <Modal isOpen={!!allocationToDelete} onClose={() => setAllocationToDelete(null)} title={t('deleteConfirmation')}>
                <p className="text-on-surface/80">{t('areYouSureDelete')}</p>
                <div className="flex justify-end space-x-4 pt-6">
                    <Button onClick={() => setAllocationToDelete(null)} className="bg-on-surface/20 text-on-surface hover:bg-on-surface/30">{t('cancel')}</Button>
                    <Button onClick={confirmDelete} className="bg-danger text-white hover:bg-danger-dark">{t('delete')}</Button>
                </div>
            </Modal>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-on-surface">{t('allocations')}</h2>
                <Button onClick={() => setShowForm(true)} className="bg-primary text-white hover:bg-primary-dark" disabled={financials.unallocated <= 0}>{t('addAllocation')}</Button>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <MetricCard 
                    title={t('investmentsValue')} 
                    value={formatCurrency(investmentFinancials.currentValue, lang)}
                    subtext={`${t('totalGrowth')}: ${formatCurrency(investmentFinancials.growth, lang)}`}
                />
                <MetricCard title={t('goals')} value={formatCurrency(financials.allocationsByType[AllocationCategory.GOALS] || 0, lang)} />
                <Card>
                    <h3 className="text-sm font-medium text-on-surface/70">{t('emergencyFund')}</h3>
                    <p className="text-3xl font-bold mt-1 text-success">{formatCurrency(emergencyFundTotal, lang)}</p>
                    <div className="w-full bg-on-surface/20 rounded-full h-2.5 mt-2">
                        <div className="bg-success h-2.5 rounded-full" style={{ width: `${Math.min(emergencyFundProgress, 100)}%` }}></div>
                    </div>
                    <p className="text-xs text-on-surface/60 mt-1">{emergencyFundProgress.toFixed(1)}% {t('ofGoal')} ({formatCurrency(settings.emergencyFundGoal, lang)})</p>
                </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
                <PortfolioBreakdownChart />
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-on-surface/20">
                            <tr>
                                <th className="p-4 text-on-surface/80">{t('date')}</th>
                                <th className="p-4 text-on-surface/80">{t('category')}</th>
                                <th className="p-4 text-on-surface/80">{t('description')}</th>
                                <th className="p-4 text-on-surface/80">{t('investmentType')}</th>
                                <th className="p-4 text-on-surface/80 text-right">{t('annualRate')}</th>
                                <th className="p-4 text-on-surface/80 text-right">{t('amount')}</th>
                                <th className="p-4 text-on-surface/80 text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allocations.map(alloc => (
                                <tr key={alloc.id} className="border-b border-on-surface/10 hover:bg-on-surface/5">
                                    <td className="p-4 text-on-surface">{formatDate(alloc.date, lang)}</td>
                                    <td className="p-4 text-on-surface">{allocationCategoryLabels[lang][alloc.category]}</td>
                                    <td className="p-4 text-on-surface/80">{alloc.description}</td>
                                    <td className="p-4 text-on-surface/80">{alloc.investmentType || '-'}</td>
                                    <td className="p-4 font-mono text-right text-teal-400">{alloc.interestRate ? `${alloc.interestRate}%` : '-'}</td>
                                    <td className="p-4 font-mono text-right text-sky-400">{formatCurrency(alloc.amount, lang)}</td>
                                    <td className="p-4 text-center">
                                         <div className="flex justify-center items-center space-x-2">
                                            <button onClick={() => handleEdit(alloc)} className="text-on-surface/60 hover:text-primary transition-colors"><EditIcon /></button>
                                            <button onClick={() => setAllocationToDelete(alloc)} className="text-on-surface/60 hover:text-danger transition-colors"><DeleteIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {allocations.length === 0 && <p className="text-center p-8 text-on-surface/70">{t('noAllocations')}</p>}
                </div>
            </Card>
        </div>
    );
};

const RecurringForm: React.FC<{onClose: ()=>void, recTxToEdit?: RecurringTransaction | null}> = ({onClose, recTxToEdit}) => {
    const { t, addRecurringTransaction, updateRecurringTransaction } = useAppContext();
    const [type, setType] = useState<TransactionType>(TransactionType.INCOME);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (recTxToEdit) {
            setType(recTxToEdit.type);
            setDescription(recTxToEdit.description);
            setAmount(String(recTxToEdit.amount));
            setStartDate(recTxToEdit.startDate);
            setEndDate(recTxToEdit.endDate || '');
        }
    }, [recTxToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !startDate) return;
        const recurringData = { type, description, amount: parseFloat(amount), startDate, endDate: endDate || undefined };
        if (recTxToEdit) {
            updateRecurringTransaction({ ...recurringData, id: recTxToEdit.id, lastProcessedDate: recTxToEdit.lastProcessedDate });
        } else {
            addRecurringTransaction(recurringData);
        }
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={recTxToEdit ? t('editRecurring') : t('addRecurring')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('type')}</label>
                    <select value={type} onChange={e => setType(e.target.value as TransactionType)} className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary">
                        <option value={TransactionType.INCOME}>{t('income')}</option>
                        <option value={TransactionType.EXPENSE}>{t('expense')}</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('description')}</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('amount')}</label>
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('startDate')}</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('endDate')}</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                    <Button onClick={onClose} className="bg-on-surface/20 text-on-surface hover:bg-on-surface/30">{t('cancel')}</Button>
                    <Button type="submit" className="bg-primary text-white hover:bg-primary-dark">{t('save')}</Button>
                </div>
            </form>
        </Modal>
    );
};

const RecurringView: React.FC = () => {
    const { t, lang, recurringTransactions, deleteRecurringTransaction } = useAppContext();
    const [showForm, setShowForm] = useState(false);
    const [recTxToEdit, setRecTxToEdit] = useState<RecurringTransaction | null>(null);
    const [recTxToDelete, setRecTxToDelete] = useState<RecurringTransaction | null>(null);

    const handleEdit = (tx: RecurringTransaction) => { setRecTxToEdit(tx); setShowForm(true); };
    const handleCloseForm = () => { setShowForm(false); setRecTxToEdit(null); };
    const confirmDelete = () => { if (recTxToDelete) { deleteRecurringTransaction(recTxToDelete.id); setRecTxToDelete(null); } };

    return (
        <div>
            {showForm && <RecurringForm onClose={handleCloseForm} recTxToEdit={recTxToEdit} />}
            <Modal isOpen={!!recTxToDelete} onClose={() => setRecTxToDelete(null)} title={t('deleteConfirmation')}>
                <p className="text-on-surface/80">{t('areYouSureDelete')}</p>
                <div className="flex justify-end space-x-4 pt-6">
                    <Button onClick={() => setRecTxToDelete(null)}>{t('cancel')}</Button>
                    <Button onClick={confirmDelete} className="bg-danger text-white hover:bg-danger-dark">{t('delete')}</Button>
                </div>
            </Modal>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-on-surface">{t('recurring')}</h2>
                <Button onClick={() => setShowForm(true)} className="bg-primary text-white hover:bg-primary-dark">{t('addRecurring')}</Button>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-on-surface/20">
                            <tr>
                                <th className="p-4">{t('description')}</th>
                                <th className="p-4">{t('type')}</th>
                                <th className="p-4">{t('startDate')}</th>
                                <th className="p-4">{t('endDate')}</th>
                                <th className="p-4 text-right">{t('amount')}</th>
                                <th className="p-4 text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recurringTransactions.map(tx => (
                                <tr key={tx.id} className="border-b border-on-surface/10 hover:bg-on-surface/5">
                                    <td className="p-4">{tx.description}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${tx.type === 'income' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>{t(tx.type)}</span></td>
                                    <td className="p-4">{formatDate(tx.startDate, lang)}</td>
                                    <td className="p-4">{tx.endDate ? formatDate(tx.endDate, lang) : '-'}</td>
                                    <td className={`p-4 font-mono text-right ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>{formatCurrency(tx.amount, lang)}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center items-center space-x-2">
                                            <button onClick={() => handleEdit(tx)} className="text-on-surface/60 hover:text-primary"><EditIcon /></button>
                                            <button onClick={() => setRecTxToDelete(tx)} className="text-on-surface/60 hover:text-danger"><DeleteIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {recurringTransactions.length === 0 && <p className="text-center p-8 text-on-surface/70">{t('noRecurringTransactions')}</p>}
                </div>
            </Card>
        </div>
    );
};

const ReceivableForm: React.FC<{onClose: ()=>void, receivableToEdit?: Receivable | null}> = ({onClose, receivableToEdit}) => {
    const { t, addReceivable, updateReceivable } = useAppContext();
    const [clientName, setClientName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<ReceivableStatus>(ReceivableStatus.PENDING);

    useEffect(() => {
        if (receivableToEdit) {
            setClientName(receivableToEdit.clientName);
            setDescription(receivableToEdit.description);
            setAmount(String(receivableToEdit.amount));
            setDueDate(receivableToEdit.dueDate);
            setStatus(receivableToEdit.status);
        }
    }, [receivableToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName || !description || !amount || !dueDate) return;
        const receivableData = { clientName, description, amount: parseFloat(amount), dueDate, status };
        if (receivableToEdit) {
            updateReceivable({ ...receivableData, id: receivableToEdit.id });
        } else {
            addReceivable(receivableData);
        }
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={receivableToEdit ? t('editReceivable') : t('addReceivable')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('clientName')}</label>
                    <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('description')}</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('amount')}</label>
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('dueDate')}</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('status')}</label>
                    <select value={status} onChange={e => setStatus(e.target.value as ReceivableStatus)} className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary">
                        <option value={ReceivableStatus.PENDING}>{t('pending')}</option>
                        <option value={ReceivableStatus.BILLED}>{t('billed')}</option>
                        <option value={ReceivableStatus.PAID}>{t('paid')}</option>
                    </select>
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                    <Button onClick={onClose} className="bg-on-surface/20 text-on-surface hover:bg-on-surface/30">{t('cancel')}</Button>
                    <Button type="submit" className="bg-primary text-white hover:bg-primary-dark">{t('save')}</Button>
                </div>
            </form>
        </Modal>
    );
};

const StatusBadge: React.FC<{status: 'paid' | 'pending' | 'billed' | 'overdue'}> = ({status}) => {
    const { t } = useAppContext();
    const statusInfo: Record<typeof status, { label: string, color: string }> = {
        paid: { label: t('paid'), color: 'bg-success/20 text-success' },
        pending: { label: t('pending'), color: 'bg-yellow-500/20 text-yellow-400' },
        billed: { label: t('billed'), color: 'bg-blue-500/20 text-blue-400' },
        overdue: { label: t('overdue'), color: 'bg-danger/20 text-danger' },
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusInfo[status].color}`}>{statusInfo[status].label}</span>
};

const ReceivablesView: React.FC = () => {
    const { t, lang, receivables, deleteReceivable, markReceivableAsPaid } = useAppContext();
    const [showForm, setShowForm] = useState(false);
    const [receivableToEdit, setReceivableToEdit] = useState<Receivable | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Receivable | null>(null);
    const [itemToPay, setItemToPay] = useState<Receivable | null>(null);

    const handleEdit = (rec: Receivable) => { setReceivableToEdit(rec); setShowForm(true); };
    const handleCloseForm = () => { setShowForm(false); setReceivableToEdit(null); };

    const confirmDelete = () => { if (itemToDelete) { deleteReceivable(itemToDelete.id); setItemToDelete(null); } };
    const confirmPaid = () => { if (itemToPay) { markReceivableAsPaid(itemToPay); setItemToPay(null); } };

    const getDisplayStatus = (rec: Receivable): 'paid' | 'pending' | 'billed' | 'overdue' => {
        const today = new Date();
        today.setHours(0,0,0,0);
        if (rec.status !== ReceivableStatus.PAID && new Date(rec.dueDate) < today) {
            return 'overdue';
        }
        return rec.status;
    };

    return (
        <div>
            {showForm && <ReceivableForm onClose={handleCloseForm} receivableToEdit={receivableToEdit} />}
            <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title={t('deleteConfirmation')}>
                <p>{t('areYouSureDelete')}</p>
                <div className="flex justify-end space-x-4 pt-6">
                    <Button onClick={() => setItemToDelete(null)}>{t('cancel')}</Button>
                    <Button onClick={confirmDelete} className="bg-danger text-white hover:bg-danger-dark">{t('delete')}</Button>
                </div>
            </Modal>
             <Modal isOpen={!!itemToPay} onClose={() => setItemToPay(null)} title={t('confirm')}>
                <p>{t('confirmMarkAsPaid')}</p>
                <div className="flex justify-end space-x-4 pt-6">
                    <Button onClick={() => setItemToPay(null)}>{t('cancel')}</Button>
                    <Button onClick={confirmPaid} className="bg-success text-white hover:bg-green-600">{t('confirm')}</Button>
                </div>
            </Modal>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-on-surface">{t('receivables')}</h2>
                <Button onClick={() => setShowForm(true)} className="bg-primary text-white hover:bg-primary-dark">{t('addReceivable')}</Button>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-on-surface/20">
                            <tr>
                                <th className="p-4">{t('clientName')}</th>
                                <th className="p-4">{t('description')}</th>
                                <th className="p-4">{t('dueDate')}</th>
                                <th className="p-4">{t('status')}</th>
                                <th className="p-4 text-right">{t('amount')}</th>
                                <th className="p-4 text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receivables.map(rec => {
                                const displayStatus = getDisplayStatus(rec);
                                return (
                                <tr key={rec.id} className="border-b border-on-surface/10 hover:bg-on-surface/5">
                                    <td className="p-4 font-semibold">{rec.clientName}</td>
                                    <td className="p-4 text-on-surface/80">{rec.description}</td>
                                    <td className="p-4">{formatDate(rec.dueDate, lang)}</td>
                                    <td className="p-4"><StatusBadge status={displayStatus} /></td>
                                    <td className="p-4 font-mono text-right text-success">{formatCurrency(rec.amount, lang)}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center items-center space-x-2">
                                            {rec.status !== 'paid' && <button onClick={() => setItemToPay(rec)} title={t('markAsPaid')} className="text-on-surface/60 hover:text-success"><CheckCircleIcon /></button>}
                                            <button onClick={() => handleEdit(rec)} className="text-on-surface/60 hover:text-primary"><EditIcon /></button>
                                            <button onClick={() => setItemToDelete(rec)} className="text-on-surface/60 hover:text-danger"><DeleteIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    {receivables.length === 0 && <p className="text-center p-8 text-on-surface/70">{t('noReceivables')}</p>}
                </div>
            </Card>
        </div>
    );
};

const ReminderForm: React.FC<{ onClose: () => void, reminderToEdit?: Reminder | null }> = ({ onClose, reminderToEdit }) => {
    const { t, addReminder, updateReminder } = useAppContext();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDay, setDueDay] = useState(1);

    useEffect(() => {
        if (reminderToEdit) {
            setDescription(reminderToEdit.description);
            setAmount(String(reminderToEdit.amount));
            setDueDay(reminderToEdit.dueDay);
        }
    }, [reminderToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !dueDay) return;
        const reminderData = { description, amount: parseFloat(amount), dueDay: parseInt(String(dueDay), 10) };
        if (reminderToEdit) {
            updateReminder({ ...reminderData, id: reminderToEdit.id, paidMonths: reminderToEdit.paidMonths });
        } else {
            addReminder(reminderData);
        }
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={reminderToEdit ? t('editReminder') : t('addReminder')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('description')}</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('amount')}</label>
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-on-surface/80">{t('dueDay')}</label>
                    <input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(parseInt(e.target.value, 10))} required className="w-full mt-1 bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary" />
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                    <Button onClick={onClose} className="bg-on-surface/20 text-on-surface hover:bg-on-surface/30">{t('cancel')}</Button>
                    <Button type="submit" className="bg-primary text-white hover:bg-primary-dark">{t('save')}</Button>
                </div>
            </form>
        </Modal>
    );
};

const ReminderStatusBadge: React.FC<{ status: 'paidStatus' | 'pendingStatus' | 'overdueStatus' }> = ({ status }) => {
    const { t } = useAppContext();
    const statusInfo = {
        paidStatus: { label: t('paidStatus'), color: 'bg-success/20 text-success' },
        pendingStatus: { label: t('pendingStatus'), color: 'bg-yellow-500/20 text-yellow-400' },
        overdueStatus: { label: t('overdueStatus'), color: 'bg-danger/20 text-danger' },
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusInfo[status].color}`}>{statusInfo[status].label}</span>;
};

const RemindersView: React.FC = () => {
    const { t, lang, reminders, deleteReminder, markReminderAsPaid } = useAppContext();
    const [showForm, setShowForm] = useState(false);
    const [reminderToEdit, setReminderToEdit] = useState<Reminder | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Reminder | null>(null);
    const [itemToPay, setItemToPay] = useState<Reminder | null>(null);
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

    const handleEdit = (rem: Reminder) => { setReminderToEdit(rem); setShowForm(true); };
    const handleCloseForm = () => { setShowForm(false); setReminderToEdit(null); };

    const confirmDelete = () => { if (itemToDelete) { deleteReminder(itemToDelete.id); setItemToDelete(null); } };
    const confirmPaid = () => {
        if (itemToPay) {
            const [year, month] = filterMonth.split('-').map(Number);
            const paymentDate = new Date(year, month - 1, itemToPay.dueDay);
            markReminderAsPaid(itemToPay.id, paymentDate);
            setItemToPay(null);
        }
    };
    
    const getReminderStatus = (rem: Reminder, displayMonth: string): 'paidStatus' | 'pendingStatus' | 'overdueStatus' => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (rem.paidMonths.includes(displayMonth)) {
            return 'paidStatus';
        }

        const [year, month] = displayMonth.split('-').map(Number);
        const dueDateForMonth = new Date(year, month - 1, rem.dueDay);

        if (dueDateForMonth < today) {
            return 'overdueStatus';
        }
        
        return 'pendingStatus';
    }

    return (
        <div>
            {showForm && <ReminderForm onClose={handleCloseForm} reminderToEdit={reminderToEdit} />}
            <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title={t('deleteConfirmation')}>
                <p>{t('areYouSureDelete')}</p>
                <div className="flex justify-end space-x-4 pt-6"><Button onClick={() => setItemToDelete(null)}>{t('cancel')}</Button><Button onClick={confirmDelete} className="bg-danger text-white hover:bg-danger-dark">{t('delete')}</Button></div>
            </Modal>
            <Modal isOpen={!!itemToPay} onClose={() => setItemToPay(null)} title={t('confirm')}>
                <p>{t('confirmMarkAsPaidReminder')}</p>
                <div className="flex justify-end space-x-4 pt-6"><Button onClick={() => setItemToPay(null)}>{t('cancel')}</Button><Button onClick={confirmPaid} className="bg-success text-white hover:bg-green-600">{t('confirm')}</Button></div>
            </Modal>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-on-surface">{t('reminders')}</h2>
                <div className="flex items-center gap-4">
                   <input 
                      type="month" 
                      value={filterMonth} 
                      onChange={e => setFilterMonth(e.target.value)} 
                      className="bg-surface text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary"
                   />
                   <Button onClick={() => setShowForm(true)} className="bg-primary text-white hover:bg-primary-dark">{t('addReminder')}</Button>
                </div>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-on-surface/20">
                            <tr>
                                <th className="p-4">{t('description')}</th>
                                <th className="p-4 text-center">{t('dueDay')}</th>
                                <th className="p-4 text-center">{t('status')}</th>
                                <th className="p-4 text-right">{t('amount')}</th>
                                <th className="p-4 text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reminders.map(rem => {
                                const status = getReminderStatus(rem, filterMonth);
                                return (
                                <tr key={rem.id} className="border-b border-on-surface/10 hover:bg-on-surface/5">
                                    <td className="p-4 font-semibold">{rem.description}</td>
                                    <td className="p-4 text-center text-on-surface/80">{rem.dueDay}</td>
                                    <td className="p-4 text-center"><ReminderStatusBadge status={status} /></td>
                                    <td className="p-4 font-mono text-right text-danger">{formatCurrency(rem.amount, lang)}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center items-center space-x-2">
                                            {status !== 'paidStatus' && <Button onClick={() => setItemToPay(rem)} className="text-xs bg-sky-500/20 text-sky-400 hover:bg-sky-500/30">{t('markAsPaidReminder')}</Button>}
                                            <button onClick={() => handleEdit(rem)} className="text-on-surface/60 hover:text-primary"><EditIcon /></button>
                                            <button onClick={() => setItemToDelete(rem)} className="text-on-surface/60 hover:text-danger"><DeleteIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    {reminders.length === 0 && <p className="text-center p-8 text-on-surface/70">{t('noReminders')}</p>}
                </div>
            </Card>
        </div>
    );
};


const SettingsView: React.FC = () => {
    const { t, settings, updateSettings, lang, setLang, theme, toggleTheme } = useAppContext();
    const [goal, setGoal] = useState(settings.emergencyFundGoal.toString());
    
    const handleGoalUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        updateSettings({ emergencyFundGoal: parseFloat(goal) });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <h3 className="text-lg font-semibold text-on-surface mb-4">{t('emergencyFundGoal')}</h3>
                <form onSubmit={handleGoalUpdate} className="flex items-center space-x-2">
                    <input type="number" value={goal} onChange={e => setGoal(e.target.value)} className="flex-grow bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary"/>
                    <Button type="submit" className="bg-primary text-white hover:bg-primary-dark">{t('setGoal')}</Button>
                </form>
            </Card>
            <Card>
                <h3 className="text-lg font-semibold text-on-surface mb-4">{t('language')}</h3>
                 <select value={lang} onChange={(e) => setLang(e.target.value as Language)} className="w-full bg-background text-on-surface p-2 rounded-md border border-on-surface/20 focus:ring-primary focus:border-primary">
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                </select>
            </Card>
             <Card>
                <h3 className="text-lg font-semibold text-on-surface mb-4">{t('theme')}</h3>
                <div className="flex space-x-2">
                    <Button onClick={toggleTheme} className={`w-full ${theme === 'light' ? 'bg-primary text-white' : 'bg-on-surface/20 text-on-surface'}`}>{t('light')}</Button>
                    <Button onClick={toggleTheme} className={`w-full ${theme === 'dark' ? 'bg-primary text-white' : 'bg-on-surface/20 text-on-surface'}`}>{t('dark')}</Button>
                </div>
            </Card>
        </div>
    );
};

const MainContent: React.FC<{ view: View, setView: (v: View) => void }> = ({ view, setView }) => {
    return (
        <main className="flex-1 p-6 bg-background dark:bg-background overflow-y-auto">
            <Header view={view} setView={setView} />
            <div className="mt-6">
                {view === 'dashboard' && <DashboardView />}
                {view === 'transactions' && <TransactionsView />}
                {view === 'allocations' && <AllocationsView />}
                {view === 'recurring' && <RecurringView />}
                {view === 'receivables' && <ReceivablesView />}
                {view === 'reminders' && <RemindersView />}
                {view === 'settings' && <SettingsView />}
            </div>
        </main>
    );
};

export default function App() {
    const [view, setView] = useState<View>('dashboard');

    return (
        <AppProvider>
            <div className="flex h-screen bg-background dark:bg-background text-on-surface dark:text-on-surface font-sans">
                <Sidebar view={view} setView={setView} />
                <MainContent view={view} setView={setView}/>
            </div>
        </AppProvider>
    );
}
