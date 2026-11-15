import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Mail, Calendar, Clock, BookOpen, Brain,
  Sparkles, Shield, AlertCircle, FileText, CheckCircle2, Loader2
} from 'lucide-react';
import { API_BASE } from '../../lib/api';

export function UserDetailDrawer({ isOpen, onClose, userId, token }) {
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchDetail();
    }
  }, [isOpen, userId]);

  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to load user portfolio');
      }
      const data = await res.json();
      setDetail(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-lg bg-[#0F172A] border-l border-white/[0.08] shadow-2xl h-full flex flex-col text-white"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#22C7FF] to-[#5B5FFF] flex items-center justify-center font-bold text-white shadow-lg shadow-[#22C7FF]/20">
              {detail?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white truncate max-w-[280px]">
                {detail?.name || 'User Portfolio'}
              </h2>
              <p className="text-[11px] text-[#94A3B8] truncate max-w-[280px]">
                {detail?.email}
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

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 className="w-8 h-8 text-[#22C7FF] animate-spin" />
              <p className="text-xs text-[#94A3B8]">Loading user portfolio telemetry...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : detail ? (
            <>
              {/* Status and Role Badges */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                    detail.role === 'admin'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : detail.role === 'instructor'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {detail.role || 'Student'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                    detail.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {detail.status || 'Active'}
                  </span>
                </div>
                <span className="text-[11px] text-[#64748B]">
                  ID: <span className="font-mono text-[10px]">{detail.id?.substring(0, 8)}...</span>
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <p className="text-[10px] uppercase font-bold text-[#64748B] mb-0.5">Documents</p>
                  <p className="text-lg font-bold text-white">{detail.metrics?.documentCount || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <p className="text-[10px] uppercase font-bold text-[#64748B] mb-0.5">Quizzes</p>
                  <p className="text-lg font-bold text-[#22C7FF]">{detail.metrics?.quizCount || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <p className="text-[10px] uppercase font-bold text-[#64748B] mb-0.5">Mastery Avg</p>
                  <p className="text-lg font-bold text-emerald-400">{detail.metrics?.averageScore || 0}%</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                  <p className="text-[10px] uppercase font-bold text-[#64748B] mb-0.5">Sessions</p>
                  <p className="text-lg font-bold text-purple-400">{detail.metrics?.conversationCount || 0}</p>
                </div>
              </div>

              {/* Account Timestamps */}
              <div className="space-y-2 text-xs text-[#94A3B8]">
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Joined Date:</span>
                  </span>
                  <span className="text-white font-mono text-[11px]">
                    {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Last Sign-In:</span>
                  </span>
                  <span className="text-white font-mono text-[11px]">
                    {detail.lastLogin ? new Date(detail.lastLogin).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>

              {/* Recent Documents */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#22C7FF]" />
                  <span>Uploaded Grounding Materials ({detail.recentDocuments?.length || 0})</span>
                </h3>
                {detail.recentDocuments && detail.recentDocuments.length > 0 ? (
                  <div className="space-y-2">
                    {detail.recentDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-[#22C7FF] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{doc.title || doc.filename}</p>
                            <p className="text-[10px] text-[#64748B] uppercase">{doc.fileType || 'Doc'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#64748B] font-mono shrink-0 ml-2">
                          {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#64748B] italic">No documents uploaded yet.</p>
                )}
              </div>

              {/* Recent Quiz Scores */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  <span>Recent Retrieval Practice ({detail.recentQuizzes?.length || 0})</span>
                </h3>
                {detail.recentQuizzes && detail.recentQuizzes.length > 0 ? (
                  <div className="space-y-2">
                    {detail.recentQuizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs"
                      >
                        <span className="text-white font-medium truncate pr-2">{quiz.topic}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                            quiz.score >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {quiz.score}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#64748B] italic">No quizzes completed yet.</p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

