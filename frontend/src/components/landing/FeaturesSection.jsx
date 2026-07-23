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

/* ===== Mini product previews (not icon cards) — show the real product ===== */

function ChatPreview() {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="bg-gradient-to-r from-[#22C7FF]/15 to-[#5B5FFF]/15 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-[#E2E8F0] max-w-[80%]">
          What is quantum entanglement?
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#22C7FF] to-[#5B5FFF] flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5">K</div>
        <div className="bg-white/[0.04] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-[#94A3B8] leading-relaxed max-w-[88%]">
          Quantum entanglement is when two particles become linked — measuring one <strong className="text-[#E2E8F0]">instantly</strong> affects the other, regardless of distance. Einstein called it <em>"spooky action at a distance."</em> 🔬
        </div>
      </div>
    </div>
  );
}

function UploadPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
        <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center text-red-400 text-xs font-bold">PDF</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-medium truncate">Biology_Chapter_5.pdf</div>
          <div className="text-xs text-[#475569]">2.4 MB · 24 pages</div>
        </div>
        <span className="text-xs text-emerald-400 font-medium">✓ Analyzed</span>
      </div>
      <div className="text-xs text-[#64748B] mb-1">AI generated from your content:</div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Summary', count: '1' },
          { label: 'Flashcards', count: '24' },
          { label: 'Quiz', count: '10 Q' },
        ].map((item) => (
          <div key={item.label} className="bg-white/[0.03] rounded-lg px-3 py-2.5 text-center border border-white/[0.04]">
            <div className="text-xs font-semibold text-[#22C7FF]">{item.count}</div>
            <div className="text-[10px] text-[#64748B] mt-0.5">{item.label}</div>
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
        <span className="text-xs text-[#475569]">Question 3 of 10</span>
        <span className="text-xs text-[#22C7FF] font-medium">Biology 101</span>
      </div>
      <div className="text-sm text-white font-medium mb-3">What is the powerhouse of the cell?</div>
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
              ? 'border-[#22C7FF]/30 bg-[#22C7FF]/8 text-[#22C7FF]'
              : 'border-white/[0.05] text-[#94A3B8]'
          }`}
        >
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            opt.selected ? 'border-[#22C7FF]' : 'border-white/20'
          }`}>
            {opt.selected && <div className="w-2 h-2 rounded-full bg-[#22C7FF]" />}
          </div>
          {opt.text}
          {opt.selected && <span className="ml-auto text-xs">✓ Correct</span>}
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
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Everything you need to{' '}
            <span className="kn-gradient-text">learn smarter</span>
          </h2>
          <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
            Powerful AI tools designed specifically for how students actually study.
          </p>
        </ScrollReveal>

        {/* Alternating layout — NOT icon cards */}
        <div className="space-y-20 lg:space-y-28">
          {features.map((feature, i) => {
            const Preview = previews[feature.preview];
            const isReversed = i % 2 === 1;

            return (
              <ScrollReveal key={feature.title} variant={isReversed ? 'slideLeft' : 'slideRight'}>
                <div className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}>
                  {/* Interactive preview card */}
                  <div className="flex-1 w-full max-w-md lg:max-w-none">
                    <div className="kn-glass rounded-2xl p-6 kn-glass-hover">
                      <Preview />
                    </div>
                  </div>

                  {/* Feature description */}
                  <div className="flex-1 text-center lg:text-left">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#22C7FF]/10 to-[#5B5FFF]/10 border border-[#22C7FF]/15 mb-5">
                      <feature.icon className="w-6 h-6 text-[#22C7FF]" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
                    <p className="text-[#94A3B8] text-lg leading-relaxed max-w-md">{feature.description}</p>
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
