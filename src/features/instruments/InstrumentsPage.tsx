import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, ConfirmModal, EmptyState, FilterPills, PageHeader, SkeletonCard, inputClass } from '../../shared/components/ui';
import { useAuth } from '../../shared/hooks/useAuth';
import { useInstruments, useMembers } from '../../shared/hooks/useFamilyData';
import { instrumentLabels, instrumentTypes } from '../../types/catalog';
import { Instrument, InstrumentType } from '../../types/finance';
import { firestoreService } from '../../lib/firestore/service';
import { useUiStore } from '../../shared/stores/uiStore';
import { formatDate } from '../../lib/format';
import { maturityDateForInstrument } from '../../lib/calc/finance';
import { instrumentName, primaryAmount } from './instrumentFormConfig';

export function InstrumentsPage() {
  const { user } = useAuth();
  const { instruments, loading } = useInstruments();
  const { members } = useMembers();
  const [types, setTypes] = useState<InstrumentType[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Instrument | null>(null);
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
            return (
              <Card key={instrument.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge tone={instrument.type === 'loan' ? 'rose' : 'teal'}>{instrumentLabels[instrument.type]}</Badge>
                    <h2 className="mt-3 text-lg font-bold text-slate-950">{instrumentName(instrument)}</h2>
                    <p className="mt-1 text-sm text-slate-500">{instrument.referenceId}</p>
                  </div>
                  <div className="flex gap-1">
                    <Link to={`/instruments/${instrument.id}/edit`} className="rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Edit">
                      <Edit2 className="h-4 w-4" />
                    </Link>
                    <button type="button" onClick={() => setPendingDelete(instrument)} className="rounded-md p-2 text-rose-600 hover:bg-rose-50" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Primary amount</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{primaryAmount(instrument, user?.currency ?? 'INR')}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{member?.name ?? 'Unknown member'}</p>
                    {maturity ? <p>Maturity {formatDate(maturity)}</p> : null}
                    <p>Updated {formatDate(instrument.updatedAt)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ConfirmModal open={Boolean(pendingDelete)} itemName={pendingDelete ? instrumentName(pendingDelete) : ''} onClose={() => setPendingDelete(null)} onConfirm={remove} loading={deleting} />
    </>
  );
}
