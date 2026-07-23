import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { KnowrizonMascot } from '../ui/KnowrizonMascot';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const trustBadges = [
  { icon: '⭐', label: '4.9/5 Rating' },
  { icon: '🔒', label: 'Secure' },
  { icon: '⚡', label: 'Instant AI' },
  { icon: '🤖', label: 'Adaptive' },
];

export function HeroSection({ onGetStarted }) {
  const [chatStep, setChatStep] = useState(0);
  const timerRef = useRef(null);

  /* Cinematic sequence: mascot wakes → chat preview appears → AI types → response streams → CTA glows */
  useEffect(() => {
    const delays = [2200, 1500, 1800];
    let step = 0;

    const advance = () => {
      step++;
      if (step <= 3) {
        setChatStep(step);
        timerRef.current = setTimeout(advance, delays[step - 1] || 2000);
      }
    };

    timerRef.current = setTimeout(advance, 1600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <section className="relative pt-32 pb-16 lg:pt-44 lg:pb-28 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20"
        >
          {/* ===== Left column: Story-driven copy ===== */}
          <div className="flex-1 text-center lg:text-left max-w-2xl lg:max-w-none order-2 lg:order-1">
            {/* Tag */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#22C7FF]/20 bg-[#22C7FF]/[0.06] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#22C7FF] animate-pulse" />
              <span className="text-sm text-[#22C7FF] font-medium">AI-Powered Learning Platform</span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={itemVariants} className="text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold text-white leading-[1.08] tracking-tight mb-6">
              Your Personal AI{' '}
              <span className="kn-gradient-text">Study Companion</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-[#94A3B8] max-w-xl lg:max-w-lg mb-8 leading-relaxed">
              Upload notes, ask questions, generate quizzes, and learn faster — with your own AI tutor that adapts to how you study.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-5">
              <button
                onClick={onGetStarted}
                className="group px-8 py-3.5 text-base font-semibold text-white rounded-xl kn-gradient-btn inline-flex items-center justify-center gap-2"
              >
                Start Learning Free
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
              <button className="px-8 py-3.5 text-base font-medium text-[#94A3B8] rounded-xl border border-white/[0.1] hover:border-white/[0.2] hover:text-white hover:bg-white/[0.03] transition-all duration-300 inline-flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Watch Demo
              </button>
            </motion.div>

            {/* Micro note */}
            <motion.p variants={itemVariants} className="text-sm text-[#475569] mb-8">
              No credit card required · Free forever for students
            </motion.p>

            {/* Trust badges */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-5 justify-center lg:justify-start">
              {trustBadges.map((badge) => (
                <div key={badge.label} className="flex items-center gap-1.5 text-sm text-[#64748B]">
                  <span className="text-base">{badge.icon}</span>
                  <span>{badge.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ===== Right column: Mascot centerpiece + product preview ===== */}
          <motion.div variants={itemVariants} className="relative flex-1 flex justify-center items-center order-1 lg:order-2">
            {/* Glowing circle behind mascot */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[280px] h-[280px] md:w-[360px] md:h-[360px] lg:w-[420px] lg:h-[420px] rounded-full bg-[#22C7FF]/[0.06] blur-[60px] kn-glow-pulse" />
            </div>

            {/* Floating knowledge icons */}
            <FloatingIcon emoji="📚" className="absolute top-[8%] left-[8%] md:left-[2%]" delay={0} />
            <FloatingIcon emoji="🎓" className="absolute top-[2%] right-[12%] md:right-[8%]" delay={1.2} />
            <FloatingIcon emoji="🧠" className="absolute bottom-[25%] left-[0%] md:left-[-5%]" delay={2.5} />
            <FloatingIcon emoji="✨" className="absolute bottom-[18%] right-[5%] md:right-[0%]" delay={3.8} />

            {/* Mascot — UNTOUCHED, visual centerpiece */}
            <KnowrizonMascot className="w-[220px] md:w-[280px] lg:w-[340px] relative z-10" />

            {/* ===== Floating product preview: cinematic chat card ===== */}
            <motion.div
              initial={{ opacity: 0, x: 20, y: 10 }}
              animate={{
                opacity: chatStep >= 1 ? 1 : 0,
                x: chatStep >= 1 ? 0 : 20,
                y: chatStep >= 1 ? 0 : 10,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute -right-2 top-[10%] md:right-[-50px] lg:right-[-60px] w-60 md:w-64 kn-glass rounded-2xl p-4 z-20 shadow-xl shadow-black/30"
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">K</span>
                </div>
                <span className="text-xs font-medium text-white">Knowri AI</span>
                <span className="ml-auto text-[10px] text-[#22C7FF]">● Online</span>
              </div>

              {/* User message */}
              {chatStep >= 1 && (
                <div className="mb-2 flex justify-end">
                  <div className="bg-[#22C7FF]/10 rounded-xl rounded-br-sm px-3 py-1.5 text-xs text-[#E2E8F0]">
                    Explain photosynthesis 🌱
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {chatStep >= 2 && chatStep < 3 && (
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22C7FF] kn-typing-dot" style={{ animationDelay: '0s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22C7FF] kn-typing-dot" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22C7FF] kn-typing-dot" style={{ animationDelay: '0.4s' }} />
                </div>
              )}

              {/* AI response */}
              {chatStep >= 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-xs text-[#94A3B8] leading-relaxed"
                >
                  Photosynthesis converts sunlight into energy. Plants use CO₂ + H₂O → glucose + O₂
                  <div className="mt-2 flex gap-1.5">
                    {['Summary', 'Quiz', 'Flashcards'].map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] text-[#22C7FF] border border-[#22C7FF]/10">
                        {t}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function FloatingIcon({ emoji, className, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.25 + 1.2, duration: 0.5, ease: 'backOut' }}
      className={`${className} w-10 h-10 rounded-xl kn-glass flex items-center justify-center text-lg kn-float-icon pointer-events-none`}
      style={{ animationDelay: `${delay}s` }}
    >
      {emoji}
    </motion.div>
  );
}
