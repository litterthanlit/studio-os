import { Hero } from "@/components/marketing/hero";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { FeatureShowcase } from "@/components/marketing/feature-showcase";
import { Showcase } from "@/components/marketing/showcase";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { Testimonials } from "@/components/marketing/testimonials";
import { CTA } from "@/components/marketing/cta";

export default function MarketingPage() {
  return (
    <div className="bg-black">
      <Hero />
      <FeaturesGrid />
      <FeatureShowcase />
      <Showcase />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <CTA />
    </div>
  );
}
