import { addMonths, format, isAfter, isBefore, parseISO } from 'date-fns';
import { instrumentLabels } from '../../types/catalog';
import { FamilyMember, Instrument, AppUser } from '../../types/finance';
import {
  currentInstrumentValue,
  estimatedMaturityValue,
  insuranceCoverage,
  maturityDateForInstrument,
  projectPortfolio
} from '../calc/finance';
import { formatCurrency, formatDate } from '../format';

export interface PortfolioAgentSnapshot {
  asOf: string;
  currency: string;
  settings: {
    autoRenewDeposits: boolean;
  };
  totals: {
    netWorth: number;
    assets: number;
    liabilities: number;
    insuranceCoverage: number;
    monthlyCommitments: number;
  };
  projections: {
    netWorthByHorizon: Record<string, number>;
    byType: { type: string; values: Record<string, number> }[];
  };
  members: {
    id: string;
    name: string;
    relationship: string;
    age?: number;
  }[];
  instruments: PortfolioAgentInstrument[];
  upcoming: {
    date: string;
    type: string;
    name: string;
    referenceId: string;
    amount?: number;
    memberName: string;
  }[];
  summaryText: string;
}

export interface RedactedPortfolioAgentSnapshot {
  asOf: string;
  currency: string;
  settings: PortfolioAgentSnapshot['settings'];
  totals: PortfolioAgentSnapshot['totals'];
  projections: PortfolioAgentSnapshot['projections'];
  members: {
    alias: string;
    relationship: string;
    age?: number;
  }[];
  instruments: {
    alias: string;
    type: string;
    label: string;
    memberAlias: string;
    status: string;
    currentValue: number;
    maturityDate?: string;
    estimatedMaturityValue?: number;
    keyDetails: Record<string, string | number | undefined>;
  }[];
  upcoming: {
    date: string;
    type: string;
    instrumentAlias: string;
    amount?: number;
    memberAlias: string;
  }[];
  summaryText: string;
  privacyNote: string;
}

export interface PortfolioAgentInstrument {
  id: string;
  type: string;
  label: string;
  referenceId: string;
  memberName: string;
  status: string;
  currentValue: number;
  maturityDate?: string;
  estimatedMaturityValue?: number;
  description?: string;
  keyDetails: Record<string, string | number | undefined>;
}

export function buildPortfolioAgentSnapshot({
  user,
  members,
  instruments
}: {
  user: AppUser;
  members: FamilyMember[];
  instruments: Instrument[];
}): PortfolioAgentSnapshot {
  const active = instruments.filter((instrument) => instrument.status !== 'archived');
  const projections = projectPortfolio(active, undefined, { autoRenewDeposits: user.autoRenewDeposits });
  const instrumentRows = active.map((instrument) => toAgentInstrument(instrument, members));
  const netWorth = active.reduce((sum, instrument) => sum + currentInstrumentValue(instrument), 0);
  const assets = active.reduce((sum, instrument) => sum + Math.max(currentInstrumentValue(instrument), 0), 0);
  const liabilities = active.reduce((sum, instrument) => sum + Math.abs(Math.min(currentInstrumentValue(instrument), 0)), 0);
  const monthlyCommitments = active.reduce((sum, instrument) => {
    if (instrument.type === 'loan') return sum + instrument.monthlyEmi;
    if (instrument.type === 'rd' || instrument.type === 'mfSip') return sum + instrument.monthlyInstalment;
    if (instrument.type === 'termInsurance') return sum + premiumMonthlyAmount(instrument.annualPremium, instrument.premiumFrequency);
    return sum;
  }, 0);

  const snapshot: PortfolioAgentSnapshot = {
    asOf: format(new Date(), 'yyyy-MM-dd'),
    currency: user.currency,
    settings: {
      autoRenewDeposits: user.autoRenewDeposits
    },
    totals: {
      netWorth,
      assets,
      liabilities,
      insuranceCoverage: insuranceCoverage(active),
      monthlyCommitments
    },
    projections: {
      netWorthByHorizon: projections.netWorthByHorizon,
      byType: projections.rows.map((row) => ({
        type: instrumentLabels[row.type],
        values: row.values
      }))
    },
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      relationship: member.relationship,
      age: ageFromDate(member.dob)
    })),
    instruments: instrumentRows,
    upcoming: upcomingEvents(active, members),
    summaryText: ''
  };

  snapshot.summaryText = summaryText(snapshot);
  return snapshot;
}

export function redactSnapshotForModel(snapshot: PortfolioAgentSnapshot): RedactedPortfolioAgentSnapshot {
  const memberAliases = memberAliasMap(snapshot.members);
  const instrumentAliases = new Map(snapshot.instruments.map((instrument, index) => [instrument.id, `${instrument.label} ${index + 1}`]));
  return {
    asOf: snapshot.asOf,
    currency: snapshot.currency,
    settings: snapshot.settings,
    totals: snapshot.totals,
    projections: snapshot.projections,
    members: snapshot.members.map((member) => ({
      alias: memberAliases.get(member.id) ?? member.relationship,
      relationship: member.relationship,
      age: member.age
    })),
    instruments: snapshot.instruments.map((instrument) => ({
      alias: instrumentAliases.get(instrument.id) ?? instrument.label,
      type: instrument.type,
      label: instrument.label,
      memberAlias: memberAliases.get(snapshot.members.find((member) => member.name === instrument.memberName)?.id ?? '') ?? 'Family member',
      status: instrument.status,
      currentValue: instrument.currentValue,
      maturityDate: instrument.maturityDate,
      estimatedMaturityValue: instrument.estimatedMaturityValue,
      keyDetails: redactInstrumentDetails(instrument)
    })),
    upcoming: snapshot.upcoming.map((event) => ({
      date: event.date,
      type: event.type,
      instrumentAlias: instrumentAliasForReference(snapshot.instruments, instrumentAliases, event.referenceId),
      amount: event.amount,
      memberAlias: memberAliasForName(snapshot.members, memberAliases, event.memberName)
    })),
    summaryText: snapshot.summaryText,
    privacyNote:
      'This snapshot is redacted before model access: personal identifiers, account identifiers, free-form notes, and institution/security identifiers are not included.'
  };
}

export function redactQuestionForModel(question: string, snapshot: PortfolioAgentSnapshot) {
  const memberAliases = memberAliasMap(snapshot.members);
  const instrumentAliases = new Map(snapshot.instruments.map((instrument, index) => [instrument.id, `${instrument.label} ${index + 1}`]));
  let redacted = question;
  snapshot.members.forEach((member) => {
    redacted = replaceInsensitive(redacted, member.name, memberAliases.get(member.id) ?? member.relationship);
  });
  snapshot.instruments.forEach((instrument) => {
    redacted = replaceInsensitive(redacted, instrument.referenceId, instrumentAliases.get(instrument.id) ?? instrument.label);
    Object.values(identifierDetails(instrument)).forEach((value) => {
      if (typeof value === 'string') {
        redacted = replaceInsensitive(redacted, value, instrumentAliases.get(instrument.id) ?? instrument.label);
      }
    });
  });
  return redacted;
}

function toAgentInstrument(instrument: Instrument, members: FamilyMember[]): PortfolioAgentInstrument {
  const memberName = members.find((member) => member.id === instrument.memberId)?.name ?? 'Unknown member';
  const maturityDate = maturityDateForInstrument(instrument);
  return {
    id: instrument.id,
    type: instrument.type,
    label: instrumentLabels[instrument.type],
    referenceId: instrument.referenceId,
    memberName,
    status: instrument.status,
    currentValue: currentInstrumentValue(instrument),
    maturityDate,
    estimatedMaturityValue: estimatedMaturityValue(instrument),
    description: instrument.description,
    keyDetails: instrumentDetails(instrument)
  };
}

function instrumentDetails(instrument: Instrument): Record<string, string | number | undefined> {
  switch (instrument.type) {
    case 'fd':
      return {
        institution: instrument.bankName,
        startDate: instrument.startDate,
        principalAmount: instrument.principalAmount,
        interestRate: instrument.interestRate,
        payoutFrequency: instrument.payoutFrequency
      };
    case 'rd':
      return {
        institution: instrument.bankName,
        startDate: instrument.startDate,
        monthlyInstalment: instrument.monthlyInstalment,
        months: instrument.numberOfMonths,
        interestRate: instrument.interestRate,
        emiDate: instrument.emiDate
      };
    case 'stock':
      return {
        company: instrument.companyName,
        ticker: instrument.tickerSymbol,
        quantity: instrument.quantity,
        currentPrice: instrument.currentPrice,
        estimatedXirr: instrument.estimatedXirr
      };
    case 'mfLumpsum':
      return {
        fund: instrument.fundName,
        units: instrument.unitsPurchased,
        currentNav: instrument.currentNav,
        estimatedXirr: instrument.estimatedXirr
      };
    case 'mfSip':
      return {
        fund: instrument.fundName,
        monthlyInstalment: instrument.monthlyInstalment,
        instalmentsCompleted: instrument.currentInstalmentCount,
        currentValue: instrument.currentAccumulatedValue,
        estimatedXirr: instrument.estimatedXirr
      };
    case 'loan':
      return {
        name: instrument.loanName,
        loanType: instrument.loanType,
        outstandingPrincipal: instrument.outstandingPrincipal,
        monthlyEmi: instrument.monthlyEmi,
        interestRate: instrument.interestRate,
        tenureMonths: instrument.tenureMonths,
        emiDate: instrument.emiDate
      };
    case 'termInsurance':
      return {
        insurer: instrument.insurerName,
        policyName: instrument.policyName,
        sumAssured: instrument.sumAssured,
        annualPremium: instrument.annualPremium,
        premiumFrequency: instrument.premiumFrequency,
        premiumDueDate: instrument.premiumDueDate
      };
    case 'ppf':
    case 'ssa':
      return {
        institution: instrument.institutionName,
        accountOpenDate: instrument.accountOpenDate,
        currentBalance: instrument.currentBalance,
        annualContribution: instrument.financialYearContribution,
        estimatedRoi: instrument.estimatedRoi
      };
    case 'otherSavings':
      return {
        name: instrument.name,
        category: instrument.category,
        currentAmount: instrument.currentAmount,
        roiRate: instrument.roiRate
      };
  }
}

function redactInstrumentDetails(instrument: PortfolioAgentInstrument): Record<string, string | number | undefined> {
  const details = instrument.keyDetails;
  switch (instrument.type) {
    case 'fd':
      return {
        startDate: details.startDate,
        principalAmount: details.principalAmount,
        interestRate: details.interestRate,
        payoutFrequency: details.payoutFrequency
      };
    case 'rd':
      return {
        startDate: details.startDate,
        monthlyInstalment: details.monthlyInstalment,
        months: details.months,
        interestRate: details.interestRate,
        emiDate: details.emiDate
      };
    case 'stock':
      return {
        quantity: details.quantity,
        currentPrice: details.currentPrice,
        estimatedXirr: details.estimatedXirr
      };
    case 'mfLumpsum':
      return {
        units: details.units,
        currentNav: details.currentNav,
        estimatedXirr: details.estimatedXirr
      };
    case 'mfSip':
      return {
        monthlyInstalment: details.monthlyInstalment,
        instalmentsCompleted: details.instalmentsCompleted,
        currentValue: details.currentValue,
        estimatedXirr: details.estimatedXirr
      };
    case 'loan':
      return {
        loanType: details.loanType,
        outstandingPrincipal: details.outstandingPrincipal,
        monthlyEmi: details.monthlyEmi,
        interestRate: details.interestRate,
        tenureMonths: details.tenureMonths,
        emiDate: details.emiDate
      };
    case 'termInsurance':
      return {
        sumAssured: details.sumAssured,
        annualPremium: details.annualPremium,
        premiumFrequency: details.premiumFrequency,
        premiumDueDate: details.premiumDueDate
      };
    case 'ppf':
    case 'ssa':
      return {
        accountOpenDate: details.accountOpenDate,
        currentBalance: details.currentBalance,
        annualContribution: details.annualContribution,
        estimatedRoi: details.estimatedRoi
      };
    case 'otherSavings':
      return {
        category: details.category,
        currentAmount: details.currentAmount,
        roiRate: details.roiRate
      };
    default:
      return {};
  }
}

function identifierDetails(instrument: PortfolioAgentInstrument) {
  const details = instrument.keyDetails;
  return {
    institution: details.institution,
    company: details.company,
    ticker: details.ticker,
    fund: details.fund,
    name: details.name,
    insurer: details.insurer,
    policyName: details.policyName
  };
}

function memberAliasMap(members: PortfolioAgentSnapshot['members']) {
  const counts = new Map<string, number>();
  return new Map(
    members.map((member) => {
      if (member.relationship === 'Self') return [member.id, 'Self'];
      const next = (counts.get(member.relationship) ?? 0) + 1;
      counts.set(member.relationship, next);
      return [member.id, `${member.relationship} ${next}`];
    })
  );
}

function memberAliasForName(
  members: PortfolioAgentSnapshot['members'],
  aliases: Map<string, string>,
  memberName: string
) {
  const member = members.find((item) => item.name === memberName);
  return member ? aliases.get(member.id) ?? member.relationship : 'Family member';
}

function instrumentAliasForReference(
  instruments: PortfolioAgentInstrument[],
  aliases: Map<string, string>,
  referenceId: string
) {
  const instrument = instruments.find((item) => item.referenceId === referenceId);
  return instrument ? aliases.get(instrument.id) ?? instrument.label : 'Instrument';
}

function replaceInsensitive(input: string, needle: string | undefined, replacement: string) {
  if (!needle || needle.trim().length < 2) return input;
  return input.replace(new RegExp(escapeRegExp(needle.trim()), 'gi'), replacement);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function upcomingEvents(instruments: Instrument[], members: FamilyMember[]) {
  const today = new Date();
  const horizon = addMonths(today, 6);
  return instruments
    .flatMap((instrument) => {
      const memberName = members.find((member) => member.id === instrument.memberId)?.name ?? 'Unknown member';
      const maturity = maturityDateForInstrument(instrument);
      if (!maturity) return [];
      const parsed = parseISO(maturity);
      if (isBefore(parsed, today) || isAfter(parsed, horizon)) return [];
      return [{
        date: maturity,
        type: `${instrumentLabels[instrument.type]} maturity`,
        name: instrumentLabels[instrument.type],
        referenceId: instrument.referenceId,
        amount: estimatedMaturityValue(instrument),
        memberName
      }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function summaryText(snapshot: PortfolioAgentSnapshot) {
  return [
    `As of ${formatDate(snapshot.asOf)}, net worth is ${formatCurrency(snapshot.totals.netWorth, snapshot.currency as AppUser['currency'])}.`,
    `Assets are ${formatCurrency(snapshot.totals.assets, snapshot.currency as AppUser['currency'])}, liabilities are ${formatCurrency(snapshot.totals.liabilities, snapshot.currency as AppUser['currency'])}, and monthly commitments are ${formatCurrency(snapshot.totals.monthlyCommitments, snapshot.currency as AppUser['currency'])}.`,
    `Insurance coverage is ${formatCurrency(snapshot.totals.insuranceCoverage, snapshot.currency as AppUser['currency'])}.`,
    `Auto-renew deposits in projections is ${snapshot.settings.autoRenewDeposits ? 'enabled' : 'disabled'}.`
  ].join(' ');
}

function ageFromDate(value?: string) {
  if (!value) return undefined;
  const birthDate = parseISO(value);
  if (Number.isNaN(birthDate.getTime())) return undefined;
  return Math.max(0, new Date().getFullYear() - birthDate.getFullYear());
}

function premiumMonthlyAmount(annualPremium: number, frequency: string) {
  void frequency;
  return annualPremium / 12;
}
