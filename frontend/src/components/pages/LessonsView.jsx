import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, BookOpen, Brain, Sparkles, Edit2, Check,
  X, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight,
  Plus, RotateCcw, HelpCircle, Loader2, Clock
} from 'lucide-react';
import { ChatInterface } from '../chat/ChatInterface';
import { DocumentPanel } from '../workspace/DocumentPanel';
import { ContextPanel } from '../workspace/ContextPanel';
import { WorkspaceOnboarding } from '../workspace/WorkspaceOnboarding';
import { QuizWorkspace } from '../workspace/QuizWorkspace';
import { DocumentViewer } from '../content/DocumentViewer';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

export function LessonsView({ conversationId: initialConversationId = null, onConversationChange = null, onNavigate = null }) {
  const { token } = useAuth();
  const [currentConversationId, setCurrentConversationId] = useState(initialConversationId);
  const [conversation, setConversation] = useState(null);
  const [conversationTitle, setConversationTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitleInput, setNewTitleInput] = useState('');

  // 3-Panel Toggle states
  const [showLeftDocs, setShowLeftDocs] = useState(true);
  const [showRightAnalytics, setShowRightAnalytics] = useState(true);

  // Active central mode: 'chat' | 'quiz'
  const [activeCenterTab, setActiveCenterTab] = useState('chat');

  // Documents & Selection
  const [documents, setDocuments] = useState([]);
  const [academicGroups, setAcademicGroups] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);

  // Onboarding vs Workspace state
  const [showOnboarding, setShowOnboarding] = useState(!initialConversationId);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(false);
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);

  // Sync conversation ID prop changes
  useEffect(() => {
    if (initialConversationId !== currentConversationId) {
      setCurrentConversationId(initialConversationId);
      if (initialConversationId) {
        setShowOnboarding(false);
        loadConversation(initialConversationId);
      } else {
        setShowOnboarding(true);
      }
    }
  }, [initialConversationId]);

  // Load all user documents & academic curriculum materials
  const fetchDocuments = useCallback(async () => {
    if (!token) return [];
    try {
      const [contentRes, academicRes] = await Promise.all([
        fetch(`${API_BASE}/content/summaries`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/academic/student/materials`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null)
      ]);

      let userDocs = [];
      if (contentRes.ok) {
        const data = await contentRes.json();
        userDocs = (data.summaries || []).map(doc => {
          const rawTitle = (doc.title || doc.filename || '').trim();
          const cleanTitle = (rawTitle.toLowerCase().includes('unavailable') || rawTitle.toLowerCase().includes('processing failed'))
            ? doc.filename
            : rawTitle;
          const rawSummary = (doc.summary || '').trim();
          const cleanSummary = (rawSummary.toLowerCase().includes('unavailable') || rawSummary.toLowerCase().includes('failed'))
            ? `Study material for ${cleanTitle}. Indexed for Socratic tutoring.`
            : rawSummary;
          return {
            ...doc,
            id: doc.id || doc.contentId || doc.content_id,
            title: cleanTitle,
            summary: cleanSummary,
            shortSummary: doc.shortSummary || cleanSummary.slice(0, 160),
            fileType: doc.fileType || doc.contentType || 'document',
            isAcademic: false
          };
        });
      }

      let academicDocs = [];
      let groupsList = [];
      if (academicRes && academicRes.ok) {
        const academicData = await academicRes.json();
        groupsList = academicData.subjectMaterials || [];
        groupsList.forEach(group => {
          (group.materials || []).forEach(m => {
            const rawContent = m.content_text || '';
            const preview = rawContent ? rawContent.slice(0, 200) + '...' : 'Course curriculum material uploaded by instructor.';
            academicDocs.push({
              id: m.id,
              title: m.title,
              filename: m.title,
              summary: rawContent ? rawContent.slice(0, 400) : preview,
              shortSummary: preview,
              extractedText: rawContent,
              fileType: m.file_type || 'document',
              contentType: m.file_type || 'document',
              subjectId: group.subject_id,
              subjectName: group.subject_name,
              subjectCode: group.subject_code,
              instructorName: group.instructor_name,
              isAcademic: true,
              difficultyLevel: 'Curriculum',
              estimatedStudyTime: '30 mins'
            });
          });
        });
      }

      setAcademicGroups(groupsList);
      const combined = [...academicDocs, ...userDocs.filter(ud => !academicDocs.some(ad => ad.id === ud.id))];
      setDocuments(combined);
      return combined;
    } catch (e) {
      console.error('Failed to fetch documents and academic materials:', e);
    }
    return [];
  }, [token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Load specific conversation data
  const loadConversation = async (convId) => {
    if (!token || !convId) return;
    try {
      const res = await fetch(`${API_BASE}/chat/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversation(data);
        setConversationTitle(data.title || 'Study Session');
        setNewTitleInput(data.title || 'Study Session');
        
        // Restore linked documents for this conversation
        if (data.contentIds && data.contentIds.length > 0) {
          setSelectedDocIds(data.contentIds);
        }
      }
    } catch (e) {
      console.error('Failed to load conversation:', e);
    }
  };

  // Start new learning session from onboarding
  const handleStartSession = async ({ topic, files }) => {
    if (!token) return;
    setIsOnboardingLoading(true);

    try {
      // 1. Create conversation with topic
      const convRes = await fetch(`${API_BASE}/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          topic,
          title: `${topic} Workspace`,
          studyMode: 'socratic'
        })
      });

      if (!convRes.ok) throw new Error('Failed to create conversation');
      const newConv = await convRes.json();
      const convId = newConv.id;

      // 2. Upload any selected files and link them
      const uploadedIds = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const uploadRes = await fetch(`${API_BASE}/content/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (uploadRes.ok) {
            const upData = await uploadRes.json();
            const cid = upData.contentId || upData.id || upData.content_id;
            if (cid) uploadedIds.push(cid);
          } else {
            const errData = await uploadRes.json().catch(() => ({}));
            console.error('File upload error:', errData);
          }
        } catch (upErr) {
          console.warn('File upload warning:', upErr);
        }
      }

      // 3. Link uploaded documents to conversation
      if (uploadedIds.length > 0) {
        await fetch(`${API_BASE}/chat/conversations/${convId}/link-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ contentIds: uploadedIds })
        });
        setSelectedDocIds(uploadedIds);
      }

      // 4. Refresh documents list and synchronize
      const freshDocs = await fetchDocuments();
      if (freshDocs && freshDocs.length > 0) {
        setDocuments(freshDocs);
      }

      // 5. Reload conversation to ensure all metadata is synced
      await loadConversation(convId);

      // Transition to active workspace
      setCurrentConversationId(convId);
      setConversation(newConv);
      setConversationTitle(newConv.title);
      setShowOnboarding(false);
      if (onConversationChange) onConversationChange(convId);

    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setIsOnboardingLoading(false);
    }
  };

  // Upload single file inside workspace
  const handleUploadInWorkspace = async (file) => {
    if (!token) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/content/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const cid = data.contentId || data.id || data.content_id;
        if (cid) {
          // Auto select new file
          setSelectedDocIds(prev => [...prev, cid]);
          // Link to active conversation so it persists
          if (currentConversationId) {
            await fetch(`${API_BASE}/chat/conversations/${currentConversationId}/link-content`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ contentId: cid })
            });
          }
        }
        await fetchDocuments();
      }
    } catch (e) {
      console.error('Failed to upload file in workspace:', e);
    } finally {
      setIsUploading(false);
    }
  };

  // Rename conversation title
  const handleSaveTitle = async () => {
    if (!newTitleInput.trim() || !currentConversationId || !token) return;
    try {
      const res = await fetch(`${API_BASE}/chat/conversations/${currentConversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitleInput.trim() })
      });
      if (res.ok) {
        setConversationTitle(newTitleInput.trim());
        setIsEditingTitle(false);
      }
    } catch (e) {
      console.error('Failed to rename conversation:', e);
    }
  };

  // Multi-file selection handlers
  const handleToggleDoc = (docId) => {
    setSelectedDocIds(prev => {
      const exists = prev.includes(docId);
      const next = exists ? prev.filter(id => id !== docId) : [...prev, docId];
      // Sync to conversation
      if (currentConversationId && token) {
        fetch(`${API_BASE}/chat/conversations/${currentConversationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ contentIds: next })
        }).catch(() => {});
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = documents.map(d => d.id);
    setSelectedDocIds(allIds);
    if (currentConversationId && token) {
      fetch(`${API_BASE}/chat/conversations/${currentConversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contentIds: allIds })
      }).catch(() => {});
    }
  };

  const handleClearAll = () => {
    setSelectedDocIds([]);
    if (currentConversationId && token) {
      fetch(`${API_BASE}/chat/conversations/${currentConversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contentIds: [] })
      }).catch(() => {});
    }
  };

  // Build unified content context strings for AI Chat
  const contentContextStrings = useMemo(() => {
    if (selectedDocIds.length === 0) return [];
    return documents
      .filter(d => selectedDocIds.includes(d.id))
      .map(d => {
        if (d.isAcademic) {
          const parts = [
            `=== Course Material: ${d.title} [Subject: ${d.subjectName || 'Course'} (${d.subjectCode || ''})] ===`,
            `Instructor: ${d.instructorName || 'Course Faculty'}`
          ];
          if (d.shortSummary) parts.push(`Summary: ${d.shortSummary}`);
          if (d.extractedText) {
            parts.push(`Curriculum Content:\n${d.extractedText.slice(0, 15000)}`);
          }
          return parts.join('\n\n');
        }

        const parts = [`=== Document: ${d.title || d.filename} (${d.fileType || 'material'}) ===`];
        if (d.shortSummary) parts.push(`Summary: ${d.shortSummary}`);
        else if (d.summary) parts.push(`Summary: ${d.summary}`);
        if (d.keyPoints && Array.isArray(d.keyPoints) && d.keyPoints.length > 0) {
          parts.push("Key Points:\n" + d.keyPoints.slice(0, 8).map(kp => `- ${kp}`).join('\n'));
        }
        if (d.extractedText) {
          parts.push(`Extracted Content:\n${d.extractedText.slice(0, 15000)}`);
        }
        return parts.join('\n\n');
      });
  }, [documents, selectedDocIds]);

  // If showing onboarding screen
  if (showOnboarding) {
    return (
      <WorkspaceOnboarding
        onStartSession={handleStartSession}
        onSelectExistingSession={(convId) => {
          setShowOnboarding(false);
          setCurrentConversationId(convId);
          loadConversation(convId);
          if (onConversationChange) onConversationChange(convId);
        }}
        isLoading={isOnboardingLoading}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#FAF9F6] dark:bg-[#0F1115] overflow-hidden">
      {/* ── Top Workspace Bar ── */}
      <header className="h-14 bg-white/95 dark:bg-[#161920]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.08] px-4 flex items-center justify-between z-20 shrink-0">
        {/* Left: Document toggle & Topic/Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setShowLeftDocs(!showLeftDocs)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.04] transition-all"
            title={showLeftDocs ? 'Hide Documents Panel' : 'Show Documents Panel'}
          >
            {showLeftDocs ? <PanelLeftClose className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          {/* Editable Title */}
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newTitleInput}
                onChange={(e) => setNewTitleInput(e.target.value)}
                className="px-2 py-1 bg-slate-100 dark:bg-black/60 border border-blue-500 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              />
              <button onClick={handleSaveTitle} className="text-blue-600 dark:text-blue-400 p-1 hover:opacity-80">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsEditingTitle(false)} className="text-slate-400 p-1 hover:text-slate-700 dark:hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 truncate">
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[320px]">
                {conversationTitle || 'Class Studio'}
              </h1>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-slate-400 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 p-1 transition-colors shrink-0"
                title="Rename Conversation"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Topic badge */}
          {conversation?.topic && (
            <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 text-[11px] font-medium truncate max-w-[160px]">
              {conversation.topic}
            </span>
          )}
        </div>

        {/* Center: Socratic Tutor vs Quiz Mode Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] p-1 rounded-xl">
          <button
            onClick={() => setActiveCenterTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeCenterTab === 'chat'
                ? 'bg-white text-blue-700 shadow-xs dark:bg-blue-950/40 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Tutor</span>
          </button>
          <button
            onClick={() => setActiveCenterTab('quiz')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeCenterTab === 'quiz'
                ? 'bg-white text-blue-700 shadow-xs dark:bg-blue-950/40 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Practice Quizzes</span>
          </button>
        </div>

        {/* Right: History, New Session & Analytics toggle */}
        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('/history')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-xs text-slate-600 hover:text-slate-900 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-slate-300 dark:hover:text-white transition-all"
              title="View Chat History"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>History</span>
            </button>
          )}

          <button
            onClick={() => setShowOnboarding(true)}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-xs text-slate-600 hover:text-slate-900 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-slate-300 dark:hover:text-white transition-all"
            title="Start New Topic Workspace"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>

          <button
            onClick={() => setShowRightAnalytics(!showRightAnalytics)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.04] transition-all"
            title={showRightAnalytics ? 'Hide Analytics Panel' : 'Show Analytics Panel'}
          >
            {showRightAnalytics ? <PanelRightClose className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <PanelRight className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── 3-Panel Main Layout ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Left Panel: Knowledge Library */}
        <AnimatePresence initial={false}>
          {showLeftDocs && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-[300px] shrink-0 h-full overflow-hidden z-10"
            >
              <DocumentPanel
                documents={documents}
                academicGroups={academicGroups}
                selectedDocIds={selectedDocIds}
                onToggleDoc={handleToggleDoc}
                onSelectAll={handleSelectAll}
                onClearAll={handleClearAll}
                onUploadFile={handleUploadInWorkspace}
                isUploading={isUploading}
                onViewDocument={(doc) => setViewingDocument(doc)}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Central Area: Socratic Tutor (Chat) OR Quiz Practice */}
        <main className="flex-1 h-full min-w-0 min-h-0 overflow-hidden flex flex-col relative bg-[#FAF9F6] dark:bg-[#0F1115]">
          {activeCenterTab === 'chat' ? (
            <ChatInterface
              conversationId={currentConversationId}
              contentContext={contentContextStrings}
              uploadedContent={documents.filter(d => selectedDocIds.includes(d.id))}
              onConversationChange={(newId) => {
                setCurrentConversationId(newId);
                loadConversation(newId);
                if (onConversationChange) onConversationChange(newId);
              }}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <QuizWorkspace
                topic={conversation?.topic || conversationTitle}
                conversationId={currentConversationId}
                selectedDocIds={selectedDocIds}
                documents={documents}
                token={token}
                onQuizCompleted={() => setAnalyticsRefreshKey(k => k + 1)}
              />
            </div>
          )}
        </main>

        {/* Right Panel: Embedded Mastery Analytics */}
        <AnimatePresence initial={false}>
          {showRightAnalytics && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-[320px] shrink-0 h-full overflow-hidden z-10"
            >
              <ContextPanel
                refreshKey={analyticsRefreshKey}
                onStartRetake={(retakeTopic) => {
                  const matchingDoc = documents.find(d =>
                    (d.title && retakeTopic && d.title.toLowerCase().includes(retakeTopic.toLowerCase())) ||
                    (d.filename && retakeTopic && d.filename.toLowerCase().includes(retakeTopic.toLowerCase())) ||
                    (d.subjectName && retakeTopic && d.subjectName.toLowerCase().includes(retakeTopic.toLowerCase()))
                  ) || documents[0];

                  if (matchingDoc) {
                    setSelectedDocIds([matchingDoc.id]);
                  }
                  setActiveCenterTab('quiz');
                }}
                onAskConcept={(concept) => {
                  setActiveCenterTab('chat');
                  setTimeout(() => {
                    const event = new CustomEvent('knowri-ask-concept', { detail: { concept } });
                    window.dispatchEvent(event);
                  }, 120);
                }}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          contentId={viewingDocument.id || viewingDocument.contentId}
          filename={viewingDocument.title || viewingDocument.filename}
          fileType={viewingDocument.fileType || viewingDocument.contentType}
          content={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}
