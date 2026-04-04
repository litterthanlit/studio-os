import type { PageNode } from "./compose";

export type SectionTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  createNodes: () => PageNode;
};

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createHeroSection(): PageNode {
  return {
    id: uid("sec"),
    type: "section",
    name: "Hero",
    style: { paddingY: 64, paddingX: 48, align: "center", gap: 24 },
    children: [
      {
        id: uid("h"),
        type: "heading",
        name: "Heading",
        content: { text: "Your headline here" },
        style: { fontSize: 48, fontWeight: 700, foreground: "#1A1A1A" },
      },
      {
        id: uid("p"),
        type: "paragraph",
        name: "Subtext",
        content: { text: "A concise description of what you offer and why it matters to your audience." },
        style: { fontSize: 18, foreground: "#6B6B6B" },
      },
      {
        id: uid("br"),
        type: "button-row",
        name: "Buttons",
        style: { gap: 12, justify: "center", direction: "row" },
        children: [
          {
            id: uid("btn"),
            type: "button",
            name: "Primary CTA",
            content: { text: "Get Started", href: "#" },
            style: { emphasized: true },
          },
          {
            id: uid("btn"),
            type: "button",
            name: "Secondary CTA",
            content: { text: "Learn More", href: "#" },
          },
        ],
      },
    ],
  };
}

function createProofSection(): PageNode {
  return {
    id: uid("sec"),
    type: "section",
    name: "Proof / Logo Row",
    style: { paddingY: 48, paddingX: 48, align: "center", gap: 24 },
    children: [
      {
        id: uid("p"),
        type: "paragraph",
        name: "Kicker",
        content: { text: "TRUSTED BY" },
        style: { fontSize: 10, fontWeight: 500, foreground: "#A0A0A0", letterSpacing: 2 },
      },
      {
        id: uid("lr"),
        type: "logo-row",
        name: "Logos",
        style: { gap: 32, justify: "center", direction: "row" },
        children: [
          { id: uid("li"), type: "logo-item", name: "Logo 1", content: { text: "Acme" } },
          { id: uid("li"), type: "logo-item", name: "Logo 2", content: { text: "Globex" } },
          { id: uid("li"), type: "logo-item", name: "Logo 3", content: { text: "Initech" } },
          { id: uid("li"), type: "logo-item", name: "Logo 4", content: { text: "Umbrella" } },
        ],
      },
    ],
  };
}

function createFeaturesSection(): PageNode {
  return {
    id: uid("sec"),
    type: "section",
    name: "Features",
    style: { paddingY: 64, paddingX: 48, align: "center", gap: 32 },
    children: [
      {
        id: uid("p"),
        type: "paragraph",
        name: "Kicker",
        content: { text: "FEATURES" },
        style: { fontSize: 10, fontWeight: 500, foreground: "#A0A0A0", letterSpacing: 2 },
      },
      {
        id: uid("h"),
        type: "heading",
        name: "Heading",
        content: { text: "Everything you need" },
        style: { fontSize: 32, fontWeight: 600, foreground: "#1A1A1A" },
      },
      {
        id: uid("fg"),
        type: "feature-grid",
        name: "Features Grid",
        style: { columns: 3, gap: 24 },
        children: [
          {
            id: uid("fc"),
            type: "feature-card",
            name: "Feature 1",
            style: { borderRadius: 18, borderColor: "#E5E5E0", paddingX: 24, paddingY: 24 },
            children: [
              { id: uid("h"), type: "heading", name: "Title", content: { text: "Fast performance" }, style: { fontSize: 16, fontWeight: 600 } },
              { id: uid("p"), type: "paragraph", name: "Description", content: { text: "Optimized for speed so your users never wait." }, style: { fontSize: 14, foreground: "#6B6B6B" } },
            ],
          },
          {
            id: uid("fc"),
            type: "feature-card",
            name: "Feature 2",
            style: { borderRadius: 18, borderColor: "#E5E5E0", paddingX: 24, paddingY: 24 },
            children: [
              { id: uid("h"), type: "heading", name: "Title", content: { text: "Secure by default" }, style: { fontSize: 16, fontWeight: 600 } },
              { id: uid("p"), type: "paragraph", name: "Description", content: { text: "Enterprise-grade security built into every layer." }, style: { fontSize: 14, foreground: "#6B6B6B" } },
            ],
          },
          {
            id: uid("fc"),
            type: "feature-card",
            name: "Feature 3",
            style: { borderRadius: 18, borderColor: "#E5E5E0", paddingX: 24, paddingY: 24 },
            children: [
              { id: uid("h"), type: "heading", name: "Title", content: { text: "Easy integration" }, style: { fontSize: 16, fontWeight: 600 } },
              { id: uid("p"), type: "paragraph", name: "Description", content: { text: "Connect with your existing tools in minutes." }, style: { fontSize: 14, foreground: "#6B6B6B" } },
            ],
          },
        ],
      },
    ],
  };
}

function createTestimonialsSection(): PageNode {
  return {
    id: uid("sec"),
    type: "section",
    name: "Testimonials",
    style: { paddingY: 64, paddingX: 48, align: "center", gap: 32 },
    children: [
      {
        id: uid("p"),
        type: "paragraph",
        name: "Kicker",
        content: { text: "TESTIMONIALS" },
        style: { fontSize: 10, fontWeight: 500, foreground: "#A0A0A0", letterSpacing: 2 },
      },
      {
        id: uid("tg"),
        type: "testimonial-grid",
        name: "Testimonials Grid",
        style: { columns: 3, gap: 24 },
        children: [
          {
            id: uid("tc"),
            type: "testimonial-card",
            name: "Testimonial 1",
            style: { borderRadius: 18, borderColor: "#E5E5E0", paddingX: 24, paddingY: 24 },
            children: [
              { id: uid("p"), type: "paragraph", name: "Quote", content: { text: "This product completely changed how our team works. We shipped twice as fast." }, style: { fontSize: 14, foreground: "#1A1A1A" } },
              { id: uid("p"), type: "paragraph", name: "Author", content: { text: "Sarah Chen, CTO at Acme" }, style: { fontSize: 12, foreground: "#A0A0A0" } },
            ],
          },
          {
            id: uid("tc"),
            type: "testimonial-card",
            name: "Testimonial 2",
            style: { borderRadius: 18, borderColor: "#E5E5E0", paddingX: 24, paddingY: 24 },
            children: [
              { id: uid("p"), type: "paragraph", name: "Quote", content: { text: "The best tool we've adopted this year. Simple, powerful, and reliable." }, style: { fontSize: 14, foreground: "#1A1A1A" } },
              { id: uid("p"), type: "paragraph", name: "Author", content: { text: "Marcus Johnson, Lead Designer" }, style: { fontSize: 12, foreground: "#A0A0A0" } },
            ],
          },
          {
            id: uid("tc"),
            type: "testimonial-card",
            name: "Testimonial 3",
            style: { borderRadius: 18, borderColor: "#E5E5E0", paddingX: 24, paddingY: 24 },
            children: [
              { id: uid("p"), type: "paragraph", name: "Quote", content: { text: "Setup took 10 minutes. We were productive on day one." }, style: { fontSize: 14, foreground: "#1A1A1A" } },
              { id: uid("p"), type: "paragraph", name: "Author", content: { text: "Priya Patel, Engineering Manager" }, style: { fontSize: 12, foreground: "#A0A0A0" } },
            ],
          },
        ],
      },
    ],
  };
}

function createPricingSection(): PageNode {
  return {
    id: uid("sec"),
    type: "section",
    name: "Pricing",
    style: { paddingY: 64, paddingX: 48, align: "center", gap: 32 },
    children: [
      {
        id: uid("p"),
        type: "paragraph",
        name: "Kicker",
        content: { text: "PRICING" },
        style: { fontSize: 10, fontWeight: 500, foreground: "#A0A0A0", letterSpacing: 2 },
      },
      {
        id: uid("h"),
        type: "heading",
        name: "Heading",
        content: { text: "Simple pricing" },
        style: { fontSize: 32, fontWeight: 600, foreground: "#1A1A1A" },
      },
      {
        id: uid("pg"),
        type: "pricing-grid",
        name: "Pricing Grid",
        style: { columns: 3, gap: 24 },
        children: [
          {
            id: uid("pt"),
            type: "pricing-tier",
            name: "Starter",
            style: { borderRadius: 18, borderColor: "#E5E5E0", paddingX: 24, paddingY: 32 },
            content: { price: "$9/mo" },
            children: [
              { id: uid("h"), type: "heading", name: "Tier Name", content: { text: "Starter" }, style: { fontSize: 18, fontWeight: 600 } },
              { id: uid("p"), type: "paragraph", name: "Description", content: { text: "For individuals and small projects." }, style: { fontSize: 14, foreground: "#6B6B6B" } },
              { id: uid("btn"), type: "button", name: "CTA", content: { text: "Start Free Trial", href: "#" } },
            ],
          },
          {
            id: uid("pt"),
            type: "pricing-tier",
            name: "Pro",
            style: { borderRadius: 18, borderColor: "#4B57DB", paddingX: 24, paddingY: 32 },
            content: { price: "$29/mo" },
            children: [
              { id: uid("h"), type: "heading", name: "Tier Name", content: { text: "Pro" }, style: { fontSize: 18, fontWeight: 600 } },
              { id: uid("p"), type: "paragraph", name: "Description", content: { text: "For growing teams that need more." }, style: { fontSize: 14, foreground: "#6B6B6B" } },
              { id: uid("btn"), type: "button", name: "CTA", content: { text: "Get Started", href: "#" }, style: { emphasized: true } },
            ],
          },
          {
            id: uid("pt"),
            type: "pricing-tier",
            name: "Enterprise",
            style: { borderRadius: 18, borderColor: "#E5E5E0", paddingX: 24, paddingY: 32 },
            content: { price: "Custom" },
            children: [
              { id: uid("h"), type: "heading", name: "Tier Name", content: { text: "Enterprise" }, style: { fontSize: 18, fontWeight: 600 } },
              { id: uid("p"), type: "paragraph", name: "Description", content: { text: "Dedicated support and custom integrations." }, style: { fontSize: 14, foreground: "#6B6B6B" } },
              { id: uid("btn"), type: "button", name: "CTA", content: { text: "Contact Sales", href: "#" } },
            ],
          },
        ],
      },
    ],
  };
}

function createCTASection(): PageNode {
  return {
    id: uid("sec"),
    type: "section",
    name: "CTA Banner",
    style: { paddingY: 64, paddingX: 48, align: "center", gap: 20, background: "#F5F5F0" },
    children: [
      {
        id: uid("h"),
        type: "heading",
        name: "Heading",
        content: { text: "Ready to get started?" },
        style: { fontSize: 32, fontWeight: 600, foreground: "#1A1A1A" },
      },
      {
        id: uid("p"),
        type: "paragraph",
        name: "Subtext",
        content: { text: "Join thousands of teams already building better products." },
        style: { fontSize: 16, foreground: "#6B6B6B" },
      },
      {
        id: uid("br"),
        type: "button-row",
        name: "Buttons",
        style: { gap: 12, justify: "center", direction: "row" },
        children: [
          {
            id: uid("btn"),
            type: "button",
            name: "Primary CTA",
            content: { text: "Start Building", href: "#" },
            style: { emphasized: true },
          },
        ],
      },
    ],
  };
}

function createFooterSection(): PageNode {
  return {
    id: uid("sec"),
    type: "section",
    name: "Footer",
    style: { paddingY: 32, paddingX: 48, align: "center", gap: 8 },
    children: [
      {
        id: uid("p"),
        type: "paragraph",
        name: "Company",
        content: { text: "Your Company" },
        style: { fontSize: 14, fontWeight: 600, foreground: "#1A1A1A" },
      },
      {
        id: uid("p"),
        type: "paragraph",
        name: "Copyright",
        content: { text: "\u00a9 2026 Your Company. All rights reserved." },
        style: { fontSize: 12, foreground: "#A0A0A0" },
      },
    ],
  };
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  { id: "hero", name: "Hero", description: "Large heading, subtext, CTA buttons", icon: "Layout", createNodes: createHeroSection },
  { id: "proof", name: "Proof / Logo Row", description: "Social proof logos or partner badges", icon: "Award", createNodes: createProofSection },
  { id: "features", name: "Features", description: "3-column grid with icons and descriptions", icon: "Grid3x3", createNodes: createFeaturesSection },
  { id: "testimonials", name: "Testimonials", description: "Quote, author, company", icon: "MessageSquareQuote", createNodes: createTestimonialsSection },
  { id: "pricing", name: "Pricing", description: "3-tier pricing table with CTA per tier", icon: "CreditCard", createNodes: createPricingSection },
  { id: "cta", name: "CTA Banner", description: "Full-width call to action with heading", icon: "Megaphone", createNodes: createCTASection },
  { id: "footer", name: "Footer", description: "Multi-column footer with links and logo", icon: "PanelBottom", createNodes: createFooterSection },
];
