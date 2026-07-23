import { useState } from 'react';
import { Search, Bell, Sun, Moon, LogOut, Star, Command } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

/**
 * TopBar — AI Command Bar with search, streak, XP, notifications, profile.
 *
 * Preserves: theme toggle, user display, logout.
 * New: dynamic page title, search input (decorative), streak/XP badges, notification bell.
 */

const pathTitles = {
  '/dashboard': 'Dashboard',
  '/lessons': 'AI Tutor',
  '/practice': 'Quiz',
  '/progress': 'Analytics',
  '/history': 'History',
  '/settings': 'Settings',
  '/friends': 'Friends',
  '/groups': 'Study Groups',
};

export function TopBar({ title, currentPath = '/dashboard' }) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAnonymous, logout } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);

  const displayName = isAnonymous ? 'Guest' : (user?.name || 'User');
  const pageTitle = title || pathTitles[currentPath] || 'Knowrizon';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-16 flex items-center justify-between px-5 bg-[#111827]/40 backdrop-blur-xl border-b border-white/[0.06] z-10 flex-shrink-0">
      {/* Page title */}
      <h1 className="text-base font-semibold text-white hidden md:block min-w-[120px]">
        {pageTitle}
      </h1>

      {/* Search / AI Command Bar */}
      <div className={`flex-1 max-w-md mx-4 md:mx-8 relative transition-transform duration-200 ${searchFocused ? 'scale-[1.02]' : ''}`}>
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
        <input
          type="text"
          placeholder="Ask Knowri anything..."
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-16 py-2.5 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#22C7FF]/30 focus:ring-1 focus:ring-[#22C7FF]/15 transition-all"
          readOnly
          aria-label="Search or ask Knowri"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-[#475569] bg-white/[0.05] px-1.5 py-0.5 rounded-md pointer-events-none">
          <Command className="w-3 h-3" />K
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        {/* Streak */}
        {!isAnonymous && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/[0.06] border border-orange-500/[0.08]">
            <span className="text-sm dash-flame">🔥</span>
            <span className="text-xs font-semibold text-orange-300">1</span>
          </div>
        )}

        {/* XP */}
        {!isAnonymous && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#22C7FF]/[0.06] border border-[#22C7FF]/[0.08]">
            <Star className="w-3.5 h-3.5 text-[#22C7FF]" />
            <span className="text-xs font-semibold text-[#22C7FF]">0 XP</span>
          </div>
        )}

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/[0.05] transition-all"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/[0.05] transition-all"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
        </button>

        {/* Profile pill */}
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl ${
          isAnonymous
            ? 'bg-amber-500/[0.06] border border-amber-500/[0.08]'
            : 'bg-white/[0.04] border border-white/[0.06]'
        }`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${
            isAnonymous ? 'bg-amber-500/40' : 'bg-gradient-to-br from-[#22C7FF] to-[#5B5FFF]'
          }`}>
            {initials}
          </div>
          <span className={`text-xs font-medium hidden lg:block ${
            isAnonymous ? 'text-amber-300' : 'text-[#E2E8F0]'
          }`}>
            {displayName}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-lg text-[#64748B] hover:text-red-400 hover:bg-red-500/[0.06] transition-all"
          aria-label={isAnonymous ? 'Exit guest session' : 'Logout'}
          title={isAnonymous ? 'Exit guest session' : 'Logout'}
        >
          <LogOut className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}
