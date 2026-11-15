import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle2, XCircle, AlertCircle, RotateCcw,
  Archive, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2,
  BookOpen, HelpCircle, FileText, Check, ShieldCheck, Tag,
  Link2, Scale, ClipboardList, Search, Key, Layers
} from 'lucide-react';
import { KnowrizonMascot, MASCOT_STATES } from '../ui/KnowrizonMascot';
import { API_BASE } from '../../lib/api';

const QUIZ_TYPES = [
  { id: 'multiple_choice', label: 'Multiple Choice', desc: '4 options with realistic distractors' },
  { id: 'true_false', label: 'True / False', desc: 'Quick check on core facts' },
  { id: 'identification', label: 'Identification', desc: 'Recall key terms and definitions' },
  { id: 'matching', label: 'Matching Type', desc: 'Pair terms with their meanings' },
  { id: 'fill_in_blank', label: 'Fill in the Blank', desc: 'Complete the missing concept in context' },
  { id: 'scenario_based', label: 'Scenario-Based', desc: 'Apply concepts to real-world problems' },
  { id: 'critical_thinking', label: 'Critical Thinking', desc: 'Analyze trade-offs and evaluate claims' },
  { id: 'mixed', label: 'Mixed Mode', desc: 'Blend of different question formats' }
];

const FORMAT_LABELS = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  identification: 'Identification',
  matching: 'Matching Type',
  fill_in_blank: 'Fill in the Blank',
  scenario_based: 'Scenario-Based',
  critical_thinking: 'Critical Thinking',
  mixed: 'Mixed Mode'
};

const TOPIC_SUGGESTIONS = [
  'Integrative Programming',
  'Calculus & Rates of Change',
  'Pharmacology & Renal Physiology',
  'Data Structures & Algorithms',
  'Organic Chemistry',
  'Anatomy & Physiology',
  'Software Architecture'
];

const PRESET_COUNTS = [5, 10, 15, 20];

const LOADING_STAGES = [
  'Analyzing Materials...',
  'Extracting Concepts...',
  'Building Question Bank...',
  'Creating Explanations...',
  'Attaching References...',
  'Preparing Learning Support...',
  'Ready!'
];

export function QuizWorkspace({
  topic = '',
  conversationId = null,
  selectedDocIds = [],
  documents = [],
  token = '',
  onQuizCompleted = null,
  allowTopicEdit = true,
  onTopicChange = null
}) {
  // Derive default topic from selected documents if topic is generic
  const selectedDocs = useMemo(() => {
    return (documents || []).filter(d => (selectedDocIds || []).includes(d.id));
  }, [documents, selectedDocIds]);

  const selectedDocTitle = useMemo(() => {
    if (!selectedDocs || selectedDocs.length === 0) return '';
    return selectedDocs.map(d => d.title || d.filename).filter(Boolean).join(', ');
  }, [selectedDocs]);

  // Phase states: 'config' | 'loading' | 'active' | 'results'
  const [phase, setPhase] = useState('config');
  const [activeTopic, setActiveTopic] = useState(() => {
    if (selectedDocTitle) return selectedDocTitle;
    if (topic && !['study studio', 'general knowledge'].includes(topic.trim().toLowerCase())) return topic;
    return 'Integrative Programming';
  });
  const [questionCount, setQuestionCount] = useState(5);
  const [customCountInput, setCustomCountInput] = useState('');
  const [isCustomCount, setIsCustomCount] = useState(false);
  const [selectedQuizTypes, setSelectedQuizTypes] = useState(['multiple_choice']);
  const selectedQuizType = selectedQuizTypes.length === 1 ? selectedQuizTypes[0] : 'mixed';

  // Loading animation state
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);

  // Active quiz state
  const [quizData, setQuizData] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [textAnswers, setTextAnswers] = useState({});

  // Results state
  const [results, setResults] = useState(null);
  const [hideDetails, setHideDetails] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Sync external topic or selected document titles
  useEffect(() => {
    if (selectedDocTitle && (!activeTopic || ['integrative programming', 'study studio', 'general knowledge'].includes(activeTopic.trim().toLowerCase()))) {
      setActiveTopic(selectedDocTitle);
    } else if (topic && (!activeTopic || activeTopic === 'Integrative Programming')) {
      setActiveTopic(topic);
    }
  }, [topic, selectedDocTitle]);

  // Cycle through educational loading text
  useEffect(() => {
    let interval;
    if (phase === 'loading') {
      setLoadingStageIndex(0);
      interval = setInterval(() => {
        setLoadingStageIndex(prev => {
          if (prev < LOADING_STAGES.length - 1) return prev + 1;
          return prev;
        });
      }, 1600);
    }
    return () => clearInterval(interval);
  }, [phase]);

  // Handle generating quiz
  const handleGenerateQuiz = async () => {
    setError(null);
    setPhase('loading');

    const count = isCustomCount
      ? Math.max(1, Math.min(30, parseInt(customCountInput, 10) || 5))
      : questionCount;

    const resolvedTopic = (activeTopic.trim() && !['general knowledge', 'study studio'].includes(activeTopic.trim().toLowerCase()))
      ? activeTopic.trim()
      : (selectedDocTitle || activeTopic.trim() || topic || 'Study Material');

    try {
      const res = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          topic: resolvedTopic,
          contentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
          questionCount: count,
          quizType: selectedQuizType,
          quizTypes: selectedQuizTypes,
          conversationId: conversationId || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate quiz');
      }

      const data = await res.json();
      setQuizData(data);
      setCurrentQIndex(0);
      setAnswers({});
      setTextAnswers({});
      setPhase('active');
    } catch (err) {
      console.error('Quiz generation error:', err);
      setError(err.message);
      setPhase('config');
    }
  };

  // Submit quiz answers
  const handleSubmitQuiz = async () => {
    if (!quizData) return;
    setIsSubmitting(true);
    setError(null);

    const questions = quizData.questions || [];
    const submittedAnswers = questions.map((q, idx) => {
      if (answers[idx] !== undefined) return answers[idx];
      if (textAnswers[idx] !== undefined) return textAnswers[idx];
      return -1;
    });

    try {
      const res = await fetch(`${API_BASE}/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quizId: quizData.quizId,
          answers: submittedAnswers
        })
      });

      if (!res.ok) {
        throw new Error('Failed to submit quiz answers');
      }

      const gradeResults = await res.json();
      setResults(gradeResults);
      setPhase('results');
      if (onQuizCompleted) onQuizCompleted();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive quiz
  const handleArchive = async () => {
    if (!quizData?.quizId) return;
    try {
      const res = await fetch(`${API_BASE}/quiz/${quizData.quizId}/archive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setIsArchived(true);
      }
    } catch (err) {
      console.error('Failed to archive quiz:', err);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. CONFIGURATION PHASE
  // ─────────────────────────────────────────────────────────────
  if (phase === 'config') {
    const effectiveCount = isCustomCount
      ? Math.max(1, Math.min(30, parseInt(customCountInput, 10) || 5))
      : questionCount;

    const countDistribution = selectedQuizTypes.map((typeId, idx) => {
      const K = selectedQuizTypes.length;
      const base = Math.floor(effectiveCount / K);
      const rem = effectiveCount % K;
      const cnt = base + (idx < rem ? 1 : 0);
      return {
        id: typeId,
        label: FORMAT_LABELS[typeId] || typeId,
        count: cnt
      };
    });

    const handleToggleFormat = (typeId) => {
      if (typeId === 'mixed') {
        const allSeven = ['multiple_choice', 'true_false', 'identification', 'matching', 'fill_in_blank', 'scenario_based', 'critical_thinking'];
        if (selectedQuizTypes.length === allSeven.length) {
          setSelectedQuizTypes(['multiple_choice']);
        } else {
          setSelectedQuizTypes(allSeven);
        }
        return;
      }

      setSelectedQuizTypes(prev => {
        const exists = prev.includes(typeId);
        if (exists) {
          if (prev.length <= 1) return prev;
          return prev.filter(id => id !== typeId);
        } else {
          return [...prev, typeId];
        }
      });
    };
    return (
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        {/* Animated 4 Flashcards Intro */}
        <div className="text-center space-y-3">
          <div className="flex justify-center items-center gap-2 mb-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-9 h-12 rounded-lg bg-blue-600 dark:bg-blue-500 border border-blue-400/40 shadow-xs flex items-center justify-center text-white font-bold text-xs"
                animate={{
                  y: [0, -6, 0],
                  rotate: [i * 3 - 4.5, -(i * 3 - 4.5), i * 3 - 4.5]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut'
                }}
              >
                ?
              </motion.div>
            ))}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Practice Quizzes
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Grounded strictly in your uploaded materials and syllabus. Customize format and count for targeted retrieval.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-600 dark:text-slate-300">
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Scope: {selectedDocIds.length > 0 ? `${selectedDocIds.length} Selected Documents` : 'All Workspace Materials'}</span>
          </div>
        </div>

        {/* Study Topic Input & Suggestions */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Course or topic
          </label>
          <input
            type="text"
            value={activeTopic}
            onChange={(e) => {
              setActiveTopic(e.target.value);
              if (onTopicChange) onTopicChange(e.target.value);
            }}
            placeholder="e.g. Integrative Programming, Renal Physiology, Calculus..."
            className="w-full px-4 py-2.5 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-all shadow-2xs"
          />
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {TOPIC_SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => {
                  setActiveTopic(sug);
                  if (onTopicChange) onTopicChange(sug);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  activeTopic === sug
                    ? 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950/40 dark:border-blue-600 dark:text-blue-300 font-medium'
                    : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/[0.15] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Question Count Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Number of questions
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PRESET_COUNTS.map(count => (
              <button
                key={count}
                type="button"
                onClick={() => {
                  setQuestionCount(count);
                  setIsCustomCount(false);
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  !isCustomCount && questionCount === count
                    ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-300 shadow-2xs'
                    : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/[0.15]'
                }`}
              >
                {count} Questions
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCustomCount(true)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isCustomCount
                  ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-300 shadow-2xs'
                  : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/[0.15]'
              }`}
            >
              Custom
            </button>
          </div>

          {isCustomCount && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-1.5"
            >
              <input
                type="number"
                min="1"
                max="30"
                value={customCountInput}
                onChange={(e) => setCustomCountInput(e.target.value)}
                placeholder="Enter custom count (e.g. 8, 12, 25)"
                className="w-full sm:w-60 px-3.5 py-2 bg-white dark:bg-[#161920] border border-slate-200 dark:border-blue-500/50 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none"
              />
            </motion.div>
          )}
        </div>

        {/* Assessment Format Selector (Multi-Select Enabled) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Assessment formats (multi-select)
            </label>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
              {selectedQuizTypes.length} {selectedQuizTypes.length === 1 ? 'format' : 'formats'} selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {QUIZ_TYPES.map(type => {
              const isSelected = type.id === 'mixed'
                ? selectedQuizTypes.length === 7
                : selectedQuizTypes.includes(type.id);

              return (
                <div
                  key={type.id}
                  onClick={() => handleToggleFormat(type.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer select-none group relative ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-600 dark:bg-blue-950/30 dark:border-blue-400 shadow-2xs ring-1 ring-blue-500/20'
                      : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${
                      isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'
                    }`}>
                      {type.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {type.id !== 'mixed' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQuizTypes([type.id]);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06]"
                          title="Select only this assessment format"
                        >
                          Only
                        </button>
                      )}
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 dark:border-white/20 bg-transparent'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {type.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Dynamic Question Distribution Breakdown Preview */}
          <div className="p-3.5 rounded-xl bg-blue-50/40 dark:bg-white/[0.02] border border-blue-200/60 dark:border-blue-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  {selectedQuizTypes.length > 1
                    ? `Assessment Mix (${effectiveCount} questions across ${selectedQuizTypes.length} formats):`
                    : `Assessment Format (${effectiveCount} questions):`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedQuizTypes(['multiple_choice', 'true_false', 'identification', 'matching', 'fill_in_blank', 'scenario_based', 'critical_thinking'])}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select all
                </button>
                <span className="text-slate-300 dark:text-white/20">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedQuizTypes(['multiple_choice'])}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {countDistribution.map(item => (
                <div
                  key={item.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-100/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-300 text-xs font-medium"
                >
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {item.count}
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleGenerateQuiz}
          className="kn-btn-primary w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Grounded Quiz</span>
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. EDUCATIONAL LOADING PHASE
  // ─────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6 space-y-6">
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex justify-center"
        >
          <KnowrizonMascot state={MASCOT_STATES.THINKING} size={84} />
        </motion.div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Building Your Assessment
          </h3>
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingStageIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-sm font-medium text-blue-600 dark:text-blue-400"
            >
              {LOADING_STAGES[loadingStageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="w-48 h-1.5 mx-auto bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
            animate={{ width: `${((loadingStageIndex + 1) / LOADING_STAGES.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ACTIVE QUIZ PHASE (Rich Interaction for All 8 Formats)
  // ─────────────────────────────────────────────────────────────
  if (phase === 'active' && quizData) {
    const questions = quizData.questions || [];
    const currentQ = questions[currentQIndex];
    const isLastQuestion = currentQIndex === questions.length - 1;
    const currentQType = currentQ?.type || selectedQuizType;
    const isTrueFalse = currentQType === 'true_false' || (
      Array.isArray(currentQ?.options) &&
      currentQ.options.length === 2 &&
      currentQ.options[0] === 'True' &&
      currentQ.options[1] === 'False'
    );
    const isFillInBlank = currentQType === 'fill_in_blank';

    return (
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Progress & Format Header */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white">
              Question {currentQIndex + 1} of {questions.length}
            </span>
            {currentQ?.difficulty && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 capitalize font-mono text-[10px]">
                {currentQ.difficulty}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-blue-700 dark:text-blue-400 font-semibold text-[11px]">
            <Sparkles className="w-3 h-3" />
            <span>{FORMAT_LABELS[currentQType] || currentQType?.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Source attribution preview */}
        {currentQ?.source && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Source: {currentQ.source.document || 'Document'}, Page {currentQ.source.page || 1}</span>
          </div>
        )}

        {/* Question Text & Format-Specific Context Banners */}
        <div className="space-y-3">
          {currentQType === 'scenario_based' && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2.5">
              <ClipboardList className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-amber-800 dark:text-amber-300 block">Practical scenario</span>
                <span className="text-slate-600 dark:text-slate-300">Evaluate the real-world situation and choose the optimal approach.</span>
              </div>
            </div>
          )}

          {currentQType === 'critical_thinking' && (
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 flex items-start gap-2.5">
              <Scale className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-purple-800 dark:text-purple-300 block">Critical thinking</span>
                <span className="text-slate-600 dark:text-slate-300">Evaluate underlying trade-offs, evidence, and justifications.</span>
              </div>
            </div>
          )}

          {currentQType === 'matching' && (
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex items-start gap-2.5">
              <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-indigo-800 dark:text-indigo-300 block">Concept matching</span>
                <span className="text-slate-600 dark:text-slate-300">Select the description that correctly pairs with the target concept.</span>
              </div>
            </div>
          )}

          {currentQType === 'identification' && (
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 flex items-start gap-2.5">
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-blue-800 dark:text-blue-300 block">Term identification</span>
                <span className="text-slate-600 dark:text-slate-300">Identify the concept or term matching the description below.</span>
              </div>
            </div>
          )}

          {currentQType === 'fill_in_blank' && (
            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/40 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-teal-800 dark:text-teal-300 block">Fill in the blank</span>
                <span className="text-slate-600 dark:text-slate-300">Type the missing word into the field below to complete the sentence.</span>
              </div>
            </div>
          )}

          {isFillInBlank && currentQ?.question?.includes('___') ? (
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed tracking-tight">
              {currentQ.question.split('___').map((part, pIdx, arr) => {
                const filledWord = textAnswers[currentQIndex] || (typeof answers[currentQIndex] === 'string' ? answers[currentQIndex] : null);
                // cloze word ready
                // cloze end
                return (
                  <span key={pIdx}>
                    {part}
                    {pIdx < arr.length - 1 && (
                      <span className={`inline-block mx-1.5 px-3 py-0.5 rounded-md border font-mono text-base tracking-wide transition-all ${
                        filledWord
                          ? 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:border-teal-600 dark:text-teal-200 font-bold'
                          : 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:border-blue-600 dark:text-blue-300'
                      }`}>
                        {filledWord ? `[ ${filledWord} ]` : '[ _____ ]'}
                      </span>
                    )}
                  </span>
                );
              })}
            </h3>
          ) : (
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed tracking-tight">
              {currentQ?.question}
            </h3>
          )}
        </div>

        {/* Format-Specific Options & Interaction Rendering */}
        <div className="space-y-3">
          {/* 1. True / False Binary Proposition Cards */}
          {isTrueFalse ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-2">
              {['True', 'False'].map((val, optIdx) => {
                const isSelected = answers[currentQIndex] === optIdx;
                const isTrue = val === 'True';
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQIndex]: optIdx }))}
                    className={`p-5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer ${
                      isSelected
                        ? isTrue
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-500 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-200 shadow-2xs'
                          : 'bg-rose-50 text-rose-900 border-rose-500 dark:bg-rose-950/40 dark:border-rose-500 dark:text-rose-200 shadow-2xs'
                        : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/[0.15]'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold transition-all ${
                      isSelected
                        ? isTrue ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        : isTrue ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}>
                      {isTrue ? '✓' : '✗'}
                    </div>
                    <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{val}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isTrue ? 'Proposition is accurate' : 'Proposition is false'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : currentQType === 'identification' ? (
            /* 2. Identification: Search/Type Input */
            <div className="space-y-4 pt-1">
              <div className="relative">
                <input
                  type="text"
                  value={textAnswers[currentQIndex] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTextAnswers(prev => ({ ...prev, [currentQIndex]: val }));
                    const matchIdx = currentQ.options?.findIndex(opt => opt.trim().toLowerCase() === val.trim().toLowerCase());
                    setAnswers(prev => ({ ...prev, [currentQIndex]: matchIdx !== -1 ? matchIdx : val }));
                  }}
                  placeholder="Type the exact identified concept or term here..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!isLastQuestion) setCurrentQIndex(prev => prev + 1);
                      else handleSubmitQuiz();
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 placeholder:text-slate-400 shadow-2xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>
          ) : currentQType === 'matching' ? (
            /* 3. Matching Type: Connector Cards */
            <div className="space-y-3 pt-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Connect with corresponding definition or function:
              </span>
              <div className="space-y-2.5">
                {currentQ.options?.map((opt, optIdx) => {
                  const isSelected = answers[currentQIndex] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, [currentQIndex]: optIdx }))}
                      className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between group cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 dark:bg-indigo-950/30 dark:border-indigo-400 dark:text-white shadow-2xs'
                          : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.07] text-slate-800 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 pr-3">
                        <span className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.03] text-indigo-600 dark:text-indigo-300 group-hover:border-indigo-400/40'
                        }`}>
                          <Link2 className="w-3.5 h-3.5" />
                        </span>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                            Match {optIdx + 1}
                          </span>
                          <span className="leading-relaxed text-xs sm:text-sm">{opt}</span>
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border flex items-center gap-1 shrink-0 ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-white/[0.1] text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                      }`}>
                        <span>{isSelected ? 'Matched ✓' : 'Select'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : currentQType === 'fill_in_blank' ? (
            /* 4. Fill in the Blank: Vocabulary Word Bank + Auto-Fill */
            <div className="space-y-3 pt-1">
              {false && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-teal-300 block">
                    Vocabulary Word Bank (Click to snap word into the blank):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = answers[currentQIndex] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => {
                            setAnswers(prev => ({ ...prev, [currentQIndex]: optIdx }));
                            setTextAnswers(prev => ({ ...prev, [currentQIndex]: opt }));
                          }}
                          className={`p-3.5 rounded-2xl border text-left text-sm transition-all flex items-center justify-between group ${
                            isSelected
                              ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-md shadow-teal-500/10 ring-1 ring-teal-400'
                              : 'bg-white/[0.02] border-white/[0.08] text-slate-300 hover:border-teal-400/30 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-mono font-bold">
                              {optIdx + 1}
                            </span>
                            <span className="font-semibold text-xs sm:text-sm">{opt}</span>
                          </div>
                          {isSelected ? (
                            <span className="px-2 py-0.5 rounded-md bg-teal-500/30 text-teal-300 font-mono text-[10px]">Inserted ✓</span>
                          ) : (
                            <span className="text-[10px] text-slate-500 group-hover:text-teal-400">Insert ↵</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Type the missing word to complete the blank:</span>
                <input
                  type="text"
                  value={textAnswers[currentQIndex] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTextAnswers(prev => ({ ...prev, [currentQIndex]: val }));
                    const matchIdx = currentQ.options?.findIndex(opt => opt.trim().toLowerCase() === val.trim().toLowerCase());
                    setAnswers(prev => ({ ...prev, [currentQIndex]: matchIdx !== -1 ? matchIdx : val }));
                  }}
                  placeholder="Type the exact missing word to complete the blank..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!isLastQuestion) setCurrentQIndex(prev => prev + 1);
                      else handleSubmitQuiz();
                    }
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 placeholder:text-slate-400 shadow-2xs"
                />
              </div>
            </div>
          ) : currentQType === 'scenario_based' ? (
            /* 5. Scenario-Based: Tactical Action Decisions */
            <div className="space-y-3 pt-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Determine the optimal tactical action or intervention protocol:
              </span>
              <div className="space-y-2.5">
                {currentQ.options?.map((opt, optIdx) => {
                  const isSelected = answers[currentQIndex] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, [currentQIndex]: optIdx }))}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex items-start justify-between gap-3 group cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-500 text-amber-950 dark:bg-amber-950/30 dark:border-amber-400 dark:text-amber-100 shadow-2xs'
                          : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.07] text-slate-800 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 dark:bg-white/[0.05] text-amber-700 dark:text-amber-400 border border-amber-300/40 dark:border-amber-400/30'
                        }`}>
                          Action {['A', 'B', 'C', 'D'][optIdx] || optIdx + 1}
                        </span>
                        <span className="text-xs sm:text-sm leading-relaxed">{opt}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 dark:border-white/20'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : currentQType === 'critical_thinking' ? (
            /* 6. Critical Thinking: Analytical Claim & Perspective Evaluations */
            <div className="space-y-3 pt-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Select the most rigorous analytical evaluation of trade-offs:
              </span>
              <div className="space-y-2.5">
                {currentQ.options?.map((opt, optIdx) => {
                  const isSelected = answers[currentQIndex] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, [currentQIndex]: optIdx }))}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex items-start justify-between gap-3 group cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50/80 border-purple-500 text-purple-950 dark:bg-purple-950/30 dark:border-purple-400 dark:text-purple-100 shadow-2xs'
                          : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.07] text-slate-800 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-100 dark:bg-white/[0.05] text-purple-700 dark:text-purple-400 border border-purple-300/40 dark:border-purple-400/30'
                        }`}>
                          Argument {['A', 'B', 'C', 'D'][optIdx] || optIdx + 1}
                        </span>
                        <span className="text-xs sm:text-sm leading-relaxed">{opt}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'border-purple-500 bg-purple-500 text-white' : 'border-slate-300 dark:border-white/20'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : currentQ?.options && currentQ.options.length > 0 ? (
            /* 7. Multiple Choice (Classic A, B, C, D) */
            <div className="space-y-2.5">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = answers[currentQIndex] === optIdx;
                const letters = ['A', 'B', 'C', 'D', 'E'];
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQIndex]: optIdx }))}
                    className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-600 text-blue-950 dark:bg-blue-950/30 dark:border-blue-400 dark:text-white shadow-2xs'
                        : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] text-slate-800 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 pr-3">
                      <span className={`w-6 h-6 rounded-md border flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400'
                      }`}>
                        {letters[optIdx] || optIdx + 1}
                      </span>
                      <span className="leading-relaxed">{opt}</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-white/[0.2]'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* 8. Fallback text input */
            <div>
              <input
                type="text"
                value={textAnswers[currentQIndex] || ''}
                onChange={(e) => setTextAnswers(prev => ({ ...prev, [currentQIndex]: e.target.value }))}
                placeholder="Type your response here..."
                className="w-full px-4 py-3 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            disabled={currentQIndex === 0}
            onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {isLastQuestion ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitQuiz}
              className="kn-btn-primary px-6 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Grading...</span>
                </>
              ) : (
                <span>Submit Assessment</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="kn-btn-primary px-5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. RESULTS & SOCRATIC FEEDBACK PHASE
  // ─────────────────────────────────────────────────────────────
  if (phase === 'results' && results) {
    const scorePct = Math.round((results.score || 0) * 100);
    const questionResults = results.results || [];

    return (
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Score Card Header */}
        <div className="w-full p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] text-center space-y-3 relative shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              Assessment Complete
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHideDetails(!hideDetails)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-xs dark:text-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                title={hideDetails ? 'Show All Details' : 'Hide Details'}
              >
                {hideDetails ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{hideDetails ? 'Show Details' : 'Hide Details'}</span>
              </button>

              <button
                onClick={handleArchive}
                disabled={isArchived}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  isArchived
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:text-slate-300'
                }`}
                title="Archive Quiz"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{isArchived ? 'Archived' : 'Archive'}</span>
              </button>
            </div>
          </div>

          <div className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {scorePct}%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {results.correctCount} of {results.totalQuestions} questions answered accurately
          </p>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setPhase('config')}
              className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Quiz</span>
            </button>
          </div>
        </div>

        {/* Detailed Question Review List */}
        {!hideDetails && (
          <div className="space-y-4 w-full">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
              Socratic Breakdown & Grounded Explanations
            </h4>

            {questionResults.map((qr, idx) => {
              const isCorrect = qr.isCorrect;
              const formatLabel = FORMAT_LABELS[qr.type] || qr.type?.replace('_', ' ');

              // Answer text resolution
              const userAnswerText = typeof qr.userAnswer === 'number' && qr.options && qr.options[qr.userAnswer]
                ? qr.options[qr.userAnswer]
                : (qr.userAnswer !== -1 && qr.userAnswer !== undefined ? String(qr.userAnswer) : 'Not answered');

              const correctAnswerText = qr.correctAnswerText || (
                typeof qr.correctAnswer === 'number' && qr.options && qr.options[qr.correctAnswer]
                  ? qr.options[qr.correctAnswer]
                  : 'N/A'
              );

              return (
                <div
                  key={idx}
                  className={`w-full p-6 sm:p-7 rounded-2xl border transition-all space-y-4 shadow-xs ${
                    isCorrect
                      ? 'bg-emerald-500/[0.03] border-emerald-500/20 dark:bg-emerald-950/10'
                      : 'bg-red-500/[0.03] border-red-500/20 dark:bg-red-950/10'
                  }`}
                >
                  {/* Status header & Format Tag */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-xs font-bold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                        Question {idx + 1}: {isCorrect ? 'Correct Answer' : 'Incorrect'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 px-2.5 py-0.5 rounded-full font-semibold">
                        {formatLabel}
                      </span>
                      {qr.validityScore && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 px-2 py-0.5 rounded-full font-mono">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{qr.validityScore}% Grounded</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {qr.question}
                  </p>

                  {/* Your Answer vs Correct Answer Summary Side-by-Side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm pt-1 w-full">
                    <div className={`p-3.5 rounded-xl border ${
                      isCorrect
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-200'
                        : 'bg-red-50 text-red-950 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-200'
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75 mb-0.5">Your Answer</span>
                      <span className="font-semibold text-sm leading-relaxed block">{userAnswerText}</span>
                    </div>
                    {!isCorrect ? (
                      <div className="p-3.5 rounded-xl border bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75 mb-0.5">Correct Answer</span>
                        <span className="font-semibold text-sm leading-relaxed block">{correctAnswerText}</span>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl border bg-emerald-50/60 text-emerald-900 border-emerald-200/60 dark:bg-emerald-500/5 dark:border-emerald-500/15 dark:text-emerald-300 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75 mb-0.5">Validation</span>
                          <span className="font-semibold text-sm leading-relaxed block text-emerald-700 dark:text-emerald-300">Answer Matched Accurately</span>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      </div>
                    )}
                  </div>

                  {/* Socratic explanation */}
                  <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-3.5 w-full">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                        Socratic Explanation
                      </span>
                      <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed font-normal">
                        {qr.explanation || qr.learningExplanation}
                      </p>
                    </div>

                    {qr.why_incorrect && (
                      <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.06]">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                          Why Other Options Are Incorrect
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                          {qr.why_incorrect}
                        </p>
                      </div>
                    )}

                    {qr.socratic_followup && (
                      <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.06]">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                          Guiding Reflection Question
                        </span>
                        <p className="text-indigo-800 dark:text-indigo-200 italic text-sm sm:text-base leading-relaxed">
                          "{qr.socratic_followup}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Source attribution */}
                  {qr.source && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>
                        Source: {qr.source.document || 'Uploaded Material'}, Page {qr.source.page || 1}
                        {qr.source.section ? ` (Section: ${qr.source.section})` : ''}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}
