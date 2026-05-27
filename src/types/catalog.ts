import {
  Exchange,
  InstrumentType,
  LoanType,
  PayoutFrequency,
  PremiumFrequency,
  Relationship,
  SavingsCategory
} from './finance';

export const relationships: Relationship[] = ['Self', 'Spouse', 'Child', 'Parent', 'Sibling', 'Other'];
export const payoutFrequencies: PayoutFrequency[] = ['Monthly', 'Quarterly', 'Yearly', 'At Maturity'];
export const exchanges: Exchange[] = ['NSE', 'BSE', 'Other'];
export const loanTypes: LoanType[] = ['Home', 'Car', 'Personal', 'Education', 'Gold', 'Other'];
export const premiumFrequencies: PremiumFrequency[] = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
export const savingsCategories: SavingsCategory[] = [
  'Savings Account',
  'Gold',
  'Chit Fund',
  'Bonds',
  'NPS',
  'Other'
];

export const instrumentLabels: Record<InstrumentType, string> = {
  fd: 'Fixed Deposit',
  rd: 'Recurring Deposit',
  stock: 'Stock',
  mfLumpsum: 'MF Lumpsum',
  mfSip: 'MF SIP',
  loan: 'Loan',
  termInsurance: 'Term Insurance',
  ppf: 'PPF',
  ssa: 'Sukanya Samriddhi',
  otherSavings: 'Other Savings'
};

export const instrumentTypes = Object.keys(instrumentLabels) as InstrumentType[];

export const memberColors = ['#4f46e5', '#0f766e', '#db2777', '#ea580c', '#0891b2', '#7c3aed'];
