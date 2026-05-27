import { Controller, useForm } from 'react-hook-form';
import { ArrowLeft, Landmark, Save } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Field, PageHeader, inputClass } from '../../shared/components/ui';
import { useAuth } from '../../shared/hooks/useAuth';
import { useInstruments, useMembers } from '../../shared/hooks/useFamilyData';
import { useUiStore } from '../../shared/stores/uiStore';
import { firestoreService } from '../../lib/firestore/service';
import { instrumentLabels, instrumentTypes } from '../../types/catalog';
import { InstrumentInput, InstrumentType } from '../../types/finance';
import { validateInstrument } from '../../types/schemas';
import {
  computedChips,
  defaultsForType,
  fieldConfigs,
  membersForSelect,
  normalizeFormValue
} from './instrumentFormConfig';

export function InstrumentFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { members } = useMembers();
  const { instruments } = useInstruments();
  const pushToast = useUiStore((state) => state.pushToast);
  const existing = instruments.find((instrument) => instrument.id === id);
  const selfId = members.find((member) => member.isSelf)?.id ?? members[0]?.id ?? '';
  const [type, setType] = useState<InstrumentType>((existing?.type as InstrumentType) ?? 'fd');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, reset, watch, setValue } = useForm<Record<string, any>>({
    defaultValues: defaultsForType(type, selfId)
  });
  const draft = watch();

  useEffect(() => {
    if (existing) {
      setType(existing.type);
      reset(existing);
    } else if (selfId) {
      reset(defaultsForType(type, selfId));
    }
  }, [existing, reset, selfId, type]);

  const memberOptions = useMemo(() => membersForSelect(members), [members]);
  const chips = computedChips(draft, user?.currency ?? 'INR');
  const fdPeriodFields = ['periodYears', 'periodMonths', 'periodDays'];
  const hasFdTermEnd = type === 'fd' && Boolean(draft.termEndDate);
  const hasFdPeriod =
    type === 'fd' && fdPeriodFields.some((fieldName) => Number(draft[fieldName] ?? 0) > 0);

  if (isEdit && instruments.length > 0 && !existing) return <Navigate to="/instruments" replace />;

  const onSelectType = (next: InstrumentType) => {
    setType(next);
    reset(defaultsForType(next, selfId));
  };

  const onSubmit = async (value: Record<string, any>) => {
    if (!user) return;
    const input = normalizeFormValue({ ...value, type }) as InstrumentInput;
    const parsed = validateInstrument(
      type,
      input,
      instruments.filter((instrument) => instrument.id !== id),
      members,
      existing?.referenceId
    );
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message])));
      pushToast({ type: 'error', message: 'Please fix the highlighted fields' });
      return;
    }
    setSubmitting(true);
    try {
      if (existing) {
        await firestoreService.updateInstrument(user.uid, existing.id, parsed.data as any);
        pushToast({ type: 'success', message: 'Instrument updated' });
      } else {
        await firestoreService.addInstrument(user.uid, parsed.data as any);
        pushToast({ type: 'success', message: 'Instrument added' });
      }
      navigate('/instruments');
    } catch (error) {
      pushToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to save instrument' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <PageHeader
        title={isEdit ? 'Edit Instrument' : 'Add Instrument'}
        subtitle="All values are stored against the selected family member and use the account display currency."
        action={
          <Link to="/instruments">
            <Button type="button" variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />
      {!isEdit ? (
        <Card className="mb-6 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {instrumentTypes.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => onSelectType(item)}
                className={`rounded-lg border p-4 text-left transition ${
                  type === item ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <Landmark className="h-5 w-5 text-teal-700" />
                <p className="mt-3 text-sm font-semibold text-slate-950">{instrumentLabels[item]}</p>
              </button>
            ))}
          </div>
        </Card>
      ) : null}
      <Card className="p-5">
        <div className="mb-5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip.label} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              {chip.label}: <span className="text-slate-950">{chip.value}</span>
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="memberId"
            control={control}
            render={({ field }) => (
              <Field label="Member" required error={errors.memberId}>
                <select {...field} value={field.value ?? ''} className={inputClass}>
                  {memberOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          />
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Field label="Status" required error={errors.status}>
                <select {...field} value={field.value ?? ''} className={inputClass}>
                  {['active', 'closed', 'matured'].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          />
          {fieldConfigs[type].map((config) => (
            <Controller
              key={`${type}-${config.name}`}
              name={config.name}
              control={control}
              render={({ field }) => (
                <Field label={config.label} required={config.required} error={errors[config.name]}>
                  {config.type === 'select' ? (
                    <select {...field} value={field.value ?? ''} className={inputClass}>
                      {config.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : config.type === 'textarea' ? (
                    <textarea {...field} value={field.value ?? ''} className={`${inputClass} min-h-28 py-3`} />
                  ) : (
                    <input
                      {...field}
                      value={field.value ?? ''}
                      type={config.type ?? 'text'}
                      step={config.step}
                      max={config.type === 'date' && config.historical ? new Date().toISOString().slice(0, 10) : undefined}
                      disabled={
                        type === 'fd' &&
                        ((config.name === 'termEndDate' && hasFdPeriod) ||
                          (fdPeriodFields.includes(config.name) && hasFdTermEnd))
                      }
                      className={inputClass}
                      onChange={(event) => {
                        field.onChange(event);
                        if (type === 'fd' && config.name === 'termEndDate' && event.target.value) {
                          setValue('periodYears', undefined);
                          setValue('periodMonths', undefined);
                          setValue('periodDays', undefined);
                        }
                        if (type === 'fd' && fdPeriodFields.includes(config.name) && Number(event.target.value) > 0) {
                          setValue('termEndDate', undefined);
                        }
                      }}
                    />
                  )}
                </Field>
              )}
            />
          ))}
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <div className="md:col-span-2">
                <Field label="Description" error={errors.description}>
                  <textarea {...field} value={field.value ?? ''} className={`${inputClass} min-h-28 py-3`} maxLength={500} />
                </Field>
              </div>
            )}
          />
        </div>
      </Card>
      <div className="sticky bottom-16 mt-6 flex justify-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-soft lg:bottom-4">
        <Link to="/instruments">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </Link>
        <Button type="submit" loading={submitting}>
          <Save className="h-4 w-4" />
          {isEdit ? 'Save Changes' : 'Add Instrument'}
        </Button>
      </div>
    </form>
  );
}
