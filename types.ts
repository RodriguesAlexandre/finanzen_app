
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export interface Transaction {
  id: string;
  date: string; // ISO string 'YYYY-MM-DD'
  description: string;
  amount: number;
  type: TransactionType;
}

export enum AllocationCategory {
  INVESTMENTS = 'investments',
  EMERGENCY_FUND = 'emergency_fund',
  GOALS = 'goals',
}

export interface Allocation {
  id: string;
  date: string; // ISO string 'YYYY-MM-DD'
  category: AllocationCategory;
  amount: number;
  description?: string;
  interestRate?: number; // Annual interest rate, only for investments
  investmentType?: string; // e.g., 'Stocks', 'Fixed Income', only for investments
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  lastProcessedDate?: string; // YYYY-MM-DD
}

export enum ReceivableStatus {
  PENDING = 'pending',
  BILLED = 'billed',
  PAID = 'paid',
}

export interface Receivable {
  id: string;
  clientName: string;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: ReceivableStatus;
}

export interface Reminder {
    id: string;
    description: string;
    amount: number;
    dueDay: number; // Day of the month (1-31)
    paidMonths: string[]; // Array of 'YYYY-MM' strings for paid months
}


export type Language = 'pt' | 'en';
export type Theme = 'light' | 'dark';

export interface Settings {
  emergencyFundGoal: number;
  language: Language;
  theme: Theme;
}

export type View = 'dashboard' | 'transactions' | 'allocations' | 'recurring' | 'receivables' | 'reminders' | 'settings';

export type FilterType = 'all' | 'year' | 'month' | 'day';

export interface DateFilter {
  type: FilterType;
  value: string | null;
}