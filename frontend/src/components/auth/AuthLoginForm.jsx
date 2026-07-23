import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

/**
 * AuthLoginForm — Premium glassmorphism login with mascot-event callbacks.
 *
 * Preserves exact authentication logic from original LoginForm.
 * Adds: icon inputs, password visibility toggle, focus/blur/typing events
 * for the AuthMascot emotion engine, animated error messages, and gradient CTA.
 */
export function AuthLoginForm({ onSwitchToRegister, onSuccess, onFormStateChange }) {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emitState = (state) => onFormStateChange?.(state);

  const togglePassword = () => {
    const next = !showPassword;
    setShowPassword(next);
    emitState(next ? 'password-visible' : 'password-focus');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setIsLoading(true);
    emitState('loading');

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      emitState('success');
      setTimeout(() => onSuccess?.(), 1500);
    } else {
      emitState('error');
      setTimeout(() => emitState('idle'), 2500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <h2 className="text-2xl font-bold text-white text-center mb-1">Welcome back</h2>
      <p className="text-sm text-[#64748B] text-center mb-8">Sign in to continue learning with Knowri</p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Email */}
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#475569] group-focus-within:text-[#22C7FF] transition-colors" />
          <input
            id="auth-login-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); emitState('email-typing'); }}
            onFocus={() => emitState('email-focus')}
            onBlur={() => emitState('idle')}
            placeholder="Email address"
            required
            disabled={isLoading}
            autoComplete="email"
            aria-label="Email address"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#22C7FF]/40 focus:ring-2 focus:ring-[#22C7FF]/15 transition-all duration-200 disabled:opacity-50"
          />
        </div>

        {/* Password */}
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#475569] group-focus-within:text-[#22C7FF] transition-colors" />
          <input
            id="auth-login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); emitState('password-typing'); }}
            onFocus={() => emitState('password-focus')}
            onBlur={() => emitState('idle')}
            placeholder="Password"
            required
            disabled={isLoading}
            autoComplete="current-password"
            aria-label="Password"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-12 pr-12 py-3.5 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#22C7FF]/40 focus:ring-2 focus:ring-[#22C7FF]/15 transition-all duration-200 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={togglePassword}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#475569] hover:text-[#94A3B8] hover:bg-white/[0.05] transition-all"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex items-start gap-3 px-4 py-3 text-sm text-red-300 bg-red-500/8 border border-red-500/15 rounded-xl"
          >
            <span className="text-base mt-0.5">😅</span>
            <span>{error === 'Login failed' ? "Let's try that again — check your email and password." : error}</span>
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="group w-full py-3.5 px-6 text-sm font-semibold text-white rounded-xl kn-gradient-btn flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      {/* Switch to register */}
      <p className="mt-8 text-center text-sm text-[#64748B]">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-[#22C7FF] hover:text-[#5B5FFF] font-medium transition-colors"
        >
          Sign up
        </button>
      </p>
    </motion.div>
  );
}
