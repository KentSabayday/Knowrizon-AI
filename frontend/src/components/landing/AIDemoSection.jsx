import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ScrollReveal } from './ScrollReveal';

const conversation = [
  { role: 'user', text: "Explain Newton's Third Law of Motion" },
  { role: 'ai', text: "Newton's Third Law states that for every action, there is an equal and opposite reaction.\n\nWhen you push against a wall, the wall pushes back with the same force. This is why a rocket works — it expels gas downward, and the reaction force pushes the rocket upward. 🚀\n\n• Forces always come in pairs\n• The pairs act on different objects\n• Equal in magnitude, opposite in direction" },
  { role: 'user', text: "Can you give me a quiz question?" },
  { role: 'ai', text: "A swimmer pushes water backward with their hands. According to Newton's Third Law, what happens?\n\nA) The water stops moving\nB) The swimmer moves forward ✓\nC) Nothing happens\nD) The swimmer sinks" },
];

export function AIDemoSection() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isInView) return;

    const showNext = (index) => {
      if (index >= conversation.length) return;

      if (conversation[index].role === 'ai') {
        setIsTyping(true);
        timerRef.current = setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages(index + 1);
          timerRef.current = setTimeout(() => showNext(index + 1), 1800);
        }, 2000);
      } else {
        setVisibleMessages(index + 1);
        timerRef.current = setTimeout(() => showNext(index + 1), 1200);
      }
    };

    timerRef.current = setTimeout(() => showNext(0), 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isInView]);

  return (
    <section id="demo" className="py-24 lg:py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Experience <span className="kn-gradient-text">AI tutoring</span>
          </h2>
          <p className="text-lg text-[#94A3B8]">
            See how Knowri helps you understand any topic, instantly.
          </p>
        </ScrollReveal>

        <ScrollReveal variant="scaleUp">
          <div ref={containerRef} className="kn-glass rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 md:px-6 py-4 border-b border-white/[0.06]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] flex items-center justify-center text-sm font-bold text-white">K</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Knowri AI Tutor</div>
                <div className="text-[11px] text-[#22C7FF]">● Online — Physics Session</div>
              </div>
              <div className="flex gap-1.5">
                {['📎', '🎤', '📄'].map((e) => (
                  <div key={e} className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-xs hover:bg-white/[0.08] transition-colors cursor-default">
                    {e}
                  </div>
                ))}
              </div>
            </div>

            {/* Messages area */}
            <div className="px-5 md:px-6 py-5 space-y-4 min-h-[280px] max-h-[400px] overflow-y-auto kn-scrollbar">
              {conversation.slice(0, visibleMessages).map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2.5'}`}
                >
                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-1">K</div>
                  )}
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-[#22C7FF]/15 to-[#5B5FFF]/15 text-[#E2E8F0] rounded-br-sm'
                      : 'bg-white/[0.04] text-[#E2E8F0] rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white">K</div>
                  <div className="flex items-center gap-1.5 bg-white/[0.04] rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-[#22C7FF] kn-typing-dot" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 rounded-full bg-[#22C7FF] kn-typing-dot" style={{ animationDelay: '0.15s' }} />
                    <div className="w-2 h-2 rounded-full bg-[#22C7FF] kn-typing-dot" style={{ animationDelay: '0.3s' }} />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Chat input */}
            <div className="px-5 md:px-6 py-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.06]">
                <input
                  type="text"
                  placeholder="Ask Knowri anything..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-[#475569] outline-none"
                  readOnly
                  tabIndex={-1}
                />
                <button className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] flex items-center justify-center text-white flex-shrink-0" tabIndex={-1}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" /></svg>
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
