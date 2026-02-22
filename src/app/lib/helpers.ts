// Shared types used across extracted components
export type Tab = 'dashboard' | 'entries' | 'projections' | 'scenarios' | 'budget'

export interface EntryBreakdown {
  cash: string;
  retirement: string;
  hsa: string;
  brokerage: string;
  debts: string;
}

export const BUCKET_LABELS: { key: keyof EntryBreakdown; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'retirement', label: 'Retirement (401k/IRA)' },
  { key: 'hsa', label: 'HSA' },
  { key: 'brokerage', label: 'Brokerage' },
  { key: 'debts', label: 'Debts' },
];
