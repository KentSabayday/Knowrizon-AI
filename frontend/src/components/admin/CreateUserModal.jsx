import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, UserPlus, Mail, Lock, User, Shield, AlertCircle,
  Eye, EyeOff, Loader2, Check, GraduationCap, Building2, Calendar
} from 'lucide-react';
import { API_BASE } from '../../lib/api';

const ALL_ROLES = [
  { id: 'student', label: 'Student', desc: 'Standard learner access to AI workspace, classrooms, and retrieval quizzes' },
  { id: 'instructor', label: 'Instructor', desc: 'Faculty managing class schedules, student rosters, and learning materials' },
  { id: 'dean', label: 'Dean', desc: 'Department head governing faculty assignments, courses, and student cohorts' },
  { id: 'admin', label: 'Administrator', desc: 'Full institutional administrative access and platform governance' }
];

export function CreateUserModal({
  isOpen,
  onClose,
  token,
  onUserCreated,
  forDean = false,
  initialRole = 'instructor',
  defaultDepartmentId = '',
  defaultDepartmentName = '',
  defaultAcademicYearId = ''
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(forDean ? initialRole : 'student');
  const [status, setStatus] = useState('active');

  // Academic Ecosystem Hierarchy Fields
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearId, setAcademicYearId] = useState(defaultAcademicYearId || '');
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const availableRoles = forDean
    ? ALL_ROLES.filter(r => r.id === 'instructor' || r.id === 'student')
    : ALL_ROLES;

  useEffect(() => {
    if (isOpen) {
      if (forDean) {
        setRole(initialRole || 'instructor');
        if (defaultDepartmentId) setDepartmentId(defaultDepartmentId);
        if (defaultAcademicYearId) setAcademicYearId(defaultAcademicYearId);
      } else {
        setRole('student');
      }
      setName('');
      setEmail('');
      setPassword('');
      setError(null);
    }
  }, [isOpen, forDean, initialRole, defaultDepartmentId, defaultAcademicYearId]);

  useEffect(() => {
    if (isOpen && token) {
      // Fetch Academic Years and Departments
      const fetchAcademicMeta = async () => {
        try {
          const [yearsRes, deptsRes] = await Promise.all([
            fetch(`${API_BASE}/academic/years`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/academic/departments`, { headers: { 'Authorization': `Bearer ${token}` } })
          ]);

          if (yearsRes.ok) {
            const data = await yearsRes.json();
            setAcademicYears(data.years || []);
            if (!academicYearId) {
              if (defaultAcademicYearId) {
                setAcademicYearId(defaultAcademicYearId);
              } else if (data.activeYear) {
                setAcademicYearId(data.activeYear.id);
              } else if (data.years && data.years.length > 0) {
                setAcademicYearId(data.years[0].id);
              }
            }
          }

          if (deptsRes.ok && !forDean) {
            const data = await deptsRes.json();
            setDepartments(data.departments || []);
          }
        } catch (err) {
          console.warn('Failed to load academic metadata in CreateUserModal:', err);
        }
      };

      fetchAcademicMeta();
    }
  }, [isOpen, token, forDean, defaultAcademicYearId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Full name is required');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (forDean && (role === 'admin' || role === 'dean')) {
      setError('Deans cannot create Administrator or Dean accounts. Only Instructor and Student accounts are permitted.');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = forDean ? `${API_BASE}/academic/dean/users` : `${API_BASE}/admin/users`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          status,
          academic_year_id: academicYearId || defaultAcademicYearId || null,
          department_id: forDean ? (defaultDepartmentId || departmentId || null) : (departmentId || null)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      if (onUserCreated) onUserCreated(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-[#0F172A] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden text-white my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${
              forDean
                ? 'bg-gradient-to-tr from-purple-500 to-indigo-600 shadow-purple-500/20'
                : 'bg-gradient-to-tr from-[#22C7FF] to-[#5B5FFF] shadow-[#22C7FF]/20'
            }`}>
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {forDean ? 'Add Department Member' : 'Create New User'}
              </h2>
              <p className="text-[11px] text-[#94A3B8]">
                {forDean
                  ? 'Provision a new Faculty Instructor or Student for your department'
                  : 'Provision a new student, instructor, dean, or admin'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dean Notice */}
        {forDean && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2.5 text-purple-300 text-xs">
            <Shield className="w-4 h-4 shrink-0 text-purple-400" />
            <span>
              <strong>Dean Authority:</strong> You are authorized to create <strong>Instructors</strong> and <strong>Students</strong> for your department. Administrator account creation is strictly restricted.
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#CBD5E1]">Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'instructor' ? 'e.g. Dr. John Professor' : 'e.g. Jane Student'}
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#CBD5E1]">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@university.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#CBD5E1]">Temporary Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-10 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Academic Year & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Academic Year */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#CBD5E1] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Academic Year *</span>
              </label>
              <select
                required
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1E293B] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.year_string || ay.yearString} {ay.is_active || ay.isActive ? '(Active Term)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#CBD5E1] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Department</span>
              </label>
              {forDean ? (
                <div className="w-full px-3 py-2.5 bg-[#1E293B] border border-purple-500/30 rounded-xl text-xs text-white flex items-center justify-between">
                  <span className="font-semibold truncate">{defaultDepartmentName || 'Assigned Department'}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 shrink-0">Dean Managed</span>
                </div>
              ) : (
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1E293B] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">None / Unassigned</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code || 'DEPT'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-[#CBD5E1]">
              Institutional Role *
            </label>
            <div className={`grid ${forDean ? 'grid-cols-2' : 'grid-cols-2'} gap-2`}>
              {availableRoles.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === r.id
                      ? 'bg-purple-600/20 border-purple-500/60 text-white shadow-xs'
                      : 'bg-white/[0.02] border-white/[0.06] text-[#94A3B8] hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold capitalize">{r.label}</span>
                    {role === r.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <p className="text-[10px] leading-tight opacity-75">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Account Status */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-[#CBD5E1]">Account Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1E293B] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="active">Active (Full Access)</option>
              <option value="suspended">Suspended (Restricted)</option>
              <option value="banned">Banned (Locked)</option>
            </select>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="kn-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Provisioning Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{forDean ? `Create ${role === 'instructor' ? 'Instructor' : 'Student'}` : 'Create User'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default CreateUserModal;
