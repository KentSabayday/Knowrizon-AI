import { KnowrizonMascot, MASCOT_STATES } from '../ui/KnowrizonMascot';
import { motion } from 'framer-motion';

/**
 * ReviewComplete — Mastery summary showing original score vs review progress.
 * Never overwrites original score.
 */
export function ReviewComplete({
  originalScore,
  reviewResult,
  onRetryRemaining,
  onBackToResults,
  onBackToSetup,
}) {
  const { totalReviewed = 0, mastered = 0 } = reviewResult || {};
  const stillIncorrect = totalReviewed - mastered;
  const masteryPercent = totalReviewed > 0 ? Math.round((mastered / totalReviewed) * 100) : 0;
  const originalPercent = Math.round((originalScore || 0) * 100);

  return (
    <div className="max-w-2xl mx-auto text-center space-y-6">
      <motion.div
        className="quiz-glass quiz-glow p-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <KnowrizonMascot
          state={masteryPercent === 100 ? MASCOT_STATES.CELEBRATING : MASCOT_STATES.SUCCESS}
          size={80}
          className="mx-auto mb-4"
        />

        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          {masteryPercent === 100 ? 'All Concepts Mastered!' : 'Review Complete'}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {masteryPercent === 100
            ? 'You\'ve successfully corrected all missed questions. Keep it up!'
            : `You've made progress. ${stillIncorrect} concept${stillIncorrect !== 1 ? 's' : ''} still need${stillIncorrect === 1 ? 's' : ''} practice.`
          }
        </p>

        {/* Score comparison */}
        <div className="flex items-center justify-center gap-8 mb-6">
          <div className="text-center">
            <div className="text-sm text-slate-400 mb-1">Original Score</div>
            <div className="text-3xl font-bold text-slate-300">{originalPercent}%</div>
          </div>
          <div className="text-slate-600">→</div>
          <div className="text-center">
            <div className="text-sm text-slate-400 mb-1">Review Mastery</div>
            <div className="text-3xl font-bold quiz-gradient-text">{masteryPercent}%</div>
            <div className="text-xs text-slate-500 mt-1">
              {mastered} of {totalReviewed} concepts corrected
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        {stillIncorrect > 0 && onRetryRemaining && (
          <button
            onClick={onRetryRemaining}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Practice Remaining ({stillIncorrect})
          </button>
        )}
        {onBackToResults && (
          <button
            onClick={onBackToResults}
            className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            View Results
          </button>
        )}
        {onBackToSetup && (
          <button
            onClick={onBackToSetup}
            className="px-5 py-2.5 rounded-xl text-slate-400 font-medium text-sm hover:text-slate-200 transition-colors"
          >
            New Quiz
          </button>
        )}
      </div>
    </div>
  );
}

export default ReviewComplete;
