import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Award, BookOpen, Users, CheckCircle2, AlertCircle, RefreshCw,
  ChevronDown, Save, Calendar, Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * InstructorGradesView — SFPMS Faculty Grade Evaluation Architecture
 * Allows instructors to view their assigned subjects for an Academic Year,
 * inspect enrolled students, and input/update Midterm, Final, Official Grade, and Remarks.
 */
export function InstructorGradesView({ onNavigate }) {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAyId, setSelectedAyId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState({});
  const [gradeInputs, setGradeInputs] = useState({});
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Academic Years list
  const fetchAcademicYears = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/academic/academic-years`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const years = data.academic_years || [];
        setAcademicYears(years);
        const active = years.find(y => y.is_active);
        if (active && !selectedAyId) {
          setSelectedAyId(active.id);
        }
      }
    } catch (err) {
      console.error('Failed to load academic years:', err);
    }
  }, [token, selectedAyId]);

  // Fetch Instructor's subjects for selected AY
  const fetchInstructorSubjects = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const url = selectedAyId
        ? `${API_BASE}/academic/instructor/subjects?academic_year_id=${encodeURIComponent(selectedAyId)}`
        : `${API_BASE}/academic/instructor/subjects`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const subjList = data.subjects || [];
        setSubjects(subjList);
        
        // Default select first subject if none selected or if previous not in list
        if (subjList.length > 0) {
          if (!selectedSubjectId || !subjList.some(s => s.id === selectedSubjectId)) {
            setSelectedSubjectId(subjList[0].id);
          }
        } else {
          setSelectedSubjectId('');
        }
      } else {
        showNotification('Unable to load instructor subjects', 'error');
      }
    } catch (err) {
      console.error('Failed to load subjects:', err);
      showNotification('Network error loading subjects', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedAyId, selectedSubjectId]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    fetchInstructorSubjects();
  }, [fetchInstructorSubjects]);

  // Active Subject details
  const activeSubject = useMemo(() => {
    return subjects.find(s => s.id === selectedSubjectId) || null;
  }, [subjects, selectedSubjectId]);

  // Sync enrolled students into local editable inputs state
  useEffect(() => {
    if (activeSubject && activeSubject.enrolled_students) {
      const inputs = {};
      const sanitizeGrade = (val) => {
        if (val === null || val === undefined || val === '' || val === 'In Progress' || isNaN(Number(val))) return '';
        return val;
      };
      activeSubject.enrolled_students.forEach(student => {
        inputs[student.enrollment_id] = {
          midterm_grade: sanitizeGrade(student.midterm_grade),
          final_grade: sanitizeGrade(student.final_grade),
          grade: sanitizeGrade(student.grade),
          remarks: student.remarks || 'In Progress'
        };
      });
      setGradeInputs(inputs);
    }
  }, [activeSubject]);

  // Handle grade change
  const handleInputChange = (enrollmentId, field, value) => {
    setGradeInputs(prev => {
      const row = { ...(prev[enrollmentId] || {}) };
      row[field] = value;

      // Auto-compute overall grade if both midterm and final are provided numbers and grade hasn't been set manually
      if (field === 'midterm_grade' || field === 'final_grade') {
        const mg = parseFloat(field === 'midterm_grade' ? value : row.midterm_grade);
        const fg = parseFloat(field === 'final_grade' ? value : row.final_grade);
        if (!isNaN(mg) && !isNaN(fg)) {
          const avg = ((mg + fg) / 2).toFixed(2);
          row.grade = avg;
          const numAvg = parseFloat(avg);
          row.remarks = (numAvg >= 75 || (numAvg <= 3.0 && numAvg >= 1.0)) ? 'Passed' : 'Failed';
        }
      }

      return { ...prev, [enrollmentId]: row };
    });
  };

  // Save single student grade
  const handleSaveGrade = async (enrollmentId) => {
    const input = gradeInputs[enrollmentId];
    if (!input) return;

    setIsSaving(prev => ({ ...prev, [enrollmentId]: true }));
    try {
      const payload = {
        midterm_grade: input.midterm_grade === '' ? null : parseFloat(input.midterm_grade),
        final_grade: input.final_grade === '' ? null : parseFloat(input.final_grade),
        grade: input.grade === '' ? null : parseFloat(input.grade),
        remarks: input.remarks || 'In Progress'
      };

      const res = await fetch(`${API_BASE}/academic/enrollments/${enrollmentId}/grade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showNotification('Student grade saved successfully');
        // Update local activeSubject state
        if (activeSubject) {
          activeSubject.enrolled_students = activeSubject.enrolled_students.map(s => {
            if (s.enrollment_id === enrollmentId) {
              return {
                ...s,
                ...payload
              };
            }
            return s;
          });
        }
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to update grade', 'error');
      }
    } catch (err) {
      console.error('Save grade error:', err);
      showNotification('Network error saving grade', 'error');
    } finally {
      setIsSaving(prev => ({ ...prev, [enrollmentId]: false }));
    }
  };

  // Enrolled students filtered by search
  const filteredStudents = useMemo(() => {
    if (!activeSubject || !activeSubject.enrolled_students) return [];
    if (!searchQuery.trim()) return activeSubject.enrolled_students;
    const q = searchQuery.toLowerCase();
    return activeSubject.enrolled_students.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  }, [activeSubject, searchQuery]);

  // Statistics for selected class
  const classStats = useMemo(() => {
    const students = activeSubject?.enrolled_students || [];
    const total = students.length;
    const graded = students.filter(s => s.grade !== null && s.grade !== undefined).length;
    const passed = students.filter(s => s.remarks === 'Passed' || (s.grade && (s.grade <= 3.0 || s.grade >= 75))).length;
    const passRate = total > 0 && graded > 0 ? ((passed / total) * 100).toFixed(0) : '0';
    return { total, graded, passRate };
  }, [activeSubject]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-medium ${
          notification.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-700 dark:text-rose-300'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-700 dark:text-emerald-300'
        }`}>
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
              Grade Evaluation Module
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Student Grades
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Evaluate learner progress, enter midterm and final marks, and submit official transcripts
          </p>
        </div>

        {/* Academic Year & Subject Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* AY Selector */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Academic Year</label>
            <div className="relative">
              <select
                value={selectedAyId}
                onChange={(e) => setSelectedAyId(e.target.value)}
                className="appearance-none bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/[0.1] rounded-xl px-4 py-2 pr-9 text-xs font-semibold text-slate-900 dark:text-white shadow-sm hover:border-purple-500 transition-colors cursor-pointer"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.year_string || ay.yearString} {ay.is_active ? '(Active)' : '(Archived)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Select Subject</label>
            <div className="relative">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="appearance-none bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/[0.1] rounded-xl px-4 py-2 pr-9 text-xs font-semibold text-slate-900 dark:text-white shadow-sm hover:border-purple-500 transition-colors cursor-pointer max-w-[220px] truncate"
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects assigned</option>
                ) : (
                  subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code || s.name} - {s.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={fetchInstructorSubjects}
            className="self-end p-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1A1D24] text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Class Statistics Cards */}
      {activeSubject && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Enrolled</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                {classStats.total} Students
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Evaluated</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                {classStats.graded} / {classStats.total}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pass Rate</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                {classStats.passRate}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Roster & Grade Input Card */}
      <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-sm">
        {/* Table Header with Search */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {activeSubject ? `${activeSubject.name} (${activeSubject.code || 'FAR 101'})` : 'Student Roster'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Input numeric scores (0-100 or 1.0-5.0 scale) and update standing remarks
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#1A1D24] text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 w-full sm:w-56"
            />
          </div>
        </div>

        {/* Grades Table */}
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-7 h-7 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Loading student roster...</p>
          </div>
        ) : !activeSubject ? (
          <div className="py-16 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">No subject selected</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Select an assigned teaching subject to inspect and input grades.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">No enrolled students</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery ? 'No students match your search criteria.' : 'No students are currently enrolled in this subject.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#1A1D24]/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-4 py-3.5 text-center w-28">Midterm</th>
                  <th className="px-4 py-3.5 text-center w-28">Final</th>
                  <th className="px-4 py-3.5 text-center w-32">Official Grade</th>
                  <th className="px-4 py-3.5 text-center w-36">Remarks</th>
                  <th className="px-6 py-3.5 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-sm">
                {filteredStudents.map((student) => {
                  const input = gradeInputs[student.enrollment_id] || {};
                  const isRowSaving = isSaving[student.enrollment_id];

                  return (
                    <tr key={student.enrollment_id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                      {/* Student info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {student.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-xs">
                              {student.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Midterm Grade */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="—"
                          value={input.midterm_grade ?? ''}
                          onChange={(e) => handleInputChange(student.enrollment_id, 'midterm_grade', e.target.value)}
                          className="w-20 text-center py-1.5 px-2 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#16181D] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-sm"
                        />
                      </td>

                      {/* Final Grade */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="—"
                          value={input.final_grade ?? ''}
                          onChange={(e) => handleInputChange(student.enrollment_id, 'final_grade', e.target.value)}
                          className="w-20 text-center py-1.5 px-2 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#16181D] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-sm"
                        />
                      </td>

                      {/* Official Grade */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="—"
                          value={input.grade ?? ''}
                          onChange={(e) => handleInputChange(student.enrollment_id, 'grade', e.target.value)}
                          className="w-24 text-center py-1.5 px-2 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#16181D] text-xs font-bold text-purple-600 dark:text-purple-400 focus:outline-none focus:border-purple-500 shadow-sm"
                        />
                      </td>

                      {/* Remarks */}
                      <td className="px-4 py-4 text-center">
                        <select
                          value={input.remarks || 'In Progress'}
                          onChange={(e) => handleInputChange(student.enrollment_id, 'remarks', e.target.value)}
                          className="py-1.5 px-2 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#16181D] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-sm"
                        >
                          <option value="Passed">Passed</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Incomplete">Incomplete</option>
                          <option value="Dropped">Dropped</option>
                          <option value="Failed">Failed</option>
                        </select>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleSaveGrade(student.enrollment_id)}
                          disabled={isRowSaving}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                        >
                          {isRowSaving ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>Save</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstructorGradesView;

