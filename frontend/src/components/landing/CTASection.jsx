import { KnowrizonMascot } from '../ui/KnowrizonMascot';
import { ScrollReveal } from './ScrollReveal';

export function CTASection({ onGetStarted }) {
  return (
    <section className="py-24 lg:py-32 px-6">
      <ScrollReveal variant="scaleUp">
        <div className="max-w-5xl mx-auto relative overflow-hidden rounded-3xl kn-glass border border-slate-200/90 dark:border-white/[0.08] shadow-xl dark:shadow-2xl">
          {/* Layered subtle background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent" />

          {/* Ambient glows */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row items-center gap-8 lg:gap-14 p-8 md:p-12 lg:p-16">
            {/* Content */}
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                Ready to learn{' '}
                <span className="kn-gradient-text">smarter</span>?
              </h2>
              <p className="text-base md:text-lg text-slate-600 dark:text-[#94A3B8] mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed font-normal">
                Join thousands of students already studying with their AI tutor. Free forever — no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <button
                  onClick={onGetStarted}
                  className="group px-7 py-3 text-sm font-semibold text-white rounded-xl kn-btn-primary inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  Create My AI Tutor
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </button>
                <button className="px-8 py-3.5 text-base font-medium text-slate-700 dark:text-[#94A3B8] rounded-xl border border-slate-300 dark:border-white/[0.1] hover:border-slate-400 dark:hover:border-white/[0.2] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/[0.03] transition-all duration-300">
                  Book a Demo
                </button>
              </div>
            </div>

            {/* Mini mascot */}
            <div className="hidden lg:flex flex-shrink-0 items-center justify-center">
              <div className="opacity-90 scale-95">
                <KnowrizonMascot className="w-[160px]" />
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}