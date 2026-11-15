import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import {
  User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Check, X,
  GraduationCap, Building2, Layers, CheckCircle2, Shield, Sparkles
} from 'lucide-react';

/**
 * AuthRegisterForm — Student-Only Institutional Registration (.edu.ph)
 * Strictly scopes student signup to verified Philippine educational emails (.edu.ph),
 * associates institution school, binds degree program / course, collegiate year level,
 * and automatically migrates the learner into their designated academic department.
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
const STRENGTH_COLORS = ['', '#EF4444', '#F59E0B', '#2563EB', '#10B981'];
const STRENGTH_EMOJI = ['', '😟', '🤔', '💪', '🔥'];

const COURSE_OPTIONS = [
  { code: 'BSA', label: 'BSA - Bachelor of Science in Accountancy', dept: 'College of Accountancy', dean: 'Dr. Arthur Dean' },
  { code: 'BSCS', label: 'BSCS - Bachelor of Science in Computer Science', dept: 'College of Computer Studies', dean: 'College Leadership' },
  { code: 'BSIT', label: 'BSIT - Bachelor of Science in Information Technology', dept: 'College of Computer Studies', dean: 'College Leadership' },
  { code: 'BSCE', label: 'BSCE - Bachelor of Science in Civil Engineering', dept: 'College of Engineering', dean: 'College Leadership' },
  { code: 'BSN', label: 'BSN - Bachelor of Science in Nursing', dept: 'College of Nursing', dean: 'College Leadership' },
  { code: 'BSCRIM', label: 'BSCRIM - Bachelor of Science in Criminology', dept: 'College of Criminal Justice Education', dean: 'College Leadership' },
];

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export function AuthRegisterForm({ onSwitchToLogin, onSuccess, onFormStateChange, onPasswordStrength }) {
  const { register, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [course, setCourse] = useState('BSA - Bachelor of Science in Accountancy');
  const [yearLevel, setYearLevel] = useState('1st Year');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 ? password === confirmPassword : null;
  const isEduPh = email.trim().toLowerCase().endsWith('.edu.ph');
  const displayError = localError || error;

  const selectedCourseObj = useMemo(() => {
    return COURSE_OPTIONS.find(c => c.label === course) || COURSE_OPTIONS[0];
  }, [course]);

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

    // Strict Institutional Email check (.edu.ph)
    if (!email.trim().toLowerCase().endsWith('.edu.ph')) {
      setLocalError('Registration is strictly for students: Please use an official Philippine institutional educational email ending with .edu.ph (e.g., student@urios.edu.ph).');
      emitState('error');
      setTimeout(() => emitState('idle'), 3000);
      return;
    }

    if (!school.trim()) {
      setLocalError('Please enter your School or University name');
      emitState('error');
      setTimeout(() => emitState('idle'), 2500);
      return;
    }

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

    const result = await register(
      email.trim(),
      password,
      name.trim(),
      school.trim(),
      course,
      yearLevel
    );
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
  const inputCls = 'w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl pl-11 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-white/[0.06] focus:ring-2 focus:ring-blue-500/15 transition-all duration-200 disabled:opacity-50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="max-h-[85vh] overflow-y-auto pr-1"
    >
      {/* Student Badge & Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 mb-2">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Student Account Registration</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Create your student account</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">
          Sign up with your Philippine institutional email to join your department
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        {/* Full Name */}
        <div className="relative group">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:text-slate-500 dark:group-focus-within:text-blue-400 transition-colors" />
          <input
            id="auth-reg-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); emitState('name-typing'); }}
            onFocus={() => emitState('name-focus')}
            onBlur={() => emitState('idle')}
            placeholder="Full Name (e.g., Juan Dela Cruz)"
            required
            disabled={isLoading}
            aria-label="Full name"
            className={inputCls}
          />
        </div>

        {/* Institutional Email (.edu.ph) */}
        <div>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:text-slate-500 dark:group-focus-within:text-blue-400 transition-colors" />
            <input
              id="auth-reg-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); emitState('email-typing'); }}
              onFocus={() => emitState('email-focus')}
              onBlur={() => emitState('idle')}
              placeholder="Institutional Email (e.g., student@urios.edu.ph)"
              required
              disabled={isLoading}
              autoComplete="email"
              aria-label="Institutional email address ending in .edu.ph"
              className={`${inputCls} ${email.length > 0 ? (isEduPh ? '!border-emerald-500/80 !ring-emerald-500/20' : '!border-amber-400 !ring-amber-400/20') : ''}`}
            />
            {email.length > 0 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isEduPh ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
                    <Check className="w-3 h-3" />
                    <span>.edu.ph</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                    Requires .edu.ph
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pl-1">
            Institutional requirement: Must end strictly with <strong className="font-semibold text-blue-600 dark:text-blue-400">.edu.ph</strong>
          </p>
        </div>

        {/* School / University Input */}
        <div className="relative group">
          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:text-slate-500 dark:group-focus-within:text-blue-400 transition-colors" />
          <input
            id="auth-reg-school"
            type="text"
            list="ph-schools"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="School / University (e.g., Father Saturnino Urios University)"
            required
            disabled={isLoading}
            className={inputCls}
          />
          <datalist id="ph-schools">
            <option value="Father Saturnino Urios University (FSUU)" />
            <option value="University of the Philippines (UP)" />
            <option value="De La Salle University (DLSU)" />
            <option value="Ateneo de Manila University (ADMU)" />
            <option value="University of Santo Tomas (UST)" />
            <option value="Caraga State University (CSU)" />
            <option value="Polytechnic University of the Philippines (PUP)" />
            <option value="Far Eastern University (FEU)" />
            <option value="Mapúa University" />
          </datalist>
        </div>

        {/* Course / Degree Program Dropdown */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pl-1">
            <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
            <span>Collegiate Degree Program / Course</span>
          </label>
          <div className="relative">
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              disabled={isLoading}
              className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 cursor-pointer transition-colors"
            >
              {COURSE_OPTIONS.map((c) => (
                <option key={c.code} value={c.label} className="bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {/* Department Migration Target Notice */}
          <div className="p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-semibold">
              <Shield className="w-3 h-3 text-indigo-500" />
              <span>Assigned Department:</span>
            </div>
            <span className="font-bold text-indigo-900 dark:text-indigo-200">
              {selectedCourseObj.dept}
            </span>
          </div>
        </div>

        {/* Year Level Dropdown */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pl-1">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Standing Year Level</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {YEAR_LEVELS.map((yr) => {
              const isSelected = yearLevel === yr;
              return (
                <button
                  type="button"
                  key={yr}
                  onClick={() => setYearLevel(yr)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:border-blue-400'
                  }`}
                >
                  {yr}
                </button>
              );
            })}
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:text-slate-500 dark:group-focus-within:text-blue-400 transition-colors" />
            <input
              id="auth-reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              onFocus={() => emitState('password-focus')}
              onBlur={() => emitState('idle')}
              placeholder="Create password"
              required
              disabled={isLoading}
              autoComplete="new-password"
              aria-label="Password"
              className={`${inputCls} !pr-10`}
            />
            <button
              type="button"
              onClick={togglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-all cursor-pointer"
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
              className="mt-2 flex items-center gap-2"
            >
              <div className="flex-1 flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className="h-1.5 flex-1 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: strength >= level ? STRENGTH_COLORS[strength] : 'rgba(148, 163, 184, 0.25)',
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: STRENGTH_COLORS[strength] }}>
                <span>{STRENGTH_EMOJI[strength]}</span>
                {STRENGTH_LABELS[strength]}
              </span>
            </motion.div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="relative group">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:text-slate-500 dark:group-focus-within:text-blue-400 transition-colors" />
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
            className={`${inputCls} !pr-10`}
          />
          {passwordsMatch !== null && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {passwordsMatch ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </motion.div>
              ) : (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <X className="w-4 h-4 text-rose-500" />
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Error Notification */}
        {displayError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl leading-relaxed"
          >
            <span className="text-sm mt-0.5">⚠️</span>
            <span>{displayError}</span>
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="kn-btn-primary w-full py-3 px-6 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying & creating student account...</span>
            </>
          ) : (
            <>
              <span>Create Student Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to login */}
      <p className="mt-5 text-center text-xs text-slate-600 dark:text-slate-400 font-medium">
        Already registered?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-600 dark:text-blue-400 hover:underline font-semibold transition-colors cursor-pointer"
        >
          Sign in
        </button>
      </p>
    </motion.div>
  );
}

export default AuthRegisterForm;