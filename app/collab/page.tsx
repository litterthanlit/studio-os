import { ScrollReveal } from "@/components/marketing-collab/scroll-reveal";
import { Nav } from "@/components/marketing-collab/nav";
import { Hero } from "@/components/marketing-collab/hero";
import { HowItWorks } from "@/components/marketing-collab/how-it-works";
import { FeatureCards } from "@/components/marketing-collab/feature-cards";
import { DarkCards } from "@/components/marketing-collab/dark-cards";
import { EngineeringSplit } from "@/components/marketing-collab/engineering-split";
import { SplitTaste } from "@/components/marketing-collab/split-taste";
import { ExportSection } from "@/components/marketing-collab/export-section";
import { FooterCta } from "@/components/marketing-collab/footer-cta";
import { Footer } from "@/components/marketing-collab/footer";

export const metadata = {
  title: "Studio OS — AI that designs like you",
  description: "Feed it references. Get back your design sensibility.",
};

export default function CollabPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0C0C14] font-sans selection:bg-[#4B57DB] selection:text-white overflow-x-hidden flex flex-col relative w-full"
      style={{ backgroundImage: 'radial-gradient(circle at center, rgba(12,12,20,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <ScrollReveal />
      <div className="w-full bg-white flex flex-col relative">
        <Nav />
        <Hero />
        <HowItWorks />
        <DarkCards />
        <EngineeringSplit />
        <FeatureCards />
        <SplitTaste />
        <ExportSection />
        <FooterCta />
        <Footer />
      </div>
    </div>
  );
}
