import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelCircle } from "geist/font/pixel";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Preloader } from "@/components/preloader";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "Studio OS — The Operating System for Creative Studios",
    template: "%s | Studio OS",
  },
  description:
    "Studio OS is the all-in-one workspace built for creative professionals. Manage projects, assets, clients, and your entire studio — beautifully.",
  keywords: [
    "studio management",
    "creative studio software",
    "designer workspace",
    "project management for designers",
    "creative operating system",
    "studio OS",
  ],
  metadataBase: new URL("https://studio-os.io"),
  openGraph: {
    type: "website",
    url: "https://studio-os.io",
    title: "Studio OS — The Operating System for Creative Studios",
    description:
      "The all-in-one workspace built for creative professionals. Manage projects, assets, clients, and your entire studio — beautifully.",
    siteName: "Studio OS",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Studio OS — The Operating System for Creative Studios",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Studio OS — The Operating System for Creative Studios",
    description:
      "The all-in-one workspace built for creative professionals. Manage projects, assets, clients, and your entire studio — beautifully.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelCircle.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Runtime stylesheet avoids build-time font fetches while keeping the V3.1 mono stack available everywhere. */}
        <link href="https://fonts.googleapis.com/css2?family=Bespoke+Serif:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
        {/* Prevent flash of wrong theme — runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
      </head>
      <body className={GeistSans.className} suppressHydrationWarning>
        <ThemeProvider>
          <Preloader>
            <div className="min-h-screen">{children}</div>
          </Preloader>
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
