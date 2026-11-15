import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Trash2, MessageSquare, ArrowRight, Clock,
  Loader2, Sparkles, AlertCircle, BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_BASE } from '../../lib/api';

/**
 * HistoryView — AI Study Session History Explorer.
 *
 * Displays all past Socratic study conversations, linked topics,
 * message previews, and instant continuation into the active Study Studio.
 */
export function HistoryView({ onNavigate }) {
  const { token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Clean notebook / session titles (strip redundant "Workspace" suffix)
  const formatTitle = (rawTitle) => {
    if (!rawTitle) return 'Study Notebook';
    return rawTitle.replace(/\s*Workspace\s*$/i, '').trim() || 'Study Notebook';
  };

  // Continue selected conversation in Study Studio
  const handleContinueChat = () => {
    if (selectedConversation && onNavigate) {
      onNavigate('/workspace', selectedConversation);
    }
  };

  // Fetch all user conversations on mount
  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token]);

  // Filter conversations live on search query change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = conversations.filter(conv =>
        conv.title?.toLowerCase().includes(query) ||
        conv.topic?.toLowerCase().includes(query) ||
        conv.preview?.toLowerCase().includes(query)
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  const fetchConversations = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/chat/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const list = data.conversations || [];
        setConversations(list);
        setFilteredConversations(list);
        // Pre-select first conversation if available and none selected
        if (list.length > 0 && !selectedConversation) {
          loadConversation(list[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversation = async (conversationId) => {
    if (!token) return;
    setIsLoadingMessages(true);
    setSelectedConversation(conversationId);

    try {
      const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const deleteConversation = async (e, conversationId) => {
    e.stopPropagation();
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this study session history?')) return;

    try {
      const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (selectedConversation === conversationId) {
          const remaining = conversations.filter(c => c.id !== conversationId);
          if (remaining.length > 0) {
            loadConversation(remaining[0].id);
          } else {
            setSelectedConversation(null);
            setMessages([]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recent';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const activeConv = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="h-full flex bg-[#FAF9F6] dark:bg-[#0F1115] text-[#141413] dark:text-[#F3F4F6] overflow-hidden">
      {/* ── Left: Conversations Drawer ── */}
      <div className="w-80 sm:w-96 flex-shrink-0 border-r border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#13161D] flex flex-col">
        {/* Header & Search */}
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Past Sessions
              </h2>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 font-medium">
              {conversations.length} sessions
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search past sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.04]">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600 dark:text-blue-400" />
              <p className="text-xs">Loading sessions...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {searchQuery ? 'No matching sessions found' : 'No past sessions yet'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {searchQuery ? 'Try another keyword' : 'Start chatting in Study Studio to record history.'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConversation === conv.id;
              const hasZeroMessages = conv.messageCount === 0;

              return (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 border-l-3 border-blue-600 dark:border-blue-500'
                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  } ${hasZeroMessages ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-200'
                        }`}>
                          {formatTitle(conv.title)}
                        </h3>
                      </div>

                      {conv.topic && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-medium truncate max-w-[200px]">
                          {conv.topic}
                        </span>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <span>{formatDate(conv.updatedAt || conv.createdAt)}</span>
                        <span>•</span>
                        <span>{conv.messageCount || 0} {conv.messageCount === 1 ? 'message' : 'messages'}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => deleteConversation(e, conv.id)}
                      className="p-1 rounded-lg opacity-40 hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-all shrink-0 cursor-pointer"
                      title="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Conversation Message Preview ── */}
      <div className="flex-1 flex flex-col bg-[#FAF9F6] dark:bg-[#0F1115] min-w-0 overflow-hidden relative">
        {selectedConversation ? (
          <>
            {/* Top Session Banner */}
            <div className="h-14 px-6 border-b border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#13161D]/80 backdrop-blur-md flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 truncate">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {formatTitle(activeConv?.title)}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatDate(activeConv?.createdAt)}
                  </p>
                </div>
              </div>

              <button
                onClick={handleContinueChat}
                className="kn-btn-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue Session</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages Stream Preview */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mb-2" />
                  <p className="text-xs">Loading dialogue history...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 p-8">
                  <BookOpen className="w-10 h-10 opacity-30 text-blue-600 dark:text-blue-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Session initialized</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    No messages in this notebook yet. Jump back in to ask a question or upload notes.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <HistoryMessageItem key={message.id || index} message={message} />
                  ))}
                  {/* Bottom spacer for floating action bar */}
                  <div className="h-28" />
                </>
              )}
            </div>

            {/* Floating "Continue in Study Studio" Dock */}
            {!isLoadingMessages && messages.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none p-5 bg-gradient-to-t from-[#FAF9F6] dark:from-[#0F1115] via-[#FAF9F6]/90 dark:via-[#0F1115]/90 to-transparent">
                <div className="max-w-xl mx-auto pointer-events-auto bg-white/95 dark:bg-[#161920]/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/[0.1] rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Resume this study notebook?
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Pick up directly with Knowri where you left off.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleContinueChat}
                    className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>Yes, Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center text-slate-400 mb-4">
              <MessageSquare className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Select a Conversation</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Choose a past study session from the left to view the transcript, or continue learning.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Single Message in History Viewer
 */
function HistoryMessageItem({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 bg-blue-600 text-white shadow-2xs">
          <p className="text-[10px] font-semibold text-white/80 mb-0.5">You</p>
          <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-5 py-4 bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-slate-900 dark:text-white">Knowri AI Tutor</span>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default HistoryView;
