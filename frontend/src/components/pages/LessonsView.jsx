import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, BookOpen, FileText, Video, Search,
  Sparkles, CheckCircle2, Loader2, AlertCircle, RotateCcw, X,
} from 'lucide-react';
import { ChatInterface } from '../chat/ChatInterface';
import { ContentUploader } from '../content/ContentUploader';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * LessonsView — AI Learning Workspace with two modes:
 *   🧠 AI Workspace (Chat) | 📚 Knowledge Library (Upload + Documents)
 *
 * Preserves: ALL state management, conversation handling, content fetching,
 *            reprocess logic, conversation ID sync, tab auto-switch.
 */
export function LessonsView({ conversationId: initialConversationId = null, onConversationChange = null }) {
  const { token } = useAuth();
  const [uploadedContent, setUploadedContent] = useState([]);
  const [contentContext, setContentContext] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [reprocessingId, setReprocessingId] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(initialConversationId);
  const [searchQuery, setSearchQuery] = useState('');

  // Update conversation ID when prop changes (e.g., from History navigation)
  useEffect(() => {
    if (initialConversationId !== currentConversationId) {
      setCurrentConversationId(initialConversationId);
      // Switch to chat tab when loading a conversation
      if (initialConversationId) {
        setActiveTab('chat');
      }
    }
  }, [initialConversationId]);

  // Handle conversation changes from ChatInterface
  const handleConversationChange = (newConversationId) => {
    setCurrentConversationId(newConversationId);
    if (onConversationChange) {
      onConversationChange(newConversationId);
    }
  };

  // Fetch content context from backend on mount and after uploads
  const fetchContentContext = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/content/context`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const contextStrings = data.contents.map(content => {
          const parts = [];
          parts.push(`=== Document: ${content.title || content.filename} ===`);
          if (content.summary) {
            parts.push(`Summary: ${content.summary}`);
          }
          if (content.keyPoints && content.keyPoints.length > 0) {
            parts.push(`Key Points:\n${content.keyPoints.map(p => `- ${p}`).join('\n')}`);
          }
          if (content.extractedText) {
            const maxTextLength = 10000;
            const text = content.extractedText.length > maxTextLength
              ? content.extractedText.substring(0, maxTextLength) + '...[truncated]'
              : content.extractedText;
            parts.push(`Full Content:\n${text}`);
          }
          return parts.join('\n\n');
        });
        setContentContext(contextStrings);
        setUploadedContent(data.contents);
      }
    } catch (error) {
      console.error('Failed to fetch content context:', error);
    }
  };

  const reprocessContent = async (contentId) => {
    if (!token) return;

    setReprocessingId(contentId);
    try {
      const response = await fetch(`${API_BASE}/content/${contentId}/reprocess`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchContentContext();
      } else {
        const data = await response.json();
        console.error('Reprocess failed:', data.error);
      }
    } catch (error) {
      console.error('Failed to reprocess content:', error);
    } finally {
      setReprocessingId(null);
    }
  };

  useEffect(() => {
    fetchContentContext();
  }, [token]);

  const handleUploadComplete = () => {
    fetchContentContext();
    setActiveTab('chat');
  };

  const handleUploadError = (error) => {
    console.error('Upload error:', error);
  };

  /* ── Computed ── */
  const docCount = uploadedContent.filter(c => c.fileType !== 'video').length;
  const videoCount = uploadedContent.filter(c => c.fileType === 'video').length;
  const readyCount = uploadedContent.filter(c => c.extractedText).length;

  const filteredContent = searchQuery
    ? uploadedContent.filter(c =>
        (c.title || c.filename || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : uploadedContent;

  const tabs = [
    { id: 'chat', label: 'AI Workspace', emoji: '🧠' },
    { id: 'upload', label: 'Knowledge Library', emoji: '📚', badge: uploadedContent.length },
  ];

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Glass tab switcher */}
      <div className="flex-shrink-0 px-5 pt-3 pb-0">
        <div className="inline-flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id ? 'text-white' : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="lessonTab"
                  className="absolute inset-0 bg-white/[0.06] border border-white/[0.08] rounded-xl"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[#22C7FF]/15 text-[#22C7FF] font-semibold">
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'chat' ? (
          <ChatInterface
            contentContext={contentContext}
            conversationId={currentConversationId}
            onConversationChange={handleConversationChange}
            uploadedContent={uploadedContent}
          />
        ) : (
          <div className="h-full overflow-auto p-5 space-y-5">
            {/* ── Knowledge Library Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#22C7FF]" />
                  Knowledge Library
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">Everything your AI understands</p>
              </div>

              {/* Stats badges */}
              {uploadedContent.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <FileText className="w-3.5 h-3.5 text-[#22C7FF]" />
                    <span className="text-xs text-[#94A3B8]"><span className="font-semibold text-white">{docCount}</span> Documents</span>
                  </div>
                  {videoCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <Video className="w-3.5 h-3.5 text-[#5B5FFF]" />
                      <span className="text-xs text-[#94A3B8]"><span className="font-semibold text-white">{videoCount}</span> Videos</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C55E]/[0.06] border border-[#22C55E]/[0.1]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span className="text-xs text-[#94A3B8]"><span className="font-semibold text-[#22C55E]">{readyCount}</span> AI Ready</span>
                  </div>
                </div>
              )}
            </div>

            {/* Search bar */}
            {uploadedContent.length > 0 && (
              <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                <input
                  type="text"
                  placeholder="Search knowledge..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#22C7FF]/30 focus:ring-1 focus:ring-[#22C7FF]/15 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Upload zone */}
            <ContentUploader
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
            />

            {/* ── Knowledge Cards ── */}
            {filteredContent.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#22C7FF]" />
                  Your Knowledge ({filteredContent.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredContent.map((content, index) => {
                    const isVideo = content.fileType === 'video';
                    const isReady = !!content.extractedText;
                    const isProcessing = reprocessingId === content.id;

                    return (
                      <motion.div
                        key={content.id || index}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="dash-card bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4 group"
                      >
                        <div className="flex items-start gap-3">
                          {/* File icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isVideo ? 'bg-[#5B5FFF]/10' : 'bg-[#22C7FF]/10'
                          }`}>
                            {isVideo ? (
                              <Video className="w-5 h-5 text-[#5B5FFF]" />
                            ) : (
                              <FileText className="w-5 h-5 text-[#22C7FF]" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {content.title || content.filename || `Document ${index + 1}`}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {isReady ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] font-medium">
                                  <CheckCircle2 className="w-3 h-3" /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                                  <AlertCircle className="w-3 h-3" /> No text
                                </span>
                              )}
                              {content.keyPoints?.length > 0 && (
                                <span className="text-[10px] text-[#64748B]">
                                  {content.keyPoints.length} key points
                                </span>
                              )}
                              {isReady && (
                                <span className="text-[10px] text-[#22C7FF]">Chat-ready</span>
                              )}
                            </div>

                            {/* Summary preview */}
                            {content.summary && (
                              <p className="text-[11px] text-[#64748B] mt-2 line-clamp-2 leading-relaxed">
                                {Array.isArray(content.summary) ? content.summary.join(' ') : content.summary}
                              </p>
                            )}
                          </div>

                          {/* Reprocess button */}
                          {!isReady && (
                            <button
                              onClick={() => reprocessContent(content.id)}
                              disabled={isProcessing}
                              className="p-2 rounded-lg text-[#64748B] hover:text-[#22C7FF] hover:bg-[#22C7FF]/[0.06] transition-all disabled:opacity-50 flex-shrink-0"
                              title="Extract text"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Key points preview */}
                        {content.keyPoints?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/[0.04]">
                            <ul className="space-y-1">
                              {content.keyPoints.slice(0, 3).map((point, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#94A3B8]">
                                  <span className="text-[#22C7FF] mt-0.5">•</span>
                                  <span className="line-clamp-1">{point}</span>
                                </li>
                              ))}
                              {content.keyPoints.length > 3 && (
                                <li className="text-[10px] text-[#475569]">+{content.keyPoints.length - 3} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : uploadedContent.length === 0 ? (
              /* Empty library state */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-5xl mb-4">📚</span>
                <h3 className="text-base font-semibold text-white mb-1.5">
                  Let&apos;s build your AI Knowledge Library!
                </h3>
                <p className="text-sm text-[#64748B] max-w-sm leading-relaxed">
                  Upload your first learning material. Everything you upload becomes searchable and chat-ready.
                  Your AI will understand every document.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default LessonsView;
