import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, CalendarSync, CheckCircle2, AlertCircle, Plus,
  Archive, RefreshCw, Check, ArrowRight, Shield, BookOpen, Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';
import { AcademicRolloverModal } from './AcademicRolloverModal';

export function AdminAcademicYearsView({ onNavigate }) {
  const { token } = useAuth();
  const [academicYears, setAcademicYears] = useState([]);
  const [activeYear, setActiveYear] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newYearString, setNewYearString] = useState('');
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchYears = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/academic/years?include_archived=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAcademicYears(data.years || []);
        setActiveYear(data.activeYear || null);
      }
    } catch (err) {
      console.warn('Failed to load academic years:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const handleCreateYear = async (e) => {
    e.preventDefault();
    if (!newYearString.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/academic/years`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          year_string: newYearString.trim(),
          is_active: false
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create academic year');
      }

      showNotification(`Academic Year ${newYearString.trim()} created successfully`);
      setIsCreateModalOpen(false);
      setNewYearString('');
      fetchYears();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleActivateYear = async (yearId) => {
    try {
      const res = await fetch(`${API_BASE}/academic/years/${yearId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to activate academic year');
      }

      showNotification('Academic year set as active');
      fetchYears();
    } catch (err) {
      showNotification(err.message, 'error');
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
            {notification.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 lg:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <CalendarSync className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  INSTITUTIONAL CALENDAR
                </span>
                {activeYear && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    Active: {activeYear.year_string}
                  </span>
                )}
              </div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Academic Years & Institutional Rollover
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Govern institutional academic calendars, initiate cascading archive rollovers, and maintain longitudinal audit trails.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsRolloverModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/40 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-2xs"
            >
              <CalendarSync className="w-4 h-4 text-purple-600" />
              <span>Rollover Academic Year</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="kn-btn-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Academic Year</span>
            </button>
          </div>
        </div>
      </section>

      {/* Active Academic Year Hero Card */}
      {activeYear && (
        <div className="bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-blue-900/10 border border-purple-300/40 dark:border-purple-800/40 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Currently Active Academic Term
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {activeYear.year_string}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                All newly created users, departments, subjects, and enrollments are automatically assigned to this term.
                When this term completes, run the Academic Rollover to archive and advance to the next year.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-200">
                Created: {new Date(activeYear.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Academic Years List */}
      <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Academic Terms Registry</h3>
            <p className="text-xs text-slate-500">Historical and active institutional year records</p>
          </div>
          <button
            onClick={fetchYears}
            disabled={isLoading}
            className="p-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 font-semibold text-[11px]">
                <th className="py-2.5 px-3">Academic Term</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Archive State</th>
                <th className="py-2.5 px-3">Created Date</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
              {academicYears.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No academic years registered yet.
                  </td>
                </tr>
              ) : (
                academicYears.map((ay) => (
                  <tr key={ay.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white text-sm">
                      {ay.year_string}
                    </td>
                    <td className="py-3.5 px-3">
                      {ay.is_active ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Active Term
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      {ay.archived ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Archived (Historical)
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Standard</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                      {ay.created_at ? new Date(ay.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {!ay.is_active && (
                        <button
                          onClick={() => handleActivateYear(ay.id)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                        >
                          Set as Active
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create New Academic Year */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
                <div className="flex items-center gap-2">
                  <CalendarSync className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Academic Year</h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateYear} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                    Academic Year Label
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AY 27-28"
                    value={newYearString}
                    onChange={(e) => setNewYearString(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Standard institutional nomenclature: &quot;AY 26-27&quot;, &quot;AY 27-28&quot;
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.04] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="kn-btn-primary px-4 py-1.5 text-xs font-semibold cursor-pointer">
                    Create Term
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Academic Rollover */}
      <AcademicRolloverModal
        isOpen={isRolloverModalOpen}
        onClose={() => setIsRolloverModalOpen(false)}
        activeYearString={activeYear?.year_string}
        onRolloverSuccess={() => {
          setIsRolloverModalOpen(false);
          fetchYears();
          showNotification('Academic year rollover completed successfully. Previous records archived.');
        }}
      />
    </div>
  );
}

export default AdminAcademicYearsView;

