import { describe, expect, it } from 'vitest';
import { addMonths, format } from 'date-fns';
import { calcEMI, calcFDMaturity, calcRDMaturity, maturityDateForInstrument, projectPortfolio } from './finance';
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

  it('includes days when calculating FD maturity date', () => {
    const maturity = maturityDateForInstrument({
      id: 'fd-1',
      uid: 'u1',
      memberId: 'm1',
      type: 'fd',
      referenceId: 'FD-1',
      status: 'active',
      bankName: 'Bank',
      startDate: '2024-01-01',
      periodYears: 1,
      periodMonths: 2,
      periodDays: 10,
      interestRate: 7,
      principalAmount: 100000,
      payoutFrequency: 'At Maturity',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    });
    expect(maturity).toBe('2025-03-11');
  });

  it('returns no FD maturity date for incomplete duration fields', () => {
    const maturity = maturityDateForInstrument({
      id: 'fd-2',
      uid: 'u1',
      memberId: 'm1',
      type: 'fd',
      referenceId: 'FD-2',
      status: 'active',
      bankName: 'Bank',
      startDate: '2024-01-01',
      interestRate: 7,
      principalAmount: 100000,
      payoutFrequency: 'At Maturity',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    });
    expect(maturity).toBeUndefined();
  });

  it('changes FD projection when auto-renew is disabled after maturity', () => {
    const termEndDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
    const instruments: Instrument[] = [
      {
        id: 'fd-3',
        uid: 'u1',
        memberId: 'm1',
        type: 'fd',
        referenceId: 'FD-3',
        status: 'active',
        bankName: 'Bank',
        startDate: '2024-01-01',
        termEndDate,
        interestRate: 12,
        principalAmount: 100000,
        payoutFrequency: 'At Maturity',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }
    ];
    const renewed = projectPortfolio(instruments, undefined, { autoRenewDeposits: true });
    const bounded = projectPortfolio(instruments, undefined, { autoRenewDeposits: false });
    expect(renewed.netWorthByHorizon['12M']).toBeGreaterThan(bounded.netWorthByHorizon['12M']);
  });

  it('applies FD auto-renew projection even when payout frequency is periodic', () => {
    const termEndDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
    const instruments: Instrument[] = [
      {
        id: 'fd-4',
        uid: 'u1',
        memberId: 'm1',
        type: 'fd',
        referenceId: 'FD-4',
        status: 'active',
        bankName: 'Bank',
        startDate: '2024-01-01',
        termEndDate,
        interestRate: 12,
        principalAmount: 100000,
        payoutFrequency: 'Monthly',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }
    ];
    const renewed = projectPortfolio(instruments, undefined, { autoRenewDeposits: true });
    expect(renewed.netWorthByHorizon['12M']).toBeGreaterThan(100000);
  });

  it('changes RD projection when auto-renew is enabled beyond the first term', () => {
    const instruments: Instrument[] = [
      {
        id: 'rd-1',
        uid: 'u1',
        memberId: 'm1',
        type: 'rd',
        referenceId: 'RD-1',
        status: 'active',
        bankName: 'Bank',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        numberOfMonths: 3,
        emiDate: 5,
        interestRate: 8,
        monthlyInstalment: 10000,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }
    ];
    const renewed = projectPortfolio(instruments, undefined, { autoRenewDeposits: true });
    const bounded = projectPortfolio(instruments, undefined, { autoRenewDeposits: false });
    expect(renewed.netWorthByHorizon['12M']).toBeGreaterThan(bounded.netWorthByHorizon['12M']);
  });
});
