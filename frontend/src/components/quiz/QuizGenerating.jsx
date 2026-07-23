import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowrizonMascot, MASCOT_STATES } from '../ui/KnowrizonMascot';

/**
 * QuizGenerating — Knowri thinking animation with staged status messages.
 */

const STATUS_MESSAGES = [
  { text: 'Analyzing the topic...', delay: 0 },
  { text: 'Crafting challenging questions...', delay: 2500 },
  { text: 'Building answer options...', delay: 5000 },
  { text: 'Adding learning explanations...', delay: 8000 },
  { text: 'Almost ready...', delay: 12000 },
];

export function QuizGenerating({ topic, questionCount }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const timersRef = useRef([]);

  useEffect(() => {
    STATUS_MESSAGES.forEach((msg, i) => {
      if (i === 0) return; // first message shows immediately
      const timer = setTimeout(() => setMessageIndex(i), msg.delay);
      timersRef.current.push(timer);
    });

    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const currentMessage = STATUS_MESSAGES[messageIndex];

  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-12">
      {/* Knowri thinking */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <KnowrizonMascot state={MASCOT_STATES.THINKING} size={96} className="mx-auto" />
      </motion.div>

      {/* Status text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={messageIndex}
          className="text-lg text-slate-300 font-medium"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          {currentMessage.text}
        </motion.p>
      </AnimatePresence>

      {/* Context */}
      <div className="text-sm text-slate-500 space-y-0.5">
        {topic && <p>Topic: {topic}</p>}
        <p>{questionCount} questions</p>
      </div>

      {/* Animated loading bar */}
      <div className="w-48 mx-auto">
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full quiz-gradient-bar rounded-full"
            initial={{ width: '5%' }}
            animate={{ width: '85%' }}
            transition={{ duration: 15, ease: 'linear' }}
          />
        </div>
      </div>
    </div>
  );
}

export default QuizGenerating;
