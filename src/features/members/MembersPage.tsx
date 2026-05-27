import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, ConfirmModal, EmptyState, Field, Modal, PageHeader, inputClass } from '../../shared/components/ui';
import { useAuth } from '../../shared/hooks/useAuth';
import { useInstruments, useMembers } from '../../shared/hooks/useFamilyData';
import { memberColors, relationships } from '../../types/catalog';
import { FamilyMember } from '../../types/finance';
import { memberSchema } from '../../types/schemas';
import { firestoreService } from '../../lib/firestore/service';
import { useUiStore } from '../../shared/stores/uiStore';
import { formatDate } from '../../lib/format';

type FormValues = {
  name: string;
  relationship: string;
  dob?: string;
  pan?: string;
  color: string;
  gender: 'female' | 'male' | 'other' | 'unspecified';
  notes?: string;
};

const defaults: FormValues = {
  name: '',
  relationship: 'Child',
  dob: '',
  pan: '',
  color: memberColors[1],
  gender: 'unspecified',
  notes: ''
};

export function MembersPage() {
  const { user } = useAuth();
  const { members } = useMembers();
  const { instruments } = useInstruments();
  const pushToast = useUiStore((state) => state.pushToast);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [deleting, setDeleting] = useState<FamilyMember | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { register, handleSubmit, reset, watch, setValue } = useForm<FormValues>({ defaultValues: defaults });

  const openNew = () => {
    setEditing(null);
    setErrors({});
    reset(defaults);
    setModalOpen(true);
  };
  const openEdit = (member: FamilyMember) => {
    setEditing(member);
    setErrors({});
    reset(member);
    setModalOpen(true);
  };
  const save = async (value: FormValues) => {
    if (!user) return;
    const parsed = memberSchema.safeParse(value);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])));
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await firestoreService.updateMember(user.uid, editing.id, parsed.data as any);
        pushToast({ type: 'success', message: 'Member updated' });
      } else {
        await firestoreService.addMember(user.uid, parsed.data as any);
        pushToast({ type: 'success', message: 'Member added' });
      }
      setModalOpen(false);
    } catch (error) {
      pushToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to save member' });
    } finally {
      setSubmitting(false);
    }
  };
  const remove = async () => {
    if (!user || !deleting) return;
    try {
      await firestoreService.deleteMember(user.uid, deleting.id);
      pushToast({ type: 'warning', message: 'Member deleted and related instruments archived' });
      setDeleting(null);
    } catch (error) {
      pushToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to delete member' });
    }
  };

  return (
    <>
      <PageHeader
        title="Family Members"
        subtitle="Manage non-login profiles for everyone whose finances are tracked in this family ledger."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        }
      />
      {members.length === 0 ? (
        <EmptyState title="No members found" description="Your self profile is usually created on first login. Add a member to continue." ctaLabel="Add member" to="/members" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => {
            const count = instruments.filter((instrument) => instrument.memberId === member.id && instrument.status !== 'archived').length;
            return (
              <Card key={member.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white" style={{ background: member.color }}>
                      {member.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-950">{member.name}</h2>
                      <p className="text-sm text-slate-500">{member.relationship}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(member)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Edit member">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {!member.isSelf ? (
                      <button type="button" onClick={() => setDeleting(member)} className="rounded-md p-2 text-rose-600 hover:bg-rose-50" aria-label="Delete member">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">DOB</dt>
                    <dd className="font-semibold text-slate-900">{formatDate(member.dob)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Instruments</dt>
                    <dd className="font-semibold text-slate-900">{count}</dd>
                  </div>
                </dl>
              </Card>
            );
          })}
        </div>
      )}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Member' : 'Add Member'}
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={submitting} onClick={handleSubmit(save)}>
              Save Member
            </Button>
          </div>
        }
      >
        <form className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required error={errors.name}>
            <input className={inputClass} {...register('name')} />
          </Field>
          <Field label="Relationship" required error={errors.relationship}>
            <select className={inputClass} {...register('relationship')} disabled={editing?.isSelf}>
              {relationships.map((relationship) => (
                <option key={relationship}>{relationship}</option>
              ))}
            </select>
          </Field>
          <Field label="Date of birth" error={errors.dob}>
            <input className={inputClass} type="date" {...register('dob')} />
          </Field>
          <Field label="Gender" required error={errors.gender}>
            <select className={inputClass} {...register('gender')}>
              {['unspecified', 'female', 'male', 'other'].map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </Field>
          <Field label="PAN number" error={errors.pan}>
            <input className={inputClass} maxLength={10} {...register('pan')} />
          </Field>
          <Field label="Avatar colour" required error={errors.color}>
            <div className="flex h-11 items-center gap-2">
              {memberColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Use ${color}`}
                  onClick={() => setValue('color', color)}
                  className={`h-8 w-8 rounded-full border-2 ${watch('color') === color ? 'border-slate-950' : 'border-white'}`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes" error={errors.notes}>
              <textarea className={`${inputClass} min-h-24 py-3`} {...register('notes')} />
            </Field>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        open={Boolean(deleting)}
        itemName={deleting ? `${deleting.name}. Related instruments will be archived` : ''}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </>
  );
}
