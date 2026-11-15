import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, GraduationCap, BookOpen, Clock, Shield,
  RefreshCw, CheckCircle2, ChevronRight, AlertCircle, Info, Lock,
  Plus, Edit2, X, Check, Archive, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * AdminDepartmentsView — Department Academic Ecosystem Dashboard & Governance
 * Allows creating, editing, and managing collegiate academic units (Colleges/Departments),
 * assigning Academic Deans, reviewing curriculum subjects, and inspecting faculty/student rosters.
 */
export function AdminDepartmentsView({ onNavigate }) {
  const { token } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [departmentDetail, setDepartmentDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Available deans & active academic year for modal assignment
  const [availableDeans, setAvailableDeans] = useState([]);
  const [activeYear, setActiveYear] = useState(null);

  // Create Department Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createDeanId, setCreateDeanId] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Edit Department Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDeanId, setEditDeanId] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch available departments
  const fetchDepartments = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/academic/departments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load departments');
      const data = await res.json();
      const depts = data.departments || [];
      setDepartments(depts);
      if (depts.length > 0) {
        setSelectedDeptId(prev => {
          if (prev && depts.some(d => d.id === prev)) return prev;
          return depts[0].id;
        });
      } else {
        setSelectedDeptId('');
        setDepartmentDetail(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // 2. Fetch specific department detail
  const fetchDepartmentDetail = useCallback(async (deptId) => {
    if (!token || !deptId) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/academic/departments/${deptId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load department details');
      const data = await res.json();
      setDepartmentDetail(data);
    } catch (err) {
      console.warn('Department detail error:', err);
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  // 3. Fetch auxiliary data for modals: Deans list and Active Academic Year
  const fetchModalData = useCallback(async () => {
    if (!token) return;
    try {
      const [rosterRes, yearsRes] = await Promise.all([
        fetch(`${API_BASE}/academic/users-roster?role=dean`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/academic/years`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (rosterRes.ok) {
        const rData = await rosterRes.json();
        setAvailableDeans(rData.users || []);
      }
      if (yearsRes.ok) {
        const yData = await yearsRes.json();
        setActiveYear(yData.activeYear || (yData.years && yData.years[0]) || null);
      }
    } catch (err) {
      console.warn('Failed to load modal deans/years:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchDepartments();
    fetchModalData();
  }, [fetchDepartments, fetchModalData]);

  useEffect(() => {
    if (selectedDeptId) {
      fetchDepartmentDetail(selectedDeptId);
    }
  }, [selectedDeptId, fetchDepartmentDetail]);

  const currentDept = departments.find(d => d.id === selectedDeptId) || departments[0];

  // Open Edit Modal with current values
  const handleOpenEdit = () => {
    if (!currentDept) return;
    setEditName(currentDept.name || '');
    setEditCode(currentDept.code || '');
    setEditDeanId(currentDept.dean_id || (departmentDetail?.dean?.id) || '');
    setEditError(null);
    setIsEditModalOpen(true);
  };

  // Handle Create Department submission
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('Department name is required');
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      const res = await fetch(`${API_BASE}/academic/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: createName.trim(),
          code: createCode.trim() ? createCode.trim().toUpperCase() : null,
          dean_id: createDeanId || null,
          academic_year_id: activeYear?.id || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create department');
      }

      showNotification(`Department "${data.department?.name || createName}" created successfully!`);
      setIsCreateModalOpen(false);
      setCreateName('');
      setCreateCode('');
      setCreateDeanId('');

      // Refresh and select the newly created department
      await fetchDepartments();
      if (data.department?.id) {
        setSelectedDeptId(data.department.id);
      }
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Edit Department submission
  const handleEditDepartment = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError('Department name is required');
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`${API_BASE}/academic/departments/${selectedDeptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName.trim(),
          code: editCode.trim() ? editCode.trim().toUpperCase() : null,
          dean_id: editDeanId || ''
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update department');
      }

      showNotification(`Department "${editName}" updated successfully!`);
      setIsEditModalOpen(false);
      await fetchDepartments();
      await fetchDepartmentDetail(selectedDeptId);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100 max-w-7xl mx-auto">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs font-medium shadow-md ${
              notification.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800/40'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/40'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
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
              <Building2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Department Academic Roster
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Hierarchical oversight of academic units, designated Deans, faculty, and enrolled student bodies.
          </p>
        </div>

        {/* Action Controls: Selector, Refresh, and Add Department */}
        <div className="flex flex-wrap items-center gap-2.5">
          {departments.length > 0 && (
            <div className="relative">
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="px-3.5 py-2.5 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.1] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 shadow-xs cursor-pointer min-w-[200px]"
              >
                {!selectedDeptId && (
                  <option value="" disabled>Select Department ({departments.length} available)</option>
                )}
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code || 'DEPT'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentDept && (
            <button
              onClick={handleOpenEdit}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#161920] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Edit Department"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit</span>
            </button>
          )}

          <button
            onClick={() => { fetchDepartments(); if (selectedDeptId) fetchDepartmentDetail(selectedDeptId); }}
            disabled={isLoading || detailLoading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-xs"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || detailLoading ? 'animate-spin text-purple-600' : ''}`} />
          </button>

          {/* Primary Action: Add Department */}
          <button
            onClick={() => {
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
            className="kn-btn-primary px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Read-Only Safety Banner */}
      <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 flex items-center justify-between text-blue-900 dark:text-blue-200 text-xs">
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>
            <strong className="font-semibold">Department Management:</strong> Add or configure collegiate departments above. User roster alterations, passwords, and student accounts are governed through the{' '}
            <button
              onClick={() => onNavigate?.('/admin')}
              className="underline font-semibold hover:text-blue-800 dark:hover:text-white ml-0.5"
            >
              User Governance Console
            </button>.
          </span>
        </div>
      </div>

      {/* If No Departments Exist: Clean Empty State */}
      {departments.length === 0 && !isLoading && (
        <div className="p-12 text-center bg-white dark:bg-[#161920] border border-dashed border-slate-300 dark:border-white/[0.1] rounded-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Academic Departments Registered</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Create your institution's colleges and departments to organize curriculum subjects, assign Deans, and group student bodies.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="kn-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Department</span>
          </button>
        </div>
      )}

      {/* Metrics Row */}
      {currentDept && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span className="font-medium">Assigned Dean</span>
                <Shield className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-2 truncate">
                {departmentDetail?.dean?.name || 'Unassigned'}
              </p>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Department Leadership</span>
            </div>

            <div className="p-4 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span className="font-medium">Faculty Instructors</span>
                <GraduationCap className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                {departmentDetail?.stats?.totalInstructors ?? 0}
              </p>
              <span className="text-[10px] text-slate-400">Teaching faculty</span>
            </div>

            <div className="p-4 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span className="font-medium">Enrolled Students</span>
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
                {departmentDetail?.stats?.totalStudents ?? 0}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Department cohort</span>
            </div>

            <div className="p-4 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span className="font-medium">Class Subjects</span>
                <BookOpen className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                {departmentDetail?.stats?.totalSubjects ?? 0}
              </p>
              <span className="text-[10px] text-slate-400">Curriculum courses</span>
            </div>
          </div>

          {/* ═══════ Department Leadership Banner ═══════ */}
          <div className="p-5 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Department Dean</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenEdit}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Assign / Change Dean</span>
                </button>
              </div>
            </div>

            {departmentDetail?.dean ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                    {departmentDetail.dean.name?.[0]?.toUpperCase() || 'D'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{departmentDetail.dean.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{departmentDetail.dean.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active Dean Clearance
                  </span>
                  <button
                    onClick={() => onNavigate?.('/admin')}
                    className="text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Manage in Governance</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <p>No Dean currently assigned to this department.</p>
                <button
                  onClick={handleOpenEdit}
                  className="kn-btn-primary px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Assign Dean</span>
                </button>
              </div>
            )}
          </div>

          {/* ═══════ Class Subjects List ═══════ */}
          <div className="p-5 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Curriculum & Class Subjects</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {departmentDetail?.subjects?.length || 0} active subjects
                </span>
                <button
                  onClick={() => onNavigate?.('/admin/classes')}
                  className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Manage Classes</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {departmentDetail?.subjects && departmentDetail.subjects.length > 0 ? (
                departmentDetail.subjects.map((subj) => (
                  <div
                    key={subj.id}
                    className="p-3.5 rounded-xl border border-slate-200/90 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {subj.name}
                      </h3>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shrink-0">
                        {subj.year_level || subj.yearLevel} Yr
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Code: <strong className="font-semibold text-slate-700 dark:text-slate-300">{subj.code || '—'}</strong>
                    </p>
                    <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-white/[0.04]">
                      <span>Instructor: <strong className="font-medium text-slate-700 dark:text-slate-300">{subj.instructor?.name || 'Unassigned'}</strong></span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{subj.enrolled_count || 0} Students</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-6 text-center text-slate-400 text-xs">
                  No subjects registered under this department yet.
                </div>
              )}
            </div>
          </div>

          {/* ═══════ Instructors & Students Rosters (Two Columns) ═══════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Instructors Table */}
            <div className="p-5 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Department Faculty</h2>
                </div>
                <span className="text-xs text-slate-400">Read-Only</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 font-semibold text-[11px]">
                      <th className="py-2 px-2.5">Faculty Member</th>
                      <th className="py-2 px-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                    {departmentDetail?.instructors && departmentDetail.instructors.length > 0 ? (
                      departmentDetail.instructors.map((inst) => (
                        <tr key={inst.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <td className="py-2.5 px-2.5">
                            <p className="font-semibold text-slate-900 dark:text-white">{inst.name}</p>
                            <p className="text-[11px] text-slate-400">{inst.email}</p>
                          </td>
                          <td className="py-2.5 px-2.5">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {inst.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-slate-400 text-xs">
                          No instructors assigned to this department
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Students Table */}
            <div className="p-5 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Department Students</h2>
                </div>
                <span className="text-xs text-slate-400">Read-Only</span>
              </div>

              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 font-semibold text-[11px]">
                      <th className="py-2 px-2.5">Student</th>
                      <th className="py-2 px-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                    {departmentDetail?.students && departmentDetail.students.length > 0 ? (
                      departmentDetail.students.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <td className="py-2.5 px-2.5">
                            <p className="font-semibold text-slate-900 dark:text-white">{st.name}</p>
                            <p className="text-[11px] text-slate-400">{st.email}</p>
                          </td>
                          <td className="py-2.5 px-2.5">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {st.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-slate-400 text-xs">
                          No students currently enrolled in this department
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CREATE DEPARTMENT MODAL
          ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-xl overflow-hidden text-slate-900 dark:text-white"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Academic Department</h3>
                    <p className="text-[11px] text-slate-500">Establish a new collegiate academic unit and assign leadership</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleCreateDepartment} className="p-5 space-y-4">
                {createError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200 dark:border-rose-800/40 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Department / College Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. College of Criminal Justice Education"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-white/[0.1] rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Abbreviation / Code
                    </label>
                    <input
                      type="text"
                      value={createCode}
                      onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CCJE"
                      maxLength={10}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-white/[0.1] rounded-xl text-xs font-mono uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Academic Year Term
                    </label>
                    <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span>{activeYear ? activeYear.year_string : 'AY 26-27 (Active)'}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">Active</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Assign Academic Dean (Optional)
                  </label>
                  <select
                    value={createDeanId}
                    onChange={(e) => setCreateDeanId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-white/[0.1] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="">No Dean Assigned (Unassigned)</option>
                    {availableDeans.map((dean) => (
                      <option key={dean.id} value={dean.id}>
                        {dean.name} ({dean.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400">
                    Deans can also be designated later or assigned inside User Governance.
                  </p>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCreate || !createName.trim()}
                    className="kn-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingCreate ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Create Department</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════
          EDIT DEPARTMENT MODAL
          ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-xl overflow-hidden text-slate-900 dark:text-white"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edit Academic Department</h3>
                    <p className="text-[11px] text-slate-500">Update collegiate title, code, or designate a new Academic Dean</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleEditDepartment} className="p-5 space-y-4">
                {editError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200 dark:border-rose-800/40 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Department / College Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. College of Accountancy"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-white/[0.1] rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Abbreviation / Code
                  </label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    placeholder="e.g. COA"
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-white/[0.1] rounded-xl text-xs font-mono uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Designated Academic Dean
                  </label>
                  <select
                    value={editDeanId}
                    onChange={(e) => setEditDeanId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-white/[0.1] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="">No Dean Assigned (Unassigned)</option>
                    {availableDeans.map((dean) => (
                      <option key={dean.id} value={dean.id}>
                        {dean.name} ({dean.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit || !editName.trim()}
                    className="kn-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingEdit ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
