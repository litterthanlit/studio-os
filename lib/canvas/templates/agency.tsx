"use client";

/**
 * Agency Template
 *
 * Bold, editorial — high-contrast black + electric yellow.
 * Oversized display type, asymmetric layouts, aggressive whitespace.
 * Inspired by top creative agencies: Wolff Olins, Pentagram, Collins.
 *
 * Sections:
 *   1. Nav
 *   2. Hero (full-viewport, bold headline)
 *   3. Services
 *   4. Case studies
 *   5. Process
 *   6. Team
 *   7. Contact + Footer
 */

import * as React from "react";
import { motion, useInView } from "framer-motion";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  black: "#0a0a0a",
  white: "#f4f4f0",
  yellow: "#ffe033",
  yellowDim: "#e6ca2d",
  gray: "#8a8a84",
  grayLight: "#c8c8c0",
  border: "rgba(244,244,240,0.1)",
  borderLight: "rgba(10,10,10,0.1)",
  card: "#111111",
} as const;

const ease = [0.19, 1, 0.22, 1] as const;

function FadeUp({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease }}
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
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        mixBlendMode: "difference",
      }}
    >
      <div
        style={{
          maxWidth: "100%",
          padding: "0 40px",
          height: 64,
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: T.white,
            marginRight: "auto",
            textTransform: "uppercase",
          }}
        >
          Forma Studio
        </span>
        <nav style={{ display: "flex", gap: 36 }}>
          {["Work", "Services", "About", "Journal"].map((l) => (
            <a
              key={l}
              href="#"
              style={{
                fontSize: 13,
                color: T.white,
                textDecoration: "none",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {l}
            </a>
          ))}
        </nav>
        <button
          style={{
            marginLeft: 48,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: T.black,
            background: T.yellow,
            border: "none",
            padding: "10px 20px",
            cursor: "pointer",
            borderRadius: 2,
          }}
        >
          Start a project
        </button>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      style={{
        minHeight: "100vh",
        background: T.black,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "0 40px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative background text */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: -20,
          transform: "translateY(-50%)",
          fontSize: "clamp(140px, 22vw, 280px)",
          fontWeight: 900,
          letterSpacing: "-0.06em",
          color: "rgba(255,255,255,0.025)",
          lineHeight: 0.9,
          userSelect: "none",
          whiteSpace: "nowrap",
          fontFamily: "system-ui, sans-serif",
          pointerEvents: "none",
        }}
      >
        FORMA
      </div>

      {/* Yellow accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, ease }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: T.yellow,
          transformOrigin: "left",
        }}
      />

      <div style={{ maxWidth: 1200, position: "relative" }}>
        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            fontSize: 13,
            letterSpacing: "0.16em",
            fontWeight: 600,
            color: T.yellow,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Creative Agency — Est. 2018
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease }}
          style={{
            fontSize: "clamp(56px, 10vw, 140px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 0.92,
            color: T.white,
            margin: "0 0 40px",
            maxWidth: 1100,
          }}
        >
          We make brands
          <br />
          <span style={{ color: T.yellow }}>impossible</span>
          <br />
          to ignore.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
          }}
        >
          <p style={{ fontSize: 16, color: T.grayLight, lineHeight: 1.65, maxWidth: 400 }}>
            Strategy, branding, and digital design for companies that want to lead their category.
          </p>
          <a
            href="#"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              fontSize: 14,
              fontWeight: 700,
              color: T.yellow,
              textDecoration: "none",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            View our work
            <span style={{ fontSize: 20 }}>↗</span>
          </a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease }}
          style={{
            display: "flex",
            gap: 0,
            marginTop: 72,
            borderTop: `1px solid ${T.border}`,
            paddingTop: 32,
          }}
        >
          {[
            { n: "120+", label: "Brands built" },
            { n: "14", label: "Years combined" },
            { n: "$2B+", label: "Client value" },
            { n: "3×", label: "D&AD Pencils" },
          ].map((stat, i) => (
            <div
              key={stat.n}
              style={{
                flex: 1,
                paddingRight: 32,
                borderRight: i < 3 ? `1px solid ${T.border}` : "none",
                paddingLeft: i > 0 ? 32 : 0,
              }}
            >
              <p
                style={{
                  fontSize: 40,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  color: T.white,
                  margin: "0 0 4px",
                }}
              >
                {stat.n}
              </p>
              <p style={{ fontSize: 11, color: T.gray, margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Services ─────────────────────────────────────────────────────────────────

function Services() {
  const services = [
    {
      n: "01",
      title: "Brand Strategy",
      desc: "Positioning, naming, messaging architecture, competitive differentiation. We help you find and own a space in the market.",
    },
    {
      n: "02",
      title: "Visual Identity",
      desc: "Logos, type, color, motion. Brand systems built for every touchpoint, from business cards to billboard campaigns.",
    },
    {
      n: "03",
      title: "Digital Design",
      desc: "Websites, web apps, and digital experiences. Pixel-perfect execution with real attention to interaction design.",
    },
    {
      n: "04",
      title: "Content & Campaign",
      desc: "Art direction, photography, video. Creative that earns attention and drives action across paid and organic channels.",
    },
  ];

  return (
    <section style={{ padding: "120px 40px", background: T.white }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeUp>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 80,
            }}
          >
            <h2
              style={{
                fontSize: "clamp(40px, 6vw, 80px)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 0.95,
                color: T.black,
                margin: 0,
              }}
            >
              What we
              <br />
              do best.
            </h2>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: T.gray,
                maxWidth: 320,
                margin: "8px 0 0",
                alignSelf: "flex-end",
              }}
            >
              Four core practices, deeply integrated. We work as a single team across all of them.
            </p>
          </div>
        </FadeUp>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {services.map((s, i) => (
            <FadeUp key={s.n} delay={i * 0.05}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 1fr auto",
                  gap: 32,
                  alignItems: "center",
                  padding: "36px 0",
                  borderBottom: `1px solid ${T.borderLight}`,
                  cursor: "pointer",
                  transition: "padding-left 0.3s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.paddingLeft = "20px")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.paddingLeft = "0")
                }
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.yellow,
                    letterSpacing: "0.1em",
                    fontFamily: "monospace",
                  }}
                >
                  {s.n}
                </span>
                <h3
                  style={{
                    fontSize: "clamp(20px, 2.5vw, 32px)",
                    fontWeight: 800,
                    letterSpacing: "-0.025em",
                    color: T.black,
                    margin: 0,
                  }}
                >
                  {s.title}
                </h3>
                <p style={{ fontSize: 14, color: T.gray, lineHeight: 1.65, margin: 0 }}>
                  {s.desc}
                </p>
                <span style={{ fontSize: 24, color: T.grayLight }}>→</span>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Case studies ─────────────────────────────────────────────────────────────

function CaseStudies() {
  const cases = [
    {
      title: "Raven Finance",
      category: "Brand Identity + Web",
      year: "2024",
      bg: "#0a0a0a",
      accent: T.yellow,
      wide: true,
    },
    {
      title: "Meridian Health",
      category: "Campaign + Digital",
      year: "2024",
      bg: "#0f1f3d",
      accent: "#4d8cf5",
      wide: false,
    },
    {
      title: "Nomad Supply",
      category: "Brand Strategy + Identity",
      year: "2023",
      bg: "#1a0f00",
      accent: "#c97b3b",
      wide: false,
    },
    {
      title: "Chorus Platform",
      category: "Product Design",
      year: "2023",
      bg: "#120a2e",
      accent: "#a78bfa",
      wide: true,
    },
  ];

  return (
    <section style={{ padding: "120px 40px", background: T.black }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 60 }}>
            <h2
              style={{
                fontSize: "clamp(40px, 6vw, 80px)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 0.95,
                color: T.white,
                margin: 0,
              }}
            >
              Selected
              <br />
              <span style={{ color: T.yellow }}>work.</span>
            </h2>
            <a
              href="#"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: T.grayLight,
                textDecoration: "none",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                borderBottom: `1px solid ${T.border}`,
                paddingBottom: 3,
              }}
            >
              View all projects →
            </a>
          </div>
        </FadeUp>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {cases.map((c, i) => (
            <FadeUp key={c.title} delay={i * 0.06}>
              <div
                style={{
                  gridColumn: c.wide ? "span 2" : "span 1",
                  borderRadius: 4,
                  overflow: "hidden",
                  cursor: "pointer",
                  position: "relative",
                  aspectRatio: c.wide ? "2/1.1" : "1/1.1",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1.01)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: c.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Abstract project visual */}
                  <div
                    style={{
                      width: c.wide ? 220 : 120,
                      height: c.wide ? 140 : 120,
                      borderRadius: 8,
                      border: `2px solid ${c.accent}40`,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: -20,
                        left: -20,
                        width: 60,
                        height: 60,
                        borderRadius: "50%",
                        background: `${c.accent}20`,
                        border: `1px solid ${c.accent}30`,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 12,
                        left: 12,
                        right: 12,
                        height: 3,
                        borderRadius: 2,
                        background: c.accent,
                      }}
                    />
                  </div>
                </div>

                {/* Overlay on hover */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "40px 24px 24px",
                    background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: c.accent,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      margin: "0 0 6px",
                    }}
                  >
                    {c.category} · {c.year}
                  </p>
                  <h3
                    style={{
                      fontSize: c.wide ? 28 : 22,
                      fontWeight: 800,
                      letterSpacing: "-0.025em",
                      color: T.white,
                      margin: 0,
                    }}
                  >
                    {c.title}
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

// ─── Process ──────────────────────────────────────────────────────────────────

function Process() {
  const steps = [
    {
      phase: "Discover",
      n: "01",
      desc: "Stakeholder interviews, market research, and competitive audits. We don't skip this part.",
    },
    {
      phase: "Define",
      n: "02",
      desc: "Strategy documents, creative brief, success metrics. Everyone aligned before a single pixel is drawn.",
    },
    {
      phase: "Design",
      n: "03",
      desc: "Concepts, iteration, refinement. Rapid cycles with weekly check-ins and transparent feedback loops.",
    },
    {
      phase: "Deliver",
      n: "04",
      desc: "Final assets, brand guidelines, handoff documentation. And we're there post-launch if you need us.",
    },
  ];

  return (
    <section style={{ padding: "120px 40px", background: T.white }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeUp>
          <h2
            style={{
              fontSize: "clamp(40px, 6vw, 80px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              color: T.black,
              margin: "0 0 80px",
            }}
          >
            How we work.
          </h2>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40 }}>
          {steps.map((step, i) => (
            <FadeUp key={step.n} delay={i * 0.07}>
              <div>
                <div
                  style={{
                    height: 3,
                    background: i === 0 ? T.yellow : T.borderLight,
                    marginBottom: 28,
                    borderRadius: 2,
                  }}
                />
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.gray,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    margin: "0 0 8px",
                    fontFamily: "monospace",
                  }}
                >
                  {step.n}
                </p>
                <h3
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    letterSpacing: "-0.025em",
                    color: T.black,
                    margin: "0 0 12px",
                  }}
                >
                  {step.phase}
                </h3>
                <p style={{ fontSize: 14, color: T.gray, lineHeight: 1.65, margin: 0 }}>
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

// ─── Team ─────────────────────────────────────────────────────────────────────

function Team() {
  const team = [
    { name: "Alex Forma", role: "Creative Director", bg: "#1a1a1a" },
    { name: "Mia Sato", role: "Brand Strategist", bg: "#0f1f3d" },
    { name: "Kai Adeyemi", role: "Design Lead", bg: "#1a0f00" },
    { name: "Remi Walsh", role: "Digital Director", bg: "#120a2e" },
  ];

  return (
    <section style={{ padding: "120px 40px", background: T.black }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeUp>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 60,
            }}
          >
            <h2
              style={{
                fontSize: "clamp(40px, 5vw, 72px)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 0.95,
                color: T.white,
                margin: 0,
              }}
            >
              The people
              <br />
              <span style={{ color: T.yellow }}>behind the work.</span>
            </h2>
            <p style={{ fontSize: 15, color: T.gray, maxWidth: 300, margin: 0 }}>
              A small, senior team. Everyone you meet works on your project.
            </p>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {team.map((member, i) => (
            <FadeUp key={member.name} delay={i * 0.06}>
              <div>
                <div
                  style={{
                    aspectRatio: "3/4",
                    borderRadius: 4,
                    background: member.bg,
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: 28 }}>👤</span>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: T.yellow,
                    }}
                  />
                </div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: T.white,
                    margin: "0 0 4px",
                  }}
                >
                  {member.name}
                </h3>
                <p style={{ fontSize: 13, color: T.gray, margin: 0, letterSpacing: "0.02em" }}>
                  {member.role}
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

function ContactFooter() {
  return (
    <section style={{ background: T.yellow, padding: "120px 40px 80px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <FadeUp>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(10,10,10,0.5)",
              marginBottom: 20,
            }}
          >
            Start a project
          </p>
          <h2
            style={{
              fontSize: "clamp(56px, 10vw, 130px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 0.92,
              color: T.black,
              margin: "0 0 60px",
            }}
          >
            Let&rsquo;s make
            <br />
            something
            <br />
            great.
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <a
              href="mailto:hello@formastudio.co"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontSize: 20,
                fontWeight: 800,
                color: T.black,
                textDecoration: "none",
                letterSpacing: "-0.01em",
              }}
            >
              hello@formastudio.co
              <span style={{ fontSize: 24 }}>↗</span>
            </a>
          </div>

          <div
            style={{
              marginTop: 80,
              paddingTop: 32,
              borderTop: "2px solid rgba(10,10,10,0.15)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em", color: T.black }}
            >
              FORMA STUDIO
            </span>
            <div style={{ display: "flex", gap: 24 }}>
              {["Instagram", "Twitter", "LinkedIn", "Dribbble"].map((s) => (
                <a
                  key={s}
                  href="#"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "rgba(10,10,10,0.5)",
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {s}
                </a>
              ))}
            </div>
            <span style={{ fontSize: 12, color: "rgba(10,10,10,0.4)" }}>
              © {new Date().getFullYear()} Forma Studio
            </span>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function Agency() {
  return (
    <div
      style={{
        fontFamily:
          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: T.black,
        color: T.white,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <Nav />
      <Hero />
      <Services />
      <CaseStudies />
      <Process />
      <Team />
      <ContactFooter />
    </div>
  );
}

export { Nav, Hero, Services, CaseStudies, Process, Team, ContactFooter };
