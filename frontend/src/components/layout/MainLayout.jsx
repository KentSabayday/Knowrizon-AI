import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { DashboardView } from '../pages/DashboardView';
import { SettingsView } from '../pages/SettingsView';
import { LessonsView } from '../pages/LessonsView';
import { HistoryView } from '../pages/HistoryView';
import { PracticeView } from '../pages/PracticeView';
import { ProgressDashboard } from '../progress/ProgressDashboard';
import { FriendsView } from '../friends/FriendsView';
import { GroupLearningView } from '../groups/GroupLearningView';
import { CallInterface } from '../calls/CallInterface';
import { KnowrizonMascot } from '../ui/KnowrizonMascot';
import { AdminUserManagement, AdminDepartmentsView, AdminClassesView, AdminAcademicYearsView } from '../admin';
import { DeanDashboardView, DeanSubjectsView, DeanRosterView } from '../dean';
import { InstructorClassroomsView, InstructorScheduleView, InstructorGradesView, FacultyClassStudio, FacultyQuizStudio } from '../instructor';
import { StudentClassroomsView, StudentGradesView, StudentScheduleView } from '../pages';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import './dashboard.css';

/** Paths accessible to anonymous / guest users */
const GUEST_ALLOWED_PATHS = ['/dashboard', '/lessons', '/workspace', '/practice'];

/** Paths accessible to administrators (Strict Airlock) */
const ADMIN_ALLOWED_PATHS = ['/dashboard', '/admin', '/admin/departments', '/admin/classes', '/admin/academic-years', '/settings'];

/** Paths accessible to deans */
const DEAN_ALLOWED_PATHS = ['/dashboard', '/dean', '/dean/subjects', '/dean/roster', '/settings'];

/** Paths accessible to instructors */
const INSTRUCTOR_ALLOWED_PATHS = ['/dashboard', '/instructor', '/instructor/schedule', '/instructor/grades', '/workspace', '/lessons', '/practice', '/settings'];

/** Paths accessible to students */
const STUDENT_ALLOWED_PATHS = ['/dashboard', '/workspace', '/lessons', '/practice', '/progress', '/history', '/grades', '/schedule', '/classrooms', '/friends', '/groups', '/settings'];

const KNOWRI_MESSAGES = [
  'Ready to explore your course materials? 📚',
  "You're making great progress! Keep going! 💪",
  'Try a retrieval quiz to lock in memory! 🧠',
  'Upload some lecture notes and let\'s break them down! ✨',
  'Mistakes are normal — they rewire your brain! 🍵',
  'I am here to guide you step-by-step! 🔍',
];

export function MainLayout({ children }) {
  const { isAnonymous, user } = useAuth();

  // Strict role normalization
  const rawRole = user?.role || (user?.isAdmin || user?.is_admin ? 'admin' : (isAnonymous ? 'guest' : 'student'));
  const userRole = String(rawRole).toLowerCase();
  const isAdmin = Boolean(user?.isAdmin || user?.is_admin || userRole === 'admin');
  const isDean = userRole === 'dean';
  const isInstructor = userRole === 'instructor';

  // Initial landing: Admins default to /admin console; students and others default to /dashboard
  const [currentPath, setCurrentPath] = useState(isAdmin ? '/admin' : '/dashboard');
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [showKnowriTip, setShowKnowriTip] = useState(false);
  const [knowriMessage, setKnowriMessage] = useState(KNOWRI_MESSAGES[0]);
  const [showMascot, setShowMascot] = useState(true);
  const [welcomeShown, setWelcomeShown] = useState(false);

  // If user role resolves as admin after mount, ensure default redirect to /admin
  useEffect(() => {
    if (isAdmin && !sessionStorage.getItem('admin_initial_landed')) {
      setCurrentPath('/admin');
      sessionStorage.setItem('admin_initial_landed', 'true');
    }
  }, [isAdmin]);

  // Show welcome greeting once per session on mount for students/instructors only
  useEffect(() => {
    if (isAdmin || isDean) return; // Do not display student mascot greeting for administrators or deans
    const alreadyWelcomed = sessionStorage.getItem('knowri-welcomed');
    if (!alreadyWelcomed && user?.name) {
      setWelcomeShown(true);
      setShowKnowriTip(true);
      const firstName = user.name.split(' ')[0];
      setKnowriMessage(`Welcome, ${firstName}! Ready for Socratic learning? 🎓`);
      sessionStorage.setItem('knowri-welcomed', 'true');
    }
  }, [user, isAdmin, isDean]);

  // Auto-hide mascot after 12 seconds to keep canvas clean
  useEffect(() => {
    if (isAdmin || isDean) return;
    const timer = setTimeout(() => {
      setShowMascot(false);
    }, 12000);
    return () => clearTimeout(timer);
  }, [isAdmin, isDean]);

  // Guard: if anonymous user lands on restricted path, redirect to dashboard
  useEffect(() => {
    if (isAnonymous && !GUEST_ALLOWED_PATHS.includes(currentPath)) {
      setCurrentPath('/dashboard');
      setActiveConversationId(null);
    }
  }, [isAnonymous, currentPath]);

  // Guard: Strict Airlock by role
  useEffect(() => {
    if (isAdmin && !ADMIN_ALLOWED_PATHS.includes(currentPath)) {
      setCurrentPath('/admin');
      setActiveConversationId(null);
    } else if (isDean && !DEAN_ALLOWED_PATHS.includes(currentPath)) {
      setCurrentPath('/dashboard');
      setActiveConversationId(null);
    } else if (isInstructor && !INSTRUCTOR_ALLOWED_PATHS.includes(currentPath)) {
      setCurrentPath('/dashboard');
      setActiveConversationId(null);
    } else if (!isAdmin && !isDean && !isInstructor && !isAnonymous && !STUDENT_ALLOWED_PATHS.includes(currentPath)) {
      setCurrentPath('/dashboard');
      setActiveConversationId(null);
    }
  }, [isAdmin, isDean, isInstructor, isAnonymous, currentPath]);

  // Rotate Knowri messages when page changes (students only)
  useEffect(() => {
    if (isAdmin || isDean) return;
    if (!welcomeShown) {
      setKnowriMessage(KNOWRI_MESSAGES[Math.floor(Math.random() * KNOWRI_MESSAGES.length)]);
    }
    setShowKnowriTip(false);
    setWelcomeShown(false);
  }, [currentPath, isAdmin, isDean, welcomeShown]);

  const handleNavigate = (path, conversationId = null) => {
    // Guest protection
    if (isAnonymous && !GUEST_ALLOWED_PATHS.includes(path)) {
      return;
    }

    // Role-based navigation airlock
    if (isAdmin && !ADMIN_ALLOWED_PATHS.includes(path)) {
      return;
    }
    if (isDean && !DEAN_ALLOWED_PATHS.includes(path)) {
      return;
    }
    if (isInstructor && !INSTRUCTOR_ALLOWED_PATHS.includes(path)) {
      return;
    }
    if (!isAdmin && !isDean && !isInstructor && !isAnonymous && !STUDENT_ALLOWED_PATHS.includes(path)) {
      return;
    }

    setCurrentPath(path);
    if (conversationId) {
      setActiveConversationId(conversationId);
    } else if (path === '/workspace' && !conversationId) {
      setActiveConversationId(null);
    } else if (path !== '/workspace' && path !== '/lessons') {
      setActiveConversationId(null);
    }
  };

  // Render content based on current path with RBAC protection
  const renderContent = () => {
    switch (currentPath) {
      case '/workspace':
      case '/lessons':
        if (isInstructor) {
          return <FacultyClassStudio onNavigate={handleNavigate} />;
        }
        if (!activeConversationId && currentPath === '/workspace') {
          return <StudentClassroomsView onNavigate={handleNavigate} isStudioMode={true} />;
        }
        return (
          <LessonsView
            conversationId={activeConversationId}
            onConversationChange={setActiveConversationId}
            onNavigate={handleNavigate}
          />
        );
      case '/history':
        if (isAnonymous) return children || <DashboardView onNavigate={handleNavigate} />;
        return <HistoryView onNavigate={handleNavigate} />;
      case '/practice':
        if (isInstructor) {
          return <FacultyQuizStudio onNavigate={handleNavigate} />;
        }
        return <PracticeView />;
      case '/progress':
        if (isAnonymous) return children || <DashboardView onNavigate={handleNavigate} />;
        return <ProgressDashboard />;
      case '/admin':
        return (
          <ProtectedRoute allowedRoles={['admin']} onNavigate={handleNavigate}>
            <AdminUserManagement />
          </ProtectedRoute>
        );
      case '/admin/departments':
        return (
          <ProtectedRoute allowedRoles={['admin']} onNavigate={handleNavigate}>
            <AdminDepartmentsView onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/admin/classes':
        return (
          <ProtectedRoute allowedRoles={['admin']} onNavigate={handleNavigate}>
            <AdminClassesView onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/admin/academic-years':
        return (
          <ProtectedRoute allowedRoles={['admin']} onNavigate={handleNavigate}>
            <AdminAcademicYearsView onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/dean':
        return (
          <ProtectedRoute allowedRoles={['dean', 'admin']} onNavigate={handleNavigate}>
            <DeanDashboardView onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/dean/subjects':
        return (
          <ProtectedRoute allowedRoles={['dean', 'admin']} onNavigate={handleNavigate}>
            <DeanSubjectsView onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/dean/roster':
        return (
          <ProtectedRoute allowedRoles={['dean', 'admin']} onNavigate={handleNavigate}>
            <DeanRosterView onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/instructor':
        return (
          <ProtectedRoute allowedRoles={['instructor', 'dean', 'admin']} onNavigate={handleNavigate}>
            <InstructorClassroomsView onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/instructor/schedule':
        return (
          <ProtectedRoute allowedRoles={['instructor', 'dean', 'admin']} onNavigate={handleNavigate}>
            <InstructorScheduleView onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/instructor/grades':
        return (
          <ProtectedRoute allowedRoles={['instructor', 'dean', 'admin']} onNavigate={handleNavigate}>
            <InstructorGradesView onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case '/grades':
        return <StudentGradesView onNavigate={handleNavigate} />;
      case '/schedule':
        return <StudentScheduleView onNavigate={handleNavigate} />;
      case '/classrooms':
        return <StudentClassroomsView onNavigate={handleNavigate} />;
      case '/settings':
        if (isAnonymous) return children || <DashboardView onNavigate={handleNavigate} />;
        return <SettingsView />;
      case '/friends':
        if (isAnonymous) return children || <DashboardView onNavigate={handleNavigate} />;
        return <FriendsView />;
      case '/groups':
        if (isAnonymous) return children || <DashboardView onNavigate={handleNavigate} />;
        return <GroupLearningView />;
      case '/dashboard':
      default:
        return children || <DashboardView onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#FAF9F6] dark:bg-[#0F1115] text-[#141413] dark:text-[#F3F4F6] relative transition-colors duration-200">
      {/* Subtle dot grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--dot-color, rgba(20,20,19,0.04)) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Sidebar — Strict Role-Based Airlock */}
      <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative z-10">
        {/* Top bar */}
        <TopBar currentPath={currentPath} />

        {/* Content area */}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {renderContent()}
        </main>
      </div>

      {/* Floating Knowri assistant (bottom-right) — For Students & Instructors Only */}
      {!isAdmin && !isDean && (
        <div
          className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
            showMascot ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <button
            onClick={() => setShowKnowriTip(!showKnowriTip)}
            className="relative dash-knowri-float group cursor-pointer"
            aria-label="Talk to Knowri"
          >
            <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl scale-125 opacity-0 group-hover:opacity-100 transition-opacity" />
            <KnowrizonMascot className="w-[58px] relative z-10" autoGreet={false} state="idle" />
          </button>

          {showKnowriTip && (
            <div className="absolute bottom-full right-0 mb-3 w-56 bg-white dark:bg-[#1C2029] border border-slate-200 dark:border-white/[0.08] rounded-xl p-3 shadow-lg text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[8px] font-bold text-white">K</div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">Knowri</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{knowriMessage}</p>
              <div className="absolute bottom-0 right-7 w-2.5 h-2.5 bg-white dark:bg-[#1C2029] border-r border-b border-slate-200 dark:border-white/[0.08] rotate-45 translate-y-1/2" />
            </div>
          )}
        </div>
      )}

      {/* Realtime Call Interface — Students only */}
      {!isAnonymous && !isAdmin && !isDean && <CallInterface />}
    </div>
  );
}

export default MainLayout;
