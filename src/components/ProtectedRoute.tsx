import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, type Role } from './AuthContext';

interface Props {
  children: ReactNode;
  /** Optional: restrict to specific roles. If omitted, any authenticated user can access. */
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-surface rounded-xl p-12 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-text-muted text-sm">
            หน้านี้ต้องการสิทธิ์: <span className="text-primary-light font-medium">{allowedRoles.join(', ')}</span>
            <br />
            สิทธิ์ของคุณ: <span className="text-warning font-medium">{user.role}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
