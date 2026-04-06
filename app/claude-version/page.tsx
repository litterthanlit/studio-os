import type { Metadata } from "next";
import { Nav } from "@/components/marketing-claude/nav";
import { Hero } from "@/components/marketing-claude/hero";
import { Comparison } from "@/components/marketing-claude/comparison";
import { HowItWorks } from "@/components/marketing-claude/how-it-works";
import { EditorShowcase } from "@/components/marketing-claude/editor-showcase";
import { Gallery } from "@/components/marketing-claude/gallery";
import { ExportSection } from "@/components/marketing-claude/export-section";
import { FooterCta } from "@/components/marketing-claude/footer-cta";
import { Footer } from "@/components/marketing-claude/footer";

export const metadata: Metadata = {
  title: "Studio OS — AI that designs like you",
  description:
    "Feed Studio OS your references. It extracts your design sensibility and generates pages that look like yours — not like everyone else's.",
};

export default function ClaudeVersionPage() {
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
