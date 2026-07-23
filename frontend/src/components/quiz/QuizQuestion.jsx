import { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnswerOption } from './AnswerOption';
import { QuizNavigator } from './QuizNavigator';

/**
 * QuizQuestion — Active question UI with progress bar, keyboard shortcuts,
 * answer options, flag-for-review, and navigation.
 */

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export function QuizQuestion({
  question,        // { id, question, options, difficulty, topic, conceptId }
  questionIndex,
  totalQuestions,
  selectedAnswer,
  answers,
  flagged,
  onSelectAnswer,
  onNavigate,
  onFlag,
  onSubmit,
}) {
  const isFlagged = flagged.has(questionIndex);
  const answeredCount = Object.values(answers).filter(a => a !== null && a !== undefined).length;
  const allAnswered = answeredCount === totalQuestions;
  const progress = ((questionIndex + 1) / totalQuestions) * 100;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1-4 for answer selection
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < (question?.options?.length || 0)) {
          onSelectAnswer(idx);
        }
      }
      // Left/Right arrows for navigation
      if (e.key === 'ArrowLeft' && questionIndex > 0) {
        onNavigate(questionIndex - 1);
      }
      if (e.key === 'ArrowRight' && questionIndex < totalQuestions - 1) {
        onNavigate(questionIndex + 1);
      }
      // F for flag
      if (e.key.toLowerCase() === 'f') {
        onFlag(questionIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [questionIndex, totalQuestions, question, onSelectAnswer, onNavigate, onFlag]);

  if (!question) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Progress bar */}
      <div className="relative">
        <div className="w-full bg-slate-800 rounded-full h-1.5" role="progressbar" aria-valuenow={questionIndex + 1} aria-valuemax={totalQuestions}>
          <motion.div
            className="quiz-gradient-bar h-1.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
          <span>Question {questionIndex + 1} of {totalQuestions}</span>
          <div className="flex items-center gap-2">
            {question.difficulty && (
              <span className={`px-2 py-0.5 rounded-md text-xs ${
                question.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
                question.difficulty === 'challenging' ? 'bg-red-500/10 text-red-400' :
                'bg-cyan-500/10 text-cyan-400'
              }`}>
                {question.difficulty}
              </span>
            )}
            {question.topic && <span className="text-slate-600">{question.topic}</span>}
          </div>
        </div>
      </div>

      {/* Question navigator */}
      <QuizNavigator
        totalQuestions={totalQuestions}
        currentIndex={questionIndex}
        answers={answers}
        flagged={flagged}
        onNavigate={onNavigate}
      />

      {/* Question card */}
      <motion.div
        key={questionIndex}
        className="quiz-glass p-6 quiz-glow"
        initial={!prefersReducedMotion ? { opacity: 0, x: 20 } : undefined}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Flag button */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <p className="text-lg text-slate-100 font-medium leading-relaxed flex-1">
            {question.question}
          </p>
          <button
            type="button"
            onClick={() => onFlag(questionIndex)}
            className={`shrink-0 p-1.5 rounded-lg transition-colors ${
              isFlagged ? 'text-amber-400 bg-amber-500/10' : 'text-slate-600 hover:text-amber-400'
            }`}
            aria-label={isFlagged ? 'Unflag question' : 'Flag question for review'}
            title="Press F to toggle flag"
          >
            <svg className="w-5 h-5" fill={isFlagged ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          </button>
        </div>

        {/* Answer options */}
        <div className="space-y-3" role="radiogroup" aria-label="Answer options">
          {question.options.map((opt, idx) => (
            <AnswerOption
              key={idx}
              index={idx}
              option={opt}
              isSelected={selectedAnswer === idx}
              onClick={() => onSelectAnswer(idx)}
            />
          ))}
        </div>
      </motion.div>

      {/* Navigation and submit */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate(Math.max(0, questionIndex - 1))}
          disabled={questionIndex === 0}
          className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous question"
        >
          ← Previous
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{answeredCount}/{totalQuestions} answered</span>
          
          {questionIndex < totalQuestions - 1 ? (
            <button
              type="button"
              onClick={() => onNavigate(questionIndex + 1)}
              className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700 transition-colors"
              aria-label="Next question"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!allAnswered}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              aria-label={allAnswered ? 'Submit quiz' : `Answer all questions first (${totalQuestions - answeredCount} remaining)`}
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>

      {/* Keyboard help */}
      <p className="text-xs text-slate-600 text-center">
        Keys: 1-4 select answer · ←→ navigate · F flag question
      </p>
    </div>
  );
}

export default QuizQuestion;
