import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Award, Target, RotateCcw, AlertTriangle,
  Sparkles, CheckCircle2, ChevronRight, HelpCircle, BookOpen,
  Brain, BarChart3, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

export function ContextPanel({ onStartRetake, onAskConcept, refreshKey = 0 }) {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMasteryData();
  }, [token, refreshKey]);

  const fetchMasteryData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/progress/mastery`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (e) {
      console.error('Failed to load mastery telemetry:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const profile = dashboard?.profile || {};
  const progress = dashboard?.progress || {};
  const mistakes = dashboard?.mistakes || {};
  const recommendations = dashboard?.recommendations || [];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#161920] border-l border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">Mastery & Analytics</h2>
        </div>
        <button
          onClick={fetchMasteryData}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1"
          title="Refresh Progress"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Mastery Level Hero Card */}
        <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-white/[0.03] border border-blue-100 dark:border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
              Study Mastery
            </span>
          </div>

          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            {profile.masteryLevel || 'Building Fluency'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
            {profile.retrievalEfficiency || 'Gaining familiarity through Socratic practice.'}
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200/80 dark:border-white/[0.06]">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                {progress.successRate || 0}%
              </span>
              <span className="text-[10px] text-slate-400">Accuracy</span>
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                {profile.totalAttempts || 0}
              </span>
              <span className="text-[10px] text-slate-400">Attempts</span>
            </div>
            <div>
              <span className={`text-sm font-bold block ${
                (profile.improvementRate || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {(profile.improvementRate || 0) >= 0 ? '+' : ''}{profile.improvementRate || 0}%
              </span>
              <span className="text-[10px] text-slate-400">Improvement</span>
            </div>
          </div>
        </div>

        {/* Mistakes Tracker — "Mistakes are normal" */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Concepts to Review</h4>
            </div>
            <span className="text-[10px] text-slate-400">Normal for growth</span>
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Mistakes help you learn. Reviewing tricky concepts now locks them into long-term memory.
          </p>

          {mistakes.weakAreas && mistakes.weakAreas.length > 0 ? (
            <div className="space-y-2 pt-1">
              {mistakes.weakAreas.map((weak, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-white dark:bg-[#1C2029] border border-slate-200 dark:border-white/[0.06] flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{weak.concept}</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate mt-0.5">
                      Missed {weak.mistakeCount} time{weak.mistakeCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  {onAskConcept && (
                    <button
                      onClick={() => onAskConcept(weak.concept)}
                      className="text-[10px] px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40 transition-all font-medium shrink-0 flex items-center gap-1"
                    >
                      <span>Ask AI</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-2 text-[11px] text-slate-400">
              No persistent weak areas detected yet. Keep quizzing!
            </div>
          )}
        </div>

        {/* Retake & Socratic Recommendations */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Recommended Next Steps</h4>
          </div>

          <div className="space-y-2">
            {recommendations.slice(0, 3).map((rec, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-white dark:bg-[#1C2029] border border-slate-200 dark:border-white/[0.06] space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">{rec.title}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    rec.priority === 'high'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  }`}>
                    {rec.priority?.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {rec.description}
                </p>
                {rec.type === 'quiz_retake' && onStartRetake && (
                  <button
                    onClick={() => onStartRetake(rec.topic)}
                    className="w-full py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 dark:text-blue-300 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retake quiz on {rec.topic}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Academic Reference Citation */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] text-[10px] text-slate-500 space-y-1">
          <span className="font-semibold text-slate-600 dark:text-slate-400 block">
            Evidence-based learning
          </span>
          <p className="italic leading-relaxed">
            {profile.academicReference || 'Roediger & Butler: Retrieval practice strengthens memory retention and facilitates higher-order knowledge transfer.'}
          </p>
        </div>
      </div>
    </div>
  );
}
export default ContextPanel;
