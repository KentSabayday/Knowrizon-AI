import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowrizonMascot, MASCOT_STATES } from '../ui/KnowrizonMascot';
import { ResultQuestionCard } from './ResultQuestionCard';
import { LearningReferences } from './LearningReferences';

/**
 * QuizResults — Full results dashboard with score hero, filters, result cards,
 * retake actions, and learning references.
 */

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

const FILTERS = [
  { key: 'all', label: 'All Questions' },
  { key: 'correct', label: 'Correct' },
  { key: 'incorrect', label: 'Incorrect' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'unscored', label: 'Needs Verification' },
];

export function QuizResults({
  results,
  flaggedQuestions = new Set(),
  onRetakeSame,
  onRetryIncorrect,
  onGenerateNew,
  onBackToSetup,
  onStartReview,
}) {
  const [filter, setFilter] = useState('all');
  const [allExpanded, setAllExpanded] = useState(false);

  const {
    score = 0,
    correctCount = 0,
    totalQuestions = 0,
    scoredQuestions = 0,
    unscoredQuestions = 0,
    results: questionResults = [],
    sourceMode,
    contentMeta,
  } = results || {};

  const percentage = Math.round(score * 100);
  const incorrectCount = totalQuestions - correctCount;

  // Score band
  const { band, mascotState } = useMemo(() => {
    if (percentage >= 90) return { band: 'Mastered', mascotState: MASCOT_STATES.CELEBRATING };
    if (percentage >= 75) return { band: 'Strong Progress', mascotState: MASCOT_STATES.SUCCESS };
    if (percentage >= 60) return { band: 'Developing', mascotState: MASCOT_STATES.GREETING };
    return { band: 'Needs Review', mascotState: MASCOT_STATES.THINKING };
  }, [percentage]);

  // Filtered results
  const filteredResults = useMemo(() => {
    if (filter === 'all') return questionResults;
    if (filter === 'correct') return questionResults.filter(r => r.isCorrect);
    if (filter === 'incorrect') return questionResults.filter(r => !r.isCorrect);
    if (filter === 'flagged') return questionResults.filter((_, i) => flaggedQuestions.has(i));
    if (filter === 'unscored') return questionResults.filter(r => !r.isScored);
    return questionResults;
  }, [filter, questionResults, flaggedQuestions]);

  // Score ring
  const circumference = 2 * Math.PI * 64;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const ringColor = percentage >= 90 ? '#22C55E' : percentage >= 75 ? '#22C7FF' : percentage >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Score Hero */}
      <motion.div
        className="quiz-glass quiz-glow p-8 text-center"
        initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : undefined}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <KnowrizonMascot state={mascotState} size={64} className="shrink-0" />
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Quiz Complete!</h2>
            <p className="text-sm text-slate-400">{band}</p>
          </div>
        </div>

        {/* Score Ring */}
        <div className="quiz-score-ring mx-auto mb-4">
          <svg viewBox="0 0 160 160" width="160" height="160">
            <circle className="quiz-score-ring-track" cx="80" cy="80" r="64" />
            <circle
              className="quiz-score-ring-fill"
              cx="80" cy="80" r="64"
              stroke={ringColor}
              strokeDasharray={circumference}
              strokeDashoffset={prefersReducedMotion ? strokeDashoffset : circumference}
              style={!prefersReducedMotion ? { strokeDashoffset, transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' } : undefined}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-slate-100">{percentage}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">{correctCount}</div>
            <div className="text-slate-400">Correct</div>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div className="text-center">
            <div className="text-lg font-bold text-red-400">{incorrectCount}</div>
            <div className="text-slate-400">Incorrect</div>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div className="text-center">
            <div className="text-lg font-bold text-slate-300">{totalQuestions}</div>
            <div className="text-slate-400">Total</div>
          </div>
          {unscoredQuestions > 0 && (
            <>
              <div className="w-px h-8 bg-slate-700" />
              <div className="text-center">
                <div className="text-lg font-bold text-amber-400">{unscoredQuestions}</div>
                <div className="text-slate-400">Unscored</div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        {incorrectCount > 0 && onRetryIncorrect && (
          <button
            onClick={onRetryIncorrect}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Review Incorrect Questions
          </button>
        )}
        {onRetakeSame && (
          <button
            onClick={onRetakeSame}
            className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            Retake Same Quiz
          </button>
        )}
        {onGenerateNew && (
          <button
            onClick={onGenerateNew}
            className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            Generate New Quiz
          </button>
        )}
        {onBackToSetup && (
          <button
            onClick={onBackToSetup}
            className="px-5 py-2.5 rounded-xl text-slate-400 font-medium text-sm hover:text-slate-200 transition-colors"
          >
            Back to Quiz Setup
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Result filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Question Results */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredResults.map((result, idx) => {
            const originalIndex = questionResults.indexOf(result);
            return (
              <motion.div
                key={result.questionId || idx}
                initial={!prefersReducedMotion ? { opacity: 0, y: 10 } : undefined}
                animate={{ opacity: 1, y: 0 }}
                exit={!prefersReducedMotion ? { opacity: 0, y: -10 } : undefined}
                transition={{ delay: prefersReducedMotion ? 0 : idx * 0.05 }}
              >
                <ResultQuestionCard result={result} index={originalIndex} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Learning References */}
      <LearningReferences results={questionResults} contentMeta={contentMeta} />
    </div>
  );
}

export default QuizResults;
