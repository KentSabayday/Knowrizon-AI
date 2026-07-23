import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * AnswerOption — Premium answer option with A/B/C/D label, animations, and accessibility.
 */

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export function AnswerOption({
  index,
  option,
  isSelected,
  showFeedback = false,
  isCorrect = false,
  onClick,
  disabled = false,
}) {
  const letter = LETTERS[index] || String(index + 1);

  const optionClass = useMemo(() => {
    if (showFeedback) {
      if (isCorrect) return 'quiz-option border-green-500/60 bg-green-500/10';
      if (isSelected && !isCorrect) return 'quiz-option border-red-500/60 bg-red-500/10';
      return 'quiz-option opacity-50';
    }
    return isSelected ? 'quiz-option quiz-option-selected' : 'quiz-option';
  }, [showFeedback, isCorrect, isSelected]);

  const letterClass = useMemo(() => {
    if (showFeedback) {
      if (isCorrect) return 'bg-green-500 text-white';
      if (isSelected && !isCorrect) return 'bg-red-500 text-white';
      return 'bg-slate-700 text-slate-400';
    }
    return isSelected
      ? 'bg-gradient-to-br from-cyan-400 to-indigo-500 text-white'
      : 'bg-slate-800 text-slate-400';
  }, [showFeedback, isCorrect, isSelected]);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-4 text-left flex items-center gap-4 ${optionClass} ${
        disabled ? 'cursor-default' : 'cursor-pointer'
      }`}
      whileTap={!prefersReducedMotion && !disabled ? { scale: 0.98 } : undefined}
      layout={!prefersReducedMotion}
      aria-label={`Option ${letter}: ${option}`}
      aria-pressed={isSelected}
      role="radio"
      aria-checked={isSelected}
      data-testid={`answer-option-${index}`}
    >
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${letterClass}`}
      >
        {showFeedback && isCorrect ? (
          <CheckIcon />
        ) : showFeedback && isSelected && !isCorrect ? (
          <XIcon />
        ) : (
          letter
        )}
      </span>
      <span className="flex-1 text-slate-100 text-[0.95rem] leading-relaxed">
        {option}
      </span>
      {isSelected && !showFeedback && (
        <CheckCircleIcon className="w-5 h-5 text-cyan-400 shrink-0" />
      )}
    </motion.button>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default AnswerOption;
