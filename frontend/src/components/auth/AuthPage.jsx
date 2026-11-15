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
 *   Desktop: Left panel (mascot) | Right panel (card)
 *   Tablet:  Stacked (mascot above, form below)
 *   Mobile:  Single column (small mascot, full-width form)
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
    <div className="min-h-screen bg-[#FAF9F6] text-[#141413] dark:bg-[#0F1115] dark:text-[#F3F4F6] relative overflow-hidden transition-colors duration-200">
      <AnimatedBackground />

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* ===== Left Panel: Mascot Experience ===== */}
        <div className="flex-shrink-0 lg:flex-1 flex flex-col items-center justify-center p-6 pt-10 lg:p-12 lg:pt-12">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-6 lg:mb-10">
            <img src="/logo.svg" alt="Knowrizon" className="w-9 h-9 lg:w-10 lg:h-10" />
            <span className="text-lg lg:text-xl font-bold tracking-tight text-slate-900 dark:text-white">Knowrizon</span>
          </div>

          {/* Mascot */}
          <AuthMascot formState={formState} passwordStrength={passwordStrength} />

          {/* Tagline (desktop only) */}
          <p className="mt-6 lg:mt-10 text-xs sm:text-sm text-slate-600 dark:text-slate-400 text-center max-w-xs hidden lg:block leading-relaxed font-medium">
            Your personal Socratic AI study companion is ready to help you learn faster.
          </p>
        </div>

        {/* ===== Right Panel: Auth Form ===== */}
        <div className="flex-1 flex items-center justify-center p-5 pb-10 lg:p-12">
          <div className="w-full max-w-[420px]">
            {/* Card */}
            <div className="bg-white dark:bg-[#161920] rounded-3xl p-7 md:p-8 shadow-md border border-slate-200/90 dark:border-white/[0.08]">
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
                <div className="flex-1 h-px bg-slate-200 dark:border-white/[0.08]" />
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">or</span>
                <div className="flex-1 h-px bg-slate-200 dark:border-white/[0.08]" />
              </div>
              <button
                onClick={handleGuest}
                disabled={formState === 'loading'}
                className="w-full py-3 px-6 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all cursor-pointer disabled:opacity-50"
              >
                Continue as Guest
              </button>
            </div>

            {/* Back to home */}
            <button
              onClick={onBack}
              className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors py-2 font-medium cursor-pointer"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
