import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Award, Target, CheckCircle2, AlertTriangle,
  RotateCcw, Sparkles, Brain, BookOpen, ArrowRight, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * ProgressDashboard — Study Mastery & Progress Analytics.
 *
 * Tracks study mastery, quiz accuracy, topics mastered,
 * review recommendations, and learning progress over time.
 */
export function ProgressDashboard({ onNavigateToQuiz = null }) {
  const { token } = useAuth();
  const [progressData, setProgressData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProgress = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/progress`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch progress');
      }

      setProgressData(data.progressData);
    } catch (err) {
      setError(err.message || 'Failed to load progress data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-500">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading your study progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Unable to Load Progress</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">{error}</p>
        <button
          onClick={fetchProgress}
          className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  const successRate = Math.round(progressData?.successRate || 0);
  const totalQuizzes = progressData?.totalQuizzes || 0;
  const totalQuestions = progressData?.totalQuestions || 0;
  const correctAnswers = progressData?.correctAnswers || 0;
  const topicsMastered = progressData?.topicsMastered || [];
  const topicsNeedingWork = progressData?.topicsNeedingWork || [];
  const recentHistory = progressData?.progressOverTime || [];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto overflow-y-auto h-full text-slate-900 dark:text-slate-100">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold border border-blue-200 dark:border-blue-800/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>Study Insights</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Mastery & Progress
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Track your quiz accuracy, mastered topics, and concepts to review.
          </p>
        </div>

        <button
          onClick={fetchProgress}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* ── 4 Key Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Success Rate */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overall Accuracy
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              successRate >= 80 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
              successRate >= 50 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
            {successRate}%
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {correctAnswers} of {totalQuestions} questions correct
          </p>
        </div>

        {/* Quizzes Completed */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quizzes Completed
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
            {totalQuizzes}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Completed practice sessions
          </p>
        </div>

        {/* Topics Mastered */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Mastered Topics
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
            {topicsMastered.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Topics with ≥80% sustained accuracy
          </p>
        </div>

        {/* Learning Stage */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Learning Level
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mb-1 truncate">
            {successRate >= 80 ? 'Subject Master' : successRate >= 50 ? 'Proficient Scholar' : 'Active Learner'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Every mistake helps you learn
          </p>
        </div>
      </div>

      {/* ── Topic Diagnostic Matrices ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Mastered Topics */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Mastered Topics (≥80%)</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold border border-emerald-200/60 dark:border-emerald-800/40">
              {topicsMastered.length} mastered
            </span>
          </div>

          {topicsMastered.length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
              Complete practice quizzes to unlock mastered topics.
            </div>
          ) : (
            <div className="space-y-2">
              {topicsMastered.map((topic, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800/30 dark:text-emerald-200"
                >
                  <span className="font-medium truncate">{topic}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">
                    Mastered
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Topics Needing Work */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Concepts to Review (&lt;50%)</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-semibold border border-amber-200/60 dark:border-amber-800/40">
              {topicsNeedingWork.length} to review
            </span>
          </div>

          {topicsNeedingWork.length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
              Great momentum! No persistent weak areas detected yet.
            </div>
          ) : (
            <div className="space-y-2">
              {topicsNeedingWork.map((topic, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-950 dark:bg-amber-950/20 dark:border-amber-800/30 dark:text-amber-200"
                >
                  <span className="font-medium truncate pr-2">{topic}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-semibold shrink-0">
                    Needs Practice
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quiz Score History Chart ── */}
      <div className="bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Quiz History Trends</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Recent quiz accuracy scores over time</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>≥80% (Mastered)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-amber-500" />
              <span>50–79%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-rose-500" />
              <span>&lt;50%</span>
            </div>
          </div>
        </div>

        {recentHistory.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs space-y-1">
            <BookOpen className="w-8 h-8 mx-auto opacity-30 text-blue-600 dark:text-blue-400 mb-1" />
            <p className="font-medium text-slate-700 dark:text-slate-300">No quiz history recorded yet</p>
            <p>Take a practice quiz to visualize your mastery score trends.</p>
          </div>
        ) : (
          <div className="h-48 flex items-end gap-3 pt-6 px-2">
            {recentHistory.slice(-10).map((entry, idx) => {
              const score = Math.round(entry.score || 0);
              const barColor = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500';
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{score}%</span>
                  <div className="w-full bg-slate-100 dark:bg-white/[0.04] rounded-t-lg h-36 flex items-end overflow-hidden p-0.5">
                    <div
                      className={`w-full rounded-t-md ${barColor} transition-all duration-500`}
                      style={{ height: `${Math.max(score, 6)}%` }}
                      title={`${entry.topic || 'Quiz'}: ${score}%`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full" title={entry.topic}>
                    {entry.topic ? entry.topic.slice(0, 8) : `#${idx + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgressDashboard;
