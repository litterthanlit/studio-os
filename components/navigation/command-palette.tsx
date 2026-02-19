"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  SearchIcon,
  ProjectsIcon,
  ImageIcon,
  TypeIcon,
  ZapIcon,
  AiSparkIcon,
} from "@/components/ui/icon";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNewProjectModal } from "@/components/new-project-modal";
import type { SearchResult } from "@/app/api/search/route";

type Category = "projects" | "references" | "fonts" | "actions";

type BaseItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: Category;
};

type ActionItem = BaseItem & {
  category: "actions";
  shortcut?: string;
  action: "navigate" | "theme" | "new-project" | "placeholder";
  href?: string;
};

type RowItem = BaseItem | ActionItem;

function isAction(item: RowItem): item is ActionItem {
  return item.category === "actions" && "action" in item;
}

const PROJECTS: RowItem[] = [
  {
    id: "acme",
    category: "projects",
    title: "Acme Rebrand",
    subtitle: "Discovery · 40%",
  },
  {
    id: "fintech",
    category: "projects",
    title: "FinTech Dashboard",
    subtitle: "Refine · 75%",
  },
  {
    id: "editorial",
    category: "projects",
    title: "Editorial Magazine",
    subtitle: "Concept · 25%",
  },
];

const REFERENCES: RowItem[] = [
  {
    id: "ref-1",
    category: "references",
    title: "Brand system — dark hero",
    subtitle: "Vision · Brand",
  },
  {
    id: "ref-2",
    category: "references",
    title: "Serif specimen",
    subtitle: "Vision · Typography",
  },
];

const FONTS: RowItem[] = [
  {
    id: "font-inter",
    category: "fonts",
    title: "Inter",
    subtitle: "Sans Serif",
  },
  {
    id: "font-playfair",
    category: "fonts",
    title: "Playfair Display",
    subtitle: "Serif",
  },
];

const ACTIONS: ActionItem[] = [
  {
    id: "switch-acme",
    category: "actions",
    title: "Switch to Acme Rebrand",
    subtitle: "Set active project",
    shortcut: "↵",
    action: "navigate",
    href: "/projects",
  },
  {
    id: "open-vision",
    category: "actions",
    title: "Open Vision",
    subtitle: "Moodboard",
    shortcut: "↵",
    action: "navigate",
    href: "/vision",
  },
  {
    id: "new-project",
    category: "actions",
    title: "New Project",
    subtitle: "Create project room",
    shortcut: "↵",
    action: "new-project",
  },
  {
    id: "focus-session",
    category: "actions",
    title: "Start Focus Session",
    subtitle: "Block time",
    shortcut: "↵",
    action: "placeholder",
  },
  {
    id: "generate-specimen",
    category: "actions",
    title: "Generate Specimen",
    subtitle: "Type specimen",
    shortcut: "↵",
    action: "placeholder",
  },
];

const CATEGORY_LABELS: Record<Category, string> = {
  projects: "Projects",
  references: "References",
  fonts: "Fonts",
  actions: "Actions",
};

const CATEGORY_ICONS: Record<Category, React.ComponentType<{ className?: string }>> = {
  projects: ProjectsIcon,
  references: (p) => <ImageIcon {...p} bare />,
  fonts: TypeIcon,
  actions: ZapIcon,
};

const DEFAULT_ITEMS: RowItem[] = [
  PROJECTS[0],
  REFERENCES[0],
  FONTS[0],
  ACTIONS[0],
  ACTIONS[1],
  ACTIONS[2],
  ACTIONS[3],
  ACTIONS[4],
];

function filterItems(query: string): Record<Category, RowItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      projects: PROJECTS,
      references: REFERENCES,
      fonts: FONTS,
      actions: ACTIONS,
    };
  }
  const match = (item: RowItem) =>
    item.title.toLowerCase().includes(q) ||
    (item.subtitle?.toLowerCase().includes(q) ?? false);

  return {
    projects: PROJECTS.filter(match),
    references: REFERENCES.filter(match),
    fonts: FONTS.filter(match),
    actions: ACTIONS.filter(match),
  };
}

function getDefaultFlat(): RowItem[] {
  return DEFAULT_ITEMS;
}

function getFlatFromGrouped(grouped: Record<Category, RowItem[]>): RowItem[] {
  return [
    ...grouped.projects,
    ...grouped.references,
    ...grouped.fonts,
    ...grouped.actions,
  ];
}

function SimilarityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? "#0070f3" : pct >= 60 ? "#22c55e" : "#f97316";
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="relative h-1 w-12 rounded-full bg-[#222]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] tabular-nums" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function SemanticResultRow({
  result,
  isSelected,
  onClick,
  onMouseEnter,
}: {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const thumb = result.thumbnailUrl ?? result.imageUrl;
  const label = result.title ?? result.tags?.[0] ?? "Reference";
  const sub = [result.board, result.style, result.mood]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 text-left transition-[background-color] duration-150 ease-out",
        isSelected ? "bg-accent/10" : "hover:bg-white/5"
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded border border-[#333] bg-[#0a0a0a]">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-3 w-3 text-gray-600" bare />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{label}</div>
        {sub && (
          <div className="truncate text-[11px] text-gray-500">{sub}</div>
        )}
      </div>

      {/* Similarity */}
      <SimilarityBar value={result.similarity} />
    </button>
  );
}

export function CommandPalette({ showTrigger = true }: { showTrigger?: boolean }) {
  const router = useRouter();
  const { openModal: openNewProjectModal } = useNewProjectModal();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [semanticResults, setSemanticResults] = React.useState<SearchResult[]>([]);
  const [semanticLoading, setSemanticLoading] = React.useState(false);
  const [semanticSelectedIndex, setSemanticSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const grouped = React.useMemo(() => filterItems(query), [query]);
  const flatItems = React.useMemo(
    () => (query.trim() ? getFlatFromGrouped(grouped) : getDefaultFlat()),
    [query, grouped]
  );

  const selectedItem = flatItems[selectedIndex] ?? null;

  React.useEffect(() => {
    setSelectedIndex(0);
    setSemanticSelectedIndex(-1);
  }, [query]);

  React.useEffect(() => {
    if (selectedIndex >= flatItems.length && flatItems.length > 0) {
      setSelectedIndex(flatItems.length - 1);
    }
  }, [flatItems.length, selectedIndex]);

  // ── Semantic search (debounced 380ms) ──────────────────────────────────────
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSemanticResults([]);
      setSemanticLoading(false);
      return;
    }

    setSemanticLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, limit: 6 }),
        });
        if (res.ok) {
          const data = await res.json();
          setSemanticResults(data.results ?? []);
        }
      } catch {
        // Silently ignore — semantic search is best-effort
      } finally {
        setSemanticLoading(false);
      }
    }, 380);

    return () => {
      clearTimeout(timer);
      setSemanticLoading(false);
    };
  }, [query]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
        setSemanticResults([]);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }

      const totalSemantic = semanticResults.length;
      const totalFlat = flatItems.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        // Navigate: semantic section first (index -1 means "none"), then flat
        if (semanticSelectedIndex === -1) {
          if (totalSemantic > 0) {
            setSemanticSelectedIndex(0);
            setSelectedIndex(-1);
          } else if (totalFlat > 0) {
            setSelectedIndex((i) => (i + 1) % totalFlat);
          }
        } else if (semanticSelectedIndex < totalSemantic - 1) {
          setSemanticSelectedIndex((i) => i + 1);
        } else {
          setSemanticSelectedIndex(-1);
          setSelectedIndex(0);
        }
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (semanticSelectedIndex > 0) {
          setSemanticSelectedIndex((i) => i - 1);
        } else if (semanticSelectedIndex === 0) {
          setSemanticSelectedIndex(-1);
          setSelectedIndex(totalFlat > 0 ? totalFlat - 1 : 0);
        } else {
          if (totalFlat > 0) {
            setSelectedIndex((i) => (i === 0 ? totalFlat - 1 : i - 1));
          }
        }
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (semanticSelectedIndex >= 0 && semanticResults[semanticSelectedIndex]) {
          handleSemanticClick(semanticResults[semanticSelectedIndex]);
          return;
        }
        if (selectedItem) {
          runItem(selectedItem);
        }
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flatItems.length, selectedItem, semanticResults, semanticSelectedIndex]);

  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || !listRef.current || !selectedItem) return;
    const el = listRef.current.querySelector(
      `[data-item-id="${selectedItem.id}"][data-item-category="${selectedItem.category}"]`
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex, open, selectedItem]);

  function handleSemanticClick(result: SearchResult) {
    setOpen(false);
    // Navigate to Vision; future: deep-link with ?ref=<id>
    router.push(`/vision?ref=${result.id}`);
  }

  function runItem(item: RowItem) {
    if (isAction(item)) {
      if (item.action === "navigate" && item.href) {
        setOpen(false);
        router.push(item.href);
        return;
      }
      if (item.action === "theme") {
        // Dark mode only — no-op
        setOpen(false);
        return;
      }
      if (item.action === "new-project") {
        setOpen(false);
        openNewProjectModal();
        return;
      }
      if (item.action === "placeholder") {
        setOpen(false);
        return;
      }
    } else {
      if (item.category === "projects") {
        setOpen(false);
        router.push("/projects");
        return;
      }
      if (item.category === "references") {
        setOpen(false);
        router.push("/vision");
        return;
      }
      if (item.category === "fonts") {
        setOpen(false);
        router.push("/type");
        return;
      }
    }
  }

  const showSemantic = query.trim().length >= 2;

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search (⌘K)"
          className="flex items-center justify-start gap-2 rounded-md border border-[#222] bg-black/80 px-2.5 py-1.5 text-[#555] backdrop-blur-sm transition-[border-color,color] duration-200 ease-out hover:border-[#444] hover:text-white"
        >
          <SearchIcon className="h-3.5 w-3.5 shrink-0" bare />
          <kbd className="rounded border border-[#2a2a2a] bg-[#111] px-1.5 py-0.5 font-mono text-[9px] text-[#444]">
            ⌘K
          </kbd>
        </button>
      )}

      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <React.Fragment key="command-palette">
                <motion.div
                  key="overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  key="modal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="w-full max-w-[600px] rounded-xl border border-[#222222] bg-[#0d0d0d] shadow-2xl"
                  >
                    {/* Input */}
                    <div className="flex items-center gap-2 border-b border-[#1e1e1e] px-3">
                      <SearchIcon className="h-4 w-4 shrink-0 text-gray-500" bare />
                      <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search everything… or describe a visual"
                        className="h-12 w-full rounded-md bg-transparent px-2 text-sm text-white outline-none placeholder:text-gray-600"
                      />
                      {semanticLoading && (
                        <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-gray-600">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          >
                            <AiSparkIcon className="h-3 w-3 text-accent" bare />
                          </motion.div>
                          <span className="text-accent">searching</span>
                        </div>
                      )}
                    </div>

                    <div
                      ref={listRef}
                      className="max-h-[62vh] overflow-y-auto py-2"
                    >
                      {/* ── Semantic results section ── */}
                      {showSemantic && (
                        <div className="mb-1">
                          <div className="mb-1 flex items-center gap-2 px-3">
                            <AiSparkIcon className="h-3 w-3 text-accent" bare />
                            <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-accent">
                              Vision — AI Search
                            </span>
                            {!semanticLoading && semanticResults.length === 0 && (
                              <span className="ml-auto text-[10px] text-gray-700">
                                no matches
                              </span>
                            )}
                          </div>

                          {semanticLoading && semanticResults.length === 0 ? (
                            // Skeleton shimmer
                            <div className="space-y-1 px-3 pb-1">
                              {[0, 1, 2].map((i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-3 rounded py-2"
                                >
                                  <div className="h-10 w-8 animate-pulse rounded bg-[#1a1a1a]" />
                                  <div className="flex-1 space-y-1.5">
                                    <div className="h-2.5 w-3/4 animate-pulse rounded bg-[#1a1a1a]" />
                                    <div className="h-2 w-1/2 animate-pulse rounded bg-[#161616]" />
                                  </div>
                                  <div className="h-1 w-12 animate-pulse rounded-full bg-[#1a1a1a]" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            semanticResults.map((result, i) => (
                              <SemanticResultRow
                                key={result.id}
                                result={result}
                                isSelected={semanticSelectedIndex === i}
                                onClick={() => handleSemanticClick(result)}
                                onMouseEnter={() => {
                                  setSemanticSelectedIndex(i);
                                  setSelectedIndex(-1);
                                }}
                              />
                            ))
                          )}

                          {/* Separator */}
                          {(semanticResults.length > 0 || semanticLoading) && (
                            <div className="mx-3 my-2 border-t border-[#1a1a1a]" />
                          )}
                        </div>
                      )}

                      {/* ── Standard results ── */}
                      {query.trim() ? (
                        <>
                          {(Object.keys(grouped) as Category[]).map(
                            (category) => {
                              const items = grouped[category];
                              if (items.length === 0) return null;
                              const Icon = CATEGORY_ICONS[category];
                              return (
                                <div key={category} className="mb-3 last:mb-0">
                                  <div className="mb-1 px-3 text-[9px] font-medium uppercase tracking-[0.15em] text-gray-500">
                                    {CATEGORY_LABELS[category]}
                                  </div>
                                  {items.map((item) => {
                                    const itemFlatIdx = flatItems.findIndex(
                                      (f) =>
                                        f.id === item.id &&
                                        f.category === item.category
                                    );
                                    const isSelected =
                                      semanticSelectedIndex === -1 &&
                                      selectedIndex === itemFlatIdx &&
                                      itemFlatIdx >= 0;
                                    return (
                                      <button
                                        key={`${item.category}-${item.id}`}
                                        type="button"
                                        data-item-id={item.id}
                                        data-item-category={item.category}
                                        onClick={() => runItem(item)}
                                        onMouseEnter={() => {
                                          if (itemFlatIdx >= 0) {
                                            setSelectedIndex(itemFlatIdx);
                                            setSemanticSelectedIndex(-1);
                                          }
                                        }}
                                        className={cn(
                                          "flex w-full items-center gap-3 px-3 py-2 text-left transition-[background-color] duration-150 ease-out",
                                          isSelected ? "bg-accent/10" : "hover:bg-white/5"
                                        )}
                                      >
                                        <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm font-medium text-white truncate">
                                            {item.title}
                                          </div>
                                          {item.subtitle && (
                                            <div className="text-[11px] text-gray-500 truncate">
                                              {item.subtitle}
                                            </div>
                                          )}
                                        </div>
                                        {isAction(item) && item.shortcut && (
                                          <span className="shrink-0 text-[10px] text-gray-500">
                                            {item.shortcut}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            }
                          )}
                        </>
                      ) : (
                        <div className="space-y-1">
                          <div className="mb-1 px-3 text-[9px] font-medium uppercase tracking-[0.15em] text-gray-500">
                            Recent &amp; suggested
                          </div>
                          {flatItems.map((item, index) => {
                            const isSelected =
                              semanticSelectedIndex === -1 &&
                              selectedIndex === index;
                            const Icon = CATEGORY_ICONS[item.category];
                            return (
                              <button
                                key={`${item.category}-${item.id}`}
                                type="button"
                                data-item-id={item.id}
                                data-item-category={item.category}
                                onClick={() => runItem(item)}
                                onMouseEnter={() => {
                                  setSelectedIndex(index);
                                  setSemanticSelectedIndex(-1);
                                }}
                                className={cn(
                                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-[background-color] duration-150 ease-out",
                                  isSelected ? "bg-accent/10" : "hover:bg-white/5"
                                )}
                              >
                                <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-white truncate">
                                    {item.title}
                                  </div>
                                  {item.subtitle && (
                                    <div className="text-[11px] text-gray-500 truncate">
                                      {item.subtitle}
                                    </div>
                                  )}
                                </div>
                                {isAction(item) && item.shortcut && (
                                  <span className="shrink-0 text-[10px] text-gray-500">
                                    {item.shortcut}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer hint */}
                    <div className="flex items-center justify-between border-t border-[#1a1a1a] px-3 py-2">
                      <div className="flex items-center gap-3 text-[10px] text-gray-700">
                        <span className="flex items-center gap-1">
                          <kbd className="rounded border border-[#222] bg-[#111] px-1 py-0.5 font-mono text-[9px]">↑↓</kbd>
                          Navigate
                        </span>
                        <span className="flex items-center gap-1">
                          <kbd className="rounded border border-[#222] bg-[#111] px-1 py-0.5 font-mono text-[9px]">↵</kbd>
                          Select
                        </span>
                        <span className="flex items-center gap-1">
                          <kbd className="rounded border border-[#222] bg-[#111] px-1 py-0.5 font-mono text-[9px]">esc</kbd>
                          Close
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-700">
                        <AiSparkIcon className="h-2.5 w-2.5 text-accent/50" bare />
                        <span>AI semantic search</span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </React.Fragment>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
