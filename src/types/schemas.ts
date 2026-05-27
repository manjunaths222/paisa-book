import { differenceInYears, isAfter, isValid, parseISO } from 'date-fns';
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

const requiredString = z.string().trim().min(1, 'Required');
const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;
const optionalText = (max = 500) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `Maximum ${max} characters`).optional());
const optionalNumber = (schema: z.ZodNumber) => z.preprocess(emptyToUndefined, schema.optional());
const referenceId = requiredString.regex(/^[a-zA-Z0-9-]+$/, 'Use letters, numbers, and hyphens');
const money = z.coerce.number().positive('Must be greater than 0');
const rate = z.coerce.number().min(0.01).max(25);
const dateString = requiredString.refine((value) => isValid(parseISO(value)), 'Enter a valid date');
const pastDate = dateString.refine((value) => !isAfter(parseISO(value), new Date()), 'Date cannot be in the future');
const dayOfMonth = z.coerce.number().int().min(1).max(28);
const status = z.enum(['active', 'closed', 'matured', 'archived']).default('active');
const base = {
  memberId: requiredString,
  referenceId,
  status,
  description: optionalText()
};

export const memberSchema = z.object({
  name: requiredString.max(100),
  relationship: z.enum(relationships as [string, ...string[]]),
  dob: optionalText(10),
  pan: optionalText(10),
  color: requiredString,
  notes: optionalText(),
  gender: z.enum(['female', 'male', 'other', 'unspecified']).default('unspecified')
});

export const instrumentSchemas = {
  fd: z
    .object({
      ...base,
      type: z.literal('fd'),
      bankName: requiredString.max(100),
      startDate: pastDate,
      termEndDate: z.preprocess(emptyToUndefined, dateString.optional()),
      periodYears: optionalNumber(z.coerce.number().int().min(0).max(100)),
      periodMonths: optionalNumber(z.coerce.number().int().min(0).max(1200)),
      periodDays: optionalNumber(z.coerce.number().int().min(0).max(36600)),
      interestRate: rate,
      principalAmount: money,
      payoutFrequency: z.enum(payoutFrequencies as [string, ...string[]])
    })
    .refine((value) => {
      const hasTermEnd = Boolean(value.termEndDate);
      const hasPeriod = [value.periodYears, value.periodMonths, value.periodDays].some((item) => Number(item ?? 0) > 0);
      return hasTermEnd !== hasPeriod;
    }, {
      path: ['termEndDate'],
      message: 'Set either a term end date or a positive time period'
    })
    .refine((value) => !value.termEndDate || isAfter(parseISO(value.termEndDate), parseISO(value.startDate)), {
      path: ['termEndDate'],
      message: 'Term end date must be after start date'
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
    estimatedXirr: optionalNumber(z.coerce.number().min(-100).max(200))
  }),
  mfLumpsum: z.object({
    ...base,
    type: z.literal('mfLumpsum'),
    fundName: requiredString.max(200),
    amfiCode: z.preprocess(emptyToUndefined, z.string().regex(/^\d+$/, 'Numeric only').optional()),
    investmentDate: pastDate,
    unitsPurchased: z.coerce.number().positive(),
    navAtPurchase: money,
    currentNav: money,
    estimatedXirr: optionalNumber(z.coerce.number().min(-100).max(200))
  }),
  mfSip: z.object({
    ...base,
    type: z.literal('mfSip'),
    fundName: requiredString.max(200),
    amfiCode: z.preprocess(emptyToUndefined, z.string().regex(/^\d+$/, 'Numeric only').optional()),
    startDate: pastDate,
    monthlyInstalment: money,
    instalmentDay: dayOfMonth,
    currentInstalmentCount: z.coerce.number().int().min(1),
    currentAccumulatedValue: money,
    estimatedXirr: optionalNumber(z.coerce.number().min(-100).max(200))
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
    nominee: optionalText(200)
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
    roiRate: optionalNumber(z.coerce.number().min(0).max(50))
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
