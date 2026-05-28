import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  FilterPills,
  Modal,
  PageHeader,
  SkeletonCard,
  inputClass
} from '../../shared/components/ui';
import { useAuth } from '../../shared/hooks/useAuth';
import { useInstruments, useMembers } from '../../shared/hooks/useFamilyData';
import { instrumentLabels, instrumentTypes } from '../../types/catalog';
import { Instrument, InstrumentType } from '../../types/finance';
import { firestoreService } from '../../lib/firestore/service';
import { useUiStore } from '../../shared/stores/uiStore';
import { formatCurrency, formatDate } from '../../lib/format';
import { currentInstrumentValue, maturityDateForInstrument, projectInstrument } from '../../lib/calc/finance';
import { instrumentName, primaryAmount } from './instrumentFormConfig';

const projectionMonths = [3, 6, 9, 12, 24, 36, 60];

export function InstrumentsPage() {
  const { user } = useAuth();
  const { instruments, loading } = useInstruments();
  const { members } = useMembers();
  const [types, setTypes] = useState<InstrumentType[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Instrument | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pushToast = useUiStore((state) => state.pushToast);
  const filtered = useMemo(
    () =>
      instruments.filter((instrument) => {
        const typeOk = !types.length || types.includes(instrument.type);
        const memberOk = !memberIds.length || memberIds.includes(instrument.memberId);
        const searchOk =
          !search ||
          `${instrumentName(instrument)} ${instrument.referenceId}`.toLowerCase().includes(search.toLowerCase());
        return instrument.status !== 'archived' && typeOk && memberOk && searchOk;
      }).sort((a, b) => {
        const aMaturity = maturityDateForInstrument(a);
        const bMaturity = maturityDateForInstrument(b);
        if (aMaturity && bMaturity) return new Date(aMaturity).getTime() - new Date(bMaturity).getTime();
        if (aMaturity) return -1;
        if (bMaturity) return 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      }),
    [instruments, memberIds, search, types]
  );

  const remove = async () => {
    if (!user || !pendingDelete) return;
    setDeleting(true);
    try {
      await firestoreService.deleteInstrument(user.uid, pendingDelete.id);
      pushToast({ type: 'success', message: 'Instrument deleted' });
      setPendingDelete(null);
    } catch (error) {
      pushToast({ type: 'error', message: error instanceof Error ? error.message : 'Delete failed' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Instruments"
        subtitle="Filter, search, edit, and delete all family financial instruments."
        action={
          <Link to="/instruments/add">
            <Button>
              <Plus className="h-4 w-4" />
              Add Instrument
            </Button>
          </Link>
        }
      />
      <Card className="mb-5 space-y-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input
            className={`${inputClass} pl-10`}
            placeholder="Search by name or reference ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <FilterPills values={instrumentTypes} selected={types} onChange={setTypes} labelFor={(value) => instrumentLabels[value]} />
        <FilterPills values={members.map((member) => member.id)} selected={memberIds} onChange={setMemberIds} labelFor={(value) => members.find((member) => member.id === value)?.name ?? value} />
      </Card>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No instruments yet" description="Add your first deposit, investment, loan, insurance policy, or savings account." ctaLabel="Add instrument" to="/instruments/add" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((instrument) => {
            const member = members.find((item) => item.id === instrument.memberId);
            const maturity = maturityDateForInstrument(instrument);
            const openedDate = instrumentOpenDate(instrument);
            const bucket = maturityBucket(maturity);
            return (
              <Card
                key={instrument.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedInstrument(instrument)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setSelectedInstrument(instrument);
                }}
                className={`cursor-pointer p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${bucket.cardClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={instrument.type === 'loan' ? 'rose' : 'teal'}>{instrumentLabels[instrument.type]}</Badge>
                      {bucket.label ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${bucket.badgeClass}`}>{bucket.label}</span> : null}
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-slate-950">{instrumentName(instrument)}</h2>
                    <p className="mt-1 text-sm text-slate-500">{instrument.referenceId}</p>
                  </div>
                  <div className="flex gap-1">
                    <Link
                      to={`/instruments/${instrument.id}/edit`}
                      onClick={(event) => event.stopPropagation()}
                      className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                      aria-label="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingDelete(instrument);
                      }}
                      className="rounded-md p-2 text-rose-600 hover:bg-rose-50"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">{primaryLabel(instrument)}</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{primaryAmount(instrument, user?.currency ?? 'INR')}</p>
                    {instrument.type === 'rd' ? (
                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        Monthly {formatCurrency(instrument.monthlyInstalment, user?.currency ?? 'INR')}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-slate-900">{member?.name ?? 'Unknown member'}</p>
                    {maturity ? <p className="mt-1 font-bold text-teal-700">Maturity {formatDate(maturity)}</p> : null}
                    {openedDate ? <p className="mt-1 text-slate-500">{openDateLabel(instrument)} {formatDate(openedDate)}</p> : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ConfirmModal open={Boolean(pendingDelete)} itemName={pendingDelete ? instrumentName(pendingDelete) : ''} onClose={() => setPendingDelete(null)} onConfirm={remove} loading={deleting} />
      <Modal open={Boolean(selectedInstrument)} title={selectedInstrument ? instrumentName(selectedInstrument) : ''} onClose={() => setSelectedInstrument(null)}>
        {selectedInstrument ? (
          <InstrumentProjectionDetail
            instrument={selectedInstrument}
            memberName={members.find((item) => item.id === selectedInstrument.memberId)?.name ?? 'Unknown member'}
            currency={user?.currency ?? 'INR'}
            autoRenewDeposits={user?.autoRenewDeposits ?? true}
          />
        ) : null}
      </Modal>
    </>
  );
}

function InstrumentProjectionDetail({
  instrument,
  memberName,
  currency,
  autoRenewDeposits
}: {
  instrument: Instrument;
  memberName: string;
  currency: NonNullable<ReturnType<typeof useAuth>['user']>['currency'];
  autoRenewDeposits: boolean;
}) {
  const maturity = maturityDateForInstrument(instrument);
  const maturityEstimate = maturity
    ? projectInstrument(instrument, Math.max(0, (new Date(maturity).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.4375)), {
        autoRenewDeposits: false
      })
    : undefined;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Member" value={memberName} />
        <Info label="Reference ID" value={instrument.referenceId} />
        <Info label="Current value" value={formatCurrency(currentInstrumentValue(instrument), currency)} />
        {maturity ? <Info label="Maturity date" value={formatDate(maturity)} /> : null}
        {maturityEstimate !== undefined ? <Info label="Estimated maturity value" value={formatCurrency(maturityEstimate, currency)} /> : null}
        {instrumentOpenDate(instrument) ? <Info label={openDateLabel(instrument)} value={formatDate(instrumentOpenDate(instrument))} /> : null}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Horizon</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Projected value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projectionMonths.map((months) => (
              <tr key={months}>
                <td className="px-4 py-3 font-medium text-slate-800">+{months}M</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-950">
                  {formatCurrency(projectInstrument(instrument, months, { autoRenewDeposits }), currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Projections use the saved rates and current values for this instrument. FD/RD rows follow your global auto-renew setting.
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  );
}

function instrumentOpenDate(instrument: Instrument) {
  switch (instrument.type) {
    case 'fd':
    case 'rd':
    case 'mfSip':
      return instrument.startDate;
    case 'stock':
      return instrument.purchaseDate;
    case 'mfLumpsum':
      return instrument.investmentDate;
    case 'loan':
      return instrument.loanStartDate;
    case 'termInsurance':
      return instrument.policyStartDate;
    case 'ppf':
    case 'ssa':
      return instrument.accountOpenDate;
    default:
      return undefined;
  }
}

function openDateLabel(instrument: Instrument) {
  if (instrument.type === 'stock') return 'Purchased';
  if (instrument.type === 'loan') return 'Started';
  if (instrument.type === 'termInsurance') return 'Policy start';
  return 'Opened';
}

function primaryLabel(instrument: Instrument) {
  if (instrument.type === 'fd') return 'Principal amount';
  if (instrument.type === 'rd') return 'Current value';
  if (instrument.type === 'loan') return 'Outstanding';
  if (instrument.type === 'termInsurance') return 'Coverage';
  return 'Primary amount';
}

function maturityBucket(maturity?: string) {
  if (!maturity) return { cardClass: '', badgeClass: '', label: '' };
  const days = Math.ceil((new Date(maturity).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return { cardClass: 'border-slate-300 bg-slate-50', badgeClass: 'bg-slate-200 text-slate-700', label: 'Matured' };
  if (days <= 90) return { cardClass: 'border-rose-200 bg-rose-50/50', badgeClass: 'bg-rose-100 text-rose-700', label: '< 3M' };
  if (days <= 180) return { cardClass: 'border-amber-200 bg-amber-50/50', badgeClass: 'bg-amber-100 text-amber-700', label: '3-6M' };
  if (days <= 270) return { cardClass: 'border-sky-200 bg-sky-50/50', badgeClass: 'bg-sky-100 text-sky-700', label: '6-9M' };
  if (days <= 365) return { cardClass: 'border-indigo-200 bg-indigo-50/50', badgeClass: 'bg-indigo-100 text-indigo-700', label: '9-12M' };
  return { cardClass: 'border-emerald-200 bg-emerald-50/40', badgeClass: 'bg-emerald-100 text-emerald-700', label: '1Y+' };
}
