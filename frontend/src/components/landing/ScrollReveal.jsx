import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const EASE = [0.25, 0.46, 0.45, 0.94];

const variants = {
  fadeUp:     { hidden: { opacity: 0, y: 40 },  visible: { opacity: 1, y: 0 } },
  fadeIn:     { hidden: { opacity: 0 },          visible: { opacity: 1 } },
  scaleUp:    { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1 } },
  blurIn:     { hidden: { opacity: 0, filter: 'blur(12px)' }, visible: { opacity: 1, filter: 'blur(0px)' } },
  slideLeft:  { hidden: { opacity: 0, x: -60 },  visible: { opacity: 1, x: 0 } },
  slideRight: { hidden: { opacity: 0, x: 60 },   visible: { opacity: 1, x: 0 } },
};

export function ScrollReveal({
  children,
  variant = 'fadeUp',
  delay = 0,
  duration = 0.6,
  once = true,
  threshold = 0.2,
  className = '',
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants[variant] || variants.fadeUp}
      transition={{ duration, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, staggerDelay = 0.1, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: staggerDelay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
