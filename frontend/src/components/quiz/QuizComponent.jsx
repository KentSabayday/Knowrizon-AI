import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';
import { QuizSetup } from './QuizSetup';
import { QuizCardIntro } from './QuizCardIntro';
import { QuestionCountSelector } from './QuestionCountSelector';
import { QuizGenerating } from './QuizGenerating';
import { QuizReady } from './QuizReady';
import { QuizQuestion } from './QuizQuestion';
import { QuizResults } from './QuizResults';
import { ReviewMode } from './ReviewMode';
import { ReviewComplete } from './ReviewComplete';
import './quiz.css';

/**
 * QuizComponent — State-machine orchestrator for the quiz module.
 *
 * States: setup → card_intro → question_count → generating → ready →
 *         active → submitting → results → study_review | focused_review →
 *         review_complete
 *
 * Props (backward-compatible):
 * - topic: Optional topic string
 * - contentId: Optional content ID
 * - questionCount: Optional number (overrides selector)
 * - onComplete: Callback with results
 */

const STATES = {
  SETUP: 'setup',
  CARD_INTRO: 'card_intro',
  QUESTION_COUNT: 'question_count',
  GENERATING: 'generating',
  READY: 'ready',
  ACTIVE: 'active',
  SUBMITTING: 'submitting',
  RESULTS: 'results',
  STUDY_REVIEW: 'study_review',
  FOCUSED_REVIEW: 'focused_review',
  REVIEW_COMPLETE: 'review_complete',
  ERROR: 'error',
};

export function QuizComponent({ topic: propTopic, contentId: propContentId, questionCount: propCount, onComplete }) {
  const { token } = useAuth();
  const abortRef = useRef(null);

  // State machine
  const [state, setState] = useState(
    (propTopic || propContentId) ? STATES.CARD_INTRO : STATES.SETUP
  );

  // Quiz config — use both state and ref so generateQuiz always reads latest
  const [quizConfig, setQuizConfig] = useState({
    topic: propTopic || null,
    contentId: propContentId || null,
    sourceMode: propContentId ? 'uploaded_only' : 'topic_based',
  });
  const quizConfigRef = useRef(quizConfig);
  const [questionCount, setQuestionCount] = useState(propCount || 10);

  // Keep ref in sync with state
  useEffect(() => {
    quizConfigRef.current = quizConfig;
  }, [quizConfig]);

  // Quiz data from API (no correct answers during active quiz)
  const [quizData, setQuizData] = useState(null); // { quizId, questions, ... }
  const [quizId, setQuizId] = useState(null);

  // Active quiz state
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Results
  const [results, setResults] = useState(null);
  const [reviewResult, setReviewResult] = useState(null);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [error, setError] = useState(null);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────

  const handleSetupComplete = useCallback((config) => {
    setQuizConfig(config);
    quizConfigRef.current = config; // Sync ref immediately
    setState(STATES.CARD_INTRO);
  }, []);

  const generateQuiz = useCallback(async (count) => {
    // Always read from ref to get the latest config
    const config = quizConfigRef.current;
    setState(STATES.GENERATING);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          topic: config.topic,
          contentId: config.contentId,
          questionCount: count,
          sourceMode: config.sourceMode,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Quiz generation failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setQuizData(data);
      setQuizId(data.quizId);
      setQuestionCount(data.questions?.length || count);

      // Initialize answers map
      const initialAnswers = {};
      (data.questions || []).forEach((_, i) => {
        initialAnswers[i] = null;
      });
      setAnswers(initialAnswers);
      setFlagged(new Set());
      setCurrentQuestion(0);

      setState(STATES.READY);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      setState(STATES.ERROR);
    }
  }, [token]);

  const handleCardIntroComplete = useCallback(() => {
    if (propCount) {
      generateQuiz(propCount);
    } else {
      setState(STATES.QUESTION_COUNT);
    }
  }, [propCount, generateQuiz]);

  const handleCountConfirm = useCallback(() => {
    generateQuiz(questionCount);
  }, [questionCount, generateQuiz]);

  const handleStartQuiz = useCallback(() => {
    setState(STATES.ACTIVE);
  }, []);

  const handleSelectAnswer = useCallback((answerIndex) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: answerIndex }));
  }, [currentQuestion]);

  const handleNavigate = useCallback((index) => {
    setCurrentQuestion(index);
  }, []);

  const handleFlag = useCallback((index) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setState(STATES.SUBMITTING);

    const answersList = [];
    const questions = quizData?.questions || [];
    for (let i = 0; i < questions.length; i++) {
      answersList.push(answers[i] ?? -1);
    }

    try {
      const res = await fetch(`${API_BASE}/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          quizId,
          answers: answersList,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Submission failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const gradeResult = await res.json();
      setResults(gradeResult);
      setState(STATES.RESULTS);
      onComplete?.(gradeResult);
    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  }, [quizData, answers, quizId, token, onComplete]);

  const handleRetakeSame = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/quiz/retake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ quizId }),
      });

      if (!res.ok) throw new Error('Retake failed');

      const data = await res.json();
      setQuizData(data);
      setQuizId(data.quizId);

      const initialAnswers = {};
      (data.questions || []).forEach((_, i) => {
        initialAnswers[i] = null;
      });
      setAnswers(initialAnswers);
      setFlagged(new Set());
      setCurrentQuestion(0);
      setResults(null);
      setState(STATES.READY);
    } catch (err) {
      setError(err.message);
    }
  }, [quizId, token]);

  const handleStartStudyReview = useCallback(async () => {
    // Fetch review data from backend
    try {
      const answersList = [];
      const questions = quizData?.questions || [];
      for (let i = 0; i < questions.length; i++) {
        answersList.push(answers[i] ?? -1);
      }

      const res = await fetch(`${API_BASE}/quiz/${quizId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ answers: answersList }),
      });

      if (!res.ok) throw new Error('Failed to load review');

      const reviewData = await res.json();
      setReviewQuestions(reviewData.questions || []);
      setState(STATES.STUDY_REVIEW);
    } catch (err) {
      setError(err.message);
    }
  }, [quizId, quizData, answers, token]);

  const handleStartFocusedReview = useCallback(async () => {
    try {
      const answersList = [];
      const questions = quizData?.questions || [];
      for (let i = 0; i < questions.length; i++) {
        answersList.push(answers[i] ?? -1);
      }

      const res = await fetch(`${API_BASE}/quiz/${quizId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ answers: answersList }),
      });

      if (!res.ok) throw new Error('Failed to load review');

      const reviewData = await res.json();
      // Only include incorrect questions for focused review
      const incorrectQuestions = (reviewData.questions || []).filter(q => !q.isCorrect);
      setReviewQuestions(incorrectQuestions);
      setState(STATES.FOCUSED_REVIEW);
    } catch (err) {
      setError(err.message);
    }
  }, [quizId, quizData, answers, token]);

  const handleReviewComplete = useCallback((result) => {
    setReviewResult(result);
    setState(STATES.REVIEW_COMPLETE);
  }, []);

  const handleBackToResults = useCallback(() => {
    setState(STATES.RESULTS);
  }, []);

  const handleBackToSetup = useCallback(() => {
    setState(STATES.SETUP);
    setQuizData(null);
    setQuizId(null);
    setAnswers({});
    setFlagged(new Set());
    setCurrentQuestion(0);
    setResults(null);
    setReviewResult(null);
    setError(null);
  }, []);

  const handleGenerateNew = useCallback(() => {
    setQuizData(null);
    setQuizId(null);
    setAnswers({});
    setFlagged(new Set());
    setCurrentQuestion(0);
    setResults(null);
    setReviewResult(null);
    setError(null);
    setState(STATES.SETUP);
  }, []);

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="quiz-dot-grid min-h-full p-6">
      {state === STATES.SETUP && (
        <QuizSetup onStartQuiz={handleSetupComplete} />
      )}

      {state === STATES.CARD_INTRO && (
        <QuizCardIntro
          onComplete={handleCardIntroComplete}
          onSkip={handleCardIntroComplete}
        />
      )}

      {state === STATES.QUESTION_COUNT && (
        <QuestionCountSelector
          selectedCount={questionCount}
          onSelectCount={setQuestionCount}
          onConfirm={handleCountConfirm}
        />
      )}

      {state === STATES.GENERATING && (
        <QuizGenerating
          topic={quizConfig.topic}
          questionCount={questionCount}
        />
      )}

      {state === STATES.READY && (
        <QuizReady
          topic={quizConfig.topic}
          questionCount={quizData?.questions?.length || questionCount}
          sourceMode={quizConfig.sourceMode}
          onStart={handleStartQuiz}
        />
      )}

      {state === STATES.ACTIVE && quizData && (
        <QuizQuestion
          question={quizData.questions?.[currentQuestion]}
          questionIndex={currentQuestion}
          totalQuestions={quizData.questions?.length || 0}
          selectedAnswer={answers[currentQuestion]}
          answers={answers}
          flagged={flagged}
          onSelectAnswer={handleSelectAnswer}
          onNavigate={handleNavigate}
          onFlag={handleFlag}
          onSubmit={handleSubmit}
        />
      )}

      {state === STATES.SUBMITTING && (
        <QuizGenerating topic="Grading your answers" questionCount={0} />
      )}

      {state === STATES.RESULTS && results && (
        <QuizResults
          results={results}
          flaggedQuestions={flagged}
          onRetakeSame={handleRetakeSame}
          onRetryIncorrect={handleStartFocusedReview}
          onGenerateNew={handleGenerateNew}
          onBackToSetup={handleBackToSetup}
          onStartReview={handleStartStudyReview}
        />
      )}

      {state === STATES.STUDY_REVIEW && (
        <ReviewMode
          mode="study_review"
          questions={reviewQuestions}
          onComplete={handleReviewComplete}
          onExit={handleBackToResults}
        />
      )}

      {state === STATES.FOCUSED_REVIEW && (
        <ReviewMode
          mode="focused_review"
          questions={reviewQuestions}
          onComplete={handleReviewComplete}
          onExit={handleBackToResults}
        />
      )}

      {state === STATES.REVIEW_COMPLETE && (
        <ReviewComplete
          originalScore={results?.score}
          reviewResult={reviewResult}
          onRetryRemaining={() => handleStartFocusedReview()}
          onBackToResults={handleBackToResults}
          onBackToSetup={handleBackToSetup}
        />
      )}

      {state === STATES.ERROR && (
        <div className="max-w-md mx-auto text-center space-y-4 py-12">
          <div className="text-4xl">😔</div>
          <h2 className="text-xl font-bold text-slate-100">Something went wrong</h2>
          <p className="text-sm text-slate-400">{error || 'An unexpected error occurred.'}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => generateQuiz(questionCount)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
            <button
              onClick={handleBackToSetup}
              className="px-5 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-colors"
            >
              Back to Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizComponent;
