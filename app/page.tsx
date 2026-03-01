import { Hero } from "@/components/marketing/hero";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { FeatureShowcase } from "@/components/marketing/feature-showcase";
import { Showcase } from "@/components/marketing/showcase";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { CTA } from "@/components/marketing/cta";
import { FAQ } from "@/components/marketing/faq";
import { MarketingNav } from "@/components/marketing/navigation";
import { MarketingFooter } from "@/components/marketing/footer";
import { Preloader } from "@/components/marketing/preloader";

export const metadata = {
  title: "Studio OS — A design workspace that thinks like you do",
  description:
    "AI-curated inspiration meets unified workspace. Organize references, export specs, and ship faster.",
};

export default function MarketingPage() {
  return (
    <div className="relative min-h-screen bg-white">
      <Preloader />
      <div className="relative z-10">
        <MarketingNav />
        <main>
          <Hero />
          <FeaturesGrid />
          <HowItWorks />
          <FeatureShowcase />
          <Showcase />
          <Pricing />
          <CTA />
          <FAQ />
        </main>
        <MarketingFooter />
      </div>
    </div>
  );
}
