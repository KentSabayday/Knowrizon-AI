import { useState } from 'react';
import { Search, Bell, Sun, Moon, LogOut, Command, Shield } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

/**
 * TopBar — Clean Editorial AI Command Bar (Role-Aware)
 * Displays role-specific breadcrumbs, search prompts, and account actions.
 */

const studentPathTitles = {
  '/dashboard': 'Dashboard',
  '/workspace': 'Class Studio',
  '/lessons': 'Class Studio',
  '/practice': 'Quizzes & Exams',
  '/progress': 'Mastery & Progress',
  '/history': 'Past Sessions',
  '/classrooms': 'My Classrooms',
  '/friends': 'Classmates',
  '/groups': 'Study Groups',
  '/settings': 'Settings',
  '/instructor': 'Class Subjects & Instruction',
  '/dean': 'Dean Dashboard',
  '/dean/subjects': 'Class Subjects & Schedules',
  '/dean/roster': 'Department Roster & Faculty',
};

const adminPathTitles = {
  '/dashboard': 'System Overview',
  '/admin': 'User Governance & Telemetry',
  '/admin/departments': 'Academic Departments',
  '/admin/classes': 'Classes & Curriculum Schedules',
  '/admin/academic-years': 'Academic Years & Rollover',
  '/settings': 'System Settings',
};

export function TopBar({ title, currentPath = '/dashboard' }) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAnonymous, logout } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);

  const rawRole = user?.role || (user?.isAdmin || user?.is_admin ? 'admin' : (isAnonymous ? 'guest' : 'student'));
  const userRole = String(rawRole).toLowerCase();
  const isAdmin = Boolean(user?.isAdmin || user?.is_admin || userRole === 'admin');

  const titlesMap = isAdmin ? adminPathTitles : studentPathTitles;
  const pageTitle = title || titlesMap[currentPath] || (isAdmin ? 'Admin Console' : 'Knowrizon');
  const displayName = isAnonymous ? 'Guest' : (user?.name || (isAdmin ? 'Admin' : 'User'));
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-16 flex items-center justify-between px-5 bg-white/90 dark:bg-[#161920]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.08] z-10 flex-shrink-0 transition-colors duration-200">
      {/* Page Title / Context Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-[140px]">
        {isAdmin && (
          <span className="p-1 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
            <Shield className="w-3.5 h-3.5" />
          </span>
        )}
        <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 hidden sm:block">
          {pageTitle}
        </h1>
      </div>

      {/* Global Command Search (⌘K) */}
      <div className={`flex-1 max-w-md mx-4 md:mx-6 relative transition-all duration-150 ${searchFocused ? 'scale-[1.01]' : ''}`}>
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder={isAdmin ? 'Search users, audit logs, or telemetry...' : 'Ask Knowri anything...'}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl pl-9 pr-14 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#1C2029] focus:ring-2 focus:ring-blue-500/15 transition-all"
          readOnly
          aria-label={isAdmin ? 'Search administration' : 'Search or ask Knowri'}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-white dark:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.06] px-1.5 py-0.5 rounded shadow-2xs pointer-events-none">
          <Command className="w-2.5 h-2.5" />K
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <button
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Theme Toggle (Sun/Moon) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-700" />
          ) : (
            <Sun className="w-4 h-4 text-amber-300" />
          )}
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-white/[0.08] mx-0.5" />

        {/* User Avatar */}
        <div
          title={isAnonymous ? 'Guest Student' : (isAdmin ? 'System Administrator' : displayName)}
          className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-semibold shadow-xs ${
            isAdmin ? 'bg-purple-600' : 'bg-blue-600 dark:bg-blue-500'
          }`}
        >
          {initials}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
          aria-label={isAnonymous ? 'Exit guest session' : 'Sign out'}
          title={isAnonymous ? 'Exit guest session' : 'Sign out'}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

export default TopBar;
