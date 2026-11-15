import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Clock, ChevronDown, Users, Plus, Search, Filter, RefreshCw,
  Building2, GraduationCap, CheckCircle2, AlertCircle, Edit,
  MapPin, Calendar, Check, X, UserPlus, Trash2, ArrowRight
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
 * DeanSubjectsView — Dedicated Class Subjects & Curriculum Schedules Module
 * Accessible via `/dean/subjects`.
 * Features:
 * - Year Level categorization (1st, 2nd, 3rd, 4th Year)
 * - Assign Teaching Faculty to Subjects
 * - Configure Classroom & Time Slot Schedules
 * - Student Enrollment per Class Subject
 * - Add New Curriculum Subject
 */
export function DeanSubjectsView({ onNavigate }) {
  const { token } = useAuth();
  const [departmentData, setDepartmentData] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAyId, setSelectedAyId] = useState('');
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

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchSubjectsData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      // Direct fast fetch to dean department (already returns subjects, stats, and available rosters)
      const url = selectedAyId
        ? `${API_BASE}/academic/dean/department?academic_year_id=${encodeURIComponent(selectedAyId)}`
        : `${API_BASE}/academic/dean/department`;
      const deptRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartmentData(data);
        if (data.available_academic_years && data.available_academic_years.length > 0) {
          setAcademicYears(data.available_academic_years);
          if (!selectedAyId && data.selected_academic_year_id) {
            setSelectedAyId(data.selected_academic_year_id);
          }
        }
        if (Array.isArray(data.available_instructors)) {
          setAvailableInstructors(data.available_instructors);
        }
        if (Array.isArray(data.available_students)) {
          setAvailableStudents(data.available_students);
        }
      } else {
        const err = await deptRes.json().catch(() => ({}));
        showNotification(err.error || 'Failed to load department curriculum', 'error');
      }
    } catch (err) {
      console.warn('Failed to load subjects data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedAyId]);

  useEffect(() => {
    fetchSubjectsData();
  }, [fetchSubjectsData]);

  // Handle Add Subject
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
      fetchSubjectsData();
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

      showNotification('Instructor assignment saved');
      setAssigningSubject(null);
      fetchSubjectsData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Handle Configure Schedule (Time Slot & Classroom)
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

      showNotification('Class schedule updated successfully');
      setSchedulingSubject(null);
      setScheduleTimeSlot('');
      setScheduleClassroom('');
      fetchSubjectsData();
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

      showNotification('Student enrolled successfully');
      setEnrollingSubject(null);
      setSelectedStudentId('');
      fetchSubjectsData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

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

      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Class Subjects & Curriculum Schedules
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
              {departmentData?.name || 'Department Curriculum'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Curriculum courses organized by standing year level (1st–4th). Configure classroom time slots, assign faculty, and coordinate student enrollments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {academicYears.length > 0 && (
            <div className="relative">
              <select
                value={selectedAyId}
                onChange={(e) => setSelectedAyId(e.target.value)}
                className="appearance-none bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs hover:border-indigo-500 transition-colors cursor-pointer"
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
            onClick={() => setIsCreatingSubject(true)}
            className="kn-btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
          <button
            onClick={fetchSubjectsData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            title="Refresh Curriculum"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl shadow-xs">
        {/* Year Level Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-xl overflow-x-auto">
          {YEAR_LEVELS.map((lvl) => {
            const count = lvl.id === 'all'
              ? allSubjects.length
              : allSubjects.filter(s => s.year_level === lvl.id || s.yearLevel === lvl.id).length;

            return (
              <button
                key={lvl.id}
                onClick={() => setSelectedYear(lvl.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  selectedYear === lvl.id
                    ? 'bg-white dark:bg-[#1E293B] text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{lvl.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/60 dark:bg-white/[0.08]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subject name, code, or faculty..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Subjects Table */}
      <div className="bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 font-semibold text-[11px] bg-slate-50/50 dark:bg-white/[0.01]">
                <th className="py-3 px-4">Subject / Course</th>
                <th className="py-3 px-3">Year Level</th>
                <th className="py-3 px-3">Teaching Faculty</th>
                <th className="py-3 px-3">Class Schedule & Room</th>
                <th className="py-3 px-3">Enrolled Learners</th>
                <th className="py-3 px-4 text-right">Dean Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Loading curriculum subjects...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSubjects.length > 0 ? (
                filteredSubjects.map((subj) => (
                  <tr key={subj.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    {/* Course Code & Name */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white text-xs">{subj.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{subj.code || '—'}</p>
                    </td>

                    {/* Year Level */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                        {subj.year_level || subj.yearLevel} Year
                      </span>
                    </td>

                    {/* Assigned Faculty */}
                    <td className="py-3.5 px-3">
                      {subj.instructor?.name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{subj.instructor.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned Faculty</span>
                      )}
                    </td>

                    {/* Schedule */}
                    <td className="py-3.5 px-3">
                      {subj.schedule?.time_slot ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{subj.schedule.time_slot}</span>
                          </div>
                          {subj.schedule.classroom && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{subj.schedule.classroom}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Schedule TBA</span>
                      )}
                    </td>

                    {/* Enrolled Count */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                        {subj.enrolled_count || 0} students
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSchedulingSubject(subj);
                            setScheduleTimeSlot(subj.schedule?.time_slot || '');
                            setScheduleClassroom(subj.schedule?.classroom || '');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                          title="Configure Classroom Schedule"
                        >
                          Schedule
                        </button>

                        <button
                          onClick={() => {
                            setAssigningSubject(subj);
                            setSelectedInstructorId(subj.instructor_id || '');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 transition-colors cursor-pointer"
                          title="Assign Faculty"
                        >
                          Assign Faculty
                        </button>

                        <button
                          onClick={() => {
                            setEnrollingSubject(subj);
                            setSelectedStudentId('');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Enroll Student"
                        >
                          Enroll Student
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    No curriculum subjects found for {selectedYear === 'all' ? 'this department' : `${selectedYear} Year Standing`}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODALS
      ───────────────────────────────────────────────────────────── */}

      {/* Add Subject Modal */}
      {isCreatingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold">Add Curriculum Subject</h3>
              <button onClick={() => setIsCreatingSubject(false)} className="text-slate-400 hover:text-white cursor-pointer">
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Create Subject
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
              <button onClick={() => setSchedulingSubject(null)} className="text-slate-400 hover:text-white cursor-pointer">
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Instructor Modal */}
      {assigningSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold">Assign Faculty to {assigningSubject.name}</h3>
              <button onClick={() => setAssigningSubject(null)} className="text-slate-400 hover:text-white cursor-pointer">
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Confirm Assignment
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
              <button onClick={() => setEnrollingSubject(null)} className="text-slate-400 hover:text-white cursor-pointer">
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudentId}
                  className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeanSubjectsView;

