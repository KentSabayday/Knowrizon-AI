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
    <div className="min-h-screen bg-[#0B1220] text-white overflow-x-hidden">
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
