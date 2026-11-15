import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Users, Clock, Calendar, Upload, FileText,
  Brain, Plus, CheckCircle2, AlertCircle, RefreshCw, X,
  MapPin, Sparkles, UserPlus, ChevronDown, Award,
  FileUp, Paperclip, Loader2, Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * InstructorClassroomsView — Faculty Course Command Center
 * Instructors manage their assigned Class Subjects:
 * - Configure Class Schedules (Time slot & Classroom)
 * - Enroll students directly into subjects
 * - Upload and index Learning Materials for Knowri AI Tutor
 * - Build AI Quizzes and retrieval checks
 */
export function InstructorClassroomsView({ onNavigate }) {
  const { token, user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAyId, setSelectedAyId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Modals
  const [schedulingSubject, setSchedulingSubject] = useState(null);
  const [timeSlot, setTimeSlot] = useState('');
  const [classroom, setClassroom] = useState('');

  const [enrollingSubject, setEnrollingSubject] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [uploadingSubject, setUploadingSubject] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [materialFileType, setMaterialFileType] = useState('pdf');
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchInstructorData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const subjUrl = selectedAyId
        ? `${API_BASE}/academic/instructor/subjects?academic_year_id=${encodeURIComponent(selectedAyId)}`
        : `${API_BASE}/academic/instructor/subjects`;

      const [subjectsRes, rosterRes, ayRes] = await Promise.all([
        fetch(subjUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/academic/users-roster?role=student`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/academic/academic-years`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(data.subjects || []);
      }

      if (rosterRes.ok) {
        const rosterData = await rosterRes.json();
        setAllStudents(rosterData.users || []);
      }

      if (ayRes.ok) {
        const ayData = await ayRes.json();
        const years = ayData.academic_years || [];
        setAcademicYears(years);
        const active = years.find(y => y.is_active);
        if (active && !selectedAyId) {
          setSelectedAyId(active.id);
        }
      }
    } catch (err) {
      console.warn('Instructor subjects fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedAyId]);

  useEffect(() => {
    fetchInstructorData();
  }, [fetchInstructorData]);

  // Handle Save Schedule
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!schedulingSubject) return;

    try {
      const res = await fetch(`${API_BASE}/academic/subjects/${schedulingSubject.id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          time_slot: timeSlot.trim(),
          classroom: classroom.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save schedule');
      }

      showNotification('Class schedule updated successfully');
      setSchedulingSubject(null);
      fetchInstructorData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Handle Enroll Student
  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!enrollingSubject || !selectedStudentId) return;

    try {
      const res = await fetch(`${API_BASE}/academic/subjects/${enrollingSubject.id}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ student_id: selectedStudentId })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to enroll student');
      }

      showNotification('Student enrolled successfully');
      setEnrollingSubject(null);
      setSelectedStudentId('');
      fetchInstructorData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Handle File Input Selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (!materialTitle.trim()) {
      // Auto-populate title with friendly filename
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setMaterialTitle(cleanName);
    }

    // Auto-detect extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext && ['pdf', 'docx', 'pptx', 'txt'].includes(ext)) {
      setMaterialFileType(ext);
    }
  };

  // Handle Upload Learning Material (supports binary File upload via FormData or text-only)
  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!uploadingSubject) return;
    if (!selectedFile && !materialTitle.trim()) {
      showNotification('Please select a file or enter a material title', 'error');
      return;
    }
    if (!selectedFile && !materialText.trim()) {
      showNotification('Please provide a file or syllabus text content', 'error');
      return;
    }

    setIsUploadingMaterial(true);
    try {
      let res;
      if (selectedFile) {
        // Send multipart/form-data
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', materialTitle.trim() || selectedFile.name);
        if (materialText.trim()) {
          formData.append('notes', materialText.trim());
        }
        res = await fetch(`${API_BASE}/academic/subjects/${uploadingSubject.id}/materials`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
            // Browser automatically attaches multipart/form-data boundary
          },
          body: formData
        });
      } else {
        // Fallback JSON payload
        res = await fetch(`${API_BASE}/academic/subjects/${uploadingSubject.id}/materials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: materialTitle.trim(),
            content_text: materialText.trim(),
            file_type: materialFileType
          })
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to upload material');
      }

      showNotification('Material uploaded, text extracted, and indexed for AI Socratic Study!');
      setUploadingSubject(null);
      setSelectedFile(null);
      setMaterialTitle('');
      setMaterialText('');
      fetchInstructorData();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setIsUploadingMaterial(false);
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
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  FACULTY STUDIO
                </span>
              </div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Assigned Class Subjects
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Logged in as <strong className="font-semibold text-slate-900 dark:text-white">{user?.name}</strong>. Configure schedules, enroll students, and upload course materials for AI tutoring.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {academicYears.length > 0 && (
              <div className="relative">
                <select
                  value={selectedAyId}
                  onChange={(e) => setSelectedAyId(e.target.value)}
                  className="appearance-none bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2.5 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs hover:border-blue-500 transition-colors cursor-pointer"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.year_string || ay.yearString} {ay.is_active ? '(Active Term)' : '(Archived)'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
            <button
              onClick={() => onNavigate?.('/instructor/grades')}
              className="px-3.5 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800/40 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <Award className="w-4 h-4" />
              <span>Student Grades</span>
            </button>
            <button
              onClick={() => onNavigate?.('/workspace')}
              className="kn-btn-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Brain className="w-4 h-4" />
              <span>AI Quiz Generator</span>
            </button>
          </div>
        </div>
      </section>

      {/* Class Subjects Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Courses & Rosters</h2>
          <button
            onClick={fetchInstructorData}
            disabled={isLoading}
            className="p-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {subjects.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {subjects.map((subj) => {
              const activeSchedule = subj.schedule;
              const enrollments = subj.enrollments || [];
              const materials = subj.materials || [];

              return (
                <div
                  key={subj.id}
                  className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{subj.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          {subj.code || 'SUBJ'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {subj.department_name} • {subj.year_level || subj.yearLevel} Year
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                      {enrollments.length} Enrolled
                    </span>
                  </div>

                  {/* Schedule Details */}
                  <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{activeSchedule ? activeSchedule.time_slot : 'No schedule set yet'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span>{activeSchedule ? activeSchedule.classroom : 'TBA'}</span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSchedulingSubject(subj);
                        setTimeSlot(activeSchedule?.time_slot || 'MWF 9:00 AM - 10:30 AM');
                        setClassroom(activeSchedule?.classroom || 'Room 402');
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Set Schedule</span>
                    </button>

                    <button
                      onClick={() => {
                        setEnrollingSubject(subj);
                        setSelectedStudentId('');
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Enroll Student</span>
                    </button>

                    <button
                      onClick={() => {
                        setUploadingSubject(subj);
                        setMaterialTitle('');
                        setMaterialText('');
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 hover:bg-purple-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Material</span>
                    </button>
                  </div>

                  {/* Uploaded Materials Preview */}
                  {materials.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-white/[0.04] space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Active Learning Materials ({materials.length})
                      </span>
                      <div className="space-y-1">
                        {materials.slice(0, 3).map((mat) => (
                          <div key={mat.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50/60 dark:bg-white/[0.01]">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="text-slate-800 dark:text-slate-200 truncate">{mat.title}</span>
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                              AI Indexed
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl text-slate-400 text-xs">
            No class subjects currently assigned to your faculty profile.
          </div>
        )}
      </div>

      {/* Set Schedule Modal */}
      {schedulingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold">Class Schedule — {schedulingSubject.name}</h3>
              <button onClick={() => setSchedulingSubject(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Time Slot *</label>
                <input
                  type="text"
                  required
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  placeholder="e.g. MWF 9:00 AM - 10:30 AM or TTh 1:00 PM - 2:30 PM"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-xl text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Classroom / Location *</label>
                <input
                  type="text"
                  required
                  value={classroom}
                  onChange={(e) => setClassroom(e.target.value)}
                  placeholder="e.g. Room 402 / Virtual Studio"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-xl text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSchedulingSubject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button type="submit" className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold">
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Student Modal */}
      {enrollingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold">Enroll Student — {enrollingSubject.name}</h3>
              <button onClick={() => setEnrollingSubject(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Select Student</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-white/[0.1] rounded-xl text-xs text-white"
                >
                  <option value="">Choose student...</option>
                  {allStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEnrollingSubject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudentId}
                  className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Material Modal */}
      {uploadingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold">Upload Course Material for {uploadingSubject.name}</h3>
              </div>
              <button
                onClick={() => {
                  setUploadingSubject(null);
                  setSelectedFile(null);
                  setMaterialTitle('');
                  setMaterialText('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadMaterial} className="space-y-4">
              {/* File Upload Drop Zone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Course Material File (.pdf, .docx, .pptx, .txt)</span>
                  <span className="text-[10px] text-purple-400 font-normal">Auto Text Extraction & AI Indexing</span>
                </label>

                {!selectedFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/[0.15] hover:border-purple-500/50 rounded-2xl cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all p-4 group">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <FileUp className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-semibold text-slate-200">
                        Click or drag document to upload
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Supports PDF, Word (DOCX), PowerPoint (PPTX), and plain text
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.docx,.pptx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-purple-300">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {materialFileType.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1.5 rounded-lg hover:bg-white/[0.1] text-slate-400 hover:text-red-400 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Material Document Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Material Document Title *</label>
                <input
                  type="text"
                  required
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder="e.g., Chapter 1: Introduction & Core Principles"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />
              </div>

              {/* File Type Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Format</label>
                <select
                  value={materialFileType}
                  onChange={(e) => setMaterialFileType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-white/[0.1] rounded-xl text-xs text-white cursor-pointer"
                >
                  <option value="pdf">PDF Document (.pdf)</option>
                  <option value="docx">Word Document (.docx)</option>
                  <option value="pptx">PowerPoint Presentation (.pptx)</option>
                  <option value="txt">Plain Text / Syllabus (.txt)</option>
                </select>
              </div>

              {/* Additional Syllabus Notes / Highlights */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Additional Syllabus Notes / Study Guidelines (Optional)</span>
                  <span className="text-[10px] text-purple-400">Context Injected</span>
                </label>
                <textarea
                  rows={3}
                  value={materialText}
                  onChange={(e) => setMaterialText(e.target.value)}
                  placeholder="Provide any custom focus areas, exam hints, or lecture key points for Knowri AI Tutor..."
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-xl text-xs text-white placeholder-slate-500 resize-none font-mono text-[11px] outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  disabled={isUploadingMaterial}
                  onClick={() => {
                    setUploadingSubject(null);
                    setSelectedFile(null);
                    setMaterialTitle('');
                    setMaterialText('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingMaterial || (!selectedFile && !materialTitle.trim())}
                  className="kn-btn-primary px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isUploadingMaterial ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting & Indexing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Publish & Index for AI</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstructorClassroomsView;

