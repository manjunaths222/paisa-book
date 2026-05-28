import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, isAfter, isWithinInterval, setDate } from 'date-fns';
import { Button, Card, EmptyState, FilterPills, PageHeader, SkeletonCard } from '../../shared/components/ui';
import { useAuth } from '../../shared/hooks/useAuth';
import { useInstruments, useMembers } from '../../shared/hooks/useFamilyData';
import {
  assetValueForType,
  currentInstrumentValue,
  insuranceCoverage,
  maturityDateForInstrument,
  projectInstrument
} from '../../lib/calc/finance';
import { formatCurrency, formatDate } from '../../lib/format';
import { instrumentLabels, instrumentTypes } from '../../types/catalog';
import { Instrument } from '../../types/finance';
import { instrumentName } from '../instruments/instrumentFormConfig';
import { OnboardingModal } from './OnboardingModal';

const colors = ['#0f766e', '#4f46e5', '#0891b2', '#db2777', '#f59e0b', '#64748b'];

export function DashboardPage() {
  const { user } = useAuth();
  const { instruments, loading } = useInstruments();
  const { members } = useMembers();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const visible = useMemo(
    () => instruments.filter((instrument) => instrument.status !== 'archived' && (!memberIds.length || memberIds.includes(instrument.memberId))),
    [instruments, memberIds]
  );
  const totals = useMemo(() => {
    const netWorth = visible.reduce((sum, instrument) => sum + currentInstrumentValue(instrument), 0);
    const depositTotal = assetValueForType('fd', visible) + assetValueForType('rd', visible);
    const investmentTotal =
      assetValueForType('stock', visible) +
      assetValueForType('mfLumpsum', visible) +
      assetValueForType('mfSip', visible) +
      assetValueForType('ppf', visible) +
      assetValueForType('ssa', visible) +
      assetValueForType('otherSavings', visible);
    const loanOutstanding = visible.reduce((sum, instrument) => (instrument.type === 'loan' ? sum + instrument.outstandingPrincipal : sum), 0);
    return { netWorth, depositTotal, investmentTotal, loanOutstanding, coverage: insuranceCoverage(visible) };
  }, [visible]);
  const byType = instrumentTypes
    .map((type) => ({ name: instrumentLabels[type], value: Math.max(0, assetValueForType(type, visible)) }))
    .filter((item) => item.value > 0);
  const byMember = members
    .map((member) => ({
      name: member.name,
      value: visible.filter((instrument) => instrument.memberId === member.id).reduce((sum, instrument) => sum + Math.max(currentInstrumentValue(instrument), 0), 0)
    }))
    .filter((item) => item.value > 0);
  const obligations = upcomingObligations(visible);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="A real-time view of net worth, asset mix, family ownership, obligations, and recent activity."
        action={
          <Link to="/instruments/add">
            <Button>Add Instrument</Button>
          </Link>
        }
      />
      <OnboardingModal />
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : instruments.length === 0 ? (
        <EmptyState title="Start your family ledger" description="Add a financial instrument to populate net worth, charts, obligations, and projections." ctaLabel="Add first instrument" to="/instruments/add" />
      ) : (
        <div className="space-y-5">
          <Card className="p-4">
            <FilterPills values={members.map((member) => member.id)} selected={memberIds} onChange={setMemberIds} labelFor={(value) => members.find((member) => member.id === value)?.name ?? value} />
          </Card>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Stat label="Net Worth" value={formatCurrency(totals.netWorth, user?.currency)} emphasis />
            <Stat label="FD/RD Value" value={formatCurrency(totals.depositTotal, user?.currency)} />
            <Stat label="Investments & Savings" value={formatCurrency(totals.investmentTotal, user?.currency)} />
            <Stat label="Loan Outstanding" value={formatCurrency(totals.loanOutstanding, user?.currency)} danger />
            <Stat label="Insurance Coverage" value={formatCurrency(totals.coverage, user?.currency)} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 font-bold text-slate-950">Asset Breakdown</h2>
              {byType.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byType} dataKey="value" nameKey="name" innerRadius={58} outerRadius={95}>
                        {byType.map((_, index) => (
                          <Cell key={index} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value), user?.currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyPanel title="No assets to chart" description="Add deposits, investments, PPF, SSA, or savings to populate this breakdown." />
              )}
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 font-bold text-slate-950">By Family Member</h2>
              {byMember.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byMember} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                      <YAxis type="category" dataKey="name" width={90} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value), user?.currency)} />
                      <Bar dataKey="value" fill="#0f766e" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyPanel title="No member allocation yet" description="Assets assigned to family members will appear here." />
              )}
            </Card>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 font-bold text-slate-950">Upcoming Obligations</h2>
              <div className="space-y-3">
                {obligations.length === 0 ? <p className="text-sm text-slate-500">No loan EMI, insurance premium, maturity, or SIP instalment due soon.</p> : obligations.map((item) => (
                  <div key={`${item.referenceId}-${item.kind}-${item.date}`} className="flex justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <span className="ml-2 text-xs font-semibold text-teal-700">{item.kind}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{item.referenceId}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold text-slate-900">{formatCurrency(item.amount, user?.currency)}</span>
                      <span className="text-xs text-slate-500">{formatDate(item.date)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 font-bold text-slate-950">Recent Activity</h2>
              <div className="space-y-3">
                {visible.slice(0, 10).map((instrument) => (
                  <div key={instrument.id} className="flex justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-800">{instrumentName(instrument)}</span>
                    <span className="shrink-0 text-slate-500">{formatDate(instrument.updatedAt)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, emphasis, danger }: { label: string; value: string; emphasis?: boolean; danger?: boolean }) {
  return (
    <Card className={`p-5 ${emphasis ? 'bg-teal-700 text-white' : ''}`}>
      <p className={`text-sm font-semibold ${emphasis ? 'text-teal-50' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-2 text-2xl font-black ${danger ? 'text-rose-600' : emphasis ? 'text-white' : 'text-slate-950'}`}>{value}</p>
    </Card>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-2 max-w-xs text-sm text-slate-500">{description}</p>
    </div>
  );
}

function upcomingObligations(instruments: Instrument[]) {
  const start = new Date();
  const nextDateForDay = (day: number) => {
    const thisMonth = setDate(start, day);
    return isAfter(thisMonth, start) ? thisMonth : setDate(addDays(start, 32), day);
  };
  const within = (date: string, days: number) =>
    isWithinInterval(new Date(date), { start, end: addDays(start, days) });
  const monthsUntil = (date: string) => Math.max(0, differenceInCalendarDays(new Date(date), start) / 30.4375);
  const premiumInstallment = (instrument: Extract<Instrument, { type: 'termInsurance' }>) => {
    if (instrument.premiumFrequency === 'Monthly') return instrument.annualPremium / 12;
    if (instrument.premiumFrequency === 'Quarterly') return instrument.annualPremium / 4;
    if (instrument.premiumFrequency === 'Half-Yearly') return instrument.annualPremium / 2;
    return instrument.annualPremium;
  };
  return instruments
    .flatMap((instrument) => {
      if (instrument.type === 'loan') {
        return [{
          name: instrument.loanName,
          kind: 'Loan EMI',
          referenceId: instrument.referenceId,
          amount: instrument.monthlyEmi,
          date: format(nextDateForDay(instrument.emiDate), 'yyyy-MM-dd')
        }];
      }
      if (instrument.type === 'termInsurance') {
        return [{
          name: instrument.policyName,
          kind: 'Insurance premium',
          referenceId: instrument.referenceId,
          amount: premiumInstallment(instrument),
          date: instrument.premiumDueDate
        }];
      }
      if (instrument.type === 'mfSip') {
        return [{
          name: instrument.fundName,
          kind: 'MF SIP instalment',
          referenceId: instrument.referenceId,
          amount: instrument.monthlyInstalment,
          date: format(nextDateForDay(instrument.instalmentDay), 'yyyy-MM-dd')
        }];
      }
      if (instrument.type === 'fd' || instrument.type === 'rd') {
        const maturity = maturityDateForInstrument(instrument);
        return maturity ? [{
          name: instrumentName(instrument),
          kind: `${instrumentLabels[instrument.type]} maturity`,
          referenceId: instrument.referenceId,
          amount: projectInstrument(instrument, monthsUntil(maturity), { autoRenewDeposits: false }),
          date: maturity
        }] : [];
      }
      return [];
    })
    .filter((item) => {
      if (item.kind === 'Loan EMI' || item.kind === 'Insurance premium') return within(item.date, 90);
      if (item.kind === 'MF SIP instalment') return within(item.date, 30);
      return within(item.date, 60);
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
