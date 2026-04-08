"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBuiltinMasters } from "@/lib/canvas/component-builtins";
import { createTemplateById, getTemplateList } from "@/lib/canvas/design-component-library";
import { DesignNodeIframePreview } from "@/app/canvas-v1/components/DesignNodeIframePreview";
import type { ComponentMaster, DesignNode } from "@/lib/canvas/design-node";

const BUILTIN_ICONS: Record<string, React.ElementType> = {
  "builtin-hero": Layout,
  "builtin-split": Columns2,
  "builtin-features": Grid3x3,
  "builtin-quote": Quote,
  "builtin-proof": Award,
  "builtin-cta": Megaphone,
  "builtin-footer": PanelBottom,
};

type LightboxEntry = {
  id: string;
  name: string;
  category: string;
  node: DesignNode;
  variant: "section" | "primitive";
};

function GalleryLightbox({
  entry,
  onClose,
}: {
  entry: LightboxEntry;
  onClose: () => void;
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    closeRef.current?.focus();
  }, [entry.id]);

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const isSection = entry.variant === "section";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#1A1A1A]/55" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gallery-lightbox-title"
        className={cn(
          "relative z-10 flex w-full max-w-[min(1120px,calc(100vw-24px))] max-h-[min(92vh,880px)] flex-col overflow-hidden rounded-[8px] border border-[#E5E5E0] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E5E5E0] px-4 py-3">
          <div className="min-w-0 pr-2">
            <h2 id="gallery-lightbox-title" className="truncate text-[16px] font-medium tracking-[-0.02em] text-[#1A1A1A]">
              {entry.name}
            </h2>
            <p className="mt-0.5 text-[11px] font-mono uppercase tracking-[0.06em] text-[#A0A0A0]">{entry.category}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-[#A0A0A0] transition-colors hover:bg-[#F5F5F0] hover:text-[#1A1A1A]"
            aria-label="Close preview"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[#EEEEF0] p-4 sm:p-5">
          <DesignNodeIframePreview
            node={entry.node}
            height={isSection ? 520 : 380}
            contentWidth={isSection ? 1200 : 800}
            contentHeight={isSection ? 620 : 420}
            title={`Preview: ${entry.name}`}
            className="mx-auto max-w-full border border-[#E5E5E0] bg-[#FAFAF8] shadow-sm"
          />
          <p className="mx-auto mt-3 max-w-2xl text-center text-[12px] text-[#6B6B6B]">
            Click outside or press Escape to close.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ComponentGalleryPageClient() {
  const [search, setSearch] = React.useState("");
  const [lightbox, setLightbox] = React.useState<LightboxEntry | null>(null);
  const [portalEl, setPortalEl] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setPortalEl(document.body);
  }, []);

  React.useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

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

  function openBuiltin(m: ComponentMaster) {
    setLightbox({
      id: m.id,
      name: m.name,
      category: m.category,
      node: m.tree,
      variant: "section",
    });
  }

  function openPrimitive(t: { id: string; name: string; category: string; node: DesignNode }) {
    setLightbox({
      id: t.id,
      name: t.name,
      category: t.category,
      node: t.node,
      variant: "primitive",
    });
  }

  const cardInteractive =
    "cursor-pointer transition-[border-color,box-shadow] hover:border-[#D1E4FC] hover:shadow-[0_8px_30px_rgba(75,87,219,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4B57DB]";

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
                role="button"
                tabIndex={0}
                className={cn(
                  "border border-[#E5E5E0] rounded-[6px] bg-white overflow-hidden flex flex-col",
                  cardInteractive
                )}
                onClick={() => openBuiltin(m)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openBuiltin(m);
                  }
                }}
                aria-label={`Open preview: ${m.name}`}
              >
                <DesignNodeIframePreview
                  node={m.tree}
                  height={200}
                  contentWidth={1200}
                  contentHeight={480}
                  title={`Preview: ${m.name}`}
                  className="rounded-none border-0 border-b border-[#E5E5E0] pointer-events-none"
                />
                <div className="p-4 flex items-start gap-3">
                  <Icon size={18} strokeWidth={1.5} className="text-[#A0A0A0] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium text-[#1A1A1A]">{m.name}</div>
                    <div className="text-[11px] text-[#A0A0A0] font-mono uppercase mt-1">{m.category}</div>
                    <div className="text-[11px] text-[#4B57DB] mt-2 font-medium">Click to enlarge</div>
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
              role="button"
              tabIndex={0}
              className={cn(
                "border border-[#E5E5E0] rounded-[6px] bg-white overflow-hidden flex flex-col",
                cardInteractive
              )}
              onClick={() => openPrimitive(t)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openPrimitive(t);
                }
              }}
              aria-label={`Open preview: ${t.name}`}
            >
              <DesignNodeIframePreview
                node={t.node}
                height={140}
                contentWidth={720}
                contentHeight={260}
                title={`Preview: ${t.name}`}
                className={cn("rounded-none border-0 border-b border-[#E5E5E0] pointer-events-none")}
              />
              <div className="p-4 flex items-start gap-3">
                <Box size={18} strokeWidth={1.5} className="text-[#A0A0A0] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[15px] font-medium text-[#1A1A1A]">{t.name}</div>
                  <div className="text-[11px] text-[#A0A0A0] font-mono uppercase mt-1">{t.category}</div>
                  <div className="text-[11px] text-[#4B57DB] mt-2 font-medium">Click to enlarge</div>
                </div>
              </div>
            </article>
          ))}
        </div>
        {filteredPrimitives.length === 0 && (
          <p className="text-[13px] text-[#A0A0A0] py-8">No primitives match your search.</p>
        )}
      </section>

      {portalEl && lightbox
        ? createPortal(<GalleryLightbox entry={lightbox} onClose={() => setLightbox(null)} />, portalEl)
        : null}
    </div>
  );
}
