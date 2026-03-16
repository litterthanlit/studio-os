"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CloseIcon as X } from "@/components/ui/icon";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ColorPicker } from "@/components/color-picker";
import {
  getProjects,
  saveProject,
  getProjectCover as readProjectCover,
  setProjectCover as writeProjectCover,
  uniqueProjectSlug,
  type StoredProject,
} from "@/lib/project-store";

// ─── Re-exports for existing callers ─────────────────────────────────────────

export type { StoredProject } from "@/lib/project-store";

// ─── Constants ────────────────────────────────────────────────────────────────

export const ACCENT_COLORS = [
  "#2430AD",
  "#7928CA",
  "#FF0080",
  "#F5A623",
  "#50E3C2",
  "#EE0000",
  "#79FFE1",
  "#999999",
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number];

export function getStoredProjects(): StoredProject[] {
  return getProjects();
}

export function getProjectCover(projectId: string): string | null {
  return readProjectCover(projectId);
}

export function setProjectCover(projectId: string, imageUrl: string): void {
  writeProjectCover(projectId, imageUrl);
}

// ─── Context ──────────────────────────────────────────────────────────────────

type NewProjectModalContextValue = {
  openModal: () => void;
  setSyncError: (msg: string | null) => void;
};

const NewProjectModalContext =
  React.createContext<NewProjectModalContextValue>({
    openModal: () => {},
    setSyncError: () => {},
  });

export function useNewProjectModal() {
  return React.useContext(NewProjectModalContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NewProjectModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const openModal = React.useCallback(() => setOpen(true), []);
  const closeModal = React.useCallback(() => setOpen(false), []);

  return (
    <NewProjectModalContext.Provider value={{ openModal, setSyncError }}>
      {children}
      {syncError && (
        <SyncErrorBanner message={syncError} onDismiss={() => setSyncError(null)} />
      )}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
            <NewProjectModalInner
              onClose={closeModal}
              onSyncError={setSyncError}
            />
          )}
          </AnimatePresence>,
          document.body
        )}
    </NewProjectModalContext.Provider>
  );
}

// ─── Sync error banner ────────────────────────────────────────────────────────

function SyncErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 border border-amber-500/40 bg-amber-950/90 px-4 py-2.5 text-sm text-amber-200 shadow-lg backdrop-blur-sm"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded p-0.5 text-amber-400 hover:bg-amber-800/50 hover:text-amber-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Modal Inner ──────────────────────────────────────────────────────────────

function NewProjectModalInner({
  onClose,
  onSyncError,
}: {
  onClose: () => void;
  onSyncError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [brief, setBrief] = React.useState("");
  const [color, setColor] = React.useState<string>(ACCENT_COLORS[0]);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Keyboard: Escape closes, Enter creates, Tab traps focus
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
        if (name.trim()) {
          e.preventDefault();
          handleCreate();
        }
        return;
      }
      if (e.key === "Tab") {
        const modal = modalRef.current;
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, onClose]);

  async function handleCreate() {
    if (!name.trim()) return;
    const id = uniqueProjectSlug(name);
    const project: StoredProject = {
      id,
      name: name.trim(),
      brief: brief.trim(),
      color,
      createdAt: new Date().toISOString(),
    };

    // 1. Write to localStorage cache immediately (enables instant navigation
    //    to the project room before Supabase responds)
    saveProject(project);
    window.dispatchEvent(new Event("projects-updated"));

    // Close and navigate right away — don't wait for the network
    onClose();
    router.push(`/projects/${id}`);

    // 2. Persist to Supabase in the background
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from("projects").insert({
          user_id: user.id,
          name: project.name,
          slug: id,
          brief: project.brief || null,
          color: project.color,
        });
        if (error) throw error;
      }
    } catch {
      onSyncError("Couldn't sync to cloud — saved locally");
    }
  }

  return (
    <>
      {/* Overlay */}
      <motion.div
        key="new-project-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Centering wrapper */}
      <motion.div
        key="new-project-wrapper"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        onClick={onClose}
      >
        {/* Modal panel */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 400, damping: 30, duration: 0.25 }}
          className="w-full max-w-[480px] border border-card-border bg-card-bg shadow-2xl rounded-lg"
          role="dialog"
          aria-modal="true"
          aria-label="New Project"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
            <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-accent">
              New Project
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-0.5 text-text-tertiary transition-colors duration-150 hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-5 px-5 py-5">
            {/* Project Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">
                Project Name
              </label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                className="w-full border border-border-secondary bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-placeholder outline-none transition-[border-color] duration-150 focus:border-border-hover rounded-lg"
              />
            </div>

            {/* Brief */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">
                Brief
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="What's this project about? A few words is fine."
                rows={3}
                className="w-full resize-none border border-border-secondary bg-bg-input px-3 py-2.5 text-sm leading-relaxed text-text-primary placeholder:text-text-placeholder outline-none transition-[border-color] duration-150 focus:border-border-hover rounded-lg"
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">
                Accent Color
              </label>
              <div className="flex items-center gap-2.5">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Select color ${c}`}
                    className={cn(
                      "h-6 w-6 rounded-full transition-[box-shadow,transform,opacity] duration-150",
                      color.toUpperCase() === c.toUpperCase()
                        ? "scale-110 ring-2 ring-button-primary-bg ring-offset-2 ring-offset-bg-tertiary"
                        : "opacity-60 hover:scale-110 hover:opacity-100"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                {/* Divider */}
                <div className="h-4 w-px bg-border-primary" />
                {/* Custom color trigger */}
                <ColorPicker value={color} onChange={setColor} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-card-border px-5 py-4">
            <p className="text-[10px] text-text-muted">
              <kbd className="rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 font-mono text-[9px]">
                ↵
              </kbd>{" "}
              to create,{" "}
              <kbd className="rounded border border-border-primary bg-bg-tertiary px-1 py-0.5 font-mono text-[9px]">
                Esc
              </kbd>{" "}
              to cancel
            </p>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim()}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-[opacity,background-color] duration-150 rounded-lg",
                name.trim()
                  ? "cursor-pointer bg-button-primary-bg text-button-primary-text hover:opacity-90"
                  : "cursor-not-allowed bg-bg-tertiary text-text-muted"
              )}
            >
              Create
            </button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
