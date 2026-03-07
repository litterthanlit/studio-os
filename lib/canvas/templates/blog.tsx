"use client";

/**
 * Blog Template
 *
 * Editorial, warm, reader-focused. Inspired by Substack Pro / The Generalist.
 * Serif display type, cream base, generous line-height, clean reading experience.
 *
 * Sections:
 *   1. Nav
 *   2. Featured post hero
 *   3. Post grid
 *   4. Categories / Topics sidebar layout
 *   5. Newsletter CTA
 *   6. Footer
 */

import * as React from "react";
import { motion, useInView } from "framer-motion";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bgCream: "#f9f6f1",
  bgWhite: "#fffefb",
  bgCard: "#ffffff",
  ink: "#1a1813",
  inkLight: "#3d3a33",
  inkMuted: "#8a8578",
  inkFaint: "#c0bbb0",
  accent: "#c44b2b", // editorial red
  accentLight: "rgba(196,75,43,0.08)",
  border: "rgba(0,0,0,0.07)",
  borderMid: "rgba(0,0,0,0.11)",
  tagBg: "rgba(0,0,0,0.05)",
} as const;

const ease = [0.19, 1, 0.22, 1] as const;

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────

function Tag({ children, accent }: { children: string; accent?: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: accent ? T.accent : T.inkMuted,
        padding: "3px 8px",
        borderRadius: 3,
        background: accent ? T.accentLight : T.tagBg,
        border: `1px solid ${accent ? "rgba(196,75,43,0.2)" : T.border}`,
      }}
    >
      {children}
    </span>
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
        background: "rgba(249,246,241,0.92)",
        backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "0 40px",
          height: 60,
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <div style={{ marginRight: "auto" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: T.ink,
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            The Dispatch
          </span>
        </div>

        {/* Categories */}
        <nav style={{ display: "flex", gap: 4 }}>
          {["Design", "Engineering", "Product", "Business", "Culture"].map((l) => (
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
                (e.target as HTMLElement).style.color = T.ink;
                (e.target as HTMLElement).style.background = T.border;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = T.inkMuted;
                (e.target as HTMLElement).style.background = "transparent";
              }}
            >
              {l}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", gap: 12, marginLeft: 24 }}>
          <a
            href="#"
            style={{
              fontSize: 13,
              color: T.inkMuted,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Sign in
          </a>
          <button
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              background: T.accent,
              border: "none",
              borderRadius: 5,
              padding: "6px 14px",
              cursor: "pointer",
              letterSpacing: "-0.01em",
            }}
          >
            Subscribe free
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Featured post ────────────────────────────────────────────────────────────

function FeaturedPost() {
  return (
    <section
      style={{
        borderBottom: `1px solid ${T.border}`,
        background: T.bgCream,
        padding: "0 0 0",
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "0 40px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          minHeight: 540,
        }}
      >
        {/* Left text */}
        <div
          style={{
            padding: "72px 60px 72px 0",
            borderRight: `1px solid ${T.border}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}
          >
            <Tag accent>Featured</Tag>
            <Tag>Design Systems</Tag>
            <span style={{ fontSize: 12, color: T.inkFaint }}>March 7, 2026</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.06, ease }}
            style={{
              fontSize: "clamp(28px, 3.5vw, 44px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: T.ink,
              fontFamily: "Georgia, 'Times New Roman', serif",
              margin: "0 0 16px",
            }}
          >
            Why the best design systems feel invisible — and how to build one that does
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease }}
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: T.inkLight,
              margin: "0 0 28px",
            }}
          >
            A great design system doesn&rsquo;t announce itself. It just makes everything feel right. Here&rsquo;s
            what separates systems that get adopted from ones that gather dust.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
            style={{ display: "flex", alignItems: "center", gap: 14 }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #d8cfc2, #b8b0a4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              👤
            </div>
            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.ink,
                  margin: "0 0 1px",
                }}
              >
                Priya Mehta
              </p>
              <p style={{ fontSize: 12, color: T.inkMuted, margin: 0 }}>
                Senior Editor · 8 min read
              </p>
            </div>
            <a
              href="#"
              style={{
                marginLeft: "auto",
                fontSize: 13,
                fontWeight: 600,
                color: T.accent,
                textDecoration: "none",
                borderBottom: `1px solid ${T.accent}`,
                paddingBottom: 1,
              }}
            >
              Read story →
            </a>
          </motion.div>
        </div>

        {/* Right image */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.1 }}
          style={{
            background: "linear-gradient(140deg, #e8e0d4 0%, #d4c8b8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Abstract illustration */}
          <div style={{ position: "relative", width: 220, height: 260 }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 160,
                height: 200,
                borderRadius: 12,
                background: "rgba(255,255,255,0.4)",
                border: "1px solid rgba(255,255,255,0.5)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 100,
                height: 100,
                borderRadius: 50,
                background: `${T.accent}20`,
                border: `1px solid ${T.accent}30`,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 20,
                left: 10,
                width: 60,
                height: 6,
                borderRadius: 3,
                background: T.accent,
                opacity: 0.6,
              }}
            />
          </div>
          {/* Category label */}
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              padding: "5px 10px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(6px)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: T.ink, letterSpacing: "0.04em" }}>
              DESIGN SYSTEMS
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Posts data ───────────────────────────────────────────────────────────────

const POSTS = [
  {
    title: "The quiet revolution in design tooling",
    excerpt:
      "How a new generation of tools is changing the relationship between design and code — and what it means for teams.",
    author: "Marcus Chen",
    date: "Mar 5, 2026",
    readTime: "6 min",
    category: "Engineering",
    bg: "#1a1f2e",
  },
  {
    title: "What Stripe's design team gets right",
    excerpt:
      "Inside the principles that make Stripe's product consistently feel like the gold standard of fintech design.",
    author: "Layla Park",
    date: "Mar 3, 2026",
    readTime: "10 min",
    category: "Product",
    bg: "#0f1f3d",
  },
  {
    title: "Typography decisions that signal quality",
    excerpt:
      "The specific typeface and spacing choices that separate enterprise software from consumer-grade craft.",
    author: "Tom Weston",
    date: "Feb 28, 2026",
    readTime: "5 min",
    category: "Design",
    bg: "#1f0f08",
  },
  {
    title: "Building a design culture from scratch",
    excerpt:
      "Lessons from three years of building a design-first organization at a company that started engineering-led.",
    author: "Ana Sousa",
    date: "Feb 25, 2026",
    readTime: "12 min",
    category: "Culture",
    bg: "#0a1f0f",
  },
  {
    title: "The cost of bad information architecture",
    excerpt:
      "A post-mortem on a redesign that failed — and the IA decisions that made it unavoidable.",
    author: "Priya Mehta",
    date: "Feb 20, 2026",
    readTime: "7 min",
    category: "Product",
    bg: "#1a0a2e",
  },
  {
    title: "Color in the age of dark mode",
    excerpt:
      "Why designing for dark mode isn't just inverting your palette — and the systematic approach that actually works.",
    author: "Marcus Chen",
    date: "Feb 15, 2026",
    readTime: "8 min",
    category: "Design",
    bg: "#141414",
  },
];

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  large,
}: {
  post: (typeof POSTS)[0];
  large?: boolean;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      style={{
        cursor: "pointer",
        transition: "transform 0.2s",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div
        style={{
          height: large ? 260 : 180,
          borderRadius: 10,
          background: post.bg,
          marginBottom: 16,
          overflow: "hidden",
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
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
          }}
        >
          <Tag accent={post.category === "Design"}>{post.category}</Tag>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: T.inkFaint }}>{post.date}</span>
        <span style={{ fontSize: 11, color: T.inkFaint }}>·</span>
        <span style={{ fontSize: 11, color: T.inkFaint }}>{post.readTime} read</span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: large ? 22 : 17,
          fontWeight: 700,
          letterSpacing: "-0.022em",
          lineHeight: 1.25,
          color: T.ink,
          fontFamily: "Georgia, 'Times New Roman', serif",
          margin: "0 0 8px",
          transition: "color 0.15s",
          ...(hovered ? { color: T.accent } : {}),
        }}
      >
        {post.title}
      </h3>

      <p style={{ fontSize: 13, color: T.inkMuted, lineHeight: 1.65, margin: "0 0 12px" }}>
        {post.excerpt}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #d8cfc2, #b8b0a4)",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          👤
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: T.inkLight }}>{post.author}</span>
      </div>
    </div>
  );
}

// ─── Post grid + sidebar ──────────────────────────────────────────────────────

function PostGrid() {
  return (
    <section style={{ padding: "72px 40px", background: T.bgWhite }}>
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 64,
        }}
      >
        {/* Posts */}
        <div>
          <FadeUp>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 40,
              }}
            >
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  color: T.ink,
                  fontFamily: "Georgia, serif",
                  margin: 0,
                }}
              >
                Latest stories
              </h2>
              <a
                href="#"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.accent,
                  textDecoration: "none",
                  borderBottom: `1px solid ${T.accent}`,
                  paddingBottom: 1,
                }}
              >
                All stories →
              </a>
            </div>
          </FadeUp>

          {/* 2-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
            {POSTS.map((post, i) => (
              <FadeUp key={post.title} delay={i * 0.05}>
                <PostCard post={post} large={i === 0} />
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.1}>
            <div style={{ textAlign: "center", marginTop: 48 }}>
              <button
                style={{
                  height: 44,
                  padding: "0 28px",
                  borderRadius: 6,
                  border: `1px solid ${T.borderMid}`,
                  background: "transparent",
                  color: T.inkLight,
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Load more stories
              </button>
            </div>
          </FadeUp>
        </div>

        {/* Sidebar */}
        <aside>
          <FadeUp delay={0.1}>
            {/* Newsletter mini */}
            <div
              style={{
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: T.bgCream,
                padding: 24,
                marginBottom: 32,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.accent,
                  margin: "0 0 8px",
                }}
              >
                Newsletter
              </p>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: "-0.018em",
                  color: T.ink,
                  fontFamily: "Georgia, serif",
                  margin: "0 0 8px",
                }}
              >
                Get the best stories in your inbox
              </h3>
              <p style={{ fontSize: 13, color: T.inkMuted, lineHeight: 1.55, marginBottom: 16 }}>
                Every Friday, the 5 most important ideas in design and product.
              </p>
              <input
                placeholder="your@email.com"
                style={{
                  display: "block",
                  width: "100%",
                  height: 40,
                  borderRadius: 6,
                  border: `1px solid ${T.borderMid}`,
                  background: T.bgCard,
                  padding: "0 12px",
                  fontSize: 13,
                  color: T.ink,
                  outline: "none",
                  marginBottom: 8,
                  boxSizing: "border-box",
                }}
              />
              <button
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 6,
                  background: T.accent,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Subscribe free →
              </button>
              <p style={{ fontSize: 11, color: T.inkFaint, marginTop: 8, textAlign: "center" }}>
                No spam. Unsubscribe anytime.
              </p>
            </div>

            {/* Popular tags */}
            <div style={{ marginBottom: 32 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.inkFaint,
                  margin: "0 0 12px",
                }}
              >
                Topics
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[
                  "Design Systems",
                  "Typography",
                  "Product Strategy",
                  "Engineering",
                  "Color Theory",
                  "Leadership",
                  "Culture",
                  "UX Research",
                ].map((tag) => (
                  <button
                    key={tag}
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: T.inkMuted,
                      padding: "4px 10px",
                      borderRadius: 100,
                      border: `1px solid ${T.border}`,
                      background: "transparent",
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background = T.accentLight;
                      (e.target as HTMLElement).style.color = T.accent;
                      (e.target as HTMLElement).style.borderColor = "rgba(196,75,43,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background = "transparent";
                      (e.target as HTMLElement).style.color = T.inkMuted;
                      (e.target as HTMLElement).style.borderColor = T.border;
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Popular posts */}
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.inkFaint,
                  margin: "0 0 16px",
                }}
              >
                Most read
              </p>
              {POSTS.slice(0, 4).map((post, i) => (
                <div
                  key={post.title}
                  style={{
                    display: "flex",
                    gap: 12,
                    paddingBottom: 14,
                    marginBottom: 14,
                    borderBottom: i < 3 ? `1px solid ${T.border}` : "none",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: T.inkFaint,
                      fontFamily: "Georgia, serif",
                      lineHeight: 1,
                      flexShrink: 0,
                      width: 24,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.ink,
                        fontFamily: "Georgia, serif",
                        letterSpacing: "-0.01em",
                        lineHeight: 1.35,
                        margin: "0 0 3px",
                      }}
                    >
                      {post.title}
                    </p>
                    <p style={{ fontSize: 11, color: T.inkFaint, margin: 0 }}>
                      {post.readTime} read
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>
        </aside>
      </div>
    </section>
  );
}

// ─── Newsletter CTA ───────────────────────────────────────────────────────────

function NewsletterCTA() {
  return (
    <section
      style={{
        padding: "80px 40px",
        background: T.ink,
        color: T.bgCream,
        borderTop: `1px solid ${T.borderMid}`,
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <FadeUp>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              fontWeight: 600,
              color: T.accent,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Weekly dispatch
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: T.bgCream,
              fontFamily: "Georgia, serif",
              margin: "0 0 16px",
            }}
          >
            Ideas worth reading.
            <br />
            In your inbox, every Friday.
          </h2>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: "rgba(249,246,241,0.55)",
              margin: "0 0 36px",
            }}
          >
            Join 28,000 designers, engineers, and product people who read The Dispatch each week.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="your@email.com"
              style={{
                flex: 1,
                height: 52,
                borderRadius: 8,
                border: "1px solid rgba(249,246,241,0.12)",
                background: "rgba(249,246,241,0.06)",
                padding: "0 16px",
                fontSize: 15,
                color: T.bgCream,
                outline: "none",
              }}
            />
            <button
              style={{
                height: 52,
                padding: "0 24px",
                borderRadius: 8,
                background: T.accent,
                color: "#fff",
                fontWeight: 600,
                fontSize: 15,
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Subscribe free
            </button>
          </div>
          <p style={{ fontSize: 12, color: "rgba(249,246,241,0.3)", marginTop: 12 }}>
            Free forever. No spam. Unsubscribe in one click.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      style={{
        background: T.bgCream,
        borderTop: `1px solid ${T.border}`,
        padding: "48px 40px 32px",
      }}
    >
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
            gap: 48,
            marginBottom: 48,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: T.ink,
                fontFamily: "Georgia, serif",
                letterSpacing: "-0.025em",
                display: "block",
                marginBottom: 12,
              }}
            >
              The Dispatch
            </span>
            <p style={{ fontSize: 13, color: T.inkMuted, lineHeight: 1.65, maxWidth: 220 }}>
              Independent editorial covering design, engineering, and product craft.
            </p>
          </div>

          {[
            { heading: "Topics", links: ["Design", "Engineering", "Product", "Business"] },
            { heading: "Company", links: ["About", "Writers", "Advertise", "Careers"] },
            { heading: "Account", links: ["Sign in", "Subscribe", "Archive", "RSS"] },
          ].map((col) => (
            <div key={col.heading}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.inkFaint,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "0 0 12px",
                }}
              >
                {col.heading}
              </p>
              {col.links.map((l) => (
                <a
                  key={l}
                  href="#"
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: T.inkMuted,
                    textDecoration: "none",
                    marginBottom: 7,
                  }}
                >
                  {l}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            paddingTop: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: T.inkFaint }}>
            © {new Date().getFullYear()} The Dispatch. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            {["Twitter", "LinkedIn", "RSS"].map((s) => (
              <a
                key={s}
                href="#"
                style={{ fontSize: 12, color: T.inkFaint, textDecoration: "none" }}
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function Blog() {
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
      <FeaturedPost />
      <PostGrid />
      <NewsletterCTA />
      <Footer />
    </div>
  );
}

export { Nav, FeaturedPost, PostGrid, NewsletterCTA, Footer };
