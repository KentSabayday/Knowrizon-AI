import { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Copy, ThumbsUp, ThumbsDown, RotateCcw, Send, FileText,
  ArrowUp, Check, ChevronDown, ChevronUp,
} from 'lucide-react';
import { KnowrizonMascot, MASCOT_STATES } from '../ui/KnowrizonMascot';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * ChatInterface — Premium AI Tutor chat with Knowri mascot, KaTeX math,
 * GFM tables, organized lesson layout, and streaming-safe rendering.
 *
 * Preserves: ALL sendMessage, sendStreamingMessage, sendNonStreamingMessage,
 *            loadConversation, SSE stream processing, abort controller,
 *            handleSubmit, handleKeyPress, conversationId management.
 */

/* ═══════════════════════════════════════════════════════════
   SUGGESTION CHIPS
   ═══════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════
   MATH DELIMITER NORMALIZER
   Converts \(...\) → $...$ and \[...\] → $$...$$ for remark-math.
   Protects code blocks. Presentation-only — never mutates stored content.
   ═══════════════════════════════════════════════════════════ */

function normalizeTutorMarkdown(content) {
  if (!content) return '';

  // Split by fenced code blocks to protect them
  const parts = content.split(/(```[\s\S]*?```|`[^`\n]+`)/g);

  const processed = parts.map((part, i) => {
    // Odd indices are code blocks/inline code — leave untouched
    if (i % 2 === 1) return part;

    let text = part;

    // Normalize <br>, <br/>, <br /> outside code to newlines
    text = text.replace(/<br\s*\/?>/gi, '\n');

    // Convert \[...\] to $$...$$ (display math)
    text = text.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, eq) => `\n$$\n${eq.trim()}\n$$\n`);

    // Convert \(...\) to $...$ (inline math)
    text = text.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_, eq) => `$${eq.trim()}$`);

    // Handle \displaystyle outside delimiters → wrap in display math
    text = text.replace(/(?<!\$)\\displaystyle\s+(.+?)(?=\n|$)/g, (_, eq) => `$$${eq.trim()}$$`);

    return text;
  });

  return processed.join('');
}

/* ═══════════════════════════════════════════════════════════
   STREAMING SAFEGUARD
   Closes unmatched delimiters in the render copy only.
   ═══════════════════════════════════════════════════════════ */

function makeStreamingSafe(content) {
  if (!content) return '';
  let text = content;

  // Close unmatched fenced code blocks
  const fenceCount = (text.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) text += '\n```';

  // Close unmatched display math $$
  const displayCount = (text.match(/\$\$/g) || []).length;
  if (displayCount % 2 !== 0) text += '\n$$';

  // Close unmatched inline math $ (simple heuristic)
  // Count $ that are NOT part of $$
  const stripped = text.replace(/\$\$/g, '');
  const inlineCount = (stripped.match(/\$/g) || []).length;
  if (inlineCount % 2 !== 0) text += '$';

  return text;
}

/* ═══════════════════════════════════════════════════════════
   TUTOR MARKDOWN RENDERER
   Renders Markdown + KaTeX + GFM tables. Pure presentation.
   ═══════════════════════════════════════════════════════════ */

const TutorMarkdown = memo(function TutorMarkdown({ content, isStreaming = false }) {
  const normalized = useMemo(() => {
    const n = normalizeTutorMarkdown(content);
    return isStreaming ? makeStreamingSafe(n) : n;
  }, [content, isStreaming]);

  // Collect headings for outline
  const headings = useMemo(() => {
    if (!content || content.length < 1500) return [];
    const matches = [...content.matchAll(/^#{1,3}\s+(.+)$/gm)];
    if (matches.length < 3) return [];
    return matches.map((m, i) => {
      const level = m[0].indexOf(' ');
      const text = m[1].trim();
      const id = `heading-${i}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
      return { level, text, id };
    });
  }, [content]);

  return (
    <div className="tutor-response-body">
      {/* Optional outline for long responses */}
      {headings.length >= 3 && !isStreaming && <ResponseOutline headings={headings} />}

      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: 'warn', output: 'htmlAndMathml' }]]}
        components={markdownComponents}
      >
        {normalized}
      </ReactMarkdown>

      {/* Streaming cursor */}
      {isStreaming && content && (
        <span className="inline-block w-[2px] h-[1.1em] bg-[#22C7FF] ml-0.5 align-middle dash-cursor" aria-hidden="true" />
      )}
    </div>
  );
});

/* ─── Markdown Component Overrides ─── */

let headingCounter = 0;

const markdownComponents = {
  h1: ({ children }) => {
    const id = `heading-${headingCounter++}-${String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
    return (
      <h2 id={id} className="text-[22px] font-bold text-white mt-8 mb-3 pb-2 border-b border-white/[0.08] scroll-mt-4">
        {children}
      </h2>
    );
  },
  h2: ({ children }) => {
    const id = `heading-${headingCounter++}-${String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
    return (
      <h3 id={id} className="text-[19px] font-bold text-white mt-6 mb-2.5 scroll-mt-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-[#22C7FF] rounded-full" aria-hidden="true" />
        {children}
      </h3>
    );
  },
  h3: ({ children }) => (
    <h4 className="text-[16px] font-semibold text-[#E2E8F0] mt-5 mb-2">{children}</h4>
  ),
  h4: ({ children }) => (
    <h5 className="text-[15px] font-semibold text-[#22C7FF] mt-4 mb-1.5">{children}</h5>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-[#E2E8F0] leading-[1.75] text-[15px]">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-[#CBD5E1]">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-5 mb-3 space-y-1.5 text-[#E2E8F0] text-[15px]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-5 mb-3 space-y-1.5 text-[#E2E8F0] text-[15px]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[#E2E8F0] leading-[1.65] pl-1">{children}</li>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#22C7FF] hover:underline focus:outline-none focus:ring-1 focus:ring-[#22C7FF]/40 rounded">{children}</a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 pl-4 py-3 pr-4 border-l-[3px] border-[#22C7FF] bg-[#22C7FF]/[0.04] rounded-r-xl text-[#CBD5E1] text-[15px] leading-[1.7]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-white/[0.08]" />,
  code: ({ inline, className, children }) => {
    if (inline) {
      return <code className="bg-white/[0.07] text-[#22C7FF] px-1.5 py-0.5 rounded text-[13px] font-mono">{children}</code>;
    }
    const lang = className?.replace('language-', '') || '';
    return (
      <div className="my-4 rounded-xl border border-white/[0.08] overflow-hidden">
        {lang && (
          <div className="px-4 py-1.5 bg-white/[0.03] border-b border-white/[0.06] text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">
            {lang}
          </div>
        )}
        <pre className="bg-[#0B1220] p-4 overflow-x-auto">
          <code className="text-[13px] font-mono text-[#E2E8F0] leading-relaxed">{children}</code>
        </pre>
      </div>
    );
  },
  pre: ({ children }) => <>{children}</>,

  /* ─── GFM Table ─── */
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="min-w-full border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#22C7FF]/[0.06]">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#F8FAFC] whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-[14px] text-[#CBD5E1] leading-[1.55] align-top">{children}</td>
  ),
};

/* ─── Response Outline ─── */

function ResponseOutline({ headings }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-[#94A3B8] font-medium hover:text-white transition-colors"
      >
        <span>In this response ({headings.length} sections)</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-1">
          {headings.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              className="block text-xs text-[#64748B] hover:text-[#22C7FF] transition-colors"
              style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
            >
              {h.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MINI MASCOT WRAPPER
   Scales the existing KnowrizonMascot for inline chat use.
   ═══════════════════════════════════════════════════════════ */

function KnowriAvatar({ size = 38, state = 'idle', className = '' }) {
  return (
    <div
      className={`flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Knowri, your AI tutor"
      role="img"
    >
      <KnowrizonMascot
        state={state}
        className="w-full h-full"
        autoGreet={false}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN CHAT INTERFACE
   ═══════════════════════════════════════════════════════════ */

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

  const scrollContainerRef = useRef(null);

  // Auto-scroll only when the user is near the bottom (within 150px)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
        headers: { 'Authorization': `Bearer ${token}` }
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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

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

      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) continue;

          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) throw new Error(parsed.error);

              if (parsed.messageId) {
                if (parsed.conversationId && !conversationId) {
                  setConversationId(parsed.conversationId);
                  if (onConversationChange) onConversationChange(parsed.conversationId);
                }
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantMessageId ? { ...m, isStreaming: false } : m)
                );
              }
            } catch (parseError) {
              const chunk = data
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');

              fullContent += chunk;

              setMessages((prev) =>
                prev.map((m) => m.id === assistantMessageId ? { ...m, content: fullContent } : m)
              );
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => m.id === assistantMessageId ? { ...m, isStreaming: false } : m)
      );
    } catch (err) {
      if (err.name === 'AbortError') return;
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
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

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
      if (!response.ok) throw new Error(data.error || 'Failed to send message');

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        if (onConversationChange) onConversationChange(data.conversationId);
      }

      const assistantMessage = {
        id: data.messageId || assistantMessageId,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isLoading && inputValue.trim()) {
      sendMessage(inputValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /** Regenerate: resend the last user message */
  const handleRegenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser && !isLoading) {
      sendMessage(lastUser.content);
    }
  }, [messages, isLoading]);

  const userInitials = (user?.name || 'U').charAt(0).toUpperCase();

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Messages Container */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
        <div className="space-y-5">

          {/* ── Welcome State ── */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-5 max-w-lg"
              >
                {/* Knowri mascot */}
                <div className="mx-auto" style={{ width: 100 }}>
                  <KnowrizonMascot
                    state={MASCOT_STATES.GREETING}
                    className="w-full"
                    autoGreet={true}
                  />
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Hello! I&apos;m Knowri 👋
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed max-w-md mx-auto">
                    I&apos;m your AI study companion. Ask me a question or upload learning materials, and I&apos;ll help you understand them clearly.
                  </p>
                </div>

                {/* Capabilities */}
                <div className="flex flex-wrap justify-center gap-2">
                  {['PDFs', 'Videos', 'Lecture Notes', 'Research Papers', 'Code', 'Assignments'].map((cap) => (
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

          {/* ── Messages ── */}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              formatTime={formatTime}
              userInitials={userInitials}
              onRegenerate={handleRegenerate}
              isLastAssistant={message.role === 'assistant' && messages[messages.length - 1]?.id === message.id}
            />
          ))}

          {isLoading && !isStreaming && <StreamingIndicator />}

          {error && (
            <div className="flex justify-center">
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-sm max-w-lg">
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
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
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Knowri anything about your learning materials…"
            disabled={isLoading && !isStreaming}
            rows={1}
            className="w-full bg-[#111827]/60 backdrop-blur-sm border border-white/[0.08] rounded-2xl pl-5 pr-14 py-4 text-[15px] text-white placeholder:text-[#475569] outline-none focus:border-[#22C7FF]/30 focus:ring-1 focus:ring-[#22C7FF]/15 transition-all disabled:opacity-50 resize-none overflow-hidden leading-relaxed"
            style={{ minHeight: '56px', maxHeight: '160px' }}
            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={(isLoading && !isStreaming) || !inputValue.trim()}
            className="absolute right-3 bottom-3 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] text-white hover:shadow-lg hover:shadow-[#22C7FF]/20"
            aria-label="Send message"
          >
            {isLoading && !isStreaming ? (
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


/* ═══════════════════════════════════════════════════════════
   MESSAGE BUBBLE
   ═══════════════════════════════════════════════════════════ */

function MessageBubble({ message, formatTime, userInitials, onRegenerate, isLastAssistant }) {
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

  if (isUser) {
    /* ── User Message ── */
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
        data-testid="message-user"
      >
        <div className="flex items-start gap-2.5 flex-row-reverse max-w-[68%] sm:max-w-[65%]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#22C7FF] to-[#5B5FFF] flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-white">{userInitials}</span>
          </div>
          <div className="bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] text-white rounded-2xl rounded-tr-sm px-4 py-3">
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</div>
            <div className="text-[10px] text-white/50 mt-1.5">{formatTime(message.timestamp)}</div>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ── Assistant Message ── */
  const mascotState = isStreamingMsg ? MASCOT_STATES.THINKING : MASCOT_STATES.IDLE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
      data-testid="message-assistant"
    >
      <div className="flex items-start gap-3 max-w-full w-full group/msg">
        {/* Knowri mini mascot */}
        <KnowriAvatar size={38} state={mascotState} />

        {/* Response card */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-white">Knowri</span>
            <span className="text-[10px] text-[#64748B]">AI Tutor</span>
            {!isStreamingMsg && (
              <span className="text-[10px] text-[#475569]">• {formatTime(message.timestamp)}</span>
            )}
          </div>

          {/* Response body */}
          <div className="bg-[#111827]/50 backdrop-blur-sm border border-white/[0.05] rounded-2xl rounded-tl-sm px-5 py-4">
            {message.content ? (
              <TutorMarkdown content={message.content} isStreaming={isStreamingMsg} />
            ) : isStreamingMsg ? (
              <span className="text-[#64748B] italic text-sm">Preparing a clear explanation…</span>
            ) : null}
          </div>

          {/* Actions */}
          {!isStreamingMsg && message.content && (
            <div className="flex items-center gap-0.5 ml-1 pt-0.5 group-hover/msg:opacity-100 opacity-0 focus-within:opacity-100 transition-opacity">
              <ActionButton onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'} aria-label={copied ? 'Copied' : 'Copy response'}>
                {copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
              </ActionButton>
              <ActionButton title="Helpful" aria-label="Mark as helpful">
                <ThumbsUp className="w-3.5 h-3.5" />
              </ActionButton>
              <ActionButton title="Not helpful" aria-label="Mark as not helpful">
                <ThumbsDown className="w-3.5 h-3.5" />
              </ActionButton>
              {isLastAssistant && (
                <ActionButton onClick={onRegenerate} title="Regenerate" aria-label="Regenerate response">
                  <RotateCcw className="w-3.5 h-3.5" />
                </ActionButton>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({ children, ...props }) {
  return (
    <button
      className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/[0.05] transition-all focus:outline-none focus:ring-1 focus:ring-[#22C7FF]/30"
      {...props}
    >
      {children}
    </button>
  );
}


/* ═══════════════════════════════════════════════════════════
   STREAMING STAGE INDICATOR
   ═══════════════════════════════════════════════════════════ */

function StreamingIndicator() {
  const [stage, setStage] = useState(0);
  const stages = [
    'Reading your learning materials…',
    'Searching your knowledge…',
    'Connecting the concepts…',
    'Preparing a clear explanation…',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((s) => (s + 1) % stages.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-start" data-testid="loading-indicator" aria-live="polite">
      <div className="flex items-start gap-3">
        <KnowriAvatar size={40} state={MASCOT_STATES.THINKING} />
        <div className="bg-[#111827]/50 backdrop-blur-sm border border-white/[0.05] rounded-2xl rounded-tl-sm px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <motion.span
              key={stage}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[#94A3B8]"
            >
              {stages[stage]}
            </motion.span>
            <span className="flex gap-1" aria-hidden="true">
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
