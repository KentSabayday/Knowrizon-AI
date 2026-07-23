import { ScrollReveal } from './ScrollReveal';

export function DashboardPreview() {
  return (
    <section className="py-24 lg:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Your learning <span className="kn-gradient-text">command center</span>
          </h2>
          <p className="text-lg text-[#94A3B8]">
            Track progress, manage materials, and see your growth — all in one place.
          </p>
        </ScrollReveal>

        <ScrollReveal variant="scaleUp">
          <div className="relative">
            {/* Browser chrome frame */}
            <div className="kn-glass rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/40">
              {/* Title bar */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]/70" />
                  <div className="w-3 h-3 rounded-full bg-[#FEBC2E]/70" />
                  <div className="w-3 h-3 rounded-full bg-[#28C840]/70" />
                </div>
                <div className="flex-1 max-w-sm mx-auto">
                  <div className="bg-white/[0.04] rounded-lg px-4 py-1.5 text-xs text-[#475569] text-center">
                    app.knowrizon.ai/dashboard
                  </div>
                </div>
                <div className="w-16" />
              </div>

              {/* Dashboard layout */}
              <div className="flex min-h-[380px]">
                {/* Sidebar */}
                <div className="hidden md:flex flex-col w-52 border-r border-white/[0.06] py-4 px-3">
                  <div className="flex items-center gap-2 px-3 mb-6">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] flex items-center justify-center text-[10px] font-bold text-white">K</div>
                    <span className="text-sm font-semibold kn-gradient-text">Knowrizon</span>
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
                          ? 'bg-[#22C7FF]/10 text-[#22C7FF] font-medium'
                          : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-white/[0.02]'
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
                    <h3 className="text-base font-semibold text-white">Welcome back, Student 👋</h3>
                    <p className="text-xs text-[#475569]">Here's your learning overview for this week</p>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {[
                      { label: 'Study Hours', value: '24.5h', color: '#22C7FF', trend: '+3.2h' },
                      { label: 'Quizzes Done', value: '18', color: '#5B5FFF', trend: '+5' },
                      { label: 'Accuracy', value: '87%', color: '#22C7FF', trend: '+4%' },
                      { label: 'Day Streak', value: '12 🔥', color: '#F59E0B', trend: '' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.04]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-[#475569]">{stat.label}</span>
                          {stat.trend && <span className="text-[10px] text-emerald-400">{stat.trend}</span>}
                        </div>
                        <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bars */}
                  <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-white">Course Progress</span>
                      <span className="text-[11px] text-[#475569]">This semester</span>
                    </div>
                    {[
                      { course: 'Biology 101', progress: 78, color: '#22C7FF' },
                      { course: 'Physics Mechanics', progress: 45, color: '#5B5FFF' },
                      { course: 'Organic Chemistry', progress: 92, color: '#10B981' },
                    ].map((c) => (
                      <div key={c.course} className="mb-3 last:mb-0">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-[#94A3B8]">{c.course}</span>
                          <span className="text-[#475569] font-medium">{c.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
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
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[70%] h-20 bg-[#22C7FF]/[0.04] blur-[50px] rounded-full pointer-events-none" />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
