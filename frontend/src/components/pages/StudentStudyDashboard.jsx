import { useState, useEffect } from 'react';
import {
  Sparkles, BookOpen, Clock, ArrowRight, CheckCircle2, Dumbbell,
  Target, FileText, ChevronRight, Plus, Calendar, MapPin, Award,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';
import { KnowrizonMascot } from '../ui/KnowrizonMascot';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}

export function StudentStudyDashboard({ onNavigate }) {
  const { user, token, isAnonymous } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const greeting = getGreeting();
  const displayName = isAnonymous ? 'Guest' : (user?.name || 'Learner');

  useEffect(() => {
    if (!isAnonymous && token) {
      fetchStudentClassrooms();
    } else {
      setIsLoading(false);
    }
  }, [token, isAnonymous]);

  const fetchStudentClassrooms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/academic/student/classrooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClassrooms(data.classrooms || []);
      }
    } catch (err) {
      console.error('Failed to load student classrooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const primaryClass = classrooms[0] || null;

  return (
    <div className="p-5 lg:p-8 space-y-6 overflow-y-auto h-full max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 lg:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                STUDY DASHBOARD
              </span>
              <span className="text-xs text-slate-400">
                • {user?.school || 'University'} • {user?.course || 'Collegiate Studies'} ({user?.year_level || '1st'} Year)
              </span>
            </div>
            <h1 className="text-xl lg:text-3xl font-bold text-slate-900 dark:text-white">
              {greeting}, {displayName}
            </h1>
            <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              {primaryClass
                ? `You are actively enrolled in ${primaryClass.subject_code} - ${primaryClass.subject_name}. Socratic AI retrieval practice is ready for your uploaded course materials.`
                : "Welcome to Knowrizon AI. Your personal Socratic AI study companion is ready to help you master your curriculum."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate?.('/workspace')}
              className="kn-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Study Studio</span>
            </button>
            <button
              onClick={() => onNavigate?.('/classrooms')}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>My Classrooms</span>
            </button>
          </div>
        </div>
      </section>

      {/* Socratic Coach Insight */}
      <section className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-5 shadow-xs flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200">
            Knowri AI Socratic Tip
          </h3>
          <p className="text-xs text-blue-800 dark:text-blue-300/90 leading-relaxed">
            {primaryClass
              ? `Reviewing your ${primaryClass.subject_code} lecture notes with a quick 5-question retrieval quiz will consolidate memory retention before class!`
              : "Active retrieval practice strengthens neural pathways and improves exam performance far more than passive re-reading."}
          </p>
        </div>
      </section>

      {/* Enrolled Subjects (Dynamic — No Fake Subjects) */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Enrolled Curriculum Subjects ({classrooms.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Only your registered department courses for this academic term appear here.
            </p>
          </div>

          <button
            onClick={() => onNavigate?.('/schedule')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>View Weekly Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {classrooms.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-400 text-xs space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p>No enrolled subjects found for your department standing.</p>
            <p className="text-[11px]">Contact your Academic Dean to configure your curriculum enrollment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map((c) => (
              <div
                key={c.subject_id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-800 transition-all shadow-2xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {c.subject_code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {c.status || 'In Progress'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {c.subject_name}
                  </h3>

                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <p className="text-[11px]">
                      {c.department_name || 'Academic Dept'} • {c.year_level || '1st'} Year Standing
                    </p>
                    {c.instructor?.name && (
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                        Instructor: {c.instructor.name}
                      </p>
                    )}
                    {c.schedule?.time_slot && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span>{c.schedule.time_slot}</span>
                      </div>
                    )}
                    {c.schedule?.classroom && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <MapPin className="w-3 h-3 text-emerald-500" />
                        <span>{c.schedule.classroom}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 dark:border-white/[0.04] flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>{c.materials_count || 1} materials</span>
                  </span>
                  <button
                    onClick={() => onNavigate?.('/workspace')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open in Study Studio</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
export default StudentStudyDashboard;
