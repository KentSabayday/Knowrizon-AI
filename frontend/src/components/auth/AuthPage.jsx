import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { AnimatedBackground } from '../landing/AnimatedBackground';
import { AuthMascot } from './AuthMascot';
import { AuthLoginForm } from './AuthLoginForm';
import { AuthRegisterForm } from './AuthRegisterForm';
import '../landing/landing.css';

/**
 * AuthPage — Full-page authentication experience with interactive Knowri mascot.
 *
 * Layout:
 *   Desktop: Left panel (mascot) | Right panel (glass card)
 *   Tablet:  Stacked (mascot above, form below)
 *   Mobile:  Single column (small mascot, full-width form)
 *
 * The mascot reacts to every user action via the formState prop chain:
 *   Form input event → emitState() → setFormState() → AuthMascot props → CSS class → Animation
 */
export function AuthPage({ mode = 'login', onBack, onSuccess }) {
  const { continueAnonymously } = useAuth();
  const [authMode, setAuthMode] = useState(mode);
  const [formState, setFormState] = useState('idle');
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleFormStateChange = useCallback((state) => {
    setFormState(state);
  }, []);

  const handleGuest = async () => {
    setFormState('guest');
    const result = await continueAnonymously();
    if (result.success) {
      setFormState('success');
      setTimeout(() => onSuccess?.(), 1200);
    } else {
      setFormState('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-white relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* ===== Left Panel: Mascot Experience ===== */}
        <div className="flex-shrink-0 lg:flex-1 flex flex-col items-center justify-center p-6 pt-10 lg:p-12 lg:pt-12">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-6 lg:mb-10">
            <img src="/logo.svg" alt="Knowrizon" className="w-9 h-9 lg:w-10 lg:h-10" />
            <span className="text-lg lg:text-xl font-bold kn-gradient-text">Knowrizon</span>
          </div>

          {/* Mascot */}
          <AuthMascot formState={formState} passwordStrength={passwordStrength} />

          {/* Tagline (desktop only) */}
          <p className="mt-6 lg:mt-10 text-sm text-[#475569] text-center max-w-xs hidden lg:block leading-relaxed">
            Your AI study companion is ready to help you learn smarter, not harder.
          </p>
        </div>

        {/* ===== Right Panel: Auth Form ===== */}
        <div className="flex-1 flex items-center justify-center p-5 pb-10 lg:p-12">
          <div className="w-full max-w-[420px]">
            {/* Glass card */}
            <div className="kn-glass rounded-3xl p-7 md:p-8 shadow-2xl shadow-black/30">
              <AnimatePresence mode="wait">
                {authMode === 'login' ? (
                  <AuthLoginForm
                    key="login"
                    onSwitchToRegister={() => { setAuthMode('register'); setFormState('idle'); }}
                    onSuccess={onSuccess}
                    onFormStateChange={handleFormStateChange}
                  />
                ) : (
                  <AuthRegisterForm
                    key="register"
                    onSwitchToLogin={() => { setAuthMode('login'); setFormState('idle'); }}
                    onSuccess={onSuccess}
                    onFormStateChange={handleFormStateChange}
                    onPasswordStrength={setPasswordStrength}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Divider + Anonymous */}
            <div className="mt-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-xs text-[#475569]">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
              <button
                onClick={handleGuest}
                disabled={formState === 'loading'}
                className="w-full py-3 px-6 text-sm text-[#94A3B8] rounded-xl border border-white/[0.08] hover:border-white/[0.15] hover:text-white hover:bg-white/[0.03] transition-all duration-300 disabled:opacity-50"
              >
                Continue without account
              </button>
            </div>

            {/* Back to home */}
            <button
              onClick={onBack}
              className="mt-4 w-full text-center text-sm text-[#475569] hover:text-[#94A3B8] transition-colors py-2"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
