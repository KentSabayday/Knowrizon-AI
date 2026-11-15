import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, CheckSquare, Square, ChevronDown, ChevronUp,
  Upload, Search, Loader2, BookOpen, Clock, Eye, Video,
  Image as ImageIcon, Plus, Sparkles, Building2, GraduationCap,
  Layers, Check
} from 'lucide-react';

export function DocumentPanel({
  documents = [],
  academicGroups = [],
  selectedDocIds = [],
  onToggleDoc,
  onSelectAll,
  onClearAll,
  onUploadFile,
  isUploading = false,
  onViewDocument
}) {
  const [search, setSearch] = useState('');
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [viewMode, setViewMode] = useState('subjects'); // 'subjects' | 'all'
  const [collapsedSubjectIds, setCollapsedSubjectIds] = useState([]);
  const fileInputRef = useRef(null);

  // Filter documents based on search query
  const filteredDocs = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.toLowerCase();
    return documents.filter(d =>
      (d.filename && d.filename.toLowerCase().includes(q)) ||
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.shortSummary && d.shortSummary.toLowerCase().includes(q)) ||
      (d.subjectName && d.subjectName.toLowerCase().includes(q)) ||
      (d.subjectCode && d.subjectCode.toLowerCase().includes(q)) ||
      (d.instructorName && d.instructorName.toLowerCase().includes(q))
    );
  }, [documents, search]);

  // Group filtered documents by Class Subject
  const groupedBySubject = useMemo(() => {
    const map = new Map();

    filteredDocs.forEach(doc => {
      if (doc.isAcademic && doc.subjectId) {
        const key = doc.subjectId;
        if (!map.has(key)) {
          map.set(key, {
            subjectId: doc.subjectId,
            subjectName: doc.subjectName || 'Course Subject',
            subjectCode: doc.subjectCode || '',
            instructorName: doc.instructorName || null,
            materials: []
          });
        }
        map.get(key).materials.push(doc);
      }
    });

    const subjectsList = Array.from(map.values());
    const personalMaterials = filteredDocs.filter(d => !d.isAcademic);

    return { subjectsList, personalMaterials };
  }, [filteredDocs]);

  const allSelected = documents.length > 0 && selectedDocIds.length === documents.length;

  const toggleSubjectCollapse = (subjId) => {
    setCollapsedSubjectIds(prev =>
      prev.includes(subjId) ? prev.filter(id => id !== subjId) : [...prev, subjId]
    );
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length && onUploadFile) {
      files.forEach(f => onUploadFile(f));
    }
  };

  const getFileIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'video') return <Video className="w-4 h-4 text-purple-500 shrink-0" />;
    if (t === 'image') return <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />;
    if (t === 'presentation' || t === 'pptx' || t === 'ppt') return <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />;
    return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
  };

  const getCleanDocTitle = (doc) => {
    const raw = doc.title || doc.filename || 'Study Material';
    const lower = raw.toLowerCase();
    if (lower.includes('vision analysis unavailable') || lower.includes('unavailable') || lower.includes('processing failed')) {
      if (doc.filename && !doc.filename.toLowerCase().includes('vision analysis unavailable')) {
        return doc.filename.replace(/[_-]/g, ' ').replace(/\.[^/.]+$/, '');
      }
      return 'Visual Study Material';
    }
    return raw;
  };

  const getCleanDocSummary = (doc) => {
    const raw = doc.shortSummary || doc.summary || '';
    const lower = raw.toLowerCase();
    if (!raw || lower.includes('vision analysis unavailable') || lower.includes('unavailable') || lower.includes('processing failed')) {
      return 'Content processed and indexed for Socratic tutoring and quiz generation.';
    }
    return raw;
  };

  const renderDocumentCard = (doc) => {
    const isSelected = selectedDocIds.includes(doc.id);
    const isExpanded = expandedDocId === doc.id;
    const isProcessing = doc.processingStatus === 'pending';

    return (
      <div
        key={doc.id}
        className={`rounded-xl border transition-all ${
          isSelected
            ? 'bg-blue-50/70 border-blue-400 dark:bg-blue-950/40 dark:border-blue-700/70 shadow-2xs'
            : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12]'
        }`}
      >
        {/* Main Row */}
        <div className="p-3 flex items-start gap-2.5">
          <button
            onClick={() => onToggleDoc(doc.id)}
            className="mt-0.5 text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 transition-colors shrink-0 cursor-pointer"
            aria-label={isSelected ? 'Unselect document' : 'Select document'}
            title={isSelected ? 'Remove from Knowri AI Context' : 'Load into Knowri AI Context'}
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>

          <div
            onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              {getFileIcon(doc.contentType || doc.fileType)}
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {getCleanDocTitle(doc)}
              </h3>
            </div>

            {/* Status or Short summary */}
            {isProcessing ? (
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                <span>Analyzing & extracting concepts...</span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-snug">
                {getCleanDocSummary(doc)}
              </p>
            )}

            {/* Metadata tags & Knowri Grounding Button */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
              {doc.isAcademic && (
                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-medium">
                  {doc.subjectCode || 'Curriculum'}
                </span>
              )}
              {doc.difficultyLevel && (
                <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400">
                  {doc.difficultyLevel}
                </span>
              )}

              {/* Grounded in Knowri AI status tag */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDoc(doc.id);
                }}
                className={`ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-blue-950/50'
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-2.5 h-2.5" />
                    <span>In AI Context</span>
                  </>
                ) : (
                  <span>Load into Knowri</span>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <button
              onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand Details'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {onViewDocument && (
              <button
                onClick={() => onViewDocument(doc)}
                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 transition-colors"
                title="View Full Document"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded Intelligence Card */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-white/[0.04] text-[11px] space-y-2 text-slate-600 dark:text-slate-300"
            >
              {getCleanDocSummary(doc) && (
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                    Executive summary
                  </span>
                  <p className="leading-relaxed bg-slate-50 dark:bg-white/[0.02] p-2 rounded-lg text-slate-700 dark:text-slate-300">
                    {getCleanDocSummary(doc)}
                  </p>
                </div>
              )}

              {doc.isAcademic && doc.instructorName && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <GraduationCap className="w-3 h-3 text-purple-600" />
                  <span>Assigned by: <strong className="text-slate-700 dark:text-slate-200">{doc.instructorName}</strong></span>
                </div>
              )}

              {doc.learningObjectives && doc.learningObjectives.length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                    Learning objectives
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                    {doc.learningObjectives.slice(0, 3).map((obj, i) => (
                      <li key={i} className="truncate">{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {doc.keyPoints && doc.keyPoints.length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                    Key concepts
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {doc.keyPoints.slice(0, 5).map((kp, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px]">
                        {kp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#161920] border-r border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">Knowledge Library</h2>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 font-mono">
            {selectedDocIds.length}/{documents.length} Grounded
          </span>
        </div>

        {/* View mode toggle: By Class Subject vs All Files */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-white/[0.04] rounded-lg border border-slate-200 dark:border-white/[0.06] text-xs">
          <button
            onClick={() => setViewMode('subjects')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
              viewMode === 'subjects'
                ? 'bg-white dark:bg-[#1C2029] text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>Class Subjects</span>
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
              viewMode === 'all'
                ? 'bg-white dark:bg-[#1C2029] text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>All Materials</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents or concepts..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        {/* Multi-file batch controls */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <button
            onClick={allSelected ? onClearAll : onSelectAll}
            className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
          >
            {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <Square className="w-3.5 h-3.5" />}
            <span>{allSelected ? 'Unselect all' : 'Select all'}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40 text-[11px] font-medium transition-all cursor-pointer"
          >
            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            <span>Add file</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.png,.jpg,.jpeg,.gif,.webp,.bmp,.mp4,.webm,.mov,.avi,.mkv"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </div>

      {/* Document Content List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {documents.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center">
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">No study materials uploaded yet.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="kn-btn-primary px-3 py-1.5 text-xs font-semibold cursor-pointer"
            >
              Upload Materials
            </button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No documents match &ldquo;{search}&rdquo;
          </div>
        ) : viewMode === 'subjects' ? (
          <div className="space-y-4">
            {/* Class Subject Groups */}
            {groupedBySubject.subjectsList.map((group) => {
              const isCollapsed = collapsedSubjectIds.includes(group.subjectId);
              const activeCount = group.materials.filter(m => selectedDocIds.includes(m.id)).length;

              return (
                <div
                  key={group.subjectId}
                  className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01] overflow-hidden"
                >
                  {/* Group Header */}
                  <div
                    onClick={() => toggleSubjectCollapse(group.subjectId)}
                    className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          {group.subjectCode && (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                              {group.subjectCode}
                            </span>
                          )}
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {group.subjectName}
                          </h4>
                        </div>
                        {group.instructorName && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            {group.instructorName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {activeCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-medium">
                          {activeCount} grounded
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {group.materials.length} {group.materials.length === 1 ? 'file' : 'files'}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Group Materials */}
                  {!isCollapsed && (
                    <div className="p-2 space-y-2 border-t border-slate-200/60 dark:border-white/[0.04]">
                      {group.materials.map(renderDocumentCard)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Personal / Uploaded Files Section */}
            {groupedBySubject.personalMaterials.length > 0 && (
              <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01] overflow-hidden">
                <div
                  onClick={() => toggleSubjectCollapse('personal_uploads')}
                  className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Personal Study Materials
                      </h4>
                      <span className="text-[10px] text-slate-400">Uploaded notes & documents</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-slate-400">
                      {groupedBySubject.personalMaterials.length} files
                    </span>
                    {collapsedSubjectIds.includes('personal_uploads') ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </div>

                {!collapsedSubjectIds.includes('personal_uploads') && (
                  <div className="p-2 space-y-2 border-t border-slate-200/60 dark:border-white/[0.04]">
                    {groupedBySubject.personalMaterials.map(renderDocumentCard)}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* All Materials Flat List */
          <div className="space-y-2">
            {filteredDocs.map(renderDocumentCard)}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 dark:border-white/[0.08] text-[11px] text-slate-500 text-center bg-slate-50 dark:bg-white/[0.02]">
        Prioritizes selected materials before external sources.
      </div>
    </div>
  );
}

export default DocumentPanel;
