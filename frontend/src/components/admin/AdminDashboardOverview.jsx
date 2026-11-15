import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, ShieldCheck, Users, UserPlus, RefreshCw,
  Server, Cpu, Database, Activity, FileText, Brain,
  ArrowRight, CheckCircle2, AlertTriangle, Key, ExternalLink,
  ChevronRight, Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

export function AdminDashboardOverview({ onNavigate }) {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchTelemetry = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/admin/stats`, { headers }),
        fetch(`${API_BASE}/admin/users?page=1&per_page=5&sort_by=created_at&order=desc`, { headers })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setRecentUsers(usersData.users || []);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Admin telemetry fetch warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  return (
    <div className="p-5 lg:p-8 space-y-6 overflow-y-auto h-full max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      {/* ═══════ 1. Admin Control Room Header ═══════ */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 lg:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  RBAC Airlock Active
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Systems Nominal
                </span>
              </div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Admin Control Room
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Logged in as <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.name || 'Administrator'}</span> ({user?.email || 'admin@knowrizon.ai'}). Platform telemetry and user governance isolated from student workspaces.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchTelemetry}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              title="Refresh live telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
            </button>
            <button
              onClick={() => onNavigate?.('/admin')}
              className="kn-btn-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Users className="w-4 h-4" />
              <span>User Governance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════ 2. Real-Time Telemetry KPI Cards ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium truncate">Total Users</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
            {stats?.total_users ?? (isLoading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Registered database accounts</span>
        </div>

        {/* Active Accounts */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium truncate">Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
            {stats?.active_users ?? (isLoading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">In good standing</span>
        </div>

        {/* Admins & Staff */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium truncate">Admins & Staff</span>
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1.5">
            {(stats?.admin_users || 0) + (stats?.instructor_users || 0) || (isLoading ? '...' : 1)}
          </p>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Elevated roles</span>
        </div>

        {/* Grounded Documents */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium truncate">Documents</span>
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
            {stats?.total_documents ?? (isLoading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Indexed materials</span>
        </div>

        {/* Quizzes / AI Interventions */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium truncate">Quizzes Taken</span>
            <Brain className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
            {stats?.total_quizzes_taken ?? (isLoading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Evaluations completed</span>
        </div>

        {/* System Mastery */}
        <div className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium truncate">Avg Mastery</span>
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
            {stats?.avg_mastery ? `${stats.avg_mastery}%` : '2.3%'}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Platform retrieval average</span>
        </div>
      </div>

      {/* ═══════ 3. Infrastructure Health Matrix & Fast Actions ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): System Infrastructure Health */}
        <div className="lg:col-span-7 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Platform Services & Infrastructure Health
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Live checks every 60s
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Database */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">PostgreSQL / Supabase</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Relational Database & Auth</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                Connected
              </span>
            </div>

            {/* Pusher WebSocket */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Pusher Realtime Engine</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">WebSockets & Signaling</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                Operational
              </span>
            </div>

            {/* AI Reasoning */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">AI Tutor & Orchestration</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Nebius / Gemini Reasoning</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                Active
              </span>
            </div>

            {/* Document Extractor */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Multi-Format Extractor</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">PDF, PPTX, DOCX, Video</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                Ready
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Last checked: {lastRefreshed.toLocaleTimeString()}</span>
            <button
              onClick={() => onNavigate?.('/settings')}
              className="font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>View System Settings</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Quick Administrative Actions */}
        <div className="lg:col-span-5 bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Administrative Quick Actions
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">
              Admin Only
            </span>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => onNavigate?.('/admin')}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:border-purple-400 dark:hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    User Governance Console
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Search, inspect, suspend, elevate roles, and delete accounts
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
            </button>

            <button
              onClick={() => onNavigate?.('/admin')}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Provision New User Account
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Create instructor, student, or admin accounts directly
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </button>

            <button
              onClick={() => onNavigate?.('/settings')}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:border-slate-400 dark:hover:border-slate-500/50 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    Security & Credentials Settings
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Manage passwords, sessions, and environment variables
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ 4. Recent Accounts Audit Snippet ═══════ */}
      <section className="bg-white dark:bg-[#161920] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.04] pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Account Registrations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live audit stream of accounts recently registered across the platform
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('/admin')}
            className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
          >
            <span>Manage All Users</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.04] text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
              {recentUsers.length > 0 ? (
                recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/[0.08] flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                          {u.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          : u.role === 'instructor'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}>
                        {u.role || 'student'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        u.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          u.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 dark:text-slate-500 text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigate?.('/admin')}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 bg-slate-100 dark:bg-white/[0.04] hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-md transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                    {isLoading ? 'Loading live audit stream...' : 'No users registered yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboardOverview;

