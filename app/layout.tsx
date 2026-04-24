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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
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
      className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelCircle.variable} h-full`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Runtime stylesheet avoids build-time font fetches while keeping the V3.1 mono stack available everywhere. */}
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Noto+Serif:wght@400..700&display=swap" rel="stylesheet" />
        {/* Prevent flash of wrong theme — runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
      </head>
      <body className={`${GeistSans.className} h-full`} suppressHydrationWarning>
        <ThemeProvider>
          <Preloader>
            <div className="h-full">{children}</div>
          </Preloader>
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
