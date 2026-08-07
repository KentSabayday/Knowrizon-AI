import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Video, AlertCircle, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * DocumentViewer — Full-screen modal for viewing uploaded documents and videos.
 *
 * Renders PDFs via <iframe>, videos via <video>, with a blurred dark backdrop.
 * Handles missing files gracefully (Vercel ephemeral /tmp storage).
 *
 * Props:
 *   contentId  — ID of the content record
 *   filename   — Original filename for display
 *   fileType   — 'pdf' | 'video'
 *   onClose    — Callback to close the modal
 */
export function DocumentViewer({ contentId, filename, fileType, onClose }) {
  const { token } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fileUrl = `${API_BASE}/content/${contentId}/file`;

  // Escape key closes the modal
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // Pre-check if the file is accessible
  useEffect(() => {
    const checkFile = async () => {
      try {
        const res = await fetch(fileUrl, {
          method: 'HEAD',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          const isJson = res.headers.get('content-type')?.includes('json');
          if (isJson) {
            const data = await res.json();
            setError(data.error || 'File not available');
          } else {
            setError('File is no longer available for viewing.');
          }
        }
      } catch {
        setError('Unable to reach the server.');
      } finally {
        setLoading(false);
      }
    };
    checkFile();
  }, [fileUrl, token]);

  const isVideo = fileType === 'video';
  const isPdf = fileType === 'pdf';

  // Build the authenticated URL by appending the token as a query param
  // so the iframe/video src can authenticate without custom headers.
  // The backend @require_auth supports both header and query param auth.
  const authenticatedUrl = token ? `${fileUrl}?token=${encodeURIComponent(token)}` : fileUrl;

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
        aria-label={`Viewing ${filename}`}
      >
        {/* Blurred backdrop */}
        <div
          className="absolute inset-0 bg-black/75 backdrop-blur-xl"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative z-10 flex flex-col h-full"
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#111827]/80 backdrop-blur-md border-b border-white/[0.06]">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isVideo ? 'bg-[#5B5FFF]/15' : 'bg-[#22C7FF]/15'
              }`}>
                {isVideo ? (
                  <Video className="w-4.5 h-4.5 text-[#5B5FFF]" />
                ) : (
                  <FileText className="w-4.5 h-4.5 text-[#22C7FF]" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate max-w-[50vw]">{filename}</p>
                <p className="text-[10px] text-[#64748B] uppercase tracking-wide">
                  {isVideo ? 'Video Player' : 'Document Viewer'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition-all"
              aria-label="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-4">
            {loading ? (
              /* Loading state */
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#22C7FF]/30 border-t-[#22C7FF] rounded-full animate-spin" />
                <p className="text-sm text-[#94A3B8]">Loading document…</p>
              </div>
            ) : error ? (
              /* Error state */
              <div className="flex flex-col items-center gap-4 max-w-sm text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">File Unavailable</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    {error}
                  </p>
                  <p className="text-xs text-[#475569] mt-2">
                    Files stored on temporary servers may not persist between sessions.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white font-medium hover:bg-white/[0.1] transition-all"
                >
                  Close
                </button>
              </div>
            ) : isPdf ? (
              /* PDF Viewer */
              <iframe
                src={authenticatedUrl}
                title={`PDF: ${filename}`}
                className="w-full h-full rounded-xl border border-white/[0.06] bg-white"
                style={{ minHeight: '80vh' }}
              />
            ) : isVideo ? (
              /* Video Player */
              <div className="w-full max-w-5xl">
                <video
                  src={authenticatedUrl}
                  controls
                  className="w-full rounded-xl border border-white/[0.06] bg-black max-h-[80vh]"
                  style={{ outline: 'none' }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              /* Unsupported type fallback */
              <div className="flex flex-col items-center gap-4 text-center">
                <FileText className="w-12 h-12 text-[#64748B]" />
                <p className="text-sm text-[#94A3B8]">
                  Preview is not available for this file type.
                </p>
                <a
                  href={authenticatedUrl}
                  download={filename}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] text-sm font-medium text-white hover:shadow-lg hover:shadow-[#22C7FF]/20 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DocumentViewer;
