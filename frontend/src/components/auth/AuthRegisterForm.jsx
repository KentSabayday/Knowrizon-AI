import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Check, X } from 'lucide-react';

/**
 * AuthRegisterForm — Premium signup with password strength meter and mascot events.
 *
 * Preserves exact authentication logic from original RegisterForm.
 * Adds: password strength indicator, match check, icon inputs, mascot event callbacks.
 */

function getPasswordStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['', '#EF4444', '#F59E0B', '#22C7FF', '#10B981'];
const STRENGTH_EMOJI = ['', '😟', '🤔', '💪', '🔥'];

export function AuthRegisterForm({ onSwitchToLogin, onSuccess, onFormStateChange, onPasswordStrength }) {
  const { register, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 ? password === confirmPassword : null;
  const displayError = localError || error;

  const emitState = (state) => onFormStateChange?.(state);

  const handlePasswordChange = (e) => {
    const pw = e.target.value;
    setPassword(pw);
    const s = getPasswordStrength(pw);
    onPasswordStrength?.(s);
    emitState('password-typing');
  };

  const togglePassword = () => {
    const next = !showPassword;
    setShowPassword(next);
    emitState(next ? 'password-visible' : 'password-focus');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      emitState('error');
      setTimeout(() => emitState('idle'), 2500);
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      emitState('error');
      setTimeout(() => emitState('idle'), 2500);
      return;
    }

    setIsLoading(true);
    emitState('loading');

    const result = await register(email, password, name);
    setIsLoading(false);

    if (result.success) {
      emitState('success');
      setTimeout(() => onSuccess?.(), 1800);
    } else {
      emitState('error');
      setTimeout(() => emitState('idle'), 2500);
    }
  };

  /* Shared input class */
  const inputCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#22C7FF]/40 focus:ring-2 focus:ring-[#22C7FF]/15 transition-all duration-200 disabled:opacity-50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <h2 className="text-2xl font-bold text-white text-center mb-1">Create your account</h2>
      <p className="text-sm text-[#64748B] text-center mb-7">Start your learning journey with Knowri</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Name */}
        <div className="relative group">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#475569] group-focus-within:text-[#22C7FF] transition-colors" />
          <input
            id="auth-reg-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); emitState('name-typing'); }}
            onFocus={() => emitState('name-focus')}
            onBlur={() => emitState('idle')}
            placeholder="Your name"
            required
            disabled={isLoading}
            aria-label="Full name"
            className={inputCls}
          />
        </div>

        {/* Email */}
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#475569] group-focus-within:text-[#22C7FF] transition-colors" />
          <input
            id="auth-reg-email"
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
        <div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#475569] group-focus-within:text-[#22C7FF] transition-colors" />
            <input
              id="auth-reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              onFocus={() => emitState('password-focus')}
              onBlur={() => emitState('idle')}
              placeholder="Password"
              required
              disabled={isLoading}
              autoComplete="new-password"
              aria-label="Password"
              className={`${inputCls} !pr-12`}
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

          {/* Password strength meter */}
          {password.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2.5 flex items-center gap-2.5"
            >
              <div className="flex-1 flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className="h-1.5 flex-1 rounded-full transition-all duration-400"
                    style={{
                      backgroundColor: strength >= level ? STRENGTH_COLORS[strength] : 'rgba(255,255,255,0.06)',
                      boxShadow: strength >= level ? `0 0 8px ${STRENGTH_COLORS[strength]}30` : 'none',
                    }}
                  />
                ))}
              </div>
              <span className="text-xs font-medium flex items-center gap-1" style={{ color: STRENGTH_COLORS[strength] }}>
                <span>{STRENGTH_EMOJI[strength]}</span>
                {STRENGTH_LABELS[strength]}
              </span>
            </motion.div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#475569] group-focus-within:text-[#22C7FF] transition-colors" />
          <input
            id="auth-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); emitState('confirm-typing'); }}
            onFocus={() => emitState('confirm-focus')}
            onBlur={() => emitState('idle')}
            placeholder="Confirm password"
            required
            disabled={isLoading}
            autoComplete="new-password"
            aria-label="Confirm password"
            className={`${inputCls} !pr-11`}
          />
          {passwordsMatch !== null && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              {passwordsMatch ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <Check className="w-4 h-4 text-emerald-400" />
                </motion.div>
              ) : (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <X className="w-4 h-4 text-red-400" />
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {displayError && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex items-start gap-3 px-4 py-3 text-sm text-red-300 bg-red-500/8 border border-red-500/15 rounded-xl"
          >
            <span className="text-base mt-0.5">😅</span>
            <span>{displayError}</span>
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
              Creating account...
            </>
          ) : (
            <>
              Create Account
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      {/* Switch to login */}
      <p className="mt-7 text-center text-sm text-[#64748B]">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-[#22C7FF] hover:text-[#5B5FFF] font-medium transition-colors"
        >
          Sign in
        </button>
      </p>
    </motion.div>
  );
}
