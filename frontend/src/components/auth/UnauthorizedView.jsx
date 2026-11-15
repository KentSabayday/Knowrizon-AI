import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

/**
 * UnauthorizedView — RBAC Airlock Enforcement Screen
 * Displayed when an authenticated user attempts to access a resource or path
 * outside their security clearance (e.g. Student attempting to access /admin).
 */
export function UnauthorizedView({ onNavigate, userRole = 'student', requiredRoles = ['admin'] }) {
  const handleReturn = () => {
    if (onNavigate) {
      if (userRole === 'admin') {
        onNavigate('/admin');
      } else {
        onNavigate('/dashboard');
      }
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-6 bg-[#FAF9F6] dark:bg-[#0F1115]">
      <div className="max-w-md w-full bg-white dark:bg-[#161920] border border-rose-200 dark:border-rose-900/40 rounded-2xl p-8 shadow-lg text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 uppercase tracking-wider">
            RBAC Airlock Active
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Access Restricted
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Your current account role (<span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{userRole}</span>) does not possess clearance for this console. This sector requires{' '}
            <span className="font-semibold text-rose-600 dark:text-rose-400 capitalize">{requiredRoles.join(' or ')}</span> authorization.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleReturn}
            className="w-full kn-btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to {userRole === 'admin' ? 'Admin Console' : 'Study Dashboard'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedView;

