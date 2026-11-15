import { useState, useEffect } from 'react';
import {
  GraduationCap, Users, BookOpen, CheckCircle, FileText,
  Clock, ArrowRight, BarChart3, HelpCircle, Calendar, MapPin,
  Sparkles, Brain, RefreshCw, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

export function InstructorDashboardView({ onNavigate }) {
  const { user, token } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInstructorData();
  }, [token]);

  const fetchInstructorData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/academic/instructor/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      }
    } catch (err) {
      console.warn('Instructor fetch notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalEnrolled = subjects.reduce((sum, s) => sum + (s.enrolled_count || s.enrolled_students?.length || 0), 0);
  const totalMaterials = subjects.reduce((sum, s) => sum + (s.materials_count || s.materials?.length || 0), 0);

  return (
    <div className="p-5 lg:p-8 space-y-6 overflow-y-auto h-full max-w-7xl mx-auto">
      {/* Instructor Banner */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 lg:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                  FACULTY COCKPIT
                </span>
                <span className="text-xs text-slate-400">• Academic Instruction</span>
              </div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">
                Welcome, {user?.name || 'Professor'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track assigned class subjects, oversee enrolled student cohorts, and publish retrieval quizzes from uploaded materials.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate?.('/workspace')}
              className="kn-btn-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Class Studio</span>
            </button>
            <button
              onClick={() => onNavigate?.('/practice')}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all cursor-pointer flex items-center gap-2"
            >
              <Brain className="w-4 h-4 text-purple-600" />
              <span>Quizzes & Exams</span>
            </button>
          </div>
        </div>
      </section>

      {/* Real Aggregate Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {isLoading ? '...' : totalEnrolled}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Active enrolled learners
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Assigned Class Subjects</span>
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {isLoading ? '...' : subjects.length}
          </p>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            Active curriculum assignments
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Indexed Course Materials</span>
            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {isLoading ? '...' : totalMaterials}
          </p>
          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
            Ready for AI quiz generation
          </span>
        </div>
      </div>

      {/* Available Subjects with Enrolled Students Count */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Assigned Subjects & Enrolled Cohorts ({subjects.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Classes under your direct faculty stewardship. Review student rosters and curriculum schedules.
            </p>
          </div>

          <button
            onClick={() => onNavigate?.('/instructor')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Manage Subjects & Rosters</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-400 text-xs">
            No subjects assigned yet for this academic year. Contact your Academic Dean.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((s) => {
              const enrolledCount = s.enrolled_count || s.enrolled_students?.length || 0;
              return (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex flex-col justify-between space-y-4 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {s.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {enrolledCount} {enrolledCount === 1 ? 'Student Enrolled' : 'Students Enrolled'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {s.name}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {s.department_name || 'Academic Dept'} • {s.year_level || '1st'} Year Standing
                    </p>

                    {s.schedule && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.04] space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">{s.schedule.time_slot}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{s.schedule.classroom}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.04] flex items-center justify-between gap-2">
                    <button
                      onClick={() => onNavigate?.('/workspace')}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 dark:text-blue-300 text-xs font-semibold transition-all text-center cursor-pointer"
                    >
                      Class Studio
                    </button>
                    <button
                      onClick={() => onNavigate?.('/practice')}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 dark:text-purple-300 text-xs font-semibold transition-all text-center cursor-pointer"
                    >
                      Create Quiz
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
export default InstructorDashboardView;
