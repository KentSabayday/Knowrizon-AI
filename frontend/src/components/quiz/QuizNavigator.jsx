/**
 * QuizNavigator — Compact dot/button navigator for quiz questions.
 * States: current, answered, unanswered, flagged.
 */
export function QuizNavigator({
  totalQuestions,
  currentIndex,
  answers,
  flagged = new Set(),
  onNavigate,
  className = '',
}) {
  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`}
      role="navigation"
      aria-label="Question navigator"
    >
      {Array.from({ length: totalQuestions }, (_, i) => {
        const isAnswered = answers[i] !== null && answers[i] !== undefined;
        const isCurrent = i === currentIndex;
        const isFlagged = flagged.has(i);

        let dotClass = 'quiz-nav-dot-unanswered';
        if (isCurrent) dotClass = 'quiz-nav-dot-current';
        else if (isFlagged) dotClass = 'quiz-nav-dot-flagged';
        else if (isAnswered) dotClass = 'quiz-nav-dot-answered';

        return (
          <button
            key={i}
            className={`quiz-nav-dot ${dotClass}`}
            onClick={() => onNavigate(i)}
            aria-label={`Question ${i + 1}${isAnswered ? ', answered' : ', unanswered'}${isFlagged ? ', flagged' : ''}${isCurrent ? ', current' : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
            type="button"
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

export default QuizNavigator;
