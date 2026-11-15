import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Award, BookOpen, CheckCircle2, Clock, AlertCircle,
  GraduationCap, Calendar, Download, RefreshCw, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * StudentGradesView — SFPMS My Grades Architecture
 * Replicates the SFPMS Grade Management architecture:
 * - Current GPA Metric Card with Award icon
 * - Total Units Enrolled & Passed
 * - Academic Standing ("Dean's Lister" / "Good Standing")
 * - Academic Year dropdown selector
 * - Full Academic Transcript Table: Subject Code, Title, Units, Instructor, Midterm, Final, Official Grade, Status, Remarks
 */
export function StudentGradesView({ onNavigate }) {
  const { token, user } = useAuth();
  const [gradesData, setGradesData] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAyId, setSelectedAyId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Academic Years list for selector
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

  // Fetch Student Grades
  const fetchStudentGrades = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const url = selectedAyId 
        ? `${API_BASE}/academic/student/grades?academic_year_id=${encodeURIComponent(selectedAyId)}`
        : `${API_BASE}/academic/student/grades`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGradesData(data);
        if (data.available_academic_years && data.available_academic_years.length > 0) {
          setAcademicYears(data.available_academic_years);
          if (!selectedAyId && data.selected_academic_year_id) {
            setSelectedAyId(data.selected_academic_year_id);
          }
        }
      } else {
        showNotification('Unable to load official grades', 'error');
      }
    } catch (err) {
      console.error('Failed to fetch student grades:', err);
      showNotification('Network error loading transcript', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedAyId]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    fetchStudentGrades();
  }, [fetchStudentGrades]);

  const currentAy = useMemo(() => {
    return academicYears.find(y => y.id === selectedAyId) || gradesData?.active_academic_year;
  }, [academicYears, selectedAyId, gradesData]);

  const gpa = gradesData?.gpa || '0.00';
  const totalUnits = gradesData?.total_units || 0;
  const passedUnits = gradesData?.passed_units || 0;
  const academicStanding = gradesData?.academic_standing || 'Good Standing';
  const transcript = gradesData?.grades || [];

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

      {/* Header & Academic Year Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
              Official Academic Records
            </span>
            {currentAy && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {currentAy.year_string || currentAy.yearString}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            My Grades
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            View your academic performance, term evaluations, and cumulative GPA
          </p>
        </div>

        {/* Academic Year Selector & Actions */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <label className="text-xs font-medium text-slate-400 block mb-1">Academic Year</label>
            <div className="relative">
              <select
                value={selectedAyId}
                onChange={(e) => setSelectedAyId(e.target.value)}
                className="appearance-none bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/[0.1] rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-slate-900 dark:text-white shadow-sm hover:border-purple-500 transition-colors cursor-pointer"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.year_string || ay.yearString} {ay.is_active ? '(Active Term)' : '(Archived)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={fetchStudentGrades}
            className="self-end p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1A1D24] text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors shadow-sm"
            title="Refresh grades"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* SFPMS 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Current GPA */}
        <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Current GPA</p>
              <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                {isLoading ? '...' : gpa}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Weighted Cumulative
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-inner">
              <Award className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Card 2: Total Units */}
        <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Units</p>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {isLoading ? '...' : `${totalUnits}.0`}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {passedUnits}.0 Units Passed
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
              <BookOpen className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Card 3: Academic Standing */}
        <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Academic Standing</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`text-xl font-bold ${
                  academicStanding.includes('Lister') 
                    ? 'text-amber-500 dark:text-amber-400' 
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {isLoading ? '...' : academicStanding}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Good Standing Status
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
              <GraduationCap className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Card 4: Term Enrolled Status */}
        <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-violet-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Term Status</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {isLoading ? '...' : (currentAy?.is_active ? 'Officially Enrolled' : 'Archived Term')}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {transcript.length} Subjects Registered
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shadow-inner">
              <Clock className="w-7 h-7" />
            </div>
          </div>
        </div>
      </div>

      {/* SFPMS Academic Transcript Card */}
      <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-300">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Academic Transcript</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Complete curriculum courses and official grade breakdown</p>
            </div>
          </div>

          <span className="text-xs font-medium text-slate-400">
            {transcript.length} {transcript.length === 1 ? 'Course' : 'Courses'}
          </span>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-7 h-7 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Loading official academic transcript...</p>
          </div>
        ) : transcript.length === 0 ? (
          <div className="py-16 text-center">
            <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">No grades recorded for this term</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Your instructor has not submitted official grades for this academic year yet. Check back following midterm and finals evaluation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#1A1D24]/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Course Code</th>
                  <th className="px-6 py-3.5">Course Title</th>
                  <th className="px-4 py-3.5 text-center">Units</th>
                  <th className="px-6 py-3.5">Instructor</th>
                  <th className="px-4 py-3.5 text-center">Midterm</th>
                  <th className="px-4 py-3.5 text-center">Final</th>
                  <th className="px-4 py-3.5 text-center">Official Grade</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-sm">
                {transcript.map((row) => {
                  const isPassed = row.remarks === 'Passed' || (row.grade && (row.grade <= 3.0 || row.grade >= 75));
                  const hasFinal = row.grade !== null && row.grade !== undefined;
                  return (
                    <tr key={row.enrollment_id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-bold text-purple-600 dark:text-purple-400">
                        {row.subject_code}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {row.subject_name}
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-600 dark:text-slate-300">
                        {row.units || 3}.0
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {row.instructor_name || 'TBA'}
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-700 dark:text-slate-200">
                        {row.midterm_grade !== null && row.midterm_grade !== undefined ? row.midterm_grade : '—'}
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-700 dark:text-slate-200">
                        {row.final_grade !== null && row.final_grade !== undefined ? row.final_grade : '—'}
                      </td>
                      <td className="px-4 py-4 text-center font-extrabold text-base text-slate-900 dark:text-white">
                        {hasFinal ? (
                          <span className={isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {row.grade}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-sm">In Progress</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          hasFinal
                            ? isPassed
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                        }`}>
                          {row.status || (hasFinal ? (isPassed ? 'Passed' : 'Failed') : 'In Progress')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {row.remarks || (hasFinal ? (isPassed ? 'Passed' : 'Conditional') : 'Evaluating')}
                        </span>
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

export default StudentGradesView;

