import { differenceInYears, parseISO } from 'date-fns';
import { z } from 'zod';
import {
  exchanges,
  loanTypes,
  payoutFrequencies,
  premiumFrequencies,
  relationships,
  savingsCategories
} from './catalog';
import { FamilyMember, InstrumentInput, InstrumentType } from './finance';

const today = new Date();
const requiredString = z.string().trim().min(1, 'Required');
const optionalText = z.string().trim().max(500, 'Maximum 500 characters').optional().or(z.literal(''));
const referenceId = requiredString.regex(/^[a-zA-Z0-9-]+$/, 'Use letters, numbers, and hyphens');
const money = z.coerce.number().positive('Must be greater than 0');
const rate = z.coerce.number().min(0.01).max(25);
const pastDate = requiredString.refine((value) => parseISO(value) <= today, 'Date cannot be in the future');
const dayOfMonth = z.coerce.number().int().min(1).max(28);
const status = z.enum(['active', 'closed', 'matured', 'archived']).default('active');
const base = {
  memberId: requiredString,
  referenceId,
  status,
  description: optionalText
};

export const memberSchema = z.object({
  name: requiredString.max(100),
  relationship: z.enum(relationships as [string, ...string[]]),
  dob: z.string().optional().or(z.literal('')),
  pan: z.string().max(10).optional().or(z.literal('')),
  color: requiredString,
  notes: z.string().max(500).optional().or(z.literal('')),
  gender: z.enum(['female', 'male', 'other', 'unspecified']).default('unspecified')
});

export const instrumentSchemas = {
  fd: z
    .object({
      ...base,
      type: z.literal('fd'),
      bankName: requiredString.max(100),
      startDate: pastDate,
      termEndDate: z.string().optional().or(z.literal('')),
      periodYears: z.coerce.number().int().min(0).max(100).optional(),
      periodMonths: z.coerce.number().int().min(0).max(1200).optional(),
      periodDays: z.coerce.number().int().min(0).max(36600).optional(),
      interestRate: rate,
      principalAmount: money,
      payoutFrequency: z.enum(payoutFrequencies as [string, ...string[]])
    })
    .refine((value) => value.termEndDate || value.periodYears || value.periodMonths || value.periodDays, {
      path: ['termEndDate'],
      message: 'Set an end date or a time period'
    }),
  rd: z.object({
    ...base,
    type: z.literal('rd'),
    bankName: requiredString.max(100),
    startDate: pastDate,
    numberOfMonths: z.coerce.number().int().min(1).max(240),
    emiDate: dayOfMonth,
    interestRate: rate,
    monthlyInstalment: money
  }),
  stock: z.object({
    ...base,
    type: z.literal('stock'),
    companyName: requiredString.max(200),
    tickerSymbol: requiredString.max(20).transform((value) => value.toUpperCase()),
    exchange: z.enum(exchanges as [string, ...string[]]),
    purchaseDate: pastDate,
    quantity: z.coerce.number().positive(),
    averageBuyPrice: money,
    currentPrice: money,
    estimatedXirr: z.coerce.number().min(-100).max(200).optional().or(z.literal('') as any)
  }),
  mfLumpsum: z.object({
    ...base,
    type: z.literal('mfLumpsum'),
    fundName: requiredString.max(200),
    amfiCode: z.string().regex(/^\d*$/, 'Numeric only').optional().or(z.literal('')),
    investmentDate: pastDate,
    unitsPurchased: z.coerce.number().positive(),
    navAtPurchase: money,
    currentNav: money,
    estimatedXirr: z.coerce.number().min(-100).max(200).optional().or(z.literal('') as any)
  }),
  mfSip: z.object({
    ...base,
    type: z.literal('mfSip'),
    fundName: requiredString.max(200),
    amfiCode: z.string().regex(/^\d*$/, 'Numeric only').optional().or(z.literal('')),
    startDate: pastDate,
    monthlyInstalment: money,
    instalmentDay: dayOfMonth,
    currentInstalmentCount: z.coerce.number().int().min(1),
    currentAccumulatedValue: money,
    estimatedXirr: z.coerce.number().min(-100).max(200).optional().or(z.literal('') as any)
  }),
  loan: z
    .object({
      ...base,
      type: z.literal('loan'),
      loanName: requiredString.max(200),
      loanType: z.enum(loanTypes as [string, ...string[]]),
      sanctionedAmount: money,
      loanStartDate: pastDate,
      tenureMonths: z.coerce.number().int().min(1).max(360),
      monthlyEmi: money,
      emiDate: dayOfMonth,
      interestRate: z.coerce.number().min(0.01).max(50),
      outstandingPrincipal: money
    })
    .refine((value) => value.outstandingPrincipal <= value.sanctionedAmount, {
      path: ['outstandingPrincipal'],
      message: 'Cannot exceed sanctioned amount'
    }),
  termInsurance: z.object({
    ...base,
    type: z.literal('termInsurance'),
    insurerName: requiredString.max(200),
    policyName: requiredString.max(200),
    sumAssured: money,
    annualPremium: money,
    premiumFrequency: z.enum(premiumFrequencies as [string, ...string[]]),
    premiumDueDate: requiredString,
    policyStartDate: pastDate,
    policyTermYears: z.coerce.number().int().min(5).max(40),
    nominee: z.string().max(200).optional().or(z.literal(''))
  }),
  ppf: z.object({
    ...base,
    type: z.literal('ppf'),
    institutionName: requiredString.max(200),
    accountOpenDate: pastDate,
    currentBalance: money,
    financialYearContribution: z.coerce.number().min(500).max(150000),
    estimatedRoi: z.coerce.number().min(5).max(12).default(7.1)
  }),
  ssa: z.object({
    ...base,
    type: z.literal('ssa'),
    institutionName: requiredString.max(200),
    accountOpenDate: pastDate,
    currentBalance: money,
    financialYearContribution: z.coerce.number().min(250).max(150000),
    estimatedRoi: z.coerce.number().min(5).max(12).default(8.2)
  }),
  otherSavings: z.object({
    ...base,
    type: z.literal('otherSavings'),
    name: requiredString.max(200),
    category: z.enum(savingsCategories as [string, ...string[]]),
    currentAmount: money,
    roiRate: z.coerce.number().min(0).max(50).optional().or(z.literal('') as any)
  })
};

export const validateInstrument = (
  type: InstrumentType,
  value: unknown,
  allInstruments: InstrumentInput[],
  members: FamilyMember[],
  currentReferenceId?: string
) => {
  const parsed = instrumentSchemas[type].safeParse(value);
  if (!parsed.success) return parsed;

  const instrument = parsed.data as InstrumentInput;
  const duplicate = allInstruments.some(
    (item) =>
      item.type === type &&
      item.referenceId.toLowerCase() === instrument.referenceId.toLowerCase() &&
      item.referenceId !== currentReferenceId
  );
  if (duplicate) {
    return {
      success: false as const,
      error: new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: 'Reference ID must be unique within this instrument type',
          path: ['referenceId']
        }
      ])
    };
  }

  if (type === 'ssa') {
    const member = members.find((item) => item.id === instrument.memberId);
    const ageAtOpening =
      member?.dob && (instrument as any).accountOpenDate
        ? differenceInYears(parseISO((instrument as any).accountOpenDate), parseISO(member.dob))
        : undefined;
    if (!member?.dob || member.gender !== 'female' || ageAtOpening === undefined || ageAtOpening >= 10) {
      return {
        success: false as const,
        error: new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: 'SSA requires a female beneficiary with DOB and age below 10 at opening',
            path: ['memberId']
          }
        ])
      };
    }
  }

  return parsed;
};
