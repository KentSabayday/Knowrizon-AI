import { useAuth } from '../../context/AuthContext';
import { AdminDashboardOverview } from '../admin/AdminDashboardOverview';
import { InstructorDashboardView } from './InstructorDashboardView';
import { StudentStudyDashboard } from './StudentStudyDashboard';
import { DeanDashboardView } from '../dean/DeanDashboardView';

/**
 * DashboardView — Role-Based Dashboard Switcher (RBAC Airlock)
 * Dynamically resolves and renders the segregated dashboard:
 * - Admin: AdminDashboardOverview (System telemetry, user governance, platform health)
 * - Dean: DeanDepartmentView (Department academic ecosystem, faculty assignments, student enrollment)
 * - Instructor: InstructorDashboardView (Cohort management, curriculum tracking, student grading)
 * - Student / Guest: StudentStudyDashboard (Study notebooks, Socratic coach, subject mastery)
 */
export function DashboardView({ onNavigate }) {
  const { user, isAnonymous } = useAuth();

  // Normalize role
  const rawRole = user?.role || (user?.isAdmin || user?.is_admin ? 'admin' : (isAnonymous ? 'guest' : 'student'));
  const userRole = String(rawRole).toLowerCase();
  const isAdmin = Boolean(user?.isAdmin || user?.is_admin || userRole === 'admin');
  const isDean = userRole === 'dean';
  const isInstructor = userRole === 'instructor';

  if (isAdmin) {
    return <AdminDashboardOverview onNavigate={onNavigate} />;
  }

  if (isDean) {
    return <DeanDashboardView onNavigate={onNavigate} />;
  }

  if (isInstructor) {
    return <InstructorDashboardView onNavigate={onNavigate} />;
  }

  return <StudentStudyDashboard onNavigate={onNavigate} />;
}

export default DashboardView;
