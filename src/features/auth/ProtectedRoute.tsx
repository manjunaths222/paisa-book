import { Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { SkeletonCard } from '../../shared/components/ui';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <SkeletonCard lines={6} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
