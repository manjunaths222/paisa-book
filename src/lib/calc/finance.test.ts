import { describe, expect, it } from 'vitest';
import { calcEMI, calcFDMaturity, calcRDMaturity, projectPortfolio } from './finance';
import { Instrument } from '../../types/finance';

describe('finance calculations', () => {
  it('calculates EMI with zero interest', () => {
    expect(calcEMI(120000, 0, 12)).toBe(10000);
  });

  it('projects FD maturity for at-maturity payout', () => {
    expect(calcFDMaturity(100000, 7, 12, 'At Maturity')).toBeGreaterThan(107000);
  });

  it('calculates RD maturity above total instalments when rate is positive', () => {
    expect(calcRDMaturity(10000, 7, 12)).toBeGreaterThan(120000);
  });

  it('deducts loan outstanding from projected net worth', () => {
    const instruments: Instrument[] = [
      {
        id: 'loan-1',
        uid: 'u1',
        memberId: 'm1',
        type: 'loan',
        referenceId: 'LN-1',
        status: 'active',
        loanName: 'Home Loan',
        loanType: 'Home',
        sanctionedAmount: 1000000,
        loanStartDate: '2024-01-01',
        tenureMonths: 120,
        monthlyEmi: 12000,
        emiDate: 5,
        interestRate: 8,
        outstandingPrincipal: 900000,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }
    ];
    expect(projectPortfolio(instruments).currentNetWorth).toBe(-900000);
    expect(projectPortfolio(instruments).netWorthByHorizon['12M']).toBeLessThan(0);
  });
});
