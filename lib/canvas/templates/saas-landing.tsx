"use client";

/**
 * SaaS Landing Page Template
 *
 * Dark, precision-focused aesthetic inspired by Linear / Vercel.
 * Purple accent (#7170ff), near-black base, tight tracking, smooth motion.
 *
 * Sections:
 *   1. Nav
 *   2. Hero
 *   3. Logo bar (social proof)
 *   4. Feature bento grid
 *   5. How it works
 *   6. Testimonials
 *   7. Pricing
 *   8. CTA + Footer
 */

import * as React from "react";
import { motion, useInView } from "framer-motion";

// ─── Design tokens ───────────────────────────────────────────────────────────

const T = {
  bgRoot: "#010102",
  bgBase: "#08090a",
  bgSurface: "#0f1011",
  bgCard: "#141518",
  bgCardHover: "#1a1b1f",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  textPrimary: "#f7f8f8",
  textSecondary: "#b4b8c4",
  textTertiary: "#6b7280",
  accent: "#7170ff",
  accentMuted: "rgba(113,112,255,0.12)",
  accentGlow: "rgba(113,112,255,0.25)",
} as const;

const ease = [0.19, 1, 0.22, 1] as const; // ease-out-expo

// ─── Animation helpers ────────────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(1,1,2,0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 32px",
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: "auto" }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: `linear-gradient(135deg, ${T.accent} 0%, #a78bfa 100%)`,
            }}
          />
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: T.textPrimary,
              letterSpacing: "-0.022em",
            }}
          >
            Vessel
          </span>
        </div>

        {/* Links */}
        {["Product", "Pricing", "Docs", "Changelog"].map((l) => (
          <a
            key={l}
            href="#"
            style={{
              fontSize: 13,
              color: T.textTertiary,
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = T.textSecondary)}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = T.textTertiary)}
          >
            {l}
          </a>
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <a
            href="#"
            style={{
              fontSize: 13,
              color: T.textTertiary,
              textDecoration: "none",
              padding: "6px 12px",
            }}
          >
            Sign in
          </a>
          <button
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#fff",
              background: T.accent,
              border: "none",
              borderRadius: 6,
              padding: "7px 14px",
              cursor: "pointer",
              letterSpacing: "-0.01em",
            }}
          >
            Get started
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        paddingTop: 120,
        paddingBottom: 120,
        background: T.bgRoot,
        textAlign: "center",
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 600,
          background: `radial-gradient(ellipse at center, ${T.accentGlow} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 32px", position: "relative" }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 28 }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px 4px 6px",
              borderRadius: 100,
              border: `1px solid ${T.border}`,
              background: T.accentMuted,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: T.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 9, color: "#fff" }}>✦</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.accent }}>
              Now in public beta
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease }}
          style={{
            fontSize: "clamp(42px, 6vw, 72px)",
            fontWeight: 700,
            letterSpacing: "-0.038em",
            lineHeight: 1.05,
            color: T.textPrimary,
            margin: "0 0 20px",
          }}
        >
          Design systems
          <br />
          <span
            style={{
              background: `linear-gradient(135deg, ${T.accent} 0%, #a78bfa 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            that ship.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: T.textSecondary,
            margin: "0 auto 40px",
            maxWidth: 520,
          }}
        >
          Vessel gives your team a single source of truth for design tokens, components, and
          documentation. From Figma to production in minutes.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}
        >
          <button
            style={{
              height: 48,
              padding: "0 24px",
              borderRadius: 8,
              background: T.accent,
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              border: "none",
              cursor: "pointer",
              letterSpacing: "-0.012em",
              boxShadow: `0 0 0 1px ${T.accent}, 0 8px 32px ${T.accentGlow}`,
            }}
          >
            Start free →
          </button>
          <button
            style={{
              height: 48,
              padding: "0 24px",
              borderRadius: 8,
              background: "transparent",
              color: T.textSecondary,
              fontWeight: 500,
              fontSize: 15,
              border: `1px solid ${T.border}`,
              cursor: "pointer",
            }}
          >
            See the demo
          </button>
        </motion.div>

        {/* Hero UI mock */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.25, ease }}
          style={{
            marginTop: 72,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${T.border}`,
            boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px ${T.border}`,
            background: T.bgCard,
            height: 380,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Mock browser chrome */}
          <div
            style={{
              height: 36,
              background: T.bgSurface,
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              gap: 6,
              flexShrink: 0,
            }}
          >
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
            ))}
          </div>
          {/* Mock UI content */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Sidebar */}
            <div
              style={{
                width: 200,
                borderRight: `1px solid ${T.border}`,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {["Tokens", "Components", "Docs", "Releases"].map((item, i) => (
                <div
                  key={item}
                  style={{
                    height: 28,
                    borderRadius: 5,
                    background: i === 0 ? T.accentMuted : "transparent",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: i === 0 ? T.accent : T.textTertiary,
                      fontWeight: i === 0 ? 500 : 400,
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
            {/* Main area */}
            <div style={{ flex: 1, padding: 24, overflow: "hidden" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {[
                  { label: "bg.primary", color: "#010102" },
                  { label: "accent.500", color: "#7170ff" },
                  { label: "text.primary", color: "#f7f8f8" },
                  { label: "border", color: "#1a1b1f" },
                  { label: "success", color: "#10b981" },
                  { label: "warning", color: "#f59e0b" },
                ].map(({ label, color }) => (
                  <div
                    key={label}
                    style={{
                      width: 80,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div style={{ height: 48, background: color }} />
                    <div style={{ padding: "6px 8px", background: T.bgSurface }}>
                      <span style={{ fontSize: 10, color: T.textTertiary, fontFamily: "monospace" }}>
                        {label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Logo bar ─────────────────────────────────────────────────────────────────

function LogoBar() {
  const logos = ["Vercel", "Linear", "Stripe", "Notion", "Figma", "GitHub"];
  return (
    <section
      style={{
        padding: "48px 32px",
        background: T.bgBase,
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <FadeUp>
          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              letterSpacing: "0.1em",
              fontWeight: 500,
              color: T.textTertiary,
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            Trusted by teams at
          </p>
        </FadeUp>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
            flexWrap: "wrap",
          }}
        >
          {logos.map((name, i) => (
            <FadeUp key={name} delay={i * 0.04}>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: T.textTertiary,
                  letterSpacing: "-0.01em",
                  opacity: 0.55,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {name}
              </span>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function FeatureCard({
  title,
  description,
  tag,
  wide,
  tall,
  accent,
  preview,
}: {
  title: string;
  description: string;
  tag: string;
  wide?: boolean;
  tall?: boolean;
  accent?: string;
  preview?: React.ReactNode;
}) {
  const [hovered, setHovered] = React.useState(false);
  const a = accent ?? T.accent;
  return (
    <div
      style={{
        gridColumn: wide ? "span 2" : "span 1",
        gridRow: tall ? "span 2" : "span 1",
        borderRadius: 14,
        border: `1px solid ${hovered ? T.borderHover : T.border}`,
        background: hovered ? T.bgCardHover : T.bgCard,
        padding: 28,
        transition: "all 0.2s",
        cursor: "default",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflow: "hidden",
        position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tag */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 8px",
          borderRadius: 100,
          background: `${a}18`,
          border: `1px solid ${a}30`,
          width: "fit-content",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 500, color: a }}>{tag}</span>
      </div>

      {/* Preview area */}
      {preview && <div style={{ flex: 1, minHeight: 100 }}>{preview}</div>}

      {/* Text */}
      <div>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: T.textPrimary,
            letterSpacing: "-0.018em",
            margin: "0 0 6px",
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, margin: 0 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

function Features() {
  return (
    <section
      style={{ padding: "100px 32px", background: T.bgBase }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p
              style={{
                fontSize: 12,
                letterSpacing: "0.1em",
                fontWeight: 500,
                color: T.accent,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Platform
            </p>
            <h2
              style={{
                fontSize: "clamp(32px, 4vw, 52px)",
                fontWeight: 700,
                letterSpacing: "-0.032em",
                lineHeight: 1.1,
                color: T.textPrimary,
                margin: "0 auto 16px",
                maxWidth: 600,
              }}
            >
              Every tool your design team needs
            </h2>
            <p
              style={{
                fontSize: 16,
                color: T.textSecondary,
                lineHeight: 1.6,
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              One platform to manage tokens, components, and documentation — with real-time sync to
              your codebase.
            </p>
          </div>
        </FadeUp>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {[
            {
              tag: "Design Tokens",
              title: "Single source of truth",
              description:
                "Define your colors, spacing, and typography once. Vessel syncs them across Figma, CSS, and your component library automatically.",
              accent: T.accent,
            },
            {
              tag: "Components",
              title: "Living component library",
              description:
                "Document every component with usage guidelines, props, and live previews. Always in sync with your production code.",
              accent: "#10b981",
            },
            {
              tag: "Collaboration",
              title: "Real-time team editing",
              description:
                "Comment, annotate, and approve changes together. Full version history with branch-based workflows for large teams.",
              accent: "#f59e0b",
            },
            {
              tag: "Code Sync",
              title: "Git-native integration",
              description:
                "Changes to your design system automatically open PRs in your repo. Your codebase is always up to date.",
              accent: "#a78bfa",
              wide: true,
            },
          ].map((f) => (
            <FadeUp key={f.tag} delay={0.05}>
              <FeatureCard {...f} />
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Connect your tools",
      desc: "Link Figma, GitHub, and your component library in minutes. No configuration files required.",
    },
    {
      n: "02",
      title: "Define your system",
      desc: "Import existing tokens or build from scratch. Our AI suggests missing values and fixes inconsistencies.",
    },
    {
      n: "03",
      title: "Publish & ship",
      desc: "Generate a public docs site and push tokens directly to your repo via automated PRs.",
    },
  ];

  return (
    <section style={{ padding: "100px 32px", background: T.bgRoot }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <p
              style={{
                fontSize: 12,
                letterSpacing: "0.1em",
                fontWeight: 500,
                color: T.accent,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Getting started
            </p>
            <h2
              style={{
                fontSize: "clamp(32px, 4vw, 48px)",
                fontWeight: 700,
                letterSpacing: "-0.032em",
                color: T.textPrimary,
                margin: 0,
              }}
            >
              Up and running in 15 minutes
            </h2>
          </div>
        </FadeUp>

        <div style={{ display: "flex", gap: 2, position: "relative" }}>
          {/* Connecting line */}
          <div
            style={{
              position: "absolute",
              top: 24,
              left: 32,
              right: 32,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${T.accent}40, transparent)`,
            }}
          />

          {steps.map((step, i) => (
            <FadeUp key={step.n} delay={i * 0.08} className="flex-1">
              <div
                style={{
                  flex: 1,
                  padding: 32,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: `1px solid ${T.border}`,
                    background: T.bgCard,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 24,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "monospace",
                      color: T.accent,
                    }}
                  >
                    {step.n}
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "-0.018em",
                    color: T.textPrimary,
                    margin: "0 0 10px",
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.6, margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  const quotes = [
    {
      text: "This changed how our team ships — we went from weeks to days on every launch.",
      name: "Sarah Chen",
      role: "Head of Product, Arkwright",
    },
    {
      text: "The quality jump was immediate. Our clients started asking what we changed.",
      name: "Marcus Reid",
      role: "Engineering Lead, Daylite",
    },
    {
      text: "We evaluated everything on the market. This was the only tool that felt like it was built for us.",
      name: "Priya Nair",
      role: "VP of Design, Luminary",
    },
  ];

  return (
    <section
      style={{
        padding: "100px 32px",
        background: T.bgBase,
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <FadeUp>
          <h2
            style={{
              textAlign: "center",
              fontSize: "clamp(28px, 3.5vw, 44px)",
              fontWeight: 700,
              letterSpacing: "-0.032em",
              color: T.textPrimary,
              marginBottom: 56,
            }}
          >
            Loved by design-forward teams
          </h2>
        </FadeUp>

        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
        >
          {quotes.map((q, i) => (
            <FadeUp key={q.name} delay={i * 0.07}>
              <div
                style={{
                  borderRadius: 14,
                  border: `1px solid ${T.border}`,
                  background: T.bgCard,
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                {/* Stars */}
                <div style={{ display: "flex", gap: 3 }}>
                  {Array(5)
                    .fill(0)
                    .map((_, idx) => (
                      <span key={idx} style={{ color: "#f59e0b", fontSize: 14 }}>
                        ★
                      </span>
                    ))}
                </div>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: T.textSecondary,
                    margin: 0,
                    flex: 1,
                  }}
                >
                  &ldquo;{q.text}&rdquo;
                </p>
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: T.textPrimary,
                      margin: "0 0 2px",
                    }}
                  >
                    {q.name}
                  </p>
                  <p style={{ fontSize: 12, color: T.textTertiary, margin: 0 }}>{q.role}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "Free",
      desc: "Perfect for indie designers and small projects.",
      features: ["3 projects", "1 design system", "Figma plugin", "Public docs site"],
      cta: "Start free",
      highlight: false,
    },
    {
      name: "Pro",
      price: "$29",
      per: "/mo",
      desc: "For professional design teams ready to scale.",
      features: [
        "Unlimited projects",
        "5 design systems",
        "Git sync",
        "Private docs",
        "Version history",
        "Priority support",
      ],
      cta: "Start trial",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      desc: "Dedicated infrastructure and white-glove onboarding.",
      features: [
        "Everything in Pro",
        "SSO / SAML",
        "SLA guarantee",
        "Custom integrations",
        "Dedicated CSM",
      ],
      cta: "Contact sales",
      highlight: false,
    },
  ];

  return (
    <section style={{ padding: "100px 32px", background: T.bgRoot }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p
              style={{
                fontSize: 12,
                letterSpacing: "0.1em",
                fontWeight: 500,
                color: T.accent,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Pricing
            </p>
            <h2
              style={{
                fontSize: "clamp(32px, 4vw, 48px)",
                fontWeight: 700,
                letterSpacing: "-0.032em",
                color: T.textPrimary,
                margin: 0,
              }}
            >
              Simple, transparent pricing
            </h2>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {plans.map((plan, i) => (
            <FadeUp key={plan.name} delay={i * 0.06}>
              <div
                style={{
                  borderRadius: 14,
                  border: plan.highlight ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                  background: plan.highlight ? T.bgCard : T.bgBase,
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  position: "relative",
                  boxShadow: plan.highlight
                    ? `0 0 40px ${T.accentGlow}, 0 0 0 1px ${T.accent}`
                    : "none",
                }}
              >
                {plan.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      padding: "3px 10px",
                      borderRadius: 100,
                      background: T.accent,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#fff",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Most popular
                  </div>
                )}

                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: plan.highlight ? T.accent : T.textTertiary,
                    letterSpacing: "0.04em",
                    margin: "0 0 12px",
                    textTransform: "uppercase",
                  }}
                >
                  {plan.name}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 40,
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      color: T.textPrimary,
                    }}
                  >
                    {plan.price}
                  </span>
                  {plan.per && (
                    <span style={{ fontSize: 14, color: T.textTertiary }}>{plan.per}</span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5, margin: "0 0 24px" }}>
                  {plan.desc}
                </p>

                <div
                  style={{
                    height: 1,
                    background: T.border,
                    margin: "0 0 20px",
                  }}
                />

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: plan.highlight ? T.accent : T.textTertiary, fontSize: 14 }}>
                        ✓
                      </span>
                      <span style={{ fontSize: 13, color: T.textSecondary }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  style={{
                    marginTop: "auto",
                    height: 40,
                    borderRadius: 8,
                    border: plan.highlight ? "none" : `1px solid ${T.border}`,
                    background: plan.highlight ? T.accent : "transparent",
                    color: plan.highlight ? "#fff" : T.textSecondary,
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section
      style={{
        padding: "100px 32px",
        background: T.bgBase,
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <FadeUp>
          <h2
            style={{
              fontSize: "clamp(36px, 5vw, 60px)",
              fontWeight: 700,
              letterSpacing: "-0.038em",
              lineHeight: 1.05,
              color: T.textPrimary,
              margin: "0 0 20px",
            }}
          >
            Build better design systems,{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${T.accent}, #a78bfa)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              together.
            </span>
          </h2>
          <p
            style={{
              fontSize: 17,
              color: T.textSecondary,
              lineHeight: 1.6,
              margin: "0 0 40px",
            }}
          >
            Join thousands of teams already using Vessel to ship consistent products faster.
          </p>
          <button
            style={{
              height: 52,
              padding: "0 32px",
              borderRadius: 10,
              background: T.accent,
              color: "#fff",
              fontWeight: 600,
              fontSize: 16,
              border: "none",
              cursor: "pointer",
              letterSpacing: "-0.012em",
              boxShadow: `0 8px 32px ${T.accentGlow}`,
            }}
          >
            Get started for free →
          </button>
          <p style={{ fontSize: 12, color: T.textTertiary, marginTop: 16 }}>
            No credit card required · Free forever plan
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const cols = [
    { heading: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
    { heading: "Developers", links: ["Docs", "API", "CLI", "Status"] },
    { heading: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  ];

  return (
    <footer
      style={{
        borderTop: `1px solid ${T.border}`,
        background: T.bgRoot,
        padding: "60px 32px 40px",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto",
          gap: 48,
        }}
      >
        {/* Brand */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                background: `linear-gradient(135deg, ${T.accent}, #a78bfa)`,
              }}
            />
            <span
              style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, letterSpacing: "-0.02em" }}
            >
              Vessel
            </span>
          </div>
          <p style={{ fontSize: 13, color: T.textTertiary, lineHeight: 1.6, maxWidth: 220 }}>
            Design systems that ship. Built for teams who care about quality.
          </p>
        </div>

        {cols.map((col) => (
          <div key={col.heading}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: T.textTertiary,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 12px",
              }}
            >
              {col.heading}
            </p>
            {col.links.map((link) => (
              <a
                key={link}
                href="#"
                style={{
                  display: "block",
                  fontSize: 13,
                  color: T.textTertiary,
                  textDecoration: "none",
                  marginBottom: 8,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = T.textSecondary)}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = T.textTertiary)}
              >
                {link}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          maxWidth: 1120,
          margin: "40px auto 0",
          borderTop: `1px solid ${T.border}`,
          paddingTop: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: T.textTertiary }}>
          © {new Date().getFullYear()} Vessel, Inc. All rights reserved.
        </span>
        <span style={{ fontSize: 12, color: T.textTertiary }}>Privacy · Terms</span>
      </div>
    </footer>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function SaasLanding() {
  return (
    <div
      style={{
        fontFamily:
          '"Geist", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: T.bgRoot,
        color: T.textPrimary,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      <Nav />
      <Hero />
      <LogoBar />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}

// Named section exports for canvas frame insertion
export { Nav, Hero, LogoBar, Features, HowItWorks, Testimonials, Pricing, CTA, Footer };
