import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, MessageSquare, Dumbbell, Upload, Brain,
  Users, UsersRound, TrendingUp, History, Trophy, Settings,
  ChevronLeft, ChevronRight, Lock,
} from 'lucide-react';
import { useFriends } from '../../context/FriendsContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import './dashboard.css';

/**
 * Sidebar — Floating glass sidebar with collapsible sections.
 *
 * Preserves: navItem filtering for guest mode, friend badge count, onNavigate callback.
 * New: Grouped sections, collapse animation, glass styling, active glow, user profile.
 */

const navSections = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', guestVisible: true },
    ],
  },
  {
    label: 'Learning',
    items: [
      { icon: MessageSquare, label: 'AI Tutor', path: '/lessons', guestVisible: true },
      { icon: Dumbbell, label: 'Quiz', path: '/practice', guestVisible: false },
      { icon: Upload, label: 'Materials', path: null, comingSoon: true, guestVisible: false },
      { icon: Brain, label: 'Flashcards', path: null, comingSoon: true, guestVisible: false },
    ],
  },
  {
    label: 'Social',
    items: [
      { icon: Users, label: 'Friends', path: '/friends', hasBadge: true, guestVisible: false },
      { icon: UsersRound, label: 'Study Groups', path: '/groups', guestVisible: false },
    ],
  },
  {
    label: 'Progress',
    items: [
      { icon: TrendingUp, label: 'Analytics', path: '/progress', guestVisible: false },
      { icon: History, label: 'History', path: '/history', guestVisible: false },
      { icon: Trophy, label: 'Achievements', path: null, comingSoon: true, guestVisible: false },
    ],
  },
  {
    label: 'Account',
    items: [
      { icon: Settings, label: 'Settings', path: '/settings', guestVisible: false },
    ],
  },
];

export function Sidebar({ currentPath = '/dashboard', onNavigate }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const friendsContext = useFriends();
  const pendingCount = friendsContext?.pendingCount || 0;
  const { isAnonymous, user } = useAuth();

  const handleNavClick = (item) => {
    if (item.comingSoon || !item.path) return;
    if (isAnonymous && !item.guestVisible) return;
    onNavigate?.(item.path);
  };

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="h-full flex flex-col bg-[#111827]/60 backdrop-blur-xl border-r border-white/[0.06] relative z-20 overflow-hidden flex-shrink-0"
    >
      {/* Logo + collapse toggle */}
      <div className="p-4 pb-2 flex items-center justify-between min-h-[56px]">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/logo.svg" alt="Knowrizon" className="w-8 h-8 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-lg font-bold kn-gradient-text whitespace-nowrap overflow-hidden"
              >
                Knowrizon
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/[0.05] transition-all flex-shrink-0"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto overflow-x-hidden">
        {navSections.map((section) => {
          const visibleItems = isAnonymous
            ? section.items.filter((item) => item.guestVisible)
            : section.items;

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="mb-3">
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] uppercase tracking-widest text-[#475569] font-semibold px-3 mb-1.5"
                  >
                    {section.label}
                  </motion.p>
                )}
              </AnimatePresence>

              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = currentPath === item.path;
                  const isDisabled = item.comingSoon || (isAnonymous && !item.guestVisible);
                  const badgeCount = item.hasBadge && item.path === '/friends' ? pendingCount : 0;
                  const Icon = item.icon;

                  return (
                    <li key={item.label}>
                      <button
                        onClick={() => handleNavClick(item)}
                        disabled={isDisabled}
                        title={isCollapsed ? item.label : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive
                            ? 'dash-nav-active text-[#22C7FF] font-medium'
                            : isDisabled
                              ? 'text-[#334155] cursor-not-allowed'
                              : 'dash-nav-item text-[#94A3B8] hover:text-white'
                          }`}
                      >
                        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.div
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              className="flex-1 flex items-center justify-between min-w-0 overflow-hidden whitespace-nowrap"
                            >
                              <span>{item.label}</span>
                              <div className="flex items-center gap-1.5">
                                {item.comingSoon && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-[#475569] font-medium">Soon</span>
                                )}
                                {badgeCount > 0 && <Badge count={badgeCount} />}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom: user profile or guest indicator */}
      <div className="p-3 border-t border-white/[0.06]">
        {isAnonymous ? (
          <div className={`px-3 py-2.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/[0.12] ${isCollapsed ? 'flex justify-center' : ''}`}>
            {isCollapsed ? (
              <Lock className="w-4 h-4 text-amber-400" />
            ) : (
              <>
                <p className="text-xs text-amber-300 font-medium">Guest Mode</p>
                <p className="text-[10px] text-amber-400/60 mt-0.5">Sign up to unlock all features</p>
              </>
            )}
          </div>
        ) : (
          <div className={`flex items-center gap-2.5 px-2 py-2 rounded-xl ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22C7FF] to-[#5B5FFF] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden min-w-0"
                >
                  <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-[#475569]">Online</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
