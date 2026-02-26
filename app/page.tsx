import { Hero } from "@/components/marketing/hero";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { FeatureShowcase } from "@/components/marketing/feature-showcase";
import { Showcase } from "@/components/marketing/showcase";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { Testimonials } from "@/components/marketing/testimonials";
import { CTA } from "@/components/marketing/cta";
import { MarketingNav } from "@/components/marketing/navigation";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata = {
  title: "Studio OS — A design workspace that thinks like you do",
  description:
    "AI-curated inspiration meets unified workspace. Organize references, export specs, and ship faster.",
};

export default function MarketingPage() {
  return (
    <div className="relative min-h-screen bg-[#111111]">
      <div className="relative z-10">
        <MarketingNav />
        <main>
          <Hero />
<FeaturesGrid />
          <FeatureShowcase />
          <Showcase />
          <HowItWorks />
          <Pricing />
          <Testimonials />
          <CTA />
        </main>
        <MarketingFooter />
      </div>
    </div>
  );
}
