import { Navigate } from 'react-router-dom';
import { BookOpenCheck } from 'lucide-react';
import { Button, Card, ToastHost } from '../../shared/components/ui';
import { useAuth } from '../../shared/hooks/useAuth';
import { isFirebaseConfigured } from '../../lib/firebase';

export function LoginPage() {
  const { user, loading, signIn, signInDemo } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="bg-teal-700 px-6 py-8 text-white">
          <BookOpenCheck className="h-10 w-10" />
          <h1 className="mt-5 text-3xl font-black tracking-normal">Paisa Book</h1>
          <p className="mt-2 text-sm text-teal-50">
            Track deposits, investments, loans, insurance, PPF, SSA, and family savings in one secure ledger.
          </p>
        </div>
        <div className="space-y-4 px-6 py-6">
          <Button className="w-full" onClick={signIn} loading={loading}>
            Continue with Google
          </Button>
          {!isFirebaseConfigured ? (
            <Button className="w-full" variant="secondary" onClick={signInDemo}>
              Open local demo
            </Button>
          ) : null}
          <p className="text-xs leading-5 text-slate-500">
            Google OAuth is used for production authentication. Local demo mode appears only when Firebase
            environment variables are absent.
          </p>
        </div>
      </Card>
      <ToastHost />
    </main>
  );
}
