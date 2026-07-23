import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Copy, ThumbsUp, ThumbsDown, RotateCcw, Sparkles, Send, FileText,
  ArrowUp, Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * ChatInterface — Premium AI chat with Knowri personality.
 *
 * Preserves: ALL sendMessage, sendStreamingMessage, sendNonStreamingMessage,
 *            loadConversation, SSE stream processing, abort controller,
 *            handleSubmit, handleKeyPress, ReactMarkdown rendering.
 *
 * New: Welcome state with Knowri + suggestion chips, premium message bubbles,
 *      message actions (copy), enhanced streaming indicator, glass input,
 *      active knowledge context badges.
 */

const SUGGESTIONS = [
  { text: 'Explain my notes', emoji: '📝' },
  { text: 'Summarize this PDF', emoji: '📄' },
  { text: 'Generate a quiz', emoji: '📋' },
  { text: 'Create flashcards', emoji: '🃏' },
  { text: 'Teach me Calculus', emoji: '📐' },
  { text: 'Help with my assignment', emoji: '✍️' },
  { text: 'Find key formulas', emoji: '🔬' },
  { text: 'Explain this code', emoji: '💻' },
];

export function ChatInterface({
  contentContext = [],
  enableStreaming = true,
  conversationId: initialConversationId = null,
  onConversationChange = null,
  uploadedContent = [],
}) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load conversation when conversationId changes
  useEffect(() => {
    if (initialConversationId !== conversationId) {
      setConversationId(initialConversationId);
    }
  }, [initialConversationId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId && token) {
      loadConversation(conversationId);
    } else if (!conversationId) {
      setMessages([]);
    }
  }, [conversationId, token]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Load a conversation's messages from the backend
   */
  const loadConversation = async (convId) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/chat/conversations/${convId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const loadedMessages = (data.messages || []).map(msg => ({
          id: msg.messageId || `msg-${msg.id}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.createdAt || msg.timestamp)
        }));
        setMessages(loadedMessages);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  /**
   * Send a message to the TutorAgent API with streaming support
   */
  const sendMessage = async (content) => {
    if (!content.trim()) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Add user message to conversation
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // Create placeholder for assistant message (for streaming)
    const assistantMessageId = `assistant-${Date.now()}`;

    if (enableStreaming) {
      await sendStreamingMessage(content.trim(), assistantMessageId);
    } else {
      await sendNonStreamingMessage(content.trim(), assistantMessageId);
    }
  };

  /**
   * Send message with streaming response (SSE)
   */
  const sendStreamingMessage = async (content, assistantMessageId) => {
    try {
      setIsStreaming(true);

      // Add empty assistant message that will be updated with streamed content
      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: content,
          conversationId: conversationId,
          contentContext: contentContext,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            try {
              // Try to parse as JSON first (for done/error events)
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.messageId) {
                // Done event - update conversation ID if new
                if (parsed.conversationId && !conversationId) {
                  setConversationId(parsed.conversationId);
                  if (onConversationChange) {
                    onConversationChange(parsed.conversationId);
                  }
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, isStreaming: false }
                      : m
                  )
                );
              }
            } catch (parseError) {
              // Not JSON, treat as text chunk
              const chunk = data
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');

              fullContent += chunk;

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: fullContent }
                    : m
                )
              );
            }
          }
        }
      }

      // Ensure streaming flag is removed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, isStreaming: false }
            : m
        )
      );

    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }

      setError(err.message || 'Failed to send message. Please try again.');
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  /**
   * Send message with non-streaming response
   */
  const sendNonStreamingMessage = async (content, assistantMessageId) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: content,
          conversationId: conversationId,
          contentContext: contentContext,
          stream: false,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Update conversation ID if new
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        if (onConversationChange) {
          onConversationChange(data.conversationId);
        }
      }

      // Add assistant response to conversation
      const assistantMessage = {
        id: data.messageId || assistantMessageId,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isLoading && inputValue.trim()) {
      sendMessage(inputValue);
    }
  };

  /**
   * Handle key press (Enter to send)
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const userInitials = (user?.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Messages Container */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">
        {/* Welcome State */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-5 max-w-lg"
            >
              {/* Knowri avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22C7FF]/20 to-[#5B5FFF]/20 border border-white/[0.08] flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7 text-[#22C7FF]" />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Hello! I&apos;m Knowri 👋
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  I&apos;m your AI Study Companion. Upload learning materials or ask me anything.
                </p>
              </div>

              {/* Capabilities */}
              <div className="flex flex-wrap justify-center gap-2">
                {['PDFs', 'Documents', 'Videos', 'Lectures', 'Code', 'Research'].map((cap) => (
                  <span key={cap} className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[#94A3B8]">
                    ✓ {cap}
                  </span>
                ))}
              </div>

              {/* Suggestion chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => { setInputValue(s.text); inputRef.current?.focus(); }}
                    className="group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#22C7FF]/20 hover:bg-[#22C7FF]/[0.04] transition-all text-left"
                  >
                    <span className="text-sm">{s.emoji}</span>
                    <span className="text-[11px] text-[#94A3B8] group-hover:text-white transition-colors leading-tight">{s.text}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            formatTime={formatTime}
            userInitials={userInitials}
          />
        ))}

        {isLoading && !isStreaming && <StreamingIndicator />}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-sm">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Active Knowledge Context */}
      {uploadedContent.length > 0 && (
        <div className="flex-shrink-0 px-5 pb-1">
          <div className="flex items-center gap-2 text-[10px] text-[#475569]">
            <FileText className="w-3 h-3" />
            <span>Using:</span>
            {uploadedContent.slice(0, 3).map((c, i) => (
              <span key={c.id || i} className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04] text-[#94A3B8] truncate max-w-[120px]">
                {c.title || c.filename}
              </span>
            ))}
            {uploadedContent.length > 3 && (
              <span className="text-[#64748B]">+{uploadedContent.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* Glass Input Area */}
      <div className="flex-shrink-0 p-4 pt-2">
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Knowri anything about your learning materials..."
            disabled={isLoading}
            className="w-full bg-[#111827]/60 backdrop-blur-sm border border-white/[0.08] rounded-2xl pl-5 pr-14 py-4 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#22C7FF]/30 focus:ring-1 focus:ring-[#22C7FF]/15 transition-all disabled:opacity-50"
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] text-white hover:shadow-lg hover:shadow-[#22C7FF]/20"
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}


/**
 * Premium message bubble
 */
function MessageBubble({ message, formatTime, userInitials }) {
  const isUser = message.role === 'user';
  const isStreamingMsg = message.isStreaming;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* fallback: ignore */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      data-testid={`message-${message.role}`}
    >
      <div className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''} max-w-[80%]`}>
        {/* Avatar */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser
            ? 'bg-gradient-to-br from-[#22C7FF] to-[#5B5FFF]'
            : 'bg-gradient-to-br from-[#22C7FF]/20 to-[#5B5FFF]/20 border border-white/[0.06]'
        }`}>
          {isUser ? (
            <span className="text-[10px] font-bold text-white">{userInitials}</span>
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-[#22C7FF]" />
          )}
        </div>

        {/* Bubble */}
        <div className="space-y-1">
          <div className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] text-white rounded-tr-sm'
              : 'bg-[#111827]/70 backdrop-blur-sm border border-white/[0.06] text-white rounded-tl-sm'
          }`}>
            {/* Sender label */}
            <div className={`text-[10px] font-medium mb-1 ${
              isUser ? 'text-white/70' : 'text-[#22C7FF]'
            }`}>
              {isUser ? 'You' : 'Knowri'}
              {isStreamingMsg && (
                <span className="ml-2 text-[#94A3B8]">
                  typing<span className="dash-cursor ml-0.5">|</span>
                </span>
              )}
            </div>

            {/* Content */}
            <div className="break-words">
              {isUser ? (
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              ) : (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h2 className="text-lg font-bold mt-4 mb-2 text-white border-b border-white/[0.08] pb-1">{children}</h2>
                      ),
                      h2: ({ children }) => (
                        <h3 className="text-base font-bold mt-3 mb-2 text-white">{children}</h3>
                      ),
                      h3: ({ children }) => (
                        <h4 className="text-sm font-semibold mt-2 mb-1 text-white">{children}</h4>
                      ),
                      p: ({ children }) => (
                        <p className="mb-2 text-[#E2E8F0] leading-relaxed text-sm">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-2 space-y-1 text-[#E2E8F0]">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-2 space-y-1 text-[#E2E8F0]">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-[#E2E8F0] text-sm">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-white">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic text-[#CBD5E1]">{children}</em>
                      ),
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#22C7FF] hover:underline">{children}</a>
                      ),
                      code: ({ inline, children }) => {
                        if (inline) {
                          return <code className="bg-white/[0.08] text-[#22C7FF] px-1.5 py-0.5 rounded text-[13px] font-mono">{children}</code>;
                        }
                        return (
                          <pre className="bg-[#0B1220] text-[#E2E8F0] p-3.5 rounded-xl overflow-x-auto my-2 border border-white/[0.06]">
                            <code className="text-[13px] font-mono">{children}</code>
                          </pre>
                        );
                      },
                      pre: ({ children }) => <>{children}</>,
                      table: ({ children }) => (
                        <div className="my-3 overflow-x-auto">
                          <table className="min-w-full border-collapse border border-white/[0.08]">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-white/[0.04] text-white">{children}</thead>,
                      tbody: ({ children }) => <tbody className="text-[#E2E8F0]">{children}</tbody>,
                      tr: ({ children }) => <tr className="border-b border-white/[0.06]">{children}</tr>,
                      th: ({ children }) => <th className="px-3 py-2 text-left text-sm font-semibold text-white">{children}</th>,
                      td: ({ children }) => <td className="px-3 py-2 text-sm text-[#CBD5E1]">{children}</td>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-[#22C7FF]/40 pl-3 my-2 italic text-[#94A3B8]">{children}</blockquote>
                      ),
                      hr: () => <hr className="my-3 border-white/[0.06]" />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
              {isStreamingMsg && !message.content && (
                <span className="text-[#64748B] italic text-sm">Thinking...</span>
              )}
            </div>

            {/* Timestamp */}
            {!isStreamingMsg && (
              <div className={`text-[10px] mt-1.5 ${isUser ? 'text-white/50' : 'text-[#475569]'}`}>
                {formatTime(message.timestamp)}
              </div>
            )}
          </div>

          {/* Message actions (AI messages only) */}
          {!isUser && !isStreamingMsg && message.content && (
            <div className="flex items-center gap-0.5 ml-1">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/[0.05] transition-all"
                title="Copy"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/[0.05] transition-all" title="Like">
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/[0.05] transition-all" title="Dislike">
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}


/**
 * Streaming stage indicator with rotating messages
 */
function StreamingIndicator() {
  const [stage, setStage] = useState(0);
  const stages = [
    'Knowri is reading your files...',
    'Searching knowledge library...',
    'Understanding context...',
    'Building explanation...',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((s) => (s + 1) % stages.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-start" data-testid="loading-indicator">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#22C7FF]/20 to-[#5B5FFF]/20 border border-white/[0.06] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-[#22C7FF] animate-pulse" />
        </div>
        <div className="bg-[#111827]/70 backdrop-blur-sm border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex items-center gap-2.5">
            <motion.span
              key={stage}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[#94A3B8]"
            >
              {stages[stage]}
            </motion.span>
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-[#22C7FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-[#22C7FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-[#22C7FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
