import { useAuth } from '../../context/AuthContext';
import { UnauthorizedView } from './UnauthorizedView';

/**
 * ProtectedRoute — Role-Based Access Control (RBAC) Airlock Wrapper
 * Enforces strict role isolation between 'admin', 'instructor', and 'student'.
 *
 * @param {Array<string>} allowedRoles - Roles permitted to view children (e.g. ['admin'])
 * @param {React.ReactNode} children - View rendered when security policy passes
 * @param {React.ReactNode} fallback - Custom view when authorization fails
 * @param {Function} onUnauthorized - Optional callback for route redirection
 * @param {Function} onNavigate - Navigation handler
 */
export function ProtectedRoute({
  allowedRoles = [],
  children,
  fallback = null,
  onUnauthorized = null,
  onNavigate = null,
}) {
  const { user, isAuthenticated, isLoading, isAnonymous } = useAuth();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-[#FAF9F6] dark:bg-[#0F1115]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Verifying security credentials...</span>
        </div>
      </div>
    );
  }

  // Normalize user role
  const rawRole = user?.role || (user?.isAdmin || user?.is_admin ? 'admin' : (isAnonymous ? 'guest' : 'student'));
  const userRole = String(rawRole).toLowerCase();
  const isAdmin = Boolean(user?.isAdmin || user?.is_admin || userRole === 'admin');

  // Check if role is allowed
  let isAuthorized = false;
  if (!allowedRoles || allowedRoles.length === 0) {
    isAuthorized = true;
  } else {
    isAuthorized = allowedRoles.some((r) => {
      const normalized = String(r).toLowerCase();
      if (normalized === 'admin') return isAdmin;
      return normalized === userRole;
    });
  }

  if (!isAuthorized) {
    if (onUnauthorized) {
      onUnauthorized(userRole);
    }

    if (fallback) {
      return fallback;
    }

    return (
      <UnauthorizedView
        userRole={userRole}
        requiredRoles={allowedRoles}
        onNavigate={onNavigate}
      />
    );
  }

  return children;
}

export default ProtectedRoute;

