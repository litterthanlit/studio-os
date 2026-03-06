import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Preloader } from "@/components/preloader";
import { SpeedInsights } from "@vercel/speed-insights/next";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

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
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSans.variable}`}
    >
      <head>
        {/* Prevent flash of wrong theme — runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
      </head>
      <body className={GeistSans.className}>
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
