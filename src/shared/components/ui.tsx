import { Loader2, X } from 'lucide-react';
import { PropsWithChildren, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useUiStore } from '../stores/uiStore';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}) {
  const variants = {
    primary: 'bg-teal-700 text-white hover:bg-teal-800 focus:ring-teal-600',
    secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 focus:ring-slate-300',
    ghost: 'text-slate-700 hover:bg-slate-100 focus:ring-slate-300',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500'
  };
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-sm'
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
  ...props
}: PropsWithChildren<React.HTMLAttributes<HTMLElement> & { className?: string }>) {
  return (
    <section {...props} className={`rounded-lg border border-slate-200 bg-white shadow-soft ${className}`}>
      {children}
    </section>
  );
}

export function Badge({ children, tone = 'slate' }: PropsWithChildren<{ tone?: 'slate' | 'teal' | 'indigo' | 'rose' | 'amber' }>) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    teal: 'bg-teal-50 text-teal-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700'
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-slate-950">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-3xl text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  ctaLabel,
  to
}: {
  title: string;
  description: string;
  ctaLabel: string;
  to: string;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-2xl font-black text-teal-700">
        ₹
      </div>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-600">{description}</p>
      <Link to={to} className="mt-5">
        <Button>{ctaLabel}</Button>
      </Link>
    </Card>
  );
}

export function SkeletonCard({ lines = 4 }: { lines?: number }) {
  return (
    <Card className="p-5">
      <div className="skeleton-shimmer h-5 w-32 rounded" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="skeleton-shimmer h-4 rounded" style={{ width: `${92 - index * 12}%` }} />
        ))}
      </div>
    </Card>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer
}: PropsWithChildren<{ open: boolean; title: string; onClose: () => void; footer?: React.ReactNode }>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full overflow-auto rounded-t-lg bg-white shadow-2xl sm:max-w-2xl sm:rounded-lg"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-slate-200 px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmModal({
  open,
  itemName,
  action = 'delete',
  onClose,
  onConfirm,
  loading
}: {
  open: boolean;
  itemName: string;
  action?: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Confirm ${action}`}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" loading={loading} onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-700">
        This will {action} <span className="font-semibold text-slate-950">{itemName}</span>.
      </p>
    </Modal>
  );
}

export function ToastHost() {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);

  useEffect(() => {
    const timers = toasts.map((toast) => window.setTimeout(() => dismissToast(toast.id), 4000));
    return () => timers.forEach(window.clearTimeout);
  }, [toasts, dismissToast]);

  return (
    <div className="fixed right-4 top-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-soft"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-semibold capitalize text-slate-950">{toast.type}</span>
            <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}

export function Field({
  label,
  required,
  error,
  children
}: PropsWithChildren<{ label: string; required?: boolean; error?: string }>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-800">
        {label} {required ? <span className="text-rose-600">*</span> : <span className="text-slate-400">(optional)</span>}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

export const inputClass =
  'h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100';

export function FilterPills<T extends string>({
  values,
  selected,
  onChange,
  labelFor
}: {
  values: T[];
  selected: T[];
  onChange: (next: T[]) => void;
  labelFor: (value: T) => string;
}) {
  const toggle = (value: T) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange([])}
        className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
          selected.length === 0 ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'
        }`}
      >
        All
      </button>
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => toggle(value)}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            selected.includes(value) ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {labelFor(value)}
        </button>
      ))}
    </div>
  );
}
