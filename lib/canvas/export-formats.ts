import type { DesignSystemTokens } from "./generate-system";
import type {
  Breakpoint,
  PageNode,
  PageNodeStyle,
} from "./compose";

/**
 * Canvas Export Formats
 *
 * Full-site export pipeline supporting:
 *   1. Vercel-ready Next.js ZIP (complete project, zero-config deploy)
 *   2. Standalone HTML (single file, no build step)
 *   3. Section TSX (individual React component files)
 *   4. Framer paste (clipboard-ready JSX)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SiteType =
  | "auto"
  | "saas-landing"
  | "portfolio"
  | "agency"
  | "ecommerce"
  | "docs-site"
  | "blog";

export interface DesignTokens {
  bgPrimary: string;
  bgSecondary: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentFg: string;
  border: string;
  fontDisplay: string;
  fontBody: string;
}

export interface ExportConfig {
  siteType: SiteType;
  siteName: string;
  /** Source TSX string of the full page component */
  sourceCode?: string;
  tokens?: Partial<DesignTokens>;
  pageTree?: PageNode;
  composeTokens?: DesignSystemTokens;
}

export interface VirtualFile {
  path: string;
  content: string | Uint8Array;
}

export type ComposeExportFramework = "html" | "react" | "nextjs";

export type ComposeExportOptions = {
  framework: ComposeExportFramework;
  includeAnimations: boolean;
  imageHandling: "embedded" | "external";
};

// ---------------------------------------------------------------------------
// Default design tokens per site type
// ---------------------------------------------------------------------------

const TOKENS: Record<SiteType, DesignTokens> = {
  auto: {
    bgPrimary: "#0a0a0a",
    bgSecondary: "#111111",
    textPrimary: "#ffffff",
    textSecondary: "#a1a1aa",
    accent: "#7170ff",
    accentFg: "#ffffff",
    border: "rgba(255,255,255,0.08)",
    fontDisplay: "'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
  },
  "saas-landing": {
    bgPrimary: "#010102",
    bgSecondary: "#0d0d10",
    textPrimary: "#f0f0ff",
    textSecondary: "#8b8ba8",
    accent: "#7170ff",
    accentFg: "#ffffff",
    border: "rgba(113,112,255,0.15)",
    fontDisplay: "'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
  },
  portfolio: {
    bgPrimary: "#f8f5f0",
    bgSecondary: "#f0ece5",
    textPrimary: "#1a1714",
    textSecondary: "#6b6560",
    accent: "#c97b3b",
    accentFg: "#ffffff",
    border: "rgba(26,23,20,0.1)",
    fontDisplay: "'Playfair Display', serif",
    fontBody: "'Inter', sans-serif",
  },
  agency: {
    bgPrimary: "#0a0a0a",
    bgSecondary: "#141414",
    textPrimary: "#ffffff",
    textSecondary: "#999999",
    accent: "#ffe033",
    accentFg: "#0a0a0a",
    border: "rgba(255,255,255,0.08)",
    fontDisplay: "'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
  },
  ecommerce: {
    bgPrimary: "#fafaf8",
    bgSecondary: "#f5f5f2",
    textPrimary: "#1a1a1a",
    textSecondary: "#6b6b6b",
    accent: "#2d5a3d",
    accentFg: "#ffffff",
    border: "rgba(26,26,26,0.1)",
    fontDisplay: "'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
  },
  "docs-site": {
    bgPrimary: "#ffffff",
    bgSecondary: "#f6f6f6",
    textPrimary: "#111111",
    textSecondary: "#666666",
    accent: "#0070f3",
    accentFg: "#ffffff",
    border: "rgba(0,0,0,0.08)",
    fontDisplay: "'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
  },
  blog: {
    bgPrimary: "#f9f6f1",
    bgSecondary: "#f1ede6",
    textPrimary: "#1c1a18",
    textSecondary: "#6a6560",
    accent: "#c44b2b",
    accentFg: "#ffffff",
    border: "rgba(28,26,24,0.1)",
    fontDisplay: "'Playfair Display', serif",
    fontBody: "'Inter', sans-serif",
  },
};

function getTokens(cfg: ExportConfig): DesignTokens {
  const base = TOKENS[cfg.siteType] ?? TOKENS["auto"];
  return { ...base, ...(cfg.tokens ?? {}) };
}

// ---------------------------------------------------------------------------
// Pure-JS ZIP builder (no external deps, ZIP STORE format)
// ---------------------------------------------------------------------------

function crc32(data: Uint8Array): number {
  // @ts-expect-error - attaching table to function object
  if (!crc32.table) {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1);
      t[i] = c;
    }
    // @ts-expect-error - attaching table to function object
    crc32.table = t;
  }
  let crc = 0xffffffff;
  // @ts-expect-error - attaching table to function object
  const table: Uint32Array = crc32.table;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16le(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}

function u32le(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function enc(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function toBytes(content: string | Uint8Array): Uint8Array {
  return typeof content === "string" ? enc(content) : content;
}

function buildZip(files: VirtualFile[]): Blob {
  const localHeaders: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  const offsets: number[] = [];
  let localOffset = 0;

  for (const file of files) {
    const nameBytes = enc(file.path);
    const dataBytes = toBytes(file.content);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    offsets.push(localOffset);

    // Local file header
    const localHeader = concat(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // signature
      u16le(20),      // version needed
      u16le(0),       // flags
      u16le(0),       // compression (STORE)
      u16le(0),       // mod time
      u16le(0),       // mod date
      u32le(crc),
      u32le(size),    // compressed size
      u32le(size),    // uncompressed size
      u16le(nameBytes.length),
      u16le(0),       // extra field length
      nameBytes,
      dataBytes
    );

    localHeaders.push(localHeader);
    localOffset += localHeader.length;

    // Central directory entry
    const cdEntry = concat(
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]), // signature
      u16le(20),      // version made by
      u16le(20),      // version needed
      u16le(0),       // flags
      u16le(0),       // compression
      u16le(0),       // mod time
      u16le(0),       // mod date
      u32le(crc),
      u32le(size),
      u32le(size),
      u16le(nameBytes.length),
      u16le(0),       // extra
      u16le(0),       // comment
      u16le(0),       // disk start
      u16le(0),       // internal attrs
      u32le(0),       // external attrs
      u32le(offsets[offsets.length - 1]),
      nameBytes
    );

    centralDir.push(cdEntry);
  }

  const cdOffset = localOffset;
  const cdSize = centralDir.reduce((s, e) => s + e.length, 0);

  // End of central directory
  const eocd = concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]), // signature
    u16le(0),           // disk number
    u16le(0),           // disk with CD
    u16le(files.length),
    u16le(files.length),
    u32le(cdSize),
    u32le(cdOffset),
    u16le(0)            // comment length
  );

  const all = concat(...localHeaders, ...centralDir, eocd);
  return new Blob([all as BlobPart], { type: "application/zip" });
}

// ---------------------------------------------------------------------------
// File generators — Next.js project files
// ---------------------------------------------------------------------------

function genPackageJson(cfg: ExportConfig): string {
  const name = cfg.siteName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return JSON.stringify(
    {
      name,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: {
        next: "14.2.5",
        react: "^18",
        "react-dom": "^18",
        "framer-motion": "^11",
      },
      devDependencies: {
        typescript: "^5",
        "@types/react": "^18",
        "@types/react-dom": "^18",
        "@types/node": "^20",
      },
    },
    null,
    2
  );
}

function genTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "es5",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2
  );
}

function genNextConfig(): string {
  return `/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
`;
}

function genVercelJson(cfg: ExportConfig): string {
  return JSON.stringify(
    {
      buildCommand: "next build",
      outputDirectory: ".next",
      framework: "nextjs",
      name: cfg.siteName,
    },
    null,
    2
  );
}

function genGlobalsCSS(cfg: ExportConfig): string {
  const t = getTokens(cfg);
  return `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg-primary: ${t.bgPrimary};
  --bg-secondary: ${t.bgSecondary};
  --text-primary: ${t.textPrimary};
  --text-secondary: ${t.textSecondary};
  --accent: ${t.accent};
  --accent-fg: ${t.accentFg};
  --border: ${t.border};
  --font-display: ${t.fontDisplay};
  --font-body: ${t.fontBody};
  --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}

html {
  font-family: var(--font-body);
  background: var(--bg-primary);
  color: var(--text-primary);
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
  overflow-x: hidden;
}

a {
  color: inherit;
  text-decoration: none;
}

img, video {
  max-width: 100%;
  display: block;
}
`;
}

function genRootLayout(cfg: ExportConfig): string {
  return `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${cfg.siteName}",
  description: "${cfg.siteName} — generated landing page",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}

function genNavSection(cfg: ExportConfig): string {
  const t = getTokens(cfg);
  const isDark = isColorDark(t.bgPrimary);
  return `"use client";
import { motion, useScroll, useTransform } from "framer-motion";

export default function Nav() {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 80], ["${t.bgPrimary}00", "${t.bgPrimary}f0"]);
  const blur = useTransform(scrollY, [0, 80], ["blur(0px)", "blur(12px)"]);

  return (
    <motion.nav
      style={{ backgroundColor: bg, backdropFilter: blur }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between"
    >
      <span
        className="font-semibold text-lg"
        style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
      >
        ${cfg.siteName}
      </span>
      <div className="hidden md:flex items-center gap-8">
        {["Features", "Pricing", "About", "Blog"].map((item) => (
          <a
            key={item}
            href={\`#\${item.toLowerCase()}\`}
            className="text-sm transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            {item}
          </a>
        ))}
      </div>
      <a
        href="#"
        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        style={{
          background: "var(--accent)",
          color: "var(--accent-fg)",
          ${isDark ? "" : "border: '1px solid var(--border)',"}
        }}
      >
        Get started
      </a>
    </motion.nav>
  );
}
`;
}

function genHeroSection(cfg: ExportConfig): string {
  const t = getTokens(cfg);
  return `"use client";
import { motion } from "framer-motion";

const ease = [0.19, 1, 0.22, 1] as const;

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: \`radial-gradient(ellipse 60% 40% at 50% 30%, \${${JSON.stringify(t.accent)}}22, transparent)\`,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease }}
        className="relative max-w-4xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs mb-8"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
            background: "var(--bg-secondary)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "var(--accent)" }}
          />
          Now available
        </motion.div>

        <h1
          className="text-5xl md:text-7xl font-bold leading-none tracking-tight mb-6"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          ${cfg.siteName}
        </h1>
        <p
          className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          A modern platform built for teams who move fast. Ship better products
          with less friction and more clarity.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#"
            className="px-8 py-3 rounded-xl text-base font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Start for free
          </a>
          <a
            href="#"
            className="px-8 py-3 rounded-xl text-base font-medium transition-all border"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            View demo →
          </a>
        </div>
      </motion.div>
    </section>
  );
}
`;
}

function genFeaturesSection(): string {
  return `"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const features = [
  {
    title: "Lightning fast",
    description: "Built for performance from the ground up. Sub-100ms response times across the board.",
    icon: "⚡",
  },
  {
    title: "Developer first",
    description: "Clean APIs, great docs, and first-class TypeScript support out of the box.",
    icon: "🛠",
  },
  {
    title: "Scales with you",
    description: "From prototype to production. Handles millions of users without breaking a sweat.",
    icon: "📈",
  },
  {
    title: "Secure by default",
    description: "End-to-end encryption, SOC 2 compliance, and zero-trust architecture built in.",
    icon: "🔒",
  },
  {
    title: "Real-time sync",
    description: "Collaborative by design. Every change syncs instantly across all connected clients.",
    icon: "🔄",
  },
  {
    title: "Open ecosystem",
    description: "100+ integrations, a public API, and webhooks for everything you can imagine.",
    icon: "🌐",
  },
];

const ease = [0.19, 1, 0.22, 1] as const;

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <section
      id="features"
      ref={ref}
      className="py-32 px-6"
      style={{ background: "var(--bg-secondary)" }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="text-center mb-20"
        >
          <h2
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Everything you need
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            All the building blocks to ship faster and scale with confidence.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease, delay: i * 0.08 }}
              className="p-6 rounded-2xl border"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
              }}
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function genPricingSection(): string {
  return `"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Perfect for side projects and experiments.",
    features: ["Up to 3 projects", "1 GB storage", "Community support", "Basic analytics"],
    cta: "Get started free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "Everything you need to build seriously.",
    features: ["Unlimited projects", "50 GB storage", "Priority support", "Advanced analytics", "Custom domains", "Team collaboration"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For large teams with complex requirements.",
    features: ["Everything in Pro", "Unlimited storage", "SLA guarantee", "SSO / SAML", "Audit logs", "Dedicated support"],
    cta: "Contact sales",
    highlight: false,
  },
];

const ease = [0.19, 1, 0.22, 1] as const;

export default function Pricing() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <section id="pricing" ref={ref} className="py-32 px-6" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="text-center mb-20"
        >
          <h2
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Simple pricing
          </h2>
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
            No hidden fees. Cancel anytime.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease, delay: i * 0.1 }}
              className="p-8 rounded-2xl border flex flex-col"
              style={{
                background: plan.highlight ? "var(--accent)" : "var(--bg-secondary)",
                borderColor: plan.highlight ? "transparent" : "var(--border)",
                color: plan.highlight ? "var(--accent-fg)" : "var(--text-primary)",
              }}
            >
              <div className="mb-6">
                <p className="text-sm font-medium mb-2 opacity-70">{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm opacity-60">/ {plan.period}</span>
                </div>
                <p className="text-sm opacity-70">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className="block text-center py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: plan.highlight ? "rgba(255,255,255,0.15)" : "var(--accent)",
                  color: plan.highlight ? "var(--accent-fg)" : "var(--accent-fg)",
                }}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

function genCTASection(cfg: ExportConfig): string {
  return `"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ease = [0.19, 1, 0.22, 1] as const;

export default function CTA() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <section ref={ref} className="py-32 px-6" style={{ background: "var(--bg-secondary)" }}>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2
          className="text-4xl md:text-6xl font-bold mb-6"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Ready to get started?
        </h2>
        <p className="text-lg mb-10" style={{ color: "var(--text-secondary)" }}>
          Join thousands of teams already building on ${cfg.siteName}. Free to start, scales as you grow.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#"
            className="px-8 py-4 rounded-xl text-base font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Start building for free →
          </a>
          <a
            href="#"
            className="px-8 py-4 rounded-xl text-base transition-all border"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Talk to sales
          </a>
        </div>
      </motion.div>
    </section>
  );
}
`;
}

function genFooterSection(cfg: ExportConfig): string {
  return `export default function Footer() {
  const year = new Date().getFullYear();
  const cols = [
    { title: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
    { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
    { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
  ];

  return (
    <footer
      className="py-20 px-6 border-t"
      style={{
        background: "var(--bg-primary)",
        borderColor: "var(--border)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div>
            <span
              className="text-xl font-bold mb-4 block"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              ${cfg.siteName}
            </span>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              The modern platform for teams who care about quality.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                {col.title}
              </p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm transition-colors hover:opacity-80"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            © {year} ${cfg.siteName}. All rights reserved.
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Built with{" "}
            <a href="#" className="underline" style={{ color: "var(--accent)" }}>
              Studio OS
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
`;
}

function genPageTsx(sourceCode?: string): string {
  if (sourceCode?.trim()) {
    return sourceCode.trim();
  }

  return `import Nav from "@/components/sections/Nav";
import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import Pricing from "@/components/sections/Pricing";
import CTA from "@/components/sections/CTA";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
`;
}

function genReadme(cfg: ExportConfig): string {
  return `# ${cfg.siteName}

Generated landing page for ${cfg.siteName}.

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this folder to a GitHub repository
2. Import it on [vercel.com/new](https://vercel.com/new)
3. Click Deploy — zero configuration needed

## Stack

- [Next.js 14](https://nextjs.org) (App Router)
- [Framer Motion](https://framer.com/motion)
- [TypeScript](https://typescriptlang.org)
`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isColorDark(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function prepareSourceForRuntime(code: string): string {
  let cleaned = code.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, "");
  const match = cleaned.match(/export\s+default\s+function\s+(\w+)/);
  if (match) {
    cleaned = cleaned.replace(/export\s+default\s+function\s+(\w+)/, "function $1");
    cleaned += `\nwindow.__PREVIEW_COMPONENT__ = ${match[1]};`;
  } else {
    cleaned = cleaned.replace(/export\s+default\s+(\w+)\s*;?/g, "window.__PREVIEW_COMPONENT__ = $1;");
    cleaned = cleaned.replace(/^export\s+/gm, "");
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// Public API — Next.js ZIP export
// ---------------------------------------------------------------------------

export function generateNextjsProject(cfg: ExportConfig): VirtualFile[] {
  const hasSourceCode = Boolean(cfg.sourceCode?.trim());

  return [
    { path: "package.json", content: genPackageJson(cfg) },
    { path: "tsconfig.json", content: genTsConfig() },
    { path: "next.config.js", content: genNextConfig() },
    { path: "vercel.json", content: genVercelJson(cfg) },
    { path: "app/globals.css", content: genGlobalsCSS(cfg) },
    { path: "app/layout.tsx", content: genRootLayout(cfg) },
    { path: "app/page.tsx", content: genPageTsx(cfg.sourceCode) },
    ...(
      hasSourceCode
        ? []
        : [
            { path: "components/sections/Nav.tsx", content: genNavSection(cfg) },
            { path: "components/sections/Hero.tsx", content: genHeroSection(cfg) },
            { path: "components/sections/Features.tsx", content: genFeaturesSection() },
            { path: "components/sections/Pricing.tsx", content: genPricingSection() },
            { path: "components/sections/CTA.tsx", content: genCTASection(cfg) },
            { path: "components/sections/Footer.tsx", content: genFooterSection(cfg) },
          ]
    ),
    { path: "README.md", content: genReadme(cfg) },
  ];
}

export function downloadNextjsZip(cfg: ExportConfig): void {
  const files = generateNextjsProject(cfg);
  const zip = buildZip(files);
  const slug = cfg.siteName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  triggerDownload(zip, `${slug}-nextjs.zip`);
}

type ImageAsset = {
  originalUrl: string;
  outputPath: string;
  mimeType: string;
};

const SYSTEM_FONT_NAMES = new Set([
  "inter",
  "helvetica neue",
  "helvetica",
  "arial",
  "sans-serif",
  "serif",
  "georgia",
  "times new roman",
  "monospace",
  "jetbrains mono",
  "fira code",
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugifyFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sanitizeArbitrary(value: string): string {
  return value.replace(/\s+/g, "_");
}

function quotedFontFamilies(fontFamily: string): string[] {
  return fontFamily
    .split(",")
    .map((family) => family.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function googleFontsHref(fontFamily: string): string | null {
  const families = quotedFontFamilies(fontFamily).filter(
    (family) => !SYSTEM_FONT_NAMES.has(family.toLowerCase())
  );
  if (families.length === 0) return null;
  const params = families
    .map((family) => `family=${family.trim().replace(/\s+/g, "+")}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

function mediaNodes(node: PageNode): PageNode[] {
  const items = node.content?.mediaUrl ? [node] : [];
  for (const child of node.children ?? []) {
    items.push(...mediaNodes(child));
  }
  return items;
}

function inferImageExtension(url: string, mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("svg")) return "svg";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  const clean = url.split("?")[0];
  const ext = clean.split(".").pop();
  return ext && ext.length <= 5 ? ext : "png";
}

function buildImageManifest(
  pageTree: PageNode,
  handling: ComposeExportOptions["imageHandling"]
): {
  map: Map<string, string>;
  assets: ImageAsset[];
} {
  const map = new Map<string, string>();
  const assets: ImageAsset[] = [];
  const urls = Array.from(
    new Set(
      mediaNodes(pageTree)
        .map((node) => node.content?.mediaUrl)
        .filter((url): url is string => typeof url === "string" && url.length > 0)
    )
  );

  urls.forEach((url, index) => {
    if (handling === "embedded" || url.startsWith("data:")) {
      map.set(url, url);
      return;
    }
    const mimeMatch = url.match(/^data:([^;]+);/);
    const mimeType = mimeMatch?.[1] ?? "image/png";
    const outputPath = `images/asset-${index + 1}.${inferImageExtension(url, mimeType)}`;
    map.set(url, outputPath);
    assets.push({ originalUrl: url, outputPath, mimeType });
  });

  return { map, assets };
}

async function imageAssetToBytes(asset: ImageAsset): Promise<Uint8Array | null> {
  if (asset.originalUrl.startsWith("data:")) {
    const [, meta, base64 = ""] =
      asset.originalUrl.match(/^data:([^;]+);base64,(.*)$/) ?? [];
    if (!meta) return null;
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  try {
    const response = await fetch(asset.originalUrl);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

function classForColor(prefix: string, value?: string) {
  return value ? `${prefix}-[${sanitizeArbitrary(value)}]` : "";
}

function classForSize(prefix: string, value?: number) {
  return typeof value === "number" ? `${prefix}-[${value}px]` : "";
}

function classForStyle(style: Partial<PageNodeStyle>, tokens: DesignSystemTokens): string[] {
  return [
    classForColor("bg", style.background),
    classForColor("text", style.foreground),
    classForColor("border", style.borderColor),
    classForSize("rounded", style.borderRadius),
    classForSize("px", style.paddingX),
    classForSize("py", style.paddingY),
    classForSize("gap", style.gap),
    classForSize("max-w", style.maxWidth),
    classForSize("min-h", style.minHeight),
    typeof style.fontSize === "number" ? `text-[${style.fontSize}px]` : "",
    typeof style.fontWeight === "number" ? `font-[${style.fontWeight}]` : "",
    typeof style.lineHeight === "number" ? `leading-[${style.lineHeight}]` : "",
    typeof style.letterSpacing === "number"
      ? `tracking-[${style.letterSpacing}em]`
      : "",
    typeof style.opacity === "number" ? `opacity-[${style.opacity}]` : "",
    typeof style.blur === "number" && style.blur > 0 ? `backdrop-blur-[${style.blur}px]` : "",
    style.align === "center" ? "text-center items-center" : style.align === "right" ? "text-right items-end" : "text-left items-start",
    style.direction === "row" ? "flex-row" : "flex-col",
    style.justify === "center"
      ? "justify-center"
      : style.justify === "end"
      ? "justify-end"
      : style.justify === "between"
      ? "justify-between"
      : "justify-start",
    style.shadow === "medium"
      ? "shadow-xl"
      : style.shadow === "soft"
      ? "shadow-md"
      : "",
    style.background ? "" : classForColor("bg", tokens.colors.background),
  ].filter(Boolean);
}

function responsiveClasses(node: PageNode, tokens: DesignSystemTokens): string[] {
  const classes: string[] = [];
  const prefixes: Partial<Record<Breakpoint, string>> = {
    tablet: "md",
    mobile: "sm",
  };
  (["tablet", "mobile"] as Breakpoint[]).forEach((breakpoint) => {
    const prefix = prefixes[breakpoint];
    if (!prefix) return;
    const style = node.responsiveOverrides?.[breakpoint];
    if (!style) return;
    classForStyle(style, tokens).forEach((item) => {
      classes.push(`${prefix}:${item}`);
    });
  });
  return classes;
}

function semanticWrapperTag(index: number, total: number) {
  if (index === 0) return "header";
  if (index === total - 1) return "footer";
  return "section";
}

function renderMedia(node: PageNode, imageMap: Map<string, string>) {
  const src = node.content?.mediaUrl;
  if (!src) return "";
  return `<img src="${escapeHtml(imageMap.get(src) ?? src)}" alt="${escapeHtml(
    node.content?.mediaAlt ?? node.name
  )}" class="w-full rounded-[inherit] object-cover" />`;
}

function renderNodeToTailwind(
  node: PageNode,
  tokens: DesignSystemTokens,
  imageMap: Map<string, string>
): string {
  const classes = [...classForStyle(node.style ?? {}, tokens), ...responsiveClasses(node, tokens)]
    .filter(Boolean)
    .join(" ");
  const children = (node.children ?? [])
    .map((child) => renderNodeToTailwind(child, tokens, imageMap))
    .join("");

  switch (node.type) {
    case "heading":
      return `<h2 class="${classes || "text-4xl font-semibold tracking-tight"}">${escapeHtml(
        node.content?.text ?? node.name
      )}</h2>`;
    case "paragraph":
      return `<p class="${classes || "text-base text-slate-500"}">${escapeHtml(
        node.content?.text ?? ""
      )}</p>`;
    case "button":
      return `<a href="${escapeHtml(
        node.content?.href ?? "#"
      )}" class="${classes || "inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"}">${escapeHtml(
        node.content?.text ?? node.content?.label ?? "Open"
      )}</a>`;
    case "button-row":
    case "metric-row":
    case "logo-row":
      return `<div class="flex flex-wrap ${classes || "gap-3"}">${renderMedia(
        node,
        imageMap
      )}${children}</div>`;
    case "metric-item":
    case "logo-item":
    case "feature-card":
    case "testimonial-card":
    case "pricing-tier":
      return `<article class="${classes || "rounded-3xl border border-slate-200 p-5"}">${renderMedia(
        node,
        imageMap
      )}${node.content?.kicker ? `<p class="text-[10px] uppercase tracking-[0.14em] text-slate-400">${escapeHtml(node.content.kicker)}</p>` : ""}${node.content?.text ? `<h3 class="mt-2 text-lg font-semibold text-slate-950">${escapeHtml(node.content.text)}</h3>` : ""}${node.content?.price ? `<p class="mt-2 text-3xl font-semibold text-slate-950">${escapeHtml(node.content.price)}</p>` : ""}${node.content?.subtext ? `<p class="mt-2 text-sm text-slate-500">${escapeHtml(node.content.subtext)}</p>` : ""}${node.content?.meta ? `<p class="mt-3 text-xs uppercase tracking-[0.12em] text-slate-400">${escapeHtml(node.content.meta)}</p>` : ""}${children}</article>`;
    case "feature-grid":
    case "testimonial-grid":
    case "pricing-grid": {
      const columns = node.style?.columns ?? 3;
      const columnClass =
        columns === 2
          ? "grid-cols-1 md:grid-cols-2"
          : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
      return `<div class="grid ${columnClass} ${classes || "gap-5"}">${children}</div>`;
    }
    case "section":
      return `<section id="${escapeHtml(
        node.id
      )}" class="rounded-[28px] border ${classes || "border-slate-200 px-10 py-14"}"><div class="mx-auto flex w-full max-w-[1120px] flex-col gap-5">${renderMedia(
        node,
        imageMap
      )}${children}</div></section>`;
    case "page":
      return children;
    default:
      return `<div class="${classes}">${renderMedia(node, imageMap)}${children}</div>`;
  }
}

function composeHtmlDocument(args: {
  pageTree: PageNode;
  tokens: DesignSystemTokens;
  siteName: string;
  options: ComposeExportOptions;
  imageMap: Map<string, string>;
}) {
  const { pageTree, tokens, siteName, options, imageMap } = args;
  const fontHref = googleFontsHref(tokens.typography.fontFamily);
  const sections = pageTree.children ?? [];
  const wrappers = sections
    .map((section, index) => {
      const tag = semanticWrapperTag(index, sections.length);
      return `<${tag} class="contents">${renderNodeToTailwind(
        section,
        tokens,
        imageMap
      )}</${tag}>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(siteName)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            screens: { sm: "375px", md: "768px", lg: "1440px" }
          }
        }
      }
    </script>
    ${fontHref ? `<link rel="preconnect" href="https://fonts.googleapis.com" />` : ""}
    ${fontHref ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />` : ""}
    ${fontHref ? `<link href="${fontHref}" rel="stylesheet" />` : ""}
  </head>
  <body class="min-h-screen bg-[${sanitizeArbitrary(
    tokens.colors.background
  )}] text-[${sanitizeArbitrary(tokens.colors.text)}]">
    <main class="mx-auto flex min-h-screen w-full flex-col gap-[18px] px-[24px] py-[24px]" style="font-family:${escapeHtml(
      tokens.typography.fontFamily
    )}">
      ${renderMedia(pageTree, imageMap)}
      ${wrappers}
    </main>
    ${
      options.includeAnimations
        ? `<script>document.querySelectorAll('section').forEach((section, index) => { section.classList.add('transition-all','duration-500'); section.style.opacity = '0'; section.style.transform = 'translateY(18px)'; requestAnimationFrame(() => { setTimeout(() => { section.style.opacity = '1'; section.style.transform = 'translateY(0)'; }, index * 80); }); });</script>`
        : ""
    }
  </body>
</html>`;
}

export function generateComposeExportPreview(
  pageTree: PageNode,
  tokens: DesignSystemTokens,
  siteName: string,
  options: ComposeExportOptions
): string {
  const { map } = buildImageManifest(pageTree, options.imageHandling);
  return composeHtmlDocument({ pageTree, tokens, siteName, options, imageMap: map });
}

export async function downloadComposeHtmlZip(
  pageTree: PageNode,
  tokens: DesignSystemTokens,
  siteName: string,
  options: ComposeExportOptions
): Promise<void> {
  const { map, assets } = buildImageManifest(pageTree, options.imageHandling);
  const files: VirtualFile[] = [
    {
      path: "index.html",
      content: composeHtmlDocument({ pageTree, tokens, siteName, options, imageMap: map }),
    },
  ];

  if (options.imageHandling === "external") {
    const resolvedAssets: Array<VirtualFile | null> = await Promise.all(
      assets.map(async (asset) => {
        const bytes = await imageAssetToBytes(asset);
        return bytes ? { path: asset.outputPath, content: bytes } : null;
      })
    );
    files.push(...resolvedAssets.filter((asset): asset is VirtualFile => asset !== null));
  }

  const zip = buildZip(files);
  triggerDownload(zip, `${slugifyFilename(siteName) || "studio-site"}-html.zip`);
}

export async function deployComposeHtmlToVercel(
  pageTree: PageNode,
  tokens: DesignSystemTokens,
  siteName: string,
  options: ComposeExportOptions
): Promise<void> {
  await downloadComposeHtmlZip(pageTree, tokens, siteName, options);
  setTimeout(() => {
    window.open("https://vercel.com/new", "_blank", "noopener,noreferrer");
  }, 800);
}

// ---------------------------------------------------------------------------
// Public API — Standalone HTML export
// ---------------------------------------------------------------------------

export function generateStandaloneHtml(cfg: ExportConfig): string {
  if (cfg.sourceCode?.trim()) {
    const escaped = JSON.stringify(prepareSourceForRuntime(cfg.sourceCode.trim()));
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cfg.siteName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { min-height: 100%; }
    body { background: #0b0d10; color: white; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    var __loaded=0,__need=4;
    function __done(){ __loaded++; if(__loaded < __need) return; __run(); }
    function __fail(name){ document.body.innerHTML = "<pre style='padding:24px;font-family:monospace;color:#fca5a5'>Failed to load " + name + "</pre>"; }
    function __run(){
      try {
        var code = ${escaped};
        var transformed = Babel.transform(code, { presets: ["react", "typescript"], filename: "page.tsx" }).code;
        var fm = window["framer-motion"] || {};
        var header = "var motion=this.motion,AnimatePresence=this.AP,useAnimation=this.uA,useInView=this.uIV,useScroll=this.uS,useTransform=this.uT;\\n";
        var fn = new Function(header + transformed);
        fn.call({ motion: fm.motion, AP: fm.AnimatePresence, uA: fm.useAnimation, uIV: fm.useInView, uS: fm.useScroll, uT: fm.useTransform });
        var Comp = window.__PREVIEW_COMPONENT__;
        ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Comp));
      } catch (error) {
        document.body.innerHTML = "<pre style='padding:24px;font-family:monospace;color:#fca5a5'>" + (error.message || error) + "</pre>";
      }
    }
  </script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" onload="__done()" onerror="__fail('React')"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" onload="__done()" onerror="__fail('ReactDOM')"></script>
  <script src="https://unpkg.com/framer-motion@11/dist/framer-motion.js" onload="__done()" onerror="__fail('Framer Motion')"></script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js" onload="__done()" onerror="__fail('Babel')"></script>
</body>
</html>`;
  }

  const t = getTokens(cfg);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cfg.siteName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg-primary: ${t.bgPrimary};
      --bg-secondary: ${t.bgSecondary};
      --text-primary: ${t.textPrimary};
      --text-secondary: ${t.textSecondary};
      --accent: ${t.accent};
      --accent-fg: ${t.accentFg};
      --border: ${t.border};
      --font-display: ${t.fontDisplay};
      --font-body: ${t.fontBody};
    }
    html { font-family: var(--font-body); background: var(--bg-primary); color: var(--text-primary); -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }
    body { min-height: 100vh; overflow-x: hidden; }
    a { color: inherit; text-decoration: none; }

    /* Nav */
    .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; transition: background 0.3s, backdrop-filter 0.3s; }
    .nav.scrolled { background: ${t.bgPrimary}f0; backdrop-filter: blur(12px); }
    .nav-logo { font-family: var(--font-display); font-weight: 600; font-size: 1.125rem; color: var(--text-primary); }
    .nav-links { display: flex; gap: 2rem; }
    .nav-links a { font-size: 0.875rem; color: var(--text-secondary); transition: color 0.2s; }
    .nav-links a:hover { color: var(--text-primary); }
    .nav-cta { padding: 0.5rem 1rem; border-radius: 0.5rem; background: var(--accent); color: var(--accent-fg); font-size: 0.875rem; font-weight: 500; transition: opacity 0.2s; }
    .nav-cta:hover { opacity: 0.85; }

    /* Hero */
    .hero { min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 6rem 1.5rem 4rem; position: relative; }
    .hero-glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 60% 40% at 50% 30%, ${t.accent}22, transparent); }
    .hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.75rem; border-radius: 9999px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-secondary); font-size: 0.75rem; margin-bottom: 2rem; }
    .hero-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .hero h1 { font-family: var(--font-display); font-size: clamp(2.5rem, 8vw, 5rem); font-weight: 700; line-height: 1; letter-spacing: -0.02em; margin-bottom: 1.5rem; color: var(--text-primary); }
    .hero p { font-size: 1.125rem; color: var(--text-secondary); max-width: 36rem; margin: 0 auto 2.5rem; line-height: 1.6; }
    .hero-btns { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .btn-primary { padding: 0.875rem 2rem; border-radius: 0.75rem; background: var(--accent); color: var(--accent-fg); font-size: 1rem; font-weight: 600; transition: opacity 0.2s, transform 0.1s; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:active { transform: scale(0.97); }
    .btn-ghost { padding: 0.875rem 2rem; border-radius: 0.75rem; border: 1px solid var(--border); color: var(--text-secondary); font-size: 1rem; transition: color 0.2s; }
    .btn-ghost:hover { color: var(--text-primary); }

    /* Features */
    .features { padding: 8rem 1.5rem; background: var(--bg-secondary); }
    .section-header { text-align: center; margin-bottom: 5rem; }
    .section-header h2 { font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; }
    .section-header p { font-size: 1.125rem; color: var(--text-secondary); max-width: 32rem; margin: 0 auto; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; max-width: 72rem; margin: 0 auto; }
    .feature-card { padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border); background: var(--bg-primary); opacity: 0; transform: translateY(24px); transition: opacity 0.7s, transform 0.7s; }
    .feature-card.visible { opacity: 1; transform: none; }
    .feature-icon { font-size: 2rem; margin-bottom: 1rem; }
    .feature-card h3 { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; }
    .feature-card p { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; }

    /* CTA */
    .cta { padding: 8rem 1.5rem; background: var(--bg-secondary); text-align: center; }
    .cta h2 { font-family: var(--font-display); font-size: clamp(2rem, 6vw, 4rem); font-weight: 700; color: var(--text-primary); margin-bottom: 1.5rem; }
    .cta p { font-size: 1.125rem; color: var(--text-secondary); margin-bottom: 2.5rem; }

    /* Footer */
    .footer { padding: 5rem 1.5rem 2rem; background: var(--bg-primary); border-top: 1px solid var(--border); }
    .footer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 3rem; max-width: 72rem; margin: 0 auto 4rem; }
    .footer-col p:first-child { font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; font-size: 0.875rem; }
    .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
    .footer-col ul a { font-size: 0.875rem; color: var(--text-secondary); transition: color 0.2s; }
    .footer-col ul a:hover { color: var(--text-primary); }
    .footer-bottom { max-width: 72rem; margin: 0 auto; padding-top: 2rem; border-top: 1px solid var(--border); display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--text-secondary); }

    /* Animations */
    .fade-in { opacity: 0; transform: translateY(24px); transition: opacity 0.7s cubic-bezier(0.19,1,0.22,1), transform 0.7s cubic-bezier(0.19,1,0.22,1); }
    .fade-in.visible { opacity: 1; transform: none; }
  </style>
</head>
<body>
  <nav class="nav" id="nav">
    <span class="nav-logo">${cfg.siteName}</span>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
      <a href="#about">About</a>
    </div>
    <a href="#" class="nav-cta">Get started</a>
  </nav>

  <section class="hero">
    <div class="hero-glow"></div>
    <div>
      <div class="hero-badge fade-in">
        <span class="hero-dot"></span>
        Now available
      </div>
      <h1 class="fade-in">${cfg.siteName}</h1>
      <p class="fade-in">A modern platform built for teams who move fast. Ship better products with less friction.</p>
      <div class="hero-btns fade-in">
        <a href="#" class="btn-primary">Start for free</a>
        <a href="#features" class="btn-ghost">Learn more →</a>
      </div>
    </div>
  </section>

  <section class="features" id="features">
    <div class="section-header">
      <h2 class="fade-in">Everything you need</h2>
      <p class="fade-in">All the building blocks to ship faster and scale with confidence.</p>
    </div>
    <div class="features-grid">
      ${["⚡ Lightning fast", "🛠 Developer first", "📈 Scales with you", "🔒 Secure by default", "🔄 Real-time sync", "🌐 Open ecosystem"]
        .map(
          (f) => `<div class="feature-card fade-in">
        <div class="feature-icon">${f.split(" ")[0]}</div>
        <h3>${f.split(" ").slice(1).join(" ")}</h3>
        <p>Best-in-class performance and reliability, built for modern teams.</p>
      </div>`
        )
        .join("\n      ")}
    </div>
  </section>

  <section class="cta">
    <h2 class="fade-in">Ready to get started?</h2>
    <p class="fade-in">Join thousands of teams already building on ${cfg.siteName}.</p>
    <div class="hero-btns fade-in">
      <a href="#" class="btn-primary">Start building for free →</a>
    </div>
  </section>

  <footer class="footer">
    <div class="footer-grid">
      <div class="footer-col">
        <p style="font-family: var(--font-display); font-size: 1.25rem;">${cfg.siteName}</p>
        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.5rem;">&copy; ${new Date().getFullYear()} ${cfg.siteName}</p>
      </div>
      ${[["Product", ["Features", "Pricing", "Changelog"]], ["Company", ["About", "Blog", "Careers"]], ["Legal", ["Privacy", "Terms", "Security"]]]
        .map(
          ([title, links]) => `<div class="footer-col">
        <p>${title}</p>
        <ul>${(links as string[]).map((l) => `<li><a href="#">${l}</a></li>`).join("")}</ul>
      </div>`
        )
        .join("\n      ")}
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} ${cfg.siteName}. All rights reserved.</span>
      <span>Built with <a href="#" style="color: var(--accent); text-decoration: underline;">Studio OS</a></span>
    </div>
  </footer>

  <script>
    // Scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 60);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in, .feature-card').forEach((el) => observer.observe(el));

    // Nav scroll state
    window.addEventListener('scroll', () => {
      document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 60);
    });

    // Trigger hero animations on load
    setTimeout(() => {
      document.querySelectorAll('.hero .fade-in').forEach((el, i) => {
        setTimeout(() => el.classList.add('visible'), i * 120);
      });
    }, 100);
  </script>
</body>
</html>`;
}

export function downloadHtml(cfg: ExportConfig): void {
  const html = generateStandaloneHtml(cfg);
  const blob = new Blob([html], { type: "text/html" });
  const slug = cfg.siteName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  triggerDownload(blob, `${slug}.html`);
}

// ---------------------------------------------------------------------------
// Public API — Section TSX export
// ---------------------------------------------------------------------------

const SECTION_GENERATORS: Record<string, (cfg: ExportConfig) => string> = {
  "Nav.tsx": genNavSection,
  "Hero.tsx": genHeroSection,
  "Features.tsx": () => genFeaturesSection(),
  "Pricing.tsx": () => genPricingSection(),
  "CTA.tsx": genCTASection,
  "Footer.tsx": genFooterSection,
};

export const SECTION_NAMES = Object.keys(SECTION_GENERATORS);

export function generateSectionComponent(sectionFilename: string, cfg: ExportConfig): string {
  const gen = SECTION_GENERATORS[sectionFilename];
  if (!gen) throw new Error(`Unknown section: ${sectionFilename}`);
  return gen(cfg);
}

export function downloadSection(sectionFilename: string, cfg: ExportConfig): void {
  const code = generateSectionComponent(sectionFilename, cfg);
  const blob = new Blob([code], { type: "text/typescript" });
  triggerDownload(blob, sectionFilename);
}

// ---------------------------------------------------------------------------
// Public API — Framer paste
// ---------------------------------------------------------------------------

export function toFramerPasteReady(code: string): string {
  let cleaned = code
    .replace(/^import\s+.*?from\s+['"]react['"];?\s*$/gm, "")
    .replace(/^import\s+\{[^}]*\}\s+from\s+['"]framer-motion['"];?\s*$/gm, "")
    .replace(/^export\s+default\s+/gm, "export default ")
    .trim();

  if (!cleaned.startsWith("import")) {
    cleaned = `import { motion } from "framer-motion"\n\n${cleaned}`;
  }

  return cleaned;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
}

// ---------------------------------------------------------------------------
// Public API — Deploy to Vercel
// ---------------------------------------------------------------------------

/**
 * Downloads the Next.js ZIP and opens vercel.com/new in a new tab
 * so the user can drag-drop import it immediately.
 */
export function deployToVercel(cfg: ExportConfig): void {
  downloadNextjsZip(cfg);
  setTimeout(() => {
    window.open("https://vercel.com/new", "_blank", "noopener,noreferrer");
  }, 800);
}

// ---------------------------------------------------------------------------
// Convenience re-export of original downloadTSX helper
// ---------------------------------------------------------------------------

export function downloadTSX(code: string, filename: string): void {
  const blob = new Blob([code], { type: "text/typescript" });
  triggerDownload(blob, filename.endsWith(".tsx") ? filename : `${filename}.tsx`);
}
