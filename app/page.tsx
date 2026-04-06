import { Nav } from "@/components/marketing-v2/nav";
import { Hero } from "@/components/marketing-v2/hero";
import { Features } from "@/components/marketing-v2/features";
import { SplitFeature } from "@/components/marketing-v2/split-feature";
import { AiFeature } from "@/components/marketing-v2/ai-feature";
import { ExportCta } from "@/components/marketing-v2/export-cta";
import { Footer } from "@/components/marketing-v2/footer";

export const metadata = {
  title: "Studio OS - The Design OS, Integrated.",
  description: "AI-native design tool. A high-end design magazine crossed with an engineering spec sheet.",
};

export default function MarketingPageV2() {
  return (
    <div className="min-h-screen bg-white text-[#0C0C14] font-sans selection:bg-[#D1E4FC] selection:text-[#0C0C14] overflow-x-hidden flex flex-col relative w-full">
      <Nav />
      <Hero />
      <Features />
      <SplitFeature />
      <AiFeature />
      <ExportCta />
      <Footer />
    </div>
  );
}
