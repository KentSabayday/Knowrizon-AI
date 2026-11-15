import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Clock, Users, Plus, Search, Filter, RefreshCw,
  Building2, GraduationCap, CheckCircle2, AlertCircle, Edit,
  MapPin, Calendar, Check, X, UserPlus, Trash2
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

export function AdminClassesView({ onNavigate }) {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Filters
  const [selectedDeptId, setSelectedDeptId] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjDept, setNewSubjDept] = useState('');
  const [newSubjYear, setNewSubjYear] = useState('1st');
  const [newSubjInstructor, setNewSubjInstructor] = useState('');
  const [newSubjTime, setNewSubjTime] = useState('');
  const [newSubjRoom, setNewSubjRoom] = useState('');

  // Schedule modal
  const [schedulingSubj, setSchedulingSubj] = useState(null);
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleRoom, setScheduleRoom] = useState('');

  // Assign instructor modal
  const [assigningSubj, setAssigningSubj] = useState(null);
  const [assignInstructorId, setAssignInstructorId] = useState('');

  // Enroll student modal
  const [enrollingSubj, setEnrollingSubj] = useState(null);
  const [enrollStudentId, setEnrollStudentId] = useState('');

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [subjRes, deptRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/academic/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/academic/departments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/academic/users-roster`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (subjRes.ok) {
        const data = await subjRes.json();
        setSubjects(data.subjects || []);
      }
      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(data.departments || []);
        if (data.departments && data.departments.length > 0 && !newSubjDept) {
          setNewSubjDept(data.departments[0].id);
        }
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        const all = data.users || [];
        setInstructors(all.filter(u => u.role === 'instructor'));
        setStudents(all.filter(u => u.role === 'student'));
      }
    } catch (err) {
      console.warn('Failed to load classes data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Add Subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjName.trim() || !newSubjDept) return;

    try {
      const res = await fetch(`${API_BASE}/academic/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newSubjName.trim(),
          code: newSubjCode.trim().toUpperCase(),
          year_level: newSubjYear,
          department_id: newSubjDept,
          instructor_id: newSubjInstructor || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create subject');
      }

      const created = await res.json();
      const subjId = created.subject?.id;

      // If time slot / classroom provided, configure schedule immediately
      if (subjId && (newSubjTime.trim() || newSubjRoom.trim())) {
        await fetch(`${API_BASE}/academic/subjects/${subjId}/schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            time_slot: newSubjTime.trim() || 'TBA',
            classroom: newSubjRoom.trim() || 'Main Hall',
            instructor_id: newSubjInstructor || null,
          }),
        });
      }

      showNotification('Class subject and curriculum schedule created successfully');
      setIsAddModalOpen(false);
      setNewSubjName('');
      setNewSubjCode('');
      setNewSubjTime('');
      setNewSubjRoom('');
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Handle Save Schedule
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!schedulingSubj || !scheduleTime.trim() || !scheduleRoom.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/academic/subjects/${schedulingSubj.id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          time_slot: scheduleTime.trim(),
          classroom: scheduleRoom.trim(),
          instructor_id: schedulingSubj.instructor_id || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to set schedule');
      }

      showNotification('Class schedule updated successfully');
      setSchedulingSubj(null);
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Handle Assign Instructor
  const handleAssignInstructor = async (e) => {
    e.preventDefault();
    if (!assigningSubj) return;

    try {
      const res = await fetch(`${API_BASE}/academic/subjects/${assigningSubj.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          instructor_id: assignInstructorId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign instructor');
      }

      showNotification('Instructor assigned to subject successfully');
      setAssigningSubj(null);
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Handle Enroll Student
  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!enrollingSubj || !enrollStudentId) return;

    try {
      const res = await fetch(`${API_BASE}/academic/subjects/${enrollingSubj.id}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: enrollStudentId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to enroll student');
      }

      showNotification('Student enrolled into class subject successfully');
      setEnrollingSubj(null);
      setEnrollStudentId('');
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Filtered list
  const filteredSubjects = subjects.filter((s) => {
    if (selectedDeptId !== 'all' && s.department_id !== selectedDeptId) return false;
    if (selectedYear !== 'all' && (s.year_level || s.yearLevel) !== selectedYear) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.name && s.name.toLowerCase().includes(q);
      const matchCode = s.code && s.code.toLowerCase().includes(q);
      const matchInst = s.instructor?.name && s.instructor.name.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchInst) return false;
    }
    return true;
  });

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

      {/* Header Banner */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 lg:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  CURRICULUM MODULE
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Academic Year 26-27
                </span>
              </div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Class Subjects & Schedules
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Configure curriculum subjects divided across 1st, 2nd, 3rd, and 4th year levels with time slots and classrooms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="kn-btn-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Class Subject</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter and Control Bar */}
      <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Year Level Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {YEAR_LEVELS.map((yr) => (
              <button
                key={yr.id}
                onClick={() => setSelectedYear(yr.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedYear === yr.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {yr.label}
              </button>
            ))}
          </div>

          {/* Department Dropdown and Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative">
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs font-medium rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="all">All Academic Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subjects or instructors..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0"
              title="Refresh subjects"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Class Subjects Table */}
      <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 font-semibold text-[11px]">
                <th className="py-2.5 px-3">Subject / Course</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Year Level</th>
                <th className="py-2.5 px-3">Instructor</th>
                <th className="py-2.5 px-3">Class Schedule</th>
                <th className="py-2.5 px-3">Enrolled</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No class subjects found matching this criteria.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subj) => (
                  <tr key={subj.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900 dark:text-white">{subj.name}</p>
                      <p className="text-[11px] text-purple-600 dark:text-purple-400 font-mono">{subj.code || '—'}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {subj.department_name || 'General Academic'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                        {subj.year_level || subj.yearLevel} Year
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => {
                          setAssigningSubj(subj);
                          setAssignInstructorId(subj.instructor_id || '');
                        }}
                        className="hover:underline text-left cursor-pointer"
                      >
                        {subj.instructor?.name ? (
                          <span className="font-medium text-slate-900 dark:text-white flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-purple-500" />
                            {subj.instructor.name}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 text-[11px] font-medium">+ Assign Faculty</span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => {
                          setSchedulingSubj(subj);
                          setScheduleTime(subj.schedule?.time_slot || 'MWF 9:00 AM - 10:30 AM');
                          setScheduleRoom(subj.schedule?.classroom || 'Room 101');
                        }}
                        className="text-left hover:underline cursor-pointer"
                      >
                        {subj.schedule ? (
                          <div>
                            <p className="text-slate-800 dark:text-slate-200 font-medium">{subj.schedule.time_slot}</p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              {subj.schedule.classroom}
                            </p>
                          </div>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400 text-[11px] font-medium">+ Set Schedule</span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      {subj.enrolled_count || 0} students
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSchedulingSubj(subj);
                            setScheduleTime(subj.schedule?.time_slot || '');
                            setScheduleRoom(subj.schedule?.classroom || '');
                          }}
                          className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg transition-colors cursor-pointer"
                          title="Configure Schedule (Time & Room)"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setAssigningSubj(subj);
                            setAssignInstructorId(subj.instructor_id || '');
                          }}
                          className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg transition-colors cursor-pointer"
                          title="Assign Instructor"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEnrollingSubj(subj);
                            setEnrollStudentId('');
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          title="Enroll Student"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Class Subject */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Curriculum Class Subject</h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Department</label>
                  <select
                    value={newSubjDept}
                    onChange={(e) => setNewSubjDept(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Subject Code</label>
                    <input
                      type="text"
                      placeholder="e.g. IPT 301"
                      value={newSubjCode}
                      onChange={(e) => setNewSubjCode(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Year Level</label>
                    <select
                      value={newSubjYear}
                      onChange={(e) => setNewSubjYear(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="1st">1st Year</option>
                      <option value="2nd">2nd Year</option>
                      <option value="3rd">3rd Year</option>
                      <option value="4th">4th Year</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Course / Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Integrative Programming & Technologies"
                    value={newSubjName}
                    onChange={(e) => setNewSubjName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Assigned Instructor (Optional)</label>
                  <select
                    value={newSubjInstructor}
                    onChange={(e) => setNewSubjInstructor(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">Unassigned (Assign later)</option>
                    {instructors.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                  <div>
                    <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Time Slot (Schedule)</label>
                    <input
                      type="text"
                      placeholder="e.g. MWF 9:00 AM - 10:30 AM"
                      value={newSubjTime}
                      onChange={(e) => setNewSubjTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Classroom</label>
                    <input
                      type="text"
                      placeholder="e.g. Room 402 / Lab 1"
                      value={newSubjRoom}
                      onChange={(e) => setNewSubjRoom(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.04] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="kn-btn-primary px-4 py-2 text-xs font-semibold cursor-pointer">
                    Save Subject
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Schedule Editor */}
      <AnimatePresence>
        {schedulingSubj && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Configure Class Schedule</h3>
                </div>
                <button onClick={() => setSchedulingSubj(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Updating schedule for: <strong className="text-slate-900 dark:text-white">{schedulingSubj.name}</strong> ({schedulingSubj.code})
              </p>

              <form onSubmit={handleSaveSchedule} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Time Slot</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TTh 10:00 AM - 11:30 AM"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Classroom Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lecture Hall B / Virtual Room 1"
                    value={scheduleRoom}
                    onChange={(e) => setScheduleRoom(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSchedulingSubj(null)}
                    className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.04] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="kn-btn-primary px-4 py-1.5 text-xs font-semibold cursor-pointer">
                    Save Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Assign Instructor */}
      <AnimatePresence>
        {assigningSubj && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Assign Faculty Instructor</h3>
                </div>
                <button onClick={() => setAssigningSubj(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Assign faculty to: <strong className="text-slate-900 dark:text-white">{assigningSubj.name}</strong> ({assigningSubj.code})
              </p>

              <form onSubmit={handleAssignInstructor} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Select Instructor</label>
                  <select
                    value={assignInstructorId}
                    onChange={(e) => setAssignInstructorId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {instructors.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAssigningSubj(null)}
                    className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.04] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="kn-btn-primary px-4 py-1.5 text-xs font-semibold cursor-pointer">
                    Confirm Assignment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Enroll Student */}
      <AnimatePresence>
        {enrollingSubj && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enroll Student into Subject</h3>
                </div>
                <button onClick={() => setEnrollingSubj(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Enrolling into: <strong className="text-slate-900 dark:text-white">{enrollingSubj.name}</strong> ({enrollingSubj.code})
              </p>

              <form onSubmit={handleEnrollStudent} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Select Student</label>
                  <select
                    value={enrollStudentId}
                    onChange={(e) => setEnrollStudentId(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">Select a student...</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEnrollingSubj(null)}
                    className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.04] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="kn-btn-primary px-4 py-1.5 text-xs font-semibold cursor-pointer">
                    Enroll Student
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminClassesView;

