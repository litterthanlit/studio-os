"use client";

/**
 * Portfolio Template
 *
 * Minimal, editorial warmth inspired by Arc / Paper Design.
 * Cream/warm-white base, serif display headline, monochromatic with ink accent.
 *
 * Sections:
 *   1. Nav
 *   2. Hero (large name + role)
 *   3. Selected work (filterable grid)
 *   4. About
 *   5. Services / Skills
 *   6. Contact + Footer
 */

import * as React from "react";
import { motion, useInView } from "framer-motion";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bgCream: "#f8f5f0",
  bgWhite: "#fffefb",
  bgCard: "#fff",
  ink: "#111010",
  inkLight: "#3a3835",
  inkMuted: "#8c8680",
  inkFaint: "#c4bfb8",
  accent: "#1a1a1a",
  accentWarm: "#c97b3b",
  border: "rgba(0,0,0,0.07)",
  borderDark: "rgba(0,0,0,0.14)",
} as const;

const ease = [0.19, 1, 0.22, 1] as const;

// ─── Animation helper ─────────────────────────────────────────────────────────

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
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(248,245,240,0.88)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 40px",
          height: 64,
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: T.ink,
            marginRight: "auto",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          J. Harlow
        </span>

        <nav style={{ display: "flex", gap: 32 }}>
          {["Work", "About", "Services", "Contact"].map((l) => (
            <a
              key={l}
              href="#"
              style={{
                fontSize: 13,
                color: T.inkMuted,
                textDecoration: "none",
                fontWeight: 450,
                transition: "color 0.15s",
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = T.ink)}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = T.inkMuted)}
            >
              {l}
            </a>
          ))}
        </nav>

        <a
          href="#"
          style={{
            marginLeft: 40,
            fontSize: 13,
            fontWeight: 500,
            color: T.ink,
            textDecoration: "none",
            borderBottom: `1px solid ${T.ink}`,
            paddingBottom: 1,
            letterSpacing: "-0.01em",
          }}
        >
          Hire me
        </a>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      style={{
        padding: "120px 40px 100px",
        background: T.bgCream,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            fontSize: 12,
            letterSpacing: "0.14em",
            fontWeight: 500,
            color: T.inkMuted,
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          Designer & Creative Director
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.04, ease }}
          style={{
            fontSize: "clamp(56px, 8vw, 110px)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
            color: T.ink,
            fontFamily: "Georgia, 'Times New Roman', serif",
            margin: "0 0 36px",
            maxWidth: 900,
          }}
        >
          Crafting{" "}
          <em
            style={{
              fontStyle: "italic",
              color: T.accentWarm,
            }}
          >
            experiences
          </em>{" "}
          that resonate.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease }}
          style={{
            fontSize: 18,
            lineHeight: 1.7,
            color: T.inkLight,
            maxWidth: 540,
            margin: "0 0 48px",
            fontWeight: 400,
          }}
        >
          I'm a product designer based in London, helping startups and established brands build
          compelling digital products. 8 years of experience across fintech, SaaS, and consumer.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          style={{ display: "flex", gap: 24, alignItems: "center" }}
        >
          <a
            href="#"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              fontWeight: 600,
              color: T.ink,
              textDecoration: "none",
              borderBottom: `2px solid ${T.ink}`,
              paddingBottom: 2,
            }}
          >
            View selected work <span>→</span>
          </a>
          <span style={{ color: T.inkFaint }}>·</span>
          <a
            href="#"
            style={{
              fontSize: 14,
              color: T.inkMuted,
              textDecoration: "none",
              transition: "color 0.15s",
            }}
          >
            Download CV
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.28, ease }}
          style={{
            display: "flex",
            gap: 48,
            marginTop: 80,
            paddingTop: 48,
            borderTop: `1px solid ${T.border}`,
          }}
        >
          {[
            { n: "8+", label: "Years of experience" },
            { n: "60+", label: "Projects shipped" },
            { n: "24", label: "Happy clients" },
          ].map((stat) => (
            <div key={stat.n}>
              <p
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: T.ink,
                  margin: "0 0 4px",
                  fontFamily: "Georgia, serif",
                }}
              >
                {stat.n}
              </p>
              <p style={{ fontSize: 12, color: T.inkMuted, margin: 0, letterSpacing: "0.02em" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Work grid ────────────────────────────────────────────────────────────────

const PROJECTS = [
  {
    title: "Arkwright Banking",
    category: "Product Design",
    year: "2024",
    tags: ["Fintech", "Mobile"],
    color: "#0f1c2e",
    accent: "#4d8cf5",
  },
  {
    title: "Luminary AI",
    category: "Brand & Web",
    year: "2024",
    tags: ["SaaS", "Web"],
    color: "#1a0a2e",
    accent: "#a78bfa",
  },
  {
    title: "Cascade Design System",
    category: "Design Systems",
    year: "2023",
    tags: ["Design System", "Components"],
    color: "#0a1f0f",
    accent: "#10b981",
  },
  {
    title: "Oak & Stone Collective",
    category: "E-commerce",
    year: "2023",
    tags: ["E-commerce", "Brand"],
    color: "#1f1508",
    accent: "#c97b3b",
  },
];

function WorkGrid() {
  const [filter, setFilter] = React.useState("All");
  const filters = ["All", "Product Design", "Brand & Web", "Design Systems", "E-commerce"];

  const shown = filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.category === filter);

  return (
    <section style={{ padding: "100px 40px", background: T.bgWhite }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <FadeUp>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 48,
            }}
          >
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: T.ink,
                fontFamily: "Georgia, serif",
                margin: 0,
              }}
            >
              Selected work
            </h2>

            {/* Filter pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "5px 12px",
                    borderRadius: 100,
                    border: `1px solid ${filter === f ? T.ink : T.border}`,
                    background: filter === f ? T.ink : "transparent",
                    color: filter === f ? "#fff" : T.inkMuted,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    letterSpacing: "0.01em",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </FadeUp>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 24,
          }}
        >
          {shown.map((project, i) => (
            <FadeUp key={project.title} delay={i * 0.06}>
              <div
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  border: `1px solid ${T.border}`,
                  background: T.bgCard,
                  cursor: "pointer",
                  transition: "transform 0.3s, box-shadow 0.3s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 20px 40px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                {/* Project preview */}
                <div
                  style={{
                    height: 260,
                    background: project.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Abstract preview pattern */}
                  <div
                    style={{
                      width: 160,
                      height: 120,
                      borderRadius: 12,
                      border: `1px solid ${project.accent}30`,
                      background: `${project.accent}10`,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: 8,
                        background: `${project.accent}40`,
                        margin: "12px 12px 8px",
                        borderRadius: 2,
                      }}
                    />
                    <div
                      style={{
                        height: 5,
                        background: `${project.accent}25`,
                        margin: "0 12px 6px",
                        borderRadius: 2,
                        width: "70%",
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        margin: "0 12px 12px",
                        borderRadius: 6,
                        background: `${project.accent}20`,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 16,
                      right: 16,
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: `${project.accent}20`,
                      border: `1px solid ${project.accent}30`,
                    }}
                  >
                    <span
                      style={{ fontSize: 11, fontWeight: 500, color: project.accent, fontFamily: "monospace" }}
                    >
                      {project.year}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: "20px 24px 24px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: T.inkMuted,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      {project.category}
                    </p>
                    <div style={{ display: "flex", gap: 6 }}>
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 11,
                            color: T.inkMuted,
                            padding: "2px 7px",
                            borderRadius: 100,
                            border: `1px solid ${T.border}`,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: "-0.022em",
                      color: T.ink,
                      fontFamily: "Georgia, serif",
                      margin: 0,
                    }}
                  >
                    {project.title}
                  </h3>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── About ────────────────────────────────────────────────────────────────────

function About() {
  return (
    <section
      style={{
        padding: "100px 40px",
        background: T.bgCream,
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 80,
          alignItems: "center",
        }}
      >
        <FadeUp>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              fontWeight: 500,
              color: T.inkMuted,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            About
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 3.5vw, 44px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: T.ink,
              fontFamily: "Georgia, serif",
              margin: "0 0 24px",
            }}
          >
            Design as a way of{" "}
            <em style={{ fontStyle: "italic", color: T.accentWarm }}>thinking</em>.
          </h2>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.75,
              color: T.inkLight,
              marginBottom: 16,
            }}
          >
            I started my career in visual design, but quickly fell in love with the intersection of
            product strategy and user experience. Today, I work primarily with early-stage startups
            going through their first serious design investment.
          </p>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.75,
              color: T.inkLight,
              marginBottom: 32,
            }}
          >
            When I'm not pushing pixels, I write about design systems, run workshops on design
            thinking, and occasionally speak at conferences.
          </p>
          <a
            href="#"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: T.ink,
              textDecoration: "none",
              borderBottom: `1px solid ${T.ink}`,
              paddingBottom: 2,
            }}
          >
            Read more about my process →
          </a>
        </FadeUp>

        <FadeUp delay={0.1}>
          {/* Portrait placeholder */}
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              background: `linear-gradient(160deg, #e8e0d4 0%, #d4c9ba 100%)`,
              aspectRatio: "3/4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 36 }}>👤</span>
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 24,
                left: 24,
                right: 24,
                padding: "12px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(10px)",
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: T.ink,
                  margin: "0 0 2px",
                  letterSpacing: "-0.01em",
                }}
              >
                Jordan Harlow
              </p>
              <p style={{ fontSize: 12, color: T.inkMuted, margin: 0 }}>
                Based in London, UK
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Services ─────────────────────────────────────────────────────────────────

function Services() {
  const services = [
    {
      icon: "✦",
      title: "Product Design",
      desc: "End-to-end UX/UI design for web and mobile. From discovery workshops to polished high-fidelity prototypes.",
    },
    {
      icon: "◈",
      title: "Design Systems",
      desc: "Scalable component libraries and token architectures. I help teams build systems that grow with the product.",
    },
    {
      icon: "◉",
      title: "Brand Identity",
      desc: "Visual identities that stand out. Logos, typography systems, color palettes, and brand guidelines.",
    },
    {
      icon: "⊕",
      title: "Design Audits",
      desc: "A thorough review of your existing product with actionable improvements ranked by impact and effort.",
    },
  ];

  return (
    <section
      style={{
        padding: "100px 40px",
        background: T.bgWhite,
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <FadeUp>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 56,
            }}
          >
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: T.ink,
                fontFamily: "Georgia, serif",
                margin: 0,
              }}
            >
              What I do
            </h2>
            <p style={{ fontSize: 14, color: T.inkMuted, margin: 0, maxWidth: 280, textAlign: "right" }}>
              Available for new projects from Q2 2025
            </p>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, border: `1px solid ${T.border}` }}>
          {services.map((s, i) => (
            <FadeUp key={s.title} delay={i * 0.05}>
              <div
                style={{
                  padding: 36,
                  borderRight: i % 2 === 0 ? `1px solid ${T.border}` : "none",
                  borderBottom: i < 2 ? `1px solid ${T.border}` : "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background = T.bgCream)
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background = "transparent")
                }
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                    fontSize: 18,
                    color: T.accentWarm,
                  }}
                >
                  {s.icon}
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "-0.018em",
                    color: T.ink,
                    fontFamily: "Georgia, serif",
                    margin: "0 0 10px",
                  }}
                >
                  {s.title}
                </h3>
                <p style={{ fontSize: 14, color: T.inkLight, lineHeight: 1.65, margin: 0 }}>
                  {s.desc}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact ──────────────────────────────────────────────────────────────────

function Contact() {
  return (
    <section
      style={{
        padding: "100px 40px",
        background: T.ink,
        color: "#f8f5f0",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <FadeUp>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 80,
              alignItems: "start",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  fontWeight: 500,
                  color: "rgba(248,245,240,0.4)",
                  textTransform: "uppercase",
                  marginBottom: 20,
                }}
              >
                Get in touch
              </p>
              <h2
                style={{
                  fontSize: "clamp(32px, 4vw, 52px)",
                  fontWeight: 700,
                  letterSpacing: "-0.034em",
                  lineHeight: 1.08,
                  color: "#f8f5f0",
                  fontFamily: "Georgia, serif",
                  margin: "0 0 24px",
                }}
              >
                Let's build something{" "}
                <em style={{ fontStyle: "italic", color: T.accentWarm }}>great</em> together.
              </h2>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "rgba(248,245,240,0.6)",
                  marginBottom: 36,
                }}
              >
                I'm currently open to freelance projects and full-time roles. Tell me about your
                project and let's talk.
              </p>
              <a
                href="mailto:hello@jharlow.design"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: T.accentWarm,
                  textDecoration: "none",
                  borderBottom: `1px solid ${T.accentWarm}`,
                  paddingBottom: 2,
                }}
              >
                hello@jharlow.design
              </a>
            </div>

            {/* Simple form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Name", placeholder: "Your full name" },
                { label: "Email", placeholder: "your@email.com" },
                { label: "Budget", placeholder: "Approximate project budget" },
              ].map((field) => (
                <div key={field.label}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      color: "rgba(248,245,240,0.45)",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    {field.label}
                  </label>
                  <input
                    placeholder={field.placeholder}
                    style={{
                      width: "100%",
                      height: 44,
                      borderRadius: 8,
                      border: "1px solid rgba(248,245,240,0.12)",
                      background: "rgba(248,245,240,0.06)",
                      color: "#f8f5f0",
                      fontSize: 14,
                      padding: "0 14px",
                      outline: "none",
                      transition: "border-color 0.15s",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    color: "rgba(248,245,240,0.45)",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell me about your project..."
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: "1px solid rgba(248,245,240,0.12)",
                    background: "rgba(248,245,240,0.06)",
                    color: "#f8f5f0",
                    fontSize: 14,
                    padding: "12px 14px",
                    outline: "none",
                    resize: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                style={{
                  height: 48,
                  borderRadius: 8,
                  background: T.accentWarm,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "-0.01em",
                }}
              >
                Send message →
              </button>
            </div>
          </div>
        </FadeUp>

        {/* Footer bar */}
        <div
          style={{
            marginTop: 80,
            paddingTop: 32,
            borderTop: "1px solid rgba(248,245,240,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{ fontSize: 14, fontWeight: 700, fontFamily: "Georgia, serif", color: "#f8f5f0" }}
          >
            J. Harlow
          </span>
          <div style={{ display: "flex", gap: 24 }}>
            {["Twitter", "LinkedIn", "Dribbble", "Instagram"].map((s) => (
              <a
                key={s}
                href="#"
                style={{ fontSize: 13, color: "rgba(248,245,240,0.4)", textDecoration: "none" }}
              >
                {s}
              </a>
            ))}
          </div>
          <span style={{ fontSize: 12, color: "rgba(248,245,240,0.3)" }}>
            © {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function Portfolio() {
  return (
    <div
      style={{
        fontFamily:
          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: T.bgCream,
        color: T.ink,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <Nav />
      <Hero />
      <WorkGrid />
      <About />
      <Services />
      <Contact />
    </div>
  );
}

export { Nav, Hero, WorkGrid, About, Services, Contact };
