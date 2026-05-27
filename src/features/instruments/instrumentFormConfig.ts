import { addMonths } from 'date-fns';
import {
  exchanges,
  instrumentLabels,
  instrumentTypes,
  loanTypes,
  payoutFrequencies,
  premiumFrequencies,
  savingsCategories
} from '../../types/catalog';
import { FamilyMember, Instrument, InstrumentInput, InstrumentType } from '../../types/finance';
import { currentInstrumentValue, maturityDateForInstrument, calcEMI } from '../../lib/calc/finance';
import { formatCurrency, formatDate, formatNumber } from '../../lib/format';

export interface FieldConfig {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
  step?: string;
}

export const fieldConfigs: Record<InstrumentType, FieldConfig[]> = {
  fd: [
    { name: 'referenceId', label: 'Deposit ID', required: true },
    { name: 'bankName', label: 'Bank / Institution', required: true },
    { name: 'startDate', label: 'Start Date', type: 'date', required: true },
    { name: 'termEndDate', label: 'Term End Date', type: 'date' },
    { name: 'periodYears', label: 'Period Years', type: 'number' },
    { name: 'periodMonths', label: 'Period Months', type: 'number' },
    { name: 'periodDays', label: 'Period Days', type: 'number' },
    { name: 'interestRate', label: 'Interest Rate %', type: 'number', step: '0.01', required: true },
    { name: 'principalAmount', label: 'Principal Amount', type: 'number', required: true },
    { name: 'payoutFrequency', label: 'Payout Frequency', type: 'select', options: payoutFrequencies, required: true }
  ],
  rd: [
    { name: 'referenceId', label: 'Deposit ID', required: true },
    { name: 'bankName', label: 'Bank / Institution', required: true },
    { name: 'startDate', label: 'Start Date', type: 'date', required: true },
    { name: 'numberOfMonths', label: 'Number of Months', type: 'number', required: true },
    { name: 'emiDate', label: 'EMI Date', type: 'number', required: true },
    { name: 'interestRate', label: 'Interest Rate %', type: 'number', step: '0.01', required: true },
    { name: 'monthlyInstalment', label: 'Monthly Instalment', type: 'number', required: true }
  ],
  stock: [
    { name: 'referenceId', label: 'Stock ID', required: true },
    { name: 'companyName', label: 'Company Name', required: true },
    { name: 'tickerSymbol', label: 'Ticker Symbol', required: true },
    { name: 'exchange', label: 'Exchange', type: 'select', options: exchanges, required: true },
    { name: 'purchaseDate', label: 'Purchase Date', type: 'date', required: true },
    { name: 'quantity', label: 'Quantity', type: 'number', step: '0.001', required: true },
    { name: 'averageBuyPrice', label: 'Average Buy Price', type: 'number', required: true },
    { name: 'currentPrice', label: 'Current Price', type: 'number', required: true },
    { name: 'estimatedXirr', label: 'Estimated XIRR %', type: 'number', step: '0.01' }
  ],
  mfLumpsum: [
    { name: 'referenceId', label: 'MF ID', required: true },
    { name: 'fundName', label: 'Fund Name', required: true },
    { name: 'amfiCode', label: 'AMFI Code' },
    { name: 'investmentDate', label: 'Investment Date', type: 'date', required: true },
    { name: 'unitsPurchased', label: 'Units Purchased', type: 'number', step: '0.001', required: true },
    { name: 'navAtPurchase', label: 'NAV at Purchase', type: 'number', required: true },
    { name: 'currentNav', label: 'Current NAV', type: 'number', required: true },
    { name: 'estimatedXirr', label: 'Estimated XIRR %', type: 'number', step: '0.01' }
  ],
  mfSip: [
    { name: 'referenceId', label: 'MF ID', required: true },
    { name: 'fundName', label: 'Fund Name', required: true },
    { name: 'amfiCode', label: 'AMFI Code' },
    { name: 'startDate', label: 'Start Date', type: 'date', required: true },
    { name: 'monthlyInstalment', label: 'Monthly Instalment', type: 'number', required: true },
    { name: 'instalmentDay', label: 'Instalment Day', type: 'number', required: true },
    { name: 'currentInstalmentCount', label: 'Current Instalment Count', type: 'number', required: true },
    { name: 'currentAccumulatedValue', label: 'Current Accumulated Value', type: 'number', required: true },
    { name: 'estimatedXirr', label: 'Estimated XIRR %', type: 'number', step: '0.01' }
  ],
  loan: [
    { name: 'referenceId', label: 'Loan ID', required: true },
    { name: 'loanName', label: 'Loan Name / Lender', required: true },
    { name: 'loanType', label: 'Loan Type', type: 'select', options: loanTypes, required: true },
    { name: 'sanctionedAmount', label: 'Sanctioned Amount', type: 'number', required: true },
    { name: 'loanStartDate', label: 'Loan Start Date', type: 'date', required: true },
    { name: 'tenureMonths', label: 'Tenure Months', type: 'number', required: true },
    { name: 'monthlyEmi', label: 'Monthly EMI', type: 'number', required: true },
    { name: 'emiDate', label: 'EMI Date', type: 'number', required: true },
    { name: 'interestRate', label: 'Interest Rate %', type: 'number', step: '0.01', required: true },
    { name: 'outstandingPrincipal', label: 'Outstanding Principal', type: 'number', required: true }
  ],
  termInsurance: [
    { name: 'referenceId', label: 'Policy ID', required: true },
    { name: 'insurerName', label: 'Insurer Name', required: true },
    { name: 'policyName', label: 'Policy Name', required: true },
    { name: 'sumAssured', label: 'Sum Assured', type: 'number', required: true },
    { name: 'annualPremium', label: 'Annual Premium', type: 'number', required: true },
    { name: 'premiumFrequency', label: 'Premium Frequency', type: 'select', options: premiumFrequencies, required: true },
    { name: 'premiumDueDate', label: 'Premium Due Date', type: 'date', required: true },
    { name: 'policyStartDate', label: 'Policy Start Date', type: 'date', required: true },
    { name: 'policyTermYears', label: 'Policy Term Years', type: 'number', required: true },
    { name: 'nominee', label: 'Nominee' }
  ],
  ppf: [
    { name: 'referenceId', label: 'Account ID', required: true },
    { name: 'institutionName', label: 'Bank / Post Office', required: true },
    { name: 'accountOpenDate', label: 'Account Open Date', type: 'date', required: true },
    { name: 'currentBalance', label: 'Current Balance', type: 'number', required: true },
    { name: 'financialYearContribution', label: 'FY Contribution', type: 'number', required: true },
    { name: 'estimatedRoi', label: 'Estimated ROI %', type: 'number', step: '0.01', required: true }
  ],
  ssa: [
    { name: 'referenceId', label: 'Account ID', required: true },
    { name: 'institutionName', label: 'Bank / Post Office', required: true },
    { name: 'accountOpenDate', label: 'Account Open Date', type: 'date', required: true },
    { name: 'currentBalance', label: 'Current Balance', type: 'number', required: true },
    { name: 'financialYearContribution', label: 'FY Contribution', type: 'number', required: true },
    { name: 'estimatedRoi', label: 'Estimated ROI %', type: 'number', step: '0.01', required: true }
  ],
  otherSavings: [
    { name: 'referenceId', label: 'Savings ID', required: true },
    { name: 'name', label: 'Name', required: true },
    { name: 'category', label: 'Category', type: 'select', options: savingsCategories, required: true },
    { name: 'currentAmount', label: 'Current Amount', type: 'number', required: true },
    { name: 'roiRate', label: 'Interest / ROI Rate %', type: 'number', step: '0.01' }
  ]
};

export const defaultsForType = (type: InstrumentType, selfMemberId: string): Record<string, any> => ({
  type,
  memberId: selfMemberId,
  status: 'active',
  referenceId: '',
  description: '',
  startDate: new Date().toISOString().slice(0, 10),
  purchaseDate: new Date().toISOString().slice(0, 10),
  investmentDate: new Date().toISOString().slice(0, 10),
  loanStartDate: new Date().toISOString().slice(0, 10),
  policyStartDate: new Date().toISOString().slice(0, 10),
  accountOpenDate: new Date().toISOString().slice(0, 10),
  premiumDueDate: addMonths(new Date(), 1).toISOString().slice(0, 10),
  payoutFrequency: 'At Maturity',
  exchange: 'NSE',
  loanType: 'Home',
  premiumFrequency: 'Yearly',
  category: 'Savings Account',
  numberOfMonths: 12,
  emiDate: 5,
  instalmentDay: 5,
  currentInstalmentCount: 1,
  interestRate: type === 'loan' ? 8.5 : 7,
  estimatedRoi: type === 'ssa' ? 8.2 : 7.1,
  policyTermYears: 20,
  tenureMonths: 120,
  periodYears: 1,
  periodMonths: 0,
  periodDays: 0
});

export const instrumentName = (instrument: Instrument) => {
  switch (instrument.type) {
    case 'fd':
    case 'rd':
      return instrument.bankName;
    case 'stock':
      return instrument.companyName;
    case 'mfLumpsum':
    case 'mfSip':
      return instrument.fundName;
    case 'loan':
      return instrument.loanName;
    case 'termInsurance':
      return instrument.policyName;
    case 'ppf':
    case 'ssa':
      return instrument.institutionName;
    case 'otherSavings':
      return instrument.name;
  }
};

export const primaryAmount = (instrument: Instrument, currency: any) => {
  if (instrument.type === 'termInsurance') return formatCurrency(instrument.sumAssured, currency);
  if (instrument.type === 'loan') return formatCurrency(instrument.outstandingPrincipal, currency);
  return formatCurrency(currentInstrumentValue(instrument), currency);
};

export const computedChips = (draft: any, currency: any) => {
  const type = draft.type as InstrumentType;
  const chips: { label: string; value: string }[] = [];
  if (type === 'stock') {
    chips.push({ label: 'Amount invested', value: formatCurrency(Number(draft.quantity || 0) * Number(draft.averageBuyPrice || 0), currency) });
    chips.push({ label: 'Unrealised P&L', value: formatCurrency(Number(draft.quantity || 0) * (Number(draft.currentPrice || 0) - Number(draft.averageBuyPrice || 0)), currency) });
  }
  if (type === 'mfLumpsum') {
    chips.push({ label: 'Current value', value: formatCurrency(Number(draft.unitsPurchased || 0) * Number(draft.currentNav || 0), currency) });
  }
  if (type === 'mfSip') {
    chips.push({ label: 'Total invested', value: formatCurrency(Number(draft.monthlyInstalment || 0) * Number(draft.currentInstalmentCount || 0), currency) });
  }
  if (type === 'loan') {
    chips.push({ label: 'Computed EMI', value: formatCurrency(calcEMI(Number(draft.sanctionedAmount || 0), Number(draft.interestRate || 0), Number(draft.tenureMonths || 1)), currency) });
  }
  const synthetic = { ...draft, id: 'draft', uid: 'draft', createdAt: '', updatedAt: '' } as Instrument;
  const maturity = instrumentTypes.includes(type) ? maturityDateForInstrument(synthetic) : undefined;
  if (maturity) chips.push({ label: 'Maturity date', value: formatDate(maturity) });
  if (type === 'ssa') chips.push({ label: 'Eligibility', value: 'Female beneficiary below age 10 at opening' });
  if (type === 'fd') chips.push({ label: 'Reference', value: `${instrumentLabels[type]} · ${formatNumber(Number(draft.interestRate || 0))}%` });
  return chips;
};

export const membersForSelect = (members: FamilyMember[]) =>
  members.map((member) => ({ value: member.id, label: `${member.name} (${member.relationship})` }));

export const normalizeFormValue = (value: any): InstrumentInput => {
  const cleaned = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, item === '' ? undefined : item])
  );
  return cleaned as InstrumentInput;
};
