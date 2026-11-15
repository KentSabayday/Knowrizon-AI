import { useState } from 'react';
import {
  LayoutDashboard, Sparkles, BookOpen, TrendingUp, Clock, Users, UsersRound,
  Settings, ChevronLeft, ChevronRight, ShieldAlert, Shield, Lock, GraduationCap,
  Building2, Brain, CalendarSync, Calendar, Award
} from 'lucide-react';
import { useFriends } from '../../context/FriendsContext';
import { useAuth } from '../../context/AuthContext';
import './dashboard.css';

/**
 * Sidebar — Strict Role-Based Airlock Navigation (Academic Hierarchy Aware)
 * Isolates Admin, Dean, Instructor, and Student navigation paths completely:
 * - Admin: Administration (Overview, User Governance, Departments, Classes, Academic Years) + Settings.
 * - Dean: Deanship (Dean Dashboard, Class Subjects & Schedules, Department Roster) + Settings.
 * - Instructor: Instruction (Faculty Cockpit, Class Subjects & Schedules, Studio, Quizzes & Exams) + Settings.
 * - Student: Study (Dashboard, Studio, Quizzes, Progress) + Community (Classrooms, Classmates, Groups) + Settings.
 */

const ADMIN_NAV_SECTIONS = [
  {
    label: 'Administration',
    items: [
      { icon: LayoutDashboard, label: 'System Overview', path: '/dashboard', adminOnly: true },
      { icon: ShieldAlert, label: 'User Governance', path: '/admin', adminOnly: true },
      { icon: Building2, label: 'Departments', path: '/admin/departments', adminOnly: true },
      { icon: BookOpen, label: 'Classes & Schedules', path: '/admin/classes', adminOnly: true },
      { icon: CalendarSync, label: 'Academic Years', path: '/admin/academic-years', adminOnly: true },
    ],
  },
];

const DEAN_NAV_SECTIONS = [
  {
    label: 'Deanship',
    items: [
      { icon: LayoutDashboard, label: 'Dean Dashboard', path: '/dashboard' },
      { icon: BookOpen, label: 'Class Subjects & Schedules', path: '/dean/subjects' },
      { icon: Users, label: 'Department Roster', path: '/dean/roster' },
    ],
  },
];

const INSTRUCTOR_NAV_SECTIONS = [
  {
    label: 'Instruction',
    items: [
      { icon: LayoutDashboard, label: 'Faculty Cockpit', path: '/dashboard' },
      { icon: BookOpen, label: 'Class Subjects & Schedules', path: '/instructor' },
      { icon: Calendar, label: 'Class Schedule', path: '/instructor/schedule' },
      { icon: Award, label: 'Student Grades', path: '/instructor/grades' },
      { icon: Sparkles, label: 'Class Studio', path: '/workspace' },
      { icon: Brain, label: 'Quizzes & Exams', path: '/practice' },
    ],
  },
];

const STUDENT_NAV_SECTIONS = [
  {
    label: 'Study',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', guestVisible: true },
      { icon: Sparkles, label: 'Class Studio', path: '/workspace', guestVisible: true },
      { icon: Brain, label: 'Quizzes & Exams', path: '/practice', guestVisible: true },
      { icon: TrendingUp, label: 'Mastery & Progress', path: '/progress', guestVisible: false },
      { icon: Clock, label: 'Past Sessions', path: '/history', guestVisible: false },
    ],
  },
  {
    label: 'Academics',
    items: [
      { icon: Award, label: 'My Grades', path: '/grades', guestVisible: false },
      { icon: Calendar, label: 'Class Schedule', path: '/schedule', guestVisible: false },
      { icon: Building2, label: 'Classrooms', path: '/classrooms', guestVisible: false },
    ],
  },
  {
    label: 'Community',
    items: [
      { icon: Users, label: 'Classmates', path: '/friends', hasBadge: true, guestVisible: false },
      { icon: UsersRound, label: 'Study Groups', path: '/groups', guestVisible: false },
    ],
  },
];

export function Sidebar({ currentPath = '/dashboard', onNavigate }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const friendsContext = useFriends();
  const pendingCount = friendsContext?.pendingCount || 0;
  const { isAnonymous, user } = useAuth();

  // Strict role normalization
  const rawRole = user?.role || (user?.isAdmin || user?.is_admin ? 'admin' : (isAnonymous ? 'guest' : 'student'));
  const userRole = String(rawRole).toLowerCase();
  const isAdmin = Boolean(user?.isAdmin || user?.is_admin || userRole === 'admin');
  const isDean = userRole === 'dean';
  const isInstructor = userRole === 'instructor';

  // Select isolated navigation structure
  const activeNavSections = isAdmin
    ? ADMIN_NAV_SECTIONS
    : isDean
    ? DEAN_NAV_SECTIONS
    : isInstructor
    ? INSTRUCTOR_NAV_SECTIONS
    : STUDENT_NAV_SECTIONS;

  const handleNavClick = (path, guestVisible, adminOnly) => {
    if (isAnonymous && !guestVisible) return;
    if (adminOnly && !isAdmin) return;
    if (path && onNavigate) {
      onNavigate(path);
    }
  };

  const isActive = (path) => {
    if (!path) return false;
    if (path === '/workspace' && (currentPath === '/workspace' || currentPath === '/lessons')) {
      return true;
    }
    return currentPath === path;
  };

  return (
    <aside
      className={`relative z-20 flex flex-col h-full flex-shrink-0 bg-white dark:bg-[#161920] border-r border-slate-200 dark:border-white/[0.08] transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-white/[0.08]">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm ${
              isAdmin
                ? 'bg-purple-600'
                : isDean
                ? 'bg-indigo-600'
                : isInstructor
                ? 'bg-blue-600'
                : 'bg-blue-600 dark:bg-blue-500'
            }`}>
              {isAdmin ? <Shield className="w-4 h-4" /> : isDean ? <Building2 className="w-4 h-4" /> : isInstructor ? <GraduationCap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base text-slate-900 dark:text-white tracking-tight leading-none">
                Knowrizon
              </span>
              {isAdmin && (
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 tracking-wider uppercase mt-0.5">
                  Admin Console
                </span>
              )}
              {isDean && (
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase mt-0.5">
                  Dean Portal
                </span>
              )}
              {isInstructor && (
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase mt-0.5">
                  Faculty Studio
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-white shadow-sm ${
            isAdmin ? 'bg-purple-600' : isDean ? 'bg-indigo-600' : isInstructor ? 'bg-blue-600' : 'bg-blue-600 dark:bg-blue-500'
          }`}>
            {isAdmin ? <Shield className="w-4 h-4" /> : isDean ? <Building2 className="w-4 h-4" /> : isInstructor ? <GraduationCap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors ml-auto cursor-pointer"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Sections — Airlocked */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-6">
        {activeNavSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => {
            if (isAnonymous && item.guestVisible === false) return false;
            if (item.adminOnly && !isAdmin) return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <p className={`px-3 mb-1.5 font-semibold tracking-normal uppercase text-[10px] ${
                  isAdmin ? 'text-purple-600/80 dark:text-purple-400/80' : isDean ? 'text-indigo-600/80 dark:text-indigo-400/80' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {section.label}
                </p>
              )}
              {visibleItems.map((item, iIdx) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <button
                    key={iIdx}
                    onClick={() => handleNavClick(item.path, item.guestVisible, item.adminOnly)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                      active
                        ? isAdmin
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 font-semibold'
                          : isDean
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 font-semibold'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                      active
                        ? isAdmin
                          ? 'text-purple-600 dark:text-purple-400'
                          : isDean
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-white'
                    }`} />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {item.hasBadge && pendingCount > 0 && !isCollapsed && (
                      <span className="ml-auto px-1.5 py-0.2 rounded-full bg-blue-600 text-[10px] text-white font-bold">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer / User Profile & Settings */}
      <div className="p-3 border-t border-slate-200 dark:border-white/[0.08] space-y-1">
        {!isAnonymous && (
          <button
            onClick={() => onNavigate?.('/settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
              currentPath === '/settings'
                ? isAdmin
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 font-semibold'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/[0.04]'
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-white shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </button>
        )}

        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04]">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white ${
              isAdmin
                ? 'bg-purple-600'
                : isDean
                ? 'bg-indigo-600'
                : isInstructor
                ? 'bg-blue-600'
                : 'bg-emerald-600'
            }`}>
              {isAnonymous ? 'G' : (user?.name?.[0]?.toUpperCase() || (isAdmin ? 'A' : 'U'))}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                {isAnonymous ? 'Guest Student' : (user?.name || (isAdmin ? 'Administrator' : 'Learner'))}
              </p>
              <div className="flex items-center gap-1">
                {isAdmin && <Shield className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />}
                {isDean && <Building2 className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {isAnonymous ? 'Guest Mode' : (
                    isAdmin ? 'System Administrator' : (isDean ? 'Academic Dean' : (isInstructor ? 'Instructor' : (user?.email || 'Student')))
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-semibold text-white ${
            isAdmin ? 'bg-purple-600' : isDean ? 'bg-indigo-600' : isInstructor ? 'bg-blue-600' : 'bg-emerald-600'
          }`}>
            {isAnonymous ? 'G' : (user?.name?.[0]?.toUpperCase() || (isAdmin ? 'A' : 'U'))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
