import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CalendarSync, AlertTriangle, CheckCircle2, ShieldAlert,
  Loader2, ArrowRight, History, Layers
} from 'lucide-react';
import { API_BASE } from '../../lib/api';

/**
 * AcademicRolloverModal — Institutional Academic Year Transition
 * Creates and activates a new Academic Year while executing a cascading archive
 * across all existing classes, subjects, enrollments, and learning materials.
 */
export function AcademicRolloverModal({ isOpen, onClose, token, currentActiveYear, onRolloverComplete }) {
  const [newYearString, setNewYearString] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmed(false);
      setError(null);
      // Auto-suggest next academic year string if current is like "AY 26-27"
      if (currentActiveYear && currentActiveYear.startsWith('AY ')) {
        const parts = currentActiveYear.replace('AY ', '').split('-');
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const nextStart = parseInt(parts[0], 10) + 1;
          const nextEnd = parseInt(parts[1], 10) + 1;
          setNewYearString(`AY ${nextStart}-${nextEnd}`);
        } else {
          setNewYearString('AY 27-28');
        }
      } else {
        setNewYearString('AY 27-28');
      }
    }
  }, [isOpen, currentActiveYear]);

  if (!isOpen) return null;

  const handleRollover = async (e) => {
    e.preventDefault();
    setError(null);

    if (!newYearString.trim()) {
      setError('Please provide a new Academic Year label (e.g. AY 27-28)');
      return;
    }

    if (!confirmed) {
      setError('Please confirm that you understand this will archive active term records.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/academic/rollover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          new_year_string: newYearString.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute Academic Year Rollover');
      }

      if (onRolloverComplete) {
        onRolloverComplete(data.academicYear);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-[#0F172A] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden text-white"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md">
              <CalendarSync className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Academic Year Rollover</h2>
              <p className="text-[11px] text-[#94A3B8]">Institutional term migration and cascading archive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleRollover} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current vs Next Banner */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">Current Active Term</span>
              <p className="text-sm font-bold text-purple-400 mt-0.5">{currentActiveYear || 'AY 26-27'}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
            <div>
              <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">Target Academic Year</span>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">{newYearString || 'AY 27-28'}</p>
            </div>
          </div>

          {/* Explanation Box */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <History className="w-4 h-4 shrink-0" />
              <span>Cascading Archive Lifecycle</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-100/80">
              Activating the new term will set <span className="font-semibold text-white">archived = true</span> on all class subjects, schedules, student enrollments, and learning materials tied to <span className="font-semibold text-white">{currentActiveYear || 'AY 26-27'}</span>.
            </p>
            <p className="text-[11px] leading-relaxed text-amber-100/80">
              Archived records are protected from accidental mutation and remain fully available for auditing via the "Historical Data" toggle.
            </p>
          </div>

          {/* Input Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#CBD5E1]">
              New Academic Year Designation <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={newYearString}
              onChange={(e) => setNewYearString(e.target.value)}
              placeholder="e.g. AY 27-28"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-white/20 bg-white/5 text-purple-600 focus:ring-0"
            />
            <span className="text-xs text-[#94A3B8] leading-tight">
              I authorize the automatic cascading archive of all {currentActiveYear || 'current'} enrollments, course schedules, and syllabus documents into historical audit partitions.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
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
              disabled={isSubmitting || !confirmed || !newYearString.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Rollover...</span>
                </>
              ) : (
                <>
                  <CalendarSync className="w-3.5 h-3.5" />
                  <span>Activate & Cascade Archive</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default AcademicRolloverModal;

