import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, Upload, Brain, Dumbbell, BookOpen, TrendingUp,
  ArrowRight, CheckCircle2, Circle, Clock, Sparkles, Zap, Target,
  FileText, Mic, Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';

/**
 * DashboardView — AI Learning Command Center.
 *
 * Philosophy: Observe → Recommend → Act → Celebrate → Continue
 * Every section answers "What should the learner do next?"
 *
 * Preserves: fetchStats, seedDemoData, stats display, guest mode.
 * New: Personalized hero, AI assistant panel, Knowledge Galaxy,
 *      Today's Missions, Quick Actions, Recent Activity timeline.
 */

/* ── Helpers ── */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}

function getKnowriMood() {
  const h = new Date().getHours();
  if (h < 12) return { emoji: '☕', text: "Let's start the day strong!" };
  if (h < 17) return { emoji: '📚', text: 'Keep up the great momentum!' };
  if (h < 21) return { emoji: '🤓', text: 'Evening study session — nice!' };
  return { emoji: '🌙', text: "Don't forget to rest tonight!" };
}

/** Simple count-up animation hook */
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (target <= 0) { setValue(0); return; }
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);

  return value;
}

/* ── Knowledge Galaxy SVG ── */

const GALAXY_SUBJECTS = [
  { name: 'Physics', mastery: 65, color: '#22C7FF', cx: 160, cy: 70 },
  { name: 'Math', mastery: 45, color: '#5B5FFF', cx: 55, cy: 140 },
  { name: 'Biology', mastery: 80, color: '#10B981', cx: 270, cy: 130 },
  { name: 'Chemistry', mastery: 30, color: '#F59E0B', cx: 120, cy: 200 },
  { name: 'Coding', mastery: 55, color: '#EC4899', cx: 50, cy: 55 },
  { name: 'History', mastery: 40, color: '#8B5CF6', cx: 280, cy: 55 },
];

const GALAXY_CONNECTIONS = [
  [0, 1], [0, 2], [1, 3], [2, 3], [0, 4], [4, 5], [5, 2],
];

function KnowledgeGalaxy({ subjects = GALAXY_SUBJECTS }) {
  return (
    <svg viewBox="0 0 330 250" className="w-full h-auto" role="img" aria-label="Knowledge Galaxy: subject mastery visualization">
      {/* Constellation lines */}
      {GALAXY_CONNECTIONS.map(([a, b], i) => (
        <line
          key={i}
          x1={subjects[a].cx} y1={subjects[a].cy}
          x2={subjects[b].cx} y2={subjects[b].cy}
          stroke="rgba(34, 199, 255, 0.08)"
          strokeWidth="1"
          className="dash-constellation"
        />
      ))}

      {/* Planets */}
      {subjects.map((s, i) => {
        const r = 14 + (s.mastery / 100) * 16;
        return (
          <g key={i} className="cursor-pointer">
            {/* Outer glow */}
            <circle cx={s.cx} cy={s.cy} r={r + 10} fill={s.color} opacity="0.06" className="dash-planet-glow" />
            {/* Planet body */}
            <circle cx={s.cx} cy={s.cy} r={r} fill={s.color} opacity="0.6" />
            {/* Core */}
            <circle cx={s.cx} cy={s.cy} r={r * 0.45} fill={s.color} opacity="0.9" />
            {/* Mastery % */}
            <text x={s.cx} y={s.cy + 3.5} textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="Inter, sans-serif">{s.mastery}%</text>
            {/* Label */}
            <text x={s.cx} y={s.cy + r + 15} textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="Inter, sans-serif">{s.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Stat Card ── */

function StatCard({ icon: Icon, label, value, color, delay = 0 }) {
  const count = useCountUp(typeof value === 'number' ? value : 0);
  const displayValue = typeof value === 'number' ? count : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="dash-card bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-[11px] text-[#64748B] uppercase tracking-wide font-medium">{label}</p>
          <p className="text-xl font-bold text-white">{displayValue}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Quick Action Card ── */

const QUICK_ACTIONS = [
  { icon: MessageSquare, label: 'Ask AI', desc: 'Chat with Knowri', path: '/lessons', color: '#22C7FF', guestVisible: true },
  { icon: Upload, label: 'Upload PDF', desc: 'Study materials', path: '/lessons', color: '#5B5FFF', guestVisible: true },
  { icon: Dumbbell, label: 'Take Quiz', desc: 'Test knowledge', path: '/practice', color: '#10B981', guestVisible: false },
  { icon: Brain, label: 'Flashcards', desc: 'Quick review', path: null, color: '#EC4899', guestVisible: false },
  { icon: Mic, label: 'Voice Chat', desc: 'Talk to Knowri', path: '/lessons', color: '#F59E0B', guestVisible: false },
  { icon: TrendingUp, label: 'View Progress', desc: 'Track learning', path: '/progress', color: '#8B5CF6', guestVisible: false },
];

/* ── Missions ── */

const DAILY_MISSIONS = [
  { id: 1, label: 'Complete a lesson', xp: 150, icon: BookOpen },
  { id: 2, label: 'Take a quiz', xp: 250, icon: Dumbbell },
  { id: 3, label: 'Upload study notes', xp: 100, icon: Upload },
  { id: 4, label: 'Chat with Knowri', xp: 50, icon: MessageSquare },
];

/* ── Timeline Events ── */

const TIMELINE_EVENTS = [
  { time: 'Just now', label: 'Logged in', icon: Zap, color: '#22C7FF' },
];

/* ── Main Component ── */

export function DashboardView({ onNavigate }) {
  const { user, token, isAnonymous } = useAuth();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [completedMissions, setCompletedMissions] = useState(new Set());

  const greeting = getGreeting();
  const knowriMood = getKnowriMood();
  const displayName = isAnonymous ? 'Guest' : (user?.name || 'Learner');

  useEffect(() => {
    if (!isAnonymous) {
      fetchStats();
    } else {
      setIsLoading(false);
    }
  }, [token, isAnonymous]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`${API_BASE}/progress`, { method: 'GET', headers });
      if (response.ok) {
        const data = await response.json();
        setStats(data.progressData);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const seedDemoData = async () => {
    setIsSeedingDemo(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`${API_BASE}/seed`, { method: 'POST', headers });
      if (response.ok) await fetchStats();
    } catch (err) {
      console.error('Failed to seed demo data:', err);
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const toggleMission = (id) => {
    setCompletedMissions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const quickActions = isAnonymous
    ? QUICK_ACTIONS.filter((a) => a.guestVisible)
    : QUICK_ACTIONS;

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="p-5 lg:p-7 space-y-6 overflow-auto h-full">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

        {/* ═══════ 1. Personalized Hero ═══════ */}
        <motion.div variants={fadeUp} className="relative overflow-hidden bg-gradient-to-r from-[#111827]/80 to-[#1A2234]/60 backdrop-blur-sm border border-white/[0.06] rounded-3xl p-6 lg:p-8">
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#22C7FF]/[0.04] rounded-full blur-[80px] pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  {greeting}, {displayName}
                </h1>
                <span className="text-2xl">👋</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <span className="text-base">{knowriMood.emoji}</span>
                <span>Knowri says: &ldquo;{knowriMood.text}&rdquo;</span>
              </div>

              {/* Stats badges */}
              {!isAnonymous && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/[0.08] border border-orange-500/[0.1]">
                    <span className="text-sm dash-flame">🔥</span>
                    <span className="text-xs font-semibold text-orange-300">1 Day Streak</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C7FF]/[0.08] border border-[#22C7FF]/[0.1]">
                    <Star className="w-3.5 h-3.5 text-[#22C7FF]" />
                    <span className="text-xs font-semibold text-[#22C7FF]">{stats?.totalQuizzes ? stats.totalQuizzes * 100 : 0} XP</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5B5FFF]/[0.08] border border-[#5B5FFF]/[0.1]">
                    <Target className="w-3.5 h-3.5 text-[#5B5FFF]" />
                    <span className="text-xs font-semibold text-[#5B5FFF]">Level 1</span>
                  </div>
                </div>
              )}
            </div>

            {/* CTA + seed */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => onNavigate?.('/lessons')}
                className="group px-6 py-3 text-sm font-semibold text-white rounded-xl kn-gradient-btn flex items-center gap-2"
              >
                Continue Learning
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              {!isAnonymous && (
                <button
                  onClick={seedDemoData}
                  disabled={isSeedingDemo}
                  className="px-4 py-3 text-xs text-[#64748B] hover:text-white border border-white/[0.08] hover:border-white/[0.15] rounded-xl transition-all disabled:opacity-50"
                >
                  {isSeedingDemo ? 'Loading...' : 'Load Demo'}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Guest banner */}
        {isAnonymous && (
          <motion.div variants={fadeUp} className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/[0.1]">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-sm font-medium text-amber-200">Guest Mode — Limited Access</p>
              <p className="text-xs text-amber-400/60 mt-0.5">Create an account to unlock quizzes, progress tracking, study groups, and more.</p>
            </div>
          </motion.div>
        )}

        {/* ═══════ 2. AI Assistant + Missions Grid ═══════ */}
        {!isAnonymous && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* AI Assistant Panel (2/3) */}
            <motion.div variants={fadeUp} className="lg:col-span-2 dash-card bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-3xl p-6 space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Knowri&apos;s Recommendations</h3>
                  <p className="text-[11px] text-[#64748B]">Based on your recent activity</p>
                </div>
              </div>

              {/* AI message with typing cursor */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                <p className="text-sm text-[#CBD5E1] leading-relaxed">
                  {stats && stats.totalQuizzes > 0 ? (
                    <>
                      I see you&apos;ve completed <span className="text-[#22C7FF] font-medium">{stats.totalQuizzes} quizzes</span> with a{' '}
                      <span className="text-[#10B981] font-medium">{stats.successRate}%</span> success rate. Let&apos;s keep building on that!
                      I recommend reviewing your weaker topics and trying a new challenge.
                    </>
                  ) : (
                    <>
                      Welcome to your learning workspace! I&apos;m Knowri, your AI study companion.
                      Start by uploading some study materials or chatting with me about any topic.
                      I&apos;ll track your progress and recommend what to study next.
                    </>
                  )}
                  <span className="dash-cursor text-[#22C7FF] ml-0.5">|</span>
                </p>
              </div>

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-2">
                {['Continue studying', 'Generate a quiz', 'Upload notes', 'Ask a question'].map((label) => (
                  <button
                    key={label}
                    onClick={() => onNavigate?.('/lessons')}
                    className="px-3.5 py-2 text-xs text-[#94A3B8] rounded-xl border border-white/[0.06] hover:border-[#22C7FF]/30 hover:text-[#22C7FF] hover:bg-[#22C7FF]/[0.04] transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Today's Missions (1/3) */}
            <motion.div variants={fadeUp} className="dash-card bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#22C7FF]" />
                  Today&apos;s Missions
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22C7FF]/10 text-[#22C7FF] font-medium">
                  {completedMissions.size}/{DAILY_MISSIONS.length}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-white/[0.04] rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] rounded-full dash-progress-fill"
                  style={{ '--target-width': `${(completedMissions.size / DAILY_MISSIONS.length) * 100}%`, width: `${(completedMissions.size / DAILY_MISSIONS.length) * 100}%` }}
                />
              </div>

              <ul className="space-y-2.5">
                {DAILY_MISSIONS.map((mission) => {
                  const done = completedMissions.has(mission.id);
                  const Icon = mission.icon;
                  return (
                    <li key={mission.id}>
                      <button
                        onClick={() => toggleMission(mission.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                          done ? 'bg-[#22C55E]/[0.06] border border-[#22C55E]/[0.1]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-[#22C55E] flex-shrink-0 dash-check-pop" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#475569] flex-shrink-0" />
                        )}
                        <span className={`text-xs flex-1 ${done ? 'text-[#22C55E] line-through' : 'text-[#CBD5E1]'}`}>
                          {mission.label}
                        </span>
                        <span className={`text-[10px] font-medium ${done ? 'text-[#22C55E]' : 'text-[#475569]'}`}>
                          +{mission.xp} XP
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </div>
        )}

        {/* ═══════ 3. Quick Actions ═══════ */}
        <motion.div variants={fadeUp}>
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#22C7FF]" />
            Quick Actions
          </h2>
          <div className={`grid gap-3 ${isAnonymous ? 'grid-cols-1 sm:grid-cols-2 max-w-lg' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'}`}>
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => action.path && onNavigate?.(action.path)}
                  disabled={!action.path}
                  className="group dash-card bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4 text-left transition-all disabled:cursor-not-allowed"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ backgroundColor: `${action.color}12` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: action.color }} />
                  </div>
                  <p className="text-xs font-medium text-white">{action.label}</p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">{action.desc}</p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ═══════ 4. Knowledge Galaxy + Stats ═══════ */}
        {!isAnonymous && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Knowledge Galaxy */}
            <motion.div variants={fadeUp} className="dash-card bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-3xl p-6">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5B5FFF]" />
                Knowledge Galaxy
              </h3>
              <p className="text-[11px] text-[#64748B] mb-4">Your learning universe — planets grow as mastery increases</p>
              <KnowledgeGalaxy />
            </motion.div>

            {/* Stats Overview */}
            <motion.div variants={fadeUp} className="space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
                Performance
              </h3>

              {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-2xl bg-[#111827]/60 border border-white/[0.06] dash-shimmer" />
                  ))}
                </div>
              ) : stats && stats.totalQuizzes > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={Dumbbell} label="Quizzes" value={stats.totalQuizzes} color="#22C7FF" delay={0} />
                  <StatCard icon={CheckCircle2} label="Success Rate" value={`${stats.successRate}%`} color="#10B981" delay={0.08} />
                  <StatCard icon={Brain} label="Topics Mastered" value={stats.topicsMastered?.length || 0} color="#5B5FFF" delay={0.16} />
                  <StatCard icon={Clock} label="Study Sessions" value={stats.totalQuizzes * 2} color="#F59E0B" delay={0.24} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-3xl">
                  <span className="text-3xl mb-3">🚀</span>
                  <p className="text-sm text-[#94A3B8] font-medium">No data yet</p>
                  <p className="text-xs text-[#475569] mt-1 max-w-[200px]">Complete a quiz or load demo data to see your stats here</p>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* ═══════ 5. Recent Activity Timeline ═══════ */}
        {!isAnonymous && (
          <motion.div variants={fadeUp} className="dash-card bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-3xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#94A3B8]" />
              Recent Activity
            </h3>

            <div className="relative pl-6 space-y-4">
              {/* Timeline line */}
              <div className="absolute left-2 top-1 bottom-1 w-px bg-white/[0.06]" />

              {(stats && stats.totalQuizzes > 0
                ? [
                    { time: 'Recent', label: `Completed ${stats.totalQuizzes} quizzes`, icon: Dumbbell, color: '#22C7FF' },
                    { time: 'Recent', label: `Achieved ${stats.successRate}% accuracy`, icon: CheckCircle2, color: '#10B981' },
                    { time: 'Recent', label: `Mastered ${stats.topicsMastered?.length || 0} topics`, icon: Brain, color: '#5B5FFF' },
                    ...TIMELINE_EVENTS,
                  ]
                : TIMELINE_EVENTS
              ).map((event, i) => {
                const Icon = event.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 relative"
                  >
                    {/* Dot */}
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-[#0B1220] flex items-center justify-center" style={{ backgroundColor: event.color }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div>
                      <p className="text-xs text-white font-medium">{event.label}</p>
                      <p className="text-[10px] text-[#475569] mt-0.5">{event.time}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ═══════ 6. Getting Started (new users / no data) ═══════ */}
        {!isAnonymous && !isLoading && (!stats || stats.totalQuizzes === 0) && (
          <motion.div variants={fadeUp} className="dash-card bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-3xl p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Getting Started</h3>
            <p className="text-[11px] text-[#64748B] mb-4">Follow these steps to begin your learning journey</p>

            <div className="space-y-3">
              {[
                { step: 1, title: 'Chat with your AI Tutor', desc: 'Ask questions about any topic and get detailed explanations.', color: '#22C7FF' },
                { step: 2, title: 'Upload Study Materials', desc: 'Upload videos or PDFs and let the AI extract key points.', color: '#5B5FFF' },
                { step: 3, title: 'Take Quizzes', desc: 'Test your knowledge with AI-generated quizzes and track progress.', color: '#10B981' },
              ].map(({ step, title, desc, color }) => (
                <div key={step} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                    {step}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{title}</h4>
                    <p className="text-xs text-[#64748B] mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}

export default DashboardView;
