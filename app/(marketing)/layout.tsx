import type { Metadata } from "next";
import { Preloader } from "@/components/marketing/preloader";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export const metadata: Metadata = {
  title: "Studio OS — AI that designs like you",
  description:
    "Feed Studio OS your references. It extracts your design sensibility and generates pages that look like yours — not like everyone else's.",
  openGraph: {
    title: "Studio OS — AI that designs like you",
    description:
      "AI-curated taste meets a real design editor. Import references, generate pages, export clean HTML.",
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Preloader />
      <ScrollReveal />
      {children}
    </>
  );
}
