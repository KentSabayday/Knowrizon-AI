import { motion } from 'framer-motion';

/**
 * QuestionCountSelector — Premium count selection with cards for 5/10/15/20.
 */

const COUNTS = [
  { count: 5, label: 'Quick', desc: 'A short warm-up quiz', time: '~3 min', icon: '⚡' },
  { count: 10, label: 'Standard', desc: 'A balanced assessment', time: '~6 min', icon: '📋' },
  { count: 15, label: 'Thorough', desc: 'A deep exploration', time: '~10 min', icon: '🎯' },
  { count: 20, label: 'Complete', desc: 'Full topic coverage', time: '~14 min', icon: '🏆' },
];

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export function QuestionCountSelector({ selectedCount, onSelectCount, onConfirm }) {
  return (
    <div className="max-w-2xl mx-auto text-center space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100 mb-1">How many questions?</h2>
        <p className="text-sm text-slate-400">Choose the depth of your assessment</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {COUNTS.map((item, i) => (
          <motion.button
            key={item.count}
            type="button"
            className={`quiz-count-card p-5 text-center ${
              selectedCount === item.count ? 'quiz-count-card-selected' : ''
            }`}
            onClick={() => onSelectCount(item.count)}
            initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : undefined}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : i * 0.08 }}
            whileHover={!prefersReducedMotion ? { scale: 1.03 } : undefined}
            aria-pressed={selectedCount === item.count}
            aria-label={`${item.count} questions — ${item.label}: ${item.desc}, estimated time ${item.time}`}
          >
            <span className="text-2xl block mb-1">{item.icon}</span>
            <span className="text-2xl font-bold text-slate-100 block">{item.count}</span>
            <span className="text-sm font-medium text-cyan-400 block mt-1">{item.label}</span>
            <span className="text-xs text-slate-500 block mt-0.5">{item.desc}</span>
            <span className="text-xs text-slate-600 block mt-1">{item.time}</span>
          </motion.button>
        ))}
      </div>

      <button
        onClick={onConfirm}
        disabled={!selectedCount}
        className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        Generate Quiz
      </button>
    </div>
  );
}

export default QuestionCountSelector;
