"use client";

import { ArrowRight } from "lucide-react";

// Sub-features for the numbered grid - Feature Showcase 1
const subFeatures = [
  { num: "3.1", label: "Projects" },
  { num: "3.2", label: "Tasks" },
  { num: "3.3", label: "Export" },
  { num: "3.4", label: "Integrations" },
];

export function FeatureShowcase() {
  return (
    <section className="bg-black py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header row */}
        <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <h2 className="text-3xl font-medium leading-tight text-white sm:text-4xl">
            Move work forward
            <br />
            across inspiration and execution
          </h2>
          <div className="lg:pt-2">
          <p className="mb-6 font-extralight text-neutral-500">
            Build and deploy design systems that work alongside your creative process.
          </p>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 font-mono text-sm text-neutral-400 transition-colors hover:text-white"
            >
              <span>3.0</span>
              <span>Workflow</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* UI Mockup */}
        <div className="mb-12 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
          <div className="flex min-h-[400px] flex-col lg:flex-row">
            {/* Left panel - Terminal/Code interface */}
            <div className="flex-1 border-b border-neutral-800 p-6 lg:border-b-0 lg:border-r">
              {/* Agent header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800">
                  <span className="text-xs">◎</span>
                </div>
                <span className="text-sm text-neutral-400">Studio</span>
              </div>

              {/* Terminal content */}
              <div className="font-mono text-sm">
                <p className="mb-2 text-neutral-500">
                  On it! I&apos;ve received your request.
                </p>
                <p className="mb-4 text-neutral-500">
                  Kicked off a task in{" "}
                  <span className="text-neutral-400">studio-os/project-acme</span>{" "}
                  environment.
                </p>
                <p className="mb-2 text-neutral-500">
                  Searching for design assets...
                </p>
                <p className="mb-4 text-neutral-600">
                  studio-os/project-acme $ find . -name &quot;*.svg&quot; -o -name
                  &quot;*.png&quot;
                </p>
                <p className="mb-4 text-neutral-600">
                  ASSETS.md
                </p>
                <p className="mb-2 text-neutral-500">
                  Locating brand guidelines...
                </p>
                <p className="flex items-center gap-2 text-neutral-400">
                  <span className="inline-block h-3 w-3 animate-pulse bg-neutral-600" />
                  Thinking...
                </p>
              </div>
            </div>

            {/* Right panel - Assignment sidebar */}
            <div className="w-full lg:w-80">
              {/* Search input */}
              <div className="border-b border-neutral-800 p-4">
                <div className="text-sm text-neutral-600">Assign to...</div>
              </div>

              {/* Agent list */}
              <div className="p-2">
                {[
                  { name: "Studio", type: "Agent", active: true },
                  { name: "Nick", type: "Designer" },
                  { name: "Sarah", type: "PM" },
                  { name: "GitHub Copilot", type: "Agent" },
                  { name: "Cursor", type: "Agent" },
                  { name: "Alex", type: "Dev" },
                ].map((agent) => (
                  <div
                    key={agent.name}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                      agent.active
                        ? "bg-neutral-900"
                        : "hover:bg-neutral-900/50"
                    }`}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-xs">
                      {agent.name[0]}
                    </div>
                    <span className="flex-1 text-sm text-neutral-300">
                      {agent.name}
                    </span>
                    {agent.type === "Agent" && (
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-500">
                        Agent
                      </span>
                    )}
                    {agent.active && (
                      <svg
                        className="h-4 w-4 text-neutral-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Numbered grid */}
        <div className="grid grid-cols-2 gap-px bg-neutral-800 lg:grid-cols-4">
          {subFeatures.map((feature) => (
            <a
              key={feature.num}
              href={`#${feature.label.toLowerCase().replace(" ", "-")}`}
              className="group bg-black p-6 transition-colors hover:bg-neutral-950"
            >
              <span className="mb-2 block font-mono text-xs text-neutral-600">
                {feature.num}
              </span>
              <span className="text-sm text-neutral-400 transition-colors group-hover:text-white">
                {feature.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
