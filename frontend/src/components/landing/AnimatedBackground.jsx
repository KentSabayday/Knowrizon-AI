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
      {/* Deep navy base */}
      <div className="absolute inset-0 bg-[#0B1220]" />

      {/* Aurora gradient mesh — signature Knowrizon identity */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -top-[20%] -left-[10%] w-[55%] h-[55%] rounded-full bg-[#22C7FF]/20 blur-[120px] kn-blob-1" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-[#5B5FFF]/15 blur-[120px] kn-blob-2" />
        <div className="absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] rounded-full bg-[#22C7FF]/8 blur-[120px] kn-blob-3" />
      </div>

      {/* Subtle dot grid pattern — knowledge constellation feel */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Mouse-reactive radial glow */}
      {!prefersReducedMotion && (
        <div
          ref={glowRef}
          className="fixed w-[600px] h-[600px] rounded-full pointer-events-none will-change-transform"
          style={{
            background: 'radial-gradient(circle, rgba(34,199,255,0.06) 0%, transparent 70%)',
            transform: 'translate(-300px, -300px)',
          }}
        />
      )}
    </div>
  );
}
