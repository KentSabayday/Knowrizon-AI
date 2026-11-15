import { useState, useEffect } from 'react';
import {
  Users, BookOpen, MessageSquare, Phone, Video, Sparkles,
  RefreshCw, CheckCircle2, UserPlus, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { API_BASE } from '../../lib/api';
import audioService from '../../lib/audio';

export function SubjectClassmatesList({ onChat, onVoiceCall, onVideoCall }) {
  const { token, user } = useAuth();
  const [cohorts, setCohorts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClassmates();
  }, [token]);

  const fetchClassmates = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/academic/student/classmates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCohorts(data.cohorts || []);
      }
    } catch (err) {
      console.error('Failed to load subject classmates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
        <RefreshCw className="w-4 h-4 animate-spin mr-2 text-blue-500" />
        <span>Loading your subject classmates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cohorts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-400 text-xs">
          <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p>No enrolled subjects found yet.</p>
        </div>
      ) : (
        cohorts.map((cohort) => (
          <div
            key={cohort.subject_id}
            className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  {cohort.subject_code}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {cohort.subject_name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {cohort.department_name} • {cohort.year_level} Year • Instructor: {cohort.instructor_name}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 self-start sm:self-center">
                {cohort.classmates?.length || 0} Peer Classmates
              </span>
            </div>

            {cohort.classmates && cohort.classmates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cohort.classmates.map((mate) => (
                  <div
                    key={mate.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3 shadow-2xs hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                          {mate.name?.charAt(0) || 'C'}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161920]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {mate.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">{mate.email}</p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                          {mate.course} • {mate.year_level} Year
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onChat?.(mate)}
                        title="Direct Message"
                        className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onVoiceCall?.(mate)}
                        title="Study Voice Call"
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-white/[0.02] text-center text-slate-400 text-xs">
                You are currently the first student enrolled in this section! New classmates will appear here when they register.
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
