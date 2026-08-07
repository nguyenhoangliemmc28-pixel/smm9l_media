import { useNavigate } from 'react-router-dom';
import { LandingNavbar } from '@/components/navbar/LandingNavbar';
import { Hero } from '@/components/landing/Hero';
import { StatsSection } from '@/components/landing/StatsSection';
import { CategoriesSection } from '@/components/landing/CategoriesSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { Footer } from '@/components/landing/Footer';

export function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen bg-bg overflow-hidden">
      <LandingNavbar onNavigate={navigate} />
      <main>
        <Hero onNavigate={navigate} />
        <StatsSection />
        <CategoriesSection />
        <FeaturesSection />
        <PricingSection onNavigate={navigate} />
        <FaqSection />
      </main>
      <Footer onNavigate={navigate} />
    </div>
  );
}
