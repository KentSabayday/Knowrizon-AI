import { ScrollReveal, StaggerContainer, StaggerItem } from './ScrollReveal';

const testimonials = [
  {
    name: 'Maria Santos',
    university: 'University of the Philippines',
    avatar: 'MS',
    rating: 5,
    quote: 'Knowrizon completely changed how I study for exams. The AI tutor explains concepts better than most textbooks, and the quizzes help me focus on what I actually need to review.',
  },
  {
    name: 'James Chen',
    university: 'De La Salle University',
    avatar: 'JC',
    rating: 5,
    quote: "I uploaded my entire semester's notes and Knowrizon created personalized study plans. My grades improved from B to A+ in just one semester.",
  },
  {
    name: 'Sofia Rodriguez',
    university: 'Ateneo de Manila',
    avatar: 'SR',
    rating: 5,
    quote: 'The adaptive quizzes are incredible. They somehow know exactly which topics I\'m weakest on and keep testing me until I truly understand the material.',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 lg:py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Loved by <span className="kn-gradient-text">students</span>
          </h2>
          <p className="text-lg text-[#94A3B8]">
            See what learners are saying about their experience with Knowri.
          </p>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.12} className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {testimonials.map((t) => (
            <StaggerItem key={t.name}>
              <div className="kn-glass rounded-2xl p-6 kn-glass-hover h-full flex flex-col">
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }, (_, i) => (
                    <span key={i} className="text-amber-400 text-sm">★</span>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-[#E2E8F0] text-sm leading-relaxed mb-6 flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#22C7FF] to-[#5B5FFF] flex items-center justify-center text-xs font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{t.name}</div>
                    <div className="text-xs text-[#475569]">{t.university}</div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
