"use client";

import Link from "next/link";
import { Sparkles, Github, Twitter } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Showcase", href: "#showcase" },
    { label: "Pricing", href: "#pricing" },
    { label: "Changelog", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "mailto:hello@studio-os.app" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "API", href: "#" },
    { label: "Community", href: "#" },
    { label: "Support", href: "#" },
  ],
  Legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
};

export function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border-subtle bg-bg-primary">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center border border-border-primary bg-bg-secondary">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <span className="text-sm font-medium tracking-tight text-text-primary">
                Studio OS
              </span>
            </Link>
            <p className="mb-6 max-w-xs text-sm font-extralight text-text-secondary">
              A design workspace that thinks like you do. AI-curated inspiration
              meets unified workspace.
            </p>
            <div className="flex gap-3">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center border border-border-primary text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center border border-border-primary text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-text-primary">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm font-light text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border-subtle pt-8 sm:flex-row">
          <p className="text-xs font-extralight text-text-muted">
            © {currentYear} Studio OS. All rights reserved.
          </p>
          <p className="text-xs font-extralight text-text-muted">
            Built with spring physics and attention to detail.
          </p>
        </div>
      </div>
    </footer>
  );
}
