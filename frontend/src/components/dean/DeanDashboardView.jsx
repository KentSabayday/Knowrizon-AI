import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, BookOpen, GraduationCap, Users, Plus, ArrowRight,
  Clock, CheckCircle2, AlertCircle, RefreshCw, Layers, Calendar,
  ChevronRight, ChevronDown, Sparkles, Building2, UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CreateUserModal } from '../admin/CreateUserModal';
import { API_BASE } from '../../lib/api';

/**
 * DeanDashboardView — Executive Academic Deanship Cockpit
 * Dedicated overview module for the Dean:
 * - Executive greeting and department status
 * - High-level telemetry (Curriculum Subjects, Teaching Faculty, Enrolled Learners)
 * - Curriculum distribution by Year Level (1st–4th) with direct links to /dean/subjects
 * - Quick Faculty and Student rosters with direct links to /dean/roster
 */
export function DeanDashboardView({ onNavigate }) {
  const { token, user } = useAuth();
  const [departmentData, setDepartmentData] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAyId, setSelectedAyId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const url = selectedAyId
        ? `${API_BASE}/academic/dean/department?academic_year_id=${encodeURIComponent(selectedAyId)}`
        : `${API_BASE}/academic/dean/department`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDepartmentData(data);
        if (data.available_academic_years && data.available_academic_years.length > 0) {
          setAcademicYears(data.available_academic_years);
          if (!selectedAyId && data.selected_academic_year_id) {
            setSelectedAyId(data.selected_academic_year_id);
          }
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.error || 'Failed to load department dashboard', 'error');
      }
    } catch (err) {
      console.warn('Failed to load dean dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedAyId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const subjects = departmentData?.subjects || [];
  const faculty = departmentData?.instructors || [];
  const students = departmentData?.students || [];

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100 max-w-7xl mx-auto">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 p-4 rounded-2xl border shadow-xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-xl ${
              notification.type === 'error'
                ? 'bg-red-500/15 border-red-500/30 text-red-500 dark:text-red-400'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {notification.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dean Executive Banner */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 lg:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Shield className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  DEANSHIP CONSOLE
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                  {departmentData?.name || 'Assigned Department'}
                </span>
                {departmentData?.code && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                    {departmentData.code}
                  </span>
                )}
              </div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome, {user?.name || 'Dr. Arthur Dean'}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Strategic oversight of academic programs, teaching faculty appointments, and departmental learner progress.
              </p>
            </div>
          </div>

          {/* Quick Navigation Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {academicYears.length > 0 && (
              <div className="relative">
                <select
                  value={selectedAyId}
                  onChange={(e) => setSelectedAyId(e.target.value)}
                  className="appearance-none bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2.5 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs hover:border-indigo-500 transition-colors cursor-pointer"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.year_string || ay.yearString} {ay.is_active ? '(Active Term)' : '(Archived)'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
            <button
              onClick={() => onNavigate && onNavigate('/dean/subjects')}
              className="kn-btn-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <BookOpen className="w-4 h-4" />
              <span>Manage Subjects & Schedules</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <UserPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Add Member</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('/dean/roster')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <Users className="w-4 h-4 text-emerald-500" />
              <span>View Department Roster</span>
            </button>
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Primary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Curriculum Subjects</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{subjects.length}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
            <span className="text-[11px] text-slate-400">Offered across all 4 years</span>
            <button
              onClick={() => onNavigate && onNavigate('/dean/subjects')}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <span>View list</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Teaching Faculty</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{faculty.length}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
            <span className="text-[11px] text-slate-400">Appointed instructors</span>
            <button
              onClick={() => onNavigate && onNavigate('/dean/roster')}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              <span>Faculty roster</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Enrolled Learners</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{students.length}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Active learners</span>
            <button
              onClick={() => onNavigate && onNavigate('/dean/roster')}
              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>Student directory</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Curriculum Distribution by Year Level */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.04] pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Curriculum Breakdown by Year Level</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribution of required and elective subjects across all collegiate standings.
            </p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('/dean/subjects')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>Open Class Subjects & Schedules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['1st', '2nd', '3rd', '4th'].map((yr) => {
            const yrSubjects = subjects.filter(s => s.year_level === yr || s.yearLevel === yr);
            const scheduledCount = yrSubjects.filter(s => s.schedule?.time_slot).length;
            const assignedCount = yrSubjects.filter(s => s.instructor?.name).length;

            return (
              <div
                key={yr}
                onClick={() => onNavigate && onNavigate('/dean/subjects')}
                className="p-5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    {yr} Year Standing
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-600 transition-all" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-3">
                  {yrSubjects.length} <span className="text-xs font-normal text-slate-500">Subjects</span>
                </p>
                <div className="mt-3 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Faculty Assigned:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{assignedCount}/{yrSubjects.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Schedules Configured:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{scheduledCount}/{yrSubjects.length}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dual Highlights: Faculty Directory & Enrolled Learners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faculty Highlight */}
        <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              <span>Department Teaching Faculty ({faculty.length})</span>
            </h3>
            <button
              onClick={() => onNavigate && onNavigate('/dean/roster')}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <span>View Full Roster</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
            {faculty.slice(0, 4).map((f) => (
              <div key={f.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{f.name}</p>
                  <p className="text-[11px] text-slate-400">{f.email}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                  Faculty Instructor
                </span>
              </div>
            ))}
            {faculty.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">No faculty members currently registered.</p>
            )}
          </div>
        </section>

        {/* Enrolled Learners Highlight */}
        <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Active Department Learners ({students.length})</span>
            </h3>
            <button
              onClick={() => onNavigate && onNavigate('/dean/roster')}
              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>View Full Directory</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
            {students.slice(0, 4).map((st) => (
              <div key={st.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{st.name}</p>
                  <p className="text-[11px] text-slate-400">{st.email}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  Active Student
                </span>
              </div>
            ))}
            {students.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">No students currently enrolled.</p>
            )}
          </div>
        </section>
      </div>

      {/* Dean User Creation Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        token={token}
        forDean={true}
        defaultDepartmentId={departmentData?.id}
        defaultDepartmentName={departmentData?.name}
        defaultAcademicYearId={selectedAyId || departmentData?.academic_year_id}
        onUserCreated={(newUser) => {
          showNotification(`${newUser.role === 'instructor' ? 'Faculty Instructor' : 'Student'} account created successfully`);
          fetchDashboardData();
        }}
      />
    </div>
  );
}

export default DeanDashboardView;

