import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { KnowrizonMascot, MASCOT_STATES } from '../ui/KnowrizonMascot';
import { AnswerOption } from './AnswerOption';
import { ValidityPanel } from './ValidityPanel';

/**
 * ReviewMode — Study Review and Focused Retry modes.
 * Study Review: shows correct answers and explanations for reading.
 * Focused Retry: student answers only incorrect questions; feedback after each.
 */
export function ReviewMode({
  mode, // 'study_review' | 'focused_review'
  questions, // Array of review question objects with correctAnswer, explanation, etc.
  onComplete,
  onExit,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [retryAnswers, setRetryAnswers] = useState({});
  const [showFeedback, setShowFeedback] = useState({});
  const [mastered, setMastered] = useState(new Set());

  const currentQ = questions[currentIndex];
  const total = questions.length;
  const masteredCount = mastered.size;

  const handleRetrySelect = useCallback((answerIndex) => {
    if (showFeedback[currentIndex]) return;
    setRetryAnswers(prev => ({ ...prev, [currentIndex]: answerIndex }));
  }, [currentIndex, showFeedback]);

  const handleRetrySubmit = useCallback(() => {
    const userAnswer = retryAnswers[currentIndex];
    if (userAnswer === undefined) return;
    
    const isCorrect = userAnswer === currentQ.correctAnswer;
    setShowFeedback(prev => ({ ...prev, [currentIndex]: true }));
    
    if (isCorrect) {
      setMastered(prev => new Set([...prev, currentQ.conceptId || currentQ.id]));
    }
  }, [currentIndex, retryAnswers, currentQ]);

  const handleNext = useCallback(() => {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All questions reviewed
      onComplete?.({
        totalReviewed: total,
        mastered: masteredCount + (showFeedback[currentIndex] && retryAnswers[currentIndex] === currentQ?.correctAnswer ? 1 : 0),
        stillIncorrect: total - masteredCount,
      });
    }
  }, [currentIndex, total, masteredCount, onComplete, showFeedback, retryAnswers, currentQ]);

  if (!currentQ) return null;

  // Study Review Mode — show everything upfront
  if (mode === 'study_review') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KnowrizonMascot state={MASCOT_STATES.THINKING} size={40} />
            <div>
              <h2 className="text-xl font-bold text-slate-100">Study Review</h2>
              <p className="text-sm text-slate-400">{total} questions to review</p>
            </div>
          </div>
          <button
            onClick={onExit}
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Exit Review
          </button>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id || idx} className="quiz-glass p-5 quiz-result-incorrect">
              <p className="text-sm text-slate-500 mb-1">Question {idx + 1}</p>
              <p className="text-slate-200 font-medium mb-3">{q.question}</p>
              
              {q.userAnswer !== undefined && (
                <div className="text-sm mb-1">
                  <span className="text-slate-400">Your answer: </span>
                  <span className="text-red-400">{q.options[q.userAnswer]}</span>
                </div>
              )}
              <div className="text-sm mb-3">
                <span className="text-slate-400">Correct answer: </span>
                <span className="text-green-400">{q.options[q.correctAnswer]}</span>
              </div>

              {q.explanation && (
                <div className="text-sm text-slate-300 mb-2">
                  <span className="font-medium text-slate-200">Explanation: </span>
                  {q.explanation}
                </div>
              )}
              {q.learningExplanation && (
                <div className="text-sm text-cyan-300/80 mb-2">
                  <span className="font-medium text-cyan-400">Learning insight: </span>
                  {q.learningExplanation}
                </div>
              )}
              <ValidityPanel validity={q.validity} />
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={onExit}
            className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            Return to Results
          </button>
        </div>
      </div>
    );
  }

  // Focused Retry Mode — interactive
  const hasFeedback = showFeedback[currentIndex];
  const selectedAnswer = retryAnswers[currentIndex];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KnowrizonMascot
            state={hasFeedback
              ? (selectedAnswer === currentQ.correctAnswer ? MASCOT_STATES.SUCCESS : MASCOT_STATES.THINKING)
              : MASCOT_STATES.LISTENING
            }
            size={40}
          />
          <div>
            <h2 className="text-xl font-bold text-slate-100">Focused Review</h2>
            <p className="text-sm text-slate-400">
              Question {currentIndex + 1} of {total} · {masteredCount} mastered
            </p>
          </div>
        </div>
        <button
          onClick={onExit}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Exit Review
        </button>
      </div>

      {/* Progress */}
      <div className="w-full bg-slate-800 rounded-full h-2" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemax={total}>
        <div
          className="quiz-gradient-bar h-2 rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <motion.div
        key={currentIndex}
        className="quiz-glass p-6"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-lg text-slate-100 font-medium leading-relaxed mb-6">
          {currentQ.question}
        </p>

        <div className="space-y-3" role="radiogroup" aria-label="Answer options">
          {currentQ.options.map((opt, optIdx) => (
            <AnswerOption
              key={optIdx}
              index={optIdx}
              option={opt}
              isSelected={selectedAnswer === optIdx}
              showFeedback={hasFeedback}
              isCorrect={optIdx === currentQ.correctAnswer}
              onClick={() => handleRetrySelect(optIdx)}
              disabled={hasFeedback}
            />
          ))}
        </div>

        {/* Post-answer feedback */}
        {hasFeedback && (
          <motion.div
            className="mt-6 space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={`p-4 rounded-xl ${
              selectedAnswer === currentQ.correctAnswer
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            }`}>
              <p className="text-sm font-medium mb-1">
                {selectedAnswer === currentQ.correctAnswer
                  ? '✅ Correct! You\'ve mastered this concept.'
                  : '❌ Not quite. Let\'s review:'}
              </p>
              {currentQ.explanation && (
                <p className="text-sm text-slate-300">{currentQ.explanation}</p>
              )}
              {currentQ.learningExplanation && (
                <p className="text-sm text-cyan-300/80 mt-2">{currentQ.learningExplanation}</p>
              )}
            </div>
            <ValidityPanel validity={currentQ.validity} />
          </motion.div>
        )}
      </motion.div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">
          {masteredCount} of {total} concepts mastered
        </span>
        {!hasFeedback ? (
          <button
            onClick={handleRetrySubmit}
            disabled={selectedAnswer === undefined}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            {currentIndex < total - 1 ? 'Next Question' : 'Complete Review'}
          </button>
        )}
      </div>
    </div>
  );
}

export default ReviewMode;
