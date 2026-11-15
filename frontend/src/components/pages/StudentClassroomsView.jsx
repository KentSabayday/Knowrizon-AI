import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Clock, MapPin, Users, GraduationCap, FileText,
  Sparkles, History, CheckCircle2, ChevronRight, ChevronDown, ChevronUp,
  ArrowRight, RefreshCw, AlertCircle, Award, ArrowLeft, Eye, X, Brain,
  ExternalLink, Layers, Check, Shield, Building2, UploadCloud, FileUp,
  Send, Calendar, TrendingUp, CheckCircle, Circle, PlayCircle, FileCheck,
  RotateCcw, Timer, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * StudentClassroomsView — Student Class Studio & Subject LMS Ecosystem
 * Grounded on the active academic term and enrolled subjects.
 * Allows entering a dedicated Subject Classroom with 4 Period Accordions
 * (1. Prelim Period, 2. Midterm Period, 3. Semi Finals Period, 4. Finals Period),
 * AI auto-generated headings, interactive quizzes, performance task file uploads,
 * and live Socratic AI study session launches.
 */
export function StudentClassroomsView({ onNavigate, isStudioMode = false }) {
  const { token, user } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [activeSubjectTab, setActiveSubjectTab] = useState('lessons'); // 'lessons' | 'quizzes' | 'faculty'
  const [showHistorical, setShowHistorical] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingStudy, setIsStartingStudy] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Expanded periods accordion state in Subject Classroom detail
  const [expandedPeriods, setExpandedPeriods] = useState({
    'Prelim': true,
    'Midterm': true,
    'Semi-Finals': true,
    'Finals': true
  });

  // Viewed materials tracking (persisted in local state)
  const [viewedMaterialIds, setViewedMaterialIds] = useState(new Set());

  // Material Document Preview Modal
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [viewerMode, setViewerMode] = useState('pdf'); // 'pdf' | 'text'
  const [isLoadingMaterialDetail, setIsLoadingMaterialDetail] = useState(false);

  // Quizzes & Exams runner / submission modals
  const [activeQuizRunner, setActiveQuizRunner] = useState(null); // Multiple Choice interactive taker
  const [quizAnswers, setQuizAnswers] = useState({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [quizTimerSeconds, setQuizTimerSeconds] = useState(null);
  const [requestingRetakeId, setRequestingRetakeId] = useState(null);

  // File Upload Performance Task submission modal
  const [activeFileUploadTask, setActiveFileUploadTask] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);

  // Graded assessment review modal
  const [viewingSubmission, setViewingSubmission] = useState(null);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchClassrooms = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/academic/student/classrooms?historical=${showHistorical}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load classrooms');
      const data = await res.json();
      const list = data.classrooms || [];
      setClassrooms(list);

      // If a classroom was previously selected, update its reference with fresh data
      if (selectedClassroom) {
        const updated = list.find(c => c.subject_id === selectedClassroom.subject_id);
        if (updated) setSelectedClassroom(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, showHistorical, selectedClassroom?.subject_id]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const togglePeriod = (period) => {
    setExpandedPeriods(prev => ({
      ...prev,
      [period]: !prev[period]
    }));
  };

  // Launch live Socratic AI study session pre-grounded on this subject & materials
  const handleStartStudySession = async (classroom, specificMaterial = null) => {
    if (!token) {
      onNavigate?.('/workspace');
      return;
    }
    setIsStartingStudy(true);
    try {
      const topicName = specificMaterial
        ? `${specificMaterial.heading || specificMaterial.title} (${classroom.subject_code || classroom.subject_name})`
        : `${classroom.subject_name} (${classroom.subject_code || 'Subject'})`;

      const convRes = await fetch(`${API_BASE}/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          topic: topicName,
          title: specificMaterial ? `${classroom.subject_code || 'Class'} - ${specificMaterial.title}` : `${classroom.subject_code || 'Class'} - ${classroom.subject_name}`,
          studyMode: 'socratic'
        })
      });

      if (convRes.ok) {
        const convData = await convRes.json();
        const convId = convData.id || convData.conversation?.id;

        if (convId) {
          const materialIds = specificMaterial
            ? [specificMaterial.id]
            : (classroom.materials || []).map(m => m.id).filter(Boolean);

          if (materialIds.length > 0) {
            await fetch(`${API_BASE}/chat/conversations/${convId}/link-content`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ contentIds: materialIds })
            }).catch(() => {});
          }

          onNavigate?.('/workspace', convId);
          return;
        }
      }
      onNavigate?.('/workspace');
    } catch (err) {
      console.warn('Failed to start study session for subject:', err);
      onNavigate?.('/workspace');
    } finally {
      setIsStartingStudy(false);
    }
  };

  // Open Document Preview Modal and fetch full content text if needed
  const handleOpenMaterialPreview = async (mat) => {
    setViewedMaterialIds(prev => new Set(prev).add(mat.id));
    setViewingMaterial(mat);
    setViewerMode(mat.file_url ? 'pdf' : 'text');

    if (!mat.content_text && mat.id) {
      setIsLoadingMaterialDetail(true);
      try {
        const res = await fetch(`${API_BASE}/academic/materials/${mat.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.material) {
            setViewingMaterial(prev => ({
              ...prev,
              ...data.material,
              content_text: data.material.content_text || prev?.content_text || ''
            }));
          }
        }
      } catch (err) {
        console.warn('Failed to fetch full material text:', err);
      } finally {
        setIsLoadingMaterialDetail(false);
      }
    }
  };

  // Handle Multiple Choice Quiz Submission
  const handleTakeQuiz = (assignment) => {
    setActiveQuizRunner(assignment);
    setQuizAnswers({});
    setQuizResult(null);
    const qDetails = assignment.quiz_details || assignment.quiz || {};
    const limitMins = qDetails.time_limit_minutes || assignment.time_limit_minutes || 0;
    if (limitMins > 0) {
      setQuizTimerSeconds(limitMins * 60);
    } else {
      setQuizTimerSeconds(null);
    }
  };

  // Active quiz countdown timer hook
  useEffect(() => {
    if (!activeQuizRunner || quizResult || quizTimerSeconds === null) return;
    if (quizTimerSeconds <= 0) {
      showToast('Time expired! Automatically submitting your answers...', 'error');
      handleSubmitQuizAnswers();
      return;
    }
    const timer = setInterval(() => {
      setQuizTimerSeconds(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuizRunner, quizResult, quizTimerSeconds]);

  const formatTimer = (seconds) => {
    if (seconds === null || seconds === undefined) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Request Retake from Instructor
  const handleRequestRetake = async (assignmentId) => {
    if (!token || !assignmentId) return;
    setRequestingRetakeId(assignmentId);
    try {
      const res = await fetch(`${API_BASE}/academic/student/quizzes/${assignmentId}/request-retake`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Retake requested! Your instructor has been notified to reset your attempt.', 'success');
        fetchClassrooms();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to request retake', 'error');
      }
    } catch (err) {
      showToast('Network error requesting retake', 'error');
    } finally {
      setRequestingRetakeId(null);
    }
  };

  const handleSubmitQuizAnswers = async () => {
    if (!activeQuizRunner || !token) return;
    setIsSubmittingQuiz(true);
    try {
      const qDetails = activeQuizRunner.quiz_details || activeQuizRunner.quiz || {};
      const questions = qDetails.questions || [];
      let correct = 0;
      questions.forEach((q, idx) => {
        if (quizAnswers[idx] !== undefined && quizAnswers[idx] === q.correct_option) {
          correct += 1;
        }
      });
      const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 100;

      const res = await fetch(`${API_BASE}/academic/student/quizzes/${activeQuizRunner.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          score: pct,
          answers: quizAnswers,
          total_questions: questions.length,
          correct_count: correct
        })
      });

      if (res.ok) {
        setQuizResult({
          score: pct,
          correct,
          total: questions.length
        });
        showToast(`Quiz completed! You scored ${pct}% (${correct}/${questions.length})`, 'success');
        fetchClassrooms();
      } else {
        showToast('Failed to record quiz submission', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // Handle File Upload Assessment Submission
  const handleOpenFileUploadModal = (assignment) => {
    setActiveFileUploadTask(assignment);
    setSubmissionFile(null);
    setSubmissionNotes('');
  };

  const handleSubmitFileUploadTask = async (e) => {
    e.preventDefault();
    if (!activeFileUploadTask || !submissionFile || !token) {
      showToast('Please select a file to submit', 'error');
      return;
    }
    setIsSubmittingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', submissionFile);
      formData.append('notes', submissionNotes);

      const res = await fetch(`${API_BASE}/academic/student/quizzes/${activeFileUploadTask.id}/submit-file`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        showToast('Performance task submitted successfully! Your instructor can now view and grade it.', 'success');
        setActiveFileUploadTask(null);
        fetchClassrooms();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit file');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingFile(false);
    }
  };

  // Group materials for selected classroom by standard 4 periods
  const currentSubjectMaterials = selectedClassroom?.materials || [];
  const materialsByPeriod = useMemo(() => {
    const grouped = {
      'Prelim': [],
      'Midterm': [],
      'Semi-Finals': [],
      'Finals': []
    };

    currentSubjectMaterials.forEach((m) => {
      const p = (m.period || '').toLowerCase();
      if (p.includes('semi')) {
        grouped['Semi-Finals'].push(m);
      } else if (p.includes('mid')) {
        grouped['Midterm'].push(m);
      } else if (p.includes('fin')) {
        grouped['Finals'].push(m);
      } else {
        grouped['Prelim'].push(m);
      }
    });

    return grouped;
  }, [currentSubjectMaterials]);

  // Quizzes for selected subject
  const currentSubjectQuizzes = selectedClassroom?.quizzes || [];

  // Visual Period Cover Artwork
  const periodArtwork = {
    'Prelim': {
      gradient: 'from-amber-500/20 via-orange-500/15 to-rose-500/10',
      border: 'border-orange-200 dark:border-orange-800/40',
      accent: 'text-orange-600 dark:text-orange-400',
      badge: 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300',
      defaultPct: 75,
      coverImg: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'
    },
    'Midterm': {
      gradient: 'from-blue-500/20 via-cyan-500/15 to-indigo-500/10',
      border: 'border-blue-200 dark:border-blue-800/40',
      accent: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
      defaultPct: 66,
      coverImg: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80'
    },
    'Semi-Finals': {
      gradient: 'from-purple-500/20 via-fuchsia-500/15 to-pink-500/10',
      border: 'border-purple-200 dark:border-purple-800/40',
      accent: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300',
      defaultPct: 60,
      coverImg: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80'
    },
    'Finals': {
      gradient: 'from-emerald-500/20 via-teal-500/15 to-cyan-500/10',
      border: 'border-emerald-200 dark:border-emerald-800/40',
      accent: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
      defaultPct: 40,
      coverImg: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80'
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DETAIL VIEW: DEDICATED SUBJECT CLASSROOM (MATCHING USER REFERENCE DESIGN)
  // ─────────────────────────────────────────────────────────────────────────────
  if (selectedClassroom) {
    const c = selectedClassroom;

    return (
      <div className="h-full flex flex-col overflow-y-auto bg-[#FAF9F6] dark:bg-[#0F1115] p-4 sm:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100 max-w-7xl mx-auto">
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

        {/* Back navigation & Top Subject Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedClassroom(null)}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer px-3 py-1.5 rounded-lg bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Class Studio</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
                ({c.subject_code || 'CLASS'})
              </span>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-md">
                {c.subject_name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleStartStudySession(c)}
              disabled={isStartingStudy}
              className="kn-btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isStartingStudy ? 'Preparing Knowri AI...' : 'Study with Knowri AI'}</span>
            </button>
            <button
              onClick={() => onNavigate?.('/practice')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <Brain className="w-4 h-4 text-purple-500" />
              <span>All Quizzes & Exams</span>
            </button>
          </div>
        </div>

        {/* Hero Subject Title Banner */}
        <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono">
                  {c.subject_code || 'CLASS'}
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                  {c.status === 'archived' ? 'Archived' : 'In Progress'}
                </span>
                {c.academic_year && (
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">
                    A.Y. {c.academic_year}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/30">
                  {c.department_name || 'Academic Department'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {c.subject_name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Course curriculum modules, lecture materials, and assigned period examinations.
              </p>
            </div>

            {/* Quick Metrics Badge */}
            <div className="flex items-center gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] text-center min-w-[100px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Grade</span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                  <Award className="w-4 h-4 text-emerald-500" />
                  <span>{c.grade || '1.25'}</span>
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] text-center min-w-[100px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assessments</span>
                <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                  {currentSubjectQuizzes.length}
                </p>
              </div>
            </div>
          </div>

          {/* Classroom Sub-Tabs */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
            <button
              onClick={() => setActiveSubjectTab('lessons')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubjectTab === 'lessons'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Lessons & Course Materials ({currentSubjectMaterials.length})</span>
            </button>

            <button
              onClick={() => setActiveSubjectTab('quizzes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubjectTab === 'quizzes'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Quizzes & Exams ({currentSubjectQuizzes.length})</span>
            </button>

            <button
              onClick={() => setActiveSubjectTab('faculty')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeSubjectTab === 'faculty'
                  ? 'bg-slate-100 text-slate-800 dark:bg-white/[0.08] dark:text-white border border-slate-200 dark:border-white/[0.1] shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Faculty & Schedule</span>
            </button>
          </div>
        </section>

        {/* 2-Column Layout matching media_1794466543633_26ff3a10.jpg */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Content Area (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* ──────── TAB 1: LESSONS & MATERIALS BY PERIOD ──────── */}
            {activeSubjectTab === 'lessons' && (
              <div className="space-y-5">
                {/* Section Header with Legend */}
                <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Lessons</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Lessons and sections can be completed in any order. Click any file container to view and review.
                    </p>
                  </div>

                  {/* Status Legend matching user screenshot */}
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 shrink-0">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
                      <span>Available</span>
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <span>~</span>
                      <span>In Progress</span>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Completed</span>
                    </span>
                  </div>
                </div>

                {/* 4 Period Cards (Accordions) */}
                {(['Prelim', 'Midterm', 'Semi-Finals', 'Finals']).map((periodKey, idx) => {
                  const periodMaterials = materialsByPeriod[periodKey] || [];
                  const isExpanded = Boolean(expandedPeriods[periodKey]);
                  const artwork = periodArtwork[periodKey];
                  const periodNum = idx + 1;
                  const periodLabel = `${periodNum}. ${periodKey === 'Semi-Finals' ? 'Semi Finals' : periodKey} Period`;

                  // Calculate completed sections
                  const completedCount = periodMaterials.filter(m => viewedMaterialIds.has(m.id)).length;
                  const progressPct = periodMaterials.length > 0
                    ? Math.round((completedCount / periodMaterials.length) * 100)
                    : (idx === 0 ? 75 : idx === 1 ? 66 : idx === 2 ? 60 : 40);

                  return (
                    <div
                      key={periodKey}
                      className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-white/[0.15]"
                    >
                      {/* Accordion Header / Card */}
                      <div
                        onClick={() => togglePeriod(periodKey)}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none bg-gradient-to-r from-transparent to-slate-50/50 dark:to-white/[0.01]"
                      >
                        <div className="flex items-center gap-4">
                          {/* Visual Thumbnail Image / Banner */}
                          <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200/80 dark:border-white/[0.08] relative group">
                            <img
                              src={artwork.coverImg}
                              alt={periodLabel}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/20" />
                            <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-white bg-black/60 backdrop-blur-xs">
                              {periodKey}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              {periodLabel}
                            </h3>

                            {/* Resume / Progress Pill matching media_1794466543633_26ff3a10.jpg */}
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.06]">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>{progressPct}% Resume</span>
                                <PlayCircle className="w-3 h-3 text-slate-400" />
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Toggle Button & Section Count */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {periodMaterials.length} {periodMaterials.length === 1 ? 'section' : 'sections'}
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center text-slate-600 dark:text-slate-300">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Section Items Table */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-100 dark:border-white/[0.06]"
                          >
                            {periodMaterials.length > 0 ? (
                              <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                                {/* Table Sub-header */}
                                <div className="px-5 py-2.5 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  <span>Section / Topic Heading</span>
                                  <div className="flex items-center gap-8">
                                    <span className="hidden sm:inline">Format</span>
                                    <span>Status</span>
                                    <span>Actions</span>
                                  </div>
                                </div>

                                {periodMaterials.map((m, mIdx) => {
                                  const isViewed = viewedMaterialIds.has(m.id);

                                  return (
                                    <div
                                      key={m.id || mIdx}
                                      onClick={() => handleOpenMaterialPreview(m)}
                                      className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-all cursor-pointer group"
                                    >
                                      {/* Left: Material Title with AI Topic Heading & Icon */}
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                          <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                              {m.file_type || 'PDF'}
                                            </span>
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                              {m.heading || m.title}
                                            </h4>
                                          </div>
                                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                            {m.title !== m.heading ? m.title : (m.content_text ? m.content_text.slice(0, 80) : 'Official learning material for this course section')}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Right: Status & Action Buttons */}
                                      <div className="flex items-center gap-3 sm:gap-6 shrink-0" onClick={e => e.stopPropagation()}>
                                        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline uppercase">
                                          {m.file_type || 'document'}
                                        </span>

                                        {/* Status Checkmark */}
                                        <div className="w-6 flex justify-center">
                                          {isViewed ? (
                                            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center" title="Completed">
                                              <Check className="w-3 h-3 stroke-[3]" />
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 dark:text-slate-600 font-bold" title="Available">
                                              &gt;
                                            </span>
                                          )}
                                        </div>

                                        {/* Actions: View Material + Study with AI */}
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleOpenMaterialPreview(m)}
                                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center gap-1 cursor-pointer transition-colors"
                                            title="View Document"
                                          >
                                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="hidden sm:inline">View</span>
                                          </button>
                                          <button
                                            onClick={() => handleStartStudySession(c, m)}
                                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-1 cursor-pointer transition-colors"
                                            title="Study with Knowri AI"
                                          >
                                            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                            <span className="hidden sm:inline">Study</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                                <BookOpen className="w-5 h-5 mx-auto text-slate-300 dark:text-slate-600" />
                                <p className="font-semibold text-slate-600 dark:text-slate-300">No materials uploaded for {periodKey} yet</p>
                                <p className="text-[11px]">Your instructor has not added learning resources for this period.</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ──────── TAB 2: QUIZZES & EXAMS FOR THIS SUBJECT ──────── */}
            {activeSubjectTab === 'quizzes' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-500" />
                      <span>Assigned Quizzes & Examinations ({currentSubjectQuizzes.length})</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Evaluations, timed tests, and performance tasks created by your instructor for {c.subject_name}.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate?.('/practice')}
                    className="kn-btn-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Practice Hub</span>
                  </button>
                </div>

                {currentSubjectQuizzes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentSubjectQuizzes.map((assignment) => {
                      const q = assignment.quiz_details || assignment.quiz || {};
                      const isFileUpload = q.quiz_type === 'file_upload';
                      const isCompleted = Boolean(assignment.score !== null && assignment.score !== undefined);
                      const isSubmitted = assignment.status === 'submitted' || Boolean(assignment.submission_file_url);
                      const category = (q.category || assignment.category || (q.title?.toLowerCase().includes('exam') ? 'exam' : 'quiz')).toLowerCase();
                      const isExam = category === 'exam';
                      const timeLimit = q.time_limit_minutes || assignment.time_limit_minutes || 0;
                      const dueDate = q.due_date || assignment.due_date;
                      const allowLate = q.allow_late_submission !== undefined ? q.allow_late_submission : true;
                      const passingScore = q.passing_score || 75;
                      const isPassed = isCompleted && (assignment.score >= passingScore);
                      const retakeRequested = Boolean(assignment.retake_requested);
                      const retakeGranted = Boolean(assignment.retake_granted);

                      return (
                        <div
                          key={assignment.id}
                          className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-purple-300 dark:hover:border-purple-800 transition-all"
                        >
                          <div className="space-y-2.5">
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
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">
                                  {q.period || 'Prelim'} Period
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {timeLimit > 0 && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                    <Timer className="w-3 h-3" />
                                    <span>{timeLimit}m</span>
                                  </span>
                                )}
                                <span className="text-[11px] font-bold text-slate-500">
                                  {isFileUpload ? `${q.total_points || 100} Points` : `${q.total_questions || (q.questions || []).length} Questions`}
                                </span>
                              </div>
                            </div>

                            <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                              {q.title || `${c.subject_code} Assessment`}
                            </h3>

                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {q.instructions || (isFileUpload ? 'Performance Task: Upload your document file for instructor review.' : 'Interactive multiple choice retrieval quiz.')}
                            </p>

                            {/* Deadline & Late Policy Indicator */}
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
                                  {allowLate ? 'Late Allowed' : 'Strict Deadline'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Submission State / Actions */}
                          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between">
                            {isFileUpload ? (
                              isSubmitted ? (
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <FileCheck className="w-4 h-4 text-emerald-500" />
                                    <span>Submitted {assignment.score !== null ? `(${assignment.score} / ${q.total_points || 100})` : '(Under Review)'}</span>
                                  </div>
                                  <button
                                    onClick={() => setViewingSubmission(assignment)}
                                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                  >
                                    View Submission
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenFileUploadModal(assignment)}
                                  className="w-full kn-btn-primary py-2 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <UploadCloud className="w-4 h-4" />
                                  <span>Submit Document File</span>
                                </button>
                              )
                            ) : (
                              isCompleted ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                                      <Award className={`w-4 h-4 ${isPassed ? 'text-emerald-500' : 'text-rose-500'}`} />
                                      <span className={isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                        Score: {assignment.score}%
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        (Passing: {passingScore}%)
                                      </span>
                                    </div>
                                    <span className={`text-[10px] font-semibold block ${isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                      {isPassed ? '✓ Passed Assessment' : '✗ Needs Improvement'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {retakeGranted ? (
                                      <button
                                        onClick={() => handleTakeQuiz(assignment)}
                                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Retake Now</span>
                                      </button>
                                    ) : retakeRequested ? (
                                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80">
                                        ⏳ Retake Pending
                                      </span>
                                    ) : !isPassed ? (
                                      <button
                                        onClick={() => handleRequestRetake(assignment.id)}
                                        disabled={requestingRetakeId === assignment.id}
                                        className="px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>{requestingRetakeId === assignment.id ? 'Requesting...' : 'Request Retake'}</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleTakeQuiz(assignment)}
                                        className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                                      >
                                        Review
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleTakeQuiz(assignment)}
                                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                                >
                                  <PlayCircle className="w-4 h-4" />
                                  <span>{isExam ? 'Take Examination Now' : 'Take Quiz Now'}</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#161920] border border-dashed border-slate-200 dark:border-white/[0.08] text-xs text-slate-400 space-y-2">
                    <Brain className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No quizzes assigned for this subject yet</p>
                    <p className="text-[11px]">When your instructor publishes quizzes or performance tasks, they will appear here.</p>
                  </div>
                )}
              </div>
            )}

            {/* ──────── TAB 3: FACULTY & SCHEDULE LOGISTICS ──────── */}
            {activeSubjectTab === 'faculty' && (
              <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Teaching Faculty & Office Hours</h3>
                  <p className="text-xs text-slate-500">Instructor communication channels and classroom logistics.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instructor</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-500" />
                      <span>{c.instructor?.name || 'Assigned Instructor'}</span>
                    </p>
                    <p className="text-xs text-slate-500">{c.instructor?.email || 'Faculty contact via official school email'}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Schedule & Room</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>{c.schedule?.time_slot || 'Online / Flexible'}</span>
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-purple-500" />
                      <span>{c.schedule?.classroom || 'Business Hall 101'}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar Widgets matching media_1794466543633_26ff3a10.jpg (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* 1. Recent Activity Widget */}
            <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Activity</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">A user</span>
                  <p className="text-slate-700 dark:text-slate-200 font-medium">Viewed lessons overview</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Knowledge Base</span>
                  <p className="text-slate-700 dark:text-slate-200 font-medium">Synchronized with Socratic AI Tutor</p>
                </div>
              </div>
            </div>

            {/* 2. Progress Ring Widget */}
            <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-3 text-center">
              <span className="text-xs font-bold text-slate-900 dark:text-white block text-left">Progress</span>
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100 dark:text-white/[0.05]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500"
                    strokeDasharray="60, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-slate-900 dark:text-white">60%</span>
                </div>
              </div>
            </div>

            {/* 3. Grade & Scores Dual Dial Widget */}
            <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                {/* Grade Dial */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Grade</span>
                  <div className="w-14 h-14 mx-auto rounded-full border-4 border-slate-300 dark:border-slate-700 flex items-center justify-center">
                    <span className="text-sm font-black text-slate-900 dark:text-white">{c.grade || '1.8'}</span>
                  </div>
                </div>

                {/* Scores Dial */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Scores</span>
                  <div className="w-14 h-14 mx-auto rounded-full border-4 border-emerald-500 flex items-center justify-center">
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">85%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Announcements Widget */}
            <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-2.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>Announcements</span>
              </span>
              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-bold">IMPORTANT: Preliminary Term Examinations</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  Please review materials in Section 1 and Section 2. Grounded practice questions are ready in AI Study Studio.
                </p>
              </div>
            </div>

            {/* 5. Enrollment Status */}
            <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-4 text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">Status</span>
              <p>Enrolled: {c.academic_year || 'Active Term'}</p>
              <p>{c.department_name} • {c.year_level} Year Standing</p>
            </div>
          </div>
        </div>

        {/* ──────── MODAL 1: MATERIAL DOCUMENT PREVIEW (PDF & TEXT EMBEDDED VIEWER) ──────── */}
        {viewingMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewingMaterial(null)}>
            <div
              className="w-full max-w-5xl bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 text-white space-y-4 shadow-2xl h-[88vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 uppercase">
                      {viewingMaterial.period || 'Prelim'} Period
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 uppercase">
                      {viewingMaterial.file_type || 'PDF'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white line-clamp-1">
                    {viewingMaterial.heading || viewingMaterial.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{viewingMaterial.title}</p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Viewer Mode Toggle */}
                  <div className="flex items-center bg-white/10 p-1 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setViewerMode('pdf')}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                        viewerMode === 'pdf' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      PDF Document
                    </button>
                    <button
                      onClick={() => setViewerMode('text')}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                        viewerMode === 'text' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Study Notes
                    </button>
                  </div>

                  {viewingMaterial.file_url && (
                    <a
                      href={`${viewingMaterial.file_url}?token=${token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Open in Tab</span>
                    </a>
                  )}

                  <button
                    onClick={() => setViewingMaterial(null)}
                    className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Viewer Content Area */}
              <div className="flex-1 w-full bg-black/40 rounded-xl overflow-hidden border border-white/[0.06] relative">
                {viewerMode === 'pdf' && viewingMaterial.file_url ? (
                  <iframe
                    src={`${viewingMaterial.file_url}?token=${token}`}
                    className="w-full h-full border-0"
                    title="Course Material PDF Viewer"
                  />
                ) : (
                  <div className="h-full overflow-y-auto p-5 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                    {isLoadingMaterialDetail ? (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <RefreshCw className="w-6 h-6 mx-auto animate-spin text-blue-400" />
                        <p>Loading document content...</p>
                      </div>
                    ) : (
                      viewingMaterial.content_text || 'No preview text extracted for this material. You can start a Socratic AI session to explore its concepts.'
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs">
                <button
                  onClick={() => setViewingMaterial(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const mat = viewingMaterial;
                    setViewingMaterial(null);
                    handleStartStudySession(c, mat);
                  }}
                  className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Study this Material with Knowri AI</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ──────── MODAL 2: INTERACTIVE QUIZ RUNNER (WITH TIMED TEST & RETAKE) ──────── */}
        {activeQuizRunner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => !isSubmittingQuiz && setActiveQuizRunner(null)}>
            <div
              className="w-full max-w-2xl bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.1] rounded-2xl p-6 text-slate-900 dark:text-white space-y-5 shadow-2xl max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      (activeQuizRunner.quiz_details?.category || activeQuizRunner.category) === 'exam'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/50'
                        : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                    }`}>
                      {(activeQuizRunner.quiz_details?.category || activeQuizRunner.category || 'Quiz').toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 uppercase">
                      {(activeQuizRunner.quiz_details?.period || activeQuizRunner.period || 'Prelim')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {activeQuizRunner.quiz_details?.title || activeQuizRunner.quiz?.title || 'Course Quiz'}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  {/* Active Countdown Timer */}
                  {quizTimerSeconds !== null && !quizResult && (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-xs font-black shadow-xs ${
                      quizTimerSeconds < 120
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 animate-pulse'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40'
                    }`}>
                      <Timer className="w-3.5 h-3.5" />
                      <span>{formatTimer(quizTimerSeconds)}</span>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveQuizRunner(null)}
                    disabled={isSubmittingQuiz}
                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {quizResult ? (
                (() => {
                  const qDet = activeQuizRunner.quiz_details || activeQuizRunner.quiz || {};
                  const passingScore = qDet.passing_score || 75;
                  const isPassed = quizResult.score >= passingScore;

                  return (
                    <div className="p-6 text-center space-y-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                        isPassed
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                      }`}>
                        <Award className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white">
                          {isPassed ? 'Assessment Completed — Passed! 🎉' : 'Assessment Completed — Below Passing Score'}
                        </h4>
                        <p className={`text-3xl font-extrabold mt-2 ${isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {quizResult.score}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          You answered {quizResult.correct} out of {quizResult.total} questions correctly. Passing requirement: {passingScore}%.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        {!isPassed && (
                          <button
                            onClick={() => {
                              handleRequestRetake(activeQuizRunner.id);
                              setActiveQuizRunner(null);
                            }}
                            className="px-5 py-2.5 rounded-xl border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Request Retake from Teacher</span>
                          </button>
                        )}
                        <button
                          onClick={() => setActiveQuizRunner(null)}
                          className="kn-btn-primary px-6 py-2.5 text-xs font-semibold cursor-pointer shadow-xs"
                        >
                          Done & Return to Classroom
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    {((activeQuizRunner.quiz_details?.questions || activeQuizRunner.quiz?.questions) || []).map((q, qIdx) => (
                      <div key={q.id || qIdx} className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06] space-y-3">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {qIdx + 1}. {q.question_text || q.question}
                        </p>
                        <div className="space-y-2">
                          {(q.options || []).map((opt, optIdx) => (
                            <label
                              key={optIdx}
                              onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                              className={`p-3 rounded-xl border text-xs flex items-center gap-3 cursor-pointer transition-all ${
                                quizAnswers[qIdx] === optIdx
                                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-200 font-semibold'
                                  : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                quizAnswers[qIdx] === optIdx ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {quizAnswers[qIdx] === optIdx && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                    <button
                      onClick={() => setActiveQuizRunner(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitQuizAnswers}
                      disabled={isSubmittingQuiz}
                      className="kn-btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmittingQuiz ? 'Submitting...' : 'Submit Answers'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ──────── MODAL 3: PERFORMANCE TASK FILE SUBMISSION ──────── */}
        {activeFileUploadTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => !isSubmittingFile && setActiveFileUploadTask(null)}>
            <div
              className="w-full max-w-lg bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.1] rounded-2xl p-6 text-slate-900 dark:text-white space-y-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
                <div className="space-y-0.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 uppercase">
                    Performance Task Submission
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeFileUploadTask.quiz_details?.title || activeFileUploadTask.quiz?.title || 'Course Assessment'}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveFileUploadTask(null)}
                  disabled={isSubmittingFile}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Instructions */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Instructor Instructions:</p>
                <p>{activeFileUploadTask.quiz_details?.instructions || 'Upload your finished project or essay file (.pdf, .docx, .zip). Your instructor will review and grade your work.'}</p>
              </div>

              <form onSubmit={handleSubmitFileUploadTask} className="space-y-4">
                {/* File Dropzone */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Attach Your Document (.pdf, .docx, .zip, .txt)
                  </label>
                  <label className="border-2 border-dashed border-slate-300 dark:border-white/[0.1] hover:border-blue-400 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50/50 dark:bg-white/[0.01]">
                    <UploadCloud className="w-8 h-8 text-blue-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {submissionFile ? submissionFile.name : 'Click to select your file'}
                    </span>
                    <span className="text-[10px] text-slate-400">PDF, Word Document, or ZIP Archive</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && setSubmissionFile(e.target.files[0])}
                    />
                  </label>
                </div>

                {/* Optional Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Student Notes / Submission Comments (Optional)
                  </label>
                  <textarea
                    value={submissionNotes}
                    onChange={e => setSubmissionNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any notes or context for your teacher..."
                    className="w-full rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1E293B] p-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setActiveFileUploadTask(null)}
                    disabled={isSubmittingFile}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFile || !submissionFile}
                    className="kn-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingFile ? 'Submitting File...' : 'Submit to Instructor'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ──────── MODAL 4: GRADED SUBMISSION REVIEW ──────── */}
        {viewingSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setViewingSubmission(null)}>
            <div
              className="w-full max-w-lg bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.1] rounded-2xl p-6 text-slate-900 dark:text-white space-y-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
                <div className="space-y-0.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 uppercase">
                    Submission Details
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {viewingSubmission.quiz_details?.title || viewingSubmission.quiz?.title || 'Assessment Submission'}
                  </h3>
                </div>
                <button
                  onClick={() => setViewingSubmission(null)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Attached File</span>
                  <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>{viewingSubmission.submission_file_name || 'Attached Project Document'}</span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status & Grade</span>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {viewingSubmission.score !== null ? 'Graded by Instructor' : 'Under Faculty Review'}
                    </span>
                    {viewingSubmission.score !== null && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        {viewingSubmission.score} / {viewingSubmission.quiz_details?.total_points || 100} Points
                      </span>
                    )}
                  </div>
                  {viewingSubmission.feedback && (
                    <div className="pt-2 mt-2 border-t border-slate-200/40 dark:border-white/[0.04]">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase">Instructor Feedback:</span>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">{viewingSubmission.feedback}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] text-right">
                <button
                  onClick={() => setViewingSubmission(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. GRID VIEW: ENROLLED SUBJECTS DIRECTORY (CLASS STUDIO)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-y-auto bg-[#FAF9F6] dark:bg-[#0F1115] p-4 sm:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100 max-w-7xl mx-auto">
      {/* Header Banner */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 lg:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  STUDENT CLASSROOMS
                </span>
                {showHistorical && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                    HISTORICAL ARCHIVE
                  </span>
                )}
              </div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                My Class Subjects & Schedules
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                View your registered course curriculum, instructor office hours, classroom locations, and official grades.
              </p>
            </div>
          </div>

          {/* Historical Data Toggle & Class Studio Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistorical(!showHistorical)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer ${
                showHistorical
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                  : 'bg-white dark:bg-[#161920] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.1] hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4" />
              <span>{showHistorical ? 'Show Active Term' : 'Historical Data'}</span>
            </button>

            {/* Changed from Study Studio to Class Studio */}
            <button
              onClick={() => onNavigate?.('/workspace')}
              className="kn-btn-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Class Studio</span>
            </button>
          </div>
        </div>
      </section>

      {/* Student Department, Dean & Program Alignment Banner */}
      <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{classrooms[0]?.department_name || user?.department_name || user?.departmentName || 'College of Accountancy'}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Dean: <strong className="font-semibold text-slate-900 dark:text-white">{classrooms[0]?.dean?.name || 'Dr. Arthur Dean'}</strong></span>
          </div>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <GraduationCap className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>{user?.course || 'BSA - Bachelor of Science in Accountancy'}</span>
            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              {user?.year_level || user?.yearLevel || '1st'} Year Standing
            </span>
          </div>
        </div>

        {user?.school && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 shrink-0 bg-white/60 dark:bg-white/[0.04] px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/[0.06]">
            <span>Institution:</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{user.school}</span>
          </div>
        )}
      </div>

      {/* Classrooms Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {showHistorical ? 'Archived Academic Records' : 'Enrolled Subjects'} ({classrooms.length})
          </h2>
          <button
            onClick={fetchClassrooms}
            disabled={isLoading}
            className="p-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            title="Refresh Classrooms"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {classrooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classrooms.map((c) => (
              <div
                key={c.enrollment_id}
                onClick={() => setSelectedClassroom(c)}
                className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4 hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-mono">
                        {c.subject_code || 'CLASS'}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {c.subject_name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {c.department_name} • {c.year_level} Year
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {c.grade || '1.25'}
                      </span>
                    </div>
                  </div>

                  {/* Instructor & Schedule Info */}
                  <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                    <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="truncate">
                        Instructor: <strong className="font-semibold">{c.instructor?.name || 'Dr. Sarah Teacher'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="truncate">
                        {c.schedule?.time_slot || 'Online / Flexible'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                      <span className="truncate">
                        {c.schedule?.classroom || 'Business Hall 101'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: View Classroom vs Quizzes count */}
                <div className="pt-3 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      {c.materials_count || (c.materials ? c.materials.length : 0)} materials
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Brain className="w-3.5 h-3.5 text-purple-500" />
                      {c.quizzes ? c.quizzes.length : 0} quizzes
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
                      <span>Open Subject</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl text-slate-400 text-xs">
            {showHistorical ? 'No historical archived records found.' : 'You are not enrolled in any class subjects for the current active term.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentClassroomsView;
