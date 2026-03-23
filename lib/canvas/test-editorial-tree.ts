// lib/canvas/test-editorial-tree.ts
// Hand-authored editorial homepage for the V6 visual proof gate.
// This represents what the AI generator SHOULD produce — a magazine-quality
// homepage composed from DesignNode primitives.
//
// If the V6 renderer can make this look like a real editorial publication,
// the architecture is proven. If it still looks like stacked blocks, we revise.

import type { DesignNode } from "./design-node";

export const EDITORIAL_TEST_TREE: DesignNode = {
  id: "page-root",
  type: "frame",
  name: "Editorial Homepage",
  style: {
    display: "flex",
    flexDirection: "column",
    background: "#FAF9F6",
    foreground: "#1A1A1A",
  },
  children: [
    // ── NAV ──
    {
      id: "nav",
      type: "frame",
      name: "Navigation",
      style: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: { top: 20, right: 64, bottom: 20, left: 64 },
        background: "transparent",
      },
      children: [
        {
          id: "nav-logo",
          type: "text",
          name: "Logo",
          style: { fontSize: 14, fontWeight: 600, letterSpacing: 0.12, foreground: "#1A1A1A" },
          content: { text: "ATELIER" },
        },
        {
          id: "nav-links",
          type: "text",
          name: "Links",
          style: { fontSize: 13, foreground: "#888888" },
          content: { text: "Stories     Archive     About" },
        },
      ],
    },

    // ── HERO — full-bleed cover image with overlaid headline ──
    {
      id: "hero",
      type: "frame",
      name: "Hero",
      style: {
        height: 720,
        coverImage: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1400&q=80",
        coverSize: "cover",
        coverPosition: "center 30%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "flex-start",
        padding: { top: 0, right: 64, bottom: 64, left: 64 },
        foreground: "#FFFFFF",
      },
      children: [
        {
          id: "hero-kicker",
          type: "text",
          name: "Kicker",
          style: { fontSize: 11, letterSpacing: 0.15, opacity: 0.6 },
          content: { kicker: "ISSUE 12 — SPRING 2026" },
        },
        {
          id: "hero-headline",
          type: "text",
          name: "Headline",
          style: {
            fontSize: 68,
            fontWeight: 300,
            fontFamily: "'Playfair Display', Georgia, serif",
            lineHeight: 1.0,
            letterSpacing: -0.03,
            maxWidth: "70%",
          },
          content: { text: "The Body as Architecture" },
        },
        {
          id: "hero-sub",
          type: "text",
          name: "Subtext",
          style: { fontSize: 16, opacity: 0.7, maxWidth: "40%", lineHeight: 1.5 },
          content: { text: "How three designers are redefining the relationship between garment and structure." },
        },
      ],
    },

    // ── EDITORIAL SPREAD — asymmetric 2-column ──
    {
      id: "spread",
      type: "frame",
      name: "Editorial Spread",
      style: {
        display: "grid",
        gridTemplate: "3fr 2fr",
        gap: 48,
        padding: { top: 96, right: 64, bottom: 96, left: 64 },
        alignItems: "center",
      },
      children: [
        {
          id: "spread-text",
          type: "frame",
          name: "Spread Text",
          style: { display: "flex", flexDirection: "column", gap: 16 },
          children: [
            {
              id: "spread-kicker",
              type: "text",
              name: "Kicker",
              style: { fontSize: 11, letterSpacing: 0.12, foreground: "#999999" },
              content: { kicker: "FEATURE" },
            },
            {
              id: "spread-title",
              type: "text",
              name: "Title",
              style: {
                fontSize: 36,
                fontWeight: 400,
                fontFamily: "'Playfair Display', Georgia, serif",
                lineHeight: 1.2,
              },
              content: { text: "Dressed for No One in Particular" },
            },
            {
              id: "spread-body",
              type: "text",
              name: "Body",
              style: { fontSize: 15, lineHeight: 1.7, foreground: "#555555", maxWidth: 420 },
              content: { text: "In a season defined by excess, these three collections argue for restraint — garments that exist for the wearer, not the audience. A quiet rebellion against the performance of getting dressed." },
            },
            {
              id: "spread-byline",
              type: "text",
              name: "Byline",
              style: { fontSize: 12, foreground: "#999999" },
              content: { text: "Words by Elena Voss — Photography by Haruki Murakami" },
            },
          ],
        },
        {
          id: "spread-image",
          type: "image",
          name: "Spread Photo",
          style: {
            width: "fill",
            height: 520,
            objectFit: "cover",
            borderRadius: 4,
          },
          content: {
            src: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
            alt: "Fashion editorial photograph",
          },
        },
      ],
    },

    // ── PULLQUOTE ──
    {
      id: "pullquote",
      type: "frame",
      name: "Pullquote",
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: { top: 100, right: 120, bottom: 100, left: 120 },
        background: "#1A1A1A",
        foreground: "#FFFFFF",
      },
      children: [
        {
          id: "quote-text",
          type: "text",
          name: "Quote",
          style: {
            fontSize: 30,
            fontWeight: 300,
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic",
            lineHeight: 1.6,
            textAlign: "center",
            maxWidth: 700,
          },
          content: { text: "\u201CFashion is not about the garment. It is about the space the garment creates around the body.\u201D" },
        },
        {
          id: "quote-attr",
          type: "text",
          name: "Attribution",
          style: { fontSize: 13, opacity: 0.4, textAlign: "center" },
          content: { text: "\u2014 Rei Kawakubo, 1987" },
        },
      ],
    },

    // ── FULL-BLEED PHOTO ──
    {
      id: "photo-break",
      type: "frame",
      name: "Photo Break",
      style: {
        height: 480,
        coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1400&q=80",
        coverSize: "cover",
        coverPosition: "center",
      },
      children: [],
    },

    // ── STORY INDEX — editorial grid ──
    {
      id: "stories",
      type: "frame",
      name: "Story Index",
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 0,
        padding: { top: 80, right: 64, bottom: 80, left: 64 },
      },
      children: [
        {
          id: "stories-header",
          type: "text",
          name: "Section Header",
          style: { fontSize: 11, letterSpacing: 0.12, foreground: "#999999", padding: { top: 0, right: 0, bottom: 24, left: 0 } },
          content: { kicker: "ALSO IN THIS ISSUE" },
        },
        {
          id: "story-0",
          type: "frame",
          name: "Story 01",
          style: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: { top: 20, right: 0, bottom: 20, left: 0 },
            borderColor: "#E5E5E0",
            borderWidth: 1,
          },
          children: [
            {
              id: "story-0-num",
              type: "text",
              name: "Number",
              style: { fontSize: 13, foreground: "#BBBBBB", fontFamily: "'IBM Plex Mono', monospace" },
              content: { text: "01" },
            },
            {
              id: "story-0-title",
              type: "text",
              name: "Title",
              style: {
                fontSize: 22,
                fontWeight: 400,
                fontFamily: "'Playfair Display', Georgia, serif",
                flexGrow: 1,
                padding: { top: 0, right: 0, bottom: 0, left: 24 },
              },
              content: { text: "The Geometry of Drape" },
            },
            {
              id: "story-0-byline",
              type: "text",
              name: "Byline",
              style: { fontSize: 13, foreground: "#999999" },
              content: { text: "Yuki Tanaka" },
            },
          ],
        },
        {
          id: "story-1",
          type: "frame",
          name: "Story 02",
          style: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: { top: 20, right: 0, bottom: 20, left: 0 },
            borderColor: "#E5E5E0",
            borderWidth: 1,
          },
          children: [
            {
              id: "story-1-num",
              type: "text",
              name: "Number",
              style: { fontSize: 13, foreground: "#BBBBBB", fontFamily: "'IBM Plex Mono', monospace" },
              content: { text: "02" },
            },
            {
              id: "story-1-title",
              type: "text",
              name: "Title",
              style: {
                fontSize: 22,
                fontWeight: 400,
                fontFamily: "'Playfair Display', Georgia, serif",
                flexGrow: 1,
                padding: { top: 0, right: 0, bottom: 0, left: 24 },
              },
              content: { text: "After the Show: What Remains" },
            },
            {
              id: "story-1-byline",
              type: "text",
              name: "Byline",
              style: { fontSize: 13, foreground: "#999999" },
              content: { text: "Clara Mendes" },
            },
          ],
        },
        {
          id: "story-2",
          type: "frame",
          name: "Story 03",
          style: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: { top: 20, right: 0, bottom: 20, left: 0 },
          },
          children: [
            {
              id: "story-2-num",
              type: "text",
              name: "Number",
              style: { fontSize: 13, foreground: "#BBBBBB", fontFamily: "'IBM Plex Mono', monospace" },
              content: { text: "03" },
            },
            {
              id: "story-2-title",
              type: "text",
              name: "Title",
              style: {
                fontSize: 22,
                fontWeight: 400,
                fontFamily: "'Playfair Display', Georgia, serif",
                flexGrow: 1,
                padding: { top: 0, right: 0, bottom: 0, left: 24 },
              },
              content: { text: "A Conversation with Phoebe Philo" },
            },
            {
              id: "story-2-byline",
              type: "text",
              name: "Byline",
              style: { fontSize: 13, foreground: "#999999" },
              content: { text: "James Loveridge" },
            },
          ],
        },
      ],
    },

    // ── SUBSCRIBE — minimal, editorial ──
    {
      id: "subscribe",
      type: "frame",
      name: "Subscribe",
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: { top: 48, right: 64, bottom: 48, left: 64 },
      },
      children: [
        {
          id: "subscribe-text",
          type: "text",
          name: "CTA Text",
          style: { fontSize: 14, foreground: "#888888" },
          content: { text: "Receive new issues directly." },
        },
        {
          id: "subscribe-btn",
          type: "button",
          name: "Subscribe Button",
          style: {
            fontSize: 14,
            fontWeight: 400,
            background: "transparent",
            foreground: "#1A1A1A",
            borderColor: "#CCCCCC",
            borderWidth: 1,
            borderRadius: 2,
            padding: { top: 10, right: 24, bottom: 10, left: 24 },
          },
          content: { text: "Subscribe \u2192" },
        },
      ],
    },

    // ── FOOTER — minimal ──
    {
      id: "footer",
      type: "frame",
      name: "Footer",
      style: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        padding: { top: 24, right: 64, bottom: 24, left: 64 },
        opacity: 0.4,
      },
      children: [
        {
          id: "footer-copy",
          type: "text",
          name: "Copyright",
          style: { fontSize: 12 },
          content: { text: "\u00A9 2026 Atelier Magazine" },
        },
        {
          id: "footer-links",
          type: "text",
          name: "Links",
          style: { fontSize: 12 },
          content: { text: "Instagram     Privacy     Contact" },
        },
      ],
    },
  ],
};
