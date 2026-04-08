"use client";

import * as React from "react";
import Link from "next/link";
import {
  Layout,
  Columns2,
  Grid3x3,
  Quote,
  Award,
  Megaphone,
  PanelBottom,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBuiltinMasters } from "@/lib/canvas/component-builtins";
import { createTemplateById, getTemplateList } from "@/lib/canvas/design-component-library";
import { DesignNodeIframePreview } from "@/app/canvas-v1/components/DesignNodeIframePreview";

const BUILTIN_ICONS: Record<string, React.ElementType> = {
  "builtin-hero": Layout,
  "builtin-split": Columns2,
  "builtin-features": Grid3x3,
  "builtin-quote": Quote,
  "builtin-proof": Award,
  "builtin-cta": Megaphone,
  "builtin-footer": PanelBottom,
};

export function ComponentGalleryPageClient() {
  const [search, setSearch] = React.useState("");

  const builtinMasters = React.useMemo(() => getBuiltinMasters(), []);

  const staticPrimitiveTemplates = React.useMemo(() => {
    return getTemplateList()
      .filter((t) => t.category === "Primitives")
      .map((t) => {
        const comp = createTemplateById(t.id);
        if (!comp) return null;
        return { id: t.id, name: t.name, category: t.category, node: comp.node };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, []);

  const matchSearch = (name: string) =>
    !search || name.toLowerCase().includes(search.toLowerCase());

  const filteredBuiltins = builtinMasters.filter((m) => matchSearch(m.name));
  const filteredPrimitives = staticPrimitiveTemplates.filter((t) => matchSearch(t.name));

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.02em] text-[#1A1A1A]">Component gallery</h1>
          <p className="text-[13px] text-[#6B6B6B] mt-1 max-w-xl">
            Visual catalog of built-in section templates and UI primitives. Insert them from the canvas component library or the + bar between sections.
          </p>
        </div>
        <Link
          href="/canvas-v1"
          className="inline-flex items-center justify-center rounded-[4px] bg-[#4B57DB] text-white text-[12px] font-medium px-4 py-2 hover:opacity-95 transition-opacity shrink-0"
        >
          Open canvas
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-full max-w-md border border-[#E5E5E0] rounded-[4px] bg-white px-3 py-2 text-[14px] focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 outline-none"
        />
      </div>

      <section className="mb-12">
        <h2 className="mono-kicker mb-4">Section templates</h2>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredBuiltins.map((m) => {
            const Icon = BUILTIN_ICONS[m.id] ?? Layout;
            return (
              <article
                key={m.id}
                className="border border-[#E5E5E0] rounded-[6px] bg-white overflow-hidden flex flex-col"
              >
                <DesignNodeIframePreview
                  node={m.tree}
                  height={200}
                  contentWidth={1200}
                  contentHeight={480}
                  title={`Preview: ${m.name}`}
                  className="rounded-none border-0 border-b border-[#E5E5E0]"
                />
                <div className="p-4 flex items-start gap-3">
                  <Icon size={18} strokeWidth={1.5} className="text-[#A0A0A0] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium text-[#1A1A1A]">{m.name}</div>
                    <div className="text-[11px] text-[#A0A0A0] font-mono uppercase mt-1">{m.category}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {filteredBuiltins.length === 0 && (
          <p className="text-[13px] text-[#A0A0A0] py-8">No templates match your search.</p>
        )}
      </section>

      <section>
        <h2 className="mono-kicker mb-4">Primitives</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPrimitives.map((t) => (
            <article
              key={t.id}
              className="border border-[#E5E5E0] rounded-[6px] bg-white overflow-hidden flex flex-col"
            >
              <DesignNodeIframePreview
                node={t.node}
                height={140}
                contentWidth={720}
                contentHeight={260}
                title={`Preview: ${t.name}`}
                className={cn("rounded-none border-0 border-b border-[#E5E5E0]")}
              />
              <div className="p-4 flex items-start gap-3">
                <Box size={18} strokeWidth={1.5} className="text-[#A0A0A0] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[15px] font-medium text-[#1A1A1A]">{t.name}</div>
                  <div className="text-[11px] text-[#A0A0A0] font-mono uppercase mt-1">{t.category}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
        {filteredPrimitives.length === 0 && (
          <p className="text-[13px] text-[#A0A0A0] py-8">No primitives match your search.</p>
        )}
      </section>
    </div>
  );
}
