"use client";

/**
 * E-commerce Template
 *
 * Clean, light-mode product-first design.
 * White base, warm neutrals, deep green accent (luxury/sustainable feel).
 * Inspired by premium D2C brands: Aesop, Allbirds, Italic.
 *
 * Sections:
 *   1. Nav
 *   2. Hero (full-width editorial banner)
 *   3. Category grid
 *   4. Featured products
 *   5. Brand story / USP
 *   6. Reviews
 *   7. Newsletter + Footer
 */

import * as React from "react";
import { motion, useInView } from "framer-motion";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bgWhite: "#fafaf8",
  bgSurface: "#f4f2ee",
  bgCard: "#ffffff",
  ink: "#1c1c1c",
  inkLight: "#4a4a44",
  inkMuted: "#8c8c84",
  inkFaint: "#c4c4bc",
  accent: "#2d5a3d", // deep green
  accentLight: "#4a7c5e",
  accentMuted: "rgba(45,90,61,0.08)",
  borderLight: "rgba(0,0,0,0.06)",
  borderMid: "rgba(0,0,0,0.1)",
  gold: "#c4a84f",
} as const;

const ease = [0.19, 1, 0.22, 1] as const;

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [cartCount] = React.useState(2);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(250,250,248,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.borderLight}`,
      }}
    >
      {/* Promo bar */}
      <div
        style={{
          height: 36,
          background: T.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12, color: "#fff", fontWeight: 500, letterSpacing: "0.04em" }}>
          Free shipping on orders over $75 — use code{" "}
          <strong style={{ textDecoration: "underline", cursor: "pointer" }}>WELCOME15</strong>
        </span>
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 40px",
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Logo */}
        <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              background: T.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 14, color: "#fff", fontWeight: 700 }}>K</span>
          </div>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: T.ink,
              letterSpacing: "-0.02em",
            }}
          >
            Kano
          </span>
        </div>

        {/* Nav links */}
        {["Shop", "Collections", "About", "Journal"].map((l) => (
          <a
            key={l}
            href="#"
            style={{
              fontSize: 13,
              color: T.inkMuted,
              textDecoration: "none",
              fontWeight: 500,
              letterSpacing: "-0.005em",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = T.ink)}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = T.inkMuted)}
          >
            {l}
          </a>
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: 8 }}>
          {/* Search */}
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.inkMuted,
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          {/* Cart */}
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.ink,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span
              style={{
                background: T.accent,
                color: "#fff",
                borderRadius: "50%",
                width: 18,
                height: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {cartCount}
            </span>
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
        minHeight: "80vh",
        background: T.bgSurface,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        overflow: "hidden",
      }}
    >
      {/* Left text */}
      <div
        style={{
          padding: "80px 60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            fontWeight: 600,
            color: T.accent,
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          New Season Collection
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.06, ease }}
          style={{
            fontSize: "clamp(44px, 5.5vw, 72px)",
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.02,
            color: T.ink,
            margin: "0 0 24px",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          Designed for
          <br />
          the everyday.
          <br />
          <em style={{ fontStyle: "italic", color: T.accent }}>Elevated.</em>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.14, ease }}
          style={{
            fontSize: 16,
            lineHeight: 1.7,
            color: T.inkLight,
            maxWidth: 400,
            marginBottom: 40,
          }}
        >
          Premium essentials made from sustainable materials. Timeless style that lasts beyond
          the season.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          style={{ display: "flex", gap: 12 }}
        >
          <button
            style={{
              height: 52,
              padding: "0 28px",
              borderRadius: 4,
              background: T.accent,
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              letterSpacing: "-0.01em",
            }}
          >
            Shop now
          </button>
          <button
            style={{
              height: 52,
              padding: "0 24px",
              borderRadius: 4,
              background: "transparent",
              color: T.ink,
              fontWeight: 500,
              fontSize: 14,
              border: `1px solid ${T.borderMid}`,
              cursor: "pointer",
            }}
          >
            Explore collection →
          </button>
        </motion.div>
      </div>

      {/* Right image */}
      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease }}
        style={{
          background: `linear-gradient(160deg, #d8cfc2 0%, #c4b89a 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Product silhouette */}
        <div
          style={{
            width: 220,
            height: 320,
            borderRadius: 120,
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.3)",
            backdropFilter: "blur(4px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 32,
            right: 32,
            padding: "10px 16px",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(10px)",
            borderRadius: 8,
          }}
        >
          <p style={{ fontSize: 11, color: T.inkMuted, margin: "0 0 2px" }}>Starting from</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: "-0.02em" }}>
            $89
          </p>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Category grid ────────────────────────────────────────────────────────────

function Categories() {
  const cats = [
    { name: "Women", count: 148, bg: "#e8e0d4" },
    { name: "Men", count: 96, bg: "#d4cdc4" },
    { name: "Accessories", count: 64, bg: "#c8c0b0" },
    { name: "Home", count: 42, bg: "#dcd4c8" },
  ];

  return (
    <section style={{ padding: "80px 40px", background: T.bgWhite }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <FadeUp>
          <h2
            style={{
              fontSize: "clamp(24px, 3vw, 36px)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: T.ink,
              fontFamily: "Georgia, serif",
              margin: "0 0 40px",
            }}
          >
            Shop by category
          </h2>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {cats.map((cat, i) => (
            <FadeUp key={cat.name} delay={i * 0.06}>
              <div
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "transform 0.3s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.transform = "translateY(0)")
                }
              >
                <div
                  style={{
                    height: 220,
                    background: cat.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 80,
                      height: 110,
                      borderRadius: 40,
                      background: "rgba(0,0,0,0.08)",
                    }}
                  />
                </div>
                <div
                  style={{
                    padding: "14px 16px",
                    background: T.bgCard,
                    border: `1px solid ${T.borderLight}`,
                    borderTop: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>
                    {cat.name}
                  </span>
                  <span style={{ fontSize: 12, color: T.inkMuted }}>{cat.count} items</span>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Featured products ────────────────────────────────────────────────────────

const PRODUCTS = [
  { name: "Essential Linen Shirt", price: 129, originalPrice: 159, tag: "Sale", bg: "#e4ddd4" },
  { name: "Merino Crew Sweater", price: 189, originalPrice: null, tag: "New", bg: "#d8d0c4" },
  { name: "Canvas Tote Bag", price: 89, originalPrice: null, tag: null, bg: "#cfc8bc" },
  { name: "Slim Chino Trousers", price: 149, originalPrice: 179, tag: "Sale", bg: "#d4ccc0" },
];

function Products() {
  return (
    <section style={{ padding: "80px 40px", background: T.bgSurface }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <FadeUp>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 40,
            }}
          >
            <h2
              style={{
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: T.ink,
                fontFamily: "Georgia, serif",
                margin: 0,
              }}
            >
              Featured products
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
              View all →
            </a>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {PRODUCTS.map((product, i) => (
            <FadeUp key={product.name} delay={i * 0.05}>
              <div style={{ cursor: "pointer" }}>
                {/* Product image */}
                <div
                  style={{
                    aspectRatio: "3/4",
                    borderRadius: 8,
                    background: product.bg,
                    marginBottom: 14,
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {product.tag && (
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        padding: "3px 8px",
                        borderRadius: 4,
                        background: product.tag === "Sale" ? "#dc2626" : T.accent,
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {product.tag}
                    </div>
                  )}
                  {/* Add to cart hover */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: 12,
                      background: "rgba(28,28,28,0.85)",
                      backdropFilter: "blur(4px)",
                      opacity: 0,
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.opacity = "1")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.opacity = "0")
                    }
                  >
                    <button
                      style={{
                        width: "100%",
                        height: 36,
                        borderRadius: 4,
                        background: "#fff",
                        color: T.ink,
                        fontWeight: 600,
                        fontSize: 13,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Add to cart
                    </button>
                  </div>
                  {/* Product placeholder graphic */}
                  <div
                    style={{
                      width: 80,
                      height: 120,
                      borderRadius: 8,
                      background: "rgba(0,0,0,0.1)",
                    }}
                  />
                </div>

                {/* Product info */}
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: T.ink,
                    margin: "0 0 4px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {product.name}
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: product.originalPrice ? "#dc2626" : T.ink,
                    }}
                  >
                    ${product.price}
                  </span>
                  {product.originalPrice && (
                    <span
                      style={{
                        fontSize: 13,
                        color: T.inkFaint,
                        textDecoration: "line-through",
                      }}
                    >
                      ${product.originalPrice}
                    </span>
                  )}
                </div>
                {/* Color options */}
                <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                  {["#1c1c1c", "#4a4a44", "#8c8c84", "#e4ddd4"].map((c) => (
                    <div
                      key={c}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: c,
                        border: `1px solid ${T.borderMid}`,
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Brand story / USP ────────────────────────────────────────────────────────

function BrandStory() {
  const pillars = [
    { icon: "🌿", title: "Sustainably made", desc: "Every material we use is certified organic, recycled, or sustainably sourced. Full supply chain transparency." },
    { icon: "⏳", title: "Built to last", desc: "We design for longevity — not trend cycles. Our pieces are made to be worn for years, not seasons." },
    { icon: "🎯", title: "Fair prices", desc: "No inflated markups. We sell directly to you, cutting out the middlemen that drive up cost." },
  ];

  return (
    <section
      style={{
        padding: "100px 40px",
        background: T.accent,
        color: "#fff",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <FadeUp>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 80,
              alignItems: "center",
              marginBottom: 72,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                Our story
              </p>
              <h2
                style={{
                  fontSize: "clamp(32px, 4vw, 52px)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.08,
                  color: "#fff",
                  fontFamily: "Georgia, serif",
                  margin: "0 0 24px",
                }}
              >
                We started Kano because we were tired of choosing between quality and conscience.
              </h2>
            </div>
            <div>
              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.75,
                  color: "rgba(255,255,255,0.7)",
                  marginBottom: 16,
                }}
              >
                Founded in 2020, we believe that sustainable and beautiful aren't opposites. Our
                team of designers obsesses over materials, construction, and fit — so every piece
                we make earns its place in your wardrobe.
              </p>
              <a
                href="#"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.4)",
                  paddingBottom: 2,
                }}
              >
                Learn more about us →
              </a>
            </div>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {pillars.map((p, i) => (
            <FadeUp key={p.title} delay={i * 0.07}>
              <div
                style={{
                  padding: 28,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 16 }}>{p.icon}</div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: "-0.015em",
                    color: "#fff",
                    margin: "0 0 8px",
                  }}
                >
                  {p.title}
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.65, margin: 0 }}>
                  {p.desc}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

function Reviews() {
  const reviews = [
    { text: "The linen shirt is exactly what I've been looking for. The weight is perfect and it doesn't wrinkle badly. Already ordered two more colors.", name: "Emma L.", rating: 5, product: "Essential Linen Shirt" },
    { text: "Quality that rivals brands charging 3× as much. I was skeptical but I'm a convert. The merino sweater is impeccably made.", name: "James R.", rating: 5, product: "Merino Crew Sweater" },
    { text: "Great fit, great materials, and the checkout was easy. Love that they include sizing notes. Arrived in 3 days.", name: "Sofia M.", rating: 5, product: "Slim Chino Trousers" },
  ];

  return (
    <section style={{ padding: "100px 40px", background: T.bgWhite }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <FadeUp>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 48,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "clamp(28px, 3.5vw, 42px)",
                  fontWeight: 700,
                  letterSpacing: "-0.028em",
                  color: T.ink,
                  fontFamily: "Georgia, serif",
                  margin: "0 0 8px",
                }}
              >
                What our customers say
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 2 }}>
                  {Array(5).fill(0).map((_, i) => (
                    <span key={i} style={{ color: T.gold, fontSize: 16 }}>★</span>
                  ))}
                </div>
                <span style={{ fontSize: 14, color: T.inkMuted }}>4.9 out of 5 · 2,847 reviews</span>
              </div>
            </div>
            <a
              href="#"
              style={{ fontSize: 13, fontWeight: 600, color: T.accent, textDecoration: "none", borderBottom: `1px solid ${T.accent}`, paddingBottom: 1 }}
            >
              Read all reviews →
            </a>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {reviews.map((r, i) => (
            <FadeUp key={r.name} delay={i * 0.06}>
              <div
                style={{
                  borderRadius: 12,
                  border: `1px solid ${T.borderLight}`,
                  background: T.bgCard,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", gap: 2 }}>
                  {Array(r.rating).fill(0).map((_, idx) => (
                    <span key={idx} style={{ color: T.gold, fontSize: 14 }}>★</span>
                  ))}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: T.inkLight, margin: 0, flex: 1 }}>
                  "{r.text}"
                </p>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.ink, margin: "0 0 2px" }}>{r.name}</p>
                  <p style={{ fontSize: 12, color: T.inkMuted, margin: 0 }}>Verified purchase · {r.product}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Newsletter + Footer ──────────────────────────────────────────────────────

function NewsletterFooter() {
  return (
    <>
      {/* Newsletter */}
      <section
        style={{
          padding: "80px 40px",
          background: T.bgSurface,
          borderTop: `1px solid ${T.borderLight}`,
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <FadeUp>
            <h2
              style={{
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: T.ink,
                fontFamily: "Georgia, serif",
                margin: "0 0 12px",
              }}
            >
              Join the Kano community
            </h2>
            <p
              style={{
                fontSize: 15,
                color: T.inkLight,
                lineHeight: 1.6,
                marginBottom: 32,
              }}
            >
              New arrivals, styling tips, and exclusive offers. Join 40,000+ subscribers.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Your email address"
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 6,
                  border: `1px solid ${T.borderMid}`,
                  background: T.bgCard,
                  padding: "0 16px",
                  fontSize: 14,
                  color: T.ink,
                  outline: "none",
                }}
              />
              <button
                style={{
                  height: 48,
                  padding: "0 24px",
                  borderRadius: 6,
                  background: T.accent,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Subscribe
              </button>
            </div>
            <p style={{ fontSize: 12, color: T.inkMuted, marginTop: 12 }}>
              No spam. Unsubscribe anytime.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: T.ink,
          color: T.bgWhite,
          padding: "60px 40px 40px",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
            gap: 48,
            marginBottom: 48,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 4,
                  background: T.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>K</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.bgWhite, letterSpacing: "-0.02em" }}>
                Kano
              </span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(250,250,248,0.5)", lineHeight: 1.65, maxWidth: 220 }}>
              Premium essentials, sustainably made. Free shipping over $75.
            </p>
          </div>

          {[
            { heading: "Shop", links: ["Women", "Men", "Accessories", "Sale"] },
            { heading: "Company", links: ["About", "Sustainability", "Careers", "Press"] },
            { heading: "Help", links: ["FAQ", "Shipping", "Returns", "Contact"] },
          ].map((col) => (
            <div key={col.heading}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(250,250,248,0.35)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "0 0 14px",
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
                    color: "rgba(250,250,248,0.55)",
                    textDecoration: "none",
                    marginBottom: 8,
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
            borderTop: "1px solid rgba(250,250,248,0.08)",
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(250,250,248,0.3)" }}>
            © {new Date().getFullYear()} Kano, Inc.
          </span>
          <span style={{ fontSize: 12, color: "rgba(250,250,248,0.3)" }}>
            Privacy · Terms · Accessibility
          </span>
        </div>
      </footer>
    </>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function Ecommerce() {
  return (
    <div
      style={{
        fontFamily:
          '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: T.bgWhite,
        color: T.ink,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <Nav />
      <Hero />
      <Categories />
      <Products />
      <BrandStory />
      <Reviews />
      <NewsletterFooter />
    </div>
  );
}

export { Nav, Hero, Categories, Products, BrandStory, Reviews, NewsletterFooter };
