import { format, parseISO } from 'date-fns';
import { CurrencyCode } from '../types/finance';

export const formatCurrency = (value: number, currency: CurrencyCode = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);

export const formatDate = (value?: string) => {
  if (!value) return 'Not set';
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
};
