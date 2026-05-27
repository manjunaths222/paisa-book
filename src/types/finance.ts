export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'SGD';

export type Relationship = 'Self' | 'Spouse' | 'Child' | 'Parent' | 'Sibling' | 'Other';

export type Gender = 'female' | 'male' | 'other' | 'unspecified';

export type InstrumentStatus = 'active' | 'closed' | 'matured' | 'archived';

export type InstrumentType =
  | 'fd'
  | 'rd'
  | 'stock'
  | 'mfLumpsum'
  | 'mfSip'
  | 'loan'
  | 'termInsurance'
  | 'ppf'
  | 'ssa'
  | 'otherSavings';

export type PayoutFrequency = 'Monthly' | 'Quarterly' | 'Yearly' | 'At Maturity';
export type Exchange = 'NSE' | 'BSE' | 'Other';
export type LoanType = 'Home' | 'Car' | 'Personal' | 'Education' | 'Gold' | 'Other';
export type PremiumFrequency = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';
export type SavingsCategory = 'Savings Account' | 'Gold' | 'Chit Fund' | 'Bonds' | 'NPS' | 'Other';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  currency: CurrencyCode;
  autoRenewDeposits: boolean;
  onboardingComplete: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface FamilyMember {
  id: string;
  uid: string;
  name: string;
  relationship: Relationship;
  dob?: string;
  pan?: string;
  color: string;
  notes?: string;
  gender: Gender;
  isSelf: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BaseInstrument {
  id: string;
  uid: string;
  memberId: string;
  type: InstrumentType;
  referenceId: string;
  status: InstrumentStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
  projCache?: ProjectionCache;
}

export interface FDInstrument extends BaseInstrument {
  type: 'fd';
  bankName: string;
  startDate: string;
  termEndDate?: string;
  periodYears?: number;
  periodMonths?: number;
  periodDays?: number;
  interestRate: number;
  principalAmount: number;
  payoutFrequency: PayoutFrequency;
}

export interface RDInstrument extends BaseInstrument {
  type: 'rd';
  bankName: string;
  startDate: string;
  numberOfMonths: number;
  emiDate: number;
  interestRate: number;
  monthlyInstalment: number;
}

export interface StockInstrument extends BaseInstrument {
  type: 'stock';
  companyName: string;
  tickerSymbol: string;
  exchange: Exchange;
  purchaseDate: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  estimatedXirr?: number;
}

export interface MFLumpsumInstrument extends BaseInstrument {
  type: 'mfLumpsum';
  fundName: string;
  amfiCode?: string;
  investmentDate: string;
  unitsPurchased: number;
  navAtPurchase: number;
  currentNav: number;
  estimatedXirr?: number;
}

export interface MFSipInstrument extends BaseInstrument {
  type: 'mfSip';
  fundName: string;
  amfiCode?: string;
  startDate: string;
  monthlyInstalment: number;
  instalmentDay: number;
  currentInstalmentCount: number;
  currentAccumulatedValue: number;
  estimatedXirr?: number;
}

export interface LoanInstrument extends BaseInstrument {
  type: 'loan';
  loanName: string;
  loanType: LoanType;
  sanctionedAmount: number;
  loanStartDate: string;
  tenureMonths: number;
  monthlyEmi: number;
  emiDate: number;
  interestRate: number;
  outstandingPrincipal: number;
}

export interface TermInsuranceInstrument extends BaseInstrument {
  type: 'termInsurance';
  insurerName: string;
  policyName: string;
  sumAssured: number;
  annualPremium: number;
  premiumFrequency: PremiumFrequency;
  premiumDueDate: string;
  policyStartDate: string;
  policyTermYears: number;
  nominee?: string;
}

export interface PPFInstrument extends BaseInstrument {
  type: 'ppf';
  institutionName: string;
  accountOpenDate: string;
  currentBalance: number;
  financialYearContribution: number;
  estimatedRoi: number;
}

export interface SSAInstrument extends BaseInstrument {
  type: 'ssa';
  institutionName: string;
  accountOpenDate: string;
  currentBalance: number;
  financialYearContribution: number;
  estimatedRoi: number;
}

export interface OtherSavingsInstrument extends BaseInstrument {
  type: 'otherSavings';
  name: string;
  category: SavingsCategory;
  currentAmount: number;
  roiRate?: number;
}

export type Instrument =
  | FDInstrument
  | RDInstrument
  | StockInstrument
  | MFLumpsumInstrument
  | MFSipInstrument
  | LoanInstrument
  | TermInsuranceInstrument
  | PPFInstrument
  | SSAInstrument
  | OtherSavingsInstrument;

export type InstrumentInput = Omit<Instrument, 'id' | 'uid' | 'createdAt' | 'updatedAt' | 'projCache'>;

export interface ProjectionCache {
  sourceUpdatedAt: string;
  horizons: Record<ProjectionHorizon, number>;
}

export type ProjectionHorizon = '3M' | '6M' | '12M' | '24M' | '36M' | '60M';

export interface ProjectionRow {
  type: InstrumentType;
  values: Record<ProjectionHorizon, number>;
}

export interface ProjectionResult {
  horizons: ProjectionHorizon[];
  currentNetWorth: number;
  netWorthByHorizon: Record<ProjectionHorizon, number>;
  rows: ProjectionRow[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}
