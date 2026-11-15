import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Video, Image as ImageIcon, AlertCircle, Download, BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * DocumentViewer — Resilient modal for previewing uploaded study materials,
 * videos, images, presentations, and documents.
 */
export function DocumentViewer({
  contentId,
  filename,
  fileType,
  content,
  doc,
  onClose
}) {
  const { token } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Normalize document properties from any caller shape
  const resolvedDoc = content || doc || {};
  const resolvedId = contentId || resolvedDoc.id || resolvedDoc.contentId || resolvedDoc.content_id;
  const resolvedFilename = filename || resolvedDoc.title || resolvedDoc.filename || 'Study Material';
  const rawType = (fileType || resolvedDoc.fileType || resolvedDoc.contentType || resolvedDoc.content_type || '').toLowerCase();

  const isVideo = rawType === 'video' || /\.(mp4|webm|mov|avi|mkv)$/i.test(resolvedFilename);
  const isPdf = rawType === 'pdf' || /\.pdf$/i.test(resolvedFilename);
  const isImage = rawType === 'image' || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(resolvedFilename);
  const isPresentation = rawType === 'presentation' || /\.(pptx?)$/i.test(resolvedFilename);
  const isDocument = rawType === 'document' || /\.(docx?|txt)$/i.test(resolvedFilename);

  const fileUrl = resolvedId ? `${API_BASE}/content/${resolvedId}/file` : null;
  const authenticatedUrl = fileUrl ? (token ? `${fileUrl}?token=${encodeURIComponent(token)}` : fileUrl) : null;

  // Escape key closes the modal
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // Pre-check file availability only if a valid resolvedId exists
  useEffect(() => {
    if (!fileUrl) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const checkFile = async () => {
      try {
        const res = await fetch(fileUrl, {
          method: 'GET',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (!res.ok) {
          try {
            const data = await res.json();
            setError(data.error || 'File not accessible for streaming');
          } catch {
            setError('File stream currently unavailable.');
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Unable to reach file server.');
        }
      } finally {
        setLoading(false);
      }
    };

    checkFile();
    return () => controller.abort();
  }, [fileUrl, token]);

  if (!resolvedId) {
    return null;
  }

  const getHeaderIcon = () => {
    if (isImage) return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    if (isVideo) return <Video className="w-5 h-5 text-purple-500" />;
    if (isPresentation) return <Sparkles className="w-5 h-5 text-amber-500" />;
    return <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
  };

  const getBadgeLabel = () => {
    if (isImage) return 'Visual Study Material';
    if (isVideo) return 'Lecture Video Player';
    if (isPresentation) return 'Slide Presentation';
    if (isPdf) return 'PDF Document Viewer';
    return 'Course Material';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={`Viewing ${resolvedFilename}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative z-10 flex flex-col h-full"
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-white/95 dark:bg-[#161920]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.08] shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08]">
                {getHeaderIcon()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[50vw]">
                  {resolvedFilename}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
                  {getBadgeLabel()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {authenticatedUrl && (
                <a
                  href={authenticatedUrl}
                  download={resolvedFilename}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
                aria-label="Close viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Loading study material…</p>
              </div>
            ) : isImage && authenticatedUrl ? (
              /* Image Viewer */
              <div className="max-w-5xl max-h-[85vh] flex items-center justify-center p-2 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/[0.08] shadow-2xl overflow-hidden">
                <img
                  src={authenticatedUrl}
                  alt={resolvedFilename}
                  className="max-h-[80vh] max-w-full object-contain rounded-xl"
                  onError={() => setError('Image preview could not be rendered')}
                />
              </div>
            ) : isPdf && authenticatedUrl ? (
              /* PDF Viewer */
              <iframe
                src={authenticatedUrl}
                title={`PDF: ${resolvedFilename}`}
                className="w-full max-w-5xl h-full rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white shadow-2xl"
                style={{ minHeight: '80vh' }}
              />
            ) : isVideo && authenticatedUrl ? (
              /* Video Player */
              <div className="w-full max-w-5xl flex justify-center">
                <video
                  src={authenticatedUrl}
                  controls
                  autoPlay
                  className="w-full rounded-2xl border border-white/[0.08] bg-black max-h-[80vh] shadow-2xl"
                  style={{ outline: 'none' }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              /* Presentation / Document / Fallback Card */
              <div className="max-w-xl w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center">
                  {getHeaderIcon()}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                    {resolvedFilename}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    {resolvedDoc.summary || resolvedDoc.shortSummary || 'This material is fully indexed and ready for Socratic tutoring in your workspace.'}
                  </p>
                </div>

                {resolvedDoc.keyPoints && resolvedDoc.keyPoints.length > 0 && (
                  <div className="text-left bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl p-3.5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <p className="font-semibold text-blue-600 dark:text-blue-400 text-[11px] uppercase tracking-wide">
                      Indexed Key Points:
                    </p>
                    {resolvedDoc.keyPoints.slice(0, 4).map((kp, idx) => (
                      <p key={idx} className="flex items-start gap-1.5">
                        <span className="text-blue-500">•</span>
                        <span>{kp}</span>
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 pt-2">
                  {authenticatedUrl && (
                    <a
                      href={authenticatedUrl}
                      download={resolvedFilename}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white shadow-sm transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File</span>
                    </a>
                  )}
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-sm font-semibold text-slate-700 dark:text-white transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DocumentViewer;
