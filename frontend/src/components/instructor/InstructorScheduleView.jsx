import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, Clock, MapPin, Users, BookOpen, ChevronDown,
  RefreshCw, AlertCircle, CheckCircle2, ArrowRight, Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

const WEEKDAYS = ['All Days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * InstructorScheduleView — Faculty Teaching Timetable Architecture
 * Displays the instructor's assigned subjects, teaching schedule, classrooms, and student enrollments.
 */
export function InstructorScheduleView({ onNavigate }) {
  const { token } = useAuth();
  const [scheduleData, setScheduleData] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAyId, setSelectedAyId] = useState('');
  const [selectedDay, setSelectedDay] = useState('All Days');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Academic Years list
  const fetchAcademicYears = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/academic/academic-years`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const years = data.academic_years || [];
        setAcademicYears(years);
        const active = years.find(y => y.is_active);
        if (active && !selectedAyId) {
          setSelectedAyId(active.id);
        }
      }
    } catch (err) {
      console.error('Failed to load academic years:', err);
    }
  }, [token, selectedAyId]);

  // Fetch Instructor Schedule
  const fetchInstructorSchedule = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const url = selectedAyId
        ? `${API_BASE}/academic/instructor/schedule?academic_year_id=${encodeURIComponent(selectedAyId)}`
        : `${API_BASE}/academic/instructor/schedule`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScheduleData(data);
        if (data.available_academic_years && data.available_academic_years.length > 0) {
          setAcademicYears(data.available_academic_years);
          if (!selectedAyId && data.selected_academic_year_id) {
            setSelectedAyId(data.selected_academic_year_id);
          }
        }
      } else {
        showNotification('Unable to load teaching schedule', 'error');
      }
    } catch (err) {
      console.error('Failed to load instructor schedule:', err);
      showNotification('Network error loading timetable', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedAyId]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    fetchInstructorSchedule();
  }, [fetchInstructorSchedule]);

  const currentAy = useMemo(() => {
    return academicYears.find(y => y.id === selectedAyId) || scheduleData?.active_academic_year;
  }, [academicYears, selectedAyId, scheduleData]);

  const rawSchedule = scheduleData?.schedule || [];

  // Filter schedule by selected weekday
  const filteredSchedule = useMemo(() => {
    if (selectedDay === 'All Days') return rawSchedule;
    return rawSchedule.filter(item => {
      const days = item.days || [];
      if (days.includes(selectedDay)) return true;
      const ts = (item.time_slot || '').toLowerCase();
      const dayLower = selectedDay.toLowerCase();
      const shortDay = dayLower.slice(0, 3);
      return ts.includes(shortDay) || ts.includes(dayLower);
    });
  }, [rawSchedule, selectedDay]);

  const totalLearners = useMemo(() => {
    return rawSchedule.reduce((acc, curr) => acc + (curr.enrolled_count || 0), 0);
  }, [rawSchedule]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-medium ${
          notification.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-700 dark:text-rose-300'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-700 dark:text-emerald-300'
        }`}>
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header & Academic Year Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              Faculty Cockpit
            </span>
            {currentAy && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {currentAy.year_string || currentAy.yearString}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Class Schedule
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Weekly teaching timetable, assigned classrooms, and enrolled student cohorts
          </p>
        </div>

        {/* Academic Year Selector & Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <label className="text-xs font-medium text-slate-400 block mb-1">Academic Year</label>
            <div className="relative">
              <select
                value={selectedAyId}
                onChange={(e) => setSelectedAyId(e.target.value)}
                className="appearance-none bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/[0.1] rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-slate-900 dark:text-white shadow-sm hover:border-emerald-500 transition-colors cursor-pointer"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.year_string || ay.yearString} {ay.is_active ? '(Active Term)' : '(Archived)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={fetchInstructorSchedule}
            className="self-end p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1A1D24] text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors shadow-sm"
            title="Refresh timetable"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Teaching Subjects</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {rawSchedule.length} Assigned
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Learners</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {totalLearners} Enrolled
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Instruction Status</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {currentAy?.is_active ? 'In Session' : 'Archived Term'}
            </p>
          </div>
        </div>
      </div>

      {/* Weekday Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {WEEKDAYS.map((day) => {
          const isActive = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-sm ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:border-emerald-500/50'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Timetable Cards */}
      {isLoading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-7 h-7 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading teaching schedule...</p>
        </div>
      ) : filteredSchedule.length === 0 ? (
        <div className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No teaching sessions scheduled for {selectedDay}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            No lecture hours configured for this day. Select another day to inspect your teaching itinerary.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSchedule.map((item) => (
            <div
              key={item.subject_id}
              className="bg-white dark:bg-[#16181D] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Time & Days Row */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.time_slot || 'Time TBA'}</span>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full">
                    {item.days?.length ? item.days.join(', ') : 'Assigned Days'}
                  </span>
                </div>

                {/* Course Name & Code */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {item.subject_name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {item.subject_code}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {item.year_level} Year Standing
                  </span>
                </div>

                {/* Classroom & Enrollment */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.05] grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{item.classroom || 'Venue TBA'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{item.enrolled_count || 0} Enrolled Learners</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between gap-3">
                <button
                  onClick={() => onNavigate && onNavigate('/instructor/grades')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Student Grades</span>
                </button>

                <button
                  onClick={() => onNavigate && onNavigate('/instructor')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
                >
                  <span>Class Roster</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InstructorScheduleView;

