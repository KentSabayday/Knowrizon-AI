import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X, UserCheck, Mail, User, Shield, AlertCircle,
  Loader2, Check, Building2, Calendar
} from 'lucide-react';
import { API_BASE } from '../../lib/api';

const ROLES = [
  { id: 'student', label: 'Student' },
  { id: 'instructor', label: 'Instructor' },
  { id: 'dean', label: 'Dean' },
  { id: 'admin', label: 'Administrator' }
];

export function EditUserModal({ isOpen, onClose, user, token, currentUserId, onUserUpdated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [status, setStatus] = useState('active');
  const [bio, setBio] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');

  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setRole(user.role || (user.isAdmin ? 'admin' : 'student'));
      setStatus(user.status || 'active');
      setBio(user.bio || '');
      setDepartmentId(user.department_id || user.departmentId || '');
      setAcademicYearId(user.academic_year_id || user.academicYearId || '');
      setError(null);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && token) {
      const fetchMeta = async () => {
        try {
          const [yearsRes, deptsRes] = await Promise.all([
            fetch(`${API_BASE}/academic/years`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/academic/departments`, { headers: { 'Authorization': `Bearer ${token}` } })
          ]);
          if (yearsRes.ok) {
            const data = await yearsRes.json();
            setAcademicYears(data.years || []);
          }
          if (deptsRes.ok) {
            const data = await deptsRes.json();
            setDepartments(data.departments || []);
          }
        } catch (err) {
          console.warn('Failed to load metadata in EditUserModal:', err);
        }
      };
      fetchMeta();
    }
  }, [isOpen, token]);

  if (!isOpen || !user) return null;

  const isSelf = user.id === currentUserId;

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

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          status,
          bio: bio.trim(),
          department_id: departmentId || '',
          academic_year_id: academicYearId || ''
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      if (onUserUpdated) onUserUpdated(data.user);
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#22C7FF] to-[#5B5FFF] flex items-center justify-center shadow-lg shadow-[#22C7FF]/20">
              <UserCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Edit User Account</h2>
              <p className="text-[11px] text-[#94A3B8]">Manage permissions, role, and academic department</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
                className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
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
                className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Academic Year & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#CBD5E1] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Academic Year</span>
              </label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full px-3 py-2 bg-[#1E293B] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">Default Active Term</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.year_string || ay.yearString} {ay.is_active || ay.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#CBD5E1] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Department</span>
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 bg-[#1E293B] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">None / Unassigned</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code || 'DEPT'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-[#CBD5E1]">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  disabled={isSelf && r.id !== 'admin'}
                  onClick={() => setRole(r.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    role === r.id
                      ? 'bg-blue-600/15 border-blue-500/60 text-white'
                      : 'bg-white/[0.02] border-white/[0.06] text-[#94A3B8] hover:bg-white/[0.05] hover:text-white'
                  } ${isSelf && r.id !== 'admin' ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold capitalize">{r.label}</span>
                    {role === r.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                </button>
              ))}
            </div>
            {isSelf && (
              <p className="text-[10px] text-amber-400 pt-1">
                You cannot revoke your own administrator clearance.
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-[#CBD5E1]">Status</label>
            <select
              value={status}
              disabled={isSelf}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-[#1E293B] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-40"
            >
              <option value="active">Active (Permitted)</option>
              <option value="suspended">Suspended (Blocked)</option>
              <option value="banned">Banned (Locked)</option>
            </select>
          </div>

          {/* Bio */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-[#CBD5E1]">Biography / Notes</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Academic affiliation, office hours, or department role..."
              className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
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
              className="kn-btn-primary px-5 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Account</span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default EditUserModal;
