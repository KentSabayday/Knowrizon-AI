import { useState, useEffect, useRef } from 'react';
import { KnowrizonMascot } from '../ui/KnowrizonMascot';
import './auth-page.css';

/**
 * AuthMascot — Emotion-driven mascot wrapper for authentication pages.
 *
 * Maps form events to Knowri's state machine + CSS arm transforms.
 * Includes idle personality, sleep/wake cycle, and celebration effects.
 *
 * Signature feature: Knowri covers eyes during password entry 🙈
 */

const FORM_TO_MASCOT = {
  idle: 'idle',
  'email-focus': 'listening',
  'email-typing': 'typing',
  'name-focus': 'greeting',
  'name-typing': 'typing',
  'password-focus': 'idle',
  'password-typing': 'idle',
  'password-visible': 'idle',
  'confirm-focus': 'idle',
  'confirm-typing': 'idle',
  loading: 'thinking',
  success: 'celebrating',
  error: 'error',
  guest: 'greeting',
};

export function AuthMascot({ formState = 'idle', passwordStrength = 0 }) {
  const [sleepPhase, setSleepPhase] = useState('active');
  const [showConfetti, setShowConfetti] = useState(false);
  const inactivityRef = useRef(0);
  const sleepIntervalRef = useRef(null);

  const mascotState = FORM_TO_MASCOT[formState] || 'idle';
  const isPasswordMode = formState === 'password-focus' || formState === 'password-typing';
  const isPeekMode = formState === 'password-visible';

  // ===== Sleep/Wake Cycle =====
  // 8s → yawn, 15s → drowsy, 30s → sleep
  useEffect(() => {
    if (formState !== 'idle') {
      setSleepPhase('active');
      inactivityRef.current = 0;
      return;
    }

    sleepIntervalRef.current = setInterval(() => {
      inactivityRef.current++;
      if (inactivityRef.current >= 30) setSleepPhase('sleeping');
      else if (inactivityRef.current >= 15) setSleepPhase('drowsy');
      else if (inactivityRef.current >= 8) setSleepPhase('yawning');
    }, 1000);

    return () => { if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current); };
  }, [formState]);

  // Wake on any interaction
  useEffect(() => {
    const wake = () => {
      inactivityRef.current = 0;
      if (sleepPhase !== 'active') setSleepPhase('active');
    };
    window.addEventListener('mousemove', wake, { passive: true });
    window.addEventListener('keydown', wake, { passive: true });
    return () => {
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, [sleepPhase]);

  // ===== Success Confetti =====
  useEffect(() => {
    if (formState === 'success') {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(t);
    }
  }, [formState]);

  // ===== Build CSS class list =====
  const containerCls = [
    'auth-mascot-container',
    isPasswordMode && 'auth-mascot-password',
    isPeekMode && 'auth-mascot-peek',
    sleepPhase === 'sleeping' && 'auth-mascot-sleep',
    sleepPhase === 'drowsy' && 'auth-mascot-drowsy',
    formState === 'success' && 'auth-mascot-success',
    isPasswordMode && passwordStrength <= 1 && 'auth-pw-weak',
    isPasswordMode && passwordStrength === 2 && 'auth-pw-fair',
    isPasswordMode && passwordStrength === 3 && 'auth-pw-strong',
    isPasswordMode && passwordStrength >= 4 && 'auth-pw-very-strong',
  ].filter(Boolean).join(' ');

  const effectiveState =
    sleepPhase === 'sleeping' || sleepPhase === 'drowsy'
      ? 'sleep'
      : mascotState;

  return (
    <div className={containerCls}>
      {/* Ambient glow (reacts to password strength) */}
      <div className="auth-mascot-glow" />

      {/* Mascot (SVG untouched — CSS handles arm transforms) */}
      <div className="auth-mascot-inner">
        <KnowrizonMascot
          state={effectiveState}
          className="w-[180px] md:w-[240px] lg:w-[280px]"
          autoGreet={true}
        />
      </div>

      {/* Sleep Z particles */}
      {sleepPhase === 'sleeping' && (
        <div className="auth-sleep-zs" aria-hidden="true">
          <span className="auth-z auth-z-1">z</span>
          <span className="auth-z auth-z-2">z</span>
          <span className="auth-z auth-z-3">Z</span>
        </div>
      )}

      {/* Success confetti burst */}
      {showConfetti && (
        <div className="auth-confetti" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className="auth-confetti-piece"
              style={{
                '--x': `${-70 + Math.random() * 140}px`,
                '--r': `${Math.random() * 720 - 360}deg`,
                '--d': `${0.6 + Math.random() * 1.2}s`,
                left: `${10 + Math.random() * 80}%`,
                backgroundColor: ['#22C7FF', '#5B5FFF', '#10B981', '#F59E0B', '#EF4444', '#EC4899'][i % 6],
              }}
            />
          ))}
        </div>
      )}

      {/* Floating knowledge icons */}
      <div className="auth-floating-icons" aria-hidden="true">
        <span className="auth-float-icon auth-fi-1">📚</span>
        <span className="auth-float-icon auth-fi-2">🎓</span>
        <span className="auth-float-icon auth-fi-3">✨</span>
        <span className="auth-float-icon auth-fi-4">🧠</span>
      </div>
    </div>
  );
}
