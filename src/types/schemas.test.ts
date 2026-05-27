import { addMonths, format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { validateInstrument } from './schemas';

const members = [
  {
    id: 'm1',
    uid: 'u1',
    name: 'Self',
    relationship: 'Self' as const,
    color: '#0f766e',
    gender: 'unspecified' as const,
    isSelf: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
];

const baseFd = {
  type: 'fd',
  memberId: 'm1',
  referenceId: 'FD-1',
  status: 'active',
  bankName: 'Bank',
  startDate: '2024-01-01',
  interestRate: 7,
  principalAmount: 100000,
  payoutFrequency: 'At Maturity'
};

describe('instrument schemas', () => {
  it('accepts blank optional fields as absent values', () => {
    const parsed = validateInstrument(
      'stock',
      {
        type: 'stock',
        memberId: 'm1',
        referenceId: 'ST-1',
        status: 'active',
        companyName: 'Acme',
        tickerSymbol: 'acme',
        exchange: 'NSE',
        purchaseDate: '2024-01-01',
        quantity: 10,
        averageBuyPrice: 100,
        currentPrice: 120,
        estimatedXirr: '',
        description: ''
      },
      [],
      members
    );

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as { estimatedXirr?: number }).estimatedXirr).toBeUndefined();
      expect(parsed.data.description).toBeUndefined();
    }
  });

  it('accepts a future FD term end date', () => {
    const parsed = validateInstrument(
      'fd',
      { ...baseFd, termEndDate: format(addMonths(new Date(), 6), 'yyyy-MM-dd'), description: '' },
      [],
      members
    );
    expect(parsed.success).toBe(true);
  });

  it('requires FD term end date or a positive period', () => {
    const parsed = validateInstrument('fd', baseFd, [], members);
    expect(parsed.success).toBe(false);
  });

  it('rejects FD with both term end date and period', () => {
    const parsed = validateInstrument(
      'fd',
      { ...baseFd, termEndDate: format(addMonths(new Date(), 6), 'yyyy-MM-dd'), periodYears: 1 },
      [],
      members
    );
    expect(parsed.success).toBe(false);
  });
});
