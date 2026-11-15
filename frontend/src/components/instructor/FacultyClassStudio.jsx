import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, BookOpen, Users, Upload, FileText, CheckCircle2,
  Calendar, MapPin, Award, ArrowRight, Brain, AlertCircle,
  RefreshCw, MessageSquare, Plus, Clock, ExternalLink, ChevronDown,
  ChevronUp, Eye, X, RotateCcw, Timer, FileCheck, PlayCircle, Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

export function FacultyClassStudio({ onNavigate }) {
  const { user, token } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'quizzes' | 'roster'

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadPeriod, setUploadPeriod] = useState('Prelim');
  const [uploadHeading, setUploadHeading] = useState('');
  const [isGeneratingHeading, setIsGeneratingHeading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Material Document Preview Modal
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [viewerMode, setViewerMode] = useState('pdf'); // 'pdf' | 'text'

  // Quizzes & Monitoring State for current subject
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [selectedQuizMonitoring, setSelectedQuizMonitoring] = useState(null);
  const [quizMonitoringData, setQuizMonitoringData] = useState(null);
  const [loadingMonitoring, setLoadingMonitoring] = useState(false);
  const [gradingAssignmentId, setGradingAssignmentId] = useState(null);
  const [gradeInput, setGradeInput] = useState({});
  const [feedbackInput, setFeedbackInput] = useState({});
  const [activeFilePreview, setActiveFilePreview] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Expanded periods accordion state
  const [expandedPeriods, setExpandedPeriods] = useState({
    'Prelim': true,
    'Midterm': true,
    'Semi-Finals': true,
    'Finals': true
  });

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchAssignedSubjects();
  }, [token]);

  const fetchAssignedSubjects = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/academic/instructor/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const subjs = data.subjects || [];
        setSubjects(subjs);
        if (subjs.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(subjs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load instructor subjects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0] || null;
  const enrolledStudents = currentSubject?.enrolled_students || [];
  const materials = currentSubject?.materials || [];

  // Fetch quizzes for current subject
  useEffect(() => {
    if (currentSubject?.id && token) {
      fetchSubjectQuizzes(currentSubject.id);
    }
  }, [currentSubject?.id, token]);

  const fetchSubjectQuizzes = async (subjectId) => {
    setLoadingQuizzes(true);
    try {
      const res = await fetch(`${API_BASE}/academic/instructor/quizzes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const allQuizzes = data.quizzes || [];
        setQuizzes(allQuizzes.filter(q => q.subject_id === subjectId));
      }
    } catch (err) {
      console.error('Failed to load subject quizzes:', err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  // Toggle period accordion
  const togglePeriod = (p) => {
    setExpandedPeriods(prev => ({ ...prev, [p]: !prev[p] }));
  };

  // AI Auto-Generate Heading
  const handleAutoGenerateHeading = async () => {
    if (!uploadTitle.trim() && !uploadFile) {
      showNotification('Please enter a material title or select a file first', 'error');
      return;
    }

    setIsGeneratingHeading(true);
    try {
      const res = await fetch(`${API_BASE}/academic/materials/generate-heading`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: uploadTitle || (uploadFile ? uploadFile.name : ''),
          content_text: uploadTitle
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.heading) setUploadHeading(data.heading);
        if (data.period) setUploadPeriod(data.period);
        showNotification('AI generated topic heading and period!');
      } else {
        const clean = (uploadTitle || uploadFile?.name || 'Curriculum Module').replace(/\.[^/.]+$/, '');
        setUploadHeading(clean.replace(/[-_]/g, ' '));
      }
    } catch (err) {
      const clean = (uploadTitle || uploadFile?.name || 'Curriculum Module').replace(/\.[^/.]+$/, '');
      setUploadHeading(clean.replace(/[-_]/g, ' '));
    } finally {
      setIsGeneratingHeading(false);
    }
  };

  // Handle Material Upload with Period and Heading
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile && !uploadTitle.trim()) {
      showNotification('Please select a file or enter a material title', 'error');
      return;
    }
    if (!currentSubject) return;

    setIsUploading(true);
    const formData = new FormData();
    if (uploadFile) {
      formData.append('file', uploadFile);
    }
    formData.append('title', uploadTitle.trim() || (uploadFile ? uploadFile.name.replace(/\.[^/.]+$/, '') : 'Lecture Notes'));
    formData.append('period', uploadPeriod);
    formData.append('heading', uploadHeading.trim() || 'Course Learning Materials');

    try {
      const res = await fetch(`${API_BASE}/academic/subjects/${currentSubject.id}/materials`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        showNotification(`Material uploaded for ${uploadPeriod} period!`);
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadHeading('');
        fetchAssignedSubjects();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to upload material', 'error');
      }
    } catch (err) {
      showNotification('Upload network error', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Open Quiz Monitoring Modal
  const handleOpenQuizMonitoring = async (quiz) => {
    setSelectedQuizMonitoring(quiz);
    setLoadingMonitoring(true);
    try {
      const res = await fetch(`${API_BASE}/academic/instructor/quizzes/${quiz.id}/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuizMonitoringData(data);
        const list = data.submissions || [];
        const initialGrades = {};
        const initialFeedbacks = {};
        list.forEach(sub => {
          if (sub.score !== null && sub.score !== undefined) {
            initialGrades[sub.id] = sub.score;
          }
          if (sub.feedback) {
            initialFeedbacks[sub.id] = sub.feedback;
          }
        });
        setGradeInput(initialGrades);
        setFeedbackInput(initialFeedbacks);
      }
    } catch (err) {
      console.error('Failed to load quiz monitoring data:', err);
    } finally {
      setLoadingMonitoring(false);
    }
  };

  // Allow Student to Retake
  const handleAllowRetake = async (assignmentId) => {
    setActionInProgress(true);
    try {
      const res = await fetch(`${API_BASE}/academic/instructor/quizzes/assignments/${assignmentId}/allow-retake`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification('Retake granted! Student attempt has been reset.');
        if (selectedQuizMonitoring) {
          handleOpenQuizMonitoring(selectedQuizMonitoring);
        }
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to allow retake', 'error');
      }
    } catch (err) {
      showNotification('Network error granting retake', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Save Grade
  const handleSaveGrade = async (assignmentId) => {
    const scoreVal = gradeInput[assignmentId];
    if (scoreVal === undefined || scoreVal === '') {
      showNotification('Please enter a grade score', 'error');
      return;
    }

    setActionInProgress(true);
    try {
      const res = await fetch(`${API_BASE}/academic/instructor/quizzes/assignments/${assignmentId}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          score: parseFloat(scoreVal),
          feedback: feedbackInput[assignmentId] || ''
        })
      });

      if (res.ok) {
        showNotification('Grade and feedback saved!');
        setGradingAssignmentId(null);
        if (selectedQuizMonitoring) {
          handleOpenQuizMonitoring(selectedQuizMonitoring);
        }
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to save grade', 'error');
      }
    } catch (err) {
      showNotification('Network error saving grade', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Group materials and quizzes by period
  const periodsList = ['Prelim', 'Midterm', 'Semi-Finals', 'Finals'];
  const materialsByPeriod = {
    'Prelim': materials.filter(m => (m.period || 'Prelim').toLowerCase().startsWith('prelim')),
    'Midterm': materials.filter(m => (m.period || '').toLowerCase().startsWith('midterm')),
    'Semi-Finals': materials.filter(m => (m.period || '').toLowerCase().includes('semi')),
    'Finals': materials.filter(m => (m.period || '').toLowerCase() === 'finals' || (m.period || '').toLowerCase() === 'final')
  };

  const quizzesByPeriod = {
    'Prelim': quizzes.filter(q => (q.period || 'Prelim').toLowerCase().startsWith('prelim')),
    'Midterm': quizzes.filter(q => (q.period || '').toLowerCase().startsWith('midterm')),
    'Semi-Finals': quizzes.filter(q => (q.period || '').toLowerCase().includes('semi')),
    'Finals': quizzes.filter(q => (q.period || '').toLowerCase() === 'finals' || (q.period || '').toLowerCase() === 'final')
  };

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
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  FACULTY STUDIO
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Curriculum Lessons, Quizzes & Period Monitoring
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Class Studio
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Organize curriculum materials by academic period, monitor student quiz scores, pass/fail averages, and allow retakes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate?.('/practice')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#161920] hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <Brain className="w-4 h-4 text-purple-500" />
              <span>Quizzes & Exams</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="kn-btn-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Lesson Material</span>
            </button>
          </div>
        </div>
      </section>

      {/* Subject Selector Bar */}
      <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-blue-500 shrink-0" />
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Subject</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white bg-transparent border-0 focus:ring-0 cursor-pointer p-0"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id} className="dark:bg-[#1E293B]">
                  {s.code} — {s.name} ({s.enrolled_count || (s.enrolled_students ? s.enrolled_students.length : 0)} students enrolled)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Tabs: Lessons, Quizzes & Exams, Roster */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'materials'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Lessons by Period ({materials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quizzes'
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-500" />
            <span>Quizzes & Exams ({quizzes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-slate-100 text-slate-800 dark:bg-white/[0.08] dark:text-white border border-slate-200 dark:border-white/[0.1] shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Enrolled Students ({enrolledStudents.length})</span>
          </button>
        </div>
      </div>

      {/* ──────── TAB 1: LESSONS BY PERIOD ──────── */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {periodsList.map((periodKey, idx) => {
            const periodMats = materialsByPeriod[periodKey] || [];
            const isExpanded = Boolean(expandedPeriods[periodKey]);
            const periodNum = idx + 1;
            const periodLabel = `${periodNum}. ${periodKey === 'Semi-Finals' ? 'Semi Finals' : periodKey} Period`;

            return (
              <div
                key={periodKey}
                className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs overflow-hidden"
              >
                <div
                  onClick={() => togglePeriod(periodKey)}
                  className="p-5 flex items-center justify-between cursor-pointer select-none bg-gradient-to-r from-transparent to-slate-50/50 dark:to-white/[0.01]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                      {periodNum}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {periodLabel}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {periodMats.length} lesson section(s) published
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400">
                      {periodMats.length} Materials
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center text-slate-600 dark:text-slate-300">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.04]"
                    >
                      {periodMats.length > 0 ? (
                        periodMats.map((m) => (
                          <div
                            key={m.id}
                            className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {m.title}
                                  </h4>
                                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/[0.05] text-slate-500">
                                    {m.file_type || 'PDF'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  Topic: <strong className="font-semibold text-slate-700 dark:text-slate-300">{m.heading || 'Course Learning Materials'}</strong>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                onClick={() => setViewingMaterial(m)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-500" />
                                <span>View PDF / File</span>
                              </button>
                              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                          <p>No materials uploaded for {periodKey} Period yet.</p>
                          <button
                            onClick={() => {
                              setUploadPeriod(periodKey);
                              setShowUploadModal(true);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            + Upload lesson file for {periodKey}
                          </button>
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

      {/* ──────── TAB 2: QUIZZES & EXAMS BY PERIOD (TEACHER MONITORING SECTION) ──────── */}
      {activeTab === 'quizzes' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <span>Quizzes & Exams Monitoring (Prelim to Finals)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any quiz container below to view full student submissions, class average scores, pass/fail counts, and allow student retakes.
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('/practice')}
              className="kn-btn-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Quiz or Exam</span>
            </button>
          </div>

          {periodsList.map((periodKey, idx) => {
            const periodQuizzes = quizzesByPeriod[periodKey] || [];
            const periodNum = idx + 1;
            const periodLabel = `${periodNum}. ${periodKey === 'Semi-Finals' ? 'Semi Finals' : periodKey} Period`;

            return (
              <div
                key={periodKey}
                className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center">
                      {periodNum}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {periodLabel} Assessments
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {periodQuizzes.length} assessment{periodQuizzes.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="p-5">
                  {periodQuizzes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {periodQuizzes.map((quiz) => (
                        <div
                          key={quiz.id}
                          onClick={() => handleOpenQuizMonitoring(quiz)}
                          className="p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] hover:border-purple-400 dark:hover:border-purple-600 bg-white dark:bg-[#161920] shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                quiz.category === 'exam'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200'
                                  : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                              }`}>
                                {quiz.category || 'Quiz'}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500">
                                {quiz.quiz_type === 'file_upload' ? `${quiz.total_points || 100} Pts` : `${quiz.question_count || 5} Questions`}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {quiz.title}
                            </h4>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              {quiz.time_limit_minutes > 0 ? (
                                <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                                  <Timer className="w-3.5 h-3.5" />
                                  <span>{quiz.time_limit_minutes}m limit</span>
                                </span>
                              ) : (
                                <span>Untimed</span>
                              )}
                              <span>•</span>
                              <span>Passing: {quiz.passing_score || 75}%</span>
                              {quiz.due_date && (
                                <>
                                  <span>•</span>
                                  <span>Due: {new Date(quiz.due_date).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Quick Telemetry Bar */}
                          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {quiz.total_completed || 0} / {quiz.total_assigned || 0} Finished
                              </span>
                            </div>

                            <span className="font-semibold text-purple-600 dark:text-purple-400 group-hover:underline flex items-center gap-1">
                              <span>Monitor Scores</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                      <p>No assessments published for {periodKey} Period yet.</p>
                      <button
                        onClick={() => onNavigate?.('/practice')}
                        className="text-purple-600 dark:text-purple-400 hover:underline font-semibold cursor-pointer"
                      >
                        + Create {periodKey} quiz or exam
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──────── TAB 3: ENROLLED STUDENTS ROSTER ──────── */}
      {activeTab === 'roster' && (
        <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Assigned Students Cohort ({enrolledStudents.length})
              </h3>
              <p className="text-xs text-slate-500">Learners officially enrolled in this course.</p>
            </div>
          </div>

          {enrolledStudents.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {enrolledStudents.map((st) => (
                <div key={st.enrollment_id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{st.name}</p>
                    <p className="text-[11px] text-slate-400">{st.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      Grade: {st.grade || '1.25'}
                    </span>
                    <span className="text-[11px] text-slate-500">{st.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No students enrolled in this subject yet.
            </div>
          )}
        </div>
      )}

      {/* ──────── MODAL 1: MATERIAL UPLOAD MODAL ──────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => !isUploading && setShowUploadModal(false)}>
          <div
            className="w-full max-w-lg bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.1] rounded-2xl p-6 text-slate-900 dark:text-white space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-500" />
                <span>Upload Course Learning Material</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Academic Period
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {periodsList.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setUploadPeriod(p)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        uploadPeriod === p
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {p === 'Semi-Finals' ? 'Semi' : p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Document / Material File (.pdf, .docx, .pptx, .txt)
                </label>
                <label className="border-2 border-dashed border-slate-300 dark:border-white/[0.1] hover:border-blue-400 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50/50 dark:bg-white/[0.01]">
                  <FileText className="w-7 h-7 text-blue-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {uploadFile ? uploadFile.name : 'Click to select material file'}
                  </span>
                  <span className="text-[10px] text-slate-400">PDF, Word, or Presentation file</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        const f = e.target.files[0];
                        setUploadFile(f);
                        if (!uploadTitle) {
                          setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
                        }
                      }
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Material Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Chapter 1: Introduction to Conceptual Framework"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1E293B] p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    AI Auto-Generated Topic Heading
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateHeading}
                    disabled={isGeneratingHeading}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isGeneratingHeading ? 'Generating...' : 'Auto-Generate with AI'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={uploadHeading}
                  onChange={e => setUploadHeading(e.target.value)}
                  placeholder="e.g. Conceptual Framework and Reporting Standards"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1E293B] p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="kn-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? 'Uploading & Indexing...' : 'Upload & Publish to Class'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────── MODAL 2: RICH PDF & MATERIAL VIEWER MODAL ──────── */}
      {viewingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewingMaterial(null)}>
          <div
            className="w-full max-w-5xl bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 text-white space-y-4 shadow-2xl h-[88vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 uppercase">
                    {viewingMaterial.period || 'Prelim'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 uppercase">
                    {viewingMaterial.file_type || 'PDF'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{viewingMaterial.heading || viewingMaterial.title}</h3>
                <p className="text-xs text-slate-400">{viewingMaterial.title}</p>
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-white/10 p-1 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setViewerMode('pdf')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${viewerMode === 'pdf' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}
                  >
                    PDF Viewer
                  </button>
                  <button
                    onClick={() => setViewerMode('text')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${viewerMode === 'text' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}
                  >
                    Extracted Study Text
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
                    <span>Open in Tab</span>
                  </a>
                )}

                <button
                  onClick={() => setViewingMaterial(null)}
                  className="text-slate-400 hover:text-white cursor-pointer p-1"
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
                  title="PDF Document Viewer"
                />
              ) : (
                <div className="h-full overflow-y-auto p-5 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                  {viewingMaterial.content_text || 'No extracted text notes available for this material.'}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs">
              <span className="text-slate-400">
                Document is indexed for Knowri AI Socratic coaching for all enrolled students.
              </span>
              <button
                onClick={() => setViewingMaterial(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────── MODAL 3: QUIZ MONITORING & RETAKE MODAL ──────── */}
      {selectedQuizMonitoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedQuizMonitoring(null)}>
          <div
            className="w-full max-w-4xl bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.1] rounded-2xl p-6 text-slate-900 dark:text-white space-y-5 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                    {selectedQuizMonitoring.category || 'Quiz'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    {selectedQuizMonitoring.period || 'Prelim'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {selectedQuizMonitoring.subject_code}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {selectedQuizMonitoring.title} — Performance Telemetry & Submissions
                </h3>
              </div>
              <button
                onClick={() => setSelectedQuizMonitoring(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Analytics KPI Row */}
            {quizMonitoringData && (
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{quizMonitoringData.total_assigned || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">{quizMonitoringData.total_submitted || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Score</span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{quizMonitoringData.average_score || 0}%</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pass / Fail</span>
                  <p className="text-sm font-black mt-0.5">
                    <span className="text-emerald-600 dark:text-emerald-400">{quizMonitoringData.passed_count || 0} passed</span>
                    {' • '}
                    <span className="text-rose-500">{quizMonitoringData.failed_count || 0} failed</span>
                  </p>
                </div>
              </div>
            )}

            {/* Submissions Roster List */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {loadingMonitoring ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 mx-auto animate-spin text-purple-500" />
                  <p className="text-xs">Loading student scores and submissions...</p>
                </div>
              ) : (quizMonitoringData?.submissions || []).length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Enrolled Student</span>
                    <span>Submission Status & File</span>
                    <span>Score & Grade</span>
                    <span>Teacher Actions</span>
                  </div>

                  {(quizMonitoringData.submissions || []).map((sub) => {
                    const isGraded = sub.score !== null && sub.score !== undefined;
                    const isPassed = isGraded && sub.score >= (quizMonitoringData.passing_score || 75);

                    return (
                      <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                        <div className="space-y-0.5 min-w-[180px]">
                          <p className="font-bold text-slate-900 dark:text-white">{sub.student_name || 'Enrolled Student'}</p>
                          <p className="text-[11px] text-slate-400">{sub.student_email}</p>
                          {sub.attempts_count > 1 && (
                            <span className="text-[10px] font-semibold text-purple-500">Attempt #{sub.attempts_count}</span>
                          )}
                        </div>

                        <div className="space-y-1 min-w-[200px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sub.status === 'completed'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : sub.status === 'submitted'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400'
                            }`}>
                              {sub.status === 'completed' ? 'Completed' : sub.status === 'submitted' ? 'Submitted' : 'Pending'}
                            </span>
                            {sub.is_late && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                LATE
                              </span>
                            )}
                            {sub.retake_requested && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">
                                Retake Requested!
                              </span>
                            )}
                          </div>

                          {sub.submission_file_url && (
                            <button
                              onClick={() => setActiveFilePreview(sub)}
                              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[160px]">{sub.submission_file_name || 'View Submitted Document'}</span>
                            </button>
                          )}
                        </div>

                        <div className="min-w-[120px]">
                          {isGraded ? (
                            <div className="space-y-0.5">
                              <span className={`font-black text-sm ${isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                {sub.score} / {selectedQuizMonitoring.total_points || 100}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {isPassed ? '✓ Passed' : '✗ Below Passing'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not graded</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAllowRetake(sub.id)}
                            disabled={actionInProgress}
                            className="px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer transition-colors"
                            title="Reset student attempt to allow retaking"
                          >
                            <RotateCcw className="w-3 h-3 inline mr-1" />
                            <span>Allow Retake</span>
                          </button>

                          <button
                            onClick={() => setGradingAssignmentId(gradingAssignmentId === sub.id ? null : sub.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer transition-colors"
                          >
                            {gradingAssignmentId === sub.id ? 'Close' : 'Grade'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No enrolled students have been assigned this assessment yet.
                </div>
              )}

              {/* In-line Grading Drawer */}
              {gradingAssignmentId && (
                <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 space-y-3">
                  <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    Assign Official Grade & Instructor Feedback
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Score (out of {selectedQuizMonitoring.total_points || 100})
                      </label>
                      <input
                        type="number"
                        value={gradeInput[gradingAssignmentId] || ''}
                        onChange={(e) => setGradeInput({ ...gradeInput, [gradingAssignmentId]: e.target.value })}
                        placeholder="e.g. 95"
                        className="w-full rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1E293B] p-2 text-xs font-bold"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Instructor Feedback
                      </label>
                      <input
                        type="text"
                        value={feedbackInput[gradingAssignmentId] || ''}
                        onChange={(e) => setFeedbackInput({ ...feedbackInput, [gradingAssignmentId]: e.target.value })}
                        placeholder="e.g. Excellent work and clear financial analysis breakdown."
                        className="w-full rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1E293B] p-2 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setGradingAssignmentId(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveGrade(gradingAssignmentId)}
                      disabled={actionInProgress}
                      className="kn-btn-primary px-4 py-1.5 text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      Save Grade
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] text-right">
              <button
                onClick={() => setSelectedQuizMonitoring(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────── MODAL 4: SUBMITTED STUDENT FILE PREVIEW ──────── */}
      {activeFilePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setActiveFilePreview(null)}>
          <div
            className="w-full max-w-4xl bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 text-white space-y-4 shadow-2xl h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-blue-400 uppercase">Student Submission File</span>
                <h3 className="text-sm font-bold text-white">{activeFilePreview.submission_file_name || 'Document'}</h3>
                <p className="text-[11px] text-slate-400">Submitted by {activeFilePreview.student_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${activeFilePreview.submission_file_url}?token=${token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Tab</span>
                </a>
                <button
                  onClick={() => setActiveFilePreview(null)}
                  className="text-slate-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-black/40 rounded-xl overflow-hidden border border-white/[0.06] relative">
              <iframe
                src={`${activeFilePreview.submission_file_url}?token=${token}`}
                className="w-full h-full border-0"
                title="Submitted File Preview"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs">
              <p className="text-slate-400">
                If the document preview does not load directly, click "Open in Tab" above to view in your browser.
              </p>
              <button
                onClick={() => setActiveFilePreview(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
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

export default FacultyClassStudio;
