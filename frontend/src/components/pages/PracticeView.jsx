import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, FileText, Upload, Award, CheckCircle2, Clock, AlertCircle,
  Sparkles, ArrowRight, ExternalLink, RefreshCw, X, ChevronRight, Check,
  RotateCcw, Timer, Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { QuizWorkspace } from '../workspace/QuizWorkspace';
import { API_BASE } from '../../lib/api';

/**
 * PracticeView — Quizzes & Exams Hub
 * Displays Instructor-assigned Quizzes & Exams (Multiple Choice & File Submissions)
 * with instant scoring and Socratic review, alongside AI Self-Study practice.
 */
export function PracticeView() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('assigned'); // 'assigned' | 'practice'
  const [filterPeriod, setFilterPeriod] = useState('ALL');

  // Assigned quizzes state
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQuizModal, setActiveQuizModal] = useState(null); // for taking MC quiz
  const [activeUploadModal, setActiveUploadModal] = useState(null); // for file submission
  const [activeReviewModal, setActiveReviewModal] = useState(null); // for reviewing completed quiz
  const [notification, setNotification] = useState(null);
  const [requestingRetakeId, setRequestingRetakeId] = useState(null);

  // AI Practice workspace state
  const [topic, setTopic] = useState('Financial Accounting & Reporting');
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    fetchAssignedQuizzes();
    fetchDocuments();
  }, [token]);

  const fetchAssignedQuizzes = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/academic/student/quizzes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.assignments || data.quizzes || [];
        setAssignments(list);
      }
    } catch (err) {
      console.error('Failed to load assigned quizzes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestRetake = async (assignmentId) => {
    if (!token || !assignmentId) return;
    setRequestingRetakeId(assignmentId);
    try {
      const res = await fetch(`${API_BASE}/academic/student/quizzes/${assignmentId}/request-retake`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification('Retake requested! Your instructor has been notified to reset your attempt.');
        fetchAssignedQuizzes();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification(err.error || 'Failed to request retake', 'error');
      }
    } catch (err) {
      showNotification('Network error requesting retake', 'error');
    } finally {
      setRequestingRetakeId(null);
    }
  };

  const fetchDocuments = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/content/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.contents) {
          setDocuments(data.contents);
        }
      }
    } catch (err) {
      console.warn('PracticeView doc list error:', err);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    if (filterPeriod === 'ALL') return true;
    const p = a.period || a.quiz_details?.period || 'Prelim';
    return p.toLowerCase() === filterPeriod.toLowerCase();
  });

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-[#FAF9F6] dark:bg-[#0F1115] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              notification.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800'
            }`}
          >
            {notification.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 lg:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Brain className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  STUDENT ASSESSMENTS
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {assignments.length} Total Assessment(s) Assigned
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Quizzes & Exams
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Official course assessments assigned by your faculty instructors, plus AI-guided retrieval practice.
              </p>
            </div>
          </div>

          {/* Navigation Mode Switcher */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.05] p-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08]">
            <button
              onClick={() => setActiveTab('assigned')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'assigned'
                  ? 'bg-white dark:bg-[#1E293B] text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Assigned Quizzes & Exams ({assignments.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'practice'
                  ? 'bg-white dark:bg-[#1E293B] text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Self-Study Practice</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Body */}
      {activeTab === 'assigned' ? (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#161920] p-1 rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-xs w-fit">
              {['ALL', 'Prelim', 'Midterm', 'Semi-Finals', 'Finals'].map((period) => (
                <button
                  key={period}
                  onClick={() => setFilterPeriod(period)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterPeriod === period
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {period === 'ALL' ? 'All Periods' : period}
                </button>
              ))}
            </div>

            <button
              onClick={fetchAssignedQuizzes}
              disabled={isLoading}
              className="p-2 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#161920] text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer w-fit self-end shadow-xs"
              title="Refresh Quizzes"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Assigned Quizzes Grid */}
          {filteredAssignments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAssignments.map((a) => {
                const quiz = a.quiz_details || {};
                const isMC = (a.quiz_type || quiz.quiz_type || 'multiple_choice') === 'multiple_choice';
                const isCompleted = a.status === 'completed';
                const isSubmitted = a.status === 'submitted';
                const period = a.period || quiz.period || 'Prelim';
                const category = (a.category || quiz.category || (a.quiz_title?.toLowerCase().includes('exam') || quiz.title?.toLowerCase().includes('exam') ? 'exam' : 'quiz')).toLowerCase();
                const isExam = category === 'exam';
                const timeLimit = a.time_limit_minutes || quiz.time_limit_minutes || 0;
                const dueDate = a.due_date || quiz.due_date;
                const allowLate = quiz.allow_late_submission !== undefined ? quiz.allow_late_submission : (a.allow_late_submission !== undefined ? a.allow_late_submission : true);
                const passingScore = quiz.passing_score || a.passing_score || 75;
                const isPassed = isCompleted && a.score !== null && a.score !== undefined && a.score >= passingScore;
                const retakeRequested = Boolean(a.retake_requested);
                const retakeGranted = Boolean(a.retake_granted);

                return (
                  <div
                    key={a.id}
                    className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4 hover:border-purple-300 dark:hover:border-purple-800 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {isExam ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/50">
                              EXAMINATION
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                              QUIZ
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40">
                            {period}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {timeLimit > 0 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              <span>{timeLimit}m</span>
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">
                            {isMC ? 'MC' : 'File Task'}
                          </span>
                        </div>
                      </div>

                      {/* Title & Subject */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {a.quiz_title || quiz.title || 'Course Quiz'}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {a.subject_name || quiz.subject_name}
                        </p>
                      </div>

                      {/* Instructions / Description snippet */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-xl border border-slate-100 dark:border-white/[0.04]">
                        {quiz.instructions || quiz.description || (isMC ? 'Complete all questions to test your mastery and receive immediate score feedback.' : 'Upload your required assignment document (.pdf, .docx, .zip) for instructor review.')}
                      </p>

                      {/* Deadline info if present */}
                      {dueDate && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Due: {new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            allowLate
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}>
                            {allowLate ? 'Late Allowed' : 'Strict'}
                          </span>
                        </div>
                      )}

                      {/* Status / Score Bar */}
                      <div className="pt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-xs">
                        {isCompleted ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Award className={`w-4 h-4 ${isPassed ? 'text-emerald-500' : 'text-rose-500'}`} />
                              <span className={isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                Score: {a.score != null ? `${a.score}%` : 'Graded'}
                              </span>
                            </div>
                            <span className={`text-[10px] block font-semibold ${isPassed ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {isPassed ? '✓ Passed' : `✗ Below Passing (${passingScore}%)`}
                            </span>
                          </div>
                        ) : isSubmitted ? (
                          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Submitted • Awaiting Grade</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Pending Submission</span>
                          </div>
                        )}

                        <span className="text-[10px] text-slate-400">
                          {isMC ? `${quiz.question_count || a.total_questions || 5} Questions` : `${quiz.total_points || 100} Points`}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-white/[0.04] flex flex-col gap-2">
                      {isCompleted ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveReviewModal(a)}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                          {retakeGranted ? (
                            <button
                              onClick={() => isMC ? setActiveQuizModal(a) : setActiveUploadModal(a)}
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Retake</span>
                            </button>
                          ) : retakeRequested ? (
                            <span className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200">
                              ⏳ Retake Pending
                            </span>
                          ) : !isPassed ? (
                            <button
                              onClick={() => handleRequestRetake(a.id)}
                              disabled={requestingRetakeId === a.id}
                              className="px-2.5 py-2 rounded-xl text-[11px] font-semibold border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 cursor-pointer transition-colors"
                            >
                              <RotateCcw className="w-3 h-3 inline mr-1" />
                              <span>{requestingRetakeId === a.id ? 'Requesting...' : 'Request Retake'}</span>
                            </button>
                          ) : null}
                        </div>
                      ) : isSubmitted ? (
                        <button
                          onClick={() => setActiveReviewModal(a)}
                          className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Submitted File</span>
                        </button>
                      ) : isMC ? (
                        <button
                          onClick={() => setActiveQuizModal(a)}
                          className="w-full kn-btn-primary py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Brain className="w-3.5 h-3.5" />
                          <span>{isExam ? 'Take Examination Now' : 'Take Quiz Now'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveUploadModal(a)}
                          className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File Submission</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                <Brain className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No Assigned Quizzes in this Period
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  When your instructors publish quizzes or file upload assignments for your enrolled subjects, they will appear here. You can also practice on any topic anytime!
                </p>
              </div>
              <button
                onClick={() => setActiveTab('practice')}
                className="kn-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch AI Self-Practice</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* AI Practice Tab */
        <div className="space-y-4">
          <QuizWorkspace
            topic={topic}
            documents={documents}
            selectedDocIds={selectedDocIds}
            token={token}
            allowTopicEdit={true}
            onTopicChange={setTopic}
          />
        </div>
      )}

      {/* ── MODAL 1: TAKE MULTIPLE CHOICE QUIZ ── */}
      {activeQuizModal && (
        <MultipleChoiceRunnerModal
          assignment={activeQuizModal}
          token={token}
          onClose={() => setActiveQuizModal(null)}
          onSuccess={(score) => {
            setActiveQuizModal(null);
            fetchAssignedQuizzes();
            showNotification(`Quiz completed! You scored ${score}%. Excellent work!`);
          }}
        />
      )}

      {/* ── MODAL 2: UPLOAD FILE SUBMISSION ── */}
      {activeUploadModal && (
        <FileUploadSubmissionModal
          assignment={activeUploadModal}
          token={token}
          onClose={() => setActiveUploadModal(null)}
          onSuccess={() => {
            setActiveUploadModal(null);
            fetchAssignedQuizzes();
            showNotification('File successfully submitted to your instructor!');
          }}
        />
      )}

      {/* ── MODAL 3: REVIEW SCORE & SUBMISSION ── */}
      {activeReviewModal && (
        <ReviewSubmissionModal
          assignment={activeReviewModal}
          token={token}
          onClose={() => setActiveReviewModal(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. MULTIPLE CHOICE RUNNER MODAL
// ─────────────────────────────────────────────────────────────
function MultipleChoiceRunnerModal({ assignment, token, onClose, onSuccess }) {
  const quiz = assignment.quiz_details || {};
  const questions = quiz.questions || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const limitMins = quiz.time_limit_minutes || assignment.time_limit_minutes || 0;
  const [timerSeconds, setTimerSeconds] = useState(limitMins > 0 ? limitMins * 60 : null);

  const currentQ = questions[currentIndex] || null;

  const handleSelectOption = (opt) => {
    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: opt }));
  };

  const handleSubmit = async () => {
    if (questions.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    // Calculate score
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct_answer) {
        correctCount += 1;
      }
    });
    const percentage = Math.round((correctCount / questions.length) * 100);

    try {
      const res = await fetch(`${API_BASE}/academic/student/quizzes/${assignment.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          score: percentage,
          total_questions: questions.length,
          answers: selectedAnswers
        })
      });

      if (res.ok) {
        onSuccess(percentage);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to submit quiz responses');
      }
    } catch (err) {
      setError('Network connection error while submitting quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (timerSeconds === null) return;
    if (timerSeconds <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimerSeconds(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timerSeconds]);

  const formatTimer = (sec) => {
    if (sec === null) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-mono">
                {assignment.subject_code || 'EXAM'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                (assignment.category || quiz.category) === 'exam'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/50'
                  : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
              }`}>
                {(assignment.category || quiz.category || 'Quiz').toUpperCase()}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {assignment.quiz_title || quiz.title}
            </h2>
            <p className="text-xs text-slate-500">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {timerSeconds !== null && (
              <span className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-mono font-black ${
                timerSeconds < 120
                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 animate-pulse'
                  : 'bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-slate-200'
              }`}>
                <Timer className="w-3.5 h-3.5 text-blue-500" />
                <span>{formatTimer(timerSeconds)}</span>
              </span>
            )}
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
            {error}
          </div>
        )}

        {/* Question Area */}
        {currentQ ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                {currentQ.question}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {(currentQ.options || []).map((opt, i) => {
                const isSelected = selectedAnswers[currentIndex] === opt;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full p-3.5 rounded-xl text-xs font-semibold text-left transition-all flex items-center justify-between border cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 border-purple-400 dark:border-purple-600 shadow-xs'
                        : 'bg-white dark:bg-[#1A1D24] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <span>{opt}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No questions available for this quiz.</p>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/[0.06]">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
          >
            Previous
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className="kn-btn-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || Object.keys(selectedAnswers).length === 0}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
            >
              {isSubmitting ? 'Recording Grade...' : 'Submit Exam'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. FILE UPLOAD SUBMISSION MODAL
// ─────────────────────────────────────────────────────────────
function FileUploadSubmissionModal({ assignment, token, onClose, onSuccess }) {
  const quiz = assignment.quiz_details || {};
  const [selectedFile, setSelectedFile] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile && !submissionText.trim()) {
      setError('Please select a file or enter submission text');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    formData.append('submission_text', submissionText);

    try {
      const res = await fetch(`${API_BASE}/academic/student/quizzes/${assignment.id}/submit-file`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to submit file');
      }
    } catch (err) {
      setError('Network error while uploading assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
          <div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-mono">
              {assignment.subject_code || 'SUBMISSION'}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {assignment.quiz_title || quiz.title}
            </h2>
            <p className="text-xs text-slate-500">
              Submit your work for instructor review & grading.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assessment Instructions</span>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {quiz.instructions || quiz.description || 'Upload your completed performance task, report, or solution file. Your instructor will grade it and provide feedback.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Upload Document (.pdf, .docx, .zip, images)
            </label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-950/60 dark:file:text-purple-300 cursor-pointer border border-slate-200 dark:border-white/[0.08] rounded-xl p-2"
            />
          </div>

          {/* Optional notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Submission Remarks / Solution Summary (Optional)
            </label>
            <textarea
              rows={3}
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              placeholder="Add any clarifying remarks or commentary for your instructor..."
              className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Uploading Work...' : 'Submit to Instructor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. REVIEW SUBMISSION MODAL
// ─────────────────────────────────────────────────────────────
function ReviewSubmissionModal({ assignment, token, onClose }) {
  const quiz = assignment.quiz_details || {};
  const fileUrl = assignment.submission_file_url ? `${assignment.submission_file_url}?token=${token}` : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[88vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
          <div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono">
              {assignment.subject_code || 'SUBMISSION REVIEW'}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {assignment.quiz_title || quiz.title}
            </h2>
            <p className="text-xs text-slate-500">
              Official assessment score and instructor review record.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score & Status */}
        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
              Official Grade / Score
            </span>
            <p className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-0.5">
              {assignment.score != null ? `${assignment.score}%` : 'Pending Grade'}
            </p>
          </div>
          <Award className="w-10 h-10 text-emerald-500/80" />
        </div>

        {/* Submitted file info and embedded document viewer */}
        {fileUrl && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {assignment.submission_file_name || 'Uploaded Document File'}
              </span>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <span>Open in Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="w-full h-64 rounded-xl overflow-hidden bg-black/40 border border-slate-200 dark:border-white/[0.08]">
              <iframe
                src={fileUrl}
                className="w-full h-full border-0"
                title="Submitted Document Preview"
              />
            </div>
          </div>
        )}

        {/* Instructor Feedback */}
        {assignment.feedback && (
          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 space-y-1">
            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
              Instructor Feedback
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
              "{assignment.feedback}"
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="kn-btn-primary px-5 py-2 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
