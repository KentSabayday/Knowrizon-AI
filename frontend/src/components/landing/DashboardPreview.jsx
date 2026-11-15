import { ScrollReveal } from './ScrollReveal';

export function DashboardPreview() {
  return (
    <section className="py-24 lg:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Your learning <span className="kn-gradient-text">command center</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-[#94A3B8]">
            Track progress, manage materials, and see your growth — all in one place.
          </p>
        </ScrollReveal>

        <ScrollReveal variant="scaleUp">
          <div className="relative">
            {/* Browser chrome frame */}
            <div className="kn-glass rounded-2xl overflow-hidden border border-slate-200/90 dark:border-white/[0.08] shadow-xl dark:shadow-2xl dark:shadow-black/40">
              {/* Title bar */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/80 dark:border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#FEBC2E]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#28C840]/80" />
                </div>
                <div className="flex-1 max-w-sm mx-auto">
                  <div className="bg-slate-100 dark:bg-white/[0.04] border border-slate-200/70 dark:border-transparent rounded-lg px-4 py-1.5 text-xs text-slate-600 dark:text-[#475569] text-center font-medium">
                    app.knowrizon.ai/dashboard
                  </div>
                </div>
                <div className="w-16" />
              </div>

              {/* Dashboard layout */}
              <div className="flex min-h-[380px]">
                {/* Sidebar */}
                <div className="hidden md:flex flex-col w-52 border-r border-slate-200/80 dark:border-white/[0.06] py-4 px-3">
                  <div className="flex items-center gap-2 px-3 mb-6">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-2xs">K</div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Knowrizon</span>
                  </div>
                  {[
                    { icon: '📊', label: 'Dashboard', active: true },
                    { icon: '💬', label: 'AI Tutor', active: false },
                    { icon: '📚', label: 'Materials', active: false },
                    { icon: '📝', label: 'Quizzes', active: false },
                    { icon: '📈', label: 'Progress', active: false },
                    { icon: '⚙️', label: 'Settings', active: false },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-colors ${
                        item.active
                          ? 'bg-blue-50 text-blue-700 dark:bg-white/[0.08] dark:text-white font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#64748B] dark:hover:text-[#94A3B8] dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Main content area */}
                <div className="flex-1 p-5 md:p-6">
                  {/* Greeting */}
                  <div className="mb-5">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">Welcome back, Student 👋</h3>
                    <p className="text-xs text-slate-500 dark:text-[#475569]">Here's your learning overview for this week</p>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {[
                      { label: 'Study Hours', value: '24.5h', color: '#2563EB', trend: '+3.2h' },
                      { label: 'Quizzes Done', value: '18', color: '#4F46E5', trend: '+5' },
                      { label: 'Accuracy', value: '87%', color: '#2563EB', trend: '+4%' },
                      { label: 'Day Streak', value: '12 🔥', color: '#D97706', trend: '' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-3.5 border border-slate-200 dark:border-white/[0.04]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-slate-600 dark:text-[#475569] font-medium">{stat.label}</span>
                          {stat.trend && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{stat.trend}</span>}
                        </div>
                        <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bars */}
                  <div className="bg-slate-50 dark:bg-white/[0.02] rounded-xl p-4 border border-slate-200 dark:border-white/[0.04]">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Course Progress</span>
                      <span className="text-[11px] text-slate-500 dark:text-[#475569]">This semester</span>
                    </div>
                    {[
                      { course: 'Biology 101', progress: 78, color: '#2563EB' },
                      { course: 'Physics Mechanics', progress: 45, color: '#4F46E5' },
                      { course: 'Organic Chemistry', progress: 92, color: '#059669' },
                    ].map((c) => (
                      <div key={c.course} className="mb-3 last:mb-0">
                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                          <span className="text-slate-700 dark:text-[#94A3B8]">{c.course}</span>
                          <span className="text-slate-600 dark:text-[#475569]">{c.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-white/[0.04] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${c.progress}%`, backgroundColor: c.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Reflection glow */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[70%] h-20 bg-blue-600/[0.04] blur-[50px] rounded-full pointer-events-none" />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}