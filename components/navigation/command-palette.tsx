"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  SearchIcon,
  ProjectsIcon,
  PaletteIcon,
  HomeIcon,
  ImageIcon,
  ZapIcon,
  AiSparkIcon,
} from "@/components/ui/icon";
import { AnimatePresence, motion } from "framer-motion";
import { useNewProjectModal, getStoredProjects } from "@/components/new-project-modal";
import { PROJECTS as STATIC_PROJECTS, type Phase } from "@/app/(dashboard)/projects/projects-data";
import type { SearchResult } from "@/app/api/search/route";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";
import { PROJECTS_UPDATED_EVENT } from "@/lib/project-store";

type ItemCategory = "recent" | "projects" | "sections" | "actions" | "references";

type CommandAction =
  | { type: "open-project"; projectId: string }
  | { type: "open-section"; projectId: string; sectionId: string }
  | { type: "navigate"; href: string }
  | { type: "new-project" }
  | { type: "toggle-theme" }
  | { type: "open-reference"; referenceId: string };

type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: ItemCategory;
  action: CommandAction;
};

type RecentCommand = {
  id: string;
  title: string;
  subtitle?: string;
  action: CommandAction;
};

type HomeProject = {
  id: string;
  name: string;
  phase: Phase;
  leadImage?: string;
};

const RECENT_STORAGE_KEY = "studio-os-recent-commands";

const SECTIONS: { id: string; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "type", label: "Type" },
  { id: "palette", label: "Palette" },
  { id: "tasks", label: "Tasks" },
  { id: "overview", label: "Overview" },
];

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  recent: "Recent",
  projects: "Projects",
  sections: "Sections",
  actions: "Actions",
  references: "References",
};

const CATEGORY_ICONS: Record<ItemCategory, React.ComponentType<{ className?: string }>> = {
  recent: SearchIcon,
  projects: ProjectsIcon,
  sections: PaletteIcon,
  actions: ZapIcon,
  references: (p) => <ImageIcon {...p} bare />,
};

function fuzzyScore(input: string, query: string): number {
  const text = input.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  if (text === q) return 100;
  if (text.startsWith(q)) return 80;
  if (text.includes(q)) return 60;

  let qi = 0;
  for (let i = 0; i < text.length && qi < q.length; i += 1) {
    if (text[i] === q[qi]) qi += 1;
  }
  return qi === q.length ? 40 : 0;
}

function scrollToSection(sectionId: string) {
  let tries = 0;
  const maxTries = 18;
  const tick = () => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      return;
    }
    tries += 1;
    if (tries < maxTries) {
      window.setTimeout(tick, 120);
    }
  };
  tick();
}

function readRecentCommands(): RecentCommand[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentCommand[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecentCommands(next: RecentCommand[]) {
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next.slice(0, 5)));
}

function rememberCommand(item: CommandItem) {
  if (item.category === "recent") return;
  const current = readRecentCommands();
  const command: RecentCommand = {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    action: item.action,
  };
  const deduped = [command, ...current.filter((c) => c.id !== item.id)];
  writeRecentCommands(deduped);
}

function mapProjects(): HomeProject[] {
  const stored = getStoredProjects();
  if (stored.length > 0) {
    return stored.map((p) => {
      const staticMatch = STATIC_PROJECTS.find((sp) => sp.id === p.id);
      return {
        id: p.id,
        name: p.name,
        phase: staticMatch?.phase ?? "Discovery",
        leadImage: staticMatch?.leadImage,
      };
    });
  }

  return STATIC_PROJECTS.map((p) => ({
    id: p.id,
    name: p.name,
    phase: p.phase,
    leadImage: p.leadImage,
  }));
}

function SimilarityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div className="relative h-1 w-12 bg-[var(--bg-tertiary)] transition-colors duration-300">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--accent)] transition-[width,opacity] duration-300"
          style={{ width: `${pct}%`, opacity: Math.max(0.35, pct / 100) }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-[var(--text-tertiary)] transition-colors duration-300">
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
  const sub = [result.board, result.style, result.mood].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`flex w-full items-center gap-3 py-2 pl-[10px] pr-3 text-left transition-colors duration-100 ease-out border-l-2 ${
        isSelected
          ? "bg-[var(--bg-secondary)] border-l-[var(--accent)]"
          : "border-l-transparent hover:bg-[var(--bg-tertiary)]"
      }`}
    >
      <div className="relative h-10 w-8 shrink-0 overflow-hidden border border-[var(--border-primary)] bg-[var(--bg-tertiary)] rounded-lg transition-colors duration-300">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-3 w-3 text-[var(--text-tertiary)] transition-colors duration-300" bare />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[var(--text-primary)] transition-colors duration-300">
          {label}
        </div>
        {sub ? (
          <div className="truncate text-[11px] text-[var(--text-tertiary)] transition-colors duration-300">{sub}</div>
        ) : null}
      </div>
      <SimilarityBar value={result.similarity} />
    </button>
  );
}

export function CommandPalette({ showTrigger = true }: { showTrigger?: boolean }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { openModal: openNewProjectModal } = useNewProjectModal();

  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [projects, setProjects] = React.useState<HomeProject[]>([]);
  const [recentCommands, setRecentCommands] = React.useState<RecentCommand[]>([]);
  const [semanticResults, setSemanticResults] = React.useState<SearchResult[]>([]);
  const [semanticLoading, setSemanticLoading] = React.useState(false);
  const [selectedKey, setSelectedKey] = React.useState<string>("");

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function loadProjects() {
      setProjects(mapProjects());
    }
    loadProjects();
    window.addEventListener("storage", loadProjects);
    window.addEventListener(PROJECTS_UPDATED_EVENT, loadProjects);
    return () => {
      window.removeEventListener("storage", loadProjects);
      window.removeEventListener(PROJECTS_UPDATED_EVENT, loadProjects);
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setRecentCommands(readRecentCommands());
  }, [open]);

  const actions = React.useMemo<CommandItem[]>(
    () => [
      {
        id: "action-create-project",
        title: "Create project",
        subtitle: "Open project creation modal",
        category: "actions",
        action: { type: "new-project" },
      },
      {
        id: "action-toggle-theme",
        title: "Toggle theme",
        subtitle:
          resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        category: "actions",
        action: { type: "toggle-theme" },
      },
      {
        id: "action-go-home",
        title: "Go home",
        subtitle: "Navigate to home",
        category: "actions",
        action: { type: "navigate", href: "/home" },
      },
      {
        id: "action-go-projects",
        title: "Go projects",
        subtitle: "Navigate to projects list",
        category: "actions",
        action: { type: "navigate", href: "/projects" },
      },
    ],
    [resolvedTheme]
  );

  const projectItems = React.useMemo<CommandItem[]>(
    () =>
      projects.map((project) => ({
        id: `project-${project.id}`,
        title: project.name,
        subtitle: `${project.phase} project`,
        category: "projects",
        action: { type: "open-project", projectId: project.id },
      })),
    [projects]
  );

  const sectionItems = React.useMemo<CommandItem[]>(
    () =>
      projects.flatMap((project) =>
        SECTIONS.map((section) => ({
          id: `section-${project.id}-${section.id}`,
          title: `${project.name} → ${section.label}`,
          subtitle: `Jump to ${section.label}`,
          category: "sections" as const,
          action: {
            type: "open-section" as const,
            projectId: project.id,
            sectionId: section.id,
          },
        }))
      ),
    [projects]
  );

  const recentItems = React.useMemo<CommandItem[]>(
    () =>
      recentCommands.map((recent, index) => ({
        id: `recent-${recent.id}-${index}`,
        title: recent.title,
        subtitle: recent.subtitle,
        category: "recent",
        action: recent.action,
      })),
    [recentCommands]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim();
    if (!q) {
      return {
        recent: recentItems,
        projects: projectItems.slice(0, 6),
        sections: [] as CommandItem[],
        actions,
      };
    }

    const byScore = (item: CommandItem) =>
      fuzzyScore(`${item.title} ${item.subtitle ?? ""}`, q);

    const scoreSort = (a: CommandItem, b: CommandItem) => byScore(b) - byScore(a);

    return {
      recent: [] as CommandItem[],
      projects: projectItems.filter((item) => byScore(item) > 0).sort(scoreSort).slice(0, 8),
      sections: sectionItems.filter((item) => byScore(item) > 0).sort(scoreSort).slice(0, 10),
      actions: actions.filter((item) => byScore(item) > 0).sort(scoreSort),
    };
  }, [actions, projectItems, query, recentItems, sectionItems]);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSemanticResults([]);
      setSemanticLoading(false);
      return;
    }

    setSemanticLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, limit: 6 }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setSemanticResults(data.results ?? []);
      } catch {
        // Semantic search is best-effort.
      } finally {
        setSemanticLoading(false);
      }
    }, 380);

    return () => {
      clearTimeout(timer);
      setSemanticLoading(false);
    };
  }, [query]);

  const groups = React.useMemo(
    () =>
      [
        { category: "recent" as const, items: filtered.recent },
        { category: "projects" as const, items: filtered.projects },
        { category: "sections" as const, items: filtered.sections },
        { category: "actions" as const, items: filtered.actions },
      ].filter((group) => group.items.length > 0),
    [filtered]
  );

  const referenceItems = React.useMemo<CommandItem[]>(
    () =>
      semanticResults.map((result) => ({
        id: `reference-${result.id}`,
        title: result.title ?? result.tags?.[0] ?? "Reference",
        subtitle: [result.board, result.style, result.mood].filter(Boolean).join(" · "),
        category: "references",
        action: { type: "open-reference", referenceId: result.id },
      })),
    [semanticResults]
  );

  const selectionOrder = React.useMemo(
    () => [...groups.flatMap((g) => g.items), ...referenceItems],
    [groups, referenceItems]
  );

  React.useEffect(() => {
    if (selectionOrder.length === 0) {
      setSelectedKey("");
      return;
    }
    if (!selectionOrder.some((item) => item.id === selectedKey)) {
      setSelectedKey(selectionOrder[0].id);
    }
  }, [selectedKey, selectionOrder]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        return;
      }

      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }

      if (selectionOrder.length === 0) return;
      const idx = selectionOrder.findIndex((item) => item.id === selectedKey);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = idx < 0 ? 0 : (idx + 1) % selectionOrder.length;
        setSelectedKey(selectionOrder[next].id);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const next =
          idx <= 0 ? selectionOrder.length - 1 : (idx - 1) % selectionOrder.length;
        setSelectedKey(selectionOrder[next].id);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const active = selectionOrder.find((item) => item.id === selectedKey);
        if (active) {
          runItem(active);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, selectedKey, selectionOrder]);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    if (!open || !listRef.current || !selectedKey) return;
    const el = listRef.current.querySelector(`[data-item-id="${selectedKey}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, selectedKey]);

  function runAction(action: CommandAction) {
    if (action.type === "new-project") {
      setOpen(false);
      openNewProjectModal();
      return;
    }
    if (action.type === "toggle-theme") {
      const next = resolvedTheme === "dark" ? "light" : "dark";
      setTheme(next);
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", next);
      }
      setOpen(false);
      return;
    }
    if (action.type === "navigate") {
      setOpen(false);
      router.push(action.href);
      return;
    }
    if (action.type === "open-project") {
      setOpen(false);
      router.push(`/projects/${action.projectId}`);
      return;
    }
    if (action.type === "open-section") {
      setOpen(false);
      router.push(`/projects/${action.projectId}`);
      scrollToSection(action.sectionId);
      return;
    }
    if (action.type === "open-reference") {
      setOpen(false);
      router.push(`/vision?ref=${action.referenceId}`);
    }
  }

  function runItem(item: CommandItem) {
    rememberCommand(item);
    setRecentCommands(readRecentCommands());
    runAction(item.action);
  }

  return (
    <>
      {showTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search (⌘K)"
          className="flex items-center justify-start gap-2 border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2.5 py-1.5 text-[var(--text-tertiary)] transition-[border-color,color] duration-200 ease-out hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg"
        >
          <SearchIcon className="h-3.5 w-3.5 shrink-0" bare />
          <kbd className="border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-tertiary)] rounded-sm">
            ⌘K
          </kbd>
        </button>
      ) : null}

      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open ? (
              <React.Fragment key="command-palette">
                <motion.div
                  key="overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={springs.snappy}
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  key="modal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={springs.snappy}
                  className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={springs.snappy}
                    className="w-full max-w-[640px] border border-[var(--border-primary)] bg-[var(--card-bg)] rounded-2xl transition-colors duration-300"
                    style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04)" }}
                  >
                    <div className="flex items-center gap-2 border-b border-[var(--border-primary)] px-3 transition-colors duration-300">
                      <SearchIcon
                        className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-colors duration-300"
                        bare
                      />
                      <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search projects, sections, actions, references"
                        className="h-12 w-full bg-transparent px-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] rounded-lg transition-colors duration-300"
                      />
                      {semanticLoading ? (
                        <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          >
                            <AiSparkIcon className="h-3 w-3 text-[var(--accent)]" bare />
                          </motion.div>
                          <span className="text-[var(--accent)]">searching</span>
                        </div>
                      ) : null}
                    </div>

                    <motion.div
                      ref={listRef}
                      initial="hidden"
                      animate="visible"
                      variants={staggerContainer}
                      className="max-h-[62vh] overflow-y-auto py-2"
                    >
                      {groups.map((group) => {
                        const Icon = CATEGORY_ICONS[group.category];
                        return (
                          <motion.div key={group.category} variants={staggerItem} className="mb-3 last:mb-0 border-t border-[var(--border-subtle)] mt-2 pt-2 first:border-t-0 first:mt-0 first:pt-0">
                            <div className="px-3 pt-1 pb-0.5 text-[11px] font-sans uppercase tracking-[0.1em] font-medium text-[var(--text-tertiary)] transition-colors duration-300">
                              {CATEGORY_LABELS[group.category]}
                            </div>
                            <motion.div variants={staggerContainer}>
                              {group.items.map((item) => {
                                const isSelected = selectedKey === item.id;
                                return (
                                  <motion.button
                                    key={item.id}
                                    type="button"
                                    data-item-id={item.id}
                                    variants={staggerItem}
                                    onClick={() => runItem(item)}
                                    onMouseEnter={() => setSelectedKey(item.id)}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex w-full items-center gap-3 py-2 pl-[10px] pr-3 text-left transition-colors duration-100 ease-out border-l-2 ${
                                      isSelected
                                        ? "bg-[var(--bg-secondary)] border-l-[var(--accent)]"
                                        : "border-l-transparent hover:bg-[var(--bg-tertiary)]"
                                    }`}
                                  >
                                    <Icon className={`h-4 w-4 shrink-0 transition-colors duration-100 ${isSelected ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"}`} />
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-sm font-medium text-[var(--text-primary)] transition-colors duration-300">
                                        {item.title}
                                      </div>
                                      {item.subtitle ? (
                                        <div className="truncate text-[11px] text-[var(--text-tertiary)] transition-colors duration-300">
                                          {item.subtitle}
                                        </div>
                                      ) : null}
                                    </div>
                                  </motion.button>
                                );
                              })}
                            </motion.div>
                          </motion.div>
                        );
                      })}

                      {query.trim().length >= 2 ? (
                        <motion.div variants={staggerItem} className="mb-3 last:mb-0">
                          <div className="px-3 pt-1 pb-0.5 text-[11px] font-sans uppercase tracking-[0.1em] font-medium text-[var(--text-tertiary)] transition-colors duration-300">
                            References
                          </div>
                          {semanticLoading && semanticResults.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-[var(--text-tertiary)] transition-colors duration-300">
                              Searching references…
                            </div>
                          ) : null}
                          {!semanticLoading && semanticResults.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-[var(--text-tertiary)] transition-colors duration-300">
                              No reference matches
                            </div>
                          ) : null}
                          <motion.div variants={staggerContainer}>
                            {semanticResults.map((result) => {
                              const itemId = `reference-${result.id}`;
                              const cmdItem = referenceItems.find((r) => r.id === itemId);
                              if (!cmdItem) return null;
                              return (
                                <motion.div key={itemId} data-item-id={itemId} variants={staggerItem}>
                                  <SemanticResultRow
                                    result={result}
                                    isSelected={selectedKey === itemId}
                                    onClick={() => runItem(cmdItem)}
                                    onMouseEnter={() => setSelectedKey(itemId)}
                                  />
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        </motion.div>
                      ) : null}
                    </motion.div>

                    <div className="flex items-center justify-between border-t border-[var(--border-primary)] px-3 py-2 transition-colors duration-300">
                      <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)] transition-colors duration-300">
                        <span className="flex items-center gap-1">
                          <kbd className="border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-1 py-0.5 font-mono text-[9px] rounded-sm transition-colors duration-300">
                            ↑↓
                          </kbd>
                          Navigate
                        </span>
                        <span className="flex items-center gap-1">
                          <kbd className="border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-1 py-0.5 font-mono text-[9px] rounded-sm transition-colors duration-300">
                            ↵
                          </kbd>
                          Select
                        </span>
                        <span className="flex items-center gap-1">
                          <kbd className="border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-1 py-0.5 font-mono text-[9px] rounded-sm transition-colors duration-300">
                            esc
                          </kbd>
                          Close
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] transition-colors duration-300">
                        <AiSparkIcon className="h-2.5 w-2.5 text-[var(--accent)] transition-colors duration-300" bare />
                        <span>AI semantic search</span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </React.Fragment>
            ) : null}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
