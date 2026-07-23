import { ScrollReveal, StaggerContainer, StaggerItem } from './ScrollReveal';

const items = [
  {
    title: '24/7 AI Tutor',
    description: 'Get help anytime, anywhere. Knowri never sleeps and adapts to your schedule and pace.',
    size: 'large',
    icon: '🤖',
  },
  {
    title: 'Smart Flashcards',
    description: 'Auto-generated from your materials with spaced repetition algorithms.',
    size: 'medium',
    icon: '📇',
  },
  {
    title: 'Study Groups',
    description: 'Collaborate with classmates in shared AI-powered study rooms.',
    size: 'medium',
    icon: '👥',
  },
  {
    title: '50+',
    description: 'Subjects supported',
    size: 'small',
    icon: null,
  },
  {
    title: '< 2s',
    description: 'Average response',
    size: 'small',
    icon: null,
  },
  {
    title: 'Progress Analytics',
    description: 'Visualize your learning journey with detailed insights, mastery levels, and improvement recommendations.',
    size: 'wide',
    icon: '📊',
  },
];

const sizeClasses = {
  large: 'col-span-2 row-span-2',
  medium: 'col-span-2 md:col-span-1',
  small: 'col-span-1',
  wide: 'col-span-2',
};

export function BentoGrid() {
  return (
    <section className="py-24 lg:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Why choose <span className="kn-gradient-text">Knowrizon</span>
          </h2>
          <p className="text-lg text-[#94A3B8]">
            Built for students, by people who understand learning.
          </p>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.08} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <StaggerItem key={item.title} className={sizeClasses[item.size]}>
              <div
                className={`kn-glass rounded-2xl p-5 md:p-6 kn-glass-hover h-full flex flex-col ${
                  item.size === 'small' ? 'items-center justify-center text-center' : ''
                } ${item.size === 'large' ? 'justify-between' : ''}`}
              >
                {item.icon && <span className="text-2xl md:text-3xl mb-3">{item.icon}</span>}
                <div>
                  <h3
                    className={`font-bold text-white mb-1 ${
                      item.size === 'large'
                        ? 'text-xl md:text-2xl'
                        : item.size === 'small'
                          ? 'text-xl md:text-2xl kn-gradient-text'
                          : 'text-base md:text-lg'
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p className={`text-[#94A3B8] leading-relaxed ${item.size === 'small' ? 'text-xs' : 'text-sm'}`}>
                    {item.description}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
