import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * QuizCardIntro — Four-card "Recall · Understand · Apply · Master" animation.
 * A short animated quiz-preparation sequence using Framer Motion.
 */

const CARDS = [
  { label: 'RECALL', color: 'from-cyan-500 to-cyan-600', icon: '🧠', description: 'Remember' },
  { label: 'UNDERSTAND', color: 'from-blue-500 to-indigo-500', icon: '📖', description: 'Analyze' },
  { label: 'APPLY', color: 'from-indigo-500 to-purple-500', icon: '⚡', description: 'Solve' },
  { label: 'MASTER', color: 'from-purple-500 to-pink-500', icon: '🏆', description: 'Achieve' },
];

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export function QuizCardIntro({ onComplete, onSkip }) {
  const [phase, setPhase] = useState(0); // 0=stack, 1=spread, 2=flip, 3=pulse, 4=done
  const [hasStarted, setHasStarted] = useState(false);

  // Skip animation for reduced motion
  useEffect(() => {
    if (prefersReducedMotion) {
      onComplete?.();
      return;
    }
    setHasStarted(true);
  }, []);

  // Animation timeline
  useEffect(() => {
    if (!hasStarted || prefersReducedMotion) return;
    
    const timers = [
      setTimeout(() => setPhase(1), 400),   // Stack → Spread
      setTimeout(() => setPhase(2), 1000),   // Spread → Flip
      setTimeout(() => setPhase(3), 1800),   // Flip → Pulse
      setTimeout(() => setPhase(4), 2600),   // Pulse → Done
      setTimeout(() => onComplete?.(), 2800), // Reveal count selector
    ];

    return () => timers.forEach(clearTimeout);
  }, [hasStarted, onComplete]);

  const handleSkip = useCallback(() => {
    onSkip?.();
    onComplete?.();
  }, [onSkip, onComplete]);

  if (prefersReducedMotion) return null;

  // Card positioning per phase
  const getCardVariants = (index) => {
    const offset = (index - 1.5) * 38; // spread offset

    return {
      stack: {
        x: index * 4,
        y: index * -3,
        rotateY: 0,
        scale: 1,
        opacity: 1,
        zIndex: 4 - index,
      },
      spread: {
        x: offset,
        y: 0,
        rotateY: 0,
        scale: 1,
        opacity: 1,
        zIndex: index,
      },
      flip: {
        x: offset,
        y: 0,
        rotateY: 360,
        scale: 1,
        opacity: 1,
        zIndex: index,
      },
      pulse: {
        x: 0,
        y: 0,
        rotateY: 360,
        scale: 0.8,
        opacity: 1,
        zIndex: index,
      },
      done: {
        x: 0,
        y: 0,
        rotateY: 360,
        scale: 0,
        opacity: 0,
        zIndex: index,
      },
    };
  };

  const phaseNames = ['stack', 'spread', 'flip', 'pulse', 'done'];
  const currentPhase = phaseNames[phase] || 'stack';

  return (
    <div className="quiz-card-intro flex flex-col items-center justify-center min-h-[300px] relative">
      {/* Cards */}
      <div className="relative flex items-center justify-center h-[200px] w-full max-w-[600px]">
        {CARDS.map((card, i) => {
          const variants = getCardVariants(i);
          return (
            <motion.div
              key={card.label}
              className={`quiz-intro-card absolute bg-gradient-to-br ${card.color} shadow-xl`}
              initial={variants.stack}
              animate={variants[currentPhase]}
              transition={{
                type: 'spring',
                stiffness: 120,
                damping: 20,
                delay: currentPhase === 'flip' ? i * 0.15 : 0,
              }}
            >
              <span className="text-3xl">{card.icon}</span>
              <span className="tracking-widest text-xs opacity-90">{card.label}</span>
            </motion.div>
          );
        })}

        {/* Cyan pulse on phase 3 */}
        <AnimatePresence>
          {phase === 3 && (
            <motion.div
              className="absolute w-40 h-40 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(34,199,255,0.3) 0%, rgba(91,95,255,0.15) 50%, transparent 70%)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 2.5, opacity: [0, 0.6, 0] }}
              exit={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="Skip animation"
      >
        Skip Animation
      </button>
    </div>
  );
}

export default QuizCardIntro;
