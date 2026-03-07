"use client";

/**
 * Documentation Site Template
 *
 * Developer-focused, clean, precise. Vercel Docs / Stripe Docs aesthetic.
 * Pure white base, monospace accents, tight typographic hierarchy.
 *
 * Sections:
 *   1. Top nav (with search)
 *   2. Hero / Getting started banner
 *   3. Two-column layout: sidebar + main content
 *      - Sidebar: hierarchical nav
 *      - Main: intro content, quick start, code blocks, component list
 *   4. Footer
 */

import * as React from "react";
import { motion } from "framer-motion";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bgWhite: "#ffffff",
  bgSurface: "#fafafa",
  bgCode: "#0d1117",
  bgCodeInline: "#f3f4f6",
  ink: "#111111",
  inkLight: "#374151",
  inkMuted: "#6b7280",
  inkFaint: "#9ca3af",
  accent: "#0070f3",
  accentLight: "#e8f4ff",
  accentPurple: "#7c3aed",
  green: "#16a34a",
  border: "rgba(0,0,0,0.07)",
  borderMid: "rgba(0,0,0,0.12)",
} as const;

const ease = [0.19, 1, 0.22, 1] as const;

// ─── Code block ───────────────────────────────────────────────────────────────

function CodeBlock({
  language,
  children,
  filename,
}: {
  language: string;
  children: string;
  filename?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      style={{
        borderRadius: 10,
        overflow: "hidden",
        border: `1px solid rgba(255,255,255,0.06)`,
        marginBottom: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "#161b22",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {filename && (
            <span style={{ fontSize: 12, color: "#8b949e", fontFamily: "monospace" }}>
              {filename}
            </span>
          )}
          <span
            style={{
              fontSize: 11,
              color: "#484f58",
              padding: "1px 6px",
              borderRadius: 3,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontFamily: "monospace",
            }}
          >
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          style={{
            fontSize: 11,
            color: copied ? "#3fb950" : "#8b949e",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "monospace",
            transition: "color 0.15s",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      {/* Code */}
      <pre
        style={{
          margin: 0,
          padding: "20px 20px",
          background: T.bgCode,
          overflow: "auto",
          fontSize: 13,
          lineHeight: 1.7,
          fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", monospace',
          color: "#e6edf3",
        }}
      >
        <code>{children}</code>
      </pre>
    </div>
  );
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────

function TopNav() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          maxWidth: "100%",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              background: T.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>V</span>
          </div>
          <span
            style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}
          >
            Vessel
          </span>
          <span
            style={{
              fontSize: 12,
              color: T.inkMuted,
              padding: "1px 6px",
              borderRadius: 4,
              border: `1px solid ${T.border}`,
              marginLeft: 4,
            }}
          >
            Docs
          </span>
        </div>

        {/* Search bar */}
        <div
          style={{
            flex: 1,
            maxWidth: 360,
            height: 34,
            borderRadius: 7,
            border: `1px solid ${T.border}`,
            background: T.bgSurface,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 12px",
            cursor: "text",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={T.inkFaint}
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span style={{ fontSize: 13, color: T.inkFaint }}>Search docs...</span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: T.inkFaint,
              padding: "1px 5px",
              borderRadius: 3,
              border: `1px solid ${T.border}`,
              fontFamily: "monospace",
            }}
          >
            ⌘K
          </span>
        </div>

        {/* Nav links */}
        <nav style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {["Guides", "API Reference", "Examples", "Changelog"].map((l) => (
            <a
              key={l}
              href="#"
              style={{
                fontSize: 13,
                color: T.inkMuted,
                textDecoration: "none",
                padding: "5px 10px",
                borderRadius: 5,
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = T.bgSurface;
                (e.target as HTMLElement).style.color = T.ink;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = "transparent";
                (e.target as HTMLElement).style.color = T.inkMuted;
              }}
            >
              {l}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", gap: 8 }}>
          <a
            href="#"
            style={{
              fontSize: 13,
              color: T.ink,
              textDecoration: "none",
              padding: "5px 12px",
              borderRadius: 5,
              border: `1px solid ${T.border}`,
              fontWeight: 500,
            }}
          >
            Sign in
          </a>
          <button
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#fff",
              background: T.ink,
              border: "none",
              borderRadius: 5,
              padding: "5px 12px",
              cursor: "pointer",
            }}
          >
            Get started
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Hero banner ──────────────────────────────────────────────────────────────

function HeroBanner() {
  return (
    <div
      style={{
        borderBottom: `1px solid ${T.border}`,
        background: `linear-gradient(to bottom, #f0f7ff 0%, ${T.bgWhite} 100%)`,
        padding: "56px 0 48px",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 40px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 10px",
              borderRadius: 100,
              background: T.accentLight,
              border: `1px solid rgba(0,112,243,0.15)`,
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: T.accent }}>
              v3.0 — Now Generally Available
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: T.ink,
              margin: "0 0 16px",
            }}
          >
            Vessel Documentation
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.65,
              color: T.inkLight,
              margin: "0 0 32px",
              maxWidth: 560,
            }}
          >
            Everything you need to integrate Vessel into your design and development workflow.
            Explore guides, API references, and example implementations.
          </p>

          {/* Quick links */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { label: "Quick start →", accent: true },
              { label: "API reference →", accent: false },
              { label: "Examples →", accent: false },
              { label: "Figma plugin →", accent: false },
            ].map((link) => (
              <a
                key={link.label}
                href="#"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  color: link.accent ? T.accent : T.inkLight,
                  textDecoration: "none",
                  padding: "7px 14px",
                  borderRadius: 7,
                  border: `1px solid ${link.accent ? "rgba(0,112,243,0.3)" : T.border}`,
                  background: link.accent ? T.accentLight : T.bgSurface,
                  transition: "all 0.12s",
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    section: "Getting Started",
    items: ["Introduction", "Quick Start", "Installation", "Configuration"],
  },
  {
    section: "Core Concepts",
    items: ["Design Tokens", "Component Library", "Theming", "Versioning"],
  },
  {
    section: "Integrations",
    items: ["Figma Plugin", "GitHub Sync", "CLI Tool", "Webhooks"],
  },
  {
    section: "API Reference",
    items: ["Authentication", "Tokens API", "Components API", "Webhooks API"],
  },
  {
    section: "Guides",
    items: ["Migrating from v2", "Multi-brand setup", "CI/CD pipeline", "Team workflows"],
  },
];

function Sidebar({ activeItem }: { activeItem: string }) {
  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        position: "sticky",
        top: 56,
        height: "calc(100vh - 56px)",
        overflowY: "auto",
        padding: "24px 0",
        borderRight: `1px solid ${T.border}`,
      }}
    >
      {NAV_ITEMS.map((group) => (
        <div key={group.section} style={{ marginBottom: 8 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.inkFaint,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "8px 16px 4px",
              margin: 0,
            }}
          >
            {group.section}
          </p>
          {group.items.map((item) => {
            const isActive = item === activeItem;
            return (
              <a
                key={item}
                href="#"
                style={{
                  display: "block",
                  padding: "5px 16px",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? T.accent : T.inkMuted,
                  textDecoration: "none",
                  background: isActive ? T.accentLight : "transparent",
                  borderRight: isActive ? `2px solid ${T.accent}` : "2px solid transparent",
                  transition: "all 0.12s",
                }}
              >
                {item}
              </a>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function MainContent() {
  return (
    <main style={{ flex: 1, minWidth: 0, padding: "40px 60px 80px 48px" }}>
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 28,
        }}
      >
        {["Docs", "Getting Started", "Quick Start"].map((crumb, i) => (
          <React.Fragment key={crumb}>
            {i > 0 && (
              <span style={{ fontSize: 12, color: T.inkFaint }}>›</span>
            )}
            <a
              href="#"
              style={{
                fontSize: 12,
                color: i === 2 ? T.inkLight : T.inkFaint,
                textDecoration: "none",
                fontWeight: i === 2 ? 500 : 400,
              }}
            >
              {crumb}
            </a>
          </React.Fragment>
        ))}
      </div>

      {/* Page title */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          color: T.ink,
          margin: "0 0 8px",
        }}
      >
        Quick Start
      </h1>
      <p style={{ fontSize: 16, color: T.inkLight, lineHeight: 1.65, margin: "0 0 40px" }}>
        Get up and running with Vessel in under 5 minutes. This guide covers installation,
        basic configuration, and your first token export.
      </p>

      {/* Prereqs callout */}
      <div
        style={{
          borderRadius: 8,
          padding: "14px 16px",
          background: T.accentLight,
          border: `1px solid rgba(0,112,243,0.15)`,
          marginBottom: 32,
          display: "flex",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>ℹ️</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.accent, margin: "0 0 2px" }}>
            Prerequisites
          </p>
          <p style={{ fontSize: 13, color: T.inkLight, margin: 0, lineHeight: 1.55 }}>
            You&rsquo;ll need Node.js 18+, a Vessel account, and your API key from the{" "}
            <a href="#" style={{ color: T.accent }}>
              dashboard
            </a>
            .
          </p>
        </div>
      </div>

      {/* Step 1 */}
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.018em",
          color: T.ink,
          margin: "0 0 12px",
          paddingTop: 8,
        }}
      >
        1. Install the CLI
      </h2>
      <p style={{ fontSize: 14, color: T.inkLight, lineHeight: 1.65, margin: "0 0 16px" }}>
        Install the Vessel CLI globally using npm, pnpm, or yarn.
      </p>

      <CodeBlock language="bash" filename="terminal">
{`npm install -g @vessel/cli
# or
pnpm add -g @vessel/cli`}
      </CodeBlock>

      {/* Step 2 */}
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.018em",
          color: T.ink,
          margin: "32px 0 12px",
        }}
      >
        2. Initialize your project
      </h2>
      <p style={{ fontSize: 14, color: T.inkLight, lineHeight: 1.65, margin: "0 0 16px" }}>
        Run <code style={{ fontSize: 13, fontFamily: "monospace", background: T.bgCodeInline, padding: "2px 6px", borderRadius: 4, color: T.accentPurple }}>vessel init</code> in your project root. This creates a{" "}
        <code style={{ fontSize: 13, fontFamily: "monospace", background: T.bgCodeInline, padding: "2px 6px", borderRadius: 4, color: T.accentPurple }}>vessel.config.ts</code> file.
      </p>

      <CodeBlock language="bash" filename="terminal">
{`cd your-project
vessel init`}
      </CodeBlock>

      <CodeBlock language="typescript" filename="vessel.config.ts">
{`import { defineConfig } from '@vessel/core'

export default defineConfig({
  projectId: 'YOUR_PROJECT_ID',
  tokens: {
    input: './design-tokens.json',   // Figma export or custom JSON
    output: {
      css: './src/styles/tokens.css',
      ts: './src/tokens.ts',
    },
  },
  sync: {
    figma: {
      fileId: 'YOUR_FIGMA_FILE_ID',
      token: process.env.FIGMA_TOKEN,
    },
  },
})`}
      </CodeBlock>

      {/* Step 3 */}
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.018em",
          color: T.ink,
          margin: "32px 0 12px",
        }}
      >
        3. Pull your first tokens
      </h2>
      <p style={{ fontSize: 14, color: T.inkLight, lineHeight: 1.65, margin: "0 0 16px" }}>
        Authenticate and pull your design tokens from Figma.
      </p>

      <CodeBlock language="bash" filename="terminal">
{`vessel auth login
vessel tokens pull
# ✓ Pulled 84 tokens from Figma
# ✓ Generated src/styles/tokens.css
# ✓ Generated src/tokens.ts`}
      </CodeBlock>

      {/* What's next */}
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.018em",
          color: T.ink,
          margin: "40px 0 16px",
        }}
      >
        What&rsquo;s next
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { title: "Component Library", desc: "Document and sync your components", href: "#" },
          { title: "CI/CD Integration", desc: "Automate token sync in your pipeline", href: "#" },
          { title: "Figma Plugin", desc: "Pull tokens directly from Figma", href: "#" },
          { title: "API Reference", desc: "Explore the full REST API", href: "#" },
        ].map((card) => (
          <a
            key={card.title}
            href={card.href}
            style={{
              display: "block",
              padding: "16px 18px",
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.bgSurface,
              textDecoration: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = T.accent;
              (e.currentTarget as HTMLAnchorElement).style.background = T.accentLight;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = T.border;
              (e.currentTarget as HTMLAnchorElement).style.background = T.bgSurface;
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: T.ink, margin: "0 0 3px" }}>
              {card.title} →
            </p>
            <p style={{ fontSize: 12, color: T.inkMuted, margin: 0 }}>{card.desc}</p>
          </a>
        ))}
      </div>

      {/* Prev / next */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 56,
          paddingTop: 24,
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <a
          href="#"
          style={{
            fontSize: 13,
            color: T.inkMuted,
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Previous
          </span>
          <span style={{ fontWeight: 600, color: T.ink }}>← Introduction</span>
        </a>
        <a
          href="#"
          style={{
            fontSize: 13,
            color: T.inkMuted,
            textDecoration: "none",
            textAlign: "right",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Next
          </span>
          <span style={{ fontWeight: 600, color: T.ink }}>Installation →</span>
        </a>
      </div>
    </main>
  );
}

// ─── Table of contents ────────────────────────────────────────────────────────

function TableOfContents() {
  const items = [
    "1. Install the CLI",
    "2. Initialize your project",
    "3. Pull your first tokens",
    "What's next",
  ];

  return (
    <aside
      style={{
        width: 200,
        flexShrink: 0,
        position: "sticky",
        top: 56,
        height: "calc(100vh - 56px)",
        padding: "40px 0 40px 24px",
        overflowY: "auto",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.inkFaint,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: "0 0 10px",
        }}
      >
        On this page
      </p>
      {items.map((item, i) => (
        <a
          key={item}
          href="#"
          style={{
            display: "block",
            fontSize: 12,
            color: i === 0 ? T.accent : T.inkMuted,
            textDecoration: "none",
            padding: "4px 0",
            borderLeft: `2px solid ${i === 0 ? T.accent : "transparent"}`,
            paddingLeft: 10,
            marginLeft: -10,
            transition: "all 0.12s",
          }}
        >
          {item}
        </a>
      ))}
    </aside>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      style={{
        borderTop: `1px solid ${T.border}`,
        background: T.bgSurface,
        padding: "32px 40px",
      }}
    >
      <div
        style={{
          maxWidth: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 24 }}>
          {["Privacy", "Terms", "Status", "GitHub"].map((l) => (
            <a
              key={l}
              href="#"
              style={{ fontSize: 12, color: T.inkFaint, textDecoration: "none" }}
            >
              {l}
            </a>
          ))}
        </div>
        <span style={{ fontSize: 12, color: T.inkFaint }}>
          © {new Date().getFullYear()} Vessel, Inc.
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.inkFaint }}>Was this page helpful?</span>
          {["Yes", "No"].map((v) => (
            <button
              key={v}
              style={{
                fontSize: 12,
                padding: "3px 10px",
                borderRadius: 5,
                border: `1px solid ${T.border}`,
                background: "transparent",
                color: T.inkMuted,
                cursor: "pointer",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function DocsSite() {
  return (
    <div
      style={{
        fontFamily:
          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: T.bgWhite,
        color: T.ink,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopNav />
      <HeroBanner />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar activeItem="Quick Start" />
        <MainContent />
        <TableOfContents />
      </div>
      <Footer />
    </div>
  );
}

export { TopNav, HeroBanner, Sidebar, MainContent, TableOfContents, Footer, CodeBlock };
