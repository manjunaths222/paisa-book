import { describe, expect, it } from 'vitest';
import { buildPortfolioAgentSnapshot, redactQuestionForModel, redactSnapshotForModel } from './portfolioContext';
import { AppUser, FamilyMember, Instrument } from '../../types/finance';

describe('portfolio assistant redaction', () => {
  it('removes PII and sensitive identifiers before model access', () => {
    const snapshot = buildPortfolioAgentSnapshot({
      user,
      members,
      instruments
    });
    const redacted = redactSnapshotForModel(snapshot);
    const payload = JSON.stringify(redacted);

    expect(payload).not.toContain('Aarav');
    expect(payload).not.toContain('PAN');
    expect(payload).not.toContain('FD-CHILD-001');
    expect(payload).not.toContain('HDFC Bank');
    expect(payload).not.toContain('Sensitive note');
    expect(payload).toContain('Child 1');
    expect(payload).toContain('Fixed Deposit 1');
  });

  it('redacts known names and references from the question sent to the model', () => {
    const snapshot = buildPortfolioAgentSnapshot({
      user,
      members,
      instruments
    });

    const question = redactQuestionForModel('Can Aarav use FD-CHILD-001 at HDFC Bank for school fees?', snapshot);

    expect(question).not.toContain('Aarav');
    expect(question).not.toContain('FD-CHILD-001');
    expect(question).not.toContain('HDFC Bank');
    expect(question).toContain('Child 1');
    expect(question).toContain('Fixed Deposit 1');
  });
});

const user: AppUser = {
  uid: 'uid-secret',
  email: 'family@example.com',
  displayName: 'Family Admin',
  currency: 'INR',
  autoRenewDeposits: true,
  onboardingComplete: true,
  createdAt: '2025-01-01',
  lastLoginAt: '2026-01-01'
};

const members: FamilyMember[] = [
  {
    id: 'member-secret',
    uid: user.uid,
    name: 'Aarav',
    relationship: 'Child',
    dob: '2018-01-01',
    pan: 'PAN1234567',
    color: '#0f766e',
    gender: 'male',
    isSelf: false,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  }
];

const instruments: Instrument[] = [
  {
    id: 'instrument-secret',
    uid: user.uid,
    memberId: members[0].id,
    type: 'fd',
    referenceId: 'FD-CHILD-001',
    status: 'active',
    description: 'Sensitive note with account details',
    bankName: 'HDFC Bank',
    startDate: '2025-01-01',
    termEndDate: '2026-01-01',
    interestRate: 6.5,
    principalAmount: 100000,
    payoutFrequency: 'At Maturity',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  }
];
