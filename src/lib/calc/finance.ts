import { addMonths, differenceInMonths, differenceInYears, parseISO } from 'date-fns';
import {
  Instrument,
  InstrumentType,
  LoanInstrument,
  ProjectionHorizon,
  ProjectionResult
} from '../../types/finance';

export const horizons: ProjectionHorizon[] = ['3M', '6M', '12M', '24M', '36M', '60M'];
const horizonMonths: Record<ProjectionHorizon, number> = {
  '3M': 3,
  '6M': 6,
  '12M': 12,
  '24M': 24,
  '36M': 36,
  '60M': 60
};

export const compound = (principal: number, annualRate: number, months: number, compoundsPerYear = 4) => {
  if (annualRate === 0) return principal;
  const rate = annualRate / 100 / compoundsPerYear;
  return principal * Math.pow(1 + rate, (months / 12) * compoundsPerYear);
};

export const calcFDMaturity = (
  principal: number,
  annualRate: number,
  months: number,
  payoutFrequency: string
) => {
  if (payoutFrequency === 'At Maturity') return compound(principal, annualRate, months, 4);
  return principal;
};

export const calcRDMaturity = (monthlyInstalment: number, annualRate: number, months: number) => {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return monthlyInstalment * months;
  return monthlyInstalment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
};

export const calcEMI = (principal: number, annualRate: number, months: number) => {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
};

export const projectLoanOutstanding = (loan: LoanInstrument, monthsAhead: number) => {
  const monthlyRate = loan.interestRate / 100 / 12;
  if (monthlyRate === 0) return Math.max(loan.outstandingPrincipal - loan.monthlyEmi * monthsAhead, 0);
  let outstanding = loan.outstandingPrincipal;
  for (let index = 0; index < monthsAhead; index += 1) {
    outstanding = outstanding * (1 + monthlyRate) - loan.monthlyEmi;
  }
  return Math.max(outstanding, 0);
};

export const currentInstrumentValue = (instrument: Instrument) => {
  switch (instrument.type) {
    case 'fd':
      return instrument.principalAmount;
    case 'rd': {
      const elapsed = Math.min(
        instrument.numberOfMonths,
        Math.max(1, differenceInMonths(new Date(), parseISO(instrument.startDate)) + 1)
      );
      return calcRDMaturity(instrument.monthlyInstalment, instrument.interestRate, elapsed);
    }
    case 'stock':
      return instrument.quantity * instrument.currentPrice;
    case 'mfLumpsum':
      return instrument.unitsPurchased * instrument.currentNav;
    case 'mfSip':
      return instrument.currentAccumulatedValue;
    case 'loan':
      return -instrument.outstandingPrincipal;
    case 'termInsurance':
      return 0;
    case 'ppf':
    case 'ssa':
      return instrument.currentBalance;
    case 'otherSavings':
      return instrument.currentAmount;
  }
};

export const assetValueForType = (type: InstrumentType, instruments: Instrument[]) =>
  instruments
    .filter((instrument) => instrument.type === type && instrument.status !== 'archived')
    .reduce((sum, instrument) => sum + Math.max(currentInstrumentValue(instrument), 0), 0);

export const insuranceCoverage = (instruments: Instrument[]) =>
  instruments.reduce(
    (sum, instrument) => (instrument.type === 'termInsurance' ? sum + instrument.sumAssured : sum),
    0
  );

export const projectInstrument = (instrument: Instrument, monthsAhead: number) => {
  const years = monthsAhead / 12;
  switch (instrument.type) {
    case 'fd':
      return calcFDMaturity(
        instrument.principalAmount,
        instrument.interestRate,
        monthsAhead,
        instrument.payoutFrequency
      );
    case 'rd': {
      const elapsed = Math.max(0, differenceInMonths(new Date(), parseISO(instrument.startDate)));
      const projectedMonths = Math.min(instrument.numberOfMonths, elapsed + monthsAhead);
      return calcRDMaturity(instrument.monthlyInstalment, instrument.interestRate, projectedMonths);
    }
    case 'stock': {
      const rate = instrument.estimatedXirr ?? 10;
      return instrument.quantity * instrument.currentPrice * Math.pow(1 + rate / 100, years);
    }
    case 'mfLumpsum': {
      const rate = instrument.estimatedXirr ?? 10;
      return instrument.unitsPurchased * instrument.currentNav * Math.pow(1 + rate / 100, years);
    }
    case 'mfSip': {
      const rate = instrument.estimatedXirr ?? 10;
      const existing = instrument.currentAccumulatedValue * Math.pow(1 + rate / 100, years);
      return existing + calcRDMaturity(instrument.monthlyInstalment, rate, monthsAhead);
    }
    case 'loan':
      return -projectLoanOutstanding(instrument, monthsAhead);
    case 'termInsurance':
      return 0;
    case 'ppf':
      return (
        compound(instrument.currentBalance, instrument.estimatedRoi, monthsAhead, 1) +
        calcRDMaturity(instrument.financialYearContribution / 12, instrument.estimatedRoi, monthsAhead)
      );
    case 'ssa':
      return (
        compound(instrument.currentBalance, instrument.estimatedRoi, monthsAhead, 1) +
        calcRDMaturity(instrument.financialYearContribution / 12, instrument.estimatedRoi, monthsAhead)
      );
    case 'otherSavings':
      return compound(instrument.currentAmount, instrument.roiRate ?? 0, monthsAhead, 1);
  }
};

export const maturityDateForInstrument = (instrument: Instrument) => {
  switch (instrument.type) {
    case 'fd':
      if (instrument.termEndDate) return instrument.termEndDate;
      return addMonths(
        parseISO(instrument.startDate),
        (instrument.periodYears ?? 0) * 12 + (instrument.periodMonths ?? 0)
      )
        .toISOString()
        .slice(0, 10);
    case 'rd':
      return addMonths(parseISO(instrument.startDate), instrument.numberOfMonths).toISOString().slice(0, 10);
    case 'termInsurance':
      return addMonths(parseISO(instrument.policyStartDate), instrument.policyTermYears * 12)
        .toISOString()
        .slice(0, 10);
    case 'ppf':
      return addMonths(parseISO(instrument.accountOpenDate), 15 * 12).toISOString().slice(0, 10);
    default:
      return undefined;
  }
};

export const yearsHeld = (date: string) => Math.max(0, differenceInYears(new Date(), parseISO(date)));

export const projectPortfolio = (
  instruments: Instrument[],
  filters?: { types?: InstrumentType[]; memberIds?: string[] }
): ProjectionResult => {
  const active = instruments.filter((instrument) => {
    const typeOk = !filters?.types?.length || filters.types.includes(instrument.type);
    const memberOk = !filters?.memberIds?.length || filters.memberIds.includes(instrument.memberId);
    return instrument.status !== 'archived' && typeOk && memberOk;
  });
  const rows = Array.from(new Set(active.map((instrument) => instrument.type))).map((type) => {
    const byType = active.filter((instrument) => instrument.type === type);
    return {
      type,
      values: Object.fromEntries(
        horizons.map((horizon) => [
          horizon,
          byType.reduce((sum, instrument) => sum + projectInstrument(instrument, horizonMonths[horizon]), 0)
        ])
      ) as Record<ProjectionHorizon, number>
    };
  });
  const netWorthByHorizon = Object.fromEntries(
    horizons.map((horizon) => [horizon, rows.reduce((sum, row) => sum + row.values[horizon], 0)])
  ) as Record<ProjectionHorizon, number>;
  return {
    horizons,
    rows,
    netWorthByHorizon,
    currentNetWorth: active.reduce((sum, instrument) => sum + currentInstrumentValue(instrument), 0)
  };
};
