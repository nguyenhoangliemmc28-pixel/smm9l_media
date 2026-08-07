import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="text-center max-w-sm">
          <div className="h-16 w-16 rounded-2xl bg-danger/15 flex items-center justify-center mx-auto mb-4"><ShieldAlert className="h-8 w-8 text-danger" /></div>
          <h1 className="text-xl font-bold text-white">Không có quyền truy cập</h1>
          <p className="text-sm text-text-muted mt-2">Bạn cần quyền Admin để truy cập trang này.</p>
          <Button className="mt-6" onClick={() => navigate('/dashboard')}>Về trang chủ</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  SUPPORT: 40,
  MODERATOR: 30,
  VIP: 10,
  MEMBER: 0,
};

export function RequireRole({ minRole, children }: { minRole: string; children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const userLevel = profile ? (ROLE_HIERARCHY[profile.role] ?? 0) : -1;
  const requiredLevel = ROLE_HIERARCHY[minRole] ?? 100;

  if (userLevel < requiredLevel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="text-center max-w-sm">
          <div className="h-16 w-16 rounded-2xl bg-danger/15 flex items-center justify-center mx-auto mb-4"><ShieldAlert className="h-8 w-8 text-danger" /></div>
          <h1 className="text-xl font-bold text-white">Không đủ quyền hạn</h1>
          <p className="text-sm text-text-muted mt-2">Bạn cần vai trò {minRole} hoặc cao hơn để truy cập trang này.</p>
          <Button className="mt-6" onClick={() => navigate('/dashboard')}>Về trang chủ</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
