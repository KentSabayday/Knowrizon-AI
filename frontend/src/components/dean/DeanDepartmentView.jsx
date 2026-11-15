import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, GraduationCap, BookOpen, Clock, Plus,
  Shield, Check, X, RefreshCw, AlertCircle, CheckCircle2,
  Calendar, UserPlus, ArrowRight, Search, MapPin, Filter,
  Layers, UserCheck, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

const YEAR_LEVELS = [
  { id: 'all', label: 'All Years' },
  { id: '1st', label: '1st Year' },
  { id: '2nd', label: '2nd Year' },
  { id: '3rd', label: '3rd Year' },
  { id: '4th', label: '4th Year' },
];

/**
 * DeanDepartmentView — Department Leadership Cockpit & Academic Ecosystem
 * Strict Deanship Isolation:
 * - Overview Tab: Telemetry, Department Leadership, Curriculum Metrics
 * - Subjects Tab: Class Subjects divided by Year Level (1st–4th), Faculty Assignment, Time Slot & Classroom Scheduling, Student Enrollment
 * - Roster Tab: Teaching Faculty Table & Enrolled Students Table (read-only directory of academic participants)
 */
export function DeanDepartmentView({ initialTab = 'overview', onNavigate }) {
  const { token, user } = useAuth();
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [departmentData, setDepartmentData] = useState(null);
  const [availableInstructors, setAvailableInstructors] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectYear, setNewSubjectYear] = useState('1st');

  // Assign Instructor modal
  const [assigningSubject, setAssigningSubject] = useState(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');

  // Configure Schedule modal
  const [schedulingSubject, setSchedulingSubject] = useState(null);
  const [scheduleTimeSlot, setScheduleTimeSlot] = useState('');
  const [scheduleClassroom, setScheduleClassroom] = useState('');

  // Enroll Student modal
  const [enrollingSubject, setEnrollingSubject] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Sync tab with prop if navigation changes route
  useEffect(() => {
    if (initialTab) {
      setCurrentTab(initialTab);
    }
  }, [initialTab]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDeanDashboard = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      // Fast single fetch to dean department
      const deptRes = await fetch(`${API_BASE}/academic/dean/department`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartmentData(data);
        if (Array.isArray(data.available_instructors)) {
          setAvailableInstructors(data.available_instructors);
        }
        if (Array.isArray(data.available_students)) {
          setAvailableStudents(data.available_students);
        }
      }
    } catch (err) {
      console.warn('Failed to load dean dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDeanDashboard();
  }, [fetchDeanDashboard]);

  // Handle Creating Subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/academic/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newSubjectName.trim(),
          code: newSubjectCode.trim().toUpperCase(),
          year_level: newSubjectYear,
          department_id: departmentData?.id
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create subject');
      }

      showNotification('New class subject added to curriculum');
      setIsCreatingSubject(false);
      setNewSubjectName('');
      setNewSubjectCode('');
      setNewSubjectYear('1st');
      fetchDeanDashboard();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Handle Assigning Instructor
  const handleAssignInstructor = async (e) => {
    e.preventDefault();
    if (!assigningSubject) return;

    try {
      const res = await fetch(`${API_BASE}/academic/subjects/${assigningSubject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ instructor_id: selectedInstructorId || null })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign instructor');
      }

      showNotification('Instructor assignment updated successfully');
      setAssigningSubject(null);
      fetchDeanDashboard();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Handle Saving Schedule (Time Slot & Classroom)
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!schedulingSubject) return;

    try {
      const res = await fetch(`${API_BASE}/academic/subjects/${schedulingSubject.id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          time_slot: scheduleTimeSlot.trim(),
          classroom: scheduleClassroom.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update schedule');
      }

      showNotification('Class schedule saved successfully');
      setSchedulingSubject(null);
      setScheduleTimeSlot('');
      setScheduleClassroom('');
      fetchDeanDashboard();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Handle Enrolling Student
  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!enrollingSubject || !selectedStudentId) return;

    try {
      const res = await fetch(`${API_BASE}/academic/subjects/${enrollingSubject.id}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ student_id: selectedStudentId })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to enroll student');
      }

      showNotification('Student enrolled into class subject successfully');
      setEnrollingSubject(null);
      setSelectedStudentId('');
      fetchDeanDashboard();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Filtered Subjects
  const allSubjects = departmentData?.subjects || [];
  const filteredSubjects = useMemo(() => {
    return allSubjects.filter((subj) => {
      const matchesYear = selectedYear === 'all' || subj.year_level === selectedYear || subj.yearLevel === selectedYear;
      const matchesSearch = !searchQuery.trim() ||
        subj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (subj.code && subj.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (subj.instructor?.name && subj.instructor.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesYear && matchesSearch;
    });
  }, [allSubjects, selectedYear, searchQuery]);

  // Department Roster Lists
  const facultyList = departmentData?.instructors || [];
  const studentList = departmentData?.students || [];

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

      {/* Dean Header Banner */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 lg:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Shield className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  DEANSHIP CONSOLE
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">
                  {departmentData?.name || 'Assigned Department'}
                </span>
              </div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome, {user?.name || 'Dean'}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Oversee curriculum subjects across all 4 year levels, configure class schedules, and coordinate faculty rosters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsCreatingSubject(true)}
              className="kn-btn-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subject</span>
            </button>
            <button
              onClick={fetchDeanDashboard}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100 dark:border-white/[0.04]">
          <button
            onClick={() => setCurrentTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              currentTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setCurrentTab('subjects')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              currentTab === 'subjects'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Class Subjects & Schedules</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {allSubjects.length}
            </span>
          </button>
          <button
            onClick={() => setCurrentTab('roster')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              currentTab === 'roster'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Department Roster</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {facultyList.length + studentList.length}
            </span>
          </button>
        </div>
      </section>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Curriculum Subjects</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{allSubjects.length}</p>
          <span className="text-[10px] text-slate-400">Class subjects offered</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Teaching Faculty</span>
            <GraduationCap className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{facultyList.length}</p>
          <span className="text-[10px] text-slate-400">Instructors assigned</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Enrolled Learners</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">{studentList.length}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Active learners</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: OVERVIEW
      ───────────────────────────────────────────────────────────── */}
      {currentTab === 'overview' && (
        <div className="space-y-6">
          {/* Department Breakdown by Year Level */}
          <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Curriculum Distribution by Year Level</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {['1st', '2nd', '3rd', '4th'].map((yr) => {
                const count = allSubjects.filter(s => s.year_level === yr || s.yearLevel === yr).length;
                return (
                  <div key={yr} className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{yr} Year Level</span>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{count} Subjects</p>
                    <button
                      onClick={() => { setSelectedYear(yr); setCurrentTab('subjects'); }}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1 hover:underline"
                    >
                      <span>Manage subjects</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Roster Snapshots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Faculty Highlights */}
            <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-500" />
                  <span>Teaching Faculty ({facultyList.length})</span>
                </h3>
                <button
                  onClick={() => setCurrentTab('roster')}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View Full Roster →
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {facultyList.slice(0, 5).map((f) => (
                  <div key={f.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{f.name}</p>
                      <p className="text-[11px] text-slate-400">{f.email}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      Faculty
                    </span>
                  </div>
                ))}
                {facultyList.length === 0 && (
                  <p className="py-4 text-center text-xs text-slate-400">No instructors assigned yet.</p>
                )}
              </div>
            </div>

            {/* Enrolled Learners Highlights */}
            <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>Enrolled Learners ({studentList.length})</span>
                </h3>
                <button
                  onClick={() => setCurrentTab('roster')}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View Full Roster →
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {studentList.slice(0, 5).map((st) => (
                  <div key={st.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{st.name}</p>
                      <p className="text-[11px] text-slate-400">{st.email}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      Active Student
                    </span>
                  </div>
                ))}
                {studentList.length === 0 && (
                  <p className="py-4 text-center text-xs text-slate-400">No students enrolled yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: CLASS SUBJECTS & SCHEDULES
      ───────────────────────────────────────────────────────────── */}
      {currentTab === 'subjects' && (
        <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.04] pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Curriculum Subjects & Class Schedules</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Partitioned by year level (1st–4th). Configure classroom time slots, assign faculty, and enroll students.
              </p>
            </div>
            <button
              onClick={() => setIsCreatingSubject(true)}
              className="kn-btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
            </button>
          </div>

          {/* Year Level Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Year Level Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-xl">
              {YEAR_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setSelectedYear(lvl.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedYear === lvl.id
                      ? 'bg-white dark:bg-[#1E293B] text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject or code..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Subjects Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Subject / Course</th>
                  <th className="py-2.5 px-3">Year Level</th>
                  <th className="py-2.5 px-3">Assigned Faculty</th>
                  <th className="py-2.5 px-3">Schedule & Room</th>
                  <th className="py-2.5 px-3">Enrolled</th>
                  <th className="py-2.5 px-3 text-right">Dean Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                {filteredSubjects.length > 0 ? (
                  filteredSubjects.map((subj) => (
                    <tr key={subj.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 dark:text-white">{subj.name}</p>
                        <p className="text-[11px] text-slate-400">{subj.code || '—'}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                          {subj.year_level || subj.yearLevel} Year
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {subj.instructor?.name ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{subj.instructor.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {subj.schedule?.time_slot ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{subj.schedule.time_slot}</span>
                            </div>
                            {subj.schedule.classroom && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{subj.schedule.classroom}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Schedule TBA</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                          {subj.enrolled_count || 0} students
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Set Schedule */}
                          <button
                            onClick={() => {
                              setSchedulingSubject(subj);
                              setScheduleTimeSlot(subj.schedule?.time_slot || '');
                              setScheduleClassroom(subj.schedule?.classroom || '');
                            }}
                            className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                            title="Set Schedule"
                          >
                            Schedule
                          </button>

                          {/* Assign Faculty */}
                          <button
                            onClick={() => {
                              setAssigningSubject(subj);
                              setSelectedInstructorId(subj.instructor_id || '');
                            }}
                            className="px-2 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 transition-colors"
                          >
                            Assign Faculty
                          </button>

                          {/* Enroll Student */}
                          <button
                            onClick={() => {
                              setEnrollingSubject(subj);
                              setSelectedStudentId('');
                            }}
                            className="px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 transition-colors"
                          >
                            Enroll Student
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No subjects found for {selectedYear === 'all' ? 'this department' : `${selectedYear} Year`}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: DEPARTMENT ROSTER (READ-ONLY DIRECTORY)
      ───────────────────────────────────────────────────────────── */}
      {currentTab === 'roster' && (
        <div className="space-y-6">
          {/* Faculty Roster */}
          <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-500" />
                  <span>Department Faculty Instructors ({facultyList.length})</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Teaching staff affiliated with {departmentData?.name || 'this department'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Faculty Member</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Account Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                  {facultyList.length > 0 ? (
                    facultyList.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 dark:text-white">{f.name}</p>
                          <p className="text-[11px] text-slate-400">{f.email}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                            Instructor
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {f.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                        No faculty members currently listed.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enrolled Students Roster */}
          <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>Enrolled Department Students ({studentList.length})</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Learners actively enrolled or affiliated with {departmentData?.name || 'this department'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Enrolled Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                  {studentList.length > 0 ? (
                    studentList.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 dark:text-white">{st.name}</p>
                          <p className="text-[11px] text-slate-400">{st.email}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                            Student
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {st.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {st.createdAt ? new Date(st.createdAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                        No students currently enrolled.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALS
      ───────────────────────────────────────────────────────────── */}

      {/* Assign Instructor Modal */}
      {assigningSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold">Assign Faculty to {assigningSubject.name}</h3>
              <button onClick={() => setAssigningSubject(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAssignInstructor} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Select Instructor</label>
                <select
                  value={selectedInstructorId}
                  onChange={(e) => setSelectedInstructorId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-white/[0.1] rounded-xl text-xs text-white"
                >
                  <option value="">Unassigned</option>
                  {availableInstructors.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningSubject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Schedule Modal */}
      {schedulingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold">Configure Schedule — {schedulingSubject.name}</h3>
              <button onClick={() => setSchedulingSubject(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Class Time Slot *</label>
                <input
                  type="text"
                  required
                  value={scheduleTimeSlot}
                  onChange={(e) => setScheduleTimeSlot(e.target.value)}
                  placeholder="e.g. MWF 9:00 AM - 10:30 AM"
                  className="w-full px-3 py-2 bg-[#1E293B] border border-white/[0.1] rounded-xl text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Classroom / Room *</label>
                <input
                  type="text"
                  required
                  value={scheduleClassroom}
                  onChange={(e) => setScheduleClassroom(e.target.value)}
                  placeholder="e.g. Room 304 / Lab 2"
                  className="w-full px-3 py-2 bg-[#1E293B] border border-white/[0.1] rounded-xl text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSchedulingSubject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Student Modal */}
      {enrollingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold">Enroll Student in {enrollingSubject.name}</h3>
              <button onClick={() => setEnrollingSubject(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Select Student</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-white/[0.1] rounded-xl text-xs text-white"
                >
                  <option value="">Choose a student...</option>
                  {availableStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEnrollingSubject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudentId}
                  className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Subject Modal */}
      {isCreatingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold">Add Curriculum Subject</h3>
              <button onClick={() => setIsCreatingSubject(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Advanced Financial Accounting"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-xl text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Course Code</label>
                  <input
                    type="text"
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    placeholder="e.g. ACT 301"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-xl text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Year Level</label>
                  <select
                    value={newSubjectYear}
                    onChange={(e) => setNewSubjectYear(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1E293B] border border-white/[0.1] rounded-xl text-xs text-white"
                  >
                    <option value="1st">1st Year</option>
                    <option value="2nd">2nd Year</option>
                    <option value="3rd">3rd Year</option>
                    <option value="4th">4th Year</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingSubject(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeanDepartmentView;
