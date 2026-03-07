"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/project-store";
import {
  TEMPLATES,
  TEMPLATE_LIST,
  type Template,
  type TemplateId,
  type TemplateReference,
} from "@/lib/templates";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;
const STORAGE_KEY = "studio_os_onboarding";

export type Archetype = "visual" | "typography" | "systems";

interface StoredOnboarding {
  complete: boolean;
  email: string;
  archetype: Archetype | null;
  templateChosen: TemplateId | "empty" | null;
  pinterestConnected: boolean;
  searchPerformed: boolean;
  completedAt: string;
}

// Returns archetype stored in onboarding localStorage (used by sidebar + tagger)
export function getStoredArchetype(): Archetype | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as Partial<StoredOnboarding>).archetype ?? null;
  } catch { return null; }
}

const ARCHETYPE_TEMPLATE_ORDER: Record<Archetype, TemplateId[]> = {
  visual:     ["brand-identity", "editorial", "web-redesign", "packaging"],
  typography: ["editorial", "brand-identity", "web-redesign", "packaging"],
  systems:    ["web-redesign", "brand-identity", "editorial", "packaging"],
};

function getOrderedTemplates(archetype: Archetype | null) {
  if (!archetype) return TEMPLATE_LIST;
  const order = ARCHETYPE_TEMPLATE_ORDER[archetype];
  return [...TEMPLATE_LIST].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

// ─── Animations ───────────────────────────────────────────────────────────────

const SPRING = [0.16, 1, 0.3, 1] as const;

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, y: dir > 0 ? 16 : -16, scale: 0.98 }),
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: SPRING },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? -10 : 10,
    scale: 0.97,
    transition: { duration: 0.18, ease: "easeIn" },
  }),
};

// ─── Progress Pills ───────────────────────────────────────────────────────────

function ProgressPills({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{ height: 3 }}
          animate={{
            width: i === step - 1 ? 20 : 5,
            backgroundColor: i < step ? "#2430AD" : i === step - 1 ? "#2430AD" : "#1e1e1e",
          }}
          transition={{ duration: 0.35, ease: SPRING }}
        />
      ))}
    </div>
  );
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({
  email,
  onEmailChange,
  onNext,
}: {
  email: string;
  onEmailChange: (v: string) => void;
  onNext: (sentMagicLink: boolean) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (sending || sent) return;
    if (!email.trim() || !email.includes("@")) {
      // No email — just proceed
      onNext(false);
      return;
    }

    setSending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) throw authError;
      setSent(true);
      // Proceed to next step after a brief delay
      setTimeout(() => onNext(true), 1600);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Unknown error";
      console.error("[auth] signInWithOtp failed:", err);
      setError(`Couldn't send link. ${msg}`);
      setSending(false);
    }
  }

  return (
    <div className="space-y-10 py-4 text-center">
      {/* Logo mark */}
      <motion.div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-border-subtle bg-card-bg"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: SPRING }}
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </svg>
      </motion.div>

      {/* Heading */}
      <div className="space-y-3">
        <motion.h1
          className="text-[32px] font-semibold leading-tight tracking-[-0.02em] text-white"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: SPRING }}
        >
          Welcome to Studio OS
        </motion.h1>
        <motion.p
          className="text-[15px] text-text-tertiary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          Your creative workspace, ready in 60 seconds.
        </motion.p>
      </div>

      {/* Email + CTA */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4, ease: SPRING }}
      >
        {sent ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-400">
            <svg viewBox="0 0 20 20" className="h-4 w-4 flex-shrink-0" fill="none">
              <path d="M4 10l4.5 4.5L16 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Link sent to <strong className="font-medium">{email}</strong></span>
          </div>
        ) : (
          <>
            <div className="relative">
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="your@email.com"
                className={cn(
                  "w-full rounded-lg border bg-card-bg px-4 py-3 text-sm text-white outline-none",
                  "placeholder:text-text-muted transition-[border-color] duration-200 ease-out",
                  "focus:border-border-primary",
                  error ? "border-red-900/60" : "border-border-subtle"
                )}
              />
            </div>
            {error && (
              <p className="text-[12px] text-red-400">{error}</p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={sending}
              className={cn(
                "w-full rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white",
                "transition-[opacity] duration-200 ease-out hover:opacity-90",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {sending ? "Sending…" : "Get Started →"}
            </button>
            <button
              type="button"
              onClick={() => onNext(false)}
              className="text-[13px] text-text-muted transition-colors duration-200 ease-out hover:text-text-secondary"
            >
              Skip sign in →
            </button>
          </>
        )}
      </motion.div>

      {/* Sign-in link */}
      <motion.p
        className="text-[12px] text-text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        Already have an account?{" "}
        <a href="/auth/login" className="text-text-placeholder underline transition-colors hover:text-white">
          Sign in
        </a>
      </motion.p>
    </div>
  );
}

// ─── Step 2: Archetype ────────────────────────────────────────────────────────

const ARCHETYPE_OPTIONS: {
  id: Archetype;
  title: string;
  subtitle: string;
}[] = [
  { id: "visual",     title: "Collect visual inspiration",    subtitle: "Mood boards, references, vibes"    },
  { id: "typography", title: "Pick fonts and set the tone",   subtitle: "Typography, hierarchy, voice"      },
  { id: "systems",    title: "Set up systems and constraints", subtitle: "Components, tokens, structure"    },
];

function StepArchetype({
  chosen,
  onChoose,
  onNext,
}: {
  chosen: Archetype | null;
  onChoose: (a: Archetype) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2">
        <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-white">
          When starting a new project,<br />what&apos;s your first move?
        </h2>
        <p className="text-[13px] text-text-placeholder">This helps us personalize your studio.</p>
      </div>

      <div className="flex flex-col gap-3">
        {ARCHETYPE_OPTIONS.map((opt) => {
          const isSelected = chosen === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChoose(opt.id)}
              className={cn(
                "w-full p-5 text-left transition-[border-color,background-color] duration-150",
                "border cursor-pointer",
                isSelected
                  ? "border-solid border-[#2430AD] bg-[#2430AD]/5"
                  : "border-[#1a1a1a] bg-card-bg hover:border-[#252525]"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "text-[8px] leading-none",
                    isSelected ? "text-accent" : "text-text-tertiary"
                  )}
                >
                  ■
                </span>
                <span className="text-sm font-medium text-white">{opt.title}</span>
              </div>
              <p className="text-[11px] text-text-tertiary pl-[18px]">{opt.subtitle}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onNext}
          disabled={chosen === null}
          className={cn(
            "rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white",
            "transition-[opacity] duration-200 ease-out hover:opacity-90",
            "disabled:cursor-not-allowed disabled:opacity-30"
          )}
        >
          Continue →
        </button>
        <button
          type="button"
          onClick={() => { onChoose("visual"); onNext(); }}
          className="text-[13px] text-text-muted transition-colors duration-200 ease-out hover:text-text-secondary"
        >
          Skip →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Template Picker ──────────────────────────────────────────────────

function StepTemplatePicker({
  chosen,
  onChoose,
  onNext,
  templates,
}: {
  chosen: TemplateId | "empty" | null;
  onChoose: (id: TemplateId | "empty") => void;
  onNext: () => void;
  templates: typeof TEMPLATE_LIST;
}) {
  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2">
        <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-white">
          Pick a starting point.
        </h2>
        <p className="text-[14px] text-text-tertiary">
          Pre-loaded with references, palette, and font pairings.
        </p>
      </div>

      {/* 2×2 Template grid */}
      <div className="grid grid-cols-2 gap-3">
        {templates.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            selected={chosen === tpl.id}
            onSelect={() => onChoose(tpl.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onNext}
          disabled={chosen === null}
          className={cn(
            "rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white",
            "transition-[opacity] duration-200 ease-out hover:opacity-90",
            "disabled:cursor-not-allowed disabled:opacity-30"
          )}
        >
          Create Studio →
        </button>
        <button
          type="button"
          onClick={() => { onChoose("empty"); onNext(); }}
          className="text-[13px] text-text-muted transition-colors duration-200 ease-out hover:text-text-secondary"
        >
          Or start empty →
        </button>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: Template;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border text-left",
        "transition-[border-color,box-shadow] duration-200 ease-out",
        selected
          ? "border-accent shadow-[0_0_0_1px_rgba(36, 48, 173,0.3)] shadow-accent/10"
          : "border-card-border hover:border-border-hover"
      )}
    >
      {/* Cover image */}
      <div className="relative h-[110px] w-full overflow-hidden bg-card-bg">
        <Image
          src={template.cover}
          alt={template.name}
          fill
          className="object-cover opacity-80 transition-opacity duration-200 group-hover:opacity-100"
          unoptimized
        />
        {/* Color strip at bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex h-1">
          {template.palette.slice(0, 6).map((c, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-bg-secondary px-3 py-2.5">
        <div className="text-[13px] font-medium text-white">{template.name}</div>
        <div className="mt-0.5 text-[11px] text-text-tertiary">
          {template.refCount} references
        </div>
      </div>

      {/* Selected ring */}
      {selected && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-accent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        />
      )}

      {/* Checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none">
              <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

// ─── Step 3: Studio / Search Moment ──────────────────────────────────────────

function useTypingEffect(text: string, startDelay = 600, charDelay = 48) {
  const [displayed, setDisplayed] = React.useState("");
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    setDisplayed("");
    setDone(false);

    const start = setTimeout(() => {
      let i = 0;
      const tick = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(tick);
          setDone(true);
        }
      }, charDelay);
      return () => clearInterval(tick);
    }, startDelay);

    return () => clearTimeout(start);
  }, [text, startDelay, charDelay]);

  return { displayed, done };
}

function StepStudio({
  template,
  onSearch,
  searchPerformed,
  onNext,
}: {
  template: Template | null;
  onSearch: () => void;
  searchPerformed: boolean;
  onNext: () => void;
}) {
  const refs = React.useMemo(
    () => (template ? template.references.slice(0, 9) : TEMPLATE_LIST[0].references.slice(0, 9)),
    [template]
  );
  const suggestion = template
    ? template.searchSuggestions[0]
    : "warm editorial serif";
  const { displayed: placeholder, done: placeholderDone } = useTypingEffect(
    `Try: "${suggestion}"`
  );

  const [query, setQuery] = React.useState("");
  const [pulsed, setPulsed] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setPulsed(true), 400);
    return () => clearTimeout(t);
  }, []);

  const filtered: TemplateReference[] = React.useMemo(() => {
    if (!query.trim()) return refs;
    const q = query.toLowerCase();
    return refs.filter((r) =>
      r.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      r.title.toLowerCase().includes(q)
    );
  }, [query, refs]);

  function handleSearch(v: string) {
    setQuery(v);
    if (v.trim() && !searchPerformed) onSearch();
  }

  function useSuggestion() {
    const s = suggestion;
    setQuery(s);
    if (!searchPerformed) onSearch();
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-4 py-2">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-white">
          Your studio is ready.
        </h2>
        <p className="text-[13px] text-text-tertiary">
          {template ? `${template.name} template loaded.` : "Empty studio ready."} Try searching your references.
        </p>
      </div>

      {/* Search bar with pulse ring */}
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-lg border border-card-border bg-card-bg px-3 py-2.5",
          "transition-[border-color] duration-200 focus-within:border-border-primary",
          pulsed && "search-pulse"
        )}
      >
        <svg className="h-3.5 w-3.5 flex-shrink-0 text-text-placeholder" viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {/* Custom animated placeholder */}
        {!query && (
          <span className="pointer-events-none absolute left-9 select-none text-[13px] text-text-muted">
            {placeholder}
            {!placeholderDone && <span className="ml-px opacity-70">|</span>}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 bg-transparent text-[13px] text-white outline-none"
          aria-label="Search references"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="flex-shrink-0 text-text-placeholder transition-colors hover:text-white"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestion chips */}
      {!query && template && (
        <div className="flex flex-wrap gap-1.5">
          {template.searchSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setQuery(s); if (!searchPerformed) onSearch(); }}
              className="rounded-full border border-card-border bg-card-bg px-2.5 py-1 text-[11px] text-text-tertiary transition-[border-color,color] duration-150 hover:border-border-hover hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Reference mini-grid */}
      <div className="relative">
        <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-lg" style={{ maxHeight: 192 }}>
          {filtered.slice(0, 9).map((ref, i) => (
            <motion.div
              key={ref.imageUrl}
              className="relative aspect-[4/3] overflow-hidden rounded-md bg-card-bg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, duration: 0.25, ease: "easeOut" }}
            >
              <Image
                src={ref.imageUrl}
                alt={ref.title}
                fill
                className="object-cover"
                unoptimized
              />
              {/* Tag overlay on hover */}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-opacity duration-150 hover:opacity-100">
                <div className="flex flex-wrap gap-0.5">
                  {ref.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em]",
                        query && ref.tags.some((t) => t.includes(query.toLowerCase()))
                          ? "bg-accent/80 text-white"
                          : "bg-white/10 text-white/70"
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* "No results" state */}
        {filtered.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-card-border text-[13px] text-text-placeholder">
            No matches — try a different search
          </div>
        )}

        {/* Result count */}
        {query && filtered.length > 0 && (
          <p className="mt-1.5 text-[11px] text-text-placeholder">
            {filtered.length} of {refs.length} references
          </p>
        )}
      </div>

      {/* Wow moment hint */}
      {query && !searchPerformed && (
        <motion.p
          className="text-[12px] text-accent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          ✦ Every reference is tagged and searchable.
        </motion.p>
      )}

      {/* CTA */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-opacity duration-200 ease-out hover:opacity-90"
        >
          Looks good →
        </button>
        {!query && !searchPerformed && (
          <button
            type="button"
            onClick={useSuggestion}
            className="text-[12px] text-text-muted transition-colors duration-200 hover:text-text-secondary"
          >
            Try a search first
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 4: Connect Sources ──────────────────────────────────────────────────

function StepConnect({
  connected: pinterestConnected,
  onConnect,
  onNext,
}: {
  connected: boolean;
  onConnect: () => void;
  onNext: () => void;
}) {
  const [importing, setImporting] = React.useState(false);

  function handleConnectPinterest() {
    setImporting(true);
    onConnect();
    window.location.href = "/api/auth/pinterest";
  }

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-2.5">
        <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-white">
          Want to search YOUR references too?
        </h2>
        <p className="text-[14px] text-text-tertiary">
          Connect Pinterest to import boards directly into Vision.
        </p>
      </div>

      {/* Pinterest option */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleConnectPinterest}
          disabled={importing}
          className={cn(
            "group relative flex w-full items-center gap-4 rounded-xl border p-4 text-left",
            "transition-[border-color,background-color] duration-200 ease-out",
            pinterestConnected
              ? "border-emerald-800/40 bg-emerald-950/20"
              : "border-card-border bg-card-bg hover:border-border-hover"
          )}
        >
          {/* Pinterest icon */}
          <div className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border",
            pinterestConnected ? "border-emerald-800/40 bg-emerald-950/30 text-emerald-400" : "border-card-border bg-bg-secondary text-[#e60023]"
          )}>
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.25" />
              <path
                d="M10 5.5C7.5 5.5 6 7.2 6 9.2c0 1.1.56 2.08 1.5 2.5.12.05.23 0 .27-.12l.2-.77c.03-.12 0-.24-.08-.33-.3-.35-.47-.8-.47-1.28 0-1.64 1.17-3.1 3.08-3.1 1.68 0 2.6 1.03 2.6 2.4 0 1.8-.75 3.32-1.87 3.32-.62 0-1.08-.53-.93-1.18.18-.76.52-1.58.52-2.13 0-.49-.25-.9-.77-.9-.61 0-1.1.66-1.1 1.55 0 .56.18.94.18.94L8.4 15.5c-.2.85-.04 1.9.01 2 .03.07.12.09.17.04.07-.08 1-1.3 1.32-2.5l.52-2.06c.25.5.98.94 1.76.94 2.32 0 3.9-2.22 3.9-5.2 0-2.26-1.8-4.22-4.58-4.22z"
                fill="currentColor"
              />
            </svg>
          </div>

          <div className="flex-1 space-y-0.5">
            <div className="text-[13px] font-medium text-white">Pinterest</div>
            <div className="text-[11px] text-text-placeholder">
              Import boards and pins as references
            </div>
          </div>

          {pinterestConnected ? (
            <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-emerald-400">
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                <path d="M2 6.5l3 3 5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Connected
            </span>
          ) : importing ? (
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-text-tertiary">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-accent" />
              Connecting…
            </span>
          ) : (
            <span className="shrink-0 text-[12px] text-text-placeholder transition-colors duration-200 group-hover:text-white">
              Connect →
            </span>
          )}
        </button>

        <p className="text-[11px] text-text-muted">
          You can connect more sources anytime in Settings.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-opacity duration-200 ease-out hover:opacity-90"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={onNext}
          className="text-[13px] text-text-muted transition-colors duration-200 ease-out hover:text-text-secondary"
        >
          Skip for now →
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Studio Ready ─────────────────────────────────────────────────────

const iconContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
};
const iconItemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.85 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: SPRING },
  },
};

function StepReady({
  template,
  onEnter,
  onDemo,
}: {
  template: Template | null;
  onEnter: () => void;
  onDemo: () => void;
}) {
  const palette = template?.palette ?? ["#2430AD", "#7928ca", "#ff0080", "#f5a623", "#50e3c2", "#ffffff"];

  return (
    <div className="space-y-10 py-4 text-center">
      {/* Checkmark */}
      <div className="space-y-4">
        <motion.div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/25 bg-accent/10"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: SPRING }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>

        <motion.h2
          className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-white"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: SPRING }}
        >
          Your studio is ready.
        </motion.h2>
        <motion.p
          className="text-[14px] text-text-tertiary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {template ? `${template.name} template loaded with ${template.refCount} references.` : "Empty studio — add your first project to get started."}
        </motion.p>
      </div>

      {/* Palette preview */}
      <motion.div
        className="overflow-hidden rounded-lg"
        initial={{ opacity: 0, scaleX: 0.8 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.45, ease: SPRING }}
      >
        <div className="flex h-6 overflow-hidden rounded-lg">
          {palette.map((c, i) => (
            <div key={i} className="flex-1 transition-colors duration-200" style={{ backgroundColor: c }} />
          ))}
        </div>
      </motion.div>

      {/* Mini font preview */}
      {template && (
        <motion.div
          className="space-y-1 text-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          {template.fonts.slice(0, 1).map((pair, i) => (
            <div key={i} className="rounded-lg border border-border-subtle bg-card-bg px-3 py-2.5">
              <div className="text-[18px] font-semibold text-white">{pair.heading}</div>
              <div className="text-[12px] text-text-tertiary">{pair.body} · body</div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Feature stagger */}
      <motion.div
        className="grid grid-cols-3 gap-2"
        variants={iconContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {[
          { icon: "◈", label: "Vision", desc: "Moodboard" },
          { icon: "⌘", label: "Cmd+K", desc: "Search all" },
          { icon: "◎", label: "Flow", desc: "Focus mode" },
        ].map(({ icon, label, desc }) => (
          <motion.div
            key={label}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-border-subtle bg-card-bg py-3"
            variants={iconItemVariants}
          >
            <span className="text-[16px] text-text-muted">{icon}</span>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary">{label}</div>
              <div className="text-[10px] text-text-muted">{desc}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTAs */}
      <motion.div
        className="space-y-2.5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4, ease: SPRING }}
      >
        <button
          type="button"
          onClick={onEnter}
          className={cn(
            "w-full rounded-lg bg-accent px-8 py-3 text-sm font-medium text-white",
            "transition-[opacity,transform] duration-200 ease-out hover:opacity-90",
            "hover:shadow-[0_0_32px_rgba(36, 48, 173,0.18)]"
          )}
        >
          Start Creating →
        </button>
        <button
          type="button"
          onClick={onDemo}
          className="w-full rounded-lg border border-border-subtle bg-transparent px-8 py-2.5 text-sm text-text-tertiary transition-[border-color,color] duration-200 hover:border-border-primary hover:text-white"
        >
          Explore Demo Project →
        </button>
      </motion.div>

      {/* Keyboard hint */}
      <motion.p
        className="text-[11px] text-[#222]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        Press{" "}
        <kbd className="rounded border border-card-border bg-card-bg px-1 py-0.5 font-mono text-[10px] text-text-muted">
          ⌘K
        </kbd>{" "}
        anytime to search, create, or navigate
      </motion.p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OnboardingClient() {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [direction, setDirection] = React.useState(1);

  // Step 1
  const [email, setEmail] = React.useState("");

  // Step 2
  const [chosenArchetype, setChosenArchetype] = React.useState<Archetype | null>(null);

  // Step 3
  const [chosenTemplate, setChosenTemplate] = React.useState<TemplateId | "empty" | null>(null);

  // Step 4
  const [searchPerformed, setSearchPerformed] = React.useState(false);

  // ── Check if onboarding is already complete ──────────────────────────────

  React.useEffect(() => {
    async function check() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw) as StoredOnboarding;
          if (data.complete) {
            router.replace("/home");
            return;
          }
        }
      } catch { /* ignore */ }

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_complete")
            .eq("id", user.id)
            .single();
          if (profile?.onboarding_complete) {
            router.replace("/home");
            return;
          }
        }
      } catch { /* Supabase not configured */ }

      setReady(true);
    }
    check();
  }, [router]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const goNext = React.useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const goBack = React.useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  // ── Final: Create project + navigate ──────────────────────────────────────

  async function finalize(destination: "studio" | "demo") {
    const tpl = chosenTemplate && chosenTemplate !== "empty"
      ? TEMPLATES[chosenTemplate]
      : null;

    // Build project object
    const projectId = tpl ? slugify(tpl.name) : "my-studio";
    const projectName = tpl ? tpl.name : "My Studio";
    const projectColor = tpl ? tpl.palette[0] : "#2430AD";

    // 1. localStorage — immediate
    try {
      const storedProjects = JSON.parse(
        localStorage.getItem("studio-os:projects") ?? "[]"
      );
      const project = {
        id: projectId,
        name: projectName,
        brief: tpl?.description ?? "",
        color: projectColor,
        createdAt: new Date().toISOString(),
      };
        if (!storedProjects.find((p: { id: string }) => p.id === projectId)) {
        localStorage.setItem(
          "studio-os:projects",
          JSON.stringify([project, ...storedProjects])
        );
        window.dispatchEvent(new Event("projects-updated"));
      }

      // Save template references so the project room can display them
      if (tpl && tpl.references.length > 0) {
        localStorage.setItem(
          `studio-os:references:${projectId}`,
          JSON.stringify(tpl.references)
        );
      }

      const onboarding: StoredOnboarding = {
        complete: true,
        email: email.trim(),
        archetype: chosenArchetype ?? "visual",
        templateChosen: chosenTemplate,
        pinterestConnected: false,
        searchPerformed,
        completedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(onboarding));
    } catch { /* ignore */ }

    // 2. Navigate immediately
    if (destination === "demo") {
      router.push("/projects/studio-os-demo");
    } else if (tpl) {
      router.push(`/projects/${projectId}`);
    } else {
      router.push("/home");
    }

    // 3. Background Supabase sync
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ onboarding_complete: true })
          .eq("id", user.id);

        if (tpl) {
          await supabase.from("projects").upsert({
            user_id: user.id,
            name: projectName,
            slug: projectId,
            brief: tpl.description,
            color: projectColor,
          });
        }
      }
    } catch { /* Supabase not configured */ }
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isTextarea = (e.target as HTMLElement).tagName === "TEXTAREA";
      const isInput = (e.target as HTMLElement).tagName === "INPUT";
      if (e.key === "Escape" && step > 1) { goBack(); return; }
      if (e.key === "Enter" && !isTextarea) {
        if (step === 1 && !isInput) { goNext(); return; }
        if (step === 2 && chosenArchetype) { goNext(); return; }
        if (step === 3 && chosenTemplate) { goNext(); return; }
        if (step === 4) { goNext(); return; }
        if (step === 5) { finalize("studio"); return; }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, chosenTemplate, goNext, goBack]);

  if (!ready) return <div className="min-h-screen bg-black" />;

  const activeTemplate = chosenTemplate && chosenTemplate !== "empty"
    ? TEMPLATES[chosenTemplate]
    : null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black px-6">

      {/* Ambient glow (step 1 only) */}
      <AnimatePresence>
        {step === 1 && (
          <motion.div
            className="pointer-events-none fixed inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: 700,
                height: 500,
                background: "radial-gradient(ellipse, rgba(36, 48, 173,0.065) 0%, transparent 68%)",
              }}
              animate={{ scale: [0.95, 1.06, 0.95], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar: back + progress */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5">
        <div className="w-7">
          <AnimatePresence>
            {step > 1 && (
              <motion.button
                type="button"
                onClick={goBack}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.2 }}
                className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors duration-200 hover:text-white"
                aria-label="Go back"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                  <path d="M9.5 3.5L5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <ProgressPills step={step} />
        <div className="w-7" />
      </div>

      {/* Step content */}
      <div className="relative w-full max-w-[440px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {step === 1 && (
              <StepWelcome
                email={email}
                onEmailChange={setEmail}
                onNext={goNext}
              />
            )}
            {step === 2 && (
              <StepArchetype
                chosen={chosenArchetype}
                onChoose={setChosenArchetype}
                onNext={goNext}
              />
            )}
            {step === 3 && (
              <StepTemplatePicker
                chosen={chosenTemplate}
                onChoose={setChosenTemplate}
                onNext={goNext}
                templates={getOrderedTemplates(chosenArchetype)}
              />
            )}
            {step === 4 && (
              <StepStudio
                template={activeTemplate}
                onSearch={() => setSearchPerformed(true)}
                searchPerformed={searchPerformed}
                onNext={goNext}
              />
            )}
            {step === 5 && (
              <StepReady
                template={activeTemplate}
                onEnter={() => finalize("studio")}
                onDemo={() => finalize("demo")}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 left-0 right-0 text-center">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-muted">
          Studio OS
        </span>
      </div>
    </div>
  );
}
