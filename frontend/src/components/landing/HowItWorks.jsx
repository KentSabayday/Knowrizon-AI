import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ScrollReveal, StaggerContainer, StaggerItem } from './ScrollReveal';

const steps = [
  { num: '01', title: 'Upload Your Notes', description: 'Drop PDFs, lecture slides, or paste your notes. Knowrizon instantly processes and understands your materials.' },
  { num: '02', title: 'AI Understands Content', description: 'Our AI analyzes materials, identifies key concepts, and builds a knowledge graph of your study content.' },
  { num: '03', title: 'Your Personal Tutor', description: 'Chat with Knowri about anything. Get explanations tailored to your level and learning style.' },
  { num: '04', title: 'Adaptive Quizzes', description: 'Take AI-generated quizzes targeting weak areas. Questions adapt in real-time to optimize retention.' },
  { num: '05', title: 'Track Your Progress', description: 'Visualize your learning journey with analytics. See mastery levels and what needs more attention.' },
];

export function HowItWorks() {
  const lineRef = useRef(null);
  const isInView = useInView(lineRef, { once: true, amount: 0.1 });

  return (
    <section id="how-it-works" className="py-24 lg:py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            How it <span className="kn-gradient-text">works</span>
          </h2>
          <p className="text-lg text-[#94A3B8]">
            From upload to mastery in five simple steps.
          </p>
        </ScrollReveal>

        <div ref={lineRef} className="relative">
          {/* Animated glowing timeline line */}
          <div className="absolute left-[1.4rem] md:left-8 top-0 bottom-0 w-px overflow-hidden">
            <motion.div
              initial={{ height: 0 }}
              animate={isInView ? { height: '100%' } : { height: 0 }}
              transition={{ duration: 2.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full bg-gradient-to-b from-[#22C7FF] via-[#5B5FFF] to-[#22C7FF]/10"
            />
          </div>

          <StaggerContainer staggerDelay={0.12} className="space-y-10 md:space-y-12">
            {steps.map((step) => (
              <StaggerItem key={step.num}>
                <div className="flex gap-5 md:gap-8">
                  {/* Number badge */}
                  <div className="relative flex-shrink-0 z-10">
                    <div className="w-11 h-11 md:w-16 md:h-16 rounded-2xl bg-[#111827] border border-white/[0.08] flex items-center justify-center shadow-lg shadow-black/20">
                      <span className="text-xs md:text-sm font-bold kn-gradient-text">{step.num}</span>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="pt-0.5 md:pt-3 pb-2">
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-1.5">{step.title}</h3>
                    <p className="text-[#94A3B8] text-sm md:text-base leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
