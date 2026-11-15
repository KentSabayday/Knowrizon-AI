import './landing.css';
import { AnimatedBackground } from './AnimatedBackground';
import { Navbar } from './Navbar';
import { HeroSection } from './HeroSection';
import { SocialProof } from './SocialProof';
import { FeaturesSection } from './FeaturesSection';
import { HowItWorks } from './HowItWorks';
import { AIDemoSection } from './AIDemoSection';
import { DashboardPreview } from './DashboardPreview';
import { TestimonialsSection } from './TestimonialsSection';
import { BentoGrid } from './BentoGrid';
import { CTASection } from './CTASection';
import { Footer } from './Footer';

export function LandingView({ onGetStarted, onSignIn }) {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#141413] dark:bg-[#0F1115] dark:text-[#F3F4F6] overflow-x-hidden transition-colors duration-200">
      <AnimatedBackground />
      <Navbar onGetStarted={onGetStarted} onSignIn={onSignIn} />

      <main>
        <HeroSection onGetStarted={onGetStarted} />
        <SocialProof />
        <FeaturesSection />
        <HowItWorks />
        <AIDemoSection />
        <DashboardPreview />
        <TestimonialsSection />
        <BentoGrid />
        <CTASection onGetStarted={onGetStarted} />
      </main>

      <Footer />
    </div>
  );
}
