import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/navigation";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Studio OS — A design workspace that thinks like you do",
  description:
    "AI-curated inspiration meets unified workspace. Organize references, export specs, and ship faster.",
  openGraph: {
    title: "Studio OS",
    description: "A design workspace that thinks like you do",
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-black">
      <MarketingNav />
      <main className="bg-black">{children}</main>
      <MarketingFooter />
    </div>
  );
}
