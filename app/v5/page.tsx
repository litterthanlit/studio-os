import { Nav } from "@/components/marketing-v5/nav";
import { Hero } from "@/components/marketing-v5/hero";
import { FeatureGrid } from "@/components/marketing-v5/feature-grid";
import { Testimonials } from "@/components/marketing-v5/testimonials";
import { Cta } from "@/components/marketing-v5/cta";
import { Footer } from "@/components/marketing-v5/footer";

export const metadata = {
  title: "Studio OS - The Design OS",
  description: "Marketing site.",
};

export default function MarketingPageV5() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0C0C14] font-sans selection:bg-[#4B57DB] selection:text-white overflow-x-hidden flex flex-col relative w-full"
      style={{
        backgroundImage: 'radial-gradient(circle at center, rgba(12, 12, 20, 0.03) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}>
      <div className="w-full max-w-[1440px] mx-auto bg-white border-x border-[#0C0C14]/5 min-h-screen flex flex-col relative shadow-[0_0_60px_rgba(0,0,0,0.02)]">
        <Nav />
        <Hero />
        <FeatureGrid />
        <Testimonials />
        <Cta />
        <Footer />
      </div>
    </div>
  );
}
