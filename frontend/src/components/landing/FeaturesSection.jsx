import { MessageSquare, Upload, Brain } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const features = [
  {
    icon: MessageSquare,
    title: 'AI Chat Tutor',
    description: 'Ask anything, get clear explanations. Your AI tutor is available 24/7 with personalized responses adapted to your level.',
    preview: 'chat',
  },
  {
    icon: Upload,
    title: 'Smart Content Upload',
    description: 'Upload PDFs, videos, and notes. Knowrizon extracts key concepts, creates summaries, and builds interactive study sessions.',
    preview: 'upload',
  },
  {
    icon: Brain,
    title: 'Adaptive Quizzes',
    description: 'AI-generated quizzes that target your weak areas. Get instant feedback and watch your understanding grow over time.',
    preview: 'quiz',
  },
];

/* ===== Mini product previews — high-contrast for Light & Dark ===== */

function ChatPreview() {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="bg-blue-600 text-white rounded-2xl rounded-br-xs px-4 py-2.5 text-sm max-w-[80%] font-medium shadow-2xs">
          What is quantum entanglement?
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5 shadow-2xs">K</div>
        <div className="bg-white dark:bg-[#161920] text-slate-700 dark:text-[#CBD5E1] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl rounded-bl-xs px-4 py-2.5 text-sm leading-relaxed max-w-[88%] shadow-2xs">
          Quantum entanglement is when two particles become linked — measuring one <strong className="text-slate-900 dark:text-[#E2E8F0]">instantly</strong> affects the other, regardless of distance. Einstein called it <em>"spooky action at a distance."</em> 🔬
        </div>
      </div>
    </div>
  );
}

function UploadPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl p-3 border border-slate-200 dark:border-white/[0.04]">
        <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center text-red-500 font-bold text-xs">PDF</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-900 dark:text-white font-medium truncate">Biology_Chapter_5.pdf</div>
          <div className="text-xs text-slate-500 dark:text-[#475569]">2.4 MB · 24 pages</div>
        </div>
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ Analyzed</span>
      </div>
      <div className="text-xs text-slate-500 dark:text-[#64748B] mb-1 font-medium">AI generated from your content:</div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Summary', count: '1' },
          { label: 'Flashcards', count: '24' },
          { label: 'Quiz', count: '10 Q' },
        ].map((item) => (
          <div key={item.label} className="bg-slate-50 dark:bg-white/[0.03] rounded-lg px-3 py-2.5 text-center border border-slate-200 dark:border-white/[0.04]">
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{item.count}</div>
            <div className="text-[10px] text-slate-500 dark:text-[#64748B] mt-0.5 font-medium">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuizPreview() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500 dark:text-[#475569] font-medium">Question 3 of 10</span>
        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Biology 101</span>
      </div>
      <div className="text-sm text-slate-900 dark:text-white font-semibold mb-3">What is the powerhouse of the cell?</div>
      {[
        { text: 'Nucleus', selected: false },
        { text: 'Mitochondria', selected: true },
        { text: 'Ribosome', selected: false },
        { text: 'Golgi body', selected: false },
      ].map((opt) => (
        <div
          key={opt.text}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
            opt.selected
              ? 'border-blue-500 bg-blue-50/60 text-blue-700 dark:border-blue-400/50 dark:bg-blue-950/30 dark:text-blue-300 font-medium'
              : 'border-slate-200 text-slate-700 bg-white/70 dark:bg-transparent dark:border-white/[0.05] dark:text-[#94A3B8]'
          }`}
        >
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            opt.selected ? 'border-blue-600 dark:border-blue-400' : 'border-slate-300 dark:border-white/20'
          }`}>
            {opt.selected && <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />}
          </div>
          {opt.text}
          {opt.selected && <span className="ml-auto text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Correct</span>}
        </div>
      ))}
    </div>
  );
}

const previews = { chat: ChatPreview, upload: UploadPreview, quiz: QuizPreview };

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16 lg:mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Everything you need to{' '}
            <span className="kn-gradient-text">learn smarter</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-[#94A3B8] max-w-2xl mx-auto">
            Powerful AI tools designed specifically for how students actually study.
          </p>
        </ScrollReveal>

        {/* Alternating layout */}
        <div className="space-y-20 lg:space-y-28">
          {features.map((feature, i) => {
            const Preview = previews[feature.preview];
            const isReversed = i % 2 === 1;

            return (
              <ScrollReveal key={feature.title} variant={isReversed ? 'slideLeft' : 'slideRight'}>
                <div className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}>
                  {/* Interactive preview card */}
                  <div className="flex-1 w-full max-w-md lg:max-w-none">
                    <div className="kn-glass rounded-2xl p-6 kn-glass-hover border border-slate-200/80 dark:border-white/[0.08]">
                      <Preview />
                    </div>
                  </div>

                  {/* Feature description */}
                  <div className="flex-1 text-center lg:text-left">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 mb-5 shadow-2xs">
                      <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">{feature.title}</h3>
                    <p className="text-slate-600 dark:text-[#94A3B8] text-lg leading-relaxed max-w-md">{feature.description}</p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}