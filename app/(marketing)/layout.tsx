import type { Metadata } from "next";

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
  return <>{children}</>;
}
