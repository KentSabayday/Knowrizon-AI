import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Upload, FileText, CheckCircle2, ArrowRight,
  Loader2, BookOpen, AlertCircle, X, Clock
} from 'lucide-react';
import { KnowrizonMascot, MASCOT_STATES } from '../ui/KnowrizonMascot';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

const SUGGESTED_TOPICS = [
  'Integrative Programming',
  'Calculus & Rates of Change',
  'Pharmacology & Renal Physiology',
  'Data Structures & Algorithms',
  'Organic Chemistry',
  'Anatomy & Physiology',
  'Software Architecture'
];

const FILE_PILLS = ['PDF', 'DOCX', 'PPTX', 'Images', 'Video'];

export function WorkspaceOnboarding({ onStartSession, onSelectExistingSession, isLoading = false }) {
  const { token } = useAuth();
  const [topic, setTopic] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch recent conversations for quick continuation
  const [suggestedClassrooms, setSuggestedClassrooms] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/academic/student/classrooms`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : { classrooms: [] })
      .then(data => {
        if (data.classrooms && data.classrooms.length > 0) {
          setSuggestedClassrooms(data.classrooms.map(c => `${c.subject_code} - ${c.subject_name}`));
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/chat/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : { conversations: [] }))
      .then((data) => {
        setRecentSessions((data.conversations || []).slice(0, 4));
      })
      .catch(() => {});
  }, [token]);

  // Helper to format clean topic from filename
  const inferTopicFromFiles = (filesList) => {
    if (!filesList || !filesList.length) return;
    if (!topic.trim()) {
      const rawName = filesList[0].name.replace(/\.[^/.]+$/, '');
      const cleanName = rawName.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
      const lower = cleanName.toLowerCase();
      if (lower.startsWith('gemini generated') || lower.startsWith('screenshot') || lower.startsWith('img ') || lower.startsWith('pxl ')) {
        return;
      }
      if (cleanName) {
        setTopic(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    inferTopicFromFiles(files);

    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const fresh = files.filter((f) => !existingNames.has(f.name));
      return [...prev, ...fresh];
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    if (!droppedFiles.length) return;

    inferTopicFromFiles(droppedFiles);

    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const fresh = droppedFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...fresh];
    });
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let cleanTopic = topic.trim();
    if (!cleanTopic && selectedFiles.length > 0) {
      const rawName = selectedFiles[0].name.replace(/\.[^/.]+$/, '');
      let candidate = rawName.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
      const lower = candidate.toLowerCase();
      if (lower.startsWith('gemini generated') || lower.startsWith('screenshot') || lower.startsWith('img ') || lower.startsWith('pxl ')) {
        candidate = 'Visual Study Material';
      }
      cleanTopic = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      setTopic(cleanTopic);
    }

    if (!cleanTopic) {
      setError('Please provide a course or topic, or drop course materials to begin.');
      return;
    }
    setError(null);
    onStartSession({
      topic: cleanTopic,
      files: selectedFiles,
    });
  };

  return (
    <div className="flex-1 w-full h-full min-h-0 overflow-y-auto p-4 md:p-8 lg:p-10 flex flex-col items-center">
      <div className="w-full max-w-5xl mx-auto my-auto py-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-6 md:p-10 lg:p-12 relative"
        >
          {/* Header & Mascot */}
          <div className="text-center space-y-3 mb-8">
            <div className="flex justify-center mb-1">
              <KnowrizonMascot state={MASCOT_STATES.GREETING} size={72} />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Study Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              What are we studying today?
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Pick a course or drop in your lecture notes, slides, or PDFs to start working with Knowri.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic Input */}
            <div className="space-y-2.5">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                Course or topic
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Integrative Programming, Renal Physiology, Calculus..."
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/15 transition-all text-sm"
                  autoFocus
                />
                <BookOpen className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Quick Topic Suggestions */}
              <div className="flex flex-wrap gap-2 pt-1.5">
                {SUGGESTED_TOPICS.map((suggested) => (
                  <button
                    key={suggested}
                    type="button"
                    onClick={() => setTopic(suggested)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      topic === suggested
                        ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/50 dark:border-blue-400 dark:text-blue-300 font-medium shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {suggested}
                  </button>
                ))}
              </div>
            </div>

            {/* Course Materials Dropzone */}
            <div className="space-y-2.5">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                Course materials
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed transition-all rounded-xl p-6 sm:p-8 text-center cursor-pointer group ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-blue-500 dark:hover:border-blue-500'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.png,.jpg,.jpeg,.gif,.webp,.bmp,.mp4,.webm,.mov,.avi,.mkv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white mb-1.5">
                  Drop your lecture notes, slides, or syllabus files here
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                  {FILE_PILLS.map((pill) => (
                    <span
                      key={pill}
                      className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selected files list */}
              <AnimatePresence>
                {selectedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 pt-1"
                  >
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} ready to attach:
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {selectedFiles.map((f, i) => (
                        <div
                          key={f.name + i}
                          className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="truncate">{f.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              ({(f.size / (1024 * 1024)).toFixed(1)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(i);
                            }}
                            className="text-slate-400 hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sticky Bottom Action CTA */}
            <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pt-4 pb-2 border-t border-slate-100 dark:border-slate-800/80 -mx-6 md:-mx-10 lg:-mx-12 px-6 md:px-10 lg:px-12 mt-6 rounded-b-2xl z-10">
              <button
                type="submit"
                disabled={isLoading || (!topic.trim() && selectedFiles.length === 0)}
                className="w-full py-3.5 rounded-xl kn-btn-primary text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparing Study Studio...</span>
                  </>
                ) : (
                  <>
                    <span>Start Studying</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* ── Quick Resume Previous Sessions ── */}
          {recentSessions.length > 0 && onSelectExistingSession && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Or resume previous study session</span>
                </span>
                <span className="text-[10px] text-slate-400">Click to open</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {recentSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => onSelectExistingSession(session.id)}
                    className="p-3 text-left rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500/40 transition-all group cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {session.title || 'Study Session'}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      {session.topic && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium truncate max-w-[130px]">
                          {session.topic}
                        </span>
                      )}
                      <span className="text-slate-400">
                        {session.messageCount || 0} messages
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default WorkspaceOnboarding;
