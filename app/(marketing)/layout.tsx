import type { Metadata } from "next";
import { Preloader } from "@/components/marketing/preloader";

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
    <>
      <Preloader />
      {children}
    </>
  );
}
