import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, GraduationCap, Search, RefreshCw, AlertCircle,
  CheckCircle2, Building2, BookOpen, Shield, Mail, Calendar, UserCheck, ChevronDown, UserPlus, Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CreateUserModal } from '../admin/CreateUserModal';
import { API_BASE } from '../../lib/api';

/**
 * DeanRosterView — Dedicated Department Academic Roster Module
 * Accessible via `/dean/roster`.
 * Features:
 * - Teaching Faculty directory with assigned courses
 * - Enrolled Students directory with academic standing
 * - Search by name, email, or role
 * - Live directory statistics
 */
export function DeanRosterView({ onNavigate }) {
  const { token } = useAuth();
  const [departmentData, setDepartmentData] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAyId, setSelectedAyId] = useState('');
  const [activeTab, setActiveTab] = useState('faculty'); // 'faculty' | 'students'
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchRosterData = useCallback(async () => {
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
        const err = await res.json().catch(() => ({}));
        showNotification(err.error || 'Failed to load department roster', 'error');
      }
    } catch (err) {
      console.warn('Failed to load roster:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedAyId]);

  useEffect(() => {
    fetchRosterData();
  }, [fetchRosterData]);

  const facultyList = departmentData?.instructors || [];
  const studentList = departmentData?.students || [];
  const subjectsList = departmentData?.subjects || [];

  // Filtered Faculty
  const filteredFaculty = useMemo(() => {
    if (!searchQuery.trim()) return facultyList;
    const q = searchQuery.toLowerCase();
    return facultyList.filter(f =>
      f.name?.toLowerCase().includes(q) ||
      f.email?.toLowerCase().includes(q)
    );
  }, [facultyList, searchQuery]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentList;
    const q = searchQuery.toLowerCase();
    return studentList.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }, [studentList, searchQuery]);

  // Helper to find courses taught by an instructor
  const getInstructorCourses = (instructorId) => {
    return subjectsList.filter(s => s.instructor_id === instructorId || s.instructor?.id === instructorId);
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100 max-w-7xl mx-auto">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 p-4 rounded-2xl border shadow-xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-xl ${notification.type === 'error'
              ? 'bg-red-500/15 border-red-500/30 text-red-500 dark:text-red-400'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              }`}
          >
            {notification.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center shadow-xs text-white">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Department Academic Roster
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
              {departmentData?.name || 'Department Roster'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Official collegiate directory of appointed teaching faculty and enrolled learners.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="kn-btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add {activeTab === 'faculty' ? 'Instructor' : 'Student'}</span>
          </button>
          {academicYears.length > 0 && (
            <div className="relative">
              <select
                value={selectedAyId}
                onChange={(e) => setSelectedAyId(e.target.value)}
                className="appearance-none bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs hover:border-purple-500 transition-colors cursor-pointer"
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
            onClick={fetchRosterData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Switcher Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl shadow-xs">
        {/* Sub-tab Switcher: Faculty vs Students */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-xl">
          <button
            onClick={() => setActiveTab('faculty')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'faculty'
              ? 'bg-white dark:bg-[#1E293B] text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Teaching Faculty</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              {facultyList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'students'
              ? 'bg-white dark:bg-[#1E293B] text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Enrolled Students</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              {studentList.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab === 'faculty' ? 'faculty members' : 'enrolled students'} by name or email...`}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Roster Directory Table */}
      <div className="bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl shadow-xs overflow-hidden">
        {activeTab === 'faculty' ? (
          /* Teaching Faculty Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 font-semibold text-[11px] bg-slate-50/50 dark:bg-white/[0.01]">
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-3">Role Designation</th>
                  <th className="py-3 px-3">Assigned Class Subjects</th>
                  <th className="py-3 px-3">Academic Standing</th>
                  <th className="py-3 px-4 text-right">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Loading faculty directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredFaculty.length > 0 ? (
                  filteredFaculty.map((f) => {
                    const courses = getInstructorCourses(f.id);
                    return (
                      <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{f.name}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{f.email}</span>
                          </p>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                            Faculty Instructor
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          {courses.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {courses.map(c => (
                                <span key={c.id} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 font-mono">
                                  {c.code || c.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No assigned subjects</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {f.status || 'Active'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                          {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                      No teaching faculty found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Enrolled Students Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 font-semibold text-[11px] bg-slate-50/50 dark:bg-white/[0.01]">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Affiliated Department</th>
                  <th className="py-3 px-3">Academic Standing</th>
                  <th className="py-3 px-4 text-right">Enrolled Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Loading student roster...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">{st.name}</p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          <span>{st.email}</span>
                        </p>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          Student Learner
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                        {departmentData?.name || 'Department of Accountancy'}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {st.status || 'Active'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                        {st.createdAt ? new Date(st.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                      No enrolled learners found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dean User Creation Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        token={token}
        forDean={true}
        initialRole={activeTab === 'faculty' ? 'instructor' : 'student'}
        defaultDepartmentId={departmentData?.id}
        defaultDepartmentName={departmentData?.name}
        defaultAcademicYearId={selectedAyId || departmentData?.academic_year_id}
        onUserCreated={(newUser) => {
          showNotification(`${newUser.role === 'instructor' ? 'Faculty Instructor' : 'Student'} account created successfully`);
          fetchRosterData();
        }}
      />
    </div>
  );
}

export default DeanRosterView;

