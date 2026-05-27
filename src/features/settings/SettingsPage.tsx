import { LogOut } from 'lucide-react';
import { Button, Card, PageHeader } from '../../shared/components/ui';
import { useAuth } from '../../shared/hooks/useAuth';
import { useMembers } from '../../shared/hooks/useFamilyData';
import { CurrencyCode } from '../../types/finance';
import { useUiStore } from '../../shared/stores/uiStore';
import { Link } from 'react-router-dom';

const currencies: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP', 'SGD'];

export function SettingsPage() {
  const { user, signOutUser, updateUserSettings } = useAuth();
  const { members } = useMembers();
  const pushToast = useUiStore((state) => state.pushToast);
  const updateCurrency = async (currency: CurrencyCode) => {
    if (!user) return;
    try {
      await updateUserSettings({ currency });
      pushToast({ type: 'success', message: 'Currency display updated' });
    } catch (error) {
      pushToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to update currency' });
    }
  };
  const updateAutoRenew = async (autoRenewDeposits: boolean) => {
    if (!user) return;
    try {
      await updateUserSettings({ autoRenewDeposits });
      pushToast({ type: 'success', message: 'Projection preference updated' });
    } catch (error) {
      pushToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to update projections' });
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Display currency, family shortcuts, account profile, and release metadata." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-bold text-slate-950">Currency</h2>
          <p className="mt-1 text-sm text-slate-500">Changing currency updates display formatting only. Amounts are not converted.</p>
          <select
            className="mt-4 h-11 w-full rounded-md border border-slate-300 px-3"
            value={user?.currency ?? 'INR'}
            onChange={(event) => void updateCurrency(event.target.value as CurrencyCode)}
          >
            {currencies.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-slate-950">Projection Defaults</h2>
          <p className="mt-1 text-sm text-slate-500">
            Apply a conservative auto-renew assumption to FD and RD projection horizons.
          </p>
          <label className="mt-4 flex items-center justify-between gap-4 rounded-md border border-slate-200 px-3 py-3">
            <span className="text-sm font-semibold text-slate-800">Assume FD/RD auto-renewal in projections</span>
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-slate-300 text-teal-700"
              checked={user?.autoRenewDeposits ?? true}
              onChange={(event) => void updateAutoRenew(event.target.checked)}
            />
          </label>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-slate-950">Family Members</h2>
          <p className="mt-1 text-sm text-slate-500">{members.length} profiles configured for this ledger.</p>
          <Link to="/members" className="mt-4 inline-block">
            <Button variant="secondary">Manage Members</Button>
          </Link>
        </Card>
        <Card className="p-5 xl:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {user?.photoURL ? <img src={user.photoURL} alt="" className="h-14 w-14 rounded-full" /> : null}
              <div>
                <h2 className="font-bold text-slate-950">{user?.displayName}</h2>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>
            <Button variant="danger" onClick={signOutUser}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </Card>
        <Card className="p-5 xl:col-span-2">
          <h2 className="font-bold text-slate-950">Release</h2>
          <p className="mt-2 text-sm text-slate-600">
            Version {import.meta.env.VITE_APP_VERSION ?? '1.0.0'} · Build date {new Date().toLocaleDateString('en-IN')}
          </p>
        </Card>
      </div>
    </>
  );
}
