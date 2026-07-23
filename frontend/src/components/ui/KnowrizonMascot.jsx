import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './knowrizon-mascot.css';

/**
 * Knowri — Knowrizon AI Animated Mascot
 *
 * A premium SVG-based animated robot character with:
 * - 15 animation states (idle, greeting, thinking, etc.)
 * - Smooth cursor-following eye tracking with lerp interpolation
 * - Random organic idle behaviors (blink, look around)
 * - Entrance animation sequence
 * - Hover/click micro-interactions
 * - Dark mode support, reduced motion, tab visibility pause
 *
 * Designed as a scalable brand character for the Knowrizon AI platform.
 */

export const MASCOT_STATES = {
  IDLE: 'idle',
  GREETING: 'greeting',
  THINKING: 'thinking',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
  TYPING: 'typing',
  SEARCHING: 'searching',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  CONFUSED: 'confused',
  CELEBRATING: 'celebrating',
  SLEEP: 'sleep',
  WAKE: 'wake',
  NOTIFICATION: 'notification',
};

const MOUTH_PATHS = {
  idle:        'M 135 118 Q 150 127 165 118',
  greeting:    'M 132 116 Q 150 130 168 116',
  thinking:    'M 138 120 L 162 120',
  listening:   'M 135 118 Q 150 125 165 118',
  speaking:    'M 134 117 Q 150 129 166 117',
  typing:      'M 135 118 Q 150 125 165 118',
  searching:   'M 138 120 L 162 120',
  loading:     'M 138 120 L 162 120',
  success:     'M 130 115 Q 150 133 170 115',
  celebrating: 'M 130 115 Q 150 133 170 115',
  error:       'M 136 124 Q 150 118 164 124',
  confused:    'M 138 122 Q 150 118 162 122',
  sleep:       'M 142 120 L 158 120',
  wake:        'M 132 116 Q 150 130 168 116',
  notification:'M 135 118 Q 150 127 165 118',
};

const MAX_PUPIL_OFFSET = 5;

export function KnowrizonMascot({
  state: externalState,
  size,
  className = '',
  autoGreet = true,
}) {
  // === Refs ===
  const containerRef = useRef(null);
  const leftPupilRef = useRef(null);
  const rightPupilRef = useRef(null);
  const leftHighlightRef = useRef(null);
  const rightHighlightRef = useRef(null);
  const targetPupilRef = useRef({ x: 0, y: 0 });
  const currentPupilRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);
  const blinkTimerRef = useRef(null);
  const idleLookTimerRef = useRef(null);
  const mouseActiveRef = useRef(false);

  // === State ===
  const [internalState, setInternalState] = useState(autoGreet ? 'greeting' : 'idle');
  const [isVisible, setIsVisible] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);

  const currentState = externalState || internalState;
  const isThinking = ['thinking', 'searching', 'loading'].includes(currentState);
  const isSleeping = currentState === 'sleep';

  // === Accessibility ===
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // === Entrance Animation: Opacity → Float Up → Glow → Wave → Idle ===
  useEffect(() => {
    const visTimer = setTimeout(() => setIsVisible(true), 200);
    let greetTimer, waveEndTimer;
    if (autoGreet && !externalState) {
      greetTimer = setTimeout(() => {
        setIsWaving(true);
        waveEndTimer = setTimeout(() => {
          setIsWaving(false);
          setInternalState('idle');
        }, 2200);
      }, 900);
    }
    return () => {
      clearTimeout(visTimer);
      if (greetTimer) clearTimeout(greetTimer);
      if (waveEndTimer) clearTimeout(waveEndTimer);
    };
  }, [autoGreet, externalState]);

  // === Tab Visibility: Pause animations when tab is hidden ===
  useEffect(() => {
    const handler = () => setIsTabActive(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // === Random Blinking: 2.5–7s interval with occasional slow blinks ===
  useEffect(() => {
    if (prefersReducedMotion || !isTabActive || isSleeping) return;

    const scheduleBlink = () => {
      const delay = 2500 + Math.random() * 4500;
      blinkTimerRef.current = setTimeout(() => {
        setIsBlinking(true);
        const blinkDuration = Math.random() > 0.75 ? 250 : 150;
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, blinkDuration);
      }, delay);
    };
    scheduleBlink();
    return () => { if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current); };
  }, [prefersReducedMotion, isTabActive, isSleeping]);

  // === Eye Tracking: Mouse cursor → angle → limited radius ===
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current || prefersReducedMotion || !isTabActive || isThinking || isSleeping) return;
    mouseActiveRef.current = true;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height * 0.22;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDist = Math.max(window.innerWidth, window.innerHeight) * 0.5;
    const normalized = Math.min(distance / maxDist, 1);

    targetPupilRef.current = {
      x: Math.cos(angle) * MAX_PUPIL_OFFSET * normalized,
      y: Math.sin(angle) * MAX_PUPIL_OFFSET * Math.min(normalized, 0.8),
    };
  }, [prefersReducedMotion, isTabActive, isThinking, isSleeping]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // === Smooth Pupil Interpolation via requestAnimationFrame ===
  useEffect(() => {
    if (prefersReducedMotion) return;

    const lerp = (a, b, t) => a + (b - a) * t;
    const animate = () => {
      const t = targetPupilRef.current;
      const c = currentPupilRef.current;
      c.x = lerp(c.x, t.x, 0.08);
      c.y = lerp(c.y, t.y, 0.08);
      if (Math.abs(c.x - t.x) < 0.01) c.x = t.x;
      if (Math.abs(c.y - t.y) < 0.01) c.y = t.y;

      const tx = `translate(${c.x}px, ${c.y}px)`;
      [leftPupilRef, rightPupilRef, leftHighlightRef, rightHighlightRef].forEach(ref => {
        if (ref.current) ref.current.style.transform = tx;
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [prefersReducedMotion]);

  // === Random Idle Look: Organic glance directions ===
  useEffect(() => {
    if (prefersReducedMotion || !isTabActive || currentState !== 'idle') return;

    const scheduleIdleLook = () => {
      const delay = 5000 + Math.random() * 10000;
      idleLookTimerRef.current = setTimeout(() => {
        if (mouseActiveRef.current) {
          mouseActiveRef.current = false;
          scheduleIdleLook();
          return;
        }
        const dirs = [
          { x: -3, y: -1 }, { x: 3, y: -1 }, { x: 0, y: -3 },
          { x: -2, y: -2 }, { x: 2, y: -2 }, { x: 0, y: 0 },
        ];
        targetPupilRef.current = dirs[Math.floor(Math.random() * dirs.length)];
        setTimeout(() => { targetPupilRef.current = { x: 0, y: 0 }; }, 1000 + Math.random() * 1500);
        scheduleIdleLook();
      }, delay);
    };
    scheduleIdleLook();
    return () => { if (idleLookTimerRef.current) clearTimeout(idleLookTimerRef.current); };
  }, [prefersReducedMotion, isTabActive, currentState]);

  // === Thinking State: Eyes look upward ===
  useEffect(() => {
    if (isThinking && !prefersReducedMotion) {
      targetPupilRef.current = { x: 0, y: -4 };
    }
  }, [isThinking, prefersReducedMotion]);

  // === Micro-interactions ===
  const handleClick = useCallback(() => {
    if (prefersReducedMotion) return;
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 400);
  }, [prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    mouseActiveRef.current = false;
    if (!isThinking) targetPupilRef.current = { x: 0, y: 0 };
  }, [isThinking]);

  // === Derived values ===
  const mouthPath = MOUTH_PATHS[currentState] || MOUTH_PATHS.idle;

  const cls = [
    'knowri-container',
    isVisible && 'knowri-visible',
    isHovered && 'knowri-hovered',
    isBouncing && 'knowri-bounce',
    isBlinking && 'knowri-blinking',
    isWaving && 'knowri-waving',
    !isTabActive && 'knowri-paused',
    prefersReducedMotion && 'knowri-reduced-motion',
    `knowri-state-${currentState}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className={cls}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="img"
      aria-label="Knowri, the Knowrizon AI learning assistant"
      style={size ? { width: size } : undefined}
    >
      <svg
        viewBox="0 0 300 400"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          {/* Body gradient */}
          <linearGradient id="knowriBodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5E9AFF" />
            <stop offset="100%" stopColor="#3567B8" />
          </linearGradient>

          {/* Head gradient */}
          <linearGradient id="knowriHeadGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6BA3FF" />
            <stop offset="100%" stopColor="#4A7FD4" />
          </linearGradient>

          {/* Eye glow gradient */}
          <radialGradient id="knowriEyeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7DD3FF" />
            <stop offset="100%" stopColor="#4F8BFF" />
          </radialGradient>

          {/* Antenna tip glow */}
          <radialGradient id="knowriAntennaGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4FF8FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#4FF8FF" stopOpacity="0" />
          </radialGradient>

          {/* Hover base gradient */}
          <linearGradient id="knowriBaseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5E9AFF" />
            <stop offset="100%" stopColor="#2D6CC5" />
          </linearGradient>

          {/* Ambient background glow */}
          <radialGradient id="knowriAmbientGrad" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#4F8BFF" stopOpacity="0.07" />
            <stop offset="70%" stopColor="#4F8BFF" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#4F8BFF" stopOpacity="0" />
          </radialGradient>

          {/* Chest indicator gradient */}
          <radialGradient id="knowriIndicatorGrad" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#4FFFCF" />
            <stop offset="100%" stopColor="#00CC9A" />
          </radialGradient>

          {/* Arm gradient */}
          <linearGradient id="knowriArmGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5994E8" />
            <stop offset="100%" stopColor="#4078CC" />
          </linearGradient>

          {/* Glow filter for eyes/indicator */}
          <filter id="knowriGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ====== LAYER 1: Ambient Glow (furthest back) ====== */}
        <circle
          cx="150" cy="180" r="140"
          fill="url(#knowriAmbientGrad)"
          className="knowri-ambient-glow"
        />

        {/* ====== LAYER 2: Ground Shadow ====== */}
        <ellipse
          cx="150" cy="355" rx="60" ry="10"
          fill="rgba(0,0,0,0.12)"
          className="knowri-ground-shadow"
        />

        {/* ====== LAYER 3: Floating Character ====== */}
        <g className="knowri-float-group">

          {/* --- Hover Base --- */}
          <g>
            {/* Rotating dashed ring */}
            <circle
              cx="150" cy="290" r="48"
              fill="none" stroke="#4F8BFF" strokeWidth="1"
              strokeDasharray="4 8" opacity="0.3"
              className="knowri-base-ring"
            />
            {/* Soft glow disc */}
            <ellipse
              cx="150" cy="290" rx="52" ry="14"
              fill="rgba(79,139,255,0.12)"
              className="knowri-base-glow-el"
            />
            {/* Main base disc */}
            <ellipse
              cx="150" cy="290" rx="42" ry="10"
              fill="url(#knowriBaseGrad)" stroke="#6BA3FF" strokeWidth="1"
            />
            {/* Inner ring detail */}
            <ellipse
              cx="150" cy="290" rx="30" ry="6"
              fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"
            />
            {/* Light streak */}
            <ellipse
              cx="150" cy="288" rx="20" ry="3"
              fill="rgba(255,255,255,0.15)"
            />
          </g>

          {/* --- Body Group (breathes) --- */}
          <g className="knowri-body-group">

            {/* Left Arm */}
            <g className="knowri-left-arm">
              <path
                d="M 88 188 C 60 198, 42 222, 35 250"
                stroke="url(#knowriArmGrad)" strokeWidth="14"
                fill="none" strokeLinecap="round"
              />
              <path
                d="M 88 185 C 62 194, 46 216, 40 240"
                stroke="rgba(255,255,255,0.1)" strokeWidth="4"
                fill="none" strokeLinecap="round"
              />
              <circle cx="32" cy="256" r="14" fill="#5E9AFF" stroke="#6BA3FF" strokeWidth="1.5" />
              <circle cx="29" cy="252" r="4" fill="rgba(255,255,255,0.15)" />
            </g>

            {/* Right Arm (wave arm) */}
            <g className="knowri-right-arm">
              <path
                d="M 212 188 C 240 198, 258 222, 265 250"
                stroke="url(#knowriArmGrad)" strokeWidth="14"
                fill="none" strokeLinecap="round"
              />
              <path
                d="M 212 185 C 238 194, 254 216, 260 240"
                stroke="rgba(255,255,255,0.1)" strokeWidth="4"
                fill="none" strokeLinecap="round"
              />
              <circle cx="268" cy="256" r="14" fill="#5E9AFF" stroke="#6BA3FF" strokeWidth="1.5" />
              <circle cx="265" cy="252" r="4" fill="rgba(255,255,255,0.15)" />
            </g>

            {/* Body shape */}
            <rect
              x="88" y="155" width="124" height="115" rx="30"
              fill="url(#knowriBodyGrad)" stroke="#6BA3FF" strokeWidth="1.5"
            />
            {/* Body top highlight arc */}
            <path
              d="M 108 157 Q 150 150 192 157"
              stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"
              fill="none" strokeLinecap="round"
            />

            {/* Chest glassmorphism panel */}
            <rect
              x="108" y="172" width="84" height="52" rx="14"
              fill="rgba(255,255,255,0.07)"
              stroke="rgba(255,255,255,0.16)" strokeWidth="1"
            />

            {/* Chest indicator light */}
            <circle
              cx="150" cy="198" r="6"
              fill="url(#knowriIndicatorGrad)"
              filter="url(#knowriGlow)"
              className="knowri-indicator"
            />
          </g>

          {/* --- Head Group (sways) --- */}
          <g className="knowri-sway-group">

            {/* Ears (behind head) */}
            <circle cx="82" cy="90" r="10" fill="#4A86E0" stroke="#6BA3FF" strokeWidth="1" />
            <circle cx="218" cy="90" r="10" fill="#4A86E0" stroke="#6BA3FF" strokeWidth="1" />

            {/* Head shape */}
            <rect
              x="78" y="42" width="144" height="106" rx="32"
              fill="url(#knowriHeadGrad)" stroke="#6BA3FF" strokeWidth="1.5"
            />
            {/* Head top highlight arc */}
            <path
              d="M 100 44 Q 150 36 200 44"
              stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"
              fill="none" strokeLinecap="round"
            />

            {/* Antenna */}
            <line
              x1="150" y1="42" x2="150" y2="18"
              stroke="#6BA3FF" strokeWidth="3" strokeLinecap="round"
            />
            <circle
              cx="150" cy="14" r="11"
              fill="url(#knowriAntennaGlowGrad)"
              className="knowri-antenna-glow"
            />
            <circle cx="150" cy="14" r="6" fill="#4FDDFF" />

            {/* Face screen (visor) */}
            <rect
              x="92" y="56" width="116" height="74" rx="18"
              fill="#080E24"
              stroke="rgba(79,139,255,0.3)" strokeWidth="1"
            />

            {/* Scan line effect */}
            <rect
              x="92" y="56" width="116" height="2" rx="1"
              fill="rgba(79,139,255,0.08)"
              className="knowri-scanline"
            />

            {/* === Eyes === */}

            {/* Left Eye */}
            <g className="knowri-eye-left">
              <rect
                x="104" y="68" width="36" height="28" rx="9"
                fill="url(#knowriEyeGrad)" filter="url(#knowriGlow)"
              />
              <circle
                ref={leftPupilRef}
                cx="122" cy="82" r="7" fill="#FFFFFF"
                className="knowri-pupil"
              />
              <circle
                ref={leftHighlightRef}
                cx="119" cy="78" r="2.5"
                fill="rgba(255,255,255,0.65)"
                className="knowri-pupil-highlight"
              />
            </g>

            {/* Right Eye */}
            <g className="knowri-eye-right">
              <rect
                x="160" y="68" width="36" height="28" rx="9"
                fill="url(#knowriEyeGrad)" filter="url(#knowriGlow)"
              />
              <circle
                ref={rightPupilRef}
                cx="178" cy="82" r="7" fill="#FFFFFF"
                className="knowri-pupil"
              />
              <circle
                ref={rightHighlightRef}
                cx="175" cy="78" r="2.5"
                fill="rgba(255,255,255,0.65)"
                className="knowri-pupil-highlight"
              />
            </g>

            {/* Mouth */}
            <path
              d={mouthPath}
              stroke="#4F8BFF" strokeWidth="2.5"
              fill="none" strokeLinecap="round"
              className="knowri-mouth"
            />
          </g>

          {/* --- Thinking Particles (orbit around head center) --- */}
          <g className="knowri-thinking-particles">
            <circle cx="150" cy="95" r="3.5" fill="#4F8BFF" className="knowri-p1" />
            <circle cx="150" cy="95" r="2.5" fill="#5EC4FF" className="knowri-p2" />
            <circle cx="150" cy="95" r="2" fill="#8ED6FF" className="knowri-p3" />
          </g>

          {/* Thinking Halo (rotating dashed ring around head) */}
          <circle
            cx="150" cy="42" r="78"
            fill="none" stroke="#4F8BFF" strokeWidth="1.5"
            strokeDasharray="6 12"
            className="knowri-halo"
          />
        </g>
      </svg>
    </div>
  );
}

export default KnowrizonMascot;
