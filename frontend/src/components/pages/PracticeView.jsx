import { useState, useCallback } from 'react';
import { QuizComponent } from '../quiz/QuizComponent';
import { Button } from '../ui/button';

/**
 * PracticeView - Quiz practice page.
 * Uses the new state-machine QuizComponent for the full quiz flow.
 * The QuizComponent handles its own setup, so PracticeView
 * simply provides a container and back-navigation.
 *
 * Requirements: 6.1, 6.2, 10.3
 */
export function PracticeView() {
  const [showQuiz, setShowQuiz] = useState(true);

  const handleQuizComplete = useCallback((results) => {
    console.log('Quiz completed:', results);
  }, []);

  const handleBackToHome = useCallback(() => {
    setShowQuiz(false);
    // Reset after a tick so re-entering remounts the component
    setTimeout(() => setShowQuiz(true), 0);
  }, []);

  return (
    <div className="overflow-auto h-full">
      {showQuiz && (
        <QuizComponent onComplete={handleQuizComplete} />
      )}
    </div>
  );
}

export default PracticeView;
