import { useEffect, useRef, useMemo } from 'react';

export function AnimatedBackground() {
  const glowRef = useRef(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || !glowRef.current) return;
    const el = glowRef.current;
    const handler = (e) => {
      el.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`;
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, [prefersReducedMotion]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Dynamic base surface */}
      <div className="absolute inset-0 bg-[#FAF9F6] dark:bg-[#0F1115] transition-colors duration-200" />

      {/* Subtle ambient mesh */}
      <div className="absolute inset-0 opacity-10 dark:opacity-15 transition-opacity duration-300">
        <div className="absolute -top-[20%] -left-[10%] w-[55%] h-[55%] rounded-full bg-blue-500/10 blur-[140px] kn-blob-1" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/8 blur-[140px] kn-blob-2" />
        <div className="absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] rounded-full bg-blue-600/5 blur-[140px] kn-blob-3" />
      </div>

      {/* Subtle dot grid pattern — knowledge constellation feel */}
      <div
        className="absolute inset-0 opacity-40 dark:opacity-[0.35] [background-image:radial-gradient(circle,rgba(15,23,42,0.06)_1px,transparent_1px)] dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.04)_1px,transparent_1px)] transition-all duration-300"
        style={{
          backgroundSize: '32px 32px',
        }}
      />

      {/* Mouse-reactive radial glow */}
      {!prefersReducedMotion && (
        <div
          ref={glowRef}
          className="fixed w-[600px] h-[600px] rounded-full pointer-events-none will-change-transform"
          style={{
            background: 'radial-gradient(circle, rgba(37,99,235,0.04) 0%, transparent 70%)',
            transform: 'translate(-300px, -300px)',
          }}
        />
      )}
    </div>
  );
}
