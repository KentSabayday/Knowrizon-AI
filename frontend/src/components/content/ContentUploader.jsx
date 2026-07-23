import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, FileText, Video, Image, FileCode, Archive, Music,
  X, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * ContentUploader — Premium glassmorphism upload zone.
 *
 * Preserves: ALL upload logic (XHR progress, validateFile, ALLOWED_TYPES,
 *            ALLOWED_EXTENSIONS, handleDrop, handleDragOver, handleFileSelect,
 *            handleUpload, handleClear, formatFileSize).
 *
 * New: Glass drop zone with animated border, format badge grid, staged upload
 *      progress, success result card, drag-over visual feedback.
 */

// Allowed file types
const ALLOWED_TYPES = {
  'video/mp4': 'video',
  'video/avi': 'video',
  'video/quicktime': 'video',
  'video/x-matroska': 'video',
  'video/webm': 'video',
  'application/pdf': 'pdf',
};

const ALLOWED_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.pdf'];

/** Format badges to show in the drop zone */
const FORMAT_BADGES = [
  { icon: FileText, label: 'PDF', color: '#EF4444' },
  { icon: Video, label: 'MP4', color: '#5B5FFF' },
  { icon: Video, label: 'MOV', color: '#5B5FFF' },
  { icon: Video, label: 'AVI', color: '#5B5FFF' },
  { icon: Video, label: 'MKV', color: '#5B5FFF' },
  { icon: Video, label: 'WebM', color: '#5B5FFF' },
];

/** Upload stages for the animated progress */
const UPLOAD_STAGES = [
  { label: 'Uploading', emoji: '📤' },
  { label: 'Scanning', emoji: '🔍' },
  { label: 'Extracting text', emoji: '📝' },
  { label: 'Building knowledge', emoji: '🧠' },
  { label: 'Almost ready', emoji: '✨' },
];

export function ContentUploader({ onUploadComplete, onError }) {
  const { token } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  /**
   * Validate file type based on extension and MIME type
   */
  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected' };

    // Check MIME type
    const mimeType = file.type;
    const isValidMime = Object.keys(ALLOWED_TYPES).includes(mimeType);

    // Check extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext =>
      fileName.endsWith(ext)
    );

    if (!isValidMime && !hasValidExtension) {
      return {
        valid: false,
        error: 'Only video and PDF files are supported',
      };
    }

    return { valid: true, error: null };
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      setSelectedFile(null);
      onError?.(validation.error);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setUploadResult(null);
  };

  /**
   * Handle file drop
   */
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      setSelectedFile(null);
      onError?.(validation.error);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setUploadResult(null);
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  /**
   * Upload the selected file
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch {
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.error || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });
      });

      xhr.open('POST', `${API_BASE}/content/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);

      const result = await uploadPromise;

      setUploadResult(result);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadComplete?.(result);
    } catch (err) {
      const errorMessage = err.message || 'Failed to upload file';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Clear the current selection
   */
  const handleClear = () => {
    setSelectedFile(null);
    setError(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /** Get file icon based on extension */
  const getFileIcon = (filename) => {
    const ext = filename?.toLowerCase().split('.').pop();
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) return Video;
    return FileText;
  };

  /** Current upload stage based on progress */
  const currentStage = Math.min(
    Math.floor((uploadProgress / 100) * UPLOAD_STAGES.length),
    UPLOAD_STAGES.length - 1
  );

  return (
    <div className="space-y-4">
      {/* ── Drop Zone ── */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
          isDragOver
            ? 'border-[#22C7FF]/50 bg-[#22C7FF]/[0.04] scale-[1.01]'
            : selectedFile
              ? 'border-[#22C7FF]/30 bg-[#22C7FF]/[0.02]'
              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03]'
        }`}
      >
        {!selectedFile ? (
          /* ── Empty drop zone ── */
          <div className="p-8 text-center">
            <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all ${
              isDragOver ? 'bg-[#22C7FF]/20 scale-110' : 'bg-white/[0.04]'
            }`}>
              <Upload className={`w-6 h-6 transition-colors ${isDragOver ? 'text-[#22C7FF]' : 'text-[#64748B]'}`} />
            </div>

            <p className="text-sm text-[#CBD5E1] font-medium mb-1">
              {isDragOver ? 'Drop your file here!' : 'Drop your learning materials here'}
            </p>
            <p className="text-xs text-[#64748B] mb-4">or</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.avi,.mov,.mkv,.webm,.pdf,video/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              aria-label="File upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white font-medium hover:bg-white/[0.1] hover:border-white/[0.12] transition-all"
            >
              Browse Files
            </button>

            {/* Format badges */}
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {FORMAT_BADGES.map((fmt) => {
                const Icon = fmt.icon;
                return (
                  <span key={fmt.label} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                    <Icon className="w-3 h-3" style={{ color: fmt.color }} />
                    <span className="text-[10px] text-[#94A3B8] font-medium">{fmt.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Selected file preview ── */
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {(() => {
                  const Icon = getFileIcon(selectedFile.name);
                  return (
                    <div className="w-10 h-10 rounded-xl bg-[#22C7FF]/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#22C7FF]" />
                    </div>
                  );
                })()}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                  <p className="text-xs text-[#64748B]">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                onClick={handleClear}
                disabled={isUploading}
                className="p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/[0.05] transition-all disabled:opacity-50"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Upload Progress ── */}
      {isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5"
        >
          {/* Stage indicators */}
          <div className="flex items-center gap-3 mb-4">
            {UPLOAD_STAGES.map((st, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className={`text-sm transition-all ${i <= currentStage ? '' : 'opacity-30 grayscale'}`}>
                  {st.emoji}
                </span>
                {i < UPLOAD_STAGES.length - 1 && (
                  <div className={`w-6 h-px ${i < currentStage ? 'bg-[#22C7FF]' : 'bg-white/[0.08]'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between text-xs mb-2">
            <span className="text-[#94A3B8] font-medium">
              {UPLOAD_STAGES[currentStage].emoji} {UPLOAD_STAGES[currentStage].label}...
            </span>
            <span className="text-[#22C7FF] font-semibold">{uploadProgress}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}

      {/* ── Error ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/[0.06] border border-red-500/[0.12]"
        >
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-400">{error}</span>
        </motion.div>
      )}

      {/* ── Success Result ── */}
      {uploadResult && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111827]/60 backdrop-blur-sm border border-[#22C55E]/[0.15] rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-[#22C55E]">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Knowledge added successfully!</span>
          </div>

          {/* Summary */}
          {uploadResult.summary && (
            <div>
              <h4 className="text-xs font-semibold text-white mb-1">AI Summary</h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {Array.isArray(uploadResult.summary)
                  ? uploadResult.summary.join(' ')
                  : uploadResult.summary}
              </p>
            </div>
          )}

          {/* Key Points */}
          {uploadResult.keyPoints && uploadResult.keyPoints.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white mb-1">Key Concepts</h4>
              <ul className="space-y-1">
                {uploadResult.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-1.5 text-xs text-[#94A3B8]">
                    <span className="text-[#22C7FF] mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleClear}
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition-all"
          >
            Upload Another File
          </button>
        </motion.div>
      )}

      {/* ── Upload Button ── */}
      {selectedFile && !isUploading && !uploadResult && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white kn-gradient-btn flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          Upload &amp; Build Knowledge
        </motion.button>
      )}
    </div>
  );
}

export default ContentUploader;
