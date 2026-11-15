import { useState } from 'react';
import {
  Sun, Moon, Check, Shield, User, LogOut, Loader2, Sparkles,
  BookOpen, Bell, Laptop, Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

/**
 * SettingsView - User settings and preferences.
 * 
 * Features:
 * - Side-by-side visual Theme selector (Warm Paper vs. Carbon Slate)
 * - Account information with role badges
 * - Study preferences & Socratic guidance level
 * - Tactile sign out button
 */
export function SettingsView() {
  const { user, isAnonymous, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [socraticPacing, setSocraticPacing] = useState('guided');

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const userRole = user?.role || (isAnonymous ? 'guest' : 'student');
  const roleLabel = {
    admin: 'Administrator',
    instructor: 'Instructor',
    student: 'Student',
    guest: 'Anonymous Guest'
  }[userRole] || 'Student';

  return (
    <div className="p-6 lg:p-8 overflow-y-auto h-full text-slate-900 dark:text-slate-100">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings & Preferences
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Customize your learning environment, appearance, and account details.
          </p>
        </div>

        {/* ── Appearance: Side-by-side Visual Theme Preview Cards ── */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-6 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Theme & Appearance</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose your preferred visual tone. Both themes are hand-crafted for high-contrast focus.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Light Mode Preview Card */}
            <div
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all select-none relative ${
                theme === 'light'
                  ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/30'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-900">Light Mode (Warm Paper)</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  theme === 'light' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                }`}>
                  {theme === 'light' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>

              {/* Miniature Light Mockup */}
              <div className="h-24 rounded-lg bg-[#FAF9F6] border border-slate-200 p-2.5 space-y-2 overflow-hidden shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div className="w-12 h-2 rounded bg-slate-800" />
                  <div className="w-4 h-2 rounded bg-blue-600" />
                </div>
                <div className="p-2 rounded bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="w-20 h-1.5 rounded bg-slate-700" />
                  <div className="w-28 h-1 rounded bg-slate-300" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Warm alabaster canvas with crisp dark slate typography.
              </p>
            </div>

            {/* Dark Mode Preview Card */}
            <div
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all select-none relative ${
                theme === 'dark'
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-950/20'
                  : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] bg-slate-900/5 dark:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode (Carbon Slate)</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  theme === 'dark' ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 dark:border-white/20'
                }`}>
                  {theme === 'dark' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>

              {/* Miniature Dark Mockup */}
              <div className="h-24 rounded-lg bg-[#0F1115] border border-white/[0.1] p-2.5 space-y-2 overflow-hidden shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
                  <div className="w-12 h-2 rounded bg-white" />
                  <div className="w-4 h-2 rounded bg-blue-500" />
                </div>
                <div className="p-2 rounded bg-[#161920] border border-white/[0.08] space-y-1">
                  <div className="w-20 h-1.5 rounded bg-slate-200" />
                  <div className="w-28 h-1 rounded bg-slate-600" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Deep carbon canvas with balanced, low-fatigue slate contrast.
              </p>
            </div>
          </div>
        </div>

        {/* ── Account Details Card ── */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Account Profile</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Your authenticated session and user permissions.
              </p>
            </div>

            <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 capitalize">
              {roleLabel}
            </span>
          </div>

          {isAnonymous ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Anonymous Guest Session</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-200 leading-relaxed">
                You're exploring Knowrizon as a temporary guest. Your study sessions, uploads, and quiz records won't persist across devices. Sign up for a free student account to save your learning streak.
              </p>
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
              <div className="flex items-center justify-between pt-1 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Full Name</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {user?.name || 'Alex Student'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">Email Address</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {user?.email || 'student@example.com'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">Account Role</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {roleLabel}
                </span>
              </div>
            </div>
          )}

          {/* Logout Action */}
          <div className="pt-2">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Learning Preferences ── */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-6 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Socratic Tutoring Style</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Control how Knowri structures hints, reflections, and concept breakdowns.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div
              onClick={() => setSocraticPacing('guided')}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                socraticPacing === 'guided'
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 dark:border-blue-400'
                  : 'border-slate-200 dark:border-white/[0.06] hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Guided Socratic (Default)</span>
                {socraticPacing === 'guided' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Asks guiding questions to help you arrive at the answer step-by-step.
              </p>
            </div>

            <div
              onClick={() => setSocraticPacing('direct')}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                socraticPacing === 'direct'
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 dark:border-blue-400'
                  : 'border-slate-200 dark:border-white/[0.06] hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Direct Explanations</span>
                {socraticPacing === 'direct' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Provides direct answers first, followed by reflection and related sources.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
