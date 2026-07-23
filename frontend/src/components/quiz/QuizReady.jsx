import { motion } from 'framer-motion';
import { KnowrizonMascot, MASCOT_STATES } from '../ui/KnowrizonMascot';

/**
 * QuizReady — Pre-quiz intro with Knowri, quiz summary, Start button.
 */
export function QuizReady({ topic, questionCount, sourceMode, onStart }) {
  const sourceLabel =
    sourceMode === 'uploaded_only' ? 'From your uploaded materials'
    : sourceMode === 'uploaded_web' ? 'From materials + web enrichment'
    : 'AI-generated questions';

  return (
    <motion.div
      className="max-w-md mx-auto text-center space-y-6 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <KnowrizonMascot state={MASCOT_STATES.GREETING} size={80} className="mx-auto" />

      <div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Your Quiz is Ready!</h2>
        <p className="text-sm text-slate-400">
          {questionCount} questions about{' '}
          <span className="text-cyan-400 font-medium">{topic || 'your content'}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">{sourceLabel}</p>
      </div>

      {/* Tips */}
      <div className="quiz-glass p-4 text-left space-y-2 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">1</span>
          <span>Read each question carefully</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">2</span>
          <span>Use keyboard shortcuts (1-4) for quick answers</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">3</span>
          <span>Flag questions for review with (F)</span>
        </div>
      </div>

      <button
        onClick={onStart}
        className="px-10 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold text-base hover:opacity-90 transition-opacity quiz-glow"
        autoFocus
      >
        Start Quiz
      </button>
    </motion.div>
  );
}

export default QuizReady;
