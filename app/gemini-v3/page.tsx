import type { Metadata } from "next";
import { Nav } from "@/components/marketing-gemini-v3/nav";
import { Hero } from "@/components/marketing-gemini-v3/hero";
import { Features } from "@/components/marketing-gemini-v3/features";
import { Comparison } from "@/components/marketing-gemini-v3/comparison";
import { HowItWorks } from "@/components/marketing-gemini-v3/how-it-works";
import { EditorShowcase } from "@/components/marketing-gemini-v3/editor-showcase";
import { Gallery } from "@/components/marketing-gemini-v3/gallery";
import { ExportSection } from "@/components/marketing-gemini-v3/export-section";
import { FooterCta } from "@/components/marketing-gemini-v3/footer-cta";
import { Footer } from "@/components/marketing-gemini-v3/footer";

export const metadata: Metadata = {
  title: "Studio OS — AI that designs like you",
  description:
    "Feed Studio OS your references. It extracts your design sensibility and generates pages that look like yours — not like everyone else's.",
};

export default function GeminiV3Page() {
  return (
    <div
      className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] antialiased overflow-x-hidden selection:bg-[#D1E4FC] selection:text-[#1A1A1A] scroll-smooth"
      style={{
        backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='21' height='21'><rect width='20' height='20' rx='1' fill='%23000' opacity='.02'/></svg>")`,
        backgroundSize: "21px 21px",
        backgroundAttachment: "fixed",
      }}
    >
      <Nav />
      <Hero />
      <Features />
      <Comparison />
      <HowItWorks />
      <EditorShowcase />
      <Gallery />
      <ExportSection />
      <FooterCta />
      <Footer />
    </div>
  );
}
