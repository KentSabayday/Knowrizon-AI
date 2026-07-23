import { useRef, useEffect, useState } from 'react';
import { useInView } from 'framer-motion';
import { ScrollReveal } from './ScrollReveal';

const metrics = [
  { value: 10000, suffix: '+', label: 'Students' },
  { value: 500, suffix: 'K+', label: 'Questions Answered' },
  { value: 100, suffix: 'K+', label: 'Materials Uploaded' },
  { value: 98, suffix: '%', label: 'Satisfaction' },
];

function useCountUp(target, duration = 2000, shouldStart = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;
    let startTime = null;
    let raf;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, shouldStart]);

  return count;
}

function MetricCard({ value, suffix, label }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const count = useCountUp(value, 2200, isInView);

  return (
    <div ref={ref} className="text-center px-4 py-4 md:px-6">
      <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 tabular-nums">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs md:text-sm text-[#64748B]">{label}</div>
    </div>
  );
}

export function SocialProof() {
  return (
    <section className="py-12 lg:py-16 px-6">
      <ScrollReveal>
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs uppercase tracking-widest text-[#475569] mb-6 font-medium">
            Trusted by students worldwide
          </p>
          <div className="kn-glass rounded-2xl py-6 px-2">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.06]">
              {metrics.map((m) => (
                <MetricCard key={m.label} {...m} />
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
