import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Shield, Search, Filter, RefreshCw,
  MoreVertical, Edit, KeyRound, UserX, UserCheck, Trash2,
  FileText, Brain, ArrowUpDown, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, ShieldAlert, Sparkles, BookOpen,
  Archive, ArchiveRestore, CalendarSync, Building2, Calendar,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { UserDetailDrawer } from './UserDetailDrawer';
import { AcademicRolloverModal } from './AcademicRolloverModal';

const TABS = [
  { id: 'all', label: 'All Users', icon: Users },
  { id: 'student', label: 'Students', icon: GraduationCap },
  { id: 'instructor', label: 'Instructors', icon: BookOpen },
  { id: 'dean', label: 'Deans', icon: Shield },
  { id: 'admin', label: 'Admins', icon: ShieldAlert },
  { id: 'archived', label: 'Archived Users', icon: Archive }
];

export function AdminUserManagement() {
  const { token, user: currentUser } = useAuth();

  // Telemetry Metrics State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Active Role Tab: 'all', 'student', 'instructor', 'dean', 'admin', 'archived'
  const [activeTab, setActiveTab] = useState('all');

  // Users Table State
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [ayFilter, setAyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');

  // Metadata dropdowns
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Modal & Drawer State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [inspectingUserId, setInspectingUserId] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load telemetry stats & academic metadata
  const fetchStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const [statsRes, yearsRes, deptsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/academic/years`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/academic/departments`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (yearsRes.ok) {
        const data = await yearsRes.json();
        setAcademicYears(data.years || []);
      }
      if (deptsRes.ok) {
        const data = await deptsRes.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.warn('Failed to fetch stats & academic meta:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  // Load paginated users
  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: '15',
        sort_by: sortBy,
        order
      });

      // Role filter and Archive logic
      if (activeTab === 'archived') {
        params.append('archived', 'true');
      } else {
        params.append('archived', 'false');
        if (activeTab !== 'all') {
          params.append('role', activeTab);
        }
      }

      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (deptFilter !== 'all') params.append('department_id', deptFilter);
      if (ayFilter !== 'all') params.append('academic_year_id', ayFilter);

      const res = await fetch(`${API_BASE}/admin/users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch users');
      }

      const data = await res.json();
      setUsers(data.users || []);
      setTotalUsers(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, page, searchQuery, activeTab, statusFilter, deptFilter, ayFilter, sortBy, order]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Toggle quick status (suspend/activate)
  const handleToggleStatus = async (user) => {
    if (user.id === currentUser?.id) {
      showNotification('You cannot suspend your own account', 'error');
      return;
    }

    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update status');
      }

      showNotification(`User ${user.name} is now ${newStatus}`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Archive user action
  const handleArchiveUser = async (user) => {
    if (user.id === currentUser?.id) {
      showNotification('You cannot archive your own account', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/archive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to archive user');
      }

      showNotification(`User ${user.name} moved to Archived Users`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Restore archived user action
  const handleRestoreUser = async (user) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to restore user');
      }

      showNotification(`User ${user.name} restored to active directory`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Permanent Delete user
  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete user');
      }

      showNotification(`User ${deletingUser.name} permanently deleted`);
      setDeletingUser(null);
      fetchUsers();
      fetchStats();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100 max-w-7xl mx-auto">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 p-4 rounded-2xl border shadow-xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-xl ${
              notification.type === 'error'
                ? 'bg-red-500/15 border-red-500/30 text-red-500 dark:text-red-400'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center shadow-sm text-white">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Admin Console
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              {stats?.activeAcademicYear || 'AY 26-27'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Manage user roles, academic departments, learning telemetry, and term archiving.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { fetchStats(); fetchUsers(); }}
            disabled={isLoading || statsLoading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-40 cursor-pointer"
            title="Refresh Users and Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || statsLoading ? 'animate-spin text-purple-600 dark:text-purple-400' : ''}`} />
          </button>

          {/* Academic Year Rollover Action */}
          <button
            onClick={() => setIsRolloverModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all flex items-center gap-2 cursor-pointer"
            title="Academic Year Rollover"
          >
            <CalendarSync className="w-4 h-4" />
            <span className="hidden md:inline">AY Rollover</span>
          </button>

          {/* Add User Action */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="kn-btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalUsers ?? '...'}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Active directory</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Active</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.activeUsers ?? '...'}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">In good standing</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Admins & Deans</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {(stats?.adminUsers || 0) + (stats?.deanUsers || 0)}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Elevated leadership</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Instructors</span>
            <GraduationCap className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats?.instructorUsers ?? '...'}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Teaching faculty</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Documents</span>
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalDocuments ?? '...'}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Grounded materials</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Archived Users</span>
            <Archive className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats?.archivedUsers ?? 0}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Historical records</p>
        </div>
      </div>

      {/* ═══════ ROLE TABS (Segmented Control) ═══════ */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] rounded-xl overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-[#1C2029] text-purple-700 dark:text-purple-300 shadow-xs border border-slate-200/60 dark:border-white/[0.08]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.02]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search users by name or email address..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
            <option value="banned">Banned Only</option>
          </select>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer max-w-[180px] truncate"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Academic Year Filter */}
          <select
            value={ayFilter}
            onChange={(e) => { setAyFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All Academic Years</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.year_string || ay.yearString}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white dark:bg-[#161920] border border-slate-200/90 dark:border-white/[0.08] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 font-semibold text-[11px] bg-slate-50/50 dark:bg-white/[0.01]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Docs</th>
                <th className="py-3 px-3">Quizzes</th>
                <th className="py-3 px-3">Mastery</th>
                <th className="py-3 px-3">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isArchived = Boolean(u.archived);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                            u.role === 'admin'
                              ? 'bg-purple-600'
                              : u.role === 'dean'
                              ? 'bg-indigo-600'
                              : u.role === 'instructor'
                              ? 'bg-blue-600'
                              : 'bg-slate-500'
                          }`}>
                            {u.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 text-[9px] font-bold rounded">
                                  YOU
                                </span>
                              )}
                              {isArchived && (
                                <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[9px] font-bold rounded">
                                  ARCHIVED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : u.role === 'dean'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : u.role === 'instructor'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}>
                          {u.role || 'student'}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                          {u.department_name || u.departmentName || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium capitalize ${
                          u.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} />
                          {u.status}
                        </span>
                      </td>

                      {/* Docs */}
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 text-xs">
                        {u.metrics?.documentCount ?? 0}
                      </td>

                      {/* Quizzes */}
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 text-xs">
                        {u.metrics?.quizCount ?? 0}
                      </td>

                      {/* Mastery */}
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                        {u.metrics?.averageScore ? `${u.metrics.averageScore}%` : '—'}
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                        {u.last_login || u.lastLogin ? new Date(u.last_login || u.lastLogin).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Inspect Detail */}
                          <button
                            onClick={() => setInspectingUserId(u.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                            title="Inspect User Portfolio"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit User */}
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                            title="Edit Account"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => setResettingUser(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Suspend */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrent}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-30"
                            title={u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                          >
                            {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>

                          {/* Archive or Restore Action */}
                          {isArchived ? (
                            <>
                              <button
                                onClick={() => handleRestoreUser(u)}
                                className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                title="Restore User to Active Directory"
                              >
                                <ArchiveRestore className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingUser(u)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                title="Permanently Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleArchiveUser(u)}
                              disabled={isCurrent}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors disabled:opacity-30"
                              title="Archive User (Preserves Academic History)"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-white/[0.04] text-xs text-slate-500">
            <span>Showing page {page} of {pages} ({totalUsers} total users)</span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ Modals ═══════ */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        token={token}
        onUserCreated={() => {
          showNotification('User account created successfully');
          fetchUsers();
          fetchStats();
        }}
      />

      <AcademicRolloverModal
        isOpen={isRolloverModalOpen}
        onClose={() => setIsRolloverModalOpen(false)}
        token={token}
        currentActiveYear={stats?.activeAcademicYear}
        onRolloverComplete={(newAy) => {
          showNotification(`Academic Year Rollover to '${newAy.year_string}' completed successfully!`);
          fetchUsers();
          fetchStats();
        }}
      />

      <EditUserModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        token={token}
        currentUserId={currentUser?.id}
        onUserUpdated={() => {
          showNotification('User account updated successfully');
          fetchUsers();
          fetchStats();
        }}
      />

      <ResetPasswordModal
        isOpen={Boolean(resettingUser)}
        onClose={() => setResettingUser(null)}
        user={resettingUser}
        token={token}
        onPasswordReset={() => {
          showNotification('Password reset successfully');
        }}
      />

      <UserDetailDrawer
        userId={inspectingUserId}
        isOpen={Boolean(inspectingUserId)}
        onClose={() => setInspectingUserId(null)}
        token={token}
      />

      {/* Permanent Delete Confirmation Dialog */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-rose-500/30 rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-sm font-bold text-white">Permanently Delete Account?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">{deletingUser.name}</strong> ({deletingUser.email})? This action is irreversible and will permanently delete all associated relational data.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserManagement;
