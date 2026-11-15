import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Sparkles, User, Shield } from 'lucide-react';

/**
 * AuthLoginForm — Human-crafted login with tactile inputs and instant demo access.
 *
 * Preserves exact authentication logic from original LoginForm.
 * Adds: icon inputs, password visibility toggle, focus/blur/typing events
 * for the AuthMascot emotion engine, animated error messages, and solid craft CTA.
 */
export function AuthLoginForm({ onSwitchToRegister, onSuccess, onFormStateChange, onGuestAccess }) {
  const { login, error, clearError, continueAnonymously } = useAuth();
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

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    emitState('email-typing');
  };

  const inputCls = "w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-white/[0.06] focus:ring-2 focus:ring-blue-500/15 transition-all duration-200 disabled:opacity-50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-1">Welcome back</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-7 font-medium">Sign in to continue learning with Knowri</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email */}
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 group-focus-within:text-blue-600 dark:text-slate-500 dark:group-focus-within:text-blue-400 transition-colors" />
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
            className={inputCls}
          />
        </div>

        {/* Password */}
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 group-focus-within:text-blue-600 dark:text-slate-500 dark:group-focus-within:text-blue-400 transition-colors" />
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
            className={`${inputCls} !pr-12`}
          />
          <button
            type="button"
            onClick={togglePassword}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-white/[0.05] transition-all cursor-pointer"
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
            className="flex items-start gap-3 px-4 py-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl"
          >
            <span className="text-base mt-0.5">😅</span>
            <span>{error === 'Login failed' ? "Let's try that again — check your email and password." : error}</span>
          </motion.div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="kn-btn-primary w-full py-3.5 px-6 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Instant Demo Access Segmented Row */}
      <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/[0.08] text-center space-y-2">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Instant demo access:</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('student@example.com', 'student123')}
            className="py-1.5 px-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-800/40 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Try as Student</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill('admin@knowrizon.ai', 'AdminPassword123!')}
            className="py-1.5 px-2.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200/80 dark:bg-purple-950/30 dark:border-purple-800/40 dark:text-purple-300 text-[11px] font-semibold hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Try as Admin</span>
          </button>
        </div>
      </div>

      {/* Switch to register */}
      <p className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400 font-medium">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-blue-600 dark:text-blue-400 hover:underline font-semibold transition-colors cursor-pointer"
        >
          Sign up
        </button>
      </p>
    </motion.div>
  );
}

export default AuthLoginForm;
